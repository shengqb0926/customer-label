import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * 用户登录
   */
  @Post('login')
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'admin' },
        password: { type: 'string', example: 'admin123' },
      },
      required: ['username', 'password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        expires_in: { type: 'number', example: 3600 },
        token_type: { type: 'string', example: 'Bearer' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            username: { type: 'string' },
            email: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  async login(@Request() req: any, @Body() body: any) {
    this.logger.log(`User ${req.user.username} logged in`);
    
    return await this.authService.login(req.user);
  }

  /**
   * 刷新 Token
   */
  @Post('refresh')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '刷新 Token' })
  @ApiResponse({ status: 200, description: '刷新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async refresh(@Request() req: any) {
    this.logger.log(`Refreshing token for user ${req.user.username}`);
    return await this.authService.refreshToken(req.user);
  }

  /**
   * 获取当前用户信息
   */
  @Post('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({
    status: 200,
    description: '返回当前用户信息',
  })
  async getCurrentUser(@Request() req: any) {
    return {
      user: req.user,
    };
  }
}
