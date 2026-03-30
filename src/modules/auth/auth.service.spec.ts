import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from '../user/services/user.service';
import { User, UserRole } from '../user/entities/user.entity';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: JwtService;
  let userService: UserService;

  const mockUser: Partial<User> & { id: number } = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    roles: [UserRole.USER],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            validateUser: jest.fn(),
            getUserById: jest.fn(),
            changePassword: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    userService = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user if valid', async () => {
      jest.spyOn(userService, 'validateUser').mockResolvedValue(mockUser as any);

      const result = await authService.validateUser('testuser', 'password');

      expect(result).toBe(mockUser);
      expect(userService.validateUser).toHaveBeenCalledWith('testuser', 'password');
    });

    it('should return null if invalid', async () => {
      jest.spyOn(userService, 'validateUser').mockResolvedValue(null);

      const result = await authService.validateUser('wronguser', 'wrongpass');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user info', async () => {
      jest.spyOn(jwtService, 'sign').mockReturnValue('fake_token');

      const result = await authService.login(mockUser as any);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('expires_in', 3600);
      expect(result).toHaveProperty('token_type', 'Bearer');
      expect(result).toHaveProperty('user');
      expect(result.user).toEqual(expect.objectContaining({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        roles: mockUser.roles,
      }));
    });

    it('should call jwtService.sign with correct payload', async () => {
      jest.spyOn(jwtService, 'sign').mockReturnValue('fake_token');

      await authService.login(mockUser as any);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        username: mockUser.username,
        roles: mockUser.roles,
        email: mockUser.email,
      });
    });
  });

  describe('refreshToken', () => {
    it('should return new token using login method', async () => {
      const loginSpy = jest.spyOn(authService, 'login');
      
      await authService.refreshToken(mockUser as any);

      expect(loginSpy).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('changePassword', () => {
    it('should call userService.changePassword', async () => {
      const changePasswordSpy = jest.spyOn(userService, 'changePassword')
        .mockResolvedValue(mockUser as any);

      await authService.changePassword(1, 'oldpass', 'newpass');

      expect(changePasswordSpy).toHaveBeenCalledWith(1, 'oldpass', 'newpass');
    });
  });
});
