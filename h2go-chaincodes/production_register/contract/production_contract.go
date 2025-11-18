package contract

import (
	"encoding/json"
	"production_register/models"
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
	assetType models.AssetType,
	amountAvailable int64,
	unit models.Unit,
	productionDate time.Time) error {

	// Calculate expiry date (12 months from production)
	expiryDate := productionDate.AddDate(0, 12, 0)

	// Implementation for registering production
	batch := models.ProductionRecord{
		TransactionType: models.RegisterProductionBatch,
		BatchId:         ctx.GetStub().GetTxID(),
		ProducerId:      producerID,
		AssetType:       assetType,
		AmountUsed:      0,
		AmountAvailable: amountAvailable,
		Unit:            unit,
		ProductionDate:  productionDate,
		ExpiryDate:      expiryDate,
		Status:          models.Available,
	}

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(batch.BatchId, batchJSON)
}
