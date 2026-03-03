package contracts

import (
	"encoding/json"
	"errors"
	"h2go-chaincodes/models"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type RequestContract struct {
	contractapi.Contract
}

func (rc *RequestContract) CreateRequest(
	ctx contractapi.TransactionContextInterface,
	producerID string,
	assetType string,
	amount int64) (string, error) {

	assetTypeEnum, err := models.ParseAssetType(assetType)
	if err != nil {
		return "", err
	}

	if amount <= 0 {
		return "", errors.New("amount must be greater than 0")
	}

	requestID := ctx.GetStub().GetTxID()

	// Get deterministic timestamp from transaction
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return "", err
	}
	createdAt := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).Format(time.RFC3339)

	request := models.Request{
		DocType:     "REQUEST_TO_TRANSFORM_GDOS",
		RequestID:   requestID,
		ProducerID:  producerID,
		AssetType:   assetTypeEnum,
		Amount:      amount,
		Status:      models.RequestPending,
		ApproverID:  "",
		Reason:      "",
		GDOs:        make([]models.GDO, 0),
		CreatedAt:   createdAt,
		ProcessedAt: "",
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

func (rc *RequestContract) validateRequestBasics(
	ctx contractapi.TransactionContextInterface,
	requestID string) (*models.Request, models.ProductorBalance, string, string, int64, error) {

	requestJSON, err := ctx.GetStub().GetState(requestID)
	if err != nil {
		return nil, models.ProductorBalance{}, "", "", 0, errors.New("failed to read request: " + err.Error())
	}
	if requestJSON == nil {
		return nil, models.ProductorBalance{}, "", "", 0, errors.New("request " + requestID + " does not exist")
	}

	var request models.Request
	err = json.Unmarshal(requestJSON, &request)
	if err != nil {
		return nil, models.ProductorBalance{}, "", "", 0, err
	}

	// Validate that it's a GDO request
	if request.DocType != "REQUEST_TO_TRANSFORM_GDOS" {
		return nil, models.ProductorBalance{}, "", "", 0, errors.New("document is not a GDO request, found docType: " + request.DocType)
	}

	if request.Status != models.RequestPending {
		return nil, models.ProductorBalance{}, "", "", 0, errors.New("request is not in PENDING status, current status: " + string(request.Status))
	}

	producerID := request.ProducerID
	assetType := string(request.AssetType)
	gdoToGrant := request.Amount

	_, err = models.ParseAssetType(assetType)
	if err != nil {
		return nil, models.ProductorBalance{}, "", "", 0, err
	}

	// If asset type is H2, check if producer has enough electricity GDOs
	var productorBalanceRecord models.ProductorBalance
	if assetType == string(models.H2) {
		actualProductorBalance, err := ctx.GetStub().GetState(producerID)
		if err != nil {
			return nil, models.ProductorBalance{}, "", "", 0, err
		}
		if actualProductorBalance == nil {
			return nil, models.ProductorBalance{}, "", "", 0, errors.New("producer " + producerID + " electricity balance is empty to transform GDOs")
		}
		err = json.Unmarshal(actualProductorBalance, &productorBalanceRecord)
		if err != nil {
			return nil, models.ProductorBalance{}, "", "", 0, err
		}
		if int64(len(productorBalanceRecord.GDOS.Electricity.Available)) < gdoToGrant {
			return nil, models.ProductorBalance{}, "", "", 0, errors.New("producer " + producerID + " does not have enough electricity GDOs to transform")
		}
	}

	return &request, productorBalanceRecord, producerID, assetType, gdoToGrant, nil
}

func (rc *RequestContract) QuickValidateTransformationRequest(
	ctx contractapi.TransactionContextInterface,
	requestID string) (string, error) {

	_, _, producerID, assetType, gdoToGrant, err := rc.validateRequestBasics(ctx, requestID)
	if err != nil {
		return `{"canApprove":false}`, nil
	}

	pc := ProductionContract{}
	batches, err := pc.GetProductionBatchesByProducerAndAssetType(ctx, producerID, assetType)
	if err != nil || batches == nil {
		return `{"canApprove":false}`, nil
	}

	var totalAvailable int64 = 0
	for _, batch := range batches {
		if batch.Status == models.ProductionAvailable {
			totalAvailable += batch.AmountAvailable - batch.AmountUsed
		}
	}

	if totalAvailable < gdoToGrant {
		return `{"canApprove":false}`, nil
	}

	return `{"canApprove":true}`, nil
}

func (rc *RequestContract) validateRequestForApproval(
	ctx contractapi.TransactionContextInterface,
	requestID string) (*models.Request, models.ProductorBalance, []*models.ProductionRecord, error) {

	request, productorBalanceRecord, producerID, assetType, gdoToGrant, err := rc.validateRequestBasics(ctx, requestID)
	if err != nil {
		return nil, models.ProductorBalance{}, nil, err
	}

	pc := ProductionContract{}
	batches, err := pc.GetProductionBatchesByProducerAndAssetType(ctx, producerID, assetType)

	if err != nil {
		return nil, models.ProductorBalance{}, nil, err
	}
	if batches == nil {
		return nil, models.ProductorBalance{}, nil, errors.New("producer " + producerID + " batches not found")
	}

	remainingGdoToGrant := gdoToGrant
	availableBatches := make([]*models.ProductionRecord, 0)
	var totalAvailable int64 = 0
	for _, batch := range batches {
		if totalAvailable >= remainingGdoToGrant {
			break
		}
		if batch.Status == models.ProductionAvailable {
			totalAvailable += batch.AmountAvailable - batch.AmountUsed
			availableBatches = append(availableBatches, batch)
		}
	}
	if totalAvailable < remainingGdoToGrant {
		return nil, models.ProductorBalance{}, nil, errors.New("not enough available production to exchange for GDOs")
	}

	return request, productorBalanceRecord, availableBatches, nil
}

func (rc *RequestContract) ApproveRequest(
	ctx contractapi.TransactionContextInterface,
	requestID string,
	reason string) error {

	approverID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return errors.New("failed to get client identity: " + err.Error())
	}

	request, productorBalanceRecord, availableBatches, err := rc.validateRequestForApproval(ctx, requestID)
	if err != nil {
		return err
	}

	producerID := request.ProducerID
	assetType := string(request.AssetType)
	gdoToGrant := request.Amount
	remainingGdoToGrant := gdoToGrant

	// Get deterministic timestamp from transaction
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}
	issueTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
	issueDate := issueTime.Format(time.RFC3339)

	gdos := make([]models.GDO, 0)
	electricityGDOsToRedeem := make([]string, 0)
	electricityGDOIndex := 0

	for _, batch := range availableBatches {
		availableInBatch := batch.AmountAvailable - batch.AmountUsed
		amountUsed := int64(0)
		if availableInBatch > remainingGdoToGrant {
			batch.AmountUsed += remainingGdoToGrant
			amountUsed = remainingGdoToGrant
			remainingGdoToGrant = 0
		} else {
			batch.AmountUsed += availableInBatch
			remainingGdoToGrant -= availableInBatch
			batch.Status = models.ProductionUsed
			amountUsed = availableInBatch
		}

		// if asset type is H2, collect electricity GDOs to redeem
		if assetType == string(models.H2) {
			electricityGDOs := productorBalanceRecord.GDOS.Electricity.Available
			for i := int64(0); i < amountUsed; i++ {
				// Find next available electricity GDO starting from last index
				for electricityGDOIndex < len(electricityGDOs) {
					if electricityGDOs[electricityGDOIndex].Status == models.GdoActive {
						electricityGDOsToRedeem = append(electricityGDOsToRedeem, electricityGDOs[electricityGDOIndex].GdoID)
						electricityGDOIndex++
						break
					}
					electricityGDOIndex++
				}
			}
		}

		// Generate deterministic GDO ID: requestID + batch ID + counter
		for i := int64(0); i < amountUsed; i++ {
			gdoID := requestID + "-gdo-" + batch.BatchId + "-" + strconv.FormatInt(i, 10)
			assetTypeEnum, _ := models.ParseAssetType(assetType)
			expiryDate := ""
			if assetTypeEnum == models.H2 {
				expiryDate = batch.ProductionDate.AddDate(0, 18, 0).Format(time.RFC3339)
			} else if assetTypeEnum == models.Electricity {
				expiryDate = batch.ProductionDate.AddDate(0, 12, 0).Format(time.RFC3339)
			}
			gdo := models.GDO{
				DocType:    "GDO",
				GdoID:      gdoID,
				RequestID:  requestID,
				AssetType:  assetTypeEnum,
				IssueDate:  issueDate,
				ExpiryDate: expiryDate,
				OwnerID:    producerID,
				Status:     models.GdoActive,
			}

			// Store GDO individually in world state
			gdoJSON, err := json.Marshal(gdo)
			if err != nil {
				return err
			}
			err = ctx.GetStub().PutState(gdoID, gdoJSON)
			if err != nil {
				return err
			}

			gdos = append(gdos, gdo)
		}

		batchJSON, err := json.Marshal(batch)
		if err != nil {
			return err
		}
		err = ctx.GetStub().PutState(batch.BatchId, batchJSON)
		if err != nil {
			return err
		}

		if remainingGdoToGrant <= 0 {
			break
		}
	}

	// Redeem collected electricity GDOs for H2 requests
	if assetType == string(models.H2) && len(electricityGDOsToRedeem) > 0 {
		rdpContract := RedemptionContract{}
		err = rdpContract.RedeemGDOs(ctx, producerID, string(models.Electricity), electricityGDOsToRedeem)
		if err != nil {
			return err
		}
	}

	productorBalance, err := ctx.GetStub().GetState(producerID)
	if err != nil {
		return err
	}
	productorBalanceRecord = models.ProductorBalance{}
	if productorBalance != nil {
		err = json.Unmarshal(productorBalance, &productorBalanceRecord)
		if err != nil {
			return err
		}
	} else {
		productorBalanceRecord = models.ProductorBalance{
			TransactionType: "gdoBalance",
			ProducerID:      producerID,
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
	}

	// Add GDOs to the correct list based on asset type and status
	// New GDOs are always ACTIVE (available)
	switch request.AssetType {
	case models.Electricity:
		productorBalanceRecord.GDOS.Electricity.Available = append(productorBalanceRecord.GDOS.Electricity.Available, gdos...)
	case models.H2:
		productorBalanceRecord.GDOS.H2.Available = append(productorBalanceRecord.GDOS.H2.Available, gdos...)
	}

	updatedBalanceJSON, err := json.Marshal(productorBalanceRecord)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(producerID, updatedBalanceJSON)
	if err != nil {
		return err
	}

	// Update the related request
	request.GDOs = gdos
	request.Status = models.RequestApproved
	request.ApproverID = approverID
	request.Reason = reason
	request.ProcessedAt = issueDate

	updatedRequestJSON, err := json.Marshal(request)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(requestID, updatedRequestJSON)
	if err != nil {
		return err
	}
	return nil
}
func (rc *RequestContract) RejectRequest(
	ctx contractapi.TransactionContextInterface,
	requestID string,
	reason string) error {

	approverID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return errors.New("failed to get client identity: " + err.Error())
	}

	// Get the request
	requestJSON, err := ctx.GetStub().GetState(requestID)
	if err != nil {
		return errors.New("failed to read request: " + err.Error())
	}
	if requestJSON == nil {
		return errors.New("request " + requestID + " does not exist")
	}

	var request models.Request
	err = json.Unmarshal(requestJSON, &request)
	if err != nil {
		return err
	}

	if request.DocType != "REQUEST_TO_TRANSFORM_GDOS" {
		return errors.New("document is not a GDO request, found docType: " + request.DocType)
	}

	if request.Status != models.RequestPending {
		return errors.New("request is not in PENDING status, current status: " + string(request.Status))
	}

	// Get deterministic timestamp from transaction
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}
	processedAt := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).Format(time.RFC3339)

	request.Status = models.RequestRejected
	request.ApproverID = approverID
	request.Reason = reason
	request.ProcessedAt = processedAt

	updatedRequestJSON, err := json.Marshal(request)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(requestID, updatedRequestJSON)
	if err != nil {
		return err
	}

	return nil
}
func (rc *RequestContract) GetRequest(
	ctx contractapi.TransactionContextInterface,
	requestID string) (*models.Request, error) {

	requestJSON, err := ctx.GetStub().GetState(requestID)
	if err != nil {
		return nil, errors.New("failed to read request: " + err.Error())
	}
	if requestJSON == nil {
		return nil, errors.New("request " + requestID + " does not exist")
	}

	var request models.Request
	err = json.Unmarshal(requestJSON, &request)
	if err != nil {
		return nil, err
	}

	if request.DocType != "REQUEST_TO_TRANSFORM_GDOS" {
		return nil, errors.New("document is not a GDO request, found docType: " + request.DocType)
	}

	return &request, nil
}

