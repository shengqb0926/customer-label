import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: any) {
    const user = await this.authService.verifyToken(
      // Token 已经由 passport 验证过，这里只需要返回用户信息
      { sub: payload.sub, username: payload.username, roles: payload.roles }
    );
    
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }
    
    return user;
  }
}
