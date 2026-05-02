import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from '../../src/organizations/organizations.controller';
import { OrganizationsService } from '../../src/organizations/organizations.service';
import { AuthService } from '../../src/auth/auth.service';
import { Role } from '../../src/common/enums/role.enum';
import { OrganizationType } from '../../src/common/enums/organizationType.enum';
import { AssetType } from '../../src/common/enums/assetType.enum';
import { IAuthenticatedUser } from '../../src/auth/interfaces/authenticatedUser';
import { Organization } from '../../src/entities/organization.entity';
import { CreateOrgDto } from '../../src/assets/dto/createOrg.dto';
import { UpdateOrgDto } from '../../src/assets/dto/updateOrg.dto';
import { CreateUserDto } from '../../src/assets/dto/createUser.dto';
import { UpdateUserDto } from '../../src/assets/dto/updateUser.dto';
import { RedeemGdOsDto } from '../../src/assets/dto/redeemGdOs.dto';
import { Response } from 'express';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let orgService: jest.Mocked<
    Pick<
      OrganizationsService,
      | 'createOrganization'
      | 'getAllOrganizations'
      | 'updateOrganization'
      | 'createUserForOrganization'
      | 'getAuthorizationsOfOrganization'
      | 'authorizeOrganization'
      | 'unauthorizeOrganization'
      | 'getOrganization'
      | 'getOrganizationBalance'
      | 'redeemGdOs'
      | 'updateUserFromOrganization'
      | 'deleteUserFromOrganization'
    >
  >;
  let authService: jest.Mocked<Pick<AuthService, 'login'>>;

  const mockOrganization: Organization = {
    id: 'org-1',
    name: 'TestOrg',
    mspId: 'TestMSP',
    peerEndpoint: 'peer0.test:443',
    type: OrganizationType.PRODUCER,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    authorizedOrgs: [],
    authorizedByOrgs: [],
    users: [],
  };

  const mockDevUser: IAuthenticatedUser = {
    id: 'dev-1',
    email: 'dev@example.com',
    name: 'Dev User',
    role: Role.DEV,
    createdAt: new Date('2026-01-01'),
    organization: mockOrganization,
  };

  const mockAdminUser: IAuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: Role.ADMIN,
    createdAt: new Date('2026-01-01'),
    organization: mockOrganization,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  beforeEach(async () => {
    orgService = {
      createOrganization: jest.fn().mockResolvedValue({ message: 'ok' }),
      getAllOrganizations: jest.fn().mockResolvedValue([mockOrganization]),
      updateOrganization: jest.fn().mockResolvedValue({ message: 'ok' }),
      createUserForOrganization: jest.fn().mockResolvedValue({ message: 'ok' }),
      getAuthorizationsOfOrganization: jest.fn().mockResolvedValue([mockOrganization]),
      authorizeOrganization: jest.fn().mockResolvedValue({ message: 'ok' }),
      unauthorizeOrganization: jest.fn().mockResolvedValue({ message: 'ok' }),
      getOrganization: jest.fn().mockResolvedValue(mockOrganization),
      getOrganizationBalance: jest.fn().mockResolvedValue({ producerId: 'org-1', gdos: { ELECTRICITY: { available: [], unavailable: [] }, H2: { available: [], unavailable: [] } } }),
      redeemGdOs: jest.fn().mockResolvedValue({ message: 'ok' }),
      updateUserFromOrganization: jest.fn().mockResolvedValue({
        message: 'ok',
        user: { id: 'admin-1', name: 'Admin', role: Role.ADMIN },
      }),
      deleteUserFromOrganization: jest.fn().mockResolvedValue({ message: 'ok' }),
    };

    authService = {
      login: jest.fn().mockReturnValue({ access_token: 'new-token' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        { provide: OrganizationsService, useValue: orgService },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
  });

  describe('createOrganization', () => {
    it('should delegate to service with correct params', async () => {
      const dto: CreateOrgDto = { name: 'Org', type: OrganizationType.TRADER, mspId: 'traderMSP', peerEndpoint: 'trader:443' };
      const req = { user: mockDevUser };

      const result = await controller.createOrganization(dto, req);

      expect(orgService.createOrganization).toHaveBeenCalledWith(dto, mockDevUser);
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('getAllOrganizations', () => {
    it('should delegate to service', async () => {
      const req = { user: mockDevUser };

      const result = await controller.getAllOrganizations(req);

      expect(orgService.getAllOrganizations).toHaveBeenCalledWith(mockDevUser);
      expect(result).toEqual([mockOrganization]);
    });
  });

  describe('updateOrganization', () => {
    it('should delegate with id, dto, and user', async () => {
      const req = { user: mockDevUser };
      const dto: UpdateOrgDto = { name: 'NewName' };

      const result = await controller.updateOrganization('org-1', dto, req);

      expect(orgService.updateOrganization).toHaveBeenCalledWith('org-1', dto, mockDevUser);
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('createUserForOrganization', () => {
    it('should delegate to service', async () => {
      const req = { user: mockAdminUser };
      const dto: CreateUserDto = { email: 'new@example.com', password: 'pass123', name: 'New' };

      const result = await controller.createUserForOrganization('org-1', dto, req);

      expect(orgService.createUserForOrganization).toHaveBeenCalledWith('org-1', dto, mockAdminUser);
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('getAuthorizationsFromOrganization', () => {
    it('should delegate to service', async () => {
      const req = { user: mockAdminUser };

      const result = await controller.getAuthorizationsFromOrganization('org-1', req);

      expect(orgService.getAuthorizationsOfOrganization).toHaveBeenCalledWith('org-1', mockAdminUser);
      expect(result).toEqual([mockOrganization]);
    });
  });

  describe('authorizeOrganization', () => {
    it('should delegate to service', async () => {
      const req = { user: mockAdminUser };

      const result = await controller.authorizeOrganization('trader-1', req);

      expect(orgService.authorizeOrganization).toHaveBeenCalledWith('trader-1', mockAdminUser);
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('unauthorizeOrganization', () => {
    it('should delegate to service', async () => {
      const req = { user: mockAdminUser };

      const result = await controller.unauthorizeOrganization('trader-1', req);

      expect(orgService.unauthorizeOrganization).toHaveBeenCalledWith('trader-1', mockAdminUser);
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('getOrganization', () => {
    it('should delegate to service', async () => {
      const req = { user: mockAdminUser };

      const result = await controller.getOrganization('org-1', req);

      expect(orgService.getOrganization).toHaveBeenCalledWith('org-1', mockAdminUser);
      expect(result).toEqual(mockOrganization);
    });
  });

  describe('getOrganizationBalance', () => {
    it('should delegate to service', async () => {
      const req = { user: mockAdminUser };

      const result = await controller.getOrganizationBalance('org-1', req);

      expect(orgService.getOrganizationBalance).toHaveBeenCalledWith('org-1', mockAdminUser);
      expect(result).toEqual({ producerId: 'org-1', gdos: { ELECTRICITY: { available: [], unavailable: [] }, H2: { available: [], unavailable: [] } } });
    });
  });

  describe('redeemGdOs', () => {
    it('should delegate to service with parsed body', async () => {
      const req = { user: mockAdminUser };
      const body: RedeemGdOsDto = { assetType: AssetType.H2, gdosToRedeem: ['gdo-1'] };

      const result = await controller.redeemGdOs('org-1', body, req);

      expect(orgService.redeemGdOs).toHaveBeenCalledWith(
        'org-1',
        AssetType.H2,
        ['gdo-1'],
        mockAdminUser,
      );
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('updateUserFromOrganization', () => {
    it('should delegate to service and refresh token when updating self', async () => {
      const req = { user: mockAdminUser };
      const cookieMock = jest.fn();
      const res = { cookie: cookieMock } as unknown as Response;
      const body: UpdateUserDto = { name: 'NewName' };

      const result = await controller.updateUserFromOrganization('org-1', 'admin-1', body, req, res);

      expect(orgService.updateUserFromOrganization).toHaveBeenCalledWith(
        'org-1',
        'admin-1',
        body,
        mockAdminUser,
      );
      expect(authService.login).toHaveBeenCalled();
      expect(cookieMock).toHaveBeenCalledWith(
        'token',
        'new-token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ message: 'ok', user: { id: 'admin-1', name: 'Admin', role: Role.ADMIN } });
    });

    it('should NOT refresh token when updating a different user', async () => {
      const req = { user: mockAdminUser };
      const cookieMock = jest.fn();
      const res = { cookie: cookieMock } as unknown as Response;

      await controller.updateUserFromOrganization('org-1', 'other-user', { name: 'X' } as UpdateUserDto, req, res);

      expect(authService.login).not.toHaveBeenCalled();
      expect(cookieMock).not.toHaveBeenCalled();
    });
  });

  describe('deleteUserFromOrganization', () => {
    it('should delegate to service', async () => {
      const req = { user: mockAdminUser };

      const result = await controller.deleteUserFromOrganization('org-1', 'user-1', req);

      expect(orgService.deleteUserFromOrganization).toHaveBeenCalledWith(
        'org-1',
        'user-1',
        mockAdminUser,
      );
      expect(result).toEqual({ message: 'ok' });
    });
  });
});
