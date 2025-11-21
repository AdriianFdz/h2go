package main

import (
	"log"

	"h2go-chaincodes/contracts"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

func main() {
	productionContract := new(contracts.ProductionContract)

	chaincode, err := contractapi.NewChaincode(productionContract)
	if err != nil {
		log.Panicf("Error creating h2go chaincode: %v", err)
	}

	if err := chaincode.Start(); err != nil {
		log.Panicf("Error starting h2go chaincode: %v", err)
	}
}