func (rc *RequestContract) GetAllRequests(
	ctx contractapi.TransactionContextInterface) ([]*models.Request, error) {

	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var requests []*models.Request
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var request models.Request
		err = json.Unmarshal(queryResponse.Value, &request)
		if err != nil {
			continue
		}

		if request.DocType == "REQUEST_TO_TRANSFORM_GDOS" {
			requests = append(requests, &request)
		}
	}

	return requests, nil
}

func (rc *RequestContract) GetRequestsByStatus(
	ctx contractapi.TransactionContextInterface,
	status string) ([]*models.Request, error) {

	statusEnum, err := models.ParseRequestStatus(status)
	if err != nil {
		return nil, err
	}

	allRequests, err := rc.GetAllRequests(ctx)
	if err != nil {
		return nil, err
	}

	var filteredRequests []*models.Request
	for _, request := range allRequests {
		if request.Status == statusEnum {
			filteredRequests = append(filteredRequests, request)
		}
	}

	return filteredRequests, nil
}

func (rc *RequestContract) GetRequestsByProducer(
	ctx contractapi.TransactionContextInterface,
	producerID string) ([]*models.Request, error) {

	allRequests, err := rc.GetAllRequests(ctx)
	if err != nil {
		return nil, err
	}

	var producerRequests []*models.Request
	for _, request := range allRequests {
		if request.ProducerID == producerID {
			producerRequests = append(producerRequests, request)
		}
	}

	return producerRequests, nil
}

