import type { User } from "./user";

export enum OrganizationType {
  TRADER = "trader",
  PRODUCER = "producer",
  REGULATOR = "regulator",
  REGISTRY = "registry",
}

export interface Organization {
  id: string;
  name?: string;
  type?: OrganizationType;
  mspId?: string;
  peerEndpoint?: string;
  authorizedByOrgs?: string[];
  users?: User[];
}
