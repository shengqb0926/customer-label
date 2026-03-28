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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { RuleEngineService } from '../engines/rule-engine.service';
import { CreateRuleDto } from '../dto/create-rule.dto';
import { UpdateRuleDto } from '../dto/update-rule.dto';
import { TestRuleDto } from '../dto/test-rule.dto';

@ApiTags('规则引擎')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('rules')
export class RuleEngineController {
  constructor(private readonly service: RuleEngineService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '获取规则列表' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, example: true })
  @ApiResponse({ status: 200, description: '返回规则列表' })
  async getRules(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('isActive') isActive?: boolean,
  ) {
    return await this.service.getRules({ page, limit, isActive });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '获取规则详情' })
  @ApiResponse({ status: 200, description: '返回规则详情' })
  @ApiResponse({ status: 404, description: '规则不存在' })
  async getRule(@Param('id', ParseIntPipe) id: number) {
    return await this.service.getRuleById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '创建规则' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '请求参数无效' })
  async createRule(@Body() dto: CreateRuleDto) {
    return await this.service.createRule(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '更新规则' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '规则不存在' })
  async updateRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRuleDto,
  ) {
    return await this.service.updateRule(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除规则' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '规则不存在' })
  async deleteRule(@Param('id', ParseIntPipe) id: number) {
    await this.service.deleteRule(id);
    return { message: '删除成功' };
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '激活规则' })
  @ApiResponse({ status: 200, description: '激活成功' })
  @ApiResponse({ status: 404, description: '规则不存在' })
  async activateRule(@Param('id', ParseIntPipe) id: number) {
    return await this.service.activateRule(id);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '停用规则' })
  @ApiResponse({ status: 200, description: '停用成功' })
  @ApiResponse({ status: 404, description: '规则不存在' })
  async deactivateRule(@Param('id', ParseIntPipe) id: number) {
    return await this.service.deactivateRule(id);
  }

  @Post('test')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '测试规则' })
  @ApiResponse({ status: 200, description: '测试结果' })
  async testRule(@Body() dto: TestRuleDto) {
    return await this.service.testRule(dto.ruleExpression, dto.customerData);
  }

  @Post('batch/import')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '批量导入规则' })
  @ApiResponse({ status: 200, description: '导入成功' })
  async importRules(@Body() rules: Partial<any>[]) {
    const count = await this.service.importRules(rules);
    return { message: `成功导入 ${count} 条规则` };
  }

  @Get('batch/export')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '批量导出规则' })
  @ApiResponse({ status: 200, description: '导出成功' })
  async exportRules() {
    return await this.service.exportRules();
  }
}
