package models

type GdOsByStatus struct {
	Available   []GdO `json:"available"`
	Unavailable []GdO `json:"unavailable"`
}

type GdOsByAssetType struct {
	Electricity GdOsByStatus `json:"ELECTRICITY"`
	H2          GdOsByStatus `json:"H2"`
}

type ProductorBalance struct {
	TransactionType string          `json:"transactionType"`
	ProducerID      string          `json:"producerId"`
	GdOS            GdOsByAssetType `json:"gdos"`
}
