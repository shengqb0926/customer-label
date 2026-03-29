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
  
  // 性能优化参数
  private maxTransactions = 10000;    // 最大事务数（超过则采样）
  private minTransactionSize = 2;     // 最小标签数（少于该数量的客户不参与挖掘）

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
   * 使用 Apriori 算法挖掘关联规则（带性能优化）
   */
  private async mineAssociationRules(
    allCustomerTags: Map<number, string[]>
  ): Promise<AssociationRule[]> {
    let transactions = Array.from(allCustomerTags.values());
    const totalOriginalTransactions = transactions.length;

    if (totalOriginalTransactions === 0) {
      return [];
    }

    // 性能优化 1: 过滤标签数过少的客户
    transactions = transactions.filter(tags => tags.length >= this.minTransactionSize);
    
    this.logger.debug(`Mining association rules from ${transactions.length}/${totalOriginalTransactions} valid transactions`);

    // 性能优化 2: 数据量过大时进行采样
    let sampled = false;
    if (transactions.length > this.maxTransactions) {
      this.logger.warn(`Data volume (${transactions.length}) exceeds threshold (${this.maxTransactions}), applying random sampling`);
      transactions = this.randomSample(transactions, this.maxTransactions);
      sampled = true;
    }

    const totalTransactions = transactions.length;

    // 1. 找出所有频繁 1-项集
    const frequent1ItemSets = this.findFrequent1ItemSets(transactions, totalTransactions);
    this.logger.debug(`Found ${frequent1ItemSets.length} frequent 1-itemsets`);

    // 2. 生成候选 k-项集
    let candidateItemSets = frequent1ItemSets.map(itemSet => itemSet.items);
    let frequentItemSets: FrequentItemSet[] = frequent1ItemSets;

    while (candidateItemSets.length > 0) {
      // 3. 计算候选 k-项集的支持度
      const itemSetSupportCounts = this.calculateSupportCounts(candidateItemSets, transactions);
      const frequentKItemSets = this.filterFrequentItemSets(itemSetSupportCounts, totalTransactions);

      // 4. 生成候选 (k+1)-项集
      candidateItemSets = this.generateCandidateItemSets(frequentKItemSets);
      frequentItemSets = frequentItemSets.concat(frequentKItemSets);
    }

    this.logger.debug(`Found ${frequentItemSets.length} frequent itemsets`);

    // 5. 生成关联规则
    const rules = this.generateAssociationRules(frequentItemSets);
    this.logger.debug(`Generated ${rules.length} association rules`);

    // 6. 过滤低质量规则
    const filteredRules = rules.filter(rule => rule.confidence >= this.minConfidence && rule.lift >= this.minLift);
    this.logger.log(`Generated ${filteredRules.length} high-quality association rules`);
    
    if (sampled) {
      this.logger.warn(`Results based on sampled data (${this.maxTransactions}/${totalOriginalTransactions} transactions)`);
    }
    
    return filteredRules;
  }

  /**
   * 随机采样
   */
  private randomSample<T>(items: T[], sampleSize: number): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, sampleSize);
  }

  /**
   * 找出所有频繁 1-项集
   */
  private findFrequent1ItemSets(transactions: string[][], totalTransactions: number): FrequentItemSet[] {
    const itemSupportCounts: { [item: string]: number } = {};

    for (const transaction of transactions) {
      for (const item of transaction) {
        itemSupportCounts[item] = (itemSupportCounts[item] || 0) + 1;
      }
    }

    const frequent1ItemSets: FrequentItemSet[] = [];
    for (const item in itemSupportCounts) {
      const support = itemSupportCounts[item] / totalTransactions;
      if (support >= this.minSupport) {
        frequent1ItemSets.push({ items: [item], support, count: itemSupportCounts[item] });
      }
    }

    return frequent1ItemSets;
  }

  /**
   * 计算候选 k-项集的支持度
   */
  private calculateSupportCounts(candidateItemSets: string[][], transactions: string[][]): { [itemSet: string]: number } {
    const itemSetSupportCounts: { [itemSet: string]: number } = {};

    for (const transaction of transactions) {
      const transactionItems = new Set(transaction);

      for (const itemSet of candidateItemSets) {
        if (itemSet.every(item => transactionItems.has(item))) {
          const itemSetKey = itemSet.join(',');
          itemSetSupportCounts[itemSetKey] = (itemSetSupportCounts[itemSetKey] || 0) + 1;
        }
      }
    }

    return itemSetSupportCounts;
  }

  /**
   * 过滤频繁项集
   */
  private filterFrequentItemSets(itemSetSupportCounts: { [itemSet: string]: number }, totalTransactions: number): FrequentItemSet[] {
    const frequentItemSets: FrequentItemSet[] = [];

    for (const itemSetKey in itemSetSupportCounts) {
      const count = itemSetSupportCounts[itemSetKey];
      const support = count / totalTransactions;

      if (support >= this.minSupport) {
        frequentItemSets.push({ items: itemSetKey.split(','), support, count });
      }
    }

    return frequentItemSets;
  }

  /**
   * 生成候选 (k+1)-项集
   */
  private generateCandidateItemSets(frequentItemSets: FrequentItemSet[]): string[][] {
    const candidateItemSets: string[][] = [];

    for (let i = 0; i < frequentItemSets.length; i++) {
      for (let j = i + 1; j < frequentItemSets.length; j++) {
        const itemSet1 = frequentItemSets[i].items;
        const itemSet2 = frequentItemSets[j].items;

        if (this.canCombine(itemSet1, itemSet2)) {
          const newItemSet = itemSet1.concat(itemSet2.slice(-1));
          candidateItemSets.push(newItemSet);
        }
      }
    }

    return candidateItemSets;
  }

  /**
   * 判断两个项集是否可以合并
   */
  private canCombine(itemSet1: string[], itemSet2: string[]): boolean {
    for (let i = 0; i < itemSet1.length - 1; i++) {
      if (itemSet1[i] !== itemSet2[i]) {
        return false;
      }
    }

    return itemSet1[itemSet1.length - 1] < itemSet2[itemSet2.length - 1];
  }

  /**
   * 生成关联规则
   */
  private generateAssociationRules(frequentItemSets: FrequentItemSet[]): AssociationRule[] {
    const rules: AssociationRule[] = [];

    for (const itemSet of frequentItemSets) {
      if (itemSet.items.length > 1) {
        this.generateRules(itemSet.items, [], rules, frequentItemSets);
      }
    }

    return rules;
  }

  /**
   * 递归生成关联规则
   */
  private generateRules(itemSet: string[], antecedent: string[], rules: AssociationRule[], frequentItemSets: FrequentItemSet[]): void {
    const consequent = itemSet.filter(item => !antecedent.includes(item));

    if (consequent.length > 0) {
      const antecedentSupport = this.findFrequentItemSet(antecedent, frequentItemSets).support;
      const itemSetSupport = this.findFrequentItemSet(itemSet, frequentItemSets).support;

      const confidence = itemSetSupport / antecedentSupport;
      const lift = confidence / this.findFrequentItemSet(consequent, frequentItemSets).support;

      rules.push({ antecedent, consequent: consequent[0], support: itemSetSupport, confidence, lift });
    }

    for (let i = 0; i < itemSet.length; i++) {
      const newAntecedent = antecedent.concat(itemSet[i]);
      this.generateRules(itemSet.slice(i + 1), newAntecedent, rules, frequentItemSets);
    }
  }

  /**
   * 查找频繁项集
   */
  private findFrequentItemSet(items: string[], frequentItemSets: FrequentItemSet[]): FrequentItemSet {
    const itemSetKey = items.join(',');
    return frequentItemSets.find(itemSet => itemSetKey === itemSet.items.join(','));
  }

  /**
   * 匹配前件
   */
  private matchesAntecedent(antecedent: string[], existingTags: string[]): boolean {
    return antecedent.every(tag => existingTags.includes(tag));
  }
}
