import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagScore } from './entities/tag-score.entity';
import { CacheService } from '../../infrastructure/redis';

export interface UpdateTagScoreDto {
  tagId: number;
  tagName: string;
  coverageScore: number;
  coverageValue: number;
  discriminationScore: number;
  discriminationIv: number;
  stabilityScore: number;
  stabilityPsi: number;
  businessValueScore: number;
  businessValueRoi: number;
  recommendation?: string;
  insights?: string[];
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    @InjectRepository(TagScore)
    private readonly scoreRepo: Repository<TagScore>,
    private readonly cache: CacheService
  ) {}

  /**
   * 计算标签综合评分
   */
  calculateOverallScore(scores: {
    coverageScore: number;
    discriminationScore: number;
    stabilityScore: number;
    businessValueScore: number;
  }): number {
    // 权重配置（可根据业务调整）
    const weights = {
      coverage: 0.2,
      discrimination: 0.3,
      stability: 0.2,
      businessValue: 0.3,
    };

    const overall =
      scores.coverageScore * weights.coverage +
      scores.discriminationScore * weights.discrimination +
      scores.stabilityScore * weights.stability +
      scores.businessValueScore * weights.businessValue;

    return parseFloat(overall.toFixed(4));
  }

  /**
   * 确定推荐等级
   */
  determineRecommendation(overallScore: number): string {
    if (overallScore >= 0.85) {
      return '强烈推荐';
    } else if (overallScore >= 0.75) {
      return '推荐';
    } else if (overallScore >= 0.65) {
      return '中性';
    } else if (overallScore >= 0.5) {
      return '不推荐';
    } else {
      return '禁用';
    }
  }

  /**
   * 更新或创建标签评分
   */
  async updateTagScore(dto: UpdateTagScoreDto): Promise<TagScore> {
    // 计算综合评分
    const overallScore = this.calculateOverallScore({
      coverageScore: dto.coverageScore,
      discriminationScore: dto.discriminationScore,
      stabilityScore: dto.stabilityScore,
      businessValueScore: dto.businessValueScore,
    });

    // 确定推荐等级
    const recommendation = dto.recommendation || this.determineRecommendation(overallScore);

    // 查找或创建
    let entity = await this.scoreRepo.findOne({ where: { tagId: dto.tagId } });

    if (entity) {
      // 更新现有记录
      Object.assign(entity, {
        ...dto,
        overallScore,
        recommendation,
        lastCalculatedAt: new Date(),
      });
    } else {
      // 创建新记录
      entity = this.scoreRepo.create({
        ...dto,
        overallScore,
        recommendation,
      });
    }

    const saved = await this.scoreRepo.save(entity);
    
    // 更新缓存
    await this.cache.set(`tag:score:${dto.tagId}`, saved, 1800);
    
    this.logger.log(`Updated score for tag ${dto.tagName}: ${overallScore}`);
    return saved;
  }

  /**
   * 批量更新标签评分
   */
  async batchUpdateScores(scores: UpdateTagScoreDto[]): Promise<TagScore[]> {
    const results: TagScore[] = [];
    
    for (const dto of scores) {
      const saved = await this.updateTagScore(dto);
      results.push(saved);
    }
    
    this.logger.log(`Batch updated ${results.length} tag scores`);
    return results;
  }

  /**
   * 获取标签评分
   */
  async getTagScore(tagId: number): Promise<TagScore | null> {
    // 尝试从缓存获取
    const cached = await this.cache.get<TagScore>(`tag:score:${tagId}`);
    if (cached) {
      return cached;
    }

    // 从数据库查询
    const entity = await this.scoreRepo.findOne({ where: { tagId } });
    
    if (entity) {
      // 写入缓存
      await this.cache.set(`tag:score:${tagId}`, entity, 1800);
    }
    
    return entity;
  }

  /**
   * 获取所有标签评分
   */
  async getAllScores(): Promise<TagScore[]> {
    return await this.scoreRepo.find({
      order: { overallScore: 'DESC' },
    });
  }

  /**
   * 获取推荐等级为某个值的标签
   */
  async getByRecommendation(recommendation: string): Promise<TagScore[]> {
    return await this.scoreRepo.find({
      where: { recommendation },
      order: { overallScore: 'DESC' },
    });
  }

  /**
   * 清除标签评分缓存
   */
  async invalidateCache(tagId: number): Promise<void> {
    await this.cache.delete(`tag:score:${tagId}`);
    this.logger.debug(`Invalidated cache for tag ${tagId}`);
  }

  /**
   * 获取评分统计信息
   */
  async getStats(): Promise<{
    total: number;
    avgOverallScore: number;
    byRecommendation: Record<string, number>;
  }> {
    const [total, avgResult, byRecommendationResult] = await Promise.all([
      this.scoreRepo.count(),
      this.scoreRepo
        .createQueryBuilder('score')
        .select('AVG(score.overallScore)', 'avg')
        .getRawOne(),
      this.scoreRepo
        .createQueryBuilder('score')
        .select('score.recommendation', 'recommendation')
        .addSelect('COUNT(*)', 'count')
        .groupBy('score.recommendation')
        .getRawMany(),
    ]);

    const byRecommendation = {};
    byRecommendationResult.forEach(row => {
      byRecommendation[row.recommendation] = parseInt(row.count);
    });

    return {
      total,
      avgOverallScore: parseFloat(avgResult.avg) || 0,
      byRecommendation,
    };
  }
}
