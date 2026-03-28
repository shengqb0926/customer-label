import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { TagRecommendation } from './entities/tag-recommendation.entity';
import { GetRecommendationsDto, PaginatedResponse } from './dto/get-recommendations.dto';
import { RecommendationSeedService } from './services/recommendation-seed.service';

@ApiTags('推荐管理')
@Controller('recommendations')
export class RecommendationController {
  private readonly logger = new Logger(RecommendationController.name);

  constructor(
    private readonly service: RecommendationService,
    private readonly seedService: RecommendationSeedService
  ) {}

  /**
   * 获取客户的推荐列表（支持分页和过滤）
   */
  @Get('customer/:customerId')
  @ApiOperation({ summary: '获取客户推荐列表', description: '支持分页、过滤和排序' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码（从 1 开始）', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量 (1-100)', example: 20 })
  @ApiQuery({ name: 'category', required: false, type: String, description: '按标签类别过滤', example: '客户价值' })
  @ApiQuery({ name: 'source', required: false, enum: ['rule', 'clustering', 'association', 'fusion'], description: '按推荐来源过滤' })
  @ApiQuery({ name: 'minConfidence', required: false, type: Number, description: '最低置信度 (0-1)', example: 0.7 })
  @ApiQuery({ name: 'isAccepted', required: false, type: Boolean, description: '是否已接受（筛选状态）', example: true })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: '开始日期（ISO 格式）', example: '2026-03-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: '结束日期（ISO 格式）', example: '2026-03-31' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['confidence', 'createdAt'], description: '排序字段', example: 'confidence' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: '排序方向', example: 'desc' })
  @ApiResponse({ 
    status: 200, 
    description: '返回分页的推荐列表',
    type: PaginatedResponse,
  })
  async getCustomerRecommendations(
    @Param('customerId') customerId: number,
    @Query() query: GetRecommendationsDto
  ): Promise<PaginatedResponse<TagRecommendation>> {
    this.logger.log(`Getting paginated recommendations for customer ${customerId}`);
    return await this.service.findByCustomerWithPagination(customerId, query);
  }

  /**
   * 获取所有客户的推荐列表（支持分页和过滤）
   */
  @Get()
  @ApiOperation({ summary: '获取全局推荐列表', description: '支持分页、过滤和排序，用于推荐结果管理' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码（从 1 开始）', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量 (1-100)', example: 20 })
  @ApiQuery({ name: 'category', required: false, type: String, description: '按标签类别过滤', example: '客户价值' })
  @ApiQuery({ name: 'customerName', required: false, type: String, description: '按客户名称模糊查询', example: '张三' })
  @ApiQuery({ name: 'source', required: false, enum: ['rule', 'clustering', 'association', 'fusion'], description: '按推荐来源过滤' })
  @ApiQuery({ name: 'minConfidence', required: false, type: Number, description: '最低置信度 (0-1)', example: 0.7 })
  @ApiQuery({ name: 'isAccepted', required: false, type: Boolean, description: '是否已接受（筛选状态）', example: true })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: '开始日期（ISO 格式）', example: '2026-03-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: '结束日期（ISO 格式）', example: '2026-03-31' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['confidence', 'createdAt'], description: '排序字段', example: 'confidence' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: '排序方向', example: 'desc' })
  @ApiResponse({ 
    status: 200, 
    description: '返回分页的推荐列表',
    type: PaginatedResponse,
  })
  async getAllRecommendations(
    @Query() query: GetRecommendationsDto
  ): Promise<PaginatedResponse<TagRecommendation>> {
    this.logger.log(`Getting global recommendations`);
    return await this.service.findAllWithPagination(query);
  }

  /**
   * 获取客户的推荐列表（旧版，向后兼容）
   */
  @Get('customer/:customerId/simple')
  @ApiOperation({ summary: '获取客户推荐列表（简化版）', deprecated: true })
  @ApiResponse({ status: 200, description: '返回推荐列表（最多 20 条）', type: [TagRecommendation] })
  async getSimpleRecommendations(
    @Param('customerId') customerId: number
  ): Promise<TagRecommendation[]> {
    this.logger.log(`Getting simple recommendations for customer ${customerId}`);
    return await this.service.findByCustomer(customerId);
  }

  /**
   * 为客户生成推荐（异步）
   */
  @Post('generate/:customerId')
  async generateRecommendations(
    @Param('customerId') customerId: number,
    @Query('mode') mode?: 'rule' | 'clustering' | 'association' | 'all',
    @Query('useCache') useCache?: boolean
  ): Promise<{ jobId?: string; status: string; message: string }> {
    this.logger.log(`Generating recommendations for customer ${customerId}`);
    
    try {
      // 使用队列异步处理
      const job = await this.service.generateForCustomer(customerId, {
        mode: mode || 'all',
        useCache: (useCache as any) !== 'false',
      });

      return {
        status: 'queued',
        message: '推荐计算任务已加入队列，稍后查看结果',
      };
    } catch (error) {
      this.logger.error('Failed to generate recommendations:', error);
      throw error;
    }
  }

  /**
   * 批量生成推荐
   */
  @Post('batch-generate')
  async batchGenerate(
    @Body() body: { customerIds: number[] }
  ): Promise<{ total: number; queued: number; message: string }> {
    const { customerIds } = body;
    
    if (!customerIds || customerIds.length === 0) {
      throw new Error('customerIds is required');
    }

    const queued = await this.service.batchGenerate(customerIds);
    
    return {
      total: customerIds.length,
      queued,
      message: `成功添加 ${queued} 个推荐计算任务`,
    };
  }

