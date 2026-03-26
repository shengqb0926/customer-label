import { Test, TestingModule } from '@nestjs/testing';
import { AssociationEngineService } from './association-engine.service';

describe('AssociationEngineService', () => {
  let associationEngine: AssociationEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssociationEngineService],
    }).compile();

    associationEngine = module.get<AssociationEngineService>(AssociationEngineService);
  });

  it('should be defined', () => {
    expect(associationEngine).toBeDefined();
  });

  describe('generateRecommendations', () => {
    const mockAllCustomerTags = new Map<number, string[]>([
      [1, ['高价值客户', '活跃客户', '购买力强']],
      [2, ['高价值客户', '流失风险', '高资产']],
      [3, ['活跃客户', '购买力强', '交叉销售目标']],
      [4, ['高价值客户', '活跃客户', '高资产', '购买力强']],
      [5, ['流失风险', '睡眠客户']],
    ]);

    it('should generate recommendations based on association rules', async () => {
      const customerId = 100;
      const existingTags = ['高价值客户', '活跃客户'];

      const result = await associationEngine.generateRecommendations(
        customerId,
        existingTags,
        mockAllCustomerTags
      );

      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        expect(result[0]).toMatchObject({
          customerId: 100,
          source: 'association',
        });
        expect(result[0]).toHaveProperty('tagName');
        expect(result[0]).toHaveProperty('confidence');
      }
    });

    it('should return empty array when customer has no existing tags', async () => {
      const result = await associationEngine.generateRecommendations(
        100,
        [],
        mockAllCustomerTags
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when allCustomerTags is empty', async () => {
      const result = await associationEngine.generateRecommendations(
        100,
        ['高价值客户'],
        new Map()
      );

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const result = await associationEngine.generateRecommendations(
        100,
        ['高价值客户'],
        null as any
      );

      expect(result).toEqual([]);
    });
  });

  describe('mineAssociationRules', () => {
    const mockCustomerTags = new Map<number, string[]>([
      [1, ['A', 'B', 'C']],
      [2, ['A', 'B']],
      [3, ['B', 'C']],
      [4, ['A', 'C']],
      [5, ['B']],
    ]);

    it('should mine association rules from transactions', async () => {
      const rules = await (associationEngine as any).mineAssociationRules(mockCustomerTags);

      expect(Array.isArray(rules)).toBe(true);
      
      if (rules.length > 0) {
        expect(rules[0]).toHaveProperty('antecedent');
        expect(rules[0]).toHaveProperty('consequent');
        expect(rules[0]).toHaveProperty('support');
        expect(rules[0]).toHaveProperty('confidence');
        expect(rules[0]).toHaveProperty('lift');
      }
    });

    it('should return empty array for empty input', async () => {
      const rules = await (associationEngine as any).mineAssociationRules(new Map());

      expect(rules).toEqual([]);
    });
  });

  describe('countCandidates', () => {
    const transactions = [
      ['A', 'B', 'C'],
      ['A', 'B'],
      ['B', 'C'],
      ['A', 'C'],
      ['B'],
    ];

    it('should count 1-itemsets correctly', () => {
      const candidates = [['A'], ['B'], ['C']];
      const counts = (associationEngine as any).countCandidates(transactions, 1, candidates);

      expect(counts.size).toBe(3);
      expect(counts.get('A')).toBe(3);
      expect(counts.get('B')).toBe(4);
      expect(counts.get('C')).toBe(3);
    });

    it('should count 2-itemsets correctly', () => {
      const candidates = [['A', 'B'], ['B', 'C'], ['A', 'C']];
      const counts = (associationEngine as any).countCandidates(transactions, 2, candidates);

      expect(counts.size).toBe(3);
      expect(counts.get('A,B')).toBe(2);
      expect(counts.get('B,C')).toBe(2);
      expect(counts.get('A,C')).toBe(2);
    });

    it('should handle empty transactions', () => {
      const counts = (associationEngine as any).countCandidates([], 1, [['A']]);

      expect(counts.size).toBe(0);
    });
  });

  describe('filterBySupport', () => {
    const candidateCounts = new Map<string, number>([
      ['A', 10],
      ['B', 20],
      ['C', 5],
      ['D', 15],
    ]);

    it('should filter itemsets by minimum support', () => {
      const totalTransactions = 100;
      const minSupport = 0.1;

      const frequentSets = (associationEngine as any).filterBySupport(
        candidateCounts,
        minSupport,
        totalTransactions
      );

      expect(frequentSets.length).toBe(3); // A, B, D (>= 10%)
      expect(frequentSets.some((s: any) => s.items.includes('C'))).toBe(false); // C < 10%
    });

    it('should return empty array when no candidates meet support threshold', () => {
      const totalTransactions = 100;
      const minSupport = 0.5;

      const frequentSets = (associationEngine as any).filterBySupport(
        candidateCounts,
        minSupport,
        totalTransactions
      );

      expect(frequentSets).toEqual([]);
    });
  });

  describe('generateRulesFromItemSets', () => {
    const frequentItemSets: Array<{ items: string[]; support: number; count: number }> = [
      { items: ['A', 'B'], support: 0.4, count: 4 },
      { items: ['B', 'C'], support: 0.3, count: 3 },
      { items: ['A', 'B', 'C'], support: 0.2, count: 2 },
    ];

    it('should generate association rules from frequent itemsets', async () => {
      const rules = await (associationEngine as any).generateRulesFromItemSets(frequentItemSets);

      expect(Array.isArray(rules)).toBe(true);
      
      if (rules.length > 0) {
        expect(rules[0]).toHaveProperty('antecedent');
        expect(rules[0]).toHaveProperty('consequent');
        expect(rules[0]).toHaveProperty('confidence');
      }
    });

    it('should calculate confidence correctly', async () => {
      const simpleItemSets = [
        { items: ['A', 'B'], support: 0.4, count: 4 },
      ];

      const rules = await (associationEngine as any).generateRulesFromItemSets(simpleItemSets);

      expect(rules.length).toBeGreaterThan(0);
      rules.forEach((rule: any) => {
        expect(rule.confidence).toBeGreaterThanOrEqual(0);
        expect(rule.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('calculateConfidence', () => {
    it('should calculate confidence correctly', () => {
      const antecedentCount = 10;
      const ruleCount = 7;

      const confidence = (associationEngine as any).calculateConfidence(
        antecedentCount,
        ruleCount
      );

      expect(confidence).toBe(0.7);
    });

    it('should handle zero antecedent count', () => {
      const confidence = (associationEngine as any).calculateConfidence(0, 5);

      expect(confidence).toBe(0);
    });
  });

  describe('calculateLift', () => {
    it('should calculate lift correctly', () => {
      const confidence = 0.7;
      const consequentSupport = 0.5;

      const lift = (associationEngine as any).calculateLift(confidence, consequentSupport);

      expect(lift).toBe(1.4);
    });

    it('should handle zero consequent support', () => {
      const lift = (associationEngine as any).calculateLift(0.7, 0);

      expect(lift).toBe(Infinity);
    });
  });

  describe('matchesAntecedent', () => {
    it('should return true when all antecedent items are present', () => {
      const antecedent = ['A', 'B'];
      const existingTags = ['A', 'B', 'C', 'D'];

      expect((associationEngine as any).matchesAntecedent(antecedent, existingTags)).toBe(true);
    });

    it('should return false when some antecedent items are missing', () => {
      const antecedent = ['A', 'B', 'E'];
      const existingTags = ['A', 'B', 'C', 'D'];

      expect((associationEngine as any).matchesAntecedent(antecedent, existingTags)).toBe(false);
    });

    it('should return true for single item antecedent', () => {
      const antecedent = ['A'];
      const existingTags = ['A', 'B', 'C'];

      expect((associationEngine as any).matchesAntecedent(antecedent, existingTags)).toBe(true);
    });

    it('should return false for empty existing tags', () => {
      const antecedent = ['A', 'B'];
      const existingTags: string[] = [];

      expect((associationEngine as any).matchesAntecedent(antecedent, existingTags)).toBe(false);
    });
  });

  describe('getSubsets', () => {
    it('should generate all non-empty proper subsets', () => {
      const items = ['A', 'B', 'C'];
      const subsets = (associationEngine as any).getSubsets(items);

      expect(subsets.length).toBe(6); // [A], [B], [C], [A,B], [A,C], [B,C]
      expect(subsets.some((s: string[]) => s.length === 0)).toBe(false);
      expect(subsets.some((s: string[]) => s.length === items.length)).toBe(false);
    });

    it('should return empty array for single item', () => {
      const items = ['A'];
      const subsets = (associationEngine as any).getSubsets(items);

      expect(subsets).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      const subsets = (associationEngine as any).getSubsets([]);

      expect(subsets).toEqual([]);
    });
  });

  describe('algorithm parameters', () => {
    it('should have default minSupport of 0.01', () => {
      expect((associationEngine as any).minSupport).toBe(0.01);
    });

    it('should have default minConfidence of 0.6', () => {
      expect((associationEngine as any).minConfidence).toBe(0.6);
    });

    it('should have default minLift of 1.2', () => {
      expect((associationEngine as any).minLift).toBe(1.2);
    });
  });
});
