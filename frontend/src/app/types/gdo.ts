export enum GDOStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  USED = 'USED',
}

export interface GDO {
  gdoId: string;
  requestId: string;
  assetType: string;
  issueDate: string;
  expiryDate: string;
  ownerId: string;
  status: GDOStatus | string;
}
