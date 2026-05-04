import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from '../../src/organizations/organizations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Organization } from '../../src/entities/organization.entity';
import { User } from '../../src/entities/user.entity';
import { ConnectionManager } from '../../src/fabric/connectionManager';
import { Role } from '../../src/common/enums/role.enum';
import { OrganizationType } from '../../src/common/enums/organizationType.enum';
import { AssetType } from '../../src/common/enums/assetType.enum';
import { IAuthenticatedUser } from '../../src/auth/interfaces/authenticatedUser';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
jest.mock('cloudinary', () => ({
  v2: {
    uploader: {
      upload: jest.fn(),
    },
  },
}));

import * as cloudinary from 'cloudinary';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let orgRepo: jest.Mocked<Pick<Repository<Organization>, 'create' | 'save' | 'findOne' | 'find'>>;
  let userRepo: jest.Mocked<Pick<Repository<User>, 'create' | 'save' | 'remove' | 'exists'>>;
  let connectionManager: jest.Mocked<Pick<ConnectionManager, 'connectGateway' | 'disconnectGateway' | 'queryTransaction' | 'executeTransaction'>>;

  const mockOrgDev: Organization = { id: 'org-dev', name: 'DevOrg', mspId: 'DevMSP', peerEndpoint: 'peer:443', type: OrganizationType.PRODUCER, createdAt: new Date('2026-01-01'), authorizedOrgs: [], authorizedByOrgs: [], users: [] };
  const mockOrgProd: Organization = { id: 'org-1', name: 'ProducerOrg', mspId: 'ProdMSP', peerEndpoint: 'peer:443', type: OrganizationType.PRODUCER, createdAt: new Date('2026-01-01'), authorizedOrgs: [], authorizedByOrgs: [], users: [] };

  const mockDevUser: IAuthenticatedUser = {
    id: 'dev-1',
    email: 'dev@example.com',
    name: 'Dev User',
    role: Role.DEV,
    createdAt: new Date('2026-01-01'),
    organization: mockOrgDev,
  };

  const mockAdminUser: IAuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: Role.ADMIN,
    createdAt: new Date('2026-01-01'),
    organization: mockOrgProd,
  };

  const mockRegularUser: IAuthenticatedUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Regular User',
    role: Role.USER,
    createdAt: new Date('2026-01-01'),
    organization: mockOrgProd,
  };

  beforeEach(async () => {
    orgRepo = {
      create: jest.fn().mockImplementation((dto: Partial<Organization>) => dto as Organization),
      save: jest.fn().mockImplementation((entity: Organization) => Promise.resolve(entity)),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    userRepo = {
      create: jest.fn().mockImplementation((dto: Partial<User>) => ({ ...dto } as User)),
      save: jest.fn().mockImplementation((entity: User) => Promise.resolve(entity)),
      remove: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn(),
    };
    connectionManager = {
      connectGateway: jest.fn().mockResolvedValue({ gateway: 'gw', client: 'cl' } as unknown as Organization),
      disconnectGateway: jest.fn(),
      queryTransaction: jest.fn(),
      executeTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: getRepositoryToken(Organization), useValue: orgRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: ConnectionManager, useValue: connectionManager },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrganization', () => {
    const dto = { name: 'NewOrg', type: OrganizationType.TRADER };

    it('should create organization when user is DEV', async () => {
      const result = await service.createOrganization(dto, mockDevUser);

      expect(orgRepo.create).toHaveBeenCalledWith(dto);
      expect(orgRepo.save).toHaveBeenCalled();
      expect(result.message).toBe('Organization and admin user created successfully');
    });

    it('should throw when user is not DEV', async () => {
      await expect(
        service.createOrganization(dto, mockAdminUser),
      ).rejects.toThrow('Only a developer can create an organization');
    });
  });

  describe('createUserForOrganization', () => {
    const dto = { email: 'new@example.com', password: 'pass123', name: 'NewUser' };

    it('should create user in organization when user is ADMIN of same org', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1', users: [] } as unknown as Organization);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pass');

      const result = await service.createUserForOrganization('org-1', dto, mockAdminUser);

      expect(userRepo.save).toHaveBeenCalled();
      expect(result.message).toBe('User added to organization successfully');
    });

    it('should throw when user is not ADMIN', async () => {
      await expect(
        service.createUserForOrganization('org-1', dto, mockRegularUser),
      ).rejects.toThrow('Only an admin can add users');
    });

    it('should throw when ADMIN tries to add to different org', async () => {
      await expect(
        service.createUserForOrganization('org-other', dto, mockAdminUser),
      ).rejects.toThrow('An admin can only add users to their own organization');
    });

    it('should throw when organization is not found', async () => {
      orgRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createUserForOrganization('org-1', dto, mockAdminUser),
      ).rejects.toThrow('Organization not found');
    });
  });

  describe('authorizeOrganization', () => {
    it('should authorize a TRADER org when requester is ADMIN of PRODUCER', async () => {
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'trader-1', type: OrganizationType.TRADER } as unknown as Organization)
        .mockResolvedValueOnce({ id: 'org-1', type: OrganizationType.PRODUCER, authorizedOrgs: [] } as unknown as Organization);

      const result = await service.authorizeOrganization('trader-1', mockAdminUser);

      expect(result.message).toBe('Organization authorized successfully');
      expect(orgRepo.save).toHaveBeenCalled();
    });

    it('should throw when user is not ADMIN', async () => {
      await expect(
        service.authorizeOrganization('trader-1', mockRegularUser),
      ).rejects.toThrow('Only an admin can authorize organizations');
    });

    it('should throw when target org is not TRADER', async () => {
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'prod-1', type: OrganizationType.PRODUCER } as unknown as Organization);

      await expect(
        service.authorizeOrganization('prod-1', mockAdminUser),
      ).rejects.toThrow('Only TRADER type organizations can be authorized');
    });

    it('should throw when requester org is not PRODUCER', async () => {
      const traderAdmin = { role: Role.ADMIN, organization: { id: 'org-trader', type: OrganizationType.TRADER } } as unknown as IAuthenticatedUser;
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'other-trader', type: OrganizationType.TRADER } as unknown as Organization)
        .mockResolvedValueOnce({ id: 'org-trader', type: OrganizationType.TRADER } as unknown as Organization);

      await expect(
        service.authorizeOrganization('other-trader', traderAdmin),
      ).rejects.toThrow('Only PRODUCER type organizations can authorize');
    });
  });

  describe('unauthorizeOrganization', () => {
    it('should unauthorize an organization successfully', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        type: OrganizationType.PRODUCER,
        authorizedOrgs: [{ id: 'trader-1' }],
      } as unknown as Organization);

      const result = await service.unauthorizeOrganization('trader-1', mockAdminUser);

      expect(result.message).toBe('Organization unauthorized successfully');
    });

    it('should throw when trying to unauthorize own organization', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        type: OrganizationType.PRODUCER,
        authorizedOrgs: [],
      } as unknown as Organization);

      await expect(
        service.unauthorizeOrganization('org-1', mockAdminUser),
      ).rejects.toThrow('You cannot unauthorize your own organization');
    });

    it('should throw when org is not authorized', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        type: OrganizationType.PRODUCER,
        authorizedOrgs: [],
      } as unknown as Organization);

      await expect(
        service.unauthorizeOrganization('trader-1', mockAdminUser),
      ).rejects.toThrow('The organization is not authorized');
    });

    it('should throw when user is not ADMIN', async () => {
      await expect(
        service.unauthorizeOrganization('trader-1', mockRegularUser),
      ).rejects.toThrow('Only an admin can unauthorize organizations');
    });

    it('should throw when admin has no organization', async () => {
      const noOrgAdmin = { role: Role.ADMIN, organization: null } as unknown as IAuthenticatedUser;
      await expect(
        service.unauthorizeOrganization('trader-1', noOrgAdmin),
      ).rejects.toThrow('The admin does not belong to any organization');
    });

    it('should throw when requester org is not found', async () => {
      orgRepo.findOne.mockResolvedValue(null);
      await expect(
        service.unauthorizeOrganization('trader-1', mockAdminUser),
      ).rejects.toThrow('Admin organization not found');
    });

    it('should throw when requester org is not PRODUCER', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        type: OrganizationType.TRADER,
        authorizedOrgs: [],
      } as unknown as Organization);
      await expect(
        service.unauthorizeOrganization('trader-1', mockAdminUser),
      ).rejects.toThrow('Only PRODUCER type organizations can unauthorize');
    });
  });

  describe('getOrganization', () => {
    it('should return own organization info', async () => {
      const org = {
        id: 'org-1',
        name: 'Org1',
        type: OrganizationType.PRODUCER,
        mspId: 'MSP1',
        users: [],
        authorizedByOrgs: [],
      } as unknown as Organization;
      orgRepo.findOne
        .mockResolvedValueOnce(org)
        .mockResolvedValueOnce(org);

      const result = await service.getOrganization('org-1', mockAdminUser);

      expect(result.id).toBe('org-1');
    });

    it('should throw when user org is not found', async () => {
      orgRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.getOrganization('org-1', mockAdminUser),
      ).rejects.toThrow('User organization not found');
    });

    it('should throw when user is not authorized', async () => {
      orgRepo.findOne.mockResolvedValueOnce({ id: 'org-1',
        authorizedByOrgs: [],
      } as unknown as Organization);

      await expect(
        service.getOrganization('org-other', mockAdminUser),
      ).rejects.toThrow('Only users of the organization or authorized');
    });
  });

  describe('getOrganizationBalance', () => {
    it('should return balance from fabric', async () => {
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'org-1', authorizedByOrgs: [] } as unknown as Organization)
        .mockResolvedValueOnce({ id: 'org-1' } as unknown as Organization);

      const balanceData = {
        producerId: 'org-1',
        gdos: { ELECTRICITY: { available: [], unavailable: [] }, H2: { available: [], unavailable: [] } },
      };
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify(balanceData)),
      );

      const result = await service.getOrganizationBalance('org-1', mockAdminUser);

      expect(result.producerId).toBe('org-1');
      expect(connectionManager.disconnectGateway).toHaveBeenCalled();
    });

    it('should return empty balance when result is empty string', async () => {
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'org-1', authorizedByOrgs: [] } as unknown as Organization)
        .mockResolvedValueOnce({ id: 'org-1' } as unknown as Organization);

      connectionManager.queryTransaction.mockResolvedValue(Buffer.from(''));

      const result = await service.getOrganizationBalance('org-1', mockAdminUser);

      expect(result.gdos.ELECTRICITY.available).toEqual([]);
    });

    it('should return empty balance when owner balance does not exist', async () => {
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'org-1', authorizedByOrgs: [] } as unknown as Organization)
        .mockResolvedValueOnce({ id: 'org-1' } as unknown as Organization);

      connectionManager.queryTransaction.mockRejectedValue(
        new Error('owner balance does not exist'),
      );

      const result = await service.getOrganizationBalance('org-1', mockAdminUser);

      expect(result.producerId).toBe('org-1');
    });
    it('should throw when user org is not found', async () => {
      orgRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.getOrganizationBalance('org-1', mockAdminUser),
      ).rejects.toThrow('User organization not found');
    });

    it('should throw when user is not authorized for balance', async () => {
      orgRepo.findOne.mockResolvedValueOnce({ id: 'org-1', authorizedByOrgs: [] } as unknown as Organization);
      await expect(
        service.getOrganizationBalance('org-other', mockAdminUser),
      ).rejects.toThrow('Only users of the organization or authorized');
    });

    it('should throw when target org is not found for balance', async () => {
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'org-1', authorizedByOrgs: [] } as unknown as Organization)
        .mockResolvedValueOnce(null);
      await expect(
        service.getOrganizationBalance('org-1', mockAdminUser),
      ).rejects.toThrow('Organization not found');
    });

    it('should return empty balance when error contains "code 2"', async () => {
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'org-1', authorizedByOrgs: [] } as unknown as Organization)
        .mockResolvedValueOnce({ id: 'org-1' } as unknown as Organization);
      connectionManager.queryTransaction.mockRejectedValue(new Error('some code 2 error'));

      const result = await service.getOrganizationBalance('org-1', mockAdminUser);
      expect(result.producerId).toBe('org-1');
    });

    it('should throw generic error from fabric', async () => {
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'org-1', authorizedByOrgs: [] } as unknown as Organization)
        .mockResolvedValueOnce({ id: 'org-1' } as unknown as Organization);
      connectionManager.queryTransaction.mockRejectedValue(new Error('unexpected error'));

      await expect(
        service.getOrganizationBalance('org-1', mockAdminUser),
      ).rejects.toThrow('Error while consulting the balance: unexpected error');
    });

    it('should handle error without message property', async () => {
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'org-1', authorizedByOrgs: [] } as unknown as Organization)
        .mockResolvedValueOnce({ id: 'org-1' } as unknown as Organization);
      connectionManager.queryTransaction.mockRejectedValue('string error');

      await expect(
        service.getOrganizationBalance('org-1', mockAdminUser),
      ).rejects.toThrow('Error while consulting the balance: string error');
    });

    it('should return balance when authorized by another org', async () => {
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'org-1', authorizedByOrgs: [{ id: 'org-other' }] } as unknown as Organization)
        .mockResolvedValueOnce({ id: 'org-other' } as unknown as Organization);

      const balanceData = {
        producerId: 'org-other',
        gdos: { ELECTRICITY: { available: [], unavailable: [] }, H2: { available: [], unavailable: [] } },
      };
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify(balanceData)),
      );

      const result = await service.getOrganizationBalance('org-other', mockAdminUser);
      expect(result.producerId).toBe('org-other');
    });
  });

  describe('redeemGdOs', () => {
    it('should redeem GdOs successfully', async () => {
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'org-1', authorizedByOrgs: [] } as unknown as Organization)
        .mockResolvedValueOnce({ id: 'org-1' } as unknown as Organization);

      connectionManager.executeTransaction.mockResolvedValue(
        Buffer.from('success'),
      );

      const result = await service.redeemGdOs(
        'org-1',
        AssetType.H2,
        ['gdo-1', 'gdo-2'],
        mockAdminUser,
      );

      expect(result.message).toBe('GdOs redeemed successfully');
    });

    it('should throw when user is not authorized', async () => {
      orgRepo.findOne.mockResolvedValueOnce({ id: 'org-1',
        authorizedByOrgs: [],
      } as unknown as Organization);

      await expect(
        service.redeemGdOs('org-other', AssetType.H2, ['gdo-1'], mockAdminUser),
      ).rejects.toThrow('Only users of the organization or authorized');
    });

    it('should throw when user org is not found', async () => {
      orgRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.redeemGdOs('org-1', AssetType.H2, ['gdo-1'], mockAdminUser),
      ).rejects.toThrow('User organization not found');
    });

    it('should throw when target org is not found', async () => {
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'org-1', authorizedByOrgs: [] } as unknown as Organization)
        .mockResolvedValueOnce(null);
      await expect(
        service.redeemGdOs('org-1', AssetType.H2, ['gdo-1'], mockAdminUser),
      ).rejects.toThrow('Organization not found');
    });

    it('should throw fabric error when executeTransaction fails', async () => {
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'org-1', authorizedByOrgs: [] } as unknown as Organization)
        .mockResolvedValueOnce({ id: 'org-1' } as unknown as Organization);
      connectionManager.executeTransaction.mockRejectedValue(new Error('fabric fail'));

      await expect(
        service.redeemGdOs('org-1', AssetType.H2, ['gdo-1'], mockAdminUser),
      ).rejects.toThrow('Error while redeeming GdOs: fabric fail');
    });

    it('should handle error without message when executeTransaction fails', async () => {
      orgRepo.findOne
        .mockResolvedValueOnce({ id: 'org-1', authorizedByOrgs: [] } as unknown as Organization)
        .mockResolvedValueOnce({ id: 'org-1' } as unknown as Organization);
      connectionManager.executeTransaction.mockRejectedValue('string fail');

      await expect(
        service.redeemGdOs('org-1', AssetType.H2, ['gdo-1'], mockAdminUser),
      ).rejects.toThrow('Error while redeeming GdOs: string fail');
    });
  });

  describe('updateUserFromOrganization', () => {
    it('should update user name when admin requests', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [
          { ...mockAdminUser, password: 'hashed', id: "admin-1", name: "Admin" },
          { ...mockRegularUser, password: 'hashed', id: "user-1" },
        ],
      } as unknown as Organization);
      userRepo.exists.mockResolvedValue(false);

      const result = await service.updateUserFromOrganization(
        'org-1',
        'user-1',
        { name: 'NewName' },
        mockAdminUser,
      );

      expect(result.message).toBe('User updated successfully');
      expect(result.user.name).toBe('NewName');
    });

    it('should throw when non-admin tries to update another user', async () => {
      await expect(
        service.updateUserFromOrganization('org-1', 'other-user', { name: 'X' }, mockRegularUser),
      ).rejects.toThrow('You do not have permission to update this user');
    });

    it('should throw when org is not found', async () => {
      orgRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateUserFromOrganization('org-1', 'admin-1', { name: 'X' }, mockAdminUser),
      ).rejects.toThrow('Organization not found');
    });

    it('should hash new password when admin changes it', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [
          { ...mockAdminUser, password: 'hashed', id: "admin-1", name: "Admin" },
          { ...mockRegularUser, password: 'hashed', id: "user-1" },
        ],
      } as unknown as Organization);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      const result = await service.updateUserFromOrganization(
        'org-1',
        'user-1',
        { newPassword: 'newpass123' },
        mockAdminUser,
      );

      expect(result.user.password).toBe('new-hash');
    });

    it('should throw when non-admin tries to change role', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [
          { ...mockRegularUser, password: 'hashed', id: "user-1" },
        ],
      } as unknown as Organization);

      await expect(
        service.updateUserFromOrganization(
          'org-1',
          'user-1',
          { role: Role.ADMIN },
          mockRegularUser,
        ),
      ).rejects.toThrow('You do not have permission to change the role');
    });

    it('should throw when admin tries to update user not in org', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [
          { ...mockAdminUser, password: 'hashed', id: "admin-1", name: "Admin" },
        ],
      } as unknown as Organization);
      await expect(
        service.updateUserFromOrganization('org-1', 'missing-user', { name: 'X' }, mockAdminUser),
      ).rejects.toThrow('The user does not belong to your organization');
    });

    it('should throw when userToUpdate is not found after filtering', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [
          { ...mockAdminUser, password: 'hashed', id: "admin-1", name: "Admin" },
          { ...mockRegularUser, password: 'hashed', id: "user-1" },
        ],
      } as unknown as Organization);
      await expect(
        service.updateUserFromOrganization('org-1', 'missing', { name: "x" }, mockAdminUser)
      ).rejects.toThrow('The user does not belong to your organization');
    });

    it('should allow non-admin to update own password with correct old password', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [
          { ...mockRegularUser, password: 'hashed', id: "user-1" },
        ],
      } as unknown as Organization);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');

      const result = await service.updateUserFromOrganization(
        'org-1', 'user-1',
        { oldPassword: 'oldpass', newPassword: 'newpass123' },
        mockRegularUser,
      );

      expect(result.user.password).toBe('new-hashed');
    });

    it('should throw when non-admin gives incorrect old password', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [
          { ...mockRegularUser, password: 'hashed', id: "user-1" },
        ],
      } as unknown as Organization);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.updateUserFromOrganization(
          'org-1', 'user-1',
          { oldPassword: 'wrong', newPassword: 'newpass123' },
          mockRegularUser,
        ),
      ).rejects.toThrow('The old password is not correct');
    });

    it('should throw when bcrypt.compare throws', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [
          { ...mockRegularUser, password: 'hashed', id: "user-1" },
        ],
      } as unknown as Organization);
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('bcrypt fail'));

      await expect(
        service.updateUserFromOrganization(
          'org-1', 'user-1',
          { oldPassword: 'pass', newPassword: 'newpass123' },
          mockRegularUser,
        ),
      ).rejects.toThrow('Error while verifying the old password');
    });

    it('should skip email update when email already exists', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [
          { ...mockAdminUser, password: 'hashed', id: "admin-1", name: "Admin" },
          { ...mockRegularUser, password: 'hashed', id: "user-1", email: 'old@example.com' },
        ],
      } as unknown as Organization);
      userRepo.exists.mockResolvedValue(true);

      const result = await service.updateUserFromOrganization(
        'org-1', 'user-1',
        { email: 'existing@example.com' },
        mockAdminUser,
      );

      expect(result.user.email).toBe('old@example.com');
    });

    it('should update email when email does not already exist', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [
          { ...mockAdminUser, password: 'hashed', id: "admin-1", name: "Admin" },
          { ...mockRegularUser, password: 'hashed', id: "user-1", email: 'old@example.com' },
        ],
      } as unknown as Organization);
      userRepo.exists.mockResolvedValue(false);

      const result = await service.updateUserFromOrganization(
        'org-1', 'user-1',
        { email: 'new@example.com' },
        mockAdminUser,
      );

      expect(result.user.email).toBe('new@example.com');
    });

    it('should update avatar via cloudinary when provided', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [
          { ...mockAdminUser, password: 'hashed', id: "admin-1", name: "Admin" },
          { ...mockRegularUser, password: 'hashed', id: "user-1" },
        ],
      } as unknown as Organization);
      (cloudinary.v2.uploader.upload as jest.Mock).mockResolvedValue({ secure_url: 'https://cloudinary.com/new-avatar.jpg',
      } as unknown as Organization);

      const result = await service.updateUserFromOrganization(
        'org-1', 'user-1',
        { avatar: 'data:image/png;base64,...' },
        mockAdminUser,
      );

      expect(result.user.avatar).toBe('https://cloudinary.com/new-avatar.jpg');
    });

    it('should throw when cloudinary upload fails', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [
          { ...mockAdminUser, password: 'hashed', id: "admin-1", name: "Admin" },
          { ...mockRegularUser, password: 'hashed', id: "user-1" },
        ],
      } as unknown as Organization);
      (cloudinary.v2.uploader.upload as jest.Mock).mockRejectedValue(new Error('upload fail'));

      await expect(
        service.updateUserFromOrganization(
          'org-1', 'user-1',
          { avatar: 'data:image/png;base64,...' },
          mockAdminUser,
        ),
      ).rejects.toThrow('Error while uploading the profile image');
    });

    it('should update role when admin provides it', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [
          { ...mockAdminUser, password: 'hashed', id: "admin-1", name: "Admin" },
          { ...mockRegularUser, password: 'hashed', id: "user-1" },
        ],
      } as unknown as Organization);

      const result = await service.updateUserFromOrganization(
        'org-1', 'user-1',
        { role: Role.ADMIN },
        mockAdminUser,
      );

      expect(result.user.role).toBe(Role.ADMIN);
    });
  });

  describe('deleteUserFromOrganization', () => {
    it('should delete user from organization', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [{ ...mockRegularUser, password: 'hashed', id: "user-1", name: "UserToDelete" }],
      } as unknown as Organization);

      const result = await service.deleteUserFromOrganization('org-1', 'user-1', mockAdminUser);

      expect(result.message).toBe('User deleted from the organization successfully');
      expect(userRepo.remove).toHaveBeenCalled();
    });

    it('should throw when user is not ADMIN', async () => {
      await expect(
        service.deleteUserFromOrganization('org-1', 'user-1', mockRegularUser),
      ).rejects.toThrow('You do not have permission to delete this user');
    });

    it('should throw when user not found in org', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        users: [],
      } as unknown as Organization);

      await expect(
        service.deleteUserFromOrganization('org-1', 'user-1', mockAdminUser),
      ).rejects.toThrow('User not found in the organization');
    });

    it('should throw when org is not found', async () => {
      orgRepo.findOne.mockResolvedValue(null);
      await expect(
        service.deleteUserFromOrganization('org-1', 'user-1', mockAdminUser),
      ).rejects.toThrow('Organization not found');
    });
  });

  describe('getAuthorizationsOfOrganization', () => {
    it('should return authorized orgs list', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        authorizedOrgs: [
          { id: 'trader-1', name: 'Trader1', type: OrganizationType.TRADER, mspId: 'T1MSP' },
        ],
      } as unknown as Organization);

      const result = await service.getAuthorizationsOfOrganization('org-1', mockAdminUser);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('trader-1');
    });

    it('should throw when user is not ADMIN', async () => {
      await expect(
        service.getAuthorizationsOfOrganization('org-1', mockRegularUser),
      ).rejects.toThrow('You do not have permission to view authorizations');
    });

    it('should throw when id does not match user org', async () => {
      await expect(
        service.getAuthorizationsOfOrganization('org-other', mockAdminUser),
      ).rejects.toThrow('You can only view the authorizations of your own organization');
    });

    it('should throw when org is not found', async () => {
      orgRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getAuthorizationsOfOrganization('org-1', mockAdminUser),
      ).rejects.toThrow('User organization not found');
    });
  });

  describe('getAllOrganizations', () => {
    it('should return all orgs when user is DEV', async () => {
      orgRepo.find.mockResolvedValue([ { id: 'org-1', name: 'Org1', type: OrganizationType.PRODUCER, mspId: 'MSP1', peerEndpoint: 'peer:443', createdAt: new Date(), users: [] } as unknown as Organization,
      ]);

      const result = await service.getAllOrganizations(mockDevUser);

      expect(result).toHaveLength(1);
    });

    it('should throw when user is not DEV', async () => {
      await expect(
        service.getAllOrganizations(mockAdminUser),
      ).rejects.toThrow('Only a developer can list all organizations');
    });
  });

  describe('updateOrganization', () => {
    it('should update organization when user is DEV', async () => {
      orgRepo.findOne.mockResolvedValue({ id: 'org-1',
        name: 'OldName',
        type: OrganizationType.PRODUCER,
      } as unknown as Organization);

      const result = await service.updateOrganization(
        'org-1',
        { name: 'NewName' },
        mockDevUser,
      );

      expect(result.message).toBe('Organization updated successfully');
      expect(orgRepo.save).toHaveBeenCalled();
    });

    it('should throw when user is not DEV', async () => {
      await expect(
        service.updateOrganization('org-1', { name: 'X' }, mockAdminUser),
      ).rejects.toThrow('Only a developer can update an organization');
    });

    it('should throw when org not found', async () => {
      orgRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateOrganization('org-1', { name: 'X' }, mockDevUser),
      ).rejects.toThrow('Organization not found');
    });
  });
});
