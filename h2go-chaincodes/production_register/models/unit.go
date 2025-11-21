package models

import "fmt"

type Unit string

const (
	Kwh Unit = "KWH"
	Kg  Unit = "KG"
)

// ValidUnits returns all valid units
func ValidUnits() []Unit {
	return []Unit{Kwh, Kg}
}

// IsValid checks if the unit is valid
func (u Unit) IsValid() bool {
	switch u {
	case Kwh, Kg:
		return true
	}
	return false
}

// ParseUnit converts a string to Unit with validation
func ParseUnit(s string) (Unit, error) {
	u := Unit(s)
	if !u.IsValid() {
		return "", fmt.Errorf("invalid unit: %s. Valid units: KWH, KG", s)
	}
	return u, nil
}
