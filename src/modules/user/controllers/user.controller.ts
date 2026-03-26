import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  ParseBoolPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { UserService, CreateUserDto, UpdateUserDto, GetUsersDto } from '../services/user.service';
import { User, UserRole } from '../entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('用户管理')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '创建新用户（仅管理员）' })
  @ApiResponse({ status: 201, description: '返回创建的用户', type: User })
  @ApiResponse({ status: 403, description: '权限不足' })
  async createUser(@Body() dto: CreateUserDto): Promise<User> {
    return await this.service.createUser(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '获取用户列表（管理员和分析师）' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'username', required: false, type: String })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String, enum: UserRole })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ 
    status: 200, 
    description: '返回用户列表',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/schemas/User' } },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 20 },
      },
    },
  })
  async getUsers(@Query() query: GetUsersDto) {
    return await this.service.getUsers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取用户详情' })
  @ApiParam({ name: 'id', type: Number, description: '用户 ID' })
  @ApiResponse({ status: 200, description: '返回用户详情', type: User })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getUserById(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return await this.service.getUserById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '更新用户信息（管理员和分析师）' })
  @ApiParam({ name: 'id', type: Number, description: '用户 ID' })
  @ApiResponse({ status: 200, description: '返回更新后的用户', type: User })
  @ApiResponse({ status: 403, description: '权限不足' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return await this.service.updateUser(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除用户（仅管理员）' })
  @ApiParam({ name: 'id', type: Number, description: '用户 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async deleteUser(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.service.deleteUser(id);
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '激活用户（仅管理员）' })
  @ApiParam({ name: 'id', type: Number, description: '用户 ID' })
  @ApiResponse({ status: 200, description: '返回激活后的用户', type: User })
  async activateUser(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return await this.service.toggleUserStatus(id, true);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '停用用户（仅管理员）' })
  @ApiParam({ name: 'id', type: Number, description: '用户 ID' })
  @ApiResponse({ status: 200, description: '返回停用后的用户', type: User })
  async deactivateUser(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return await this.service.toggleUserStatus(id, false);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '重置密码（仅管理员）' })
  @ApiParam({ name: 'id', type: Number, description: '用户 ID' })
  @ApiResponse({ status: 200, description: '返回重置后的用户', type: User })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newPassword: string },
  ): Promise<User> {
    return await this.service.resetPassword(id, body.newPassword);
  }
}
