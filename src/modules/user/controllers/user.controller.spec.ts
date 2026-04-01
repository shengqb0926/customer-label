import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '../entities/user.entity';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    createUser: jest.fn(),
    getUsers: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    toggleUserStatus: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  it('应该被定义', () => {
    expect(controller).toBeDefined();
  });

  describe('createUser', () => {
    it('应该创建新用户', async () => {
      const dto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.USER,
      };

      const createdUser = { ...dto, id: 1, createdAt: new Date(), updatedAt: new Date() };
      mockUserService.createUser.mockResolvedValue(createdUser);

      const result = await controller.createUser(dto);

      expect(result).toEqual(createdUser);
      expect(service.createUser).toHaveBeenCalledWith(dto);
    });
  });

  describe('getUsers', () => {
    it('应该返回用户列表', async () => {
      const users = [
        { id: 1, username: 'user1', email: 'user1@example.com' },
        { id: 2, username: 'user2', email: 'user2@example.com' },
      ];
      
      mockUserService.getUsers.mockResolvedValue({ data: users, total: 2, page: 1, limit: 10 });

      const result = await controller.getUsers({ page: 1, limit: 10 });

      expect(result).toEqual({ data: users, total: 2, page: 1, limit: 10 });
      expect(service.getUsers).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });

  describe('getUserById', () => {
    it('应该返回单个用户', async () => {
      const user = { id: 1, username: 'testuser', email: 'test@example.com' };
      mockUserService.getUserById.mockResolvedValue(user);

      const result = await controller.getUserById(1);

      expect(result).toEqual(user);
      expect(service.getUserById).toHaveBeenCalledWith(1);
    });
  });

  describe('updateUser', () => {
    it('应该更新用户', async () => {
      const dto = { username: 'updateduser', email: 'updated@example.com' };
      const updatedUser = { id: 1, ...dto };
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(1, dto);

      expect(result).toEqual(updatedUser);
      expect(service.updateUser).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('deleteUser', () => {
    it('应该删除用户', async () => {
      mockUserService.deleteUser.mockResolvedValue(undefined);

      await controller.deleteUser(1);

      expect(service.deleteUser).toHaveBeenCalledWith(1);
    });
  });
});
