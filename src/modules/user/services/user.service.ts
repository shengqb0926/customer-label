import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  roles?: UserRole[];
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
  roles?: UserRole[];
  isActive?: boolean;
}

export interface GetUsersDto {
  page?: number;
  limit?: number;
  username?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly saltRounds = 10;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * 创建用户
   */
  async createUser(dto: CreateUserDto): Promise<User> {
    // 检查用户名是否已存在
    const existingUsername = await this.userRepo.findOne({
      where: { username: dto.username },
    });

    if (existingUsername) {
      throw new ConflictException(`用户名 "${dto.username}" 已存在`);
    }

    // 检查邮箱是否已存在
    const existingEmail = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException(`邮箱 "${dto.email}" 已存在`);
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

    // 默认角色
    const roles = dto.roles && dto.roles.length > 0 ? dto.roles : [UserRole.USER];

    const user = this.userRepo.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      phone: dto.phone,
      roles,
      isActive: true,
    });

    const saved = await this.userRepo.save(user);
    this.logger.log(`Created user: ${saved.username} (ID: ${saved.id})`);
    
    // 返回不包含密码的用户信息
    return this.hidePassword(saved);
  }

  /**
   * 分页获取用户列表
   */
  async getUsers(options: GetUsersDto): Promise<{
    data: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      username,
      email,
      role,
      isActive,
    } = options;

    const where: FindOptionsWhere<User> = {};

    if (username) {
      where.username = Like(`%${username}%`);
    }

    if (email) {
      where.email = Like(`%${email}%`);
    }

    // 注意：simple-array 类型的字段不能直接使用 Like，需要特殊处理
    // 这里暂时移除角色过滤，改用查询后过滤
    const roleFilter = role;
    delete where.roles;

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await this.userRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 隐藏密码并按角色过滤
    let usersWithoutPassword = data.map(user => this.hidePassword(user));
    
    if (roleFilter) {
      usersWithoutPassword = usersWithoutPassword.filter(user => 
        user.roles.includes(roleFilter as UserRole)
      );
    }

    return {
      data: usersWithoutPassword,
      total,
      page,
      limit,
    };
  }

  /**
   * 获取单个用户详情
   */
  async getUserById(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }

    return this.hidePassword(user);
  }

  /**
   * 通过用户名获取用户
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { username } });
    return user;
  }

  /**
   * 更新用户信息
   */
  async updateUser(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.getUserById(id);

    // 如果修改用户名，检查是否与其他用户冲突
    if (dto.username && dto.username !== user.username) {
      const existing = await this.userRepo.findOne({
        where: { username: dto.username },
      });

      if (existing) {
        throw new ConflictException(`用户名 "${dto.username}" 已存在`);
      }
    }

    // 如果修改邮箱，检查是否与其他用户冲突
    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepo.findOne({
        where: { email: dto.email },
      });

      if (existing) {
        throw new ConflictException(`邮箱 "${dto.email}" 已存在`);
      }
    }

    // 如果修改密码，加密新密码
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, this.saltRounds);
    }

    // 更新其他字段
    Object.assign(user, dto);

    const updated = await this.userRepo.save(user);
    this.logger.log(`Updated user: ${updated.username} (ID: ${updated.id})`);

    return this.hidePassword(updated);
  }

  /**
   * 删除用户
   */
  async deleteUser(id: number): Promise<void> {
    const user = await this.getUserById(id);
    
    // 不能删除自己
    // 这个检查在 service 层无法实现，需要在 controller 层处理
    
    await this.userRepo.remove(user);
    this.logger.log(`Deleted user: ${user.username} (ID: ${id})`);
  }

  /**
   * 激活/停用用户
   */
  async toggleUserStatus(id: number, isActive: boolean): Promise<User> {
    const user = await this.getUserById(id);
    user.isActive = isActive;
    const updated = await this.userRepo.save(user);
    
    this.logger.log(`${isActive ? 'Activated' : 'Deactivated'} user: ${user.username} (ID: ${user.id})`);
    
    return this.hidePassword(updated);
  }

  /**
   * 验证用户登录
   */
  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { username },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    // 更新最后登录信息
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    return user;
  }

  /**
   * 修改密码
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`用户不存在`);
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('原密码错误');
    }

    // 更新密码
    user.password = await bcrypt.hash(newPassword, this.saltRounds);
    const updated = await this.userRepo.save(user);

    this.logger.log(`Password changed for user: ${user.username} (ID: ${user.id})`);

    return this.hidePassword(updated);
  }

  /**
   * 重置密码（管理员功能）
   */
  async resetPassword(userId: number, newPassword: string): Promise<User> {
    const user = await this.getUserById(userId);
    user.password = await bcrypt.hash(newPassword, this.saltRounds);
    const updated = await this.userRepo.save(user);

    this.logger.log(`Password reset for user: ${user.username} (ID: ${user.id})`);

    return this.hidePassword(updated);
  }

  /**
   * 隐藏用户密码
   */
  private hidePassword(user: User): any {
    const userCopy: any = { ...user };
    delete userCopy.password;
    return userCopy;
  }
}
