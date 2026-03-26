import { Injectable, Logger } from '@nestjs/common';
import { TagRecommendation, CreateRecommendationDto } from '../entities/tag-recommendation.entity';

/**
 * 关联规则
 */
interface AssociationRule {
  antecedent: string[];    // 前件（已有标签）
  consequent: string;       // 后件（推荐标签）
  support: number;          // 支持度
  confidence: number;       // 置信度
  lift: number;            // 提升度
}

/**
 * 频繁项集
 */
interface FrequentItemSet {
  items: string[];
  support: number;
  count: number;
}

@Injectable()
export class AssociationEngineService {
  private readonly logger = new Logger(AssociationEngineService.name);

  // Apriori 算法参数
  private minSupport = 0.01;     // 最小支持度
  private minConfidence = 0.6;   // 最小置信度
  private minLift = 1.2;         // 最小提升度

  /**
   * 为客户生成推荐（关联引擎）
   */
  async generateRecommendations(
    customerId: number,
    existingTags: string[],
    allCustomerTags: Map<number, string[]>
  ): Promise<CreateRecommendationDto[]> {
    const recommendations: CreateRecommendationDto[] = [];

    try {
      if (existingTags.length === 0) {
        this.logger.debug(`Customer ${customerId} has no existing tags, skipping association`);
        return [];
      }

      // 1. 挖掘关联规则
      const rules = await this.mineAssociationRules(allCustomerTags);
      this.logger.log(`Mined ${rules.length} association rules`);

      // 2. 匹配现有标签，生成推荐
      for (const rule of rules) {
        if (this.matchesAntecedent(rule.antecedent, existingTags)) {
          const recommendation: CreateRecommendationDto = {
            customerId,
            tagName: rule.consequent,
            tagCategory: '关联推荐',
            confidence: rule.confidence,
            source: 'association',
            reason: `基于关联规则：${rule.antecedent.join(', ')} → ${rule.consequent} (置信度：${(rule.confidence * 100).toFixed(1)}%, 提升度：${rule.lift.toFixed(2)})`,
          };

          recommendations.push(recommendation);
        }
      }

      this.logger.log(`Association engine generated ${recommendations.length} recommendations for customer ${customerId}`);
      return recommendations;
    } catch (error) {
      this.logger.error('Association engine failed:', error);
      return [];
    }
  }

  /**
   * 使用 Apriori 算法挖掘关联规则
   */
  private async mineAssociationRules(
    allCustomerTags: Map<number, string[]>
  ): Promise<AssociationRule[]> {
    const transactions = Array.from(allCustomerTags.values());
    const totalTransactions = transactions.length;

    if (totalTransactions === 0) {
      return [];
    }

    this.logger.debug(`Mining association rules from ${totalTransactions} transactions`);

    // 1. 找出所有频繁 1-项集
    let frequentItemSets: FrequentItemSet[] = [];
    let k = 1;
    let prevFrequentSets: string[][] = [];

    while (true) {
      // 计算候选项集的支持度
      const candidateCounts = this.countCandidates(transactions, k, prevFrequentSets);
      
      // 过滤出频繁项集
      const frequentSets: string[][] = [];
      
      for (const [items, count] of candidateCounts.entries()) {
        const support = count / totalTransactions;
        
        if (support >= this.minSupport) {
          frequentItemSets.push({
            items: items.split('|'),
            support,
            count,
          });
          frequentSets.push(items.split('|'));
        }
      }

      if (frequentSets.length === 0) {
        break;
      }

      prevFrequentSets = frequentSets;
      k++;

      // 限制最大项集大小
      if (k > 5) {
        break;
      }
    }

    this.logger.log(`Found ${frequentItemSets.length} frequent item sets`);

    // 2. 从频繁项集生成关联规则
    const rules: AssociationRule[] = [];

    for (const itemSet of frequentItemSets) {
      if (itemSet.items.length < 2) continue;

      // 为每个频繁项集生成所有可能的规则
      const subsetRules = this.generateRulesFromItemSet(itemSet, totalTransactions);
      rules.push(...subsetRules);
    }

    // 3. 过滤低质量规则
    const filteredRules = rules.filter(rule => 
      rule.confidence >= this.minConfidence && rule.lift >= this.minLift
    );

    this.logger.log(`Generated ${filteredRules.length} high-quality association rules`);
    return filteredRules;
  }

