import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe('login', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
    };

    const mockLoginResponse = {
      access_token: 'mocked_jwt_token',
      expires_in: 3600,
      token_type: 'Bearer',
      user: mockUser,
    };

    it('should return access token on successful login', async () => {
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const mockRequest = {
        user: mockUser,
        body: { username: 'testuser', password: 'password' },
      };

      const result = await authController.login(mockRequest as any, mockRequest.body);

      expect(result).toEqual(mockLoginResponse);
      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });

    it('should call authService.login with correct user from request', async () => {
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const mockRequest = { user: mockUser, body: {} };

      await authController.login(mockRequest as any, {});

      expect(authService.login).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('refresh', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
    };

    const mockRefreshResponse = {
      access_token: 'new_mocked_jwt_token',
      expires_in: 3600,
      token_type: 'Bearer',
      user: mockUser,
    };

    it('should return new access token', async () => {
      mockAuthService.refreshToken.mockResolvedValue(mockRefreshResponse);

      const mockRequest = { user: mockUser };

      const result = await authController.refresh(mockRequest as any);

      expect(result).toEqual(mockRefreshResponse);
      expect(authService.refreshToken).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('getCurrentUser', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
    };

    it('should return current user info', async () => {
      const mockRequest = { user: mockUser };

      const result = await authController.getCurrentUser(mockRequest as any);

      expect(result).toEqual({ user: mockUser });
    });

    it('should return user object from request', async () => {
      const mockRequest = { 
        user: { 
          id: 2, 
          username: 'anotheruser', 
          email: 'another@example.com',
          roles: ['admin']
        } 
      };

      const result = await authController.getCurrentUser(mockRequest as any);

      expect(result.user).toEqual(mockRequest.user);
    });
  });
});
