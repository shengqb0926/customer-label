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
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RuleManagerService, GetRulesDto } from '../services/rule-manager.service';
import { RecommendationRule } from '../entities/recommendation-rule.entity';
import { CreateRuleDto, UpdateRuleDto } from '../dto/create-rule.dto';
import { PaginatedResponse } from '../dto/get-recommendations.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';

@ApiTags('规则管理')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('rules')
export class RuleManagerController {
  private readonly logger = new Logger(RuleManagerController.name);

  constructor(private readonly service: RuleManagerService) {}

  /**
   * 创建规则（仅管理员和分析师）
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '创建新规则' })
  @ApiResponse({ status: 201, description: '返回创建的规则', type: RecommendationRule })
  @ApiResponse({ status: 403, description: '权限不足' })
  async createRule(@Body() dto: CreateRuleDto): Promise<RecommendationRule> {
    this.logger.log(`Creating rule: ${dto.ruleName}`);
    return await this.service.createRule(dto);
  }

  /**
   * 获取规则列表（所有登录用户）
   */
  @Get()
  @ApiOperation({ summary: '获取规则列表（支持分页和过滤）' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量', example: 20 })
  @ApiQuery({ name: 'ruleName', required: false, type: String, description: '规则名称模糊搜索' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: '按激活状态过滤' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['priority', 'createdAt', 'updatedAt'], description: '排序字段' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: '排序方向' })
  @ApiResponse({ 
    status: 200, 
    description: '返回规则列表',
    type: PaginatedResponse,
  })
  async getRules(@Query() query: GetRulesDto): Promise<PaginatedResponse<RecommendationRule>> {
    return await this.service.getRules(query);
  }

  /**
   * 获取规则详情（所有登录用户）
   */
  @Get(':id')
  @ApiOperation({ summary: '获取规则详情' })
  @ApiParam({ name: 'id', type: Number, description: '规则 ID' })
  @ApiResponse({ status: 200, description: '返回规则详情', type: RecommendationRule })
  @ApiResponse({ status: 404, description: '规则不存在' })
  async getRuleById(@Param('id', ParseIntPipe) id: number): Promise<RecommendationRule> {
    return await this.service.getRuleById(id);
  }

  /**
   * 更新规则（仅管理员和分析师）
   */
  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '更新规则' })
  @ApiParam({ name: 'id', type: Number, description: '规则 ID' })
  @ApiResponse({ status: 200, description: '返回更新后的规则', type: RecommendationRule })
  @ApiResponse({ status: 403, description: '权限不足' })
  async updateRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRuleDto,
  ): Promise<RecommendationRule> {
    return await this.service.updateRule(id, dto);
  }

  /**
   * 删除规则（仅管理员）
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除规则' })
  @ApiParam({ name: 'id', type: Number, description: '规则 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async deleteRule(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.service.deleteRule(id);
  }

  /**
   * 激活规则（仅管理员和分析师）
   */
  @Post(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '激活规则' })
  @ApiParam({ name: 'id', type: Number, description: '规则 ID' })
  @ApiResponse({ status: 200, description: '返回激活后的规则', type: RecommendationRule })
  async activateRule(@Param('id', ParseIntPipe) id: number): Promise<RecommendationRule> {
    return await this.service.activateRule(id);
  }

  /**
   * 停用规则（仅管理员和分析师）
   */
  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '停用规则' })
  @ApiParam({ name: 'id', type: Number, description: '规则 ID' })
  @ApiResponse({ status: 200, description: '返回停用后的规则', type: RecommendationRule })
  async deactivateRule(@Param('id', ParseIntPipe) id: number): Promise<RecommendationRule> {
    return await this.service.deactivateRule(id);
  }

  /**
   * 测试规则表达式（所有登录用户）
   */
  @Post('test')
  @ApiOperation({ summary: '测试规则表达式' })
  @ApiResponse({ 
    status: 200, 
    description: '返回测试结果',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
        result: { type: 'boolean', example: true },
        error: { type: 'string' },
      },
    },
  })
  async testExpression(@Body() body: { expression: string; testData: Record<string, any> }) {
    return await this.service.testRuleExpression(body.expression, body.testData);
  }

  /**
   * 批量导入规则（仅管理员）
   */
  @Post('batch/import')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '批量导入规则' })
  @ApiResponse({ status: 201, description: '返回导入结果' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async batchImport(@Body() rules: CreateRuleDto[]) {
    return await this.service.batchImportRules(rules);
  }

  /**
   * 批量导出规则（所有登录用户）
   */
  @Get('batch/export')
  @ApiOperation({ summary: '批量导出规则' })
  @ApiResponse({ status: 200, description: '返回导出的规则列表' })
  async batchExport(): Promise<CreateRuleDto[]> {
    return await this.service.exportRules();
  }
}
