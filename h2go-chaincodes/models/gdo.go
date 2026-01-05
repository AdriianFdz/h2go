package models

type GDO struct {
	GdoID      string    `json:"gdoId"`
	RequestID  string    `json:"requestId"`
	AssetType  string    `json:"assetType"`
	IssueDate  string    `json:"issueDate"`
	ExpiryDate string    `json:"expiryDate"`
	OwnerID    string    `json:"ownerId"`
	Status     GdoStatus `json:"status"`
}
