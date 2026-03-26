import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TagRecommendation } from '../entities/tag-recommendation.entity';
import { RecommendationRule } from '../entities/recommendation-rule.entity';

/**
 * 冲突类型枚举
 */
export enum ConflictType {
  TAG_MUTUAL_EXCLUSION = 'TAG_MUTUAL_EXCLUSION',        // 标签互斥
  RULE_CONTRADICTION = 'RULE_CONTRADICTION',            // 规则矛盾
  RECOMMENDATION_DUPLICATE = 'RECOMMENDATION_DUPLICATE', // 推荐重复
  RECOMMENDATION_CONFLICT = 'RECOMMENDATION_CONFLICT',   // 推荐冲突
}

/**
 * 冲突严重程度
 */
export enum ConflictSeverity {
  LOW = 'LOW',         // 低 - 可自动解决
  MEDIUM = 'MEDIUM',   // 中 - 需要人工审核
  HIGH = 'HIGH',       // 高 - 阻止推荐生成
}

/**
 * 冲突记录接口
 */
export interface ConflictRecord {
  id?: string;
  type: ConflictType;
  severity: ConflictSeverity;
  customerId?: number;
  description: string;
  conflictingItems: Array<{
    type: 'tag' | 'rule' | 'recommendation';
    id?: number;
    name: string;
    value?: any;
  }>;
  resolution?: ConflictResolution;
  detectedAt: Date;
  resolvedAt?: Date;
}

/**
 * 冲突解决方案
 */
export interface ConflictResolution {
  strategy: ResolutionStrategy;
  action: string;
  confidence: number;
  executed: boolean;
}

/**
 * 解决策略
 */
export enum ResolutionStrategy {
  REMOVE_LOWER_CONFIDENCE = 'REMOVE_LOWER_CONFIDENCE',  // 移除低置信度
  REMOVE_LOWER_PRIORITY = 'REMOVE_LOWER_PRIORITY',      // 移除低优先级
  MERGE_RECOMMENDATIONS = 'MERGE_RECOMMENDATIONS',      // 合并推荐
  MANUAL_REVIEW = 'MANUAL_REVIEW',                      // 人工审核
  KEEP_ALL = 'KEEP_ALL',                                // 保留所有
}

/**
 * 互斥标签对配置
 */
export interface MutualExclusionRule {
  tag1: string;
  tag2: string;
  category1?: string;
  category2?: string;
  reason: string;
}

@Injectable()
export class ConflictDetectorService {
  private readonly logger = new Logger(ConflictDetectorService.name);

  // 预定义的互斥标签规则
  private readonly mutualExclusionRules: MutualExclusionRule[] = [
    {
      tag1: '高价值客户',
      tag2: '流失风险客户',
      reason: '高价值客户和流失风险客户在业务定义上存在潜在冲突',
    },
    {
      tag1: '活跃客户',
      tag2: '流失风险客户',
      reason: '活跃客户和流失风险客户在行为特征上矛盾',
    },
    {
      tag1: '低风险客户',
      tag2: '高风险客户',
      reason: '风险等级互斥',
    },
    {
      tag1: '高潜力客户',
      tag2: '衰退客户',
      reason: '增长趋势相反',
    },
  ];

  constructor(
    @InjectRepository(TagRecommendation)
    private readonly recommendationRepo: Repository<TagRecommendation>,
    @InjectRepository(RecommendationRule)
    private readonly ruleRepo: Repository<RecommendationRule>,
  ) {}

