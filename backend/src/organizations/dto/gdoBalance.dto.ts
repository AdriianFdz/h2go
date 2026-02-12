export interface GDO {
  gdoId: string;
  requestId: string;
  assetType: string;
  issueDate: string;
  expiryDate: string;
  ownerId: string;
  status: string;
}

export interface GdosByStatus {
  available: GDO[];
  unavailable: GDO[];
}

export interface GdosByAssetType {
  ELECTRICITY: GdosByStatus;
  H2: GdosByStatus;
}

export interface GdoBalanceDto {
  producerId: string;
  gdos: GdosByAssetType;
}
