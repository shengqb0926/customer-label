import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let mockAuthService: Partial<AuthService>;

  beforeEach(() => {
    // Mock AuthService
    mockAuthService = {
      validateUser: jest.fn(),
    };

    strategy = new LocalStrategy(mockAuthService as AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user when credentials are valid', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin',
      };

      (mockAuthService.validateUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await strategy.validate('testuser', 'password123');

      expect(result).toEqual(mockUser);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith('testuser', 'password123');
      expect(mockAuthService.validateUser).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      (mockAuthService.validateUser as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate('nonexistent', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate('nonexistent', 'wrongpassword')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException when validateUser returns undefined', async () => {
      (mockAuthService.validateUser as jest.Mock).mockResolvedValue(undefined);

      await expect(strategy.validate('testuser', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should call authService.validateUser with correct parameters', async () => {
      const mockUser = { id: '1', username: 'admin' };
      (mockAuthService.validateUser as jest.Mock).mockResolvedValue(mockUser);

      await strategy.validate('admin', 'admin123');

      expect(mockAuthService.validateUser).toHaveBeenCalledWith('admin', 'admin123');
      expect(mockAuthService.validateUser).toHaveBeenCalledTimes(1);
    });

    it('should handle special characters in username', async () => {
      const mockUser = { id: '2', username: 'test+user@example.com' };
      (mockAuthService.validateUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await strategy.validate('test+user@example.com', 'password');

      expect(result).toEqual(mockUser);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith('test+user@example.com', 'password');
    });

    it('should handle empty password', async () => {
      const mockUser = { id: '3', username: 'testuser' };
      (mockAuthService.validateUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await strategy.validate('testuser', '');

      expect(result).toEqual(mockUser);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith('testuser', '');
    });

    it('should propagate errors from validateUser', async () => {
      const error = new Error('Database connection error');
      (mockAuthService.validateUser as jest.Mock).mockRejectedValue(error);

      await expect(strategy.validate('testuser', 'password')).rejects.toThrow(
        'Database connection error',
      );
    });
  });

  describe('constructor', () => {
    it('should initialize with usernameField option', () => {
      // Verify that the strategy is properly initialized
      expect(strategy).toBeDefined();
      expect(strategy).toBeInstanceOf(LocalStrategy);
    });

    it('should inject AuthService correctly', () => {
      // The constructor should successfully inject the AuthService
      expect(new LocalStrategy(mockAuthService as AuthService)).toBeDefined();
    });
  });
});
