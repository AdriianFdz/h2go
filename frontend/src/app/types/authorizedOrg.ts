import { OrganizationType } from "./organization";

export interface AuthorizedOrg {
  id: string;
  name?: string;
  type?: OrganizationType;
}
