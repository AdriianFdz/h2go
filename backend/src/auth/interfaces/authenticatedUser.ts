import { Role } from 'src/common/enums/role';
import { Organization } from 'src/entities/organization.entity';

export interface IAuthenticatedUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  role: Role;
  avatar?: string;
  organization: Organization;
  exp?: number;
}
