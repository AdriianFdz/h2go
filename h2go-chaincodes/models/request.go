package models

import "encoding/json"

type Request struct {
	DocType     string        `json:"docType"`
	RequestID   string        `json:"requestId"`
	ProducerID  string        `json:"producerId"`
	AssetType   AssetType     `json:"assetType"`
	Amount      int64         `json:"amount"`
	Status      RequestStatus `json:"status"`
	ApproverID  string        `json:"approverId"`
	Reason      string        `json:"reason"`
	GdOs        []GdO         `json:"gdos"`
	CreatedAt   string        `json:"createdAt"`
	ProcessedAt string        `json:"processedAt"`
}

func (r *Request) UnmarshalJSON(data []byte) error {
	// Usamos un alias para evitar recursión infinita
	type Alias Request
	aux := &struct {
		*Alias
	}{
		Alias: (*Alias)(r),
	}

	// Deserializar normalmente
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}

	// Corregir GdOs si es nil
	if r.GdOs == nil {
		r.GdOs = []GdO{}
	}

	return nil
}
