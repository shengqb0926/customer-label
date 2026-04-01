import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/services/user.service';
import { User, UserRole } from '../user/entities/user.entity';

export interface UserPayload {
  id: number;
  username: string;
  email: string;
  roles: UserRole[];
  sub?: number; // JWT standard field
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  /**
   * 验证用户登录
   */
  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userService.validateUser(username, password);
    
    if (!user) {
      return null;
    }

    return user;
  }

  /**
   * 用户登录
   */
  async login(user: User) {
    const payload = { 
      sub: user.id, 
      username: user.username, 
      roles: user.roles,
      email: user.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
      expires_in: 3600, // 1 hour
      token_type: 'Bearer',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
      },
    };
  }

  /**
   * 刷新 Token
   */
  async refreshToken(user: User) {
    return this.login(user);
  }

  /**
   * 验证 Token 并获取用户信息
   */
  async validateToken(token: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify<UserPayload>(token);
      const user = await this.userService.getUserById(payload.sub as number);
      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * 修改密码
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<User> {
    return await this.userService.changePassword(userId, oldPassword, newPassword);
  }

  /**
   * 用户注册
   */
  async register(username: string, email: string, password: string, fullName?: string) {
    const dto = {
      username,
      email,
      password,
      fullName,
      roles: [UserRole.USER], // 默认角色
    };
    
    return await this.userService.createUser(dto);
  }
}
