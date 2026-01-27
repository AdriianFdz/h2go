import { AssetType } from "./enums/AssetType";
import { Unit } from "./enums/Unit";

export enum ProductionStatus {
    AVAILABLE = 'AVAILABLE',
    USED = 'USED',
    EXPIRED = 'EXPIRED',
}

export enum TransactionType {
    PRODUCTION = 'PRODUCTION',
    REQUEST = 'REQUEST',
    REDEMPTION = 'REDEMPTION',
}

export interface ProductionBatch {
    transactionType: TransactionType;
    batchId: string;
    producerId: string;
    assetType: AssetType;
    amountUsed: number;
    amountAvailable: number;
    unit: Unit;
    productionDate: string;
    expiryDate: string;
    status: ProductionStatus;
}
