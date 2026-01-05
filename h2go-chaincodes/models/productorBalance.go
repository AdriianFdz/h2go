package models

type GDOsByStatus struct {
	Available   []GDO `json:"available"`
	Unavailable []GDO `json:"unavailable"`
}

type GDOsByAssetType struct {
	Electricity GDOsByStatus `json:"ELECTRICITY"`
	H2          GDOsByStatus `json:"H2"`
}

type ProductorBalance struct {
	TransactionType string          `json:"transactionType"`
	ProducerID      string          `json:"producerId"`
	GDOS            GDOsByAssetType `json:"gdos"`
}
