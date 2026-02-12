import { GDO } from "./gdo";

export interface GdosByStatus {
  available: GDO[];
  unavailable: GDO[];
}

export interface GdosByAssetType {
  ELECTRICITY: GdosByStatus;
  H2: GdosByStatus;
}

export interface GdoBalance {
  transactionType: string;
  producerId: string;
  organizationName: string;
  gdos: GdosByAssetType;
}
