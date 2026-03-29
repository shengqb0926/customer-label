import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('UserService', () => {
  let service: UserService;
  let userRepo: Repository<User>;

  const mockUser: Partial<User> = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashed_password',
    roles: ['user'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
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

      const createdUser = { ...createDto, id: 2, password: 'hashed_new_password' };

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_new_password' as never);
      jest.spyOn(userRepo, 'create').mockReturnValue(createdUser as any);
      jest.spyOn(userRepo, 'save').mockResolvedValue(createdUser as any);

      const result = await service.createUser(createDto as any);

      expect(result.username).toBe('newuser');
      expect(result.password).toBe('hashed_new_password');
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(userRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        username: 'newuser',
        email: 'new@example.com',
      }));
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

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(userRepo, 'update').mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(userRepo, 'save').mockResolvedValue(updatedUser as any);

      const result = await service.updateUser(1, updateDto as any);

      expect(result.email).toBe('updated@example.com');
      expect(result.roles).toContain('admin');
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
      jest.spyOn(userRepo, 'delete').mockResolvedValue({ affected: 1 } as any);

      await service.deleteUser(1);

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(userRepo.delete).toHaveBeenCalledWith(1);
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

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_new_pass' as never);
      jest.spyOn(userRepo, 'save').mockResolvedValue({ ...mockUser, password: 'hashed_new_pass' } as any);

      const result = await service.changePassword(userId, oldPassword, newPassword);

      expect(result.password).toBe('hashed_new_pass');
      expect(bcrypt.compare).toHaveBeenCalledWith(oldPassword, mockUser.password);
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, expect.any(Number));
    });

    it('should throw error if old password is incorrect', async () => {
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.changePassword(1, 'wrongpass', 'newpass')).rejects.toThrow();
    });
  });

  describe('validatePassword', () => {
    it('should validate password correctly', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await (service as any).validatePassword('correct', 'hashed_correct');

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await (service as any).validatePassword('wrong', 'hashed_correct');

      expect(result).toBe(false);
    });
  });
});
