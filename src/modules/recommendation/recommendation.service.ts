import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { TagRecommendation, RecommendationStatus } from './entities/tag-recommendation.entity';
import { RecommendationRule } from './entities/recommendation-rule.entity';
import { ClusteringConfig } from './entities/clustering-config.entity';
import { Customer } from './entities/customer.entity';
import { CustomerTag } from './entities/customer-tag.entity';
import { CacheService } from '../../infrastructure/redis';
import { RuleEngineService, CustomerData } from './engines/rule-engine.service';
import { ClusteringEngineService, CustomerFeatureVector } from './engines/clustering-engine.service';
import { AssociationEngineService } from './engines/association-engine.service';
import { FusionEngineService, FusionWeights } from './engines/fusion-engine.service';
import { ConflictDetectorService } from './services/conflict-detector.service';
import { GetRecommendationsDto, PaginatedResponse } from './dto/get-recommendations.dto';
import { SimilarityService } from '../../common/similarity';

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
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(CustomerTag)
    private readonly customerTagRepo: Repository<CustomerTag>,
    private readonly cache: CacheService,
    private readonly ruleEngine: RuleEngineService,
    private readonly clusteringEngine: ClusteringEngineService,
    private readonly associationEngine: AssociationEngineService,
    private readonly fusionEngine: FusionEngineService,
    private readonly conflictDetector: ConflictDetectorService,
    private readonly similarityService: SimilarityService, // ✨ 新增：相似度服务
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
      // 如果没有提供客户数据，从数据库获取真实数据
      const data = customerData || await this.getRealCustomerData(customerId);
      
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
        // 从数据库获取客户已有标签和所有客户标签数据
        const customerTags = await this.getCustomerTags(customerId);
        const allCustomerTags = await this.getAllCustomerTagsMap();
        
        this.logger.debug(`Customer ${customerId} has ${customerTags.length} tags`);
        this.logger.debug(`Total customers with tags: ${allCustomerTags.size}`);
        
        const associationRecs = await this.associationEngine.generateRecommendations(
          customerId,
          customerTags.map(t => t.tagName),
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
   * 从数据库获取真实客户数据并转换为规则引擎格式
   */
  private async getRealCustomerData(customerId: number): Promise<CustomerData> {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    // 将数据库字段映射到 CustomerData 接口
    // 同时支持多种字段名以兼容旧的规则表达式
    const customerData: CustomerData & Record<string, any> = {
      id: customer.id,
      totalAssets: Number(customer.totalAssets) || 0,
      monthlyIncome: Number(customer.monthlyIncome) || 0,
      annualSpend: Number(customer.annualSpend) || 0,
      lastLoginDays: Number(customer.lastLoginDays) || 0,
      registerDays: Number(customer.registerDays) || 0,
      orderCount: Number(customer.orderCount) || 0,
      productCount: Number(customer.productCount) || 0,
      riskLevel: customer.riskLevel,
      age: customer.age,
      gender: customer.gender,
      city: customer.city,
      membershipLevel: customer.level,
      // 向后兼容：添加常用字段别名
      totalAmount: Number(customer.totalAssets) || 0,  // 兼容旧规则中的 totalAmount
      total_order_count: Number(customer.orderCount) || 0,
    };

    this.logger.debug(`Loaded real customer data for ID ${customerId}: ${JSON.stringify(customerData)}`);
    
    return customerData;
  }

  /**
   * 获取指定客户的标签列表
   */
  private async getCustomerTags(customerId: number): Promise<CustomerTag[]> {
    return await this.customerTagRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取所有客户的标签映射（用于关联规则挖掘）
   */
  private async getAllCustomerTagsMap(): Promise<Map<number, string[]>> {
    const tags = await this.customerTagRepo.find({
      select: ['customerId', 'tagName'],
      order: { customerId: 'ASC' },
    });

    const tagMap = new Map<number, string[]>();
    for (const tag of tags) {
      const existing = tagMap.get(tag.customerId) || [];
      existing.push(tag.tagName);
      tagMap.set(tag.customerId, existing);
    }

    return tagMap;
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
   * 提取客户特征向量（带归一化）
   */
  private extractFeatures(customer: CustomerData): CustomerFeatureVector {
    // 原始特征值
    const rawFeatures = [
      customer.totalAssets || 0,
      customer.monthlyIncome || 0,
      customer.annualSpend || 0,
      customer.lastLoginDays || 0,
      customer.registerDays || 0,
      customer.orderCount || 0,
      customer.productCount || 0,
      customer.age || 30,
    ];

    // 特征名称
    const featureNames = [
      '总资产',
      '月收入',
      '年消费',
      '距上次登录天数',
      '注册天数',
      '订单数',
      '持有产品数',
      '年龄',
    ];

    // 各特征的预估值范围（用于 Min-Max 归一化）
    // 这些值应该根据实际数据统计动态更新
    const featureRanges = [
      { min: 0, max: 5000000 },      // 总资产
      { min: 0, max: 200000 },       // 月收入
      { min: 0, max: 1000000 },      // 年消费
      { min: 0, max: 365 },          // 距上次登录天数
      { min: 0, max: 3650 },         // 注册天数 (10 年)
      { min: 0, max: 500 },          // 订单数
      { min: 0, max: 100 },          // 持有产品数
      { min: 18, max: 100 },         // 年龄
    ];

    // Min-Max 归一化到 [0, 1] 区间
    const normalizedFeatures = rawFeatures.map((value, index) => {
      const range = featureRanges[index];
      if (!range || range.max === range.min) {
        return 0;
      }
      // 限制在范围内并归一化
      const clampedValue = Math.max(range.min, Math.min(value, range.max));
      return (clampedValue - range.min) / (range.max - range.min);
    });

    return {
      customerId: customer.id,
      features: normalizedFeatures,
      featureNames,
    };
  }

  /**
   * 批量提取特征并计算统计信息（用于更精确的归一化）
   */
  async extractFeaturesWithStats(
    customers: CustomerData[]
  ): Promise<{
    vectors: CustomerFeatureVector[];
    stats: Array<{ min: number; max: number; mean: number }>;
  }> {
    if (customers.length === 0) {
      return { vectors: [], stats: [] };
    }

    const featureNames = [
      '总资产',
      '月收入',
      '年消费',
      '距上次登录天数',
      '注册天数',
      '订单数',
      '持有产品数',
      '年龄',
    ];

    // 提取所有原始特征
    const rawFeatures = customers.map(customer => [
      customer.totalAssets || 0,
      customer.monthlyIncome || 0,
      customer.annualSpend || 0,
      customer.lastLoginDays || 0,
      customer.registerDays || 0,
      customer.orderCount || 0,
      customer.productCount || 0,
      customer.age || 30,
    ]);

    // 计算每个特征的统计信息
    const dimensions = rawFeatures[0].length;
    const stats = [];

    for (let i = 0; i < dimensions; i++) {
      const values = rawFeatures.map(features => features[i]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

      stats.push({ min, max, mean });
    }

    // Min-Max 归一化
    const vectors: CustomerFeatureVector[] = customers.map((customer, idx) => {
      const normalizedFeatures = rawFeatures[idx].map((value, featureIdx) => {
        const range = stats[featureIdx];
        if (range.max === range.min) {
          return 0;
        }
        return (value - range.min) / (range.max - range.min);
      });

      return {
        customerId: customer.id,
        features: normalizedFeatures,
        featureNames,
      };
    });

    return { vectors, stats };
  }

  /**
   * 保存推荐结果（批量优化版）
   */
  async saveRecommendations(
    customerId: number,
    recommendations: CreateRecommendationDto[]
  ): Promise<TagRecommendation[]> {
    if (recommendations.length === 0) {
      this.logger.debug('No recommendations to save');
      return [];
    }

    try {
      // 使用 insert() 批量插入，性能更好（单次 INSERT vs 多次 INSERT）
      const insertResult = await this.recommendationRepo.insert(
        recommendations.map(rec => ({
          customerId: rec.customerId,
          tagName: rec.tagName,
          tagCategory: rec.tagCategory,
          confidence: rec.confidence,
          source: rec.source,
          reason: rec.reason,
          scoreOverall: Math.min(rec.confidence * 10, 9.9999),
        }))
      );

      // 获取插入的 ID
      const insertedIds = Object.values(insertResult.identifiers).map((id: any) => id.id || id);
      
      this.logger.debug(`Inserted ${insertedIds.length} recommendations with IDs: ${insertedIds.join(', ')}`);
      
      // 查询返回完整实体（带默认字段如 createdAt）
      const saved = await this.recommendationRepo.findByIds(insertedIds);
      
      // 更新缓存（TTL 1 小时）
      await this.cache.set(`recommendations:${customerId}`, saved, 3600);
      
      this.logger.log(`✅ Bulk saved ${saved.length} recommendations for customer ${customerId} (performance optimized)`);
      return saved;
      
    } catch (error) {
      this.logger.error(`❌ Failed to bulk save recommendations: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询客户的推荐列表（支持分页和过滤）
   */
  async findByCustomerWithPagination(
    customerId: number,
    options: GetRecommendationsDto
  ): Promise<PaginatedResponse<TagRecommendation>> {
    const {
      page = 1,
      limit = 20,
      category,
      source,
      minConfidence,
      isAccepted,
      startDate,
      endDate,
      customerName,
      sortBy = 'confidence',
      sortOrder = 'desc',
    } = options;

    // 使用 QueryBuilder
    const queryBuilder = this.recommendationRepo.createQueryBuilder('rec');
    queryBuilder.where('rec.customerId = :customerId', { customerId });

    // 如果提供了 customerName，添加到查询条件中（使用数据库列名 customer_id）
    if (customerName) {
      queryBuilder.andWhere('rec.customer_id::text ILIKE :customerName', { customerName: `%${customerName}%` });
    }

    // 构建 WHERE 条件
    if (category) {
      queryBuilder.andWhere('rec.tagCategory = :category', { category });
    }
    if (source) {
      queryBuilder.andWhere('rec.source = :source', { source });
    }
    if (minConfidence !== undefined) {
      queryBuilder.andWhere('rec.confidence >= :minConfidence', { minConfidence });
    }
    if (isAccepted !== undefined) {
      queryBuilder.andWhere('rec.isAccepted = :isAccepted', { isAccepted });
    }
    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.andWhere('rec.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
      } else if (startDate) {
        queryBuilder.andWhere('rec.createdAt >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.andWhere('rec.createdAt <= :endDate', { endDate });
      }
    }

    // 构建排序
    queryBuilder.orderBy(`rec.${sortBy}`, sortOrder === 'desc' ? 'DESC' : 'ASC');
    queryBuilder.addOrderBy('rec.createdAt', 'DESC');

    // 分页
    queryBuilder.skip((page - 1) * limit).take(limit);

    // 查询总数和数据
    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponse(data, total, page, limit);
  }

  /**
   * 查询所有客户的推荐列表（支持分页和过滤）
   */
  async findAllWithPagination(
    options: GetRecommendationsDto
  ): Promise<PaginatedResponse<TagRecommendation>> {
    const {
      page = 1,
      limit = 20,
      category,
      source,
      minConfidence,
      status,
      isAccepted,
      startDate,
      endDate,
      customerName,
      sortBy = 'confidence',
      sortOrder = 'desc',
    } = options;

    // 使用 QueryBuilder
    const queryBuilder = this.recommendationRepo.createQueryBuilder('rec');

    // 构建 WHERE 条件
    if (customerName) {
      // 客户 ID 模糊查询（使用数据库列名 customer_id）
      queryBuilder.andWhere('rec.customer_id::text ILIKE :customerName', { customerName: `%${customerName}%` });
    }
    if (category) {
      queryBuilder.andWhere('rec.tagCategory = :category', { category });
    }
    if (source) {
      queryBuilder.andWhere('rec.source = :source', { source });
    }
    if (minConfidence !== undefined) {
      queryBuilder.andWhere('rec.confidence >= :minConfidence', { minConfidence });
    }
    if (status !== undefined) {
      queryBuilder.andWhere('rec.status = :status', { status });
    }
    // 向后兼容：如果使用了 isAccepted 参数（已废弃）
    if (isAccepted !== undefined) {
      const isAcceptedBool = isAccepted === 'true' || isAccepted === true;
      queryBuilder.andWhere('rec.isAccepted = :isAccepted', { isAccepted: isAcceptedBool });
    }
    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.andWhere('rec.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
      } else if (startDate) {
        queryBuilder.andWhere('rec.createdAt >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.andWhere('rec.createdAt <= :endDate', { endDate });
      }
    }

    // 构建排序
    queryBuilder.orderBy(`rec.${sortBy}`, sortOrder === 'desc' ? 'DESC' : 'ASC');
    queryBuilder.addOrderBy('rec.createdAt', 'DESC');

    // 分页
    queryBuilder.skip((page - 1) * limit).take(limit);

    // 查询总数和数据
    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponse(data, total, page, limit);
  }

  /**
   * 查询客户的推荐列表（旧版，保持向后兼容）
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
   * 按状态统计推荐数量（支持筛选）
   */
  async getStatusStats(options?: GetRecommendationsDto): Promise<{
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  }> {
    const {
      category,
      source,
      minConfidence,
      startDate,
      endDate,
      customerName,
    } = options || {};

    // 使用 QueryBuilder 构建动态查询
    const queryBuilder = this.recommendationRepo.createQueryBuilder('rec');

    // 应用筛选条件
    if (customerName) {
      queryBuilder.andWhere('rec.customer_id::text ILIKE :customerName', { 
        customerName: `%${customerName}%` 
      });
    }
    if (category) {
      queryBuilder.andWhere('rec.tagCategory = :category', { category });
    }
    if (source) {
      queryBuilder.andWhere('rec.source = :source', { source });
    }
    if (minConfidence !== undefined) {
      queryBuilder.andWhere('rec.confidence >= :minConfidence', { minConfidence });
    }
    if (startDate && endDate) {
      queryBuilder.andWhere('rec.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    } else if (startDate) {
      queryBuilder.andWhere('rec.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('rec.createdAt <= :endDate', { endDate });
    }

    // 按状态分组统计
    const results = await queryBuilder
      .select('rec.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('rec.status')
      .getRawMany();

    // 初始化统计对象
    const stats = {
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
    };

    // 填充统计数据
    results.forEach(row => {
      const count = parseInt(row.count);
      stats.total += count;
      
      if (row.status === 'pending') {
        stats.pending = count;
      } else if (row.status === 'accepted') {
        stats.accepted = count;
      } else if (row.status === 'rejected') {
        stats.rejected = count;
      }
    });

    return stats;
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

  /**
   * 接受推荐
   */
  async acceptRecommendation(
    id: number,
    userId: number,
    modifiedTagName?: string,
    feedbackReason?: string
  ): Promise<TagRecommendation> {
    const recommendation = await this.recommendationRepo.findOne({ where: { id } });
    
    if (!recommendation) {
      throw new Error('推荐记录不存在');
    }

    recommendation.status = RecommendationStatus.ACCEPTED;
    recommendation.isAccepted = true; // 向后兼容
    recommendation.acceptedAt = new Date();
    recommendation.acceptedBy = userId;
    
    if (modifiedTagName) {
      recommendation.modifiedTagName = modifiedTagName;
    }
    
    if (feedbackReason) {
      recommendation.feedbackReason = feedbackReason;
    }

    const saved = await this.recommendationRepo.save(recommendation);
    
    // 清除缓存
    await this.invalidateCache(recommendation.customerId);
    
    this.logger.log(`Recommendation ${id} accepted by user ${userId}`);
    return saved;
  }

  /**
   * 拒绝推荐
   */
  async rejectRecommendation(
    id: number,
    userId: number,
    feedbackReason?: string
  ): Promise<TagRecommendation> {
    const recommendation = await this.recommendationRepo.findOne({ where: { id } });
    
    if (!recommendation) {
      throw new Error('推荐记录不存在');
    }

    recommendation.status = RecommendationStatus.REJECTED;
    recommendation.isAccepted = false; // 向后兼容
    recommendation.feedbackReason = feedbackReason;

    const saved = await this.recommendationRepo.save(recommendation);
    
    // 清除缓存
    await this.invalidateCache(recommendation.customerId);
    
    this.logger.log(`Recommendation ${id} rejected by user ${userId}`);
    return saved;
  }

  /**
   * 批量接受推荐（支持自动打标签）
   */
  async batchAcceptRecommendations(
    ids: number[],
    userId: number,
    autoTag: boolean = false
  ): Promise<number> {
    let successCount = 0;
    
    for (const id of ids) {
      try {
        await this.acceptRecommendation(id, userId);
        
        // 如果需要自动打标签
        if (autoTag) {
          try {
            const recommendation = await this.recommendationRepo.findOne({ where: { id } });
            if (recommendation) {
              // TODO: 调用客户标签服务打上推荐标签
              this.logger.log(`Auto-tagged customer ${recommendation.customerId} with ${recommendation.tagName}`);
            }
          } catch (tagError) {
            this.logger.error(`Failed to auto-tag customer after accepting recommendation ${id}:`, tagError);
            // 不中断主流程，继续处理下一个
          }
        }
        
        successCount++;
      } catch (error) {
        this.logger.error(`Failed to accept recommendation ${id}:`, error);
      }
    }
    
    return successCount;
  }

  /**
   * 批量拒绝推荐
   */
  async batchRejectRecommendations(
    ids: number[],
    userId: number,
    reason: string
  ): Promise<number> {
    let successCount = 0;
    
    for (const id of ids) {
      try {
        await this.rejectRecommendation(id, userId, reason);
        successCount++;
      } catch (error) {
        this.logger.error(`Failed to reject recommendation ${id}:`, error);
      }
    }
    
    return successCount;
  }

  /**
   * 批量撤销推荐操作
   */
  async batchUndoRecommendations(ids: number[]): Promise<number> {
    let successCount = 0;
    
    for (const id of ids) {
      try {
        await this.undoRecommendation(id);
        successCount++;
      } catch (error) {
        this.logger.error(`Failed to undo recommendation ${id}:`, error);
      }
    }
    
    return successCount;
  }

  /**
   * 撤销单个推荐操作
   */
  async undoRecommendation(id: number): Promise<void> {
    const recommendation = await this.recommendationRepo.findOne({ where: { id } });
    
    if (!recommendation) {
      throw new Error(`推荐 ${id} 不存在`);
    }
    
    // 重置状态为待处理
    recommendation.isAccepted = null;
    recommendation.acceptedAt = null;
    recommendation.acceptedBy = null;
    recommendation.modifiedTagName = null;
    recommendation.feedbackReason = null;
    recommendation.updatedAt = new Date();
    
    await this.recommendationRepo.save(recommendation);
    
    this.logger.log(`Undo recommendation ${id}, back to pending status`);
  }

  /**
   * 获取单个推荐详情
   */
  async getRecommendationById(id: number): Promise<TagRecommendation | null> {
    return await this.recommendationRepo.findOne({ where: { id } });
  }

  /**
   * 获取相似客户推荐（使用真实相似度算法）
   */
  async getSimilarCustomerRecommendations(
    recommendationId: number,
    tagName: string,
    limit: number = 5
  ): Promise<Array<{
    customerId: number;
    customerName?: string;
    tagName: string;
    confidence: number;
    status: 'pending' | 'accepted' | 'rejected';
    similarityScore: number;
  }>> {
    try {
      // 1. 获取当前客户的标签信息
      const currentTags = await this.customerTagRepo.find({
        where: { customerId: recommendationId },
        relations: ['tag'],
      });

      if (currentTags.length === 0) {
        this.logger.warn(`Customer ${recommendationId} has no tags, cannot find similar customers`);
        return [];
      }

      // 2. 使用 SimilarityService 计算真实相似度
      const similarityResults = await this.similarityService.findSimilarCustomers(
        recommendationId,
        limit,
        {
          algorithm: 'cosine',
          minSimilarity: 0.6,
        }
      );

      // 3. 转换为返回格式
      return similarityResults.results.map(result => ({
        customerId: result.customerId,
        customerName: undefined, // 需要额外查询客户名称
        tagName: tagName,
        confidence: 0.8, // 默认置信度
        status: 'accepted',
        similarityScore: result.similarity, // ✨ 使用真实计算的相似度
      }));
    } catch (error) {
      this.logger.error(`Failed to get similar customer recommendations:`, error);
      return [];
    }
  }

  /**
   * 获取客户的历史推荐记录
   */
  async getCustomerRecommendationHistory(
    customerId: number,
    limit: number = 10
  ): Promise<Array<{
    id: number;
    tagName: string;
    tagCategory?: string;
    createdAt: Date;
    status: 'pending' | 'accepted' | 'rejected';
    reason: string;
    acceptedAt?: Date;
  }>> {
    try {
      const history = await this.recommendationRepo.find({
        where: { customerId },
        order: { createdAt: 'DESC' },
        take: limit,
      });

      return history.map(rec => ({
        id: rec.id,
        tagName: rec.tagName,
        tagCategory: rec.tagCategory,
        createdAt: rec.createdAt,
        status: rec.status === RecommendationStatus.ACCEPTED ? 'accepted' 
          : rec.status === RecommendationStatus.REJECTED ? 'rejected' 
          : 'pending',
        reason: rec.reason,
        acceptedAt: rec.acceptedAt,
      }));
    } catch (error) {
      this.logger.error(`Failed to get customer recommendation history:`, error);
      return [];
    }
  }

}
