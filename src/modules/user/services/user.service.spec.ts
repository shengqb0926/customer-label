import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserService } from './user.service';
import * as bcrypt from 'bcryptjs';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
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
    it('should return paginated users with filters', async () => {
      const mockUsers = [mockUser];
      jest.spyOn(userRepo, 'findAndCount').mockResolvedValue([mockUsers as any, 1]);

      const result = await service.getUsers({ page: 1, limit: 20 } as any);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should handle empty results', async () => {
      jest.spyOn(userRepo, 'findAndCount').mockResolvedValue([[], 0]);

      const result = await service.getUsers({ page: 1, limit: 20 } as any);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
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

      // Mock findOne twice: first to find the user, second to check email uniqueness
      jest.spyOn(userRepo, 'findOne')
        .mockResolvedValueOnce(mockUser as any)  // First call: find user by id
        .mockResolvedValueOnce(null);            // Second call: check if email exists (returns null = not found)
      
      jest.spyOn(userRepo, 'update').mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(userRepo, 'save').mockResolvedValue(updatedUser as any);

      const result = await service.updateUser(1, updateDto as any);

      expect(result.email).toBe('updated@example.com');
      expect(result.roles).toContain('admin');
      expect(result.password).toBeUndefined(); // hidePassword 会移除密码字段
      expect(userRepo.update).toHaveBeenCalledWith(1, updateDto);
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
    it('should change password successfully', async () => {
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

    it('should throw error if old password is incorrect', async () => {
      const mockUserWithPassword = { ...mockUser, password: 'hashed_password' };
      
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUserWithPassword as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(1, 'wrongpass', 'newpass')).rejects.toThrow();
    });
  });
});
