FROM golang:1.22.5 AS builder

WORKDIR /chaincode

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Compilar el binario del chaincode
RUN CGO_ENABLED=0 GOOS=linux go build -o h2go-chaincode main.go

FROM alpine:latest
RUN apk add --no-cache ca-certificates

WORKDIR /chaincode

# Copiar binario desde builder
COPY --from=builder /chaincode/h2go-chaincode .

EXPOSE 7052

CMD ["./h2go-chaincode"]