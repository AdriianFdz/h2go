package models

import "fmt"

type RequestStatus string

const (
	RequestPending   RequestStatus = "PENDING"
	RequestApproved  RequestStatus = "APPROVED"
	RequestRejected  RequestStatus = "REJECTED"
	RequestCancelled RequestStatus = "CANCELLED"
)

// ValidRequestStatuses returns all valid request statuses
func ValidRequestStatuses() []RequestStatus {
	return []RequestStatus{RequestPending, RequestApproved, RequestRejected, RequestCancelled}
}

// IsValid checks if the request status is valid
func (rs RequestStatus) IsValid() bool {
	switch rs {
	case RequestPending, RequestApproved, RequestRejected, RequestCancelled:
		return true
	}
	return false
}

// ParseRequestStatus converts a string to RequestStatus with validation
func ParseRequestStatus(str string) (RequestStatus, error) {
	rs := RequestStatus(str)
	if !rs.IsValid() {
		// Build valid statuses string dynamically from ValidRequestStatuses
		validStatuses := ValidRequestStatuses()
		validStatusesStr := ""
		for i, vs := range validStatuses {
			if i > 0 {
				validStatusesStr += ", "
			}
			validStatusesStr += string(vs)
		}
		return "", fmt.Errorf("invalid request status: %s. Valid statuses: %s", str, validStatusesStr)
	}
	return rs, nil
}
