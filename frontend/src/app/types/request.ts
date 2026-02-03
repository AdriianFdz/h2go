import { AssetType } from "./assetType";
import { GDO } from "./gdo";
import { RequestStatus } from "./requestStatus";

export interface Request {
  docType: string;
  requestId: string;
  producerId: string;
  assetType: AssetType | string;
  amount: number;
  status: RequestStatus | string;
  approverId: string;
  reason: string;
  gdos: GDO[];
  createdAt: string;
  processedAt: string;
}
