import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RuleEngineService, CustomerData } from './rule-engine.service';
import { RecommendationRule } from '../entities/recommendation-rule.entity';

describe('RuleEngineService', () => {
  let ruleEngine: RuleEngineService;
  let ruleRepo: Repository<RecommendationRule>;

  const mockRuleRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleEngineService,
        {
          provide: getRepositoryToken(RecommendationRule),
          useValue: mockRuleRepo,
        },
      ],
    }).compile();

    ruleEngine = module.get<RuleEngineService>(RuleEngineService);
    ruleRepo = module.get<Repository<RecommendationRule>>(getRepositoryToken(RecommendationRule));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(ruleEngine).toBeDefined();
  });

  describe('loadActiveRules', () => {
    it('should return active rules ordered by priority', async () => {
      const mockRules: Partial<RecommendationRule>[] = [
        { id: 1, ruleName: 'High Priority', priority: 90, isActive: true },
        { id: 2, ruleName: 'Medium Priority', priority: 70, isActive: true },
        { id: 3, ruleName: 'Low Priority', priority: 50, isActive: true },
      ];

      mockRuleRepo.find.mockResolvedValue(mockRules as RecommendationRule[]);

      const result = await ruleEngine.loadActiveRules();

      expect(result).toHaveLength(3);
      expect(ruleRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { priority: 'DESC' },
      });
    });

    it('should return empty array when no active rules', async () => {
      mockRuleRepo.find.mockResolvedValue([]);

      const result = await ruleEngine.loadActiveRules();

      expect(result).toHaveLength(0);
    });
  });

  describe('generateRecommendations', () => {
    const mockCustomer: CustomerData = {
      id: 1,
      totalAssets: 1500000,
      monthlyIncome: 60000,
      lastLoginDays: 5,
      orderCount: 15,
      productCount: 4,
      age: 32,
      registerDays: 300,
    };

    it('should generate recommendations for matching rules', async () => {
      const mockRules: Partial<RecommendationRule>[] = [
        {
          id: 1,
          ruleName: '高价值客户识别',
          ruleExpression: 'totalAssets >= 1000000 AND monthlyIncome >= 50000',
          priority: 95,
          tagTemplate: { name: '高价值客户', category: '客户价值', baseConfidence: 0.9 },
          isActive: true,
        },
      ];

      mockRuleRepo.find.mockResolvedValue(mockRules as RecommendationRule[]);

      const result = await ruleEngine.generateRecommendations(mockCustomer);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        customerId: 1,
        tagName: '高价值客户',
        tagCategory: '客户价值',
        source: 'rule',
      });
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should filter out recommendations with confidence < 0.6', async () => {
      const mockRules: Partial<RecommendationRule>[] = [
        {
          id: 1,
          ruleName: 'Low Confidence Rule',
          ruleExpression: 'orderCount >= 10',
          priority: 30,
          tagTemplate: { name: 'Low Confidence Tag', category: 'Test', baseConfidence: 0.5 },
          isActive: true,
        },
      ];

      mockRuleRepo.find.mockResolvedValue(mockRules as RecommendationRule[]);

      const result = await ruleEngine.generateRecommendations(mockCustomer);

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no rules match', async () => {
      const mockRules: Partial<RecommendationRule>[] = [
        {
          id: 1,
          ruleName: 'Unmatched Rule',
          ruleExpression: 'totalAssets >= 5000000',
          priority: 80,
          tagTemplate: { name: 'Unmatched Tag', category: 'Test', baseConfidence: 0.8 },
          isActive: true,
        },
      ];

      mockRuleRepo.find.mockResolvedValue(mockRules as RecommendationRule[]);

      const result = await ruleEngine.generateRecommendations(mockCustomer);

      expect(result).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      mockRuleRepo.find.mockRejectedValue(new Error('Database error'));

      const result = await ruleEngine.generateRecommendations(mockCustomer);

      expect(result).toHaveLength(0);
    });
  });

  describe('evaluateRule - condition parsing', () => {
    const testCases = [
      {
        name: 'greater than operator',
        expression: 'totalAssets >= 1000000',
        customer: { id: 1, totalAssets: 1500000 } as CustomerData,
        shouldMatch: true,
      },
      {
        name: 'less than operator',
        expression: 'age <= 35',
        customer: { id: 1, age: 32 } as CustomerData,
        shouldMatch: true,
      },
      {
        name: 'equality operator',
        expression: 'riskLevel == high',
        customer: { id: 1, riskLevel: 'high' } as CustomerData,
        shouldMatch: true,
      },
      {
        name: 'inequality operator',
        expression: 'gender != male',
        customer: { id: 1, gender: 'female' } as CustomerData,
        shouldMatch: true,
      },
      {
        name: 'AND logic - all conditions must match',
        expression: 'totalAssets >= 1000000 AND monthlyIncome >= 50000',
        customer: { id: 1, totalAssets: 1500000, monthlyIncome: 60000 } as CustomerData,
        shouldMatch: true,
      },
      {
        name: 'AND logic - one condition fails',
        expression: 'totalAssets >= 1000000 AND monthlyIncome >= 50000',
        customer: { id: 1, totalAssets: 1500000, monthlyIncome: 40000 } as CustomerData,
        shouldMatch: false,
      },
    ];

    it.each(testCases)('$name', async ({ expression, customer, shouldMatch }) => {
      const mockRule: Partial<RecommendationRule> = {
        id: 1,
        ruleName: 'Test Rule',
        ruleExpression: expression,
        priority: 80,
        tagTemplate: { name: 'Test Tag', category: 'Test', baseConfidence: 0.8 },
        isActive: true,
      };

      mockRuleRepo.find.mockResolvedValue([mockRule] as RecommendationRule[]);

      const result = await ruleEngine.generateRecommendations(customer);

      if (shouldMatch) {
        expect(result).toHaveLength(1);
      } else {
        expect(result).toHaveLength(0);
      }
    });
  });

  describe('calculateConfidence', () => {
    it('should increase confidence for high priority rules', async () => {
      const mockRule: Partial<RecommendationRule> = {
        id: 1,
        ruleName: 'High Priority Rule',
        ruleExpression: 'totalAssets >= 1000000',
        priority: 95,
        tagTemplate: { name: 'High Priority Tag', category: 'Test', baseConfidence: 0.8 },
        isActive: true,
      };

      mockRuleRepo.find.mockResolvedValue([mockRule] as RecommendationRule[]);

      const customer = { id: 1, totalAssets: 1500000 } as CustomerData;
      const result = await ruleEngine.generateRecommendations(customer);

      expect(result[0].confidence).toBeGreaterThan(0.8);
    });

    it('should cap confidence at 1.0', async () => {
      const mockRule: Partial<RecommendationRule> = {
        id: 1,
        ruleName: 'Max Confidence Rule',
        ruleExpression: 'totalAssets >= 1000000',
        priority: 95,
        tagTemplate: { name: 'Max Tag', category: 'Test', baseConfidence: 0.95 },
        isActive: true,
      };

      mockRuleRepo.find.mockResolvedValue([mockRule] as RecommendationRule[]);

      const customer = { id: 1, totalAssets: 1500000 } as CustomerData;
      const result = await ruleEngine.generateRecommendations(customer);

      expect(result[0].confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('inferCategory', () => {
    it('should infer category from rule name containing "价值"', async () => {
      const mockRule: Partial<RecommendationRule> = {
        id: 1,
        ruleName: '客户价值评估规则',
        ruleExpression: 'totalAssets >= 100000',
        priority: 70,
        isActive: true,
      };

      mockRuleRepo.find.mockResolvedValue([mockRule] as RecommendationRule[]);
      const customer = { id: 1, totalAssets: 150000 } as CustomerData;
      const result = await ruleEngine.generateRecommendations(customer);

      expect(result[0].tagCategory).toBe('客户价值');
    });

    it('should infer category from rule name containing "流失"', async () => {
      const mockRule: Partial<RecommendationRule> = {
        id: 1,
        ruleName: '流失风险检测',
        ruleExpression: 'lastLoginDays >= 30',
        priority: 70,
        isActive: true,
      };

      mockRuleRepo.find.mockResolvedValue([mockRule] as RecommendationRule[]);
      const customer = { id: 1, lastLoginDays: 35 } as CustomerData;
      const result = await ruleEngine.generateRecommendations(customer);

      expect(result[0].tagCategory).toBe('风险预警');
    });

    it('should default to "智能推荐" for unknown categories', async () => {
      const mockRule: Partial<RecommendationRule> = {
        id: 1,
        ruleName: 'Generic Rule',
        ruleExpression: 'orderCount >= 5',
        priority: 70,
        isActive: true,
      };

      mockRuleRepo.find.mockResolvedValue([mockRule] as RecommendationRule[]);
      const customer = { id: 1, orderCount: 10 } as CustomerData;
      const result = await ruleEngine.generateRecommendations(customer);

      expect(result[0].tagCategory).toBe('智能推荐');
    });
  });

  describe('createPredefinedRules', () => {
    it('should create predefined rules if they do not exist', async () => {
      mockRuleRepo.findOne.mockResolvedValue(null);
      mockRuleRepo.create.mockImplementation((data) => data);
      mockRuleRepo.save.mockResolvedValue({ id: 1 });

      await ruleEngine.createPredefinedRules();

      expect(mockRuleRepo.findOne).toHaveBeenCalledTimes(5);
      expect(mockRuleRepo.create).toHaveBeenCalledTimes(5);
      expect(mockRuleRepo.save).toHaveBeenCalledTimes(5);
    });

    it('should skip creating rules that already exist', async () => {
      mockRuleRepo.findOne.mockResolvedValue({ id: 1, ruleName: '高价值客户识别' });

      await ruleEngine.createPredefinedRules();

      expect(mockRuleRepo.create).not.toHaveBeenCalled();
      expect(mockRuleRepo.save).not.toHaveBeenCalled();
    });
  });
});
