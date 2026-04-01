import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RuleEngineService } from './rule-engine.service';
import { RuleParser } from './rule-parser';
import { RuleEvaluator } from './rule-evaluator';
import { RecommendationRule } from '../entities/recommendation-rule.entity';

describe('RuleEngineService', () => {
  let service: RuleEngineService;
  let mockRuleRepo: Partial<Repository<RecommendationRule>>;
  let mockParser: Partial<RuleParser>;
  let mockEvaluator: Partial<RuleEvaluator>;

  beforeEach(async () => {
    // Mock Repository
    mockRuleRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      findAndCount: jest.fn(),
    };

    // Mock Parser
    mockParser = {
      parse: jest.fn(),
    };

    // Mock Evaluator
    mockEvaluator = {
      evaluateExpression: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleEngineService,
        {
          provide: getRepositoryToken(RecommendationRule),
          useValue: mockRuleRepo,
        },
        {
          provide: RuleParser,
          useValue: mockParser,
        },
        {
          provide: RuleEvaluator,
          useValue: mockEvaluator,
        },
      ],
    }).compile();

    service = module.get<RuleEngineService>(RuleEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loadActiveRules', () => {
    it('should return active rules ordered by priority', async () => {
      const mockRules = [
        { id: 1, ruleName: 'High Value', priority: 90, isActive: true },
        { id: 2, ruleName: 'Medium Value', priority: 70, isActive: true },
      ];

      (mockRuleRepo.find as jest.Mock).mockResolvedValue(mockRules);

      const result = await service.loadActiveRules();

      expect(result).toEqual(mockRules);
      expect(mockRuleRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { priority: 'DESC' },
      });
    });

    it('should return empty array when no active rules', async () => {
      (mockRuleRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.loadActiveRules();

      expect(result).toEqual([]);
    });
  });

  describe('generateRecommendations', () => {
    const mockCustomer = {
      id: 1,
      totalAssets: 100000,
      monthlyIncome: 15000,
      annualSpend: 50000,
      lastLoginDays: 3,
      registerDays: 365,
      orderCount: 50,
      productCount: 20,
      riskLevel: 'medium',
      age: 35,
      gender: 'male',
      city: 'Shanghai',
      membershipLevel: 'gold',
    };

    it('should generate recommendations for matching rules', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: '高价值客户规则',
          priority: 90,
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [
              { field: 'totalAssets', operator: '>', value: 50000 },
            ],
          }),
          tagTemplate: ['高价值客户'],
          isActive: true,
        },
      ];

      (mockRuleRepo.find as jest.Mock).mockResolvedValue(mockRules);
      (mockParser.parse as jest.Mock).mockReturnValue({
        operator: 'AND',
        conditions: [{ field: 'totalAssets', operator: '>', value: 50000 }],
      });
      (mockEvaluator.evaluateExpression as jest.Mock).mockReturnValue({
        matched: true,
        confidence: 0.95,
      });

      const result = await service.generateRecommendations(mockCustomer);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        customerId: mockCustomer.id,
        tagName: '高价值客户',
        tagCategory: 'value',
        confidence: 0.95,
        source: 'rule',
      });
      expect(result[0].reason).toContain('规则匹配');
      expect(result[0].reason).toContain('高价值客户规则');
    });

    it('should skip rules with confidence below threshold', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'Low Confidence Rule',
          priority: 50,
          ruleExpression: JSON.stringify({
            operator: 'AND',
            conditions: [],
          }),
          tagTemplate: ['Test Tag'],
          isActive: true,
        },
      ];

      (mockRuleRepo.find as jest.Mock).mockResolvedValue(mockRules);
      (mockParser.parse as jest.Mock).mockReturnValue({ operator: 'AND', conditions: [] });
      (mockEvaluator.evaluateExpression as jest.Mock).mockReturnValue({
        matched: true,
        confidence: 0.4, // Below threshold
      });

      const result = await service.generateRecommendations(mockCustomer);

      expect(result).toHaveLength(0);
    });

    it('should handle malformed rule expressions gracefully', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'Invalid Rule',
          priority: 50,
          ruleExpression: 'invalid-json',
          tagTemplate: ['Test Tag'],
          isActive: true,
        },
      ];

      (mockRuleRepo.find as jest.Mock).mockResolvedValue(mockRules);

      const result = await service.generateRecommendations(mockCustomer);

      expect(result).toEqual([]);
    });

    it('should infer correct category from rule name', async () => {
      const testCases = [
        { name: '高价值客户', expected: 'value' },
        { name: '流失风险预警', expected: 'risk' },
        { name: '潜力客户挖掘', expected: 'potential' },
        { name: '活跃客户', expected: 'activity' },
        { name: '新客注册礼', expected: 'new_customer' },
        { name: '普通规则', expected: undefined },
      ];

      for (const testCase of testCases) {
        const mockRules = [
          {
            id: 1,
            ruleName: testCase.name,
            priority: 50,
            ruleExpression: JSON.stringify({ operator: 'AND', conditions: [] }),
            tagTemplate: ['Test Tag'],
            isActive: true,
          },
        ];

        (mockRuleRepo.find as jest.Mock).mockResolvedValue(mockRules);
        (mockParser.parse as jest.Mock).mockReturnValue({ operator: 'AND', conditions: [] });
        (mockEvaluator.evaluateExpression as jest.Mock).mockReturnValue({
          matched: true,
          confidence: 0.8,
        });

        const result = await service.generateRecommendations(mockCustomer);

        expect(result[0].tagCategory).toBe(testCase.expected);
      }
    });

    it('should cap confidence at 0.9999', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'Perfect Match',
          priority: 90,
          ruleExpression: JSON.stringify({ operator: 'AND', conditions: [] }),
          tagTemplate: ['Perfect Tag'],
          isActive: true,
        },
      ];

      (mockRuleRepo.find as jest.Mock).mockResolvedValue(mockRules);
      (mockParser.parse as jest.Mock).mockReturnValue({ operator: 'AND', conditions: [] });
      (mockEvaluator.evaluateExpression as jest.Mock).mockReturnValue({
        matched: true,
        confidence: 1.5, // Above max
      });

      const result = await service.generateRecommendations(mockCustomer);

      expect(result[0].confidence).toBe(0.9999);
    });

    it('should handle evaluation errors gracefully', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'Error Rule',
          priority: 50,
          ruleExpression: JSON.stringify({ operator: 'AND', conditions: [] }),
          tagTemplate: ['Test Tag'],
          isActive: true,
        },
      ];

      (mockRuleRepo.find as jest.Mock).mockResolvedValue(mockRules);
      (mockParser.parse as jest.Mock).mockImplementation(() => {
        throw new Error('Evaluation error');
      });

      const result = await service.generateRecommendations(mockCustomer);

      expect(result).toEqual([]);
    });
  });

  describe('getRules', () => {
    it('should return paginated rules', async () => {
      const mockRules = [
        { id: 1, ruleName: 'Rule 1', priority: 90 },
        { id: 2, ruleName: 'Rule 2', priority: 80 },
      ];

      (mockRuleRepo.findAndCount as jest.Mock).mockResolvedValue([mockRules, 50]);

      const result = await service.getRules({ page: 1, limit: 20 });

      expect(result).toEqual({
        data: mockRules,
        total: 50,
        page: 1,
        limit: 20,
      });
      expect(mockRuleRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { priority: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by isActive status', async () => {
      (mockRuleRepo.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

      await service.getRules({ page: 1, limit: 20, isActive: true });

      expect(mockRuleRepo.findAndCount).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { priority: 'DESC' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('getRuleById', () => {
    it('should return rule by id', async () => {
      const mockRule = { id: 1, ruleName: 'Test Rule' };

      (mockRuleRepo.findOne as jest.Mock).mockResolvedValue(mockRule);

      const result = await service.getRuleById(1);

      expect(result).toEqual(mockRule);
      expect(mockRuleRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when rule not found', async () => {
      (mockRuleRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getRuleById(999)).rejects.toThrow(NotFoundException);
      await expect(service.getRuleById(999)).rejects.toThrow('规则 999 不存在');
    });
  });

  describe('createRule', () => {
    const createRuleDto = {
      ruleName: 'New Rule',
      description: 'Test rule',
      ruleExpression: JSON.stringify({ operator: 'AND' as const, conditions: [] }),
      priority: 50,
      tagTemplate: ['Test Tag'],
      isActive: true,
    };

    it('should create rule successfully', async () => {
      (mockRuleRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockParser.parse as jest.Mock).mockReturnValue({ operator: 'AND', conditions: [] });
      (mockRuleRepo.create as jest.Mock).mockReturnValue({ id: 1, ...createRuleDto });
      (mockRuleRepo.save as jest.Mock).mockResolvedValue({ id: 1, ...createRuleDto });

      const result = await service.createRule(createRuleDto);

      expect(result).toEqual({ id: 1, ...createRuleDto });
      expect(mockRuleRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when rule name exists', async () => {
      (mockRuleRepo.findOne as jest.Mock).mockResolvedValue({ id: 1, ruleName: 'Existing Rule' });

      await expect(service.createRule(createRuleDto)).rejects.toThrow(BadRequestException);
      await expect(service.createRule(createRuleDto)).rejects.toThrow('规则名称 "New Rule" 已存在');
    });

    it('should throw BadRequestException when expression is invalid', async () => {
      (mockRuleRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockParser.parse as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid expression');
      });

      await expect(service.createRule(createRuleDto)).rejects.toThrow(BadRequestException);
      await expect(service.createRule(createRuleDto)).rejects.toThrow('规则表达式无效');
    });
  });

  describe('updateRule', () => {
    const updateRuleDto = {
      ruleName: 'Updated Rule',
      description: 'Updated description',
      priority: 80,
    };

    it('should update rule successfully', async () => {
      const existingRule = { id: 1, ruleName: 'Old Rule', priority: 50 };
      const updatedRule = { ...existingRule, ...updateRuleDto };

      (mockRuleRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(existingRule)
        .mockResolvedValueOnce(null); // Check for duplicate name
      (mockRuleRepo.save as jest.Mock).mockResolvedValue(updatedRule);

      const result = await service.updateRule(1, updateRuleDto);

      expect(result).toEqual(updatedRule);
      expect(mockRuleRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when rule not found', async () => {
      (mockRuleRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.updateRule(999, updateRuleDto)).rejects.toThrow(NotFoundException);
    });

    it('should validate new expression if provided', async () => {
      const existingRule = { id: 1, ruleName: 'Old Rule' };
      const dtoWithExpression = { ...updateRuleDto, ruleExpression: JSON.stringify({ operator: 'AND', conditions: [] }) };

      (mockRuleRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(existingRule)
        .mockResolvedValueOnce(null);
      (mockParser.parse as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid expression');
      });

      await expect(service.updateRule(1, dtoWithExpression)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteRule', () => {
    it('should delete rule successfully', async () => {
      const mockRule = { id: 1, ruleName: 'Test Rule' };

      (mockRuleRepo.findOne as jest.Mock).mockResolvedValue(mockRule);
      (mockRuleRepo.remove as jest.Mock).mockResolvedValue(mockRule);

      await service.deleteRule(1);

      expect(mockRuleRepo.remove).toHaveBeenCalledWith(mockRule);
    });

    it('should throw NotFoundException when rule not found', async () => {
      (mockRuleRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteRule(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateRule', () => {
    it('should activate rule', async () => {
      const mockRule = { id: 1, ruleName: 'Test Rule', isActive: false };
      const activatedRule = { ...mockRule, isActive: true };

      (mockRuleRepo.findOne as jest.Mock).mockResolvedValue(mockRule);
      (mockRuleRepo.save as jest.Mock).mockResolvedValue(activatedRule);

      const result = await service.activateRule(1);

      expect(result.isActive).toBe(true);
      expect(mockRuleRepo.save).toHaveBeenCalledWith(mockRule);
    });
  });

  describe('deactivateRule', () => {
    it('should deactivate rule', async () => {
      const mockRule = { id: 1, ruleName: 'Test Rule', isActive: true };
      const deactivatedRule = { ...mockRule, isActive: false };

      (mockRuleRepo.findOne as jest.Mock).mockResolvedValue(mockRule);
      (mockRuleRepo.save as jest.Mock).mockResolvedValue(deactivatedRule);

      const result = await service.deactivateRule(1);

      expect(result.isActive).toBe(false);
    });
  });

  describe('testRule', () => {
    it('should test rule expression with customer data', async () => {
      const expression = { operator: 'AND', conditions: [] };
      const customerData = { totalAssets: 100000 };

      (mockParser.parse as jest.Mock).mockReturnValue({ operator: 'AND', conditions: [] });
      (mockEvaluator.evaluateExpression as jest.Mock).mockReturnValue({
        matched: true,
        confidence: 0.85,
      });

      const result = await service.testRule(expression, customerData);

      expect(result).toEqual({
        matched: true,
        confidence: 0.85,
        expression,
        customerData,
      });
    });

    it('should throw BadRequestException on invalid expression', async () => {
      (mockParser.parse as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid expression');
      });

      await expect(service.testRule({}, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('importRules', () => {
    it('should import new rules successfully', async () => {
      const rulesToImport = [
        {
          ruleName: 'Rule 1',
          description: 'Description 1',
          ruleExpression: JSON.stringify({ operator: 'AND', conditions: [] }),
          priority: 50,
          tagTemplate: ['Tag 1'],
          isActive: true,
        },
        {
          ruleName: 'Rule 2',
          description: 'Description 2',
          ruleExpression: JSON.stringify({ operator: 'OR', conditions: [] }),
          priority: 60,
          tagTemplate: ['Tag 2'],
          isActive: false,
        },
      ];

      (mockRuleRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockRuleRepo.create as jest.Mock).mockImplementation((data) => data);
      (mockRuleRepo.save as jest.Mock).mockResolvedValue({});

      const count = await service.importRules(rulesToImport);

      expect(count).toBe(2);
      expect(mockRuleRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should skip existing rules', async () => {
      const rulesToImport = [
        {
          ruleName: 'Existing Rule',
          description: 'Desc',
          ruleExpression: '{}',
          priority: 50,
          tagTemplate: ['Tag'],
          isActive: true,
        },
      ];

      (mockRuleRepo.findOne as jest.Mock).mockResolvedValue({ id: 1, ruleName: 'Existing Rule' });

      const count = await service.importRules(rulesToImport);

      expect(count).toBe(0);
    });

    it('should handle mixed existing and new rules', async () => {
      const rulesToImport = [
        { ruleName: 'Existing', description: '', ruleExpression: '{}', priority: 50, tagTemplate: [], isActive: true },
        { ruleName: 'New', description: '', ruleExpression: '{}', priority: 50, tagTemplate: [], isActive: true },
      ];

      (mockRuleRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ id: 1 }) // Existing
        .mockResolvedValueOnce(null); // New
      
      (mockRuleRepo.create as jest.Mock).mockImplementation((data) => data);
      (mockRuleRepo.save as jest.Mock).mockResolvedValue({});

      const count = await service.importRules(rulesToImport);

      expect(count).toBe(1);
    });
  });

  describe('exportRules', () => {
    it('should export all rules', async () => {
      const mockRules = [
        {
          id: 1,
          ruleName: 'Rule 1',
          description: 'Desc 1',
          ruleExpression: '{}',
          priority: 90,
          tagTemplate: ['Tag 1'],
          isActive: true,
        },
        {
          id: 2,
          ruleName: 'Rule 2',
          description: 'Desc 2',
          ruleExpression: '{}',
          priority: 80,
          tagTemplate: ['Tag 2'],
          isActive: false,
        },
      ];

      (mockRuleRepo.find as jest.Mock).mockResolvedValue(mockRules);

      const result = await service.exportRules();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ruleName: 'Rule 1',
        description: 'Desc 1',
        ruleExpression: '{}',
        priority: 90,
        tagTemplate: ['Tag 1'],
        isActive: true,
      });
    });

    it('should return empty array when no rules', async () => {
      (mockRuleRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.exportRules();

      expect(result).toEqual([]);
    });
  });
});
