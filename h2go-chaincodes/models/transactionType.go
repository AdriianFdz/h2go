package models

type TransactionType string

const (
    RegisterProductionBatch TransactionType = "PRODUCTION_BATCH"

	RequestToTransformGdos TransactionType = "REQUEST_TO_TRANSFORM_GDOS"
	ResponseToTransformGdos  TransactionType = "RESPONSE_TO_TRANSFORM_GDOS"

	RequestToRedemption TransactionType = "REQUEST_TO_REDEMPTION"
	Redemption TransactionType = "REDEMPTION"
)