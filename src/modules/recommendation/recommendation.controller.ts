import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { TagRecommendation } from './entities/tag-recommendation.entity';

@Controller('recommendations')
export class RecommendationController {
  private readonly logger = new Logger(RecommendationController.name);

  constructor(
    private readonly service: RecommendationService
  ) {}

  /**
   * 获取客户的推荐列表
   */
  @Get('customer/:customerId')
  async getCustomerRecommendations(
    @Param('customerId') customerId: number
  ): Promise<TagRecommendation[]> {
    this.logger.log(`Getting recommendations for customer ${customerId}`);
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
        useCache: useCache !== 'false',
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
