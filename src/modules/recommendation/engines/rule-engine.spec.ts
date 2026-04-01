import { RuleEngine } from './rule-engine';
import { RuleEvaluator } from './rule-evaluator';
import { RecommendationRule } from '../entities/recommendation-rule.entity';
import { TagRecommendation, RecommendationStatus } from '../entities/tag-recommendation.entity';
import { Repository } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;
  let evaluator: RuleEvaluator;
  let ruleRepository: jest.Mocked<Repository<RecommendationRule>>;
  let recommendationRepository: jest.Mocked<Repository<TagRecommendation>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleEngine,
        RuleEvaluator,
        {
          provide: getRepositoryToken(RecommendationRule),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TagRecommendation),
          useValue: {
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: RuleEvaluator,
          useValue: {
            evaluateExpression: jest.fn(),
          },
        },
      ],
    }).compile();

    ruleEngine = module.get<RuleEngine>(RuleEngine);
    evaluator = module.get<RuleEvaluator>(RuleEvaluator);
    ruleRepository = module.get(getRepositoryToken(RecommendationRule));
    recommendationRepository = module.get(getRepositoryToken(TagRecommendation));

    jest.clearAllMocks();
  });

  describe('recommend', () => {
    it('should return empty array when no active rules', async () => {
      ruleRepository.find.mockResolvedValue([]);

      const customer = { id: 1, name: 'Test Customer' };
      const result = await ruleEngine.recommend(customer);

      expect(result).toEqual([]);
      expect(ruleRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { priority: 'DESC' },
      });
    });

    it('should generate recommendations for matching rules', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'High Value Customer',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [
              { field: 'totalOrders', operator: '>=', value: 10 },
            ],
          }),
          description: 'Customer with high order volume',
          tagTemplate: { name: '高价值客户', category: '价值标签' },
          priority: 1,
          isActive: true,
          hitCount: 0,
        },
      ];

      ruleRepository.find.mockResolvedValue(mockRules as any);
      (evaluator.evaluateExpression as jest.Mock).mockReturnValue({
        matched: true,
        confidence: 0.95,
        matchedConditions: 1,
        totalConditions: 1,
      });

      const mockSavedRec = { 
        id: 1, 
        customerId: 1, 
        tagName: '高价值客户', 
        confidence: 0.95,
        source: 'rule',
        status: RecommendationStatus.PENDING
      };
      recommendationRepository.create.mockReturnValue(mockSavedRec as any);
      recommendationRepository.save.mockResolvedValue([mockSavedRec] as any);
      ruleRepository.save.mockResolvedValue(mockRules as any);

      const customer = { id: 1, totalOrders: 15 };
      const result = await ruleEngine.recommend(customer);

      expect(result).toHaveLength(1);
      expect(result[0].tagName).toBe('高价值客户');
      expect(result[0].confidence).toBe(0.95);
      expect(result[0].source).toBe('rule');
      expect(result[0].status).toBe(RecommendationStatus.PENDING);
      
      expect(ruleRepository.save).toHaveBeenCalled();
      expect(recommendationRepository.save).toHaveBeenCalled();
    });

    it('should handle multiple matching rules', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'Rule 1',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'age', operator: '>', value: 30 }],
          }),
          tagTemplate: { name: '成熟客户', category: '基础标签' },
          priority: 1,
          isActive: true,
          hitCount: 0,
        },
        {
          id: 2,
          ruleName: 'Rule 2',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'totalSpent', operator: '>=', value: 1000 }],
          }),
          tagTemplate: { name: '高消费客户', category: '价值标签' },
          priority: 2,
          isActive: true,
          hitCount: 0,
        },
      ];

      ruleRepository.find.mockResolvedValue(mockRules as any);
      (evaluator.evaluateExpression as jest.Mock)
        .mockReturnValueOnce({ matched: true, confidence: 1, matchedConditions: 1, totalConditions: 1 })
        .mockReturnValueOnce({ matched: true, confidence: 0.9, matchedConditions: 1, totalConditions: 1 });

      recommendationRepository.create.mockImplementation((rec: any) => rec as any);
      recommendationRepository.save.mockResolvedValue([
        { id: 1, customerId: 1, tagName: '成熟客户', confidence: 1 },
        { id: 2, customerId: 1, tagName: '高消费客户', confidence: 0.9 },
      ] as any);
      ruleRepository.save.mockResolvedValue(mockRules as any);

      const customer = { id: 1, age: 35, totalSpent: 1500 };
      const result = await ruleEngine.recommend(customer);

      expect(result).toHaveLength(2);
      expect(ruleRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should skip non-matching rules', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'Rule 1',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'age', operator: '>', value: 50 }],
          }),
          tagTemplate: { name: '老年客户' },
          priority: 1,
          isActive: true,
          hitCount: 0,
        },
      ];

      ruleRepository.find.mockResolvedValue(mockRules as any);
      (evaluator.evaluateExpression as jest.Mock).mockReturnValue({
        matched: false,
        confidence: 0,
      });

      const customer = { id: 1, age: 25 };
      const result = await ruleEngine.recommend(customer);

      expect(result).toEqual([]);
      expect(ruleRepository.save).not.toHaveBeenCalled();
      expect(recommendationRepository.save).not.toHaveBeenCalled();
    });

    it('should handle rule evaluation errors gracefully', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'Invalid Rule',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'age', operator: 'invalid', value: 30 }],
          }),
          tagTemplate: { name: '测试标签' },
          priority: 1,
          isActive: true,
          hitCount: 0,
        },
        {
          id: 2,
          ruleName: 'Valid Rule',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'age', operator: '>', value: 20 }],
          }),
          tagTemplate: { name: '有效标签' },
          priority: 2,
          isActive: true,
          hitCount: 0,
        },
      ];

      ruleRepository.find.mockResolvedValue(mockRules as any);
      (evaluator.evaluateExpression as jest.Mock)
        .mockImplementation(() => {
          throw new Error('Invalid operator');
        });

      const customer = { id: 1, age: 25 };
      const result = await ruleEngine.recommend(customer);

      // 应该继续处理其他规则，不会因为一个错误而中断
      expect(evaluator.evaluateExpression).toHaveBeenCalledTimes(2);
    });

    it('should handle string rule expressions', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'Test Rule',
          ruleExpression: '{"operator":"AND","conditions":[{"field":"age","operator":">","value":30}]}',
          tagTemplate: { name: '测试标签' },
          priority: 1,
          isActive: true,
          hitCount: 0,
        },
      ];

      ruleRepository.find.mockResolvedValue(mockRules as any);
      (evaluator.evaluateExpression as jest.Mock).mockReturnValue({
        matched: true,
        confidence: 1,
      });

      recommendationRepository.create.mockImplementation((rec: any) => rec as any);
      recommendationRepository.save.mockResolvedValue([] as any);
      ruleRepository.save.mockResolvedValue(mockRules as any);

      const customer = { id: 1, age: 35 };
      await ruleEngine.recommend(customer);

      expect(evaluator.evaluateExpression).toHaveBeenCalledWith(
        { operator: 'AND', conditions: [{ field: 'age', operator: '>', value: 30 }] },
        customer
      );
    });

    it('should deduplicate recommendations by tag name', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'Rule 1',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'score', operator: '>=', value: 80 }],
          }),
          tagTemplate: { name: '优质客户', category: '质量标签' },
          priority: 1,
          isActive: true,
          hitCount: 0,
        },
        {
          id: 2,
          ruleName: 'Rule 2',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'orders', operator: '>=', value: 5 }],
          }),
          tagTemplate: { name: '优质客户', category: '质量标签' },
          priority: 2,
          isActive: true,
          hitCount: 0,
        },
      ];

      ruleRepository.find.mockResolvedValue(mockRules as any);
      (evaluator.evaluateExpression as jest.Mock)
        .mockReturnValueOnce({ matched: true, confidence: 0.8, matchedConditions: 1, totalConditions: 1 })
        .mockReturnValueOnce({ matched: true, confidence: 0.95, matchedConditions: 1, totalConditions: 1 });

      recommendationRepository.create.mockImplementation((rec: any) => rec as any);
      recommendationRepository.save.mockResolvedValue([
        { id: 1, customerId: 1, tagName: '优质客户', confidence: 0.8 },
        { id: 2, customerId: 1, tagName: '优质客户', confidence: 0.95 },
      ] as any);
      ruleRepository.save.mockResolvedValue(mockRules as any);

      const customer = { id: 1, score: 85, orders: 10 };
      const result = await ruleEngine.recommend(customer);

      // 应该去重，只保留置信度最高的
      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe(0.95);
    });

    it('should sort recommendations by confidence descending', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'Rule 1',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'a', operator: '>', value: 1 }],
          }),
          tagTemplate: { name: '标签 A' },
          priority: 1,
          isActive: true,
          hitCount: 0,
        },
        {
          id: 2,
          ruleName: 'Rule 2',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'b', operator: '>', value: 2 }],
          }),
          tagTemplate: { name: '标签 B' },
          priority: 2,
          isActive: true,
          hitCount: 0,
        },
        {
          id: 3,
          ruleName: 'Rule 3',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'c', operator: '>', value: 3 }],
          }),
          tagTemplate: { name: '标签 C' },
          priority: 3,
          isActive: true,
          hitCount: 0,
        },
      ];

      ruleRepository.find.mockResolvedValue(mockRules as any);
      (evaluator.evaluateExpression as jest.Mock)
        .mockReturnValueOnce({ matched: true, confidence: 0.7, matchedConditions: 1, totalConditions: 1 })
        .mockReturnValueOnce({ matched: true, confidence: 0.95, matchedConditions: 1, totalConditions: 1 })
        .mockReturnValueOnce({ matched: true, confidence: 0.85, matchedConditions: 1, totalConditions: 1 });

      recommendationRepository.create.mockImplementation((rec: any) => rec as any);
      recommendationRepository.save.mockResolvedValue([
        { id: 1, tagName: '标签 A', confidence: 0.7 },
        { id: 2, tagName: '标签 B', confidence: 0.95 },
        { id: 3, tagName: '标签 C', confidence: 0.85 },
      ] as any);
      ruleRepository.save.mockResolvedValue(mockRules as any);

      const customer = { id: 1, a: 2, b: 3, c: 4 };
      const result = await ruleEngine.recommend(customer);

      // 按置信度降序排序
      expect(result[0].confidence).toBe(0.95);
      expect(result[1].confidence).toBe(0.85);
      expect(result[2].confidence).toBe(0.7);
    });

    it('should handle missing tag template name', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'Test Rule',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'age', operator: '>', value: 30 }],
          }),
          tagTemplate: {},
          priority: 1,
          isActive: true,
          hitCount: 0,
        },
      ];

      ruleRepository.find.mockResolvedValue(mockRules as any);
      (evaluator.evaluateExpression as jest.Mock).mockReturnValue({
        matched: true,
        confidence: 1,
      });

      recommendationRepository.create.mockImplementation((rec: any) => rec as any);
      recommendationRepository.save.mockResolvedValue([] as any);
      ruleRepository.save.mockResolvedValue(mockRules as any);

      const customer = { id: 1, age: 35 };
      await ruleEngine.recommend(customer);

      expect(recommendationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tagName: '未命名标签',
        })
      );
    });

    it('should batch update rule hit counts', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'Rule 1',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'x', operator: '>', value: 10 }],
          }),
          tagTemplate: { name: '标签 1' },
          priority: 1,
          isActive: true,
          hitCount: 5,
        },
        {
          id: 2,
          ruleName: 'Rule 2',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'y', operator: '>', value: 20 }],
          }),
          tagTemplate: { name: '标签 2' },
          priority: 2,
          isActive: true,
          hitCount: 3,
        },
      ];

      ruleRepository.find.mockResolvedValue(mockRules as any);
      (evaluator.evaluateExpression as jest.Mock)
        .mockReturnValue({ matched: true, confidence: 1, matchedConditions: 1, totalConditions: 1 });

      recommendationRepository.create.mockImplementation((rec: any) => rec as any);
      recommendationRepository.save.mockResolvedValue([] as any);
      ruleRepository.save.mockResolvedValue(mockRules as any);

      const customer = { id: 1, x: 15, y: 25 };
      await ruleEngine.recommend(customer);

      expect(ruleRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({ id: 1, hitCount: 6 }),
        expect.objectContaining({ id: 2, hitCount: 4 }),
      ]);
    });
  });

  describe('evaluateSingleExpression', () => {
    it('should evaluate a single expression', async () => {
      const expression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>', value: 30 },
          { field: 'score', operator: '>=', value: 80 },
        ],
      };

      const customerData = { age: 35, score: 85 };
      const expectedResult = { matched: true, confidence: 1, matchedConditions: 2, totalConditions: 2 };

      (evaluator.evaluateExpression as jest.Mock).mockReturnValue(expectedResult);

      const result = await ruleEngine.evaluateSingleExpression(expression, customerData);

      expect(result).toEqual(expectedResult);
      expect(evaluator.evaluateExpression).toHaveBeenCalledWith(expression, customerData);
    });

    it('should handle complex nested expressions', async () => {
      const expression = {
        operator: 'OR',
        conditions: [
          {
            operator: 'AND',
            conditions: [
              { field: 'age', operator: '>', value: 30 },
              { field: 'score', operator: '>=', value: 80 },
            ],
          },
          { field: 'vip', operator: '==', value: true },
        ],
      };

      const customerData = { age: 25, score: 70, vip: true };
      const expectedResult = { matched: true, confidence: 1 };

      (evaluator.evaluateExpression as jest.Mock).mockReturnValue(expectedResult);

      const result = await ruleEngine.evaluateSingleExpression(expression, customerData);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('generateReason (private method)', () => {
    it('should generate reason with matched conditions info', async () => {
      // 通过 recommend 方法间接测试私有方法
      const mockRules = [
        {
          id: 1,
          ruleName: 'Test Rule',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'age', operator: '>', value: 30 }],
          }),
          description: 'Test description',
          tagTemplate: { name: '测试标签' },
          priority: 1,
          isActive: true,
          hitCount: 0,
        },
      ];

      ruleRepository.find.mockResolvedValue(mockRules as any);
      (evaluator.evaluateExpression as jest.Mock).mockReturnValue({
        matched: true,
        confidence: 0.9,
        matchedConditions: 2,
        totalConditions: 3,
      });

      recommendationRepository.create.mockImplementation((rec: any) => rec as any);
      recommendationRepository.save.mockResolvedValue([] as any);
      ruleRepository.save.mockResolvedValue(mockRules as any);

      const customer = { id: 1, age: 35 };
      await ruleEngine.recommend(customer);

      expect(recommendationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: expect.stringContaining('满足规则：Test description (匹配 2/3 个条件)'),
        })
      );
    });

    it('should generate reason without matched conditions info when not available', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'Simple Rule',
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [{ field: 'age', operator: '>', value: 30 }],
          }),
          tagTemplate: { name: '简单标签' },
          priority: 1,
          isActive: true,
          hitCount: 0,
        },
      ];

      ruleRepository.find.mockResolvedValue(mockRules as any);
      (evaluator.evaluateExpression as jest.Mock).mockReturnValue({
        matched: true,
        confidence: 1,
      });

      recommendationRepository.create.mockImplementation((rec: any) => rec as any);
      recommendationRepository.save.mockResolvedValue([] as any);
      ruleRepository.save.mockResolvedValue(mockRules as any);

      const customer = { id: 1, age: 35 };
      await ruleEngine.recommend(customer);

      // 验证原因中包含规则名称而不是 description
      expect(recommendationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: expect.stringContaining('Simple Rule'),
        })
      );
    });
  });
});
