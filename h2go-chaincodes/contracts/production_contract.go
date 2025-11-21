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

// Add your chaincode methods here

// Register production
func (pc *ProductionContract) RegisterProduction(
	ctx contractapi.TransactionContextInterface,
	producerID string,
	assetType string,
	amountAvailable int64,
	unit string,
	productionDate string) error {

	// Validate and parse assetType
	assetTypeEnum, err := models.ParseAssetType(assetType)
	if err != nil {
		return err
	}

	// Validate and parse unit
	unitEnum, err := models.ParseUnit(unit)
	if err != nil {
		return err
	}

	// Parse production date
	prodDate, err := time.Parse(time.RFC3339, productionDate)
	if err != nil {
		return errors.New("invalid production date format, use RFC3339")
	}

	// Calculate expiry date (12 months from production)
	expiryDate := prodDate.AddDate(0, 12, 0)

	// Implementation for registering production
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
