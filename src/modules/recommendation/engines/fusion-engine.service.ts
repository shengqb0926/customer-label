import { Injectable, Logger } from '@nestjs/common';
import { CreateRecommendationDto } from '../entities/tag-recommendation.entity';

/**
 * 推荐来源权重配置
 */
export interface FusionWeights {
  rule: number;         // 规则引擎权重
  clustering: number;   // 聚类引擎权重
  association: number;  // 关联引擎权重
}

/**
 * 融合后的推荐
 */
interface FusedRecommendation {
  customerId: number;
  tagName: string;
  tagCategory: string;
  confidence: number;
  source: string;
  reason: string;
  allSources: string[];           // 所有推荐来源
  sourceConfidences: Record<string, number>; // 各来源的置信度
  fusedConfidence: number;        // 融合后的置信度
  explanations: string[];         // 所有解释
}

@Injectable()
export class FusionEngineService {
  private readonly logger = new Logger(FusionEngineService.name);

  // 默认权重
  private defaultWeights: FusionWeights = {
    rule: 0.4,         // 规则推荐最可靠
    clustering: 0.35,  // 聚类次之
    association: 0.25, // 关联再次
  };

  /**
   * 融合多个引擎的推荐结果
   */
  async fuseRecommendations(
    allRecommendations: CreateRecommendationDto[],
    weights?: Partial<FusionWeights>,
    options?: {
      maxResults?: number;
      minConfidence?: number;
      deduplicate?: boolean;
    }
  ): Promise<CreateRecommendationDto[]> {
    const finalWeights = { ...this.defaultWeights, ...weights };
    const {
      maxResults = 10,
      minConfidence = 0.5,
      deduplicate = true,
    } = options || {};

    this.logger.log(`Fusing ${allRecommendations.length} recommendations with weights:`, finalWeights);

    if (allRecommendations.length === 0) {
      return [];
    }

    // 1. 按标签名分组
    const grouped = this.groupByTagName(allRecommendations);

    // 2. 融合每个标签的推荐
    const fused: FusedRecommendation[] = [];

    for (const [tagName, recs] of grouped.entries()) {
      const fusedRec = this.fuseSingleTag(tagName, recs, finalWeights);
      
      if (fusedRec.fusedConfidence >= minConfidence) {
        fused.push(fusedRec);
      }
    }

    // 3. 排序
    fused.sort((a, b) => b.fusedConfidence - a.fusedConfidence);

    // 4. 截取 Top N
    const topN = fused.slice(0, maxResults);

    // 5. 转换为输出格式
    const result: CreateRecommendationDto[] = topN.map(rec => ({
      customerId: rec.customerId,
      tagName: rec.tagName,
      tagCategory: rec.tagCategory,
      // 限制置信度范围在 0-0.9999 之间，避免数据库 numeric 字段溢出
      confidence: Math.min(rec.fusedConfidence, 0.9999),
      source: rec.allSources.join('+') as any,
      reason: this.generateReason(rec),
    }));

    this.logger.log(`Fused to ${result.length} recommendations (top ${maxResults})`);
    return result;
  }

  /**
   * 融合单个标签的多个推荐
   */
  private fuseSingleTag(
    tagName: string,
    recommendations: CreateRecommendationDto[],
    weights: FusionWeights
  ): FusedRecommendation {
    const first = recommendations[0];
    
    // 收集所有来源
    const allSources = [...new Set(recommendations.map(r => r.source))];
    
    // 计算各来源的置信度
    const sourceConfidences: Record<string, number> = {};
    for (const rec of recommendations) {
      const existing = sourceConfidences[rec.source] || 0;
      sourceConfidences[rec.source] = Math.max(existing, rec.confidence);
    }

    // 计算加权融合置信度
    let fusedConfidence = 0;
    let totalWeight = 0;

    for (const source of allSources) {
      const baseSource = source.split('+')[0]; // 处理复合来源
      const weight = weights[baseSource as keyof FusionWeights] || 0.3;
      const confidence = sourceConfidences[source] || 0;
      
      fusedConfidence += weight * confidence;
      totalWeight += weight;
    }

    // 归一化
    if (totalWeight > 0) {
      fusedConfidence /= totalWeight;
    }

    // 多来源加成
    if (allSources.length > 1) {
      fusedConfidence = Math.min(1.0, fusedConfidence * (1 + 0.1 * (allSources.length - 1)));
    }

    // 收集所有解释
    const explanations = recommendations.map(r => r.reason).filter(Boolean);

    return {
      customerId: first.customerId,
      tagName,
      tagCategory: this.selectBestCategory(recommendations),
      // 限制置信度范围在 0-0.9999 之间，避免数据库 numeric 字段溢出
      confidence: Math.min(Math.round(fusedConfidence * 100) / 100, 0.9999),
      source: allSources[0],
      reason: explanations[0] || '',
      allSources,
      sourceConfidences,
      fusedConfidence: Math.round(fusedConfidence * 100) / 100,
      explanations,
    };
  }

  /**
   * 按标签名分组
   */
  private groupByTagName(
    recommendations: CreateRecommendationDto[]
  ): Map<string, CreateRecommendationDto[]> {
    const grouped = new Map<string, CreateRecommendationDto[]>();

    for (const rec of recommendations) {
      const key = rec.tagName;
      const existing = grouped.get(key) || [];
      existing.push(rec);
      grouped.set(key, existing);
    }

    return grouped;
  }

  /**
   * 选择最佳类别
   */
  private selectBestCategory(recommendations: CreateRecommendationDto[]): string {
    // 优先级：出现次数最多的类别 > 置信度最高的类别 > 第一个类别
    const categoryCount = new Map<string, number>();
    
    for (const rec of recommendations) {
      const count = categoryCount.get(rec.tagCategory) || 0;
      categoryCount.set(rec.tagCategory, count + 1);
    }

    let bestCategory = '';
    let maxCount = 0;

    for (const [category, count] of categoryCount.entries()) {
      if (count > maxCount) {
        maxCount = count;
        bestCategory = category;
      }
    }

    return bestCategory || recommendations[0].tagCategory;
  }

  /**
   * 生成融合后的推荐理由
   */
  private generateReason(fused: FusedRecommendation): string {
    const sources = fused.allSources.join('、');
    const avgConfidence = Object.values(fused.sourceConfidences)
      .reduce((sum, c) => sum + c, 0) / fused.allSources.length;

    let reason = `[${sources}] 多引擎联合推荐`;
    
    if (fused.allSources.length > 1) {
      reason += ` (平均置信度：${(avgConfidence * 100).toFixed(1)}%)`;
    }

    // 添加详细解释（限制长度）
    if (fused.explanations.length > 0) {
      const primaryExplanation = fused.explanations[0];
      if (primaryExplanation && primaryExplanation.length < 100) {
        reason += ` - ${primaryExplanation}`;
      }
    }

    return reason;
  }

  /**
   * 过滤已有标签
   */
  filterExistingTags(
    recommendations: CreateRecommendationDto[],
    existingTags: string[]
  ): CreateRecommendationDto[] {
    const existingSet = new Set(existingTags.map(t => t.toLowerCase()));
    
    return recommendations.filter(rec => 
      !existingSet.has(rec.tagName.toLowerCase())
    );
  }

  /**
   * 设置权重配置
   */
  setWeights(weights: Partial<FusionWeights>) {
    this.defaultWeights = { ...this.defaultWeights, ...weights };
    this.logger.log(`Updated fusion weights:`, this.defaultWeights);
  }

  /**
   * 获取当前权重配置
   */
  getWeights(): FusionWeights {
    return { ...this.defaultWeights };
  }
}