  /**
   * 检测单个客户的推荐冲突
   */
  async detectCustomerConflicts(
    customerId: number,
    recommendations: TagRecommendation[]
  ): Promise<ConflictRecord[]> {
    const conflicts: ConflictRecord[] = [];

    this.logger.log(`Detecting conflicts for customer ${customerId} with ${recommendations.length} recommendations`);

    // 1. 检测标签互斥冲突
    const tagConflicts = this.detectTagMutualExclusions(customerId, recommendations);
    conflicts.push(...tagConflicts);

    // 2. 检测推荐重复
    const duplicateConflicts = this.detectDuplicateRecommendations(customerId, recommendations);
    conflicts.push(...duplicateConflicts);

    // 3. 检测推荐冲突（相同类别但内容矛盾）
    const recommendationConflicts = this.detectRecommendationConflicts(customerId, recommendations);
    conflicts.push(...recommendationConflicts);

    if (conflicts.length > 0) {
      this.logger.warn(`Detected ${conflicts.length} conflicts for customer ${customerId}`);
    } else {
      this.logger.debug(`No conflicts detected for customer ${customerId}`);
    }

    return conflicts;
  }

  /**
   * 检测标签互斥冲突
   */
  private detectTagMutualExclusions(
    customerId: number,
    recommendations: TagRecommendation[]
  ): ConflictRecord[] {
    const conflicts: ConflictRecord[] = [];
    const tagNameSet = new Set(recommendations.map(r => r.tagName));

    for (const exclusionRule of this.mutualExclusionRules) {
      const hasTag1 = tagNameSet.has(exclusionRule.tag1);
      const hasTag2 = tagNameSet.has(exclusionRule.tag2);

      if (hasTag1 && hasTag2) {
        const rec1 = recommendations.find(r => r.tagName === exclusionRule.tag1);
        const rec2 = recommendations.find(r => r.tagName === exclusionRule.tag2);

        conflicts.push({
          id: this.generateConflictId(ConflictType.TAG_MUTUAL_EXCLUSION, customerId),
          type: ConflictType.TAG_MUTUAL_EXCLUSION,
          severity: ConflictSeverity.HIGH,
          customerId,
          description: `检测到互斥标签："${exclusionRule.tag1}" 和 "${exclusionRule.tag2}" - ${exclusionRule.reason}`,
          conflictingItems: [
            {
              type: 'tag',
              id: rec1?.id,
              name: exclusionRule.tag1,
              value: { confidence: rec1?.confidence, category: rec1?.tagCategory },
            },
            {
              type: 'tag',
              id: rec2?.id,
              name: exclusionRule.tag2,
              value: { confidence: rec2?.confidence, category: rec2?.tagCategory },
            },
          ],
          detectedAt: new Date(),
        });
      }
    }

    return conflicts;
  }

  /**
   * 检测重复推荐
   */
  private detectDuplicateRecommendations(
    customerId: number,
    recommendations: TagRecommendation[]
  ): ConflictRecord[] {
    const conflicts: ConflictRecord[] = [];
    const tagMap = new Map<string, TagRecommendation[]>();

    // 按标签名分组
    for (const rec of recommendations) {
      const existing = tagMap.get(rec.tagName) || [];
      existing.push(rec);
      tagMap.set(rec.tagName, existing);
    }

    // 检查是否有重复
    for (const [tagName, recs] of tagMap.entries()) {
      if (recs.length > 1) {
        conflicts.push({
          id: this.generateConflictId(ConflictType.RECOMMENDATION_DUPLICATE, customerId, tagName),
          type: ConflictType.RECOMMENDATION_DUPLICATE,
          severity: ConflictSeverity.LOW,
          customerId,
          description: `检测到重复推荐标签："${tagName}" (${recs.length}个来源)`,
          conflictingItems: recs.map(rec => ({
            type: 'recommendation' as const,
            id: rec.id,
            name: rec.tagName,
            value: {
              source: rec.source,
              confidence: rec.confidence,
              reason: rec.reason,
            },
          })),
          detectedAt: new Date(),
        });
      }
    }

    return conflicts;
  }

