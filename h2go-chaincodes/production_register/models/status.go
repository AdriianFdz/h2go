package models

type Status string

const (
	Available Status = "AVAILABLE"
	Expired   Status = "EXPIRED"
	Used      Status = "USED"
)
