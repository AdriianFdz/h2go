import { AssetType } from "./assetType";
import { RequestStatus } from "./requestStatus";

export interface TradeRequest {
  docType: string;
  tradeID: string;
  producerID: string;
  targetID: string;
  assetType: AssetType | string;
  amount: number;
  status: RequestStatus | string;
  createdAt: string;
}
