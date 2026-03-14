export enum GdOStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  USED = "USED",
}

export interface GdO {
  gdoId: string;
  requestId: string;
  assetType: string;
  issueDate: string;
  expiryDate: string;
  ownerId: string;
  status: GdOStatus | string;
}
