import { AssetType } from "./assetType";
import { GdO } from "./gdo";
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
  gdos: GdO[];
  createdAt: string;
  processedAt: string;
}
