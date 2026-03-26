import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn((payload) => `mocked_jwt_token_${payload.sub}`),
            verify: jest.fn((token) => {
              if (token.includes('invalid')) {
                throw new Error('Invalid token');
              }
              return { sub: 1, username: 'testuser', roles: ['user'] };
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user payload for valid credentials (admin)', async () => {
      const result = await authService.validateUser('admin', 'admin123');
      
      expect(result).toEqual({
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin', 'user'],
      });
    });

    it('should return user payload for valid credentials (user)', async () => {
      const result = await authService.validateUser('user', 'user123');
      
      expect(result).toEqual({
        id: 2,
        username: 'user',
        email: 'user@example.com',
        roles: ['user'],
      });
    });

    it('should return null for invalid credentials', async () => {
      const result = await authService.validateUser('wronguser', 'wrongpass');
      
      expect(result).toBeNull();
    });

    it('should return null for empty username', async () => {
      const result = await authService.validateUser('', 'anypassword');
      
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
    };

    it('should return access token and user info', async () => {
      const result = await authService.login(mockUser);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('expires_in', 3600);
      expect(result).toHaveProperty('token_type', 'Bearer');
      expect(result).toHaveProperty('user');
      expect(result.user).toEqual(mockUser);
    });

    it('should call jwtService.sign with correct payload', async () => {
      await authService.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        username: mockUser.username,
        roles: mockUser.roles,
      });
    });

    it('should include all user properties in response', async () => {
      const result = await authService.login(mockUser);

      expect(result.user).toMatchObject({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        roles: mockUser.roles,
      });
    });
  });

  describe('refreshToken', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
    };

    it('should return new token using login method', async () => {
      const loginSpy = jest.spyOn(authService, 'login');
      
      await authService.refreshToken(mockUser);

      expect(loginSpy).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('verifyToken', () => {
    it('should return decoded payload for valid token', () => {
      const result = authService.verifyToken('valid_token');

      expect(result).toEqual({
        sub: 1,
        username: 'testuser',
        roles: ['user'],
      });
    });

    it('should return null for invalid token', () => {
      const result = authService.verifyToken('invalid_token');

      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      // Mock JWT service to throw error for expired token
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Token expired');
      });

      const result = authService.verifyToken('expired_token');

      expect(result).toBeNull();
    });
  });
});
