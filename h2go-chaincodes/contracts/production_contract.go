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

// Recuperar todos los production batches
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

// Recuperar production batch por ID
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

// Recuperar production batch por productor
func (pc *ProductionContract) GetProductionBatchesByProducer(ctx contractapi.TransactionContextInterface, producerID string) ([]*models.ProductionRecord, error) {
	// Get all batches first
	allBatches, err := pc.GetAllProductionBatches(ctx)
	if err != nil {
		return nil, err
	}

	// Filter by producer
	var producerBatches []*models.ProductionRecord
	for _, batch := range allBatches {
		if batch.ProducerId == producerID {
			producerBatches = append(producerBatches, batch)
		}
	}

	return producerBatches, nil
}
