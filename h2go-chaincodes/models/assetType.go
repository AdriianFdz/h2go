package models

import "fmt"

type AssetType string

const (
	Electricity AssetType = "ELECTRICITY"
	H2          AssetType = "H2"
)

func ValidAssetTypes() []AssetType {
	return []AssetType{Electricity, H2}
}

func (at AssetType) IsValid() bool {
	switch at {
	case Electricity, H2:
		return true
	}
	return false
}

func ParseAssetType(s string) (AssetType, error) {
	at := AssetType(s)
	if !at.IsValid() {
		validTypes := ValidAssetTypes()
		validTypesStr := ""
		for i, vt := range validTypes {
			if i > 0 {
				validTypesStr += ", "
			}
			validTypesStr += string(vt)
		}
		return "", fmt.Errorf("invalid asset type: %s. Valid types: %s", s, validTypesStr)
	}
	return at, nil
}
