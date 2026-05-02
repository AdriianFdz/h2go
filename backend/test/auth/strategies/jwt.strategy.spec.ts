import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../../../src/auth/strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    strategy = new JwtStrategy(configService as unknown as ConfigService);
  });

  describe('validate', () => {
    it('should return IAuthenticatedUser from valid payload', () => {
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'User',
        createdAt: '2026-01-01',
        avatar: 'https://avatar.url',
        organization: { id: 'org-1', name: 'Org1' },
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'User',
        createdAt: '2026-01-01',
        avatar: 'https://avatar.url',
        organization: { id: 'org-1', name: 'Org1' },
      });
    });

    it('should throw UnauthorizedException when payload has no sub', () => {
      const payload = { email: 'test@example.com' };

      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when payload has no email', () => {
      const payload = { sub: 'user-1' };

      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    });
  });
});
