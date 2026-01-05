package contracts

import (
	"encoding/json"
	"errors"
	"h2go-chaincodes/models"

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
