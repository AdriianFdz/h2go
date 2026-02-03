import { Organization } from './organization';

export enum Role {
  DEV = 'Dev',
  ADMIN = 'Admin',
  USER = 'User'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  avatar?: string | null;
  organization?: Organization;
}
