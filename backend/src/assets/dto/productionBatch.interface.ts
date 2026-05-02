import { AssetType } from '../../common/enums/assetType.enum';
import { Unit } from "../../common/enums/unit.enum";
import { ProductionStatus } from "../../common/enums/productionStatus.enum";
import { TransactionType } from "../../common/enums/transactionType.enum";

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