  /**
   * 检测推荐冲突（相同类别但内容/建议矛盾）
   */
  private detectRecommendationConflicts(
    customerId: number,
    recommendations: TagRecommendation[]
  ): ConflictRecord[] {
    const conflicts: ConflictRecord[] = [];
    
    // 按类别分组
    const categoryMap = new Map<string, TagRecommendation[]>();
    for (const rec of recommendations) {
      if (!rec.tagCategory) continue;
      const existing = categoryMap.get(rec.tagCategory) || [];
      existing.push(rec);
      categoryMap.set(rec.tagCategory, existing);
    }

    // 检查同一类别内是否有冲突的建议
    for (const [category, recs] of categoryMap.entries()) {
      if (recs.length < 2) continue;

      // 简单的冲突检测：如果置信度差异过大且建议方向相反
      const sortedRecs = [...recs].sort((a, b) => b.confidence - a.confidence);
      
      // 检查最高和最低置信度的推荐是否存在明显冲突
      const highest = sortedRecs[0];
      const lowest = sortedRecs[sortedRecs.length - 1];

      if (highest.confidence - lowest.confidence > 0.5) {
        // 置信度差异超过 0.5，可能存在冲突
        conflicts.push({
          id: this.generateConflictId(ConflictType.RECOMMENDATION_CONFLICT, customerId, category),
          type: ConflictType.RECOMMENDATION_CONFLICT,
          severity: ConflictSeverity.MEDIUM,
          customerId,
          description: `类别 "${category}" 内推荐置信度差异过大`,
          conflictingItems: [
            {
              type: 'recommendation',
              id: highest.id,
              name: highest.tagName,
              value: { confidence: highest.confidence, source: highest.source },
            },
            {
              type: 'recommendation',
              id: lowest.id,
              name: lowest.tagName,
              value: { confidence: lowest.confidence, source: lowest.source },
            },
          ],
          detectedAt: new Date(),
        });
      }
    }

    return conflicts;
  }

