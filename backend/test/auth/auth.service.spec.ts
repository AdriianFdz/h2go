import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../src/entities/user.entity';
import { Organization } from '../../src/entities/organization.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../../src/common/enums/role.enum';
import { OrganizationType } from '../../src/common/enums/organizationType.enum';
import { Repository } from 'typeorm';
import { IAuthenticatedUser } from '../../src/auth/interfaces/authenticatedUser';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<Pick<Repository<User>, 'findOne'>>;
  let organizationRepository: jest.Mocked<Pick<Repository<Organization>, 'findOne'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  const baseOrganization: Organization = {
    id: 'org-1',
    name: 'Org1',
    mspId: 'Org1MSP',
    peerEndpoint: 'peer0.org1:443',
    type: OrganizationType.PRODUCER,
    createdAt: new Date('2026-01-01'),
    authorizedOrgs: [],
    authorizedByOrgs: [],
    users: [],
  };

  beforeEach(async () => {
    usersRepository = {
      findOne: jest.fn(),
    };
    organizationRepository = {
      findOne: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        {
          provide: getRepositoryToken(Organization),
          useValue: organizationRepository,
        },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    const mockUser: User = {
      id: 'user-1',
      email: 'test@example.com',
      password: 'hashed-password',
      name: 'Test User',
      role: Role.USER,
      organization: baseOrganization,
      createdAt: new Date('2026-01-01'),
    };

    it('should return user without password when credentials are valid', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.USER,
        organization: baseOrganization,
        createdAt: mockUser.createdAt,
      });
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: ['organization'],
      });
    });

    it('should return null when password is incorrect', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrong-password',
      );

      expect(result).toBeNull();
    });

    it('should return null when user is not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser(
        'notfound@example.com',
        'password123',
      );

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const mockOrganization = {
      id: 'org-1',
      name: 'TestOrg',
      mspId: 'TestMSP',
      peerEndpoint: 'peer0.test:443',
      type: OrganizationType.PRODUCER,
    };

    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: Role.USER,
      createdAt: new Date('2026-01-01'),
      avatar: 'https://avatar.url',
      organization: mockOrganization,
    };

    it('should return access_token with organization data', () => {
      const result = service.login(mockUser);

      expect(result).toEqual({ access_token: 'mock-jwt-token' });
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: Role.USER,
          createdAt: mockUser.createdAt,
          avatar: 'https://avatar.url',
          organization: {
            id: 'org-1',
            name: 'TestOrg',
            mspId: 'TestMSP',
            peerEndpoint: 'peer0.test:443',
            type: OrganizationType.PRODUCER,
          },
        },
        undefined,
      );
    });

    it('should set organization to null when user has no organization', () => {
      const userNoOrg = { ...mockUser, organization: null };
      service.login(userNoOrg);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ organization: null }),
        undefined,
      );
    });

    it('should pass expiresIn option when provided', () => {
      service.login(mockUser, 3600000);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        { expiresIn: '3600000ms' },
      );
    });

    it('should set avatar to null when user has no avatar', () => {
      const userNoAvatar = { ...mockUser, avatar: undefined };
      service.login(userNoAvatar);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ avatar: null }),
        undefined,
      );
    });
  });

  describe('logout', () => {
    it('should clear the token cookie', () => {
      const res = { clearCookie: jest.fn() };

      service.logout(res);

      expect(res.clearCookie).toHaveBeenCalledWith('token', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
      });
    });
  });

  describe('getAuthorizedByOrgs', () => {
    it('should return array of authorized org IDs', async () => {
      const org2: Organization = { ...baseOrganization, id: 'org-2', name: 'Org2' };
      const org3: Organization = { ...baseOrganization, id: 'org-3', name: 'Org3' };
      const mockOrg: Organization = {
        ...baseOrganization,
        authorizedByOrgs: [org2, org3],
      };
      organizationRepository.findOne.mockResolvedValue(mockOrg);

      const user: IAuthenticatedUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date('2026-01-01'),
        role: Role.USER,
        organization: baseOrganization,
      };

      const result = await service.getAuthorizedByOrgs(user);

      expect(result).toEqual(['org-2', 'org-3']);
      expect(organizationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        relations: ['authorizedByOrgs'],
      });
    });

    it('should return empty array when user has no organization', async () => {
      const user: IAuthenticatedUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date('2026-01-01'),
        role: Role.USER,
        organization: null as unknown as Organization,
      };

      const result = await service.getAuthorizedByOrgs(user);

      expect(result).toEqual([]);
    });

    it('should return empty array when organization is not found', async () => {
      organizationRepository.findOne.mockResolvedValue(null);

      const user: IAuthenticatedUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date('2026-01-01'),
        role: Role.USER,
        organization: baseOrganization,
      };

      const result = await service.getAuthorizedByOrgs(user);

      expect(result).toEqual([]);
    });

    it('should return empty array when authorizedByOrgs is null', async () => {
      const mockOrg: Organization = {
        ...baseOrganization,
        authorizedByOrgs: null as unknown as Organization[],
      };
      organizationRepository.findOne.mockResolvedValue(mockOrg);

      const user: IAuthenticatedUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date('2026-01-01'),
        role: Role.USER,
        organization: baseOrganization,
      };

      const result = await service.getAuthorizedByOrgs(user);

      expect(result).toEqual([]);
    });
  });
});