func (rc *RequestContract) GetRequestsByProducerAndStatus(
	ctx contractapi.TransactionContextInterface,
	producerID string,
	status string) ([]*models.Request, error) {

	statusEnum, err := models.ParseRequestStatus(status)
	if err != nil {
		return nil, err
	}

	allRequests, err := rc.GetAllRequests(ctx)
	if err != nil {
		return nil, err
	}

	var filteredRequests []*models.Request
	for _, request := range allRequests {
		if request.ProducerID == producerID && request.Status == statusEnum {
			filteredRequests = append(filteredRequests, request)
		}
	}

	return filteredRequests, nil
}

func (rc *RequestContract) GetRequestsByStatusAndAssetType(
	ctx contractapi.TransactionContextInterface,
	status string,
	assetType string) ([]*models.Request, error) {

	statusEnum, err := models.ParseRequestStatus(status)
	if err != nil {
		return nil, err
	}

	assetTypeEnum, err := models.ParseAssetType(assetType)
	if err != nil {
		return nil, err
	}

	allRequests, err := rc.GetAllRequests(ctx)
	if err != nil {
		return nil, err
	}

	var filteredRequests []*models.Request
	for _, request := range allRequests {
		if request.Status == statusEnum && request.AssetType == assetTypeEnum {
			filteredRequests = append(filteredRequests, request)
		}
	}

	return filteredRequests, nil
}
