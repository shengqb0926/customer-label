import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-abc123xyz789',
    });
  }

  async validate(payload: any) {
    // Passport-JWT 已经验证了 token 的有效性
    // payload 包含：sub (用户 ID), username, roles, iat, exp
    return {
      id: payload.sub,
      username: payload.username,
      roles: payload.roles,
    };
  }
}
