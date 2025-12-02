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

func (rc *RequestContract) GrantGdo(
	ctx contractapi.TransactionContextInterface,
	producerID string,
	assetType string,
	gdoToGrant int64) error {

	_, err := models.ParseAssetType(assetType)
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

	return nil
}
