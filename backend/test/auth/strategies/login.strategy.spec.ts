import { Test, TestingModule } from '@nestjs/testing';
import { LoginStrategy } from '../../../src/auth/strategies/login.strategy';
import { AuthService } from '../../../src/auth/auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('LoginStrategy', () => {
  let strategy: LoginStrategy;
  let authService: jest.Mocked<Pick<AuthService, 'validateUser'>>;

  beforeEach(async () => {
    authService = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginStrategy,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    strategy = module.get<LoginStrategy>(LoginStrategy);
  });

  describe('validate', () => {
    it('should return user when credentials are valid', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
      };
      authService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate('test@example.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('test@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
