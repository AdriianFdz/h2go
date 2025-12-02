package contracts

import (
	"encoding/json"
	"errors"
	"h2go-chaincodes/models"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type ProductionContract struct {
	contractapi.Contract
}

func (pc *ProductionContract) RegisterProduction(
	ctx contractapi.TransactionContextInterface,
	producerID string,
	assetType string,
	amountAvailable int64,
	unit string,
	productionDate string) error {

	assetTypeEnum, err := models.ParseAssetType(assetType)
	if err != nil {
		return err
	}

	unitEnum, err := models.ParseUnit(unit)
	if err != nil {
		return err
	}

	prodDate, err := time.Parse(time.RFC3339, productionDate)
	if err != nil {
		return errors.New("invalid production date format, use RFC3339")
	}

	// Añadir 12 meses desde la fecha de producción
	expiryDate := prodDate.AddDate(0, 12, 0)

	batch := models.ProductionRecord{
		TransactionType: models.RegisterProductionBatch,
		BatchId:         ctx.GetStub().GetTxID(),
		ProducerId:      producerID,
		AssetType:       assetTypeEnum,
		AmountUsed:      0,
		AmountAvailable: amountAvailable,
		Unit:            unitEnum,
		ProductionDate:  prodDate,
		ExpiryDate:      expiryDate,
		Status:          models.Available,
	}

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(batch.BatchId, batchJSON)
}

func (pc *ProductionContract) GetAllProductionBatches(ctx contractapi.TransactionContextInterface) ([]*models.ProductionRecord, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var batches []*models.ProductionRecord
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var batch models.ProductionRecord
		err = json.Unmarshal(queryResponse.Value, &batch)
		if err != nil {
			return nil, err
		}
		batches = append(batches, &batch)
	}

	return batches, nil
}

func (pc *ProductionContract) GetProductionBatch(ctx contractapi.TransactionContextInterface, batchId string) (*models.ProductionRecord, error) {
	batchJSON, err := ctx.GetStub().GetState(batchId)
	if err != nil {
		return nil, errors.New("failed to read from world state: " + err.Error())
	}
	if batchJSON == nil {
		return nil, errors.New("the batch " + batchId + " does not exist")
	}

	var batch models.ProductionRecord
	err = json.Unmarshal(batchJSON, &batch)
	if err != nil {
		return nil, err
	}

	return &batch, nil
}

func (pc *ProductionContract) GetProductionBatchesByProducer(ctx contractapi.TransactionContextInterface, producerID string) ([]*models.ProductionRecord, error) {
	allBatches, err := pc.GetAllProductionBatches(ctx)
	if err != nil {
		return nil, err
	}

	var producerBatches []*models.ProductionRecord
	for _, batch := range allBatches {
		if batch.ProducerId == producerID {
			producerBatches = append(producerBatches, batch)
		}
	}

	return producerBatches, nil
}

func (pc *ProductionContract) GetProductionBatchesByProducerAndAssetType(
	ctx contractapi.TransactionContextInterface,
	producerID string,
	assetType string) ([]*models.ProductionRecord, error) {

	productorBatches, err := pc.GetProductionBatchesByProducer(ctx, producerID)
	if err != nil {
		return nil, err
	}

	var filteredBatches []*models.ProductionRecord
	for _, batch := range productorBatches {
		if string(batch.AssetType) == assetType {
			filteredBatches = append(filteredBatches, batch)
		}
	}

	return filteredBatches, nil
}

func (pc *ProductionContract) SetBatchAsExpired(
	ctx contractapi.TransactionContextInterface,
	batchId string) error {
	batch, err := pc.GetProductionBatch(ctx, batchId)
	if err != nil {
		return err
	}
	if batch == nil {
		return errors.New("batch " + batchId + " not found")
	}

	if batch.ExpiryDate.After(time.Now()) {
		return errors.New("batch " + batchId + " has not yet expired")
	}

	if batch.Status != models.Available {
		return errors.New("batch " + batchId + " is not available to be marked as expired")
	}

	batch.Status = models.Expired

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(batch.BatchId, batchJSON)
}

func (pc *ProductionContract) UseProduction(
	ctx contractapi.TransactionContextInterface,
	producerID string,
	assetType string,
	amountToUse int64) error {

	if assetType != string(models.H2) && assetType != string(models.Electricity) {
		return errors.New("invalid asset type: " + assetType)
	}

	batches, err := pc.GetProductionBatchesByProducerAndAssetType(ctx, producerID, assetType)
	if err != nil {
		return err
	}
	if batches == nil {
		return errors.New("producer " + producerID + " batches not found")
	}

	availableBatches := make([]*models.ProductionRecord, 0)
	var totalAvailable int64 = 0
	for _, batch := range batches {
		if totalAvailable >= amountToUse {
			break
		}
		if batch.Status == models.Available {
			totalAvailable += batch.AmountAvailable - batch.AmountUsed
			availableBatches = append(availableBatches, batch)
		}
	}
	if totalAvailable < amountToUse {
		return errors.New("not enough available production to use")
	}

	for _, batch := range availableBatches {
		availableInBatch := batch.AmountAvailable - batch.AmountUsed
		if availableInBatch > amountToUse {
			batch.AmountUsed += amountToUse
			amountToUse = 0
		} else {
			batch.AmountUsed += availableInBatch
			amountToUse -= availableInBatch
			batch.Status = models.Used
		}
		batchJSON, err := json.Marshal(batch)
		if err != nil {
			return err
		}
		err = ctx.GetStub().PutState(batch.BatchId, batchJSON)
		if err != nil {
			return err
		}
	}

	return nil
}
