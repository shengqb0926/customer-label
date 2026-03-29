import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RuleEngineService } from './rule-engine.service';
import { RuleEngine } from '../engines/rule-engine';
import { RecommendationRule } from '../entities/recommendation-rule.entity';
import { TagRecommendation } from '../entities/tag-recommendation.entity';
import { CreateRuleDto } from '../dto/create-rule.dto';

describe('RuleEngineService', () => {
  let service: RuleEngineService;
  let ruleEngine: RuleEngine;
  let ruleRepository: Repository<RecommendationRule>;
  let recommendationRepository: Repository<TagRecommendation>;

  const mockRuleEngine = {
    recommend: jest.fn(),
    evaluateSingleExpression: jest.fn(),
  };

  const mockRuleRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockRecommendationRepository = {
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleEngineService,
        {
          provide: RuleEngine,
          useValue: mockRuleEngine,
        },
        {
          provide: getRepositoryToken(RecommendationRule),
          useValue: mockRuleRepository,
        },
        {
          provide: getRepositoryToken(TagRecommendation),
          useValue: mockRecommendationRepository,
        },
      ],
    }).compile();

    service = module.get<RuleEngineService>(RuleEngineService);
    ruleEngine = module.get<RuleEngine>(RuleEngine);
    ruleRepository = module.get<Repository<RecommendationRule>>(getRepositoryToken(RecommendationRule));
    recommendationRepository = module.get<Repository<TagRecommendation>>(getRepositoryToken(TagRecommendation));
  });

  it('应被定义', () => {
    expect(service).toBeDefined();
  });

  describe('testRule()', () => {
    it('应返回成功的测试结果', async () => {
      const expression = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: '>=', value: 18 }],
      };
      const customerData = { age: 25 };

      mockRuleEngine.evaluateSingleExpression.mockResolvedValue({
        matched: true,
        confidence: 0.9,
      });

      const result = await service.testRule(expression, customerData);

      expect(result.success).toBe(true);
      expect(result.matched).toBe(true);
      expect(result.confidence).toBe(0.9);
      expect(result.executionTime).toBeDefined();
    });

    it('应返回失败的测试结果（表达式错误）', async () => {
      const expression = { operator: 'INVALID' };
      const customerData = { age: 25 };

      mockRuleEngine.evaluateSingleExpression.mockRejectedValue(new Error('无效的运算符'));

      const result = await service.testRule(expression, customerData);

      expect(result.success).toBe(false);
      expect(result.matched).toBe(false);
      expect(result.error).toContain('无效的运算符');
    });
  });

  describe('getRules()', () => {
    it('应返回规则列表', async () => {
      const mockRules = [
        { id: 1, name: '规则 1', priority: 90 },
        { id: 2, name: '规则 2', priority: 80 },
      ];

      mockRuleRepository.findAndCount.mockResolvedValue([mockRules, 2]);

      const result = await service.getRules({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });
  });

  describe('createRule()', () => {
    it('应创建新规则', async () => {
      const dto: CreateRuleDto = {
        ruleName: '新规则',
        description: '测试规则',
        ruleExpression: JSON.stringify({ operator: 'AND', conditions: [] }),
        priority: 80,
        tagTemplate: ['标签 1'],
        isActive: true,
      };

      const createdRule = { ...dto, id: 1, ruleName: '新规则' };

      mockRuleRepository.findOne.mockResolvedValue(null); // 不存在同名规则
      mockRuleRepository.create.mockReturnValue(createdRule);
      mockRuleRepository.save.mockResolvedValue(createdRule);

      const result = await service.createRule(dto);

      expect(result.ruleName).toBe('新规则');
      expect(mockRuleRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRuleRepository.save).toHaveBeenCalled();
    });

    it('应拒绝重复的规则名称', async () => {
      const dto: CreateRuleDto = {
        ruleName: '已存在规则',
        description: '测试',
        ruleExpression: JSON.stringify({ operator: 'AND', conditions: [] }),
        priority: 80,
        tagTemplate: ['标签'],
        isActive: true,
      };

      mockRuleRepository.findOne.mockResolvedValue({ id: 1, ruleName: '已存在规则' });

      await expect(service.createRule(dto)).rejects.toThrow('已存在');
    });
  });

  describe('activateRule() / deactivateRule()', () => {
    it('应激活规则', async () => {
      const rule = { id: 1, name: '规则', isActive: false };
      
      mockRuleRepository.findOne.mockResolvedValue(rule);
      mockRuleRepository.save.mockResolvedValue({ ...rule, isActive: true });

      const result = await service.activateRule(1);

      expect(result.isActive).toBe(true);
    });

    it('应停用规则', async () => {
      const rule = { id: 1, name: '规则', isActive: true };
      
      mockRuleRepository.findOne.mockResolvedValue(rule);
      mockRuleRepository.save.mockResolvedValue({ ...rule, isActive: false });

      const result = await service.deactivateRule(1);

      expect(result.isActive).toBe(false);
    });
  });

  describe('deleteRule()', () => {
    it('应删除规则', async () => {
      const rule = { id: 1, name: '规则' };
      
      mockRuleRepository.findOne.mockResolvedValue(rule);
      mockRuleRepository.remove.mockResolvedValue(undefined);

      await expect(service.deleteRule(1)).resolves.not.toThrow();
      expect(mockRuleRepository.remove).toHaveBeenCalledWith(rule);
    });
  });
});
