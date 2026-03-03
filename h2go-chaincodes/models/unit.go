package models

import "fmt"

type Unit string

const (
	Mwh Unit = "MWH"
)

// ValidUnits returns all valid units
func ValidUnits() []Unit {
	return []Unit{Mwh}
}

// IsValid checks if the unit is valid
func (u Unit) IsValid() bool {
	switch u {
	case Mwh:
		return true
	}
	return false
}

// ParseUnit converts a string to Unit with validation
func ParseUnit(s string) (Unit, error) {
	u := Unit(s)
	if !u.IsValid() {
		return "", fmt.Errorf("invalid unit: %s. Valid unit: MWH", s)
	}
	return u, nil
}
