package models

import "fmt"

type ProductionStatus string

const (
	ProductionAvailable ProductionStatus = "AVAILABLE"
	ProductionExpired   ProductionStatus = "EXPIRED"
	ProductionUsed      ProductionStatus = "USED"
)

// ValidStatuses returns all valid statuses
func ValidStatuses() []ProductionStatus {
	return []ProductionStatus{ProductionAvailable, ProductionExpired, ProductionUsed}
}

// IsValid checks if the status is valid
func (s ProductionStatus) IsValid() bool {
	switch s {
	case ProductionAvailable, ProductionExpired, ProductionUsed:
		return true
	}
	return false
}

// ParseStatus converts a string to ProductionStatus with validation
func ParseStatus(str string) (ProductionStatus, error) {
	s := ProductionStatus(str)
	if !s.IsValid() {
		return "", fmt.Errorf("invalid status: %s. Valid statuses: AVAILABLE, EXPIRED, USED", str)
	}
	return s, nil
}
