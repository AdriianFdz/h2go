package models

type GDO struct {
	DocType    string    `json:"docType"`
	GdoID      string    `json:"gdoId"`
	RequestID  string    `json:"requestId"`
	AssetType  AssetType `json:"assetType"`
	IssueDate  string    `json:"issueDate"`
	ExpiryDate string    `json:"expiryDate"`
	OwnerID    string    `json:"ownerId"`
	Status     GdoStatus `json:"status"`
}
