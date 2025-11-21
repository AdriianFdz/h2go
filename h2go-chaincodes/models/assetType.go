package models

import "fmt"

type AssetType string

const (
	Electricity AssetType = "ELECTRICITY"
	H2          AssetType = "H2"
)

// ValidAssetTypes returns all valid asset types
func ValidAssetTypes() []AssetType {
	return []AssetType{Electricity, H2}
}

// IsValid checks if the asset type is valid
func (at AssetType) IsValid() bool {
	switch at {
	case Electricity, H2:
		return true
	}
	return false
}

// ParseAssetType converts a string to AssetType with validation
func ParseAssetType(s string) (AssetType, error) {
	at := AssetType(s)
	if !at.IsValid() {
		return "", fmt.Errorf("invalid asset type: %s. Valid types: ELECTRICITY, H2", s)
	}
	return at, nil
}
