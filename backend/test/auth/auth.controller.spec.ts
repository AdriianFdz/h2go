import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { Role } from '../../src/common/enums/role.enum';
import { OrganizationType } from '../../src/common/enums/organizationType.enum';
import { IAuthenticatedUser } from '../../src/auth/interfaces/authenticatedUser';
import { Organization } from '../../src/entities/organization.entity';
import { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Pick<AuthService, 'login' | 'logout' | 'getAuthorizedByOrgs'>>;

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

  beforeEach(async () => {
    authService = {
      login: jest.fn().mockReturnValue({ access_token: 'mock-token' }),
      logout: jest.fn(),
      getAuthorizedByOrgs: jest.fn().mockResolvedValue(['org-2', 'org-3']),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('should set cookie and return success message', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        role: Role.USER,
      };
      const req = { user: mockUser };
      const cookieMock = jest.fn();
      const res = { cookie: cookieMock } as unknown as Response;

      const result = controller.login(req, res);

      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(cookieMock).toHaveBeenCalledWith(
        'token',
        'mock-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
        }),
      );
      expect(result).toEqual({ message: 'Logged in successfully' });
    });
  });

  describe('verify', () => {
    it('should return authenticated user with authorizedByOrgs', async () => {
      const mockUser: IAuthenticatedUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date('2026-01-01'),
        role: Role.USER,
        organization: mockOrganization,
      };
      const req = { user: mockUser };

      const result = await controller.verify(req);

      expect(authService.getAuthorizedByOrgs).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({
        authenticated: true,
        user: mockUser,
        authorizedByOrgs: ['org-2', 'org-3'],
      });
    });
  });

  describe('logout', () => {
    it('should call authService.logout and return success message', () => {
      const clearCookieMock = jest.fn();
      const res = { clearCookie: clearCookieMock } as unknown as Response;

      const result = controller.logout(res);

      expect(authService.logout).toHaveBeenCalledWith(res);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
