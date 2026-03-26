import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { TagRecommendation } from './entities/tag-recommendation.entity';
import { GetRecommendationsDto, PaginatedResponse } from './dto/get-recommendations.dto';

@ApiTags('推荐管理')
@Controller('recommendations')
export class RecommendationController {
  private readonly logger = new Logger(RecommendationController.name);

  constructor(
    private readonly service: RecommendationService
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
}
