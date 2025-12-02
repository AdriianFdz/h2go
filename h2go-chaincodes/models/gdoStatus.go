package models

import "fmt"

type GdoStatus string

const (
	GdoActive  GdoStatus = "ACTIVE"
	GdoExpired GdoStatus = "EXPIRED"
	GdoUsed    GdoStatus = "USED"
)

// ValidGdoStatuses returns all valid GDO statuses
func ValidGdoStatuses() []GdoStatus {
	return []GdoStatus{GdoActive, GdoExpired, GdoUsed}
}

// IsValid checks if the status is valid
func (s GdoStatus) IsValid() bool {
	switch s {
	case GdoActive, GdoExpired, GdoUsed:
		return true
	}
	return false
}

// ParseGdoStatus converts a string to GdoStatus with validation
func ParseGdoStatus(str string) (GdoStatus, error) {
	s := GdoStatus(str)
	if !s.IsValid() {
		return "", fmt.Errorf("invalid GDO status: %s. Valid statuses: ACTIVE, EXPIRED, USED", str)
	}
	return s, nil
}
