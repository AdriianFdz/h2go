package models

type GDOsByAssetType struct {
	Electricity []GDO `json:"ELECTRICITY"`
	H2          []GDO `json:"H2"`
}

type ProductorBalance struct {
	TransactionType string          `json:"transactionType"`
	ProducerID      string          `json:"producerId"`
	GDOS            GDOsByAssetType `json:"gdos"`
}
