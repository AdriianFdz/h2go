package main

import (
	"io/ioutil"
	"log"
	"os"

	"h2go-chaincodes/contracts"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/pkg/errors"
	"google.golang.org/grpc/keepalive"
)

func runChaincodeService(contract *contractapi.ContractChaincode) error {
	packageID := os.Getenv("CORE_CHAINCODE_ID")
	address := os.Getenv("CORE_CHAINCODE_ADDRESS")
	keyFile := os.Getenv("CORE_CHAINCODE_TLS_KEY_FILE")
	certFile := os.Getenv("CORE_CHAINCODE_TLS_CERT_FILE")
	clientCACertsFile := os.Getenv("CORE_CHAINCODE_TLS_CLIENT_CACERT_FILE")

	// Check if TLS is enabled
	tlsEnabled := keyFile != "" && certFile != "" && clientCACertsFile != ""

	var tlsProps shim.TLSProperties
	if tlsEnabled {
		log.Println("TLS enabled - reading certificates")
		keyBytes, err := ioutil.ReadFile(keyFile)
		if err != nil {
			return errors.Wrapf(err, "failed to read file %s", keyFile)
		}
		certBytes, err := ioutil.ReadFile(certFile)
		if err != nil {
			return errors.Wrapf(err, "failed to read file %s", certFile)
		}
		clientCABytes, err := ioutil.ReadFile(clientCACertsFile)
		if err != nil {
			return errors.Wrapf(err, "failed to read file %s", clientCACertsFile)
		}

		tlsProps = shim.TLSProperties{
			Disabled:      false,
			Key:           keyBytes,
			Cert:          certBytes,
			ClientCACerts: clientCABytes,
		}
	} else {
		log.Println("TLS disabled - running in insecure mode (only for development)")
		tlsProps = shim.TLSProperties{
			Disabled: true,
		}
	}

	server := &shim.ChaincodeServer{
		CCID:     packageID,
		CC:       contract,
		Address:  address,
		KaOpts:   &keepalive.ServerParameters{},
		TLSProps: tlsProps,
	}

	log.Printf("Running chaincode %s on %s", packageID, address)
	err := server.Start()
	if err != nil {
		return err
	}
	return nil
}

func main() {
	productionContract := new(contracts.ProductionContract)
	requestContract := new(contracts.RequestContract)
	redemptionContract := new(contracts.RedemptionContract)

	chaincode, err := contractapi.NewChaincode(productionContract, requestContract, redemptionContract)
	if err != nil {
		log.Panicf("Error creating h2go chaincode: %v", err)
	}

	err = runChaincodeService(chaincode)
	if err != nil {
		log.Panicf("Error running chaincode as a service: %v", err)
	}
}
