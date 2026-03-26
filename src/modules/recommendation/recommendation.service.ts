import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagRecommendation } from './entities/tag-recommendation.entity';
import { RecommendationRule } from './entities/recommendation-rule.entity';
import { ClusteringConfig } from './entities/clustering-config.entity';
import { CacheService } from '../../infrastructure/redis';
import { RecommendationQueueHandler } from '../../infrastructure/queue/handlers';

export interface CreateRecommendationDto {
  customerId: number;
  tagName: string;
  tagCategory: string;
  confidence: number;
  source: 'rule' | 'clustering' | 'association';
  reason: string;
}

export interface RecommendOptions {
  mode?: 'rule' | 'clustering' | 'association' | 'all';
  useCache?: boolean;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @InjectRepository(TagRecommendation)
    private readonly recommendationRepo: Repository<TagRecommendation>,
    @InjectRepository(RecommendationRule)
    private readonly ruleRepo: Repository<RecommendationRule>,
    @InjectRepository(ClusteringConfig)
    private readonly configRepo: Repository<ClusteringConfig>,
    private readonly cache: CacheService,
    private readonly queue: RecommendationQueueHandler
  ) {}

  /**
   * 为客户生成推荐（同步模式）
   */
  async generateForCustomer(
    customerId: number,
    options: RecommendOptions = {}
  ): Promise<TagRecommendation[]> {
    const { mode = 'all', useCache = true } = options;

    // 尝试从缓存获取
    if (useCache) {
      const cached = await this.cache.get<TagRecommendation[]>(
        `recommendations:${customerId}`
      );
      if (cached) {
        this.logger.debug(`Cache hit for customer ${customerId}`);
        return cached;
      }
    }

    // 调用队列异步处理（推荐方式）
    const job = await this.queue.addRecommendationTask(customerId, undefined, mode);
    this.logger.log(`Queued recommendation job ${job.id} for customer ${customerId}`);

    // TODO: 等待作业完成并返回结果
    // 这里暂时返回空数组，实际应该等待队列处理完成
    return [];
  }

  /**
   * 批量生成推荐
   */
  async batchGenerate(customerIds: number[]): Promise<number> {
    return await this.queue.addBatchRecommendationTasks(customerIds, 'all');
  }

  /**
   * 保存推荐结果
   */
  async saveRecommendations(
    customerId: number,
    recommendations: CreateRecommendationDto[]
  ): Promise<TagRecommendation[]> {
    const entities = recommendations.map(rec => 
      this.recommendationRepo.create({
        customerId: rec.customerId,
        tagName: rec.tagName,
        tagCategory: rec.tagCategory,
        confidence: rec.confidence,
        source: rec.source,
        reason: rec.reason,
        scoreOverall: rec.confidence * 100,
      })
    );

    const saved = await this.recommendationRepo.save(entities);
    
    // 更新缓存
    await this.cache.set(`recommendations:${customerId}`, saved, 3600);
    
    this.logger.log(`Saved ${saved.length} recommendations for customer ${customerId}`);
    return saved;
  }

  /**
   * 查询客户的推荐列表
   */
  async findByCustomer(customerId: number): Promise<TagRecommendation[]> {
    return await this.recommendationRepo.find({
      where: { customerId },
      order: { confidence: 'DESC', createdAt: 'DESC' },
      take: 20,
    });
  }

  /**
   * 获取推荐的统计信息
   */
  async getStats(): Promise<{
    total: number;
    bySource: Record<string, number>;
    avgConfidence: number;
  }> {
    const [total, bySourceResult] = await Promise.all([
      this.recommendationRepo.count(),
      this.recommendationRepo
        .createQueryBuilder('rec')
        .select('rec.source', 'source')
        .addSelect('COUNT(*)', 'count')
        .groupBy('rec.source')
        .getRawMany(),
    ]);

    const bySource = {};
    bySourceResult.forEach(row => {
      bySource[row.source] = parseInt(row.count);
    });

    const avgResult = await this.recommendationRepo
      .createQueryBuilder('rec')
      .select('AVG(rec.confidence)', 'avg')
      .getRawOne();

    return {
      total,
      bySource,
      avgConfidence: parseFloat(avgResult.avg) || 0,
    };
  }

  /**
   * 获取活跃的规则列表
   */
  async getActiveRules(): Promise<RecommendationRule[]> {
    return await this.ruleRepo.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
  }

  /**
   * 获取聚类配置
   */
  async getClusteringConfigs(): Promise<ClusteringConfig[]> {
    return await this.configRepo.find({
      where: { isActive: true },
    });
  }

  /**
   * 清除客户推荐缓存
   */
  async invalidateCache(customerId: number): Promise<void> {
    await this.cache.delete(`recommendations:${customerId}`);
    this.logger.debug(`Invalidated cache for customer ${customerId}`);
  }
}