  /**
   * 获取推荐统计信息
   */
  @Get('stats')
  async getStats(): Promise<{
    total: number;
    bySource: Record<string, number>;
    avgConfidence: number;
  }> {
    return await this.service.getStats();
  }

  /**
   * 获取活跃规则列表
   */
  @Get('rules/active')
  async getActiveRules() {
    return await this.service.getActiveRules();
  }

  /**
   * 获取聚类配置列表
   */
  @Get('configs/clustering')
  async getClusteringConfigs() {
    return await this.service.getClusteringConfigs();
  }

  /**
   * 接受推荐
   */
  @Post(':id/accept')
  @ApiOperation({ summary: '接受推荐', description: '接受某个标签推荐，可附带反馈原因' })
  @ApiParam({ name: 'id', description: '推荐 ID', type: Number })
  @ApiBody({
    description: '接受推荐的附加信息（可选）',
    required: false,
    schema: {
      type: 'object',
      properties: {
        modifiedTagName: {
          type: 'string',
          description: '修改后的标签名称',
          example: '高价值客户',
        },
        feedbackReason: {
          type: 'string',
          description: '反馈原因',
          example: '推荐准确，符合客户实际情况',
        },
      },
    },
  })
  async acceptRecommendation(
    @Param('id') id: number,
    @Body() body?: { modifiedTagName?: string; feedbackReason?: string }
  ): Promise<TagRecommendation> {
    // TODO: 从认证上下文获取真实用户 ID
    const userId = 1; // 临时使用固定值
    return await this.service.acceptRecommendation(
      id,
      userId,
      body?.modifiedTagName,
      body?.feedbackReason
    );
  }

  /**
   * 拒绝推荐
   */
  @Post(':id/reject')
  @ApiOperation({ summary: '拒绝推荐', description: '拒绝某个标签推荐，可附带反馈原因' })
  @ApiParam({ name: 'id', description: '推荐 ID', type: Number })
  @ApiBody({
    description: '拒绝推荐的原因（可选）',
    required: false,
    schema: {
      type: 'object',
      properties: {
        feedbackReason: {
          type: 'string',
          description: '拒绝原因',
          example: '推荐不准确，客户不符合该特征',
        },
      },
    },
  })
  async rejectRecommendation(
    @Param('id') id: number,
    @Body() body?: { feedbackReason?: string }
  ): Promise<TagRecommendation> {
    // TODO: 从认证上下文获取真实用户 ID
    const userId = 1; // 临时使用固定值
    return await this.service.rejectRecommendation(id, userId, body?.feedbackReason);
  }

  /**
   * 批量接受推荐
   */
  @Post('batch-accept')
  @ApiOperation({ summary: '批量接受推荐', description: '批量接受多个推荐' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'integer' },
          description: '推荐 ID 列表',
          example: [1, 2, 3],
        },
      },
      required: ['ids'],
    },
  })
  async batchAcceptRecommendations(
    @Body() body: { ids: number[] }
  ): Promise<{ success: number; total: number }> {
    const userId = 1; // TODO: 从认证上下文获取
    const successCount = await this.service.batchAcceptRecommendations(body.ids, userId);
    return {
      success: successCount,
      total: body.ids.length,
    };
  }

  /**
   * 批量拒绝推荐
   */
  @Post('batch-reject')
  @ApiOperation({ summary: '批量拒绝推荐', description: '批量拒绝多个推荐' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'integer' },
          description: '推荐 ID 列表',
          example: [1, 2, 3],
        },
      },
      required: ['ids'],
    },
  })
  async batchRejectRecommendations(
    @Body() body: { ids: number[] }
  ): Promise<{ success: number; total: number }> {
    const userId = 1; // TODO: 从认证上下文获取
    const successCount = await this.service.batchRejectRecommendations(body.ids, userId);
    return {
      success: successCount,
      total: body.ids.length,
    };
  }

  /**
   * 生成测试数据
   */
  @Post('generate-test-data')
  @ApiOperation({ summary: '生成测试数据', description: '生成指定数量的模拟推荐数据用于测试' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'integer',
          description: '生成数据的数量',
          default: 20,
          minimum: 1,
          maximum: 1000,
        },
      },
    },
  })
  async generateTestData(
    @Body() body?: { count?: number }
  ): Promise<{ success: boolean; count: number; message: string }> {
    const count = body?.count || 20;
    try {
      const result = await this.seedService.generateTestData(count);
      return {
        success: true,
        count: result.length,
        message: `成功生成 ${result.length} 条测试推荐数据`,
      };
    } catch (error) {
      this.logger.error('Failed to generate test data:', error);
      return {
        success: false,
        count: 0,
        message: '生成测试数据失败',
      };
    }
  }

  /**
   * 清空测试数据
   */
  @Post('clear-test-data')
  @ApiOperation({ summary: '清空测试数据', description: '清空所有测试数据，谨慎操作！' })
  async clearTestData(): Promise<{ success: boolean; message: string }> {
    try {
      await this.seedService.clearTestData();
      return {
        success: true,
        message: '已清空所有测试数据',
      };
    } catch (error) {
      this.logger.error('Failed to clear test data:', error);
      return {
        success: false,
        message: '清空测试数据失败',
      };
    }
  }
}
