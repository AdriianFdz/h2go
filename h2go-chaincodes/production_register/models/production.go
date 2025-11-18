package models

import "time"

type ProductionRecord struct {
	TransactionType TransactionType `json:"transactionType"`
	BatchId         string          `json:"batchId"`
	ProducerId      string          `json:"producerId"`
	AssetType       AssetType       `json:"assetType"`
	AmountUsed      int64           `json:"amountUsed"`
	AmountAvailable int64           `json:"amountAvailable"`
	Unit            Unit            `json:"unit"`
	ProductionDate  time.Time       `json:"productionDate"`
	ExpiryDate      time.Time       `json:"expiryDate"`
	Status          Status          `json:"status"`
}
