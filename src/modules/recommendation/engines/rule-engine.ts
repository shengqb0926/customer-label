import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RuleEvaluator } from './rule-evaluator';
import { RecommendationRule } from '../entities/recommendation-rule.entity';
import { TagRecommendation, RecommendationStatus } from '../entities/tag-recommendation.entity';

/**
 * 客户数据接口
 */
interface CustomerData {
  id: number;
  [key: string]: any;
}

/**
 * 规则引擎核心
 * 负责执行规则评估并生成推荐
 */
@Injectable()
export class RuleEngine {
  constructor(
    @InjectRepository(RecommendationRule)
    private ruleRepository: Repository<RecommendationRule>,
    @InjectRepository(TagRecommendation)
    private recommendationRepository: Repository<TagRecommendation>,
    private evaluator: RuleEvaluator,
  ) {}

  /**
   * 为客户生成推荐
   */
  async recommend(customer: CustomerData): Promise<Partial<TagRecommendation>[]> {
    const startTime = Date.now();

    // 1. 加载所有活跃规则（按优先级降序）
    const rules = await this.ruleRepository.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });

    console.log(`[RuleEngine] 加载了 ${rules.length} 条活跃规则`);

    const recommendationsToSave: Partial<TagRecommendation>[] = [];
    const rulesToUpdate: RecommendationRule[] = [];

    // 2. 逐条评估规则（不立即保存）
    for (const rule of rules) {
      try {
        const expression = typeof rule.ruleExpression === 'string' 
          ? JSON.parse(rule.ruleExpression) 
          : rule.ruleExpression;
        const result = this.evaluator.evaluateExpression(expression, customer);

        if (result.matched) {
          console.log(`[RuleEngine] 规则 "${rule.ruleName}" 匹配，置信度：${result.confidence}`);

          // 3. 收集待保存的推荐
          const tagName = rule.tagTemplate?.name || '未命名标签';
          recommendationsToSave.push({
            customerId: customer.id,
            tagName: tagName,
            tagCategory: rule.tagTemplate?.category,
            confidence: result.confidence,
            source: 'rule',
            reason: this.generateReason(rule, result),
            status: RecommendationStatus.PENDING,
          });

          // 4. 更新命中次数（暂不保存）
          rule.hitCount += 1;
          rulesToUpdate.push(rule);
        }
      } catch (error) {
        console.error(`[RuleEngine] 规则 ${rule.ruleName} 评估失败:`, error);
        // 继续评估其他规则
      }
    }

    // 5. 批量保存推荐结果
    let savedRecommendations: TagRecommendation[] = [];
    if (recommendationsToSave.length > 0) {
      console.log(`[RuleEngine] 批量保存 ${recommendationsToSave.length} 条推荐...`);
      const entities = recommendationsToSave.map(rec => this.recommendationRepository.create(rec));
      savedRecommendations = await this.recommendationRepository.save(entities);
      console.log(`[RuleEngine] 推荐保存完成`);
    }

    // 6. 批量更新规则命中次数
    if (rulesToUpdate.length > 0) {
      console.log(`[RuleEngine] 批量更新 ${rulesToUpdate.length} 条规则的命中次数...`);
      await this.ruleRepository.save(rulesToUpdate);
      console.log(`[RuleEngine] 规则更新完成`);
    }

    const endTime = Date.now();
    console.log(`[RuleEngine] 规则评估完成，耗时：${endTime - startTime}ms，生成 ${savedRecommendations.length} 条推荐`);

    // 7. 返回去重并排序后的推荐
    return this.deduplicateAndSort(savedRecommendations);
  }

  /**
   * 生成推荐理由
   */
  private generateReason(rule: RecommendationRule, result: any): string {
    const matchedInfo = result.matchedConditions && result.totalConditions
      ? ` (匹配 ${result.matchedConditions}/${result.totalConditions} 个条件)`
      : '';
    
    return `满足规则：${rule.description || rule.ruleName}${matchedInfo} (规则 ID: ${rule.id})`;
  }

  /**
   * 去重并排序
   * - 相同标签只保留置信度最高的
   * - 按置信度降序排序
   */
  private deduplicateAndSort(
    recommendations: Partial<TagRecommendation>[]
  ): Partial<TagRecommendation>[] {
    // 使用 Map 去重（tagName -> recommendation）
    const map = new Map<string, Partial<TagRecommendation>>();

    for (const rec of recommendations) {
      const existing = map.get(rec.tagName!);
      if (!existing || (rec.confidence! > existing.confidence!)) {
        map.set(rec.tagName!, rec);
      }
    }

    // 转换为数组并排序
    return Array.from(map.values())
      .sort((a, b) => b.confidence! - a.confidence!);
  }

  /**
   * 评估单个表达式（用于测试）
   */
  async evaluateSingleExpression(
    expression: any,
    customerData: Record<string, any>
  ): Promise<any> {
    return this.evaluator.evaluateExpression(expression, customerData);
  }
}
