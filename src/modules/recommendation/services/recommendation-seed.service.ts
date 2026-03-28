import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagRecommendation } from '../entities/tag-recommendation.entity';

/**
 * 推荐种子数据服务
 * 用于生成测试数据
 */
@Injectable()
export class RecommendationSeedService {
  private readonly logger = new Logger(RecommendationSeedService.name);

  constructor(
    @InjectRepository(TagRecommendation)
    private readonly recommendationRepo: Repository<TagRecommendation>,
  ) {}

  /**
   * 生成测试推荐数据
   */
  async generateTestData(count: number = 20) {
    const customers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const tags = [
      { name: '高价值客户', category: '客户价值' },
      { name: '流失风险', category: '客户价值' },
      { name: '潜力客户', category: '客户价值' },
      { name: '频繁购买者', category: '行为特征' },
      { name: '价格敏感', category: '行为特征' },
      { name: '品质导向', category: '行为特征' },
      { name: '年轻客群', category: '人口统计' },
      { name: '中年客群', category: '人口统计' },
      { name: '线上偏好', category: '偏好分析' },
      { name: '线下偏好', category: '偏好分析' },
    ];
    const sources = ['rule', 'clustering', 'association'] as const;
    const reasons = [
      '基于客户历史消费数据分析',
      '聚类算法识别出的相似客户群体',
      '关联规则挖掘发现的模式',
      '综合多维度特征评估',
      '基于 RFM 模型分析',
    ];

    const testData: Partial<TagRecommendation>[] = [];

    for (let i = 0; i < count; i++) {
      const customerId = customers[Math.floor(Math.random() * customers.length)];
      const tag = tags[Math.floor(Math.random() * tags.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const confidence = 0.5 + Math.random() * 0.5; // 0.5-1.0
      const isAccepted = Math.random() > 0.7; // 30% 概率已接受

      testData.push({
        customerId,
        tagName: tag.name,
        tagCategory: tag.category,
        confidence,
        source,
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        isAccepted,
        acceptedAt: isAccepted ? new Date() : null,
        acceptedBy: isAccepted ? 1 : null,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)), // 最近 7 天
      });
    }

    const saved = await this.recommendationRepo.save(testData.map(d => this.recommendationRepo.create(d)));
    this.logger.log(`Generated ${saved.length} test recommendations`);
    return saved;
  }

  /**
   * 清空测试数据
   */
  async clearTestData() {
    await this.recommendationRepo.clear();
    this.logger.log('Cleared all test recommendations');
  }
}