package contracts

import (
	"encoding/json"
	"errors"
	"h2go-chaincodes/models"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type RedemptionContract struct {
	contractapi.Contract
}

func (rdpc *RedemptionContract) RedeemGDOs(
	ctx contractapi.TransactionContextInterface,
	ownerID string,
	assetType string,
	gdoIDs []string) error {

	ownerBalance, err := ctx.GetStub().GetState(ownerID)
	if err != nil {
		return errors.New("failed to read owner balance from world state")
	}
	if ownerBalance == nil {
		return errors.New("owner balance does not exist")
	}

	var productorBalanceRecord models.ProductorBalance
	err = json.Unmarshal(ownerBalance, &productorBalanceRecord)
	if err != nil {
		return err
	}
	gdoIDsSet := make(map[string]struct{})
	for _, gdoID := range gdoIDs {
		gdoIDsSet[gdoID] = struct{}{}
	}

	updatedProductorBalanceRecord := productorBalanceRecord

	availableGDOs := make([]models.GDO, 0)
	updatedUnavailableGDOs := make([]models.GDO, 0)
	if assetType == string(models.Electricity) {
		availableGDOs = productorBalanceRecord.GDOS.Electricity.Available
		updatedUnavailableGDOs = productorBalanceRecord.GDOS.Electricity.Unavailable
	} else if assetType == string(models.H2) {
		availableGDOs = productorBalanceRecord.GDOS.H2.Available
		updatedUnavailableGDOs = productorBalanceRecord.GDOS.H2.Unavailable
	} else {
		return errors.New("invalid asset type")
	}

	updatedAvailableGDOs := make([]models.GDO, 0)
	gdosToRedeem := make([]models.GDO, 0)

	// Separate GDOs into those to keep available and those to redeem
	for _, gdo := range availableGDOs {
		if _, exists := gdoIDsSet[gdo.GdoID]; exists {
			// Mark as used and move to unavailable
			gdo.Status = models.GdoUsed
			gdosToRedeem = append(gdosToRedeem, gdo)
			updatedUnavailableGDOs = append(updatedUnavailableGDOs, gdo)
			delete(gdoIDsSet, gdo.GdoID)

			// Update individual GDO in world state
			gdoJSON, err := json.Marshal(gdo)
			if err != nil {
				return err
			}
			err = ctx.GetStub().PutState(gdo.GdoID, gdoJSON)
			if err != nil {
				return err
			}
		} else {
			// Keep in available
			updatedAvailableGDOs = append(updatedAvailableGDOs, gdo)
		}
	}

	// Check if all requested GDO IDs were found
	if len(gdoIDsSet) > 0 {
		missingIDs := make([]string, 0, len(gdoIDsSet))
		for id := range gdoIDsSet {
			missingIDs = append(missingIDs, id)
		}
		return errors.New("some GDO IDs were not found in owner's available GDOs: " + missingIDs[0])
	}

	// Update balance with new lists
	if assetType == string(models.Electricity) {
		updatedProductorBalanceRecord.GDOS.Electricity.Available = updatedAvailableGDOs
		updatedProductorBalanceRecord.GDOS.Electricity.Unavailable = updatedUnavailableGDOs
	} else if assetType == string(models.H2) {
		updatedProductorBalanceRecord.GDOS.H2.Available = updatedAvailableGDOs
		updatedProductorBalanceRecord.GDOS.H2.Unavailable = updatedUnavailableGDOs
	}

	// Update requests to change status of redeemed GDOs
	requestsToUpdate := make(map[string]*models.Request)
	for _, gdo := range gdosToRedeem {
		if gdo.RequestID == "" {
			// Skip if no RequestID (shouldn't happen but just in case)
			continue
		}

		// Get or fetch request
		var requestRecord *models.Request
		if req, exists := requestsToUpdate[gdo.RequestID]; exists {
			requestRecord = req
		} else {
			requestBytes, err := ctx.GetStub().GetState(gdo.RequestID)
			if err != nil {
				return errors.New("failed to get request for GDO: " + gdo.GdoID)
			}
			if requestBytes == nil {
				// Request not found, shouldn't happen but just in case
				return errors.New("request not found for GDO: " + gdo.GdoID)
			}
			var req models.Request
			err = json.Unmarshal(requestBytes, &req)
			if err != nil {
				return err
			}
			requestRecord = &req
			requestsToUpdate[gdo.RequestID] = requestRecord
		}

		// Update GDO status in request
		for j := range requestRecord.GDOs {
			if requestRecord.GDOs[j].GdoID == gdo.GdoID {
				requestRecord.GDOs[j].Status = models.GdoUsed
				break
			}
		}
	}

	// update world state

	// update owner balance
	updatedOwnerBalanceBytes, err := json.Marshal(updatedProductorBalanceRecord)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(ownerID, updatedOwnerBalanceBytes)
	if err != nil {
		return err
	}

	// update requests
	for _, req := range requestsToUpdate {
		updatedRequestBytes, err := json.Marshal(req)
		if err != nil {
			return err
		}
		err = ctx.GetStub().PutState(req.RequestID, updatedRequestBytes)
		if err != nil {
			return err
		}
	}
	return nil
}

func (rdpc *RedemptionContract) GetGDO(ctx contractapi.TransactionContextInterface, gdoID string) (*models.GDO, error) {
	gdoBytes, err := ctx.GetStub().GetState(gdoID)
	if err != nil {
		return nil, errors.New("failed to read GDO from world state")
	}
	if gdoBytes == nil {
		return nil, errors.New("GDO does not exist")
	}

	var gdoRecord models.GDO
	err = json.Unmarshal(gdoBytes, &gdoRecord)
	if err != nil {
		return nil, err
	}

	return &gdoRecord, nil
}

func (rdpc *RedemptionContract) GetProducerBalance(ctx contractapi.TransactionContextInterface, ownerID string) (*models.ProductorBalance, error) {
	ownerBalance, err := ctx.GetStub().GetState(ownerID)
	if err != nil {
		return nil, errors.New("failed to read owner balance from world state")
	}
	if ownerBalance == nil {
		return nil, errors.New("owner balance does not exist")
	}

	var productorBalanceRecord models.ProductorBalance
	err = json.Unmarshal(ownerBalance, &productorBalanceRecord)
	if err != nil {
		return nil, err
	}

	return &productorBalanceRecord, nil
}

func (rdpc *RedemptionContract) CreateTradeRequest(
	ctx contractapi.TransactionContextInterface,
	producerID string,
	targetProducerID string,
	assetType string,
	amount int64) (string, error) {

	assetTypeEnum, err := models.ParseAssetType(assetType)
	if err != nil {
		return "", err
	}

	requestID := ctx.GetStub().GetTxID()

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return "", err
	}
	createdAt := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).Format(time.RFC3339)

	request := models.TradeRequest{
		DocType:    "REQUEST_TO_TRADE_GDOS",
		TradeID:    requestID,
		ProducerID: producerID,
		TargetID:   targetProducerID,
		AssetType:  assetTypeEnum,
		Amount:     float64(amount),
		Status:     models.RequestPending,
		CreatedAt: createdAt,
	}

	requestJSON, err := json.Marshal(request)
	if err != nil {
		return "", err
	}

	err = ctx.GetStub().PutState(requestID, requestJSON)
	if err != nil {
		return "", err
	}

	return requestID, nil
}

func (rdpc *RedemptionContract) GetAllTradeRequests(
	ctx contractapi.TransactionContextInterface) ([]*models.TradeRequest, error) {

	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var tradeRequests []*models.TradeRequest
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var request models.TradeRequest
		err = json.Unmarshal(queryResponse.Value, &request)
		if err != nil {
			continue
		}

		if request.DocType == "REQUEST_TO_TRADE_GDOS" {
			tradeRequests = append(tradeRequests, &request)
		}
	}

	return tradeRequests, nil
}

func (rdpc *RedemptionContract) GetReceivedTradeRequests(
	ctx contractapi.TransactionContextInterface,
	targetProducerID string) ([]*models.TradeRequest, error) {

	allTradeRequests, err := rdpc.GetAllTradeRequests(ctx)
	if err != nil {
		return nil, err
	}

	var receivedRequests []*models.TradeRequest
	for _, request := range allTradeRequests {
		if request.TargetID == targetProducerID {
			receivedRequests = append(receivedRequests, request)
		}
	}

	return receivedRequests, nil
}

func (rdpc *RedemptionContract) GetSentTradeRequests(
	ctx contractapi.TransactionContextInterface,
	producerID string) ([]*models.TradeRequest, error) {

	allTradeRequests, err := rdpc.GetAllTradeRequests(ctx)
	if err != nil {
		return nil, err
	}

	var sentRequests []*models.TradeRequest
	for _, request := range allTradeRequests {
		if request.ProducerID == producerID {
			sentRequests = append(sentRequests, request)
		}
	}

	return sentRequests, nil
}

func (rdpc *RedemptionContract) GetReceivedTradeRequestsByStatus(
	ctx contractapi.TransactionContextInterface,
	targetProducerID string,
	status string) ([]*models.TradeRequest, error) {

	statusEnum, err := models.ParseRequestStatus(status)
	if err != nil {
		return nil, err
	}

	allTradeRequests, err := rdpc.GetAllTradeRequests(ctx)
	if err != nil {
		return nil, err
	}

	var receivedRequests []*models.TradeRequest
	for _, request := range allTradeRequests {
		if request.TargetID == targetProducerID && request.Status == statusEnum {
			receivedRequests = append(receivedRequests, request)
		}
	}

	return receivedRequests, nil
}

func (rdpc *RedemptionContract) GetSentTradeRequestsByStatus(
	ctx contractapi.TransactionContextInterface,
	producerID string,
	status string) ([]*models.TradeRequest, error) {

	statusEnum, err := models.ParseRequestStatus(status)
	if err != nil {
		return nil, err
	}

	allTradeRequests, err := rdpc.GetAllTradeRequests(ctx)
	if err != nil {
		return nil, err
	}

	var sentRequests []*models.TradeRequest
	for _, request := range allTradeRequests {
		if request.ProducerID == producerID && request.Status == statusEnum {
			sentRequests = append(sentRequests, request)
		}
	}

	return sentRequests, nil
}

func (rdpc *RedemptionContract) GetTradeRequest(
	ctx contractapi.TransactionContextInterface,
	tradeID string) (*models.TradeRequest, error) {
	tradeBytes, err := ctx.GetStub().GetState(tradeID)
	if err != nil {
		return nil, errors.New("failed to read trade request from world state")
	}
	if tradeBytes == nil {
		return nil, errors.New("trade request does not exist")
	}

	var tradeRequest models.TradeRequest
	err = json.Unmarshal(tradeBytes, &tradeRequest)
	if err != nil {
		return nil, err
	}

	return &tradeRequest, nil
}

func (rdpc *RedemptionContract) AcceptTradeRequest(
	ctx contractapi.TransactionContextInterface,
	producerID string,
	tradeID string,
	gdosToExchange []string,
) error {
	trade, err := rdpc.GetTradeRequest(ctx, tradeID)
	if err != nil {
		return err
	}

	if trade.TargetID != producerID {
		return errors.New("only the target producer can accept the trade request")
	}

	if trade.Status != models.RequestPending {
		return errors.New("trade request is not in PENDING status, current status: " + string(trade.Status))
	}

	if len(gdosToExchange) != int(trade.Amount) {
		return errors.New("number of GDOs to exchange must match the amount specified in the trade request")
	}

	// Validate all GDOs and create set to avoid nested loops
	gdoIDsSet := make(map[string]struct{}, len(gdosToExchange))
	for _, gdoID := range gdosToExchange {
		gdo, err := rdpc.GetGDO(ctx, gdoID)
		if err != nil {
			return err
		}
		if gdo.OwnerID != producerID {
			return errors.New("producer " + producerID + " does not own GDO " + gdoID)
		}
		if gdo.AssetType != trade.AssetType {
			return errors.New("GDO " + gdoID + " asset type does not match trade request asset type")
		}
		if gdo.Status != models.GdoActive {
			return errors.New("GDO " + gdoID + " is not available for trade")
		}
		gdoIDsSet[gdoID] = struct{}{}
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}
	processedAt := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).Format(time.RFC3339)

	approverID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return errors.New("failed to get client identity: " + err.Error())
	}

	targetBalanceBytes, err := ctx.GetStub().GetState(trade.TargetID)
	if err != nil {
		return errors.New("failed to read target balance: " + err.Error())
	}
	if targetBalanceBytes == nil {
		return errors.New("target producer balance does not exist")
	}
	var targetBalance models.ProductorBalance
	err = json.Unmarshal(targetBalanceBytes, &targetBalance)
	if err != nil {
		return err
	}

	producerBalanceBytes, err := ctx.GetStub().GetState(trade.ProducerID)
	if err != nil {
		return errors.New("failed to read producer balance: " + err.Error())
	}
	var producerBalance models.ProductorBalance
	if producerBalanceBytes == nil {
		// Initialize
		producerBalance = models.ProductorBalance{
			TransactionType: "gdoBalance",
			ProducerID:      trade.ProducerID,
			GDOS: models.GDOsByAssetType{
				Electricity: models.GDOsByStatus{
					Available:   make([]models.GDO, 0),
					Unavailable: make([]models.GDO, 0),
				},
				H2: models.GDOsByStatus{
					Available:   make([]models.GDO, 0),
					Unavailable: make([]models.GDO, 0),
				},
			},
		}
	} else {
		err = json.Unmarshal(producerBalanceBytes, &producerBalance)
		if err != nil {
			return err
		}
	}

	gdosToTransfer := make([]models.GDO, 0)
	var updatedTargetAvailable []models.GDO

	var targetAvailable []models.GDO
	if trade.AssetType == models.Electricity {
		targetAvailable = targetBalance.GDOS.Electricity.Available
	} else {
		targetAvailable = targetBalance.GDOS.H2.Available
	}

	// Swap ownership
	for _, gdo := range targetAvailable {
		if _, exists := gdoIDsSet[gdo.GdoID]; exists {
			gdo.OwnerID = trade.ProducerID
			gdosToTransfer = append(gdosToTransfer, gdo)

			gdoJSON, err := json.Marshal(gdo)
			if err != nil {
				return err
			}
			err = ctx.GetStub().PutState(gdo.GdoID, gdoJSON)
			if err != nil {
				return err
			}
		} else {
			updatedTargetAvailable = append(updatedTargetAvailable, gdo)
		}
	}

	if trade.AssetType == models.Electricity {
		targetBalance.GDOS.Electricity.Available = updatedTargetAvailable
	} else {
		targetBalance.GDOS.H2.Available = updatedTargetAvailable
	}

	if trade.AssetType == models.Electricity {
		producerBalance.GDOS.Electricity.Available = append(producerBalance.GDOS.Electricity.Available, gdosToTransfer...)
	} else {
		producerBalance.GDOS.H2.Available = append(producerBalance.GDOS.H2.Available, gdosToTransfer...)
	}

	// Save both balances
	targetBalanceJSON, err := json.Marshal(targetBalance)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(trade.TargetID, targetBalanceJSON)
	if err != nil {
		return err
	}

	producerBalanceJSON, err := json.Marshal(producerBalance)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(trade.ProducerID, producerBalanceJSON)
	if err != nil {
		return err
	}

	// Update trade request
	trade.Status = models.RequestApproved
	trade.ApproverID = approverID
	trade.ProcessedAt = processedAt
	trade.GDOs = gdosToTransfer

	tradeJSON, err := json.Marshal(trade)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(tradeID, tradeJSON)
	if err != nil {
		return err
	}

	return nil
}

func (rdpc *RedemptionContract) RejectTradeRequest(
	ctx contractapi.TransactionContextInterface,
	producerID string,
	tradeID string,
) error {
	trade, err := rdpc.GetTradeRequest(ctx, tradeID)
	if err != nil {
		return err
	}

	if trade.TargetID != producerID {
		return errors.New("only the target producer can reject the trade request")
	}

	if trade.Status != models.RequestPending {
		return errors.New("trade request is not in PENDING status, current status: " + string(trade.Status))
	}

	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}
	processedAt := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).Format(time.RFC3339)

	approverID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return errors.New("failed to get client identity: " + err.Error())
	}

	trade.Status = models.RequestRejected
	trade.ApproverID = approverID
	trade.ProcessedAt = processedAt

	tradeJSON, err := json.Marshal(trade)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(tradeID, tradeJSON)
	if err != nil {
		return err
	}

	return nil
}
