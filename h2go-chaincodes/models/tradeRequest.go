package models

import "encoding/json"

type TradeRequest struct {
	DocType     string        `json:"docType"`
	TradeID     string        `json:"tradeID"`
	ProducerID  string        `json:"producerID"`
	TargetID    string        `json:"targetID"`
	AssetType   AssetType     `json:"assetType"`
	Amount      float64       `json:"amount"`
	Status      RequestStatus `json:"status"`
	ApproverID  string        `json:"approverId"`
	GDOs        []GDO         `json:"gdos"`
	CreatedAt   string        `json:"createdAt"`
	ProcessedAt string        `json:"processedAt"`
}

func (tr *TradeRequest) UnmarshalJSON(data []byte) error {
	// Usamos un alias para evitar recursión infinita
	type Alias TradeRequest
	aux := &struct {
		*Alias
	}{
		Alias: (*Alias)(tr),
	}

	// Deserializar normalmente
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}

	// Corregir GDOs si es nil
	if tr.GDOs == nil {
		tr.GDOs = []GDO{}
	}

	return nil
}