  /**
   * 计算候选项集的计数
   */
  private countCandidates(
    transactions: string[][],
    k: number,
    prevFrequentSets: string[][]
  ): Map<string, number> {
    const counts = new Map<string, number>();

    if (k === 1) {
      // 1-项集：统计每个单独项的出现次数
      for (const transaction of transactions) {
        const uniqueItems = new Set(transaction);
        for (const item of uniqueItems) {
          const key = item;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
    } else {
      // K-项集：使用 Apriori 性质剪枝
      const candidates = this.generateCandidates(prevFrequentSets, k);
      
      for (const transaction of transactions) {
        const transactionSet = new Set(transaction);
        for (const candidate of candidates) {
          if (candidate.every(item => transactionSet.has(item))) {
            const key = candidate.join('|');
            counts.set(key, (counts.get(key) || 0) + 1);
          }
        }
      }
    }

    return counts;
  }

  /**
   * 生成 K-项集候选
   */
  private generateCandidates(
    prevFrequentSets: string[][],
    k: number
  ): string[][] {
    const candidates: string[][] = [];

    for (let i = 0; i < prevFrequentSets.length; i++) {
      for (let j = i + 1; j < prevFrequentSets.length; j++) {
        const set1 = [...prevFrequentSets[i]].sort();
        const set2 = [...prevFrequentSets[j]].sort();

        // 对于 k=2，直接从 1-项集生成
        if (k === 2 && set1.length === 1 && set2.length === 1) {
          candidates.push([set1[0], set2[0]]);
          continue;
        }

        // 检查前 k-2 项是否相同
        const prefix1 = set1.slice(0, k - 2);
        const prefix2 = set2.slice(0, k - 2);

        if (prefix1.every((val, idx) => val === prefix2[idx])) {
          // 合并生成候选
          const union = new Set([...set1, ...set2]);
          
          if (union.size === k) {
            // 验证所有 k-1 子集都是频繁的（Apriori 剪枝）
            const subsets = this.getSubsets(Array.from(union), k - 1);
            const allFrequent = subsets.every(subset =>
              prevFrequentSets.some(fs =>
                fs.length === subset.length &&
                fs.every(item => subset.includes(item))
              )
            );

            if (allFrequent) {
              candidates.push(Array.from(union).sort());
            }
          }
        }
      }
    }

    return candidates;
  }

  /**
   * 从频繁项集生成规则
   */
  private generateRulesFromItemSet(
    itemSet: FrequentItemSet,
    totalTransactions: number
  ): AssociationRule[] {
    const rules: AssociationRule[] = [];
    const items = itemSet.items;

    // 生成所有可能的前件和后件组合
    for (let i = 1; i < items.length; i++) {
      const antecedents = this.getSubsets(items, i);
      
      for (const antecedent of antecedents) {
        const consequent = items.filter(item => !antecedent.includes(item));
        
        if (consequent.length === 1) {
          // 计算规则指标
          const antecedentCount = this.countItemSetOccurrences(transactions => 
            antecedent.every(item => transactions.includes(item))
          );
          
          const ruleCount = this.countItemSetOccurrences(transactions => 
            [...antecedent, ...consequent].every(item => transactions.includes(item))
          );

          const consequentCount = this.countItemSetOccurrences(transactions => 
            transactions.includes(consequent[0])
          );

          const support = itemSet.support;
          const confidence = ruleCount / antecedentCount;
          const lift = confidence / (consequentCount / totalTransactions);

          if (!isNaN(confidence) && !isNaN(lift)) {
            rules.push({
              antecedent,
              consequent: consequent[0],
              support,
              confidence,
              lift,
            });
          }
        }
      }
    }

    return rules;
  }

  /**
   * 统计项集出现次数
   */
  private countItemSetOccurrences(
    predicate: (transaction: string[]) => boolean
  ): number {
    // 这里需要从数据源获取，简化实现返回一个估计值
    // TODO: 传入完整的交易数据
    return 1;
  }

  /**
   * 检查标签是否匹配前件
   */
  private matchesAntecedent(antecedent: string[], existingTags: string[]): boolean {
    return antecedent.every(tag => existingTags.includes(tag));
  }

  /**
   * 获取集合的所有指定大小的子集
   */
  private getSubsets<T>(array: T[], size: number): T[][] {
    const results: T[][] = [];

    const backtrack = (start: number, current: T[]) => {
      if (current.length === size) {
        results.push([...current]);
        return;
      }

      for (let i = start; i < array.length; i++) {
        current.push(array[i]);
        backtrack(i + 1, current);
        current.pop();
      }
    };

    backtrack(0, []);
    return results;
  }

  /**
   * 增量更新关联规则（简化版）
   */
  async updateRulesIncrementally(
    newTransactions: string[][],
    existingRules: AssociationRule[]
  ): Promise<AssociationRule[]> {
    this.logger.log(`Incrementally updating rules with ${newTransactions.length} new transactions`);

    // TODO: 实现增量更新逻辑
    // 目前简单重新挖掘所有规则
    const allTransactions = newTransactions; // 实际应该合并旧数据
    return await this.mineAssociationRules(new Map(allTransactions.map((tags, i) => [i, tags])));
  }

  /**
   * 设置算法参数
   */
  setParameters(params: {
    minSupport?: number;
    minConfidence?: number;
    minLift?: number;
  }) {
    if (params.minSupport) this.minSupport = params.minSupport;
    if (params.minConfidence) this.minConfidence = params.minConfidence;
    if (params.minLift) this.minLift = params.minLift;
    
    this.logger.log(`Updated parameters: minSupport=${this.minSupport}, minConfidence=${this.minConfidence}, minLift=${this.minLift}`);
  }

  /**
   * 过滤满足最小支持度的项集（公共方法用于测试）
   */
  filterBySupport(
    candidateCounts: Map<string, number>,
    minSupport: number,
    totalTransactions: number
  ): Array<{ items: string[]; support: number; count: number }> {
    const frequentSets: Array<{ items: string[]; support: number; count: number }> = [];
    const minCount = minSupport * totalTransactions;

    for (const [itemSet, count] of candidateCounts.entries()) {
      if (count >= minCount) {
        const support = count / totalTransactions;
        frequentSets.push({
          items: itemSet.split('|'),
          support,
          count,
        });
      }
    }

    return frequentSets;
  }

  /**
   * 从频繁项集生成关联规则（公共方法用于测试）
   */
  async generateRulesFromItemSets(
    frequentItemSets: Array<{ items: string[]; support: number; count: number }>
  ): Promise<AssociationRule[]> {
    const rules: AssociationRule[] = [];
    const totalTransactions = 100; // 假设值，实际应从数据源获取

    for (const itemSet of frequentItemSets) {
      const itemSetRules = this.generateRulesFromItemSet(itemSet, totalTransactions);
      rules.push(...itemSetRules);
    }

    return rules;
  }

  /**
   * 计算置信度（公共方法用于测试）
   */
  calculateConfidence(antecedentCount: number, ruleCount: number): number {
    if (antecedentCount === 0) return 0;
    return ruleCount / antecedentCount;
  }

  /**
   * 计算提升度（公共方法用于测试）
   */
  calculateLift(confidence: number, consequentSupport: number): number {
    if (consequentSupport === 0) return Infinity;
    return confidence / consequentSupport;
  }

  /**
   * 获取所有非空真子集（公共方法用于测试）
   */
  getSubsetsPublic<T>(array: T[]): T[][] {
    const results: T[][] = [];

    // 生成所有可能的子集大小（1 到 length-1）
    for (let size = 1; size < array.length; size++) {
      results.push(...this.getSubsets(array, size));
    }

    return results;
  }
}
