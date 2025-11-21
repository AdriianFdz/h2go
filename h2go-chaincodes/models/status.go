package models

import "fmt"

type Status string

const (
	Available Status = "AVAILABLE"
	Expired   Status = "EXPIRED"
	Used      Status = "USED"
)

// ValidStatuses returns all valid statuses
func ValidStatuses() []Status {
	return []Status{Available, Expired, Used}
}

// IsValid checks if the status is valid
func (s Status) IsValid() bool {
	switch s {
	case Available, Expired, Used:
		return true
	}
	return false
}

// ParseStatus converts a string to Status with validation
func ParseStatus(str string) (Status, error) {
	s := Status(str)
	if !s.IsValid() {
		return "", fmt.Errorf("invalid status: %s. Valid statuses: AVAILABLE, EXPIRED, USED", str)
	}
	return s, nil
}
