package contracts

import (
	"encoding/json"
	"errors"
	"h2go-chaincodes/models"
	"time"

	"github.com/google/uuid"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type RequestContract struct {
	contractapi.Contract
}

func (rc *RequestContract) ApproveRequest(
	ctx contractapi.TransactionContextInterface,
	requestID string,
	reason string) error {

	approverID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return errors.New("failed to get client identity: " + err.Error())
	}

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

	// Validate that it's a GDO request
	if request.DocType != "REQUEST_TO_TRANSFORM_GDOS" {
		return errors.New("document is not a GDO request, found docType: " + request.DocType)
	}

	if request.Status != models.RequestPending {
		return errors.New("request is not in PENDING status, current status: " + string(request.Status))
	}

	producerID := request.ProducerID
	assetType := string(request.AssetType)
	gdoToGrant := request.Amount

	_, err = models.ParseAssetType(assetType)
	if err != nil {
		return err
	}

	pc := ProductionContract{}
	batches, err := pc.GetProductionBatchesByProducerAndAssetType(ctx, producerID, assetType)
	if err != nil {
		return err
	}
	if batches == nil {
		return errors.New("producer " + producerID + " batches not found")
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
		return errors.New("not enough available production to exchange for GDOs")
	}

	gdos := []models.GDO{}

	for _, batch := range availableBatches {
		availableInBatch := batch.AmountAvailable - batch.AmountUsed
		if availableInBatch > remainingGdoToGrant {
			batch.AmountUsed += remainingGdoToGrant
			remainingGdoToGrant = 0
		} else {
			batch.AmountUsed += availableInBatch
			remainingGdoToGrant -= availableInBatch
			batch.Status = models.ProductionUsed
		}
		gdo := models.GDO{
			GdoID:      uuid.New().String(),
			AssetType:  assetType,
			IssueDate:  time.Now().Format(time.RFC3339),
			ExpiryDate: batch.ProductionDate.AddDate(0, 18, 0).Format(time.RFC3339),
			OwnerID:    producerID,
			Status:     models.GdoActive,
		}
		gdos = append(gdos, gdo)
		batchJSON, err := json.Marshal(batch)
		if err != nil {
			return err
		}
		err = ctx.GetStub().PutState(batch.BatchId, batchJSON)
		if err != nil {
			return err
		}
	}

	productorBalance, err := ctx.GetStub().GetState(producerID)
	if err != nil {
		return err
	}
	productorBalanceRecord := models.ProductorBalance{}
	if productorBalance != nil {
		err = json.Unmarshal(productorBalance, &productorBalanceRecord)
		if err != nil {
			return err
		}
	} else {
		productorBalanceRecord = models.ProductorBalance{
			TransactionType: "gdoBalance",
			ProducerID:      producerID,
			GDOS:            []models.GDO{},
		}
	}
	productorBalanceRecord.GDOS = append(productorBalanceRecord.GDOS, gdos...)

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
	request.ProcessedAt = time.Now().Format(time.RFC3339)

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

func (rc *RequestContract) CreateRequest(
	ctx contractapi.TransactionContextInterface,
	producerID string,
	assetType string,
	amount int64) (string, error) {

	// Validate asset type
	assetTypeEnum, err := models.ParseAssetType(assetType)
	if err != nil {
		return "", err
	}

	// Validate amount
	if amount <= 0 {
		return "", errors.New("amount must be greater than 0")
	}

	// Generate request ID using transaction ID
	requestID := ctx.GetStub().GetTxID()

	// Create the request
	request := models.Request{
		DocType:     "REQUEST_TO_TRANSFORM_GDOS",
		RequestID:   requestID,
		ProducerID:  producerID,
		AssetType:   assetTypeEnum,
		Amount:      amount,
		Status:      models.RequestPending,
		Reason:      "",
		GDOs:        []models.GDO{},
		CreatedAt:   time.Now().Format(time.RFC3339),
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

	request.Status = models.RequestRejected
	request.ApproverID = approverID
	request.Reason = reason
	request.ProcessedAt = time.Now().Format(time.RFC3339)

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
