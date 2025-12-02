package models

type Request struct {
	DocType     string        `json:"docType"`
	RequestID   string        `json:"requestId"`
	ProducerID  string        `json:"producerId"`
	AssetType   AssetType     `json:"assetType"`
	Amount      int64         `json:"amount"`
	Status      RequestStatus `json:"status"`
	ApproverID  string        `json:"approverId,omitempty"`
	Reason      string        `json:"reason,omitempty"`
	GDOs        []GDO         `json:"gdos,omitempty"`
	CreatedAt   string        `json:"createdAt"`
	ProcessedAt string        `json:"processedAt,omitempty"`
}
