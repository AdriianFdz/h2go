package models

type TransactionType string

const (
    RegisterProductionBatch TransactionType = "PRODUCTION_BATCH"

	RequestToTransformGdos TransactionType = "REQUEST_TO_TRANSFORM_GdOS"
	ResponseToTransformGdos  TransactionType = "RESPONSE_TO_TRANSFORM_GdOS"

	RequestToRedemption TransactionType = "REQUEST_TO_REDEMPTION"
	Redemption TransactionType = "REDEMPTION"
)