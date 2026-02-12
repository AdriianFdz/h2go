export enum OrganizationType {
  TRADER = "trader",
  PRODUCER = "producer",
  REGULATOR = "regulator",
  CONSUMER = "consumer",
}

export interface Organization {
  id: string;
  name?: string;
  type?: OrganizationType | "trader" | "producer" | "regulator" | "consumer";
  mspId?: string;
  peerEndpoint?: string;
  authorizedByOrgs?: string[];
}
