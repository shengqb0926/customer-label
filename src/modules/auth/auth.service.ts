import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

export interface UserPayload {
  id: number;
  username: string;
  email: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * 验证用户登录
   */
  async validateUser(username: string, password: string): Promise<UserPayload | null> {
    // TODO: 从数据库查询用户并验证密码
    // 这里暂时返回模拟数据
    
    if (username === 'admin' && password === 'admin123') {
      return {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin', 'user'],
      };
    }
    
    if (username === 'user' && password === 'user123') {
      return {
        id: 2,
        username: 'user',
        email: 'user@example.com',
        roles: ['user'],
      };
    }
    
    return null;
  }

  /**
   * 生成 JWT Token
   */
  async login(user: UserPayload) {
    const payload = { sub: user.id, username: user.username, roles: user.roles };
    
    return {
      access_token: this.jwtService.sign(payload),
      expires_in: 3600, // 1 hour
      token_type: 'Bearer',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
      },
    };
  }

  /**
   * 刷新 Token
   */
  async refreshToken(user: UserPayload) {
    return this.login(user);
  }

  /**
   * 验证 Token 是否有效
   */
  verifyToken(token: string): UserPayload | null {
    try {
      return this.jwtService.verify<UserPayload>(token);
    } catch (error) {
      return null;
    }
  }
}
