package models

type Request struct {
	DocType     string        `json:"docType"`
	RequestID   string        `json:"requestId"`
	ProducerID  string        `json:"producerId"`
	AssetType   AssetType     `json:"assetType"`
	Amount      int64         `json:"amount"`
	Status      RequestStatus `json:"status"`
	ApproverID  string        `json:"approverId"`
	Reason      string        `json:"reason"`
	GDOs        []GDO         `json:"gdos"`
	CreatedAt   string        `json:"createdAt"`
	ProcessedAt string        `json:"processedAt"`
}
