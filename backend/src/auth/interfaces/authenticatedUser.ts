import { Role } from '../../common/enums/role.enum';
import { Organization } from '../../entities/organization.entity';

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