  /**
   * 检测规则之间的矛盾
   */
  async detectRuleContradictions(): Promise<ConflictRecord[]> {
    const conflicts: ConflictRecord[] = [];
    
    this.logger.log('Detecting rule contradictions...');

    // 获取所有活跃规则
    const rules = await this.ruleRepo.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });

    // 两两比较规则
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];

        // 检查规则条件是否矛盾
        const contradiction = this.checkRuleContradiction(rule1, rule2);
        
        if (contradiction) {
          conflicts.push({
            id: this.generateConflictId(
              ConflictType.RULE_CONTRADICTION, 
              undefined, 
              `${rule1.id}-${rule2.id}`
            ),
            type: ConflictType.RULE_CONTRADICTION,
            severity: ConflictSeverity.HIGH,
            description: contradiction.description,
            conflictingItems: [
              {
                type: 'rule',
                id: rule1.id,
                name: rule1.ruleName,
                value: { 
                  expression: rule1.ruleExpression,
                  priority: rule1.priority,
                },
              },
              {
                type: 'rule',
                id: rule2.id,
                name: rule2.ruleName,
                value: { 
                  expression: rule2.ruleExpression,
                  priority: rule2.priority,
                },
              },
            ],
            detectedAt: new Date(),
          });
        }
      }
    }

    if (conflicts.length > 0) {
      this.logger.warn(`Detected ${conflicts.length} rule contradictions`);
    }

    return conflicts;
  }

  /**
   * 检查两个规则是否矛盾
   */
  private checkRuleContradiction(
    rule1: RecommendationRule,
    rule2: RecommendationRule
  ): { description: string } | null {
    // 解析规则表达式
    const conditions1 = this.parseRuleExpression(rule1.ruleExpression);
    const conditions2 = this.parseRuleExpression(rule2.ruleExpression);

    // 检查是否有直接矛盾的条件
    for (const cond1 of conditions1) {
      for (const cond2 of conditions2) {
        // 检查是否针对同一字段
        if (cond1.field === cond2.field) {
          // 检查运算符是否矛盾
          const contradiction = this.isConditionContradictory(cond1, cond2);
          
          if (contradiction) {
            return {
              description: `规则 "${rule1.ruleName}" 和 "${rule2.ruleName}" 在字段 "${cond1.field}" 上存在矛盾条件`,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * 解析规则表达式为条件数组
   */
  private parseRuleExpression(expression: string): Array<{ field: string; operator: string; value: any }> {
    const conditions: Array<{ field: string; operator: string; value: any }> = [];
    
    // 简单解析：按 AND 分割
    const andParts = expression.split(/\s+AND\s+/i);
    
    for (const part of andParts) {
      const orParts = part.split(/\s+OR\s+/i);
      for (const expr of orParts) {
        const match = expr.trim().match(/^(\w+)\s*(>=|<=|!=|==|>|<|contains|in)\s*(.+)$/i);
        if (match) {
          conditions.push({
            field: match[1],
            operator: match[2].toLowerCase(),
            value: match[3],
          });
        }
      }
    }

    return conditions;
  }

  /**
   * 检查两个条件是否矛盾
   */
  private isConditionContradictory(
    cond1: { field: string; operator: string; value: any },
    cond2: { field: string; operator: string; value: any }
  ): boolean {
    const val1 = parseFloat(cond1.value);
    const val2 = parseFloat(cond2.value);

    if (isNaN(val1) || isNaN(val2)) return false;

    // 矛盾的组合示例：
    // age > 30 AND age < 20
    // income >= 50000 AND income <= 30000
    
    if (cond1.operator === '>' && cond2.operator === '<') {
      return val1 >= val2;
    }
    if (cond1.operator === '>=' && cond2.operator === '<=') {
      return val1 > val2;
    }
    if (cond1.operator === '<' && cond2.operator === '>') {
      return val1 >= val2;
    }
    if (cond1.operator === '<=' && cond2.operator === '>=') {
      return val1 > val2;
    }

    // == 和其他运算符的矛盾
    if (cond1.operator === '==' && cond2.operator === '!=') {
      return val1 === val2;
    }
    if (cond1.operator === '!=' && cond2.operator === '==') {
      return val1 === val2;
    }

    return false;
  }

  /**
   * 解决检测到的冲突
   */
  async resolveConflicts(
    conflicts: ConflictRecord[],
    recommendations: TagRecommendation[]
  ): Promise<TagRecommendation[]> {
    this.logger.log(`Resolving ${conflicts.length} conflicts...`);

    let resolvedRecommendations = [...recommendations];

    for (const conflict of conflicts) {
      const resolution = this.determineResolution(conflict, resolvedRecommendations);
      conflict.resolution = resolution;

      if (resolution.executed) {
        resolvedRecommendations = this.applyResolution(
          resolution,
          conflict,
          resolvedRecommendations
        );
        conflict.resolvedAt = new Date();
      }
    }

    this.logger.log(`Conflict resolution completed. Remaining recommendations: ${resolvedRecommendations.length}`);
    return resolvedRecommendations;
  }

  /**
   * 确定冲突解决策略
   */
  private determineResolution(
    conflict: ConflictRecord,
    recommendations: TagRecommendation[]
  ): ConflictResolution {
    switch (conflict.type) {
      case ConflictType.TAG_MUTUAL_EXCLUSION:
        // 移除置信度较低的标签
        return {
          strategy: ResolutionStrategy.REMOVE_LOWER_CONFIDENCE,
          action: '移除置信度较低的互斥标签',
          confidence: 0.9,
          executed: true,
        };

      case ConflictType.RECOMMENDATION_DUPLICATE:
        // 保留置信度最高的
        return {
          strategy: ResolutionStrategy.REMOVE_LOWER_CONFIDENCE,
          action: '保留置信度最高的推荐',
          confidence: 0.95,
          executed: true,
        };

      case ConflictType.RECOMMENDATION_CONFLICT:
        // 中等严重程度，建议人工审核
        return {
          strategy: ResolutionStrategy.MANUAL_REVIEW,
          action: '置信度差异过大，建议人工审核',
          confidence: 0.7,
          executed: false,
        };

      case ConflictType.RULE_CONTRADICTION:
        // 高严重程度，需要立即处理
        return {
          strategy: ResolutionStrategy.REMOVE_LOWER_PRIORITY,
          action: '移除优先级较低的矛盾规则产生的推荐',
          confidence: 0.85,
          executed: true,
        };

      default:
        return {
          strategy: ResolutionStrategy.KEEP_ALL,
          action: '保持现状',
          confidence: 0.5,
          executed: false,
        };
    }
  }

  /**
   * 应用解决方案
   */
  private applyResolution(
    resolution: ConflictResolution,
    conflict: ConflictRecord,
    recommendations: TagRecommendation[]
  ): TagRecommendation[] {
    switch (resolution.strategy) {
      case ResolutionStrategy.REMOVE_LOWER_CONFIDENCE: {
        // 找出置信度最低的推荐并移除
        const itemsToRemove = new Set<number>();
        
        for (const item of conflict.conflictingItems) {
          if (item.type === 'recommendation' || item.type === 'tag') {
            const rec = recommendations.find(r => r.id === item.id);
            if (rec) {
              // 找到同一组中置信度更高的推荐
              const sameGroup = conflict.conflictingItems.filter(
                i => i.name === item.name || 
                     (item.type === 'tag' && i.type === 'tag')
              );
              
              const hasHigherConfidence = sameGroup.some(other => {
                if (other.id === item.id) return false;
                const otherRec = recommendations.find(r => r.id === other.id);
                return otherRec && otherRec.confidence > rec.confidence;
              });

              if (hasHigherConfidence) {
                itemsToRemove.add(rec.id);
              }
            }
          }
        }

        return recommendations.filter(r => !itemsToRemove.has(r.id));
      }

      case ResolutionStrategy.REMOVE_LOWER_PRIORITY: {
        // 移除优先级较低规则的推荐
        const itemsToRemove = new Set<number>();
        
        for (const item of conflict.conflictingItems) {
          if (item.type === 'rule' && item.value?.priority) {
            // 找到同组中优先级更高的规则
            const sameGroup = conflict.conflictingItems.filter(
              i => i.type === 'rule' && i.id !== item.id
            );
            
            const hasHigherPriority = sameGroup.some(other => 
              other.value?.priority > item.value.priority
            );

            if (hasHigherPriority) {
              // 标记该规则生成的推荐待删除
              const recsFromThisRule = recommendations.filter(
                r => r.reason?.includes(item.name)
              );
              recsFromThisRule.forEach(r => itemsToRemove.add(r.id));
            }
          }
        }

        return recommendations.filter(r => !itemsToRemove.has(r.id));
      }

      case ResolutionStrategy.MERGE_RECOMMENDATIONS:
        // TODO: 实现推荐合并逻辑
        return recommendations;

      default:
        return recommendations;
    }
  }

  /**
   * 生成冲突 ID
   */
  private generateConflictId(
    type: ConflictType,
    customerId?: number,
    suffix?: string
  ): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const parts = [type, timestamp.toString(), random];
    
    if (customerId) parts.push(customerId.toString());
    if (suffix) parts.push(suffix);
    
    return parts.join('_');
  }

  /**
   * 获取所有互斥规则
   */
  getMutualExclusionRules(): MutualExclusionRule[] {
    return [...this.mutualExclusionRules];
  }

  /**
   * 添加新的互斥规则
   */
  addMutualExclusionRule(rule: MutualExclusionRule): void {
    this.mutualExclusionRules.push(rule);
    this.logger.log(`Added mutual exclusion rule: ${rule.tag1} <-> ${rule.tag2}`);
  }

  /**
   * 移除互斥规则
   */
  removeMutualExclusionRule(tag1: string, tag2: string): boolean {
    const index = this.mutualExclusionRules.findIndex(
      r => (r.tag1 === tag1 && r.tag2 === tag2) || (r.tag1 === tag2 && r.tag2 === tag1)
    );

    if (index !== -1) {
      this.mutualExclusionRules.splice(index, 1);
      this.logger.log(`Removed mutual exclusion rule: ${tag1} <-> ${tag2}`);
      return true;
    }

    return false;
  }
}
