package models

type ProductorBalance struct {
	TransactionType string `json:"transactionType"`
	ProducerID      string `json:"producerId"`
	GDOS            []GDO  `json:"gdos"`
}
