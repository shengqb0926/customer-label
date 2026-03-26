import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagRecommendation } from './entities/tag-recommendation.entity';
import { RecommendationRule } from './entities/recommendation-rule.entity';
import { ClusteringConfig } from './entities/clustering-config.entity';
import { CacheService } from '../../infrastructure/redis';
import { RuleEngineService, CustomerData } from './engines/rule-engine.service';
import { ClusteringEngineService, CustomerFeatureVector } from './engines/clustering-engine.service';
import { AssociationEngineService } from './engines/association-engine.service';
import { FusionEngineService, FusionWeights } from './engines/fusion-engine.service';
import { ConflictDetectorService } from './services/conflict-detector.service';

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
  weights?: Partial<FusionWeights>;
  detectConflicts?: boolean;
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
    private readonly ruleEngine: RuleEngineService,
    private readonly clusteringEngine: ClusteringEngineService,
    private readonly associationEngine: AssociationEngineService,
    private readonly fusionEngine: FusionEngineService,
    private readonly conflictDetector: ConflictDetectorService,
  ) {}

  /**
   * 为客户生成推荐（同步模式）
   */
  async generateForCustomer(
    customerId: number,
    options: RecommendOptions = {},
    customerData?: CustomerData
  ): Promise<TagRecommendation[]> {
    const { mode = 'all', useCache = true, weights, detectConflicts = true } = options;

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

    try {
      // 如果没有提供客户数据，使用模拟数据
      const data = customerData || this.generateMockCustomerData(customerId);
      
      // 根据不同模式调用不同引擎
      let allRecommendations: CreateRecommendationDto[] = [];

      if (mode === 'rule' || mode === 'all') {
        const ruleRecs = await this.ruleEngine.generateRecommendations(data);
        allRecommendations.push(...ruleRecs);
        this.logger.log(`Rule engine generated ${ruleRecs.length} recommendations`);
      }

      if (mode === 'clustering' || mode === 'all') {
        const featureVector = this.extractFeatures(data);
        const clusteringRecs = await this.clusteringEngine.generateRecommendations([featureVector]);
        allRecommendations.push(...clusteringRecs);
        this.logger.log(`Clustering engine generated ${clusteringRecs.length} recommendations`);
      }

      if (mode === 'association' || mode === 'all') {
        // TODO: 需要真实的客户标签数据
        const existingTags = []; // 从数据库获取客户已有标签
        const allCustomerTags = new Map<number, string[]>(); // 所有客户标签
        const associationRecs = await this.associationEngine.generateRecommendations(
          customerId,
          existingTags,
          allCustomerTags
        );
        allRecommendations.push(...associationRecs);
        this.logger.log(`Association engine generated ${associationRecs.length} recommendations`);
      }

      // 融合推荐结果
      const fusedRecommendations = await this.fusionEngine.fuseRecommendations(
        allRecommendations,
        weights
      );

      this.logger.log(`Fused to ${fusedRecommendations.length} final recommendations`);

      // 冲突检测和处理
      if (detectConflicts && fusedRecommendations.length > 0) {
        // 转换为实体对象以便检测冲突
        const recommendationEntities = fusedRecommendations.map(dto => 
          this.recommendationRepo.create({
            customerId: dto.customerId,
            tagName: dto.tagName,
            tagCategory: dto.tagCategory,
            confidence: dto.confidence,
            source: dto.source,
            reason: dto.reason,
          })
        );

        // 检测冲突
        const conflicts = await this.conflictDetector.detectCustomerConflicts(
          customerId,
          recommendationEntities
        );

        if (conflicts.length > 0) {
          this.logger.warn(`Detected ${conflicts.length} conflicts, resolving...`);
          
          // 解决冲突
          const resolved = await this.conflictDetector.resolveConflicts(
            conflicts,
            recommendationEntities
          );

          // 转换回 DTO
          const resolvedDtos: CreateRecommendationDto[] = resolved.map(entity => ({
            customerId: entity.customerId,
            tagName: entity.tagName,
            tagCategory: entity.tagCategory,
            confidence: entity.confidence,
            source: entity.source as any,
            reason: entity.reason,
          }));

          this.logger.log(`Conflict resolution completed. Final count: ${resolvedDtos.length}`);

          // 保存并返回结果
          if (resolvedDtos.length > 0) {
            const saved = await this.saveRecommendations(customerId, resolvedDtos);
            return saved;
          }
        }
      }

      // 保存并返回结果
      if (fusedRecommendations.length > 0) {
        const saved = await this.saveRecommendations(customerId, fusedRecommendations);
        return saved;
      }

      return [];
    } catch (error) {
      this.logger.error('Failed to generate recommendations:', error);
      return [];
    }
  }

  /**
   * 批量生成推荐
   */
  async batchGenerate(customerIds: number[]): Promise<number> {
    let successCount = 0;

    for (const customerId of customerIds) {
      try {
        await this.generateForCustomer(customerId, { mode: 'all', useCache: false });
        successCount++;
      } catch (error) {
        this.logger.error(`Failed to generate for customer ${customerId}:`, error);
      }
    }

    this.logger.log(`Batch generation completed: ${successCount}/${customerIds.length} successful`);
    return successCount;
  }

  /**
   * 生成模拟客户数据（用于测试）
   */
  private generateMockCustomerData(customerId: number): CustomerData {
    // 实际应该从数据库获取真实数据
    return {
      id: customerId,
      totalAssets: Math.random() * 1000000 + 50000,
      monthlyIncome: Math.random() * 50000 + 5000,
      annualSpend: Math.random() * 200000 + 10000,
      lastLoginDays: Math.floor(Math.random() * 60),
      registerDays: Math.floor(Math.random() * 1000) + 30,
      orderCount: Math.floor(Math.random() * 50) + 1,
      productCount: Math.floor(Math.random() * 10) + 1,
      riskLevel: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
      age: Math.floor(Math.random() * 40) + 20,
      gender: Math.random() > 0.5 ? 'M' : 'F',
      city: ['北京', '上海', '广州', '深圳', '杭州'][Math.floor(Math.random() * 5)],
      membershipLevel: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'][Math.floor(Math.random() * 4)],
    };
  }

  /**
   * 提取客户特征向量
   */
  private extractFeatures(customer: CustomerData): CustomerFeatureVector {
    return {
      customerId: customer.id,
      features: [
        customer.totalAssets || 0,
        customer.monthlyIncome || 0,
        customer.annualSpend || 0,
        customer.lastLoginDays || 0,
        customer.registerDays || 0,
        customer.orderCount || 0,
        customer.productCount || 0,
        customer.age || 30,
      ],
      featureNames: [
        '总资产',
        '月收入',
        '年消费',
        '距上次登录天数',
        '注册天数',
        '订单数',
        '持有产品数',
        '年龄',
      ],
    };
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

    const bySource: Record<string, number> = {};
    bySourceResult.forEach(row => {
      bySource[row.source as string] = parseInt(row.count);
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
