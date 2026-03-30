import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../modules/recommendation/entities/customer.entity';
import {
  SimilarityConfig,
  SimilarityResult,
  BatchSimilarityResults,
  FeatureWeights,
  CustomerFeatureVector,
  DEFAULT_SIMILARITY_CONFIG,
} from './similarity.types';
import { CosineSimilarity } from './algorithms/cosine.algorithm';
import { EuclideanSimilarity } from './algorithms/euclidean.algorithm';

/**
 * 相似度计算服务
 * 
 * 提供通用的客户相似度计算能力，支持多种算法和自定义权重
 */
@Injectable()
export class SimilarityService {
  private readonly logger = new Logger(SimilarityService.name);
  private readonly cosineSimilarity = new CosineSimilarity();
  private readonly euclideanSimilarity = new EuclideanSimilarity();

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  /**
   * 计算两个客户的相似度
   * @param customerIdA 客户 A ID
   * @param customerIdB 客户 B ID
   * @param config 配置选项
   * @returns 相似度值 (0-1)
   */
  async calculateCustomerSimilarity(
    customerIdA: number,
    customerIdB: number,
    config: Partial<SimilarityConfig> = {},
  ): Promise<number> {
    const [customerA, customerB] = await Promise.all([
      this.customerRepo.findOne({ where: { id: customerIdA } }),
      this.customerRepo.findOne({ where: { id: customerIdB } }),
    ]);

    if (!customerA || !customerB) {
      throw new Error('客户不存在');
    }

    const mergedConfig = { ...DEFAULT_SIMILARITY_CONFIG, ...config };
    
    const vectorA = this.vectorize(customerA, mergedConfig.featureWeights);
    const vectorB = this.vectorize(customerB, mergedConfig.featureWeights);

    return this.calculateSimilarity(vectorA, vectorB, mergedConfig);
  }

  /**
   * 为指定客户查找相似客户
   * @param targetCustomerId 目标客户 ID
   * @param limit 返回数量限制
   * @param config 配置选项
   * @returns 相似客户列表（按相似度降序）
   */
  async findSimilarCustomers(
    targetCustomerId: number,
    limit: number = 5,
    config: Partial<SimilarityConfig> = {},
  ): Promise<BatchSimilarityResults> {
    const startTime = Date.now();
    const mergedConfig = { ...DEFAULT_SIMILARITY_CONFIG, ...config };

    // 获取目标客户
    const targetCustomer = await this.customerRepo.findOne({ 
      where: { id: targetCustomerId },
    });

    if (!targetCustomer) {
      throw new Error(`客户 #${targetCustomerId} 不存在`);
    }

    // 获取所有候选客户（排除自己）
    const allCustomers = await this.customerRepo.find({
      where: { id: Not(targetCustomerId) },
    });

    this.logger.debug(
      `Finding similar customers for #${targetCustomerId}, candidates: ${allCustomers.length}`,
    );

    // 向量化目标客户
    const targetVector = this.vectorize(targetCustomer, mergedConfig.featureWeights);

    // 批量计算相似度
    const results: Array<{ customerId: number; similarity: number }> = [];
    
    for (const candidate of allCustomers) {
      const candidateVector = this.vectorize(candidate, mergedConfig.featureWeights);
      const similarity = this.calculateSimilarity(targetVector, candidateVector, mergedConfig);

      if (similarity >= (mergedConfig.minSimilarity || 0)) {
        results.push({
          customerId: candidate.id,
          similarity,
        });
      }
    }

    // 排序并截取前 N 个
    results.sort((a, b) => b.similarity - a.similarity);
    const topResults = results.slice(0, limit);

    // 添加排名
    const rankedResults = topResults.map((result, index) => ({
      customerId: result.customerId,
      similarity: result.similarity,
      rank: index + 1,
    }));

    const computationTime = Date.now() - startTime;

    this.logger.log(
      `Found ${rankedResults.length} similar customers for #${targetCustomerId} in ${computationTime}ms`,
    );

    return {
      targetCustomerId,
      results: rankedResults,
      totalCandidates: allCustomers.length,
      aboveThreshold: results.length,
      computationTime,
    };
  }

  /**
   * 将客户对象转换为特征向量
   * @param customer 客户对象
   * @param weights 特征权重
   * @returns 归一化后的特征向量
   */
  vectorize(customer: Customer, weights: FeatureWeights = {}): number[] {
    const mergedWeights = { ...DEFAULT_SIMILARITY_CONFIG.featureWeights, ...weights };

    // 提取原始特征
    const rawFeatures = [
      customer.totalAssets || 0,           // 总资产
      customer.monthlyIncome || 0,         // 月收入
      customer.annualSpend || 0,           // 年消费
      customer.orderCount || 0,            // 订单数
      this.encodeLevel(customer.level),    // 客户等级编码
      this.encodeRiskLevel(customer.riskLevel), // 风险等级编码
      this.encodeCity(customer.city),      // 城市编码
      customer.registerDays || 0,          // 注册天数
    ];

    // 应用权重
    const weightedFeatures = rawFeatures.map((value, index) => {
      const weight = Object.values(mergedWeights)[index] || 1;
      return value * weight;
    });

    // Min-Max 归一化到 [0, 1] 范围
    return this.normalizeMinMax(weightedFeatures);
  }

  /**
   * 计算两个向量的相似度
   */
  private calculateSimilarity(
    vecA: number[],
    vecB: number[],
    config: SimilarityConfig,
  ): number {
    switch (config.algorithm) {
      case 'cosine':
        return this.cosineSimilarity.calculate(vecA, vecB);
      case 'euclidean':
        return this.euclideanSimilarity.calculate(vecA, vecB);
      default:
        throw new Error(`不支持的算法：${config.algorithm}`);
    }
  }

  /**
   * Min-Max 归一化
   */
  private normalizeMinMax(values: number[]): number[] {
    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) {
      return values.map(() => 0.5); // 所有值相同，返回中间值
    }

    return values.map(v => (v - min) / range);
  }

  /**
   * 客户等级编码
   */
  private encodeLevel(level?: string): number {
    const levelMap: Record<string, number> = {
      'BRONZE': 1,
      'SILVER': 2,
      'GOLD': 3,
      'PLATINUM': 4,
      'DIAMOND': 5,
    };
    return levelMap[level || 'BRONZE'] || 0;
  }

  /**
   * 风险等级编码
   */
  private encodeRiskLevel(riskLevel?: string): number {
    const riskMap: Record<string, number> = {
      'LOW': 1,
      'MEDIUM': 2,
      'HIGH': 3,
    };
    return riskMap[riskLevel || 'LOW'] || 0;
  }

  /**
   * 城市编码（简化版本，实际应该用 One-Hot 或 Embedding）
   */
  private encodeCity(city?: string): number {
    if (!city) return 0;
    
    // 一线城市
    const tier1Cities = ['北京', '上海', '广州', '深圳'];
    if (tier1Cities.includes(city)) return 4;
    
    // 省会城市（简化判断）
    if (city.endsWith('州') || city.endsWith('阳') || city.endsWith('沙')) {
      return 3;
    }
    
    // 其他城市
    return 2;
  }
}

// 需要导入 Not 操作符
import { Not } from 'typeorm';
