import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { UserService } from './user.service';
import * as bcrypt from 'bcryptjs';

// Mock bcryptjs module
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  let userRepo: Repository<User>;

  const mockUser: Partial<User> = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    roles: [UserRole.USER] as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);

      const result = await service.getUserById(1);

      expect(result).toEqual(mockUser);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

      await expect(service.getUserById(999)).rejects.toThrow();
    });
  });

  describe('getUsers', () => {
    it('应该返回分页用户列表（默认参数）', async () => {
      const mockUsers = [mockUser];
      jest.spyOn(userRepo, 'findAndCount').mockResolvedValue([mockUsers as any, 1]);

      const result = await service.getUsers({ page: 1, limit: 20 } as any);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('应该处理空结果', async () => {
      jest.spyOn(userRepo, 'findAndCount').mockResolvedValue([[], 0]);

      const result = await service.getUsers({ page: 1, limit: 20 } as any);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('应该处理用户名模糊查询', async () => {
      jest.spyOn(userRepo, 'findAndCount').mockResolvedValue([[mockUser as any], 1]);

      await service.getUsers({ username: 'test' } as any);

      expect(userRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            username: expect.any(Object), // Like 对象
          }),
        })
      );
    });

    it('应该处理邮箱模糊查询', async () => {
      jest.spyOn(userRepo, 'findAndCount').mockResolvedValue([[mockUser as any], 1]);

      await service.getUsers({ email: 'test@example.com' } as any);

      expect(userRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: expect.any(Object), // Like 对象
          }),
        })
      );
    });

    it('应该处理激活状态过滤 - isActive = true', async () => {
      jest.spyOn(userRepo, 'findAndCount').mockResolvedValue([[mockUser as any], 1]);

      await service.getUsers({ isActive: true } as any);

      expect(userRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        })
      );
    });

    it('应该处理激活状态过滤 - isActive = false', async () => {
      jest.spyOn(userRepo, 'findAndCount').mockResolvedValue([[mockUser as any], 1]);

      await service.getUsers({ isActive: false } as any);

      expect(userRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: false },
        })
      );
    });

    it('应该处理激活状态过滤 - isActive = undefined', async () => {
      jest.spyOn(userRepo, 'findAndCount').mockResolvedValue([[mockUser as any], 1]);

      await service.getUsers({} as any);

      expect(userRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ isActive: expect.anything() }),
        })
      );
    });

    it('应该处理角色过滤 - ADMIN 角色', async () => {
      const adminUser = { ...mockUser, roles: [UserRole.ADMIN] };
      const regularUser = { ...mockUser, roles: [UserRole.USER] };
      
      jest.spyOn(userRepo, 'findAndCount').mockResolvedValue([[adminUser as any, regularUser as any], 2]);

      const result = await service.getUsers({ role: UserRole.ADMIN } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].roles).toContain(UserRole.ADMIN);
    });

    it('应该处理角色过滤 - USER 角色', async () => {
      const adminUser = { ...mockUser, roles: [UserRole.ADMIN] };
      const regularUser = { ...mockUser, roles: [UserRole.USER] };
      
      jest.spyOn(userRepo, 'findAndCount').mockResolvedValue([[adminUser as any, regularUser as any], 2]);

      const result = await service.getUsers({ role: UserRole.USER } as any);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].roles).toContain(UserRole.USER);
    });

    it('应该处理多个查询条件组合', async () => {
      jest.spyOn(userRepo, 'findAndCount').mockResolvedValue([[mockUser as any], 1]);

      await service.getUsers({
        username: 'test',
        email: 'test@example.com',
        isActive: true,
        role: UserRole.USER,
      } as any);

      expect(userRepo.findAndCount).toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const createDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        roles: ['user'],
      };

      const createdUser = { ...createDto, id: 2 };

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      jest.spyOn(userRepo, 'create').mockReturnValue(createdUser as any);
      jest.spyOn(userRepo, 'save').mockResolvedValue(createdUser as any);

      const result = await service.createUser(createDto as any);

      expect(result.username).toBe('newuser');
      expect(result.email).toBe('new@example.com');
      expect(result.password).toBeUndefined(); // hidePassword 会移除密码字段
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', expect.any(Number));
      expect(userRepo.create).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('should throw error if username already exists', async () => {
      const createDto = {
        username: 'existing',
        email: 'existing@example.com',
        password: 'password123',
      };

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);

      await expect(service.createUser(createDto as any)).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateDto = {
        email: 'updated@example.com',
        roles: ['admin', 'user'],
      };

      const updatedUser = { ...mockUser, ...updateDto };

      // Mock findOne twice: first to find the user, second to check if email exists (returns null = not found)
      jest.spyOn(userRepo, 'findOne')
        .mockResolvedValueOnce(mockUser as any)  // First call: getUserById -> findOneBy
        .mockResolvedValueOnce(null);            // Second call: check if email exists
      
      // updateUser uses save() not update()
      jest.spyOn(userRepo, 'save').mockResolvedValue(updatedUser as any);

      const result = await service.updateUser(1, updateDto as any);

      expect(result.email).toBe('updated@example.com');
      expect(result.roles).toContain('admin');
      expect(result.password).toBeUndefined(); // hidePassword 会移除密码字段
      expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1, ...updateDto }));
    });

    it('should throw NotFoundException when updating non-existent user', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

      await expect(service.updateUser(999, { email: 'new@example.com' })).rejects.toThrow();
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(userRepo, 'remove').mockResolvedValue(mockUser as any);

      await service.deleteUser(1);

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(userRepo.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw NotFoundException when deleting non-existent user', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

      await expect(service.deleteUser(999)).rejects.toThrow();
    });
  });

  describe('changePassword', () => {
    it('应该修改密码成功', async () => {
      const userId = 1;
      const oldPassword = 'oldpass';
      const newPassword = 'newpass123';

      // Create a mock user with hashed password
      const mockUserWithPassword = { ...mockUser, password: 'hashed_password' };
      
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUserWithPassword as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new_pass');
      jest.spyOn(userRepo, 'save').mockResolvedValue({ ...mockUserWithPassword } as any);

      const result = await service.changePassword(userId, oldPassword, newPassword);

      expect(result.password).toBeUndefined(); // hidePassword 会移除密码字段
      expect(bcrypt.compare).toHaveBeenCalledWith(oldPassword, 'hashed_password');
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, expect.any(Number));
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('应该处理错误密码', async () => {
      const mockUserWithPassword = { ...mockUser, password: 'hashed_password' };
      
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUserWithPassword as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(1, 'wrongpass', 'newpass')).rejects.toThrow();
    });

    it('应该处理用户不存在的情况', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

      await expect(service.changePassword(999, 'oldpass', 'newpass')).rejects.toThrow();
    });
  });

  describe('toggleUserStatus', () => {
    it('应该激活用户 - isActive = true', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      const activatedUser = { ...inactiveUser, isActive: true };
      
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(inactiveUser as any);
      jest.spyOn(userRepo, 'save').mockResolvedValue(activatedUser as any);

      const result = await service.toggleUserStatus(1, true);

      expect(result.isActive).toBe(true);
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, isActive: true })
      );
    });

    it('应该停用用户 - isActive = false', async () => {
      const activeUser = { ...mockUser, isActive: true };
      const deactivatedUser = { ...activeUser, isActive: false };
      
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(activeUser as any);
      jest.spyOn(userRepo, 'save').mockResolvedValue(deactivatedUser as any);

      const result = await service.toggleUserStatus(1, false);

      expect(result.isActive).toBe(false);
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, isActive: false })
      );
    });

    it('应该处理不存在的用户', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

      await expect(service.toggleUserStatus(999, true)).rejects.toThrow();
    });
  });

  describe('validateUser', () => {
    it('应该验证用户登录成功', async () => {
      const password = 'password123';
      const mockUserWithPassword = { ...mockUser, password: 'hashed_password', isActive: true };
      
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUserWithPassword as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(userRepo, 'save').mockResolvedValue(mockUserWithPassword as any);

      const result = await service.validateUser('testuser', password);

      expect(result).toBeDefined();
      expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hashed_password');
      expect(userRepo.save).toHaveBeenCalled(); // 更新 lastLoginAt
    });

    it('应该拒绝未激活的用户', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(inactiveUser as any);

      const result = await service.validateUser('testuser', 'password');

      expect(result).toBeNull();
    });

    it('应该拒绝错误的密码', async () => {
      const mockUserWithPassword = { ...mockUser, password: 'hashed_password', isActive: true };
      
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUserWithPassword as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('testuser', 'wrongpass');

      expect(result).toBeNull();
    });

    it('应该拒绝不存在的用户', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'password');

      expect(result).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('应该重置密码成功', async () => {
      const newPassword = 'newpass123';
      
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_new_pass');
      jest.spyOn(userRepo, 'save').mockResolvedValue(mockUser as any);

      const result = await service.resetPassword(1, newPassword);

      expect(result.password).toBeUndefined();
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, expect.any(Number));
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('应该处理不存在的用户', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

      await expect(service.resetPassword(999, 'newpass')).rejects.toThrow();
    });
  });

  describe('createUser - 分支覆盖', () => {
    it('应该使用默认角色创建用户（当 roles 为空数组）', async () => {
      const createDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        roles: [], // 空数组，应使用默认角色
      };

      const createdUser = { ...createDto, id: 2, roles: [UserRole.USER] };

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      jest.spyOn(userRepo, 'create').mockReturnValue(createdUser as any);
      jest.spyOn(userRepo, 'save').mockResolvedValue(createdUser as any);

      const result = await service.createUser(createDto as any);

      expect(result.roles).toEqual([UserRole.USER]); // 默认角色
    });

    it('应该使用默认角色创建用户（当 roles 为 undefined）', async () => {
      const createDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        // roles 未指定
      };

      const createdUser = { ...createDto, id: 2, roles: [UserRole.USER] };

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      jest.spyOn(userRepo, 'create').mockReturnValue(createdUser as any);
      jest.spyOn(userRepo, 'save').mockResolvedValue(createdUser as any);

      const result = await service.createUser(createDto as any);

      expect(result.roles).toEqual([UserRole.USER]); // 默认角色
    });

    it('应该使用指定的角色创建用户', async () => {
      const createDto = {
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123',
        roles: [UserRole.ADMIN, UserRole.USER],
      };

      const createdUser = { ...createDto, id: 2 };

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      jest.spyOn(userRepo, 'create').mockReturnValue(createdUser as any);
      jest.spyOn(userRepo, 'save').mockResolvedValue(createdUser as any);

      const result = await service.createUser(createDto as any);

      expect(result.roles).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('应该抛出邮箱已存在的错误', async () => {
      const createDto = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'password123',
      };

      // 第一次调用返回 null（用户名不存在），第二次返回已有用户（邮箱存在）
      jest.spyOn(userRepo, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser as any);

      await expect(service.createUser(createDto as any)).rejects.toThrow('邮箱');
    });
  });

});
