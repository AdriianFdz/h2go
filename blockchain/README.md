# H2GO — Blockchain Infrastructure

<p align="center">
  <img src="https://img.shields.io/badge/Hyperledger%20Fabric-3.1-2F3134?style=flat-square&logo=hyperledger&logoColor=white" alt="Fabric" />
  <img src="https://img.shields.io/badge/Kubernetes-Kind-326CE5?style=flat-square&logo=kubernetes&logoColor=white" alt="K8s" />
  <img src="https://img.shields.io/badge/Istio-1.23-466BB0?style=flat-square&logo=istio&logoColor=white" alt="Istio" />
  <img src="https://img.shields.io/badge/Helm-3-0F1689?style=flat-square&logo=helm&logoColor=white" alt="Helm" />
</p>

This guide walks you through deploying the complete **Hyperledger Fabric** blockchain network that powers the H2GO platform. The network runs on a local **Kubernetes** cluster (Kind) and uses the **HLF Operator** to manage Fabric components declaratively.

## Table of Contents

- [Network Topology](#network-topology)
- [Prerequisites](#prerequisites)
- [Folder Structure](#folder-structure)
- [Deployment Steps](#deployment-steps)
  - [1. Create a Kind Cluster](#1-create-a-kind-cluster)
  - [2. Install the HLF Kubernetes Operator](#2-install-the-hlf-kubernetes-operator)
  - [3. Install the kubectl HLF Plugin](#3-install-the-kubectl-hlf-plugin)
  - [4. Install Istio](#4-install-istio)
  - [5. Configure Internal DNS](#5-configure-internal-dns)
  - [6. Create Certificate Authorities](#6-create-certificate-authorities)
  - [7. Register Users and Create Peers](#7-register-users-and-create-peers)
  - [8. Create Orderer CA and Orderer Nodes](#8-create-orderer-ca-and-orderer-nodes)
  - [9. Register Admin Identities and Create Secrets](#9-register-admin-identities-and-create-secrets)
  - [10. Create the Channel](#10-create-the-channel)
  - [11. Join Peers to the Channel](#11-join-peers-to-the-channel)
  - [12. Install and Deploy the Chaincode](#12-install-and-deploy-the-chaincode)
- [Testing the Chaincode](#testing-the-chaincode)
- [Cleanup](#cleanup)

## Network Topology

![]

| Organization | MSP ID | Role | Peer |
|---|---|---|---|
| REE | `ReeMSP` | System Operator | `ree-peer0` |
| Enagás GTS | `EnagasgtsMSP` | Gas Transmission | `enagasgts-peer0` |
| Trader 1 | `Trader1MSP` | Trader | `trader1-peer0` |
| Trader 2 | `Trader2MSP` | Trader | `trader2-peer0` |
| Trader 3 | `Trader3MSP` | Trader | `trader3-peer0` |
| CNMC | `CnmcMSP` | Regulator | `cnmc-peer0` |
| Enagás | `EnagasMSP` | Issuing Body | `enagas-peer0` |
| Dev | `DevMSP` | Development/Admin | `dev-peer0` |
| Orderer | `OrdererMSP` | Ordering Service | `ord-node0/1/2` |

### Endorsement Policy

```
AND('CnmcMSP.member', 'EnagasMSP.member',
    OR('Trader1MSP.member', 'Trader2MSP.member', 'Trader3MSP.member',
       'ReeMSP.member', 'EnagasgtsMSP.member'))
```

Both the regulator (CNMC) **and** the issuing body (Enagás) must endorse, plus at least one other participant.

---

## Prerequisites

| Tool | Installation |
|---|---|
| **Docker** | [docker.com/get-started](https://www.docker.com/get-started) |
| **Kind** | [kind.sigs.k8s.io](https://kind.sigs.k8s.io/docs/user/quick-start/) |
| **Helm** | [helm.sh/docs/intro/install](https://helm.sh/docs/intro/install/) |
| **kubectl** | [kubernetes.io/docs/tasks/tools](https://kubernetes.io/docs/tasks/tools/) |
| **Krew** | [krew.sigs.k8s.io](https://krew.sigs.k8s.io/docs/user-guide/setup/install/) |
| **jq** | [stedolan.github.io/jq](https://stedolan.github.io/jq/) |

Ensure **ports 80 and 443** are available on your host machine.

---

## Folder Structure

```
h2go/
├── blockchain/
│   ├── istio-1.23.3/          # Istio binaries (generated)
│   ├── keystore/              # Crypto material (generated)
│   ├── resources/             # Connection profiles & certs (generated)
│   │   ├── kind-config.yaml
│   │   ├── network.yaml       # Fabric connection profile
│   │   ├── *msp.yaml          # Organization MSP certificates
│   │   └── *-tlsca.yaml       # TLS CA certificates
│   └── README.md              # ⬅ You are here
│
├── h2go-chaincodes/           # Smart contracts (Go)
│   ├── contracts/
│   │   ├── production_contract.go
│   │   ├── request_contract.go
│   │   └── redemption_contract.go
│   ├── models/
│   ├── main.go
│   └── Dockerfile
```

> **Note:** The `resources/` directory is populated during deployment. You may need to create it manually before starting.

---

## Deployment Steps

### 1. Create a Kind Cluster

```bash
mkdir -p resources

cat << EOF > resources/kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 30949
    hostPort: 80
  - containerPort: 30950
    hostPort: 443
EOF

kind create cluster --config=./resources/kind-config.yaml
```

### 2. Install the HLF Kubernetes Operator

This installs CRDs for Fabric Peers, Orderers, and CAs, plus the operator controller.

```bash
helm repo add kfs https://kfsoftware.github.io/hlf-helm-charts --force-update
helm repo update
helm install hlf-operator --version=1.13.0 kfs/hlf-operator
```

### 3. Install the kubectl HLF Plugin

```bash
kubectl krew install hlf
```

### 4. Install Istio

Download and install Istio binaries:

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.23.3 sh -
export PATH="$PATH:$PWD/istio-1.23.3/bin"
```

Deploy Istio on the cluster:

```bash
kubectl create namespace istio-system
istioctl operator init

kubectl apply -f - <<EOF
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-gateway
  namespace: istio-system
spec:
  addonComponents:
    grafana:
      enabled: false
    kiali:
      enabled: false
    prometheus:
      enabled: false
    tracing:
      enabled: false
  components:
    ingressGateways:
      - enabled: true
        k8s:
          hpaSpec:
            minReplicas: 1
          resources:
            limits:
              cpu: 500m
              memory: 512Mi
            requests:
              cpu: 100m
              memory: 128Mi
          service:
            ports:
              - name: http
                port: 80
                targetPort: 8080
                nodePort: 30949
              - name: https
                port: 443
                targetPort: 8443
                nodePort: 30950
            type: NodePort
        name: istio-ingressgateway
    pilot:
      enabled: true
      k8s:
        hpaSpec:
          minReplicas: 1
        resources:
          limits:
            cpu: 300m
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 128Mi
  meshConfig:
    accessLogFile: /dev/stdout
    enableTracing: false
    outboundTrafficPolicy:
      mode: ALLOW_ANY
  profile: default
EOF
```

### 5. Configure Internal DNS

Create a DNS hack to redirect `*.localho.st` to the Istio ingress gateway:

```bash
CLUSTER_IP=$(kubectl -n istio-system get svc istio-ingressgateway -o json | jq -r .spec.clusterIP)

kubectl apply -f - <<EOF
kind: ConfigMap
apiVersion: v1
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
           lameduck 5s
        }
        rewrite name regex (.*)\.localho\.st host.ingress.internal
        hosts {
          ${CLUSTER_IP} host.ingress.internal
          fallthrough
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
           ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf {
           max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
EOF
```

### 6. Create Certificate Authorities

Export image versions:

```bash
export PEER_IMAGE=hyperledger/fabric-peer
export PEER_VERSION=3.1.3
export ORDERER_IMAGE=hyperledger/fabric-orderer
export ORDERER_VERSION=3.1.3
export CA_IMAGE=hyperledger/fabric-ca
export CA_VERSION=1.5.15
```

Create one CA per organization:

```bash
kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=standard \
    --capacity=1Gi --name=ree-ca --enroll-id=enroll --enroll-pw=enrollpw \
    --hosts=ree-ca.localho.st --istio-port=443

kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=standard \
    --capacity=1Gi --name=enagasgts-ca --enroll-id=enroll --enroll-pw=enrollpw \
    --hosts=enagasgts-ca.localho.st --istio-port=443

kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=standard \
    --capacity=1Gi --name=trader1-ca --enroll-id=enroll --enroll-pw=enrollpw \
    --hosts=trader1-ca.localho.st --istio-port=443

kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=standard \
    --capacity=1Gi --name=trader2-ca --enroll-id=enroll --enroll-pw=enrollpw \
    --hosts=trader2-ca.localho.st --istio-port=443

kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=standard \
    --capacity=1Gi --name=trader3-ca --enroll-id=enroll --enroll-pw=enrollpw \
    --hosts=trader3-ca.localho.st --istio-port=443

kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=standard \
    --capacity=1Gi --name=cnmc-ca --enroll-id=enroll --enroll-pw=enrollpw \
    --hosts=cnmc-ca.localho.st --istio-port=443

kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=standard \
    --capacity=1Gi --name=enagas-ca --enroll-id=enroll --enroll-pw=enrollpw \
    --hosts=enagas-ca.localho.st --istio-port=443

kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=standard \
    --capacity=1Gi --name=dev-ca --enroll-id=enroll --enroll-pw=enrollpw \
    --hosts=dev-ca.localho.st --istio-port=443

# Wait for all CAs
kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all
```

### 7. Register Users and Create Peers

For each organization, register a peer identity and create the peer node:

```bash
# REE
kubectl hlf ca register --name=ree-ca --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid ReeMSP

kubectl hlf peer create --statedb=couchdb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=standard --enroll-id=peer --mspid=ReeMSP \
        --enroll-pw=peerpw --capacity=5Gi --name=ree-peer0 --ca-name=ree-ca.default \
        --hosts=peer0-ree.localho.st --istio-port=443

# Enagás GTS
kubectl hlf ca register --name=enagasgts-ca --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid EnagasgtsMSP

kubectl hlf peer create --statedb=couchdb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=standard --enroll-id=peer --mspid=EnagasgtsMSP \
        --enroll-pw=peerpw --capacity=5Gi --name=enagasgts-peer0 --ca-name=enagasgts-ca.default \
        --hosts=peer0-enagasgts.localho.st --istio-port=443

# Trader 1
kubectl hlf ca register --name=trader1-ca --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid Trader1MSP

kubectl hlf peer create --statedb=couchdb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=standard --enroll-id=peer --mspid=Trader1MSP \
        --enroll-pw=peerpw --capacity=5Gi --name=trader1-peer0 --ca-name=trader1-ca.default \
        --hosts=peer0-trader1.localho.st --istio-port=443

# Trader 2
kubectl hlf ca register --name=trader2-ca --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid Trader2MSP

kubectl hlf peer create --statedb=couchdb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=standard --enroll-id=peer --mspid=Trader2MSP \
        --enroll-pw=peerpw --capacity=5Gi --name=trader2-peer0 --ca-name=trader2-ca.default \
        --hosts=peer0-trader2.localho.st --istio-port=443

# Trader 3
kubectl hlf ca register --name=trader3-ca --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid Trader3MSP

kubectl hlf peer create --statedb=couchdb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=standard --enroll-id=peer --mspid=Trader3MSP \
        --enroll-pw=peerpw --capacity=5Gi --name=trader3-peer0 --ca-name=trader3-ca.default \
        --hosts=peer0-trader3.localho.st --istio-port=443

# CNMC
kubectl hlf ca register --name=cnmc-ca --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid CnmcMSP

kubectl hlf peer create --statedb=couchdb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=standard --enroll-id=peer --mspid=CnmcMSP \
        --enroll-pw=peerpw --capacity=5Gi --name=cnmc-peer0 --ca-name=cnmc-ca.default \
        --hosts=peer0-cnmc.localho.st --istio-port=443

# Enagás
kubectl hlf ca register --name=enagas-ca --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid EnagasMSP

kubectl hlf peer create --statedb=couchdb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=standard --enroll-id=peer --mspid=EnagasMSP \
        --enroll-pw=peerpw --capacity=5Gi --name=enagas-peer0 --ca-name=enagas-ca.default \
        --hosts=peer0-enagas.localho.st --istio-port=443

# Dev
kubectl hlf ca register --name=dev-ca --user=peer --secret=peerpw --type=peer \
 --enroll-id enroll --enroll-secret=enrollpw --mspid DevMSP

kubectl hlf peer create --statedb=couchdb --image=$PEER_IMAGE --version=$PEER_VERSION --storage-class=standard --enroll-id=peer --mspid=DevMSP \
        --enroll-pw=peerpw --capacity=5Gi --name=dev-peer0 --ca-name=dev-ca.default \
        --hosts=peer0-dev.localho.st --istio-port=443

# Wait for all peers
kubectl wait --timeout=180s --for=condition=Running fabricpeers.hlf.kungfusoftware.es --all
```

### 8. Create Orderer CA and Orderer Nodes

```bash
kubectl hlf ca create --image=$CA_IMAGE --version=$CA_VERSION --storage-class=standard \
    --capacity=1Gi --name=ord-ca --enroll-id=enroll --enroll-pw=enrollpw \
    --hosts=ord-ca.localho.st --istio-port=443

kubectl wait --timeout=180s --for=condition=Running fabriccas.hlf.kungfusoftware.es --all

kubectl hlf ca register --name=ord-ca --user=orderer --secret=ordererpw \
    --type=orderer --enroll-id enroll --enroll-secret=enrollpw --mspid=OrdererMSP \
    --ca-url="https://ord-ca.localho.st:443"

# Create 3 orderer nodes for redundancy
for i in 0 1 2; do
kubectl hlf ordnode create --image=$ORDERER_IMAGE --version=$ORDERER_VERSION \
    --storage-class=standard --enroll-id=orderer --mspid=OrdererMSP \
    --enroll-pw=ordererpw --capacity=2Gi --name=ord-node${i} --ca-name=ord-ca.default \
    --hosts=orderer${i}-ord.localho.st --istio-port=443
done

kubectl wait --timeout=180s --for=condition=Running fabricorderernodes.hlf.kungfusoftware.es --all
```

### 9. Register Admin Identities and Create Secrets

Register and enroll admin users for the orderer and each peer organization, then create Kubernetes secrets for the wallet.

#### Orderer Admin

```bash
# Register
kubectl hlf ca register --name=ord-ca --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=OrdererMSP

# Enroll
kubectl hlf ca enroll --name=ord-ca --namespace=default \
    --user=admin --secret=adminpw --mspid OrdererMSP \
    --ca-name tlsca  --output resources/orderermsp.yaml
kubectl hlf ca enroll --name=ord-ca --namespace=default \
    --user=admin --secret=adminpw --mspid OrdererMSP \
    --ca-name ca  --output resources/orderermspsign.yaml
```

#### Organization Admins

```bash
# REE
kubectl hlf ca register --name=ree-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=ReeMSP
kubectl hlf ca enroll --name=ree-ca --namespace=default \
    --user=admin --secret=adminpw --mspid ReeMSP \
    --ca-name ca  --output resources/reemsp.yaml
kubectl hlf ca enroll --name=ree-ca --namespace=default \
    --user=admin --secret=adminpw --mspid ReeMSP \
    --ca-name tlsca  --output resources/reemsp-tlsca.yaml
kubectl hlf identity create --name ree-admin --namespace default \
    --ca-name ree-ca --ca-namespace default \
    --ca ree-ca --mspid ReeMSP --enroll-id admin --enroll-secret adminpw

# Enagás GTS
kubectl hlf ca register --name=enagasgts-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=EnagasgtsMSP
kubectl hlf ca enroll --name=enagasgts-ca --namespace=default \
    --user=admin --secret=adminpw --mspid EnagasgtsMSP \
    --ca-name ca  --output resources/enagasgtsmsp.yaml
kubectl hlf ca enroll --name=enagasgts-ca --namespace=default \
    --user=admin --secret=adminpw --mspid EnagasgtsMSP \
    --ca-name tlsca  --output resources/enagasgtsmsp-tlsca.yaml
kubectl hlf identity create --name enagasgts-admin --namespace default \
    --ca-name enagasgts-ca --ca-namespace default \
    --ca ca --mspid EnagasgtsMSP --enroll-id admin --enroll-secret adminpw

# Trader 1
kubectl hlf ca register --name=trader1-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=Trader1MSP
kubectl hlf ca enroll --name=trader1-ca --namespace=default \
    --user=admin --secret=adminpw --mspid Trader1MSP \
    --ca-name ca  --output resources/trader1msp.yaml
kubectl hlf ca enroll --name=trader1-ca --namespace=default \
    --user=admin --secret=adminpw --mspid Trader1MSP \
    --ca-name tlsca  --output resources/trader1msp-tlsca.yaml
kubectl hlf identity create --name trader1-admin --namespace default \
    --ca-name trader1-ca --ca-namespace default \
    --ca ca --mspid Trader1MSP --enroll-id admin --enroll-secret adminpw

# Trader 2
kubectl hlf ca register --name=trader2-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=Trader2MSP
kubectl hlf ca enroll --name=trader2-ca --namespace=default \
    --user=admin --secret=adminpw --mspid Trader2MSP \
    --ca-name ca  --output resources/trader2msp.yaml
kubectl hlf ca enroll --name=trader2-ca --namespace=default \
    --user=admin --secret=adminpw --mspid Trader2MSP \
    --ca-name tlsca  --output resources/trader2msp-tlsca.yaml
kubectl hlf identity create --name trader2-admin --namespace default \
    --ca-name trader2-ca --ca-namespace default \
    --ca ca --mspid Trader2MSP --enroll-id admin --enroll-secret adminpw

# Trader 3
kubectl hlf ca register --name=trader3-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=Trader3MSP
kubectl hlf ca enroll --name=trader3-ca --namespace=default \
    --user=admin --secret=adminpw --mspid Trader3MSP \
    --ca-name ca  --output resources/trader3msp.yaml
kubectl hlf ca enroll --name=trader3-ca --namespace=default \
    --user=admin --secret=adminpw --mspid Trader3MSP \
    --ca-name tlsca  --output resources/trader3msp-tlsca.yaml
kubectl hlf identity create --name trader3-admin --namespace default \
    --ca-name trader3-ca --ca-namespace default \
    --ca ca --mspid Trader3MSP --enroll-id admin --enroll-secret adminpw

# CNMC
kubectl hlf ca register --name=cnmc-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=CnmcMSP
kubectl hlf ca enroll --name=cnmc-ca --namespace=default \
    --user=admin --secret=adminpw --mspid CnmcMSP \
    --ca-name ca  --output resources/cnmcmsp.yaml
kubectl hlf ca enroll --name=cnmc-ca --namespace=default \
    --user=admin --secret=adminpw --mspid CnmcMSP \
    --ca-name tlsca  --output resources/cnmcmsp-tlsca.yaml
kubectl hlf identity create --name cnmc-admin --namespace default \
    --ca-name cnmc-ca --ca-namespace default \
    --ca ca --mspid CnmcMSP --enroll-id admin --enroll-secret adminpw

# Enagás
kubectl hlf ca register --name=enagas-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=EnagasMSP
kubectl hlf ca enroll --name=enagas-ca --namespace=default \
    --user=admin --secret=adminpw --mspid EnagasMSP \
    --ca-name ca  --output resources/enagasmsp.yaml
kubectl hlf ca enroll --name=enagas-ca --namespace=default \
    --user=admin --secret=adminpw --mspid EnagasMSP \
    --ca-name tlsca  --output resources/enagasmsp-tlsca.yaml
kubectl hlf identity create --name enagas-admin --namespace default \
    --ca-name enagas-ca --ca-namespace default \
    --ca ca --mspid EnagasMSP --enroll-id admin --enroll-secret adminpw

# Dev
kubectl hlf ca register --name=dev-ca --namespace=default --user=admin --secret=adminpw \
    --type=admin --enroll-id enroll --enroll-secret=enrollpw --mspid=DevMSP
kubectl hlf ca enroll --name=dev-ca --namespace=default \
    --user=admin --secret=adminpw --mspid DevMSP \
    --ca-name ca  --output resources/devmsp.yaml
kubectl hlf ca enroll --name=dev-ca --namespace=default \
    --user=admin --secret=adminpw --mspid DevMSP \
    --ca-name tlsca  --output resources/devmsp-tlsca.yaml
kubectl hlf identity create --name dev-admin --namespace default \
    --ca-name dev-ca --ca-namespace default \
    --ca ca --mspid DevMSP --enroll-id admin --enroll-secret adminpw
```

#### Create Wallet Secret

```bash
kubectl create secret generic wallet --namespace=default \
    --from-file=devmsp.yaml=$PWD/resources/devmsp.yaml \
    --from-file=enagasmsp.yaml=$PWD/resources/enagasmsp.yaml \
    --from-file=cnmcmsp.yaml=$PWD/resources/cnmcmsp.yaml \
    --from-file=trader1msp.yaml=$PWD/resources/trader1msp.yaml \
    --from-file=trader2msp.yaml=$PWD/resources/trader2msp.yaml \
    --from-file=trader3msp.yaml=$PWD/resources/trader3msp.yaml \
    --from-file=reemsp.yaml=$PWD/resources/reemsp.yaml \
    --from-file=enagasgtsmsp.yaml=$PWD/resources/enagasgtsmsp.yaml \
    --from-file=orderermsp.yaml=$PWD/resources/orderermsp.yaml \
    --from-file=orderermspsign.yaml=$PWD/resources/orderermspsign.yaml
```

### 10. Create the Channel

#### Export environment variables

```bash
export PEER_ORG_SIGN_CERT=$(kubectl get fabriccas dev-ca -o=jsonpath='{.status.ca_cert}')
export PEER_ORG_TLS_CERT=$(kubectl get fabriccas dev-ca -o=jsonpath='{.status.tlsca_cert}')
export IDENT_8=$(printf "%8s" "")
export ORDERER_TLS_CERT=$(kubectl get fabriccas ord-ca -o=jsonpath='{.status.tlsca_cert}' | sed -e "s/^/${IDENT_8}/" )
export ORDERER0_TLS_CERT=$(kubectl get fabricorderernodes ord-node0 -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )
export ORDERER1_TLS_CERT=$(kubectl get fabricorderernodes ord-node1 -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )
export ORDERER2_TLS_CERT=$(kubectl get fabricorderernodes ord-node2 -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )
```

#### Create channel configuration

```yaml
kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricMainChannel
metadata:
  name: main
spec:
  name: main
  adminOrdererOrganizations:
    - mspID: OrdererMSP
  adminPeerOrganizations:
    - mspID: DevMSP
  channelConfig:
    application:
      acls: null
      capabilities:
        - V2_0
      policies:
        Admins:
          modPolicy: Admins
          type: Signature
          rule: "OR('OrdererMSP.admin', 'DevMSP.admin')"
        Readers:
          modPolicy: Admins
          type: Signature
          rule: "OR('CnmcMSP.member', 'EnagasMSP.member', 'Trader1MSP.member', 'Trader2MSP.member', 'Trader3MSP.member', 'ReeMSP.member', 'EnagasgtsMSP.member', 'DevMSP.member', 'OrdererMSP.member')"
        Writers:
          modPolicy: Admins
          type: Signature
          rule: "OR('CnmcMSP.member', 'EnagasMSP.member', 'Trader1MSP.member', 'Trader2MSP.member', 'Trader3MSP.member', 'ReeMSP.member', 'EnagasgtsMSP.member', 'DevMSP.member')"
        Endorsement:
          modPolicy: Admins
          type: Signature
          rule: "AND('CnmcMSP.member', 'EnagasMSP.member', OR('Trader1MSP.member', 'Trader2MSP.member', 'Trader3MSP.member', 'ReeMSP.member', 'EnagasgtsMSP.member'))"
        LifecycleEndorsement:
          modPolicy: Admins
          type: Signature
          rule: "OR('DevMSP.member')"
    capabilities:
      - V2_0
    orderer:
      batchSize:
        maxMessageCount: 50000
        absoluteMaxBytes: 103809024
        preferredMaxBytes: 524288
      batchTimeout: 2s
      capabilities:
        - V2_0
      etcdRaft:
        options:
          electionTick: 10
          heartbeatTick: 1
          maxInflightBlocks: 5
          snapshotIntervalSize: 16777216
          tickInterval: 500ms
      ordererType: etcdraft
      policies: null
      state: STATE_NORMAL
    policies: null
  externalOrdererOrganizations: []
  peerOrganizations:
    - mspID: CnmcMSP
      caName: "cnmc-ca"
      caNamespace: "default"
    - mspID: EnagasMSP
      caName: "enagas-ca"
      caNamespace: "default"
    - mspID: Trader1MSP
      caName: "trader1-ca"
      caNamespace: "default"
    - mspID: Trader2MSP
      caName: "trader2-ca"
      caNamespace: "default"
    - mspID: Trader3MSP
      caName: "trader3-ca"
      caNamespace: "default"
    - mspID: ReeMSP
      caName: "ree-ca"
      caNamespace: "default"
    - mspID: EnagasgtsMSP
      caName: "enagasgts-ca"
      caNamespace: "default"
    - mspID: DevMSP
      caName: "dev-ca"
      caNamespace: "default"
  identities:
    OrdererMSP:
      secretKey: orderermsp.yaml
      secretName: wallet
      secretNamespace: default
    OrdererMSP-tls:
      secretKey: orderermsp.yaml
      secretName: wallet
      secretNamespace: default
    OrdererMSP-sign:
      secretKey: orderermspsign.yaml
      secretName: wallet
      secretNamespace: default
    DevMSP:
      secretKey: devmsp.yaml
      secretName: wallet
      secretNamespace: default
    CnmcMSP:
      secretKey: cnmcmsp.yaml
      secretName: wallet
      secretNamespace: default
    EnagasMSP:
      secretKey: enagasmsp.yaml
      secretName: wallet
      secretNamespace: default
    Trader1MSP:
      secretKey: trader1msp.yaml
      secretName: wallet
      secretNamespace: default
    Trader2MSP:
      secretKey: trader2msp.yaml
      secretName: wallet
      secretNamespace: default
    Trader3MSP:
      secretKey: trader3msp.yaml
      secretName: wallet
      secretNamespace: default
    ReeMSP:
      secretKey: reemsp.yaml
      secretName: wallet
      secretNamespace: default
    EnagasgtsMSP:
      secretKey: enagasgtsmsp.yaml
      secretName: wallet
      secretNamespace: default
  externalPeerOrganizations: []
  ordererOrganizations:
    - caName: "ord-ca"
      caNamespace: "default"
      externalOrderersToJoin:
        - host: ord-node0
          port: 7053
        - host: ord-node1
          port: 7053
        - host: ord-node2
          port: 7053
      mspID: OrdererMSP
      ordererEndpoints:
        - orderer0-ord.localho.st:443
        - orderer1-ord.localho.st:443
        - orderer2-ord.localho.st:443
      orderersToJoin: []
  orderers:
    - host: orderer0-ord.localho.st
      port: 443
      tlsCert: |-
${ORDERER0_TLS_CERT}
    - host: orderer1-ord.localho.st
      port: 443
      tlsCert: |-
${ORDERER1_TLS_CERT}
    - host: orderer2-ord.localho.st
      port: 443
      tlsCert: |-
${ORDERER2_TLS_CERT}
EOF
```

### 11. Join Peers to the Channel

#### Export environment variables

```bash
export IDENT_8=$(printf "%8s" "")
export ORDERER0_TLS_CERT=$(kubectl get fabricorderernodes ord-node0 -o=jsonpath='{.status.tlsCert}' | sed -e "s/^/${IDENT_8}/" )
```

#### Join each organization's peer

```yaml
# REE
kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricFollowerChannel
metadata:
  name: main-reemsp
spec:
  anchorPeers:
    - host: peer0-ree.localho.st
      port: 443
  hlfIdentity:
    secretKey: reemsp.yaml
    secretName: wallet
    secretNamespace: default
  mspId: ReeMSP
  name: main
  externalPeersToJoin: []
  orderers:
    - certificate: |
${ORDERER0_TLS_CERT}
      url: grpcs://orderer0-ord.localho.st:443
  peersToJoin:
    - name: ree-peer0
      namespace: default
EOF

# Enagás GTS
kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricFollowerChannel
metadata:
  name: main-enagasgtsmsp
spec:
  anchorPeers:
    - host: peer0-enagasgts.localho.st
      port: 443
  hlfIdentity:
    secretKey: enagasgtsmsp.yaml
    secretName: wallet
    secretNamespace: default
  mspId: EnagasgtsMSP
  name: main
  externalPeersToJoin: []
  orderers:
    - certificate: |
${ORDERER0_TLS_CERT}
      url: grpcs://orderer0-ord.localho.st:443
  peersToJoin:
    - name: enagasgts-peer0
      namespace: default
EOF

# Trader 1
kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricFollowerChannel
metadata:
  name: main-trader1msp
spec:
  anchorPeers:
    - host: peer0-trader1.localho.st
      port: 443
  hlfIdentity:
    secretKey: trader1msp.yaml
    secretName: wallet
    secretNamespace: default
  mspId: Trader1MSP
  name: main
  externalPeersToJoin: []
  orderers:
    - certificate: |
${ORDERER0_TLS_CERT}
      url: grpcs://orderer0-ord.localho.st:443
  peersToJoin:
    - name: trader1-peer0
      namespace: default
EOF

# Trader 2
kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricFollowerChannel
metadata:
  name: main-trader2msp
spec:
  anchorPeers:
    - host: peer0-trader2.localho.st
      port: 443
  hlfIdentity:
    secretKey: trader2msp.yaml
    secretName: wallet
    secretNamespace: default
  mspId: Trader2MSP
  name: main
  externalPeersToJoin: []
  orderers:
    - certificate: |
${ORDERER0_TLS_CERT}
      url: grpcs://orderer0-ord.localho.st:443
  peersToJoin:
    - name: trader2-peer0
      namespace: default
EOF

# Trader 3
kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricFollowerChannel
metadata:
  name: main-trader3msp
spec:
  anchorPeers:
    - host: peer0-trader3.localho.st
      port: 443
  hlfIdentity:
    secretKey: trader3msp.yaml
    secretName: wallet
    secretNamespace: default
  mspId: Trader3MSP
  name: main
  externalPeersToJoin: []
  orderers:
    - certificate: |
${ORDERER0_TLS_CERT}
      url: grpcs://orderer0-ord.localho.st:443
  peersToJoin:
    - name: trader3-peer0
      namespace: default
EOF

# CNMC
kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricFollowerChannel
metadata:
  name: main-cnmcmsp
spec:
  anchorPeers:
    - host: peer0-cnmc.localho.st
      port: 443
  hlfIdentity:
    secretKey: cnmcmsp.yaml
    secretName: wallet
    secretNamespace: default
  mspId: CnmcMSP
  name: main
  externalPeersToJoin: []
  orderers:
    - certificate: |
${ORDERER0_TLS_CERT}
      url: grpcs://orderer0-ord.localho.st:443
  peersToJoin:
    - name: cnmc-peer0
      namespace: default
EOF

# Enagás
kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricFollowerChannel
metadata:
  name: main-enagasmsp
spec:
  anchorPeers:
    - host: peer0-enagas.localho.st
      port: 443
  hlfIdentity:
    secretKey: enagasmsp.yaml
    secretName: wallet
    secretNamespace: default
  mspId: EnagasMSP
  name: main
  externalPeersToJoin: []
  orderers:
    - certificate: |
${ORDERER0_TLS_CERT}
      url: grpcs://orderer0-ord.localho.st:443
  peersToJoin:
    - name: enagas-peer0
      namespace: default
EOF

# Dev
kubectl apply -f - <<EOF
apiVersion: hlf.kungfusoftware.es/v1alpha1
kind: FabricFollowerChannel
metadata:
  name: main-devmsp
spec:
  anchorPeers:
    - host: peer0-dev.localho.st
      port: 443
  hlfIdentity:
    secretKey: devmsp.yaml
    secretName: wallet
    secretNamespace: default
  mspId: DevMSP
  name: main
  externalPeersToJoin: []
  orderers:
    - certificate: |
${ORDERER0_TLS_CERT}
      url: grpcs://orderer0-ord.localho.st:443
  peersToJoin:
    - name: dev-peer0
      namespace: default
EOF
```

### 12. Install and Deploy the Chaincode

#### Create Connection Profile

First, create the network connection profile and enroll admin users for chaincode operations:

```bash
kubectl hlf inspect -c=main --output resources/network.yaml -o ReeMSP -o EnagasgtsMSP -o Trader1MSP -o Trader2MSP -o Trader3MSP -o EnagasMSP -o CnmcMSP -o DevMSP -o OrdererMSP

# Enroll and add admin users to the connection profile for each organization
kubectl hlf ca enroll --name=ree-ca --user=admin --secret=adminpw --mspid ReeMSP \
 --ca-name ca  --output resources/peer-ree.yaml
kubectl hlf utils adduser --userPath=resources/peer-ree.yaml --config=resources/network.yaml --username=admin --mspid=ReeMSP

kubectl hlf ca enroll --name=enagasgts-ca --user=admin --secret=adminpw --mspid EnagasgtsMSP \
 --ca-name ca  --output resources/peer-enagasgts.yaml
kubectl hlf utils adduser --userPath=resources/peer-enagasgts.yaml --config=resources/network.yaml --username=admin --mspid=EnagasgtsMSP

kubectl hlf ca enroll --name=trader1-ca --user=admin --secret=adminpw --mspid Trader1MSP \
 --ca-name ca  --output resources/peer-trader1.yaml
kubectl hlf utils adduser --userPath=resources/peer-trader1.yaml --config=resources/network.yaml --username=admin --mspid=Trader1MSP

kubectl hlf ca enroll --name=trader2-ca --user=admin --secret=adminpw --mspid Trader2MSP \
 --ca-name ca  --output resources/peer-trader2.yaml
kubectl hlf utils adduser --userPath=resources/peer-trader2.yaml --config=resources/network.yaml --username=admin --mspid=Trader2MSP

kubectl hlf ca enroll --name=trader3-ca --user=admin --secret=adminpw --mspid Trader3MSP \
 --ca-name ca  --output resources/peer-trader3.yaml
kubectl hlf utils adduser --userPath=resources/peer-trader3.yaml --config=resources/network.yaml --username=admin --mspid=Trader3MSP

kubectl hlf ca enroll --name=enagas-ca --user=admin --secret=adminpw --mspid EnagasMSP \
 --ca-name ca  --output resources/peer-enagas.yaml
kubectl hlf utils adduser --userPath=resources/peer-enagas.yaml --config=resources/network.yaml --username=admin --mspid=EnagasMSP

kubectl hlf ca enroll --name=cnmc-ca --user=admin --secret=adminpw --mspid CnmcMSP \
 --ca-name ca  --output resources/peer-cnmc.yaml
kubectl hlf utils adduser --userPath=resources/peer-cnmc.yaml --config=resources/network.yaml --username=admin --mspid=CnmcMSP

kubectl hlf ca enroll --name=dev-ca --user=admin --secret=adminpw --mspid DevMSP \
 --ca-name ca  --output resources/peer-dev.yaml
kubectl hlf utils adduser --userPath=resources/peer-dev.yaml --config=resources/network.yaml --username=admin --mspid=DevMSP
```

#### Build and push the chaincode Docker image

```bash
cd ../h2go-chaincodes
docker build -t adriianfdz/h2go-cc:v10 .
docker push adriianfdz/h2go-cc:v10
```

> If using a private registry, create a pull secret first:
> ```bash
> kubectl create secret docker-registry regcred \
>   --docker-server=REGISTRY_URL \
>   --docker-username=USERNAME \
>   --docker-password=PASSWORD \
>   --docker-email=EMAIL \
>   -n default
> ```

#### Package the chaincode

The chaincode is deployed using **CaaS (Chaincode as a Service)** mode. This means the chaincode runs as an external Docker container, and the peers connect to it over gRPC. We need to create a package that tells the peers how to reach the chaincode service.

```bash
rm -f code.tar.gz chaincode.tgz
export CHAINCODE_NAME=h2go-cc
export CHAINCODE_LABEL=h2go-cc

# metadata.json tells Fabric this is a CaaS chaincode
cat << METADATA-EOF > "metadata.json"
{ "type": "ccaas", "label": "${CHAINCODE_LABEL}" }
METADATA-EOF

# connection.json tells the peer where to find the running chaincode container
cat > "connection.json" <<CONN_EOF
{ "address": "${CHAINCODE_NAME}:7052", "dial_timeout": "10s", "tls_required": false }
CONN_EOF

tar cfz code.tar.gz connection.json
tar cfz chaincode.tgz metadata.json code.tar.gz
```

#### Install the chaincode on all peers

Calculate the package ID (a unique hash of the package) and install the chaincode on every peer in the network:

```bash
export PACKAGE_ID=$(kubectl hlf chaincode calculatepackageid --path=chaincode.tgz --language=golang --label=h2go-cc)

for PEER in ree-peer0 enagasgts-peer0 trader1-peer0 trader2-peer0 trader3-peer0 cnmc-peer0 enagas-peer0 dev-peer0; do
  kubectl hlf chaincode install --path=./chaincode.tgz \
      --config=blockchain/resources/network.yaml --language=golang \
      --label=h2go-cc --user=admin --peer=${PEER}.default
done
```

#### Sync the external chaincode container

This deploys the actual chaincode Docker container in Kubernetes and links it to the installed package ID:

```bash
kubectl hlf externalchaincode sync \
    --image=adriianfdz/h2go-cc:v10 \
    --image-pull-secret=regcred \
    --name=${CHAINCODE_NAME} --namespace=default \
    --package-id=${PACKAGE_ID} --tls-required=false --replicas=1
```

#### Approve the chaincode definition for each organization

Every organization must independently approve the chaincode definition before it can be committed. The `SEQUENCE`, `VERSION`, and `POLICY` must be identical across all approvals.

- **`SEQUENCE`** — An integer that starts at 1 and must be incremented by 1 every time you update the chaincode (new version, new policy, or new code). All organizations must approve with the same sequence number.
- **`VERSION`** — A human-readable label for the chaincode release (e.g. `"1.2.14"`). Informational only, no strict format required.
- **`POLICY`** — The endorsement policy that defines which organizations must sign a transaction for it to be valid.

```bash
export SEQUENCE=20
export VERSION="1.2.14"
export POLICY="AND('CnmcMSP.member', 'EnagasMSP.member', OR('Trader1MSP.member', 'Trader2MSP.member', 'ReeMSP.member', 'EnagasgtsMSP.member', 'Trader3MSP.member'))"

for PEER in ree-peer0 enagasgts-peer0 trader1-peer0 trader2-peer0 cnmc-peer0 enagas-peer0 trader3-peer0 dev-peer0; do
  kubectl hlf chaincode approveformyorg --config=blockchain/resources/network.yaml \
      --user=admin --peer=${PEER}.default --package-id=$PACKAGE_ID \
      --version "$VERSION" --sequence "$SEQUENCE" --name=h2go-cc \
      --policy="$POLICY" --channel=main
done
```

#### Commit the chaincode definition

Once all organizations have approved, any single organization can commit the definition to the channel. This makes the chaincode active and ready to accept transactions:

```bash
kubectl hlf chaincode commit --config=blockchain/resources/network.yaml \
    --user=admin --mspid=DevMSP --version "$VERSION" --sequence "$SEQUENCE" \
    --name=h2go-cc --policy="$POLICY" --channel=main
```

---

## Testing the Chaincode

### Invoke (register production)

```bash
kubectl hlf chaincode invoke --config=blockchain/resources/network.yaml \
  --user=admin --peer=ree-peer0.default --chaincode=h2go-cc --channel=main \
  --fcn=ProductionContract:RegisterProduction \
  -a "1" -a "H2" -a "1000" -a "KWH" -a "2025-11-25T15:19:32Z"
```

### Query (get all production batches)

```bash
kubectl hlf chaincode query --config=blockchain/resources/network.yaml \
    --user=admin --peer=ree-peer0.default --chaincode=h2go-cc --channel=main \
    --fcn=ProductionContract:GetAllProductionBatches
```

---

## Cleanup

### Remove Fabric resources (keep the cluster)

```bash
kubectl delete fabricorderernodes.hlf.kungfusoftware.es --all-namespaces --all
kubectl delete fabricpeers.hlf.kungfusoftware.es --all-namespaces --all
kubectl delete fabriccas.hlf.kungfusoftware.es --all-namespaces --all
kubectl delete fabricchaincode.hlf.kungfusoftware.es --all-namespaces --all
kubectl delete fabricmainchannels --all-namespaces --all
kubectl delete fabricfollowerchannels --all-namespaces --all
```

### Destroy the entire cluster

```bash
kind delete cluster
kubectl krew uninstall hlf
```

---

<p align="center">
  <a href="../frontend/README.md">⬅ Frontend</a> · <a href="../README.md">Root</a> · <a href="../h2go-chaincodes/">Chaincodes ➡</a>
</p>
