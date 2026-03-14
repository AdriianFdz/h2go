import { GdO } from "./gdo";

export interface GdosByStatus {
  available: GdO[];
  unavailable: GdO[];
}

export interface GdosByAssetType {
  ELECTRICITY: GdosByStatus;
  H2: GdosByStatus;
}

export interface GdoBalance {
  transactionType: string;
  producerId: string;
  gdos: GdosByAssetType;
}
