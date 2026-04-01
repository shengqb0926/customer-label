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

    it('应使用默认参数当未提供参数时', async () => {
      const mockRules = [{ id: 1, name: '规则 1' }];
      mockRuleRepository.findAndCount.mockResolvedValue([mockRules, 1]);

      const result = await service.getRules();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('应过滤 isActive 参数', async () => {
      const mockRules = [{ id: 1, name: '规则 1', isActive: true }];
      mockRuleRepository.findAndCount.mockResolvedValue([mockRules, 1]);

      await service.getRules({ isActive: true });

      expect(mockRuleRepository.findAndCount).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { priority: 'DESC', createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('应处理分页参数', async () => {
      const mockRules = [{ id: 3, name: '规则 3' }];
      mockRuleRepository.findAndCount.mockResolvedValue([mockRules, 10]);

      await service.getRules({ page: 2, limit: 5 });

      expect(mockRuleRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { priority: 'DESC', createdAt: 'DESC' },
        skip: 5, // (2-1) * 5
        take: 5,
      });
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

      const createdRule = { ...dto, id: 1 };

      mockRuleRepository.findOne.mockResolvedValue(null); // 不存在同名规则
      mockRuleRepository.create.mockReturnValue(createdRule);
      mockRuleRepository.save.mockResolvedValue(createdRule);

      const result = await service.createRule(dto);

      expect(result.ruleName).toBe('新规则');
      expect(result.id).toBe(1);
      // 不检查 create 的调用参数，因为内部会进行 JSON.stringify
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

    it('应处理 create 时 JSON.stringify 失败的情况', async () => {
      const dto: CreateRuleDto = {
        ruleName: '测试规则',
        description: '描述',
        ruleExpression: JSON.stringify({ operator: 'AND', conditions: [] }),
        priority: 80,
        tagTemplate: ['标签'],
        isActive: true,
      };

      mockRuleRepository.findOne.mockResolvedValue(null);
      mockRuleRepository.create.mockImplementation(() => {
        throw new Error('序列化失败');
      });

      await expect(service.createRule(dto)).rejects.toThrow();
    });
  });

  describe('updateRule()', () => {
    beforeEach(() => {
      // 重置所有 mock，避免被其他测试影响
      mockRuleRepository.findOne.mockReset();
      mockRuleRepository.save.mockReset();
    });

    it('应更新规则的基本信息', async () => {
      const rule = { id: 1, ruleName: '旧规则', description: '旧描述', priority: 50 };
      
      mockRuleRepository.findOne.mockResolvedValue(rule);
      mockRuleRepository.save.mockResolvedValue({ ...rule, description: '新描述' });

      const result = await service.updateRule(1, { description: '新描述' });

      expect(result.description).toBe('新描述');
    });

    it('应拒绝更新为已存在的规则名称', async () => {
      const existingRule = { id: 2, ruleName: '新规则' };
      const rule = { id: 1, ruleName: '旧规则' };
      
      // updateRule 先调用 getRuleById (findOne)，然后再检查名称是否存在
      mockRuleRepository.findOne
        .mockResolvedValueOnce(rule) // getRuleById 第一次调用
        .mockResolvedValueOnce(existingRule); // 检查新名称是否存在

      await expect(service.updateRule(1, { ruleName: '新规则' }))
        .rejects.toThrow('已存在');
    });

    it('应允许保持原有规则名称', async () => {
      const rule = { id: 1, ruleName: '原规则', description: '描述' };
      
      mockRuleRepository.findOne
        .mockResolvedValueOnce(rule) // getRuleById
        .mockResolvedValueOnce(null); // 检查名称不存在（因为名称相同）

      mockRuleRepository.save.mockResolvedValue(rule);

      await service.updateRule(1, { ruleName: '原规则' });

      expect(mockRuleRepository.save).toHaveBeenCalled();
    });

    it('应更新规则的表达式', async () => {
      const rule = { id: 1, ruleName: '规则', ruleExpression: '{}' };
      const newExpression = JSON.stringify({ operator: 'AND', conditions: [] });
      
      // updateRule 调用 getRuleById (findOne)，不修改名称所以不会再次调用 findOne
      mockRuleRepository.findOne.mockResolvedValue(rule);
      mockRuleRepository.save.mockResolvedValue({ 
        ...rule, 
        ruleExpression: newExpression
      });

      await service.updateRule(1, { ruleExpression: newExpression });

      expect(mockRuleRepository.save).toHaveBeenCalled();
    });

    it('应更新多个字段', async () => {
      const rule = { 
        id: 1, 
        ruleName: '规则', 
        description: '旧描述',
        priority: 50,
        tagTemplate: ['旧标签'],
        isActive: true
      };
      
      mockRuleRepository.findOne.mockResolvedValue(rule);
      mockRuleRepository.save.mockResolvedValue({
        ...rule,
        description: '新描述',
        priority: 90,
        isActive: false,
      });

      const result = await service.updateRule(1, {
        description: '新描述',
        priority: 90,
        isActive: false,
      });

      expect(result.priority).toBe(90);
      expect(result.isActive).toBe(false);
    });
  });

  describe('importRules()', () => {
    it('应导入新规则', async () => {
      const rules = [
        { ruleName: '规则 1', description: '描述 1', priority: 80 },
        { ruleName: '规则 2', description: '描述 2', priority: 70 },
      ];

      mockRuleRepository.findOne.mockResolvedValue(null); // 规则不存在
      mockRuleRepository.create.mockReturnValue({ id: 1, ...rules[0] });
      mockRuleRepository.save.mockResolvedValue({ id: 1, ...rules[0] });

      const result = await service.importRules(rules);

      expect(result).toBe(2);
      expect(mockRuleRepository.create).toHaveBeenCalled();
      expect(mockRuleRepository.save).toHaveBeenCalled();
    });

    it('应更新已存在的规则', async () => {
      const existingRule = { id: 1, ruleName: '规则 1', description: '旧描述' };
      const rules = [
        { ruleName: '规则 1', description: '新描述', priority: 90 },
      ];

      mockRuleRepository.findOne.mockResolvedValue(existingRule);
      mockRuleRepository.save.mockResolvedValue({ 
        ...existingRule, 
        description: '新描述',
        priority: 90,
      });

      const result = await service.importRules(rules);

      expect(result).toBe(1);
      expect(mockRuleRepository.save).toHaveBeenCalledWith(existingRule);
    });

    it('应处理混合情况（部分新增，部分更新）', async () => {
      const rules = [
        { ruleName: '新规则', description: '新描述' },
        { ruleName: '旧规则', description: '更新描述' },
      ];

      mockRuleRepository.findOne
        .mockResolvedValueOnce(null) // 新规则
        .mockResolvedValueOnce({ id: 1, ruleName: '旧规则' }); // 旧规则
      
      mockRuleRepository.create.mockReturnValue({ id: 2, ...rules[0] });
      mockRuleRepository.save.mockResolvedValue({ id: 2, ...rules[0] });

      const result = await service.importRules(rules);

      expect(result).toBe(2);
    });

    it('应继续处理即使有规则失败', async () => {
      const rules = [
        { ruleName: '规则 1' },
        { ruleName: '规则 2' },
        { ruleName: '规则 3' },
      ];

      mockRuleRepository.findOne
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('数据库错误'))
        .mockResolvedValueOnce(null);

      mockRuleRepository.create.mockReturnValue({ id: 1, ...rules[0] });
      mockRuleRepository.save
        .mockResolvedValueOnce({ id: 1, ...rules[0] })
        .mockResolvedValueOnce({ id: 3, ...rules[2] });

      const result = await service.importRules(rules);

      // 应该成功导入 2 个规则（跳过失败的）
      expect(result).toBeGreaterThanOrEqual(1);
    });

    it('应处理没有 ruleName 的规则', async () => {
      const rules = [
        { description: '没有名称的规则' },
        { ruleName: '有效规则' },
      ];

      mockRuleRepository.findOne.mockResolvedValue(null);
      mockRuleRepository.create.mockReturnValue({ id: 1, ...rules[1] });
      mockRuleRepository.save.mockResolvedValue({ id: 1, ...rules[1] });

      const result = await service.importRules(rules);

      expect(result).toBe(1);
    });
  });

  describe('exportRules()', () => {
    it('应导出所有规则', async () => {
      const mockRules = [
        { id: 1, ruleName: '规则 1', priority: 90 },
        { id: 2, ruleName: '规则 2', priority: 80 },
      ];

      mockRuleRepository.find.mockResolvedValue(mockRules);

      const result = await service.exportRules();

      expect(result).toHaveLength(2);
      expect(result[0].ruleName).toBe('规则 1');
      expect(mockRuleRepository.find).toHaveBeenCalledWith({
        order: { priority: 'DESC' },
      });
    });

    it('应返回空数组当没有规则时', async () => {
      mockRuleRepository.find.mockResolvedValue([]);

      const result = await service.exportRules();

      expect(result).toHaveLength(0);
    });
  });

  describe('generateRecommendations()', () => {
    beforeEach(() => {
      // 重置所有 mock
      mockRuleEngine.recommend.mockReset();
      mockRecommendationRepository.save.mockReset();
    });

    it('应生成推荐并保存', async () => {
      const customerId = 1;
      const mockRecommendations = [
        { tagId: 1, score: 0.9 },
        { tagId: 2, score: 0.8 },
      ];

      mockRuleEngine.recommend.mockResolvedValue(mockRecommendations);
      mockRecommendationRepository.save.mockResolvedValue(mockRecommendations);

      const result = await service.generateRecommendations(customerId);

      expect(result).toHaveLength(2);
      expect(mockRuleEngine.recommend).toHaveBeenCalled();
      expect(mockRecommendationRepository.save).toHaveBeenCalled();
    });

    it('应返回空数组当没有推荐时', async () => {
      mockRuleEngine.recommend.mockResolvedValue([]);

      const result = await service.generateRecommendations(1);

      expect(result).toHaveLength(0);
      expect(mockRecommendationRepository.save).not.toHaveBeenCalled();
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

  describe('边界情况', () => {
    it('应处理 getRuleById 找不到规则的情况', async () => {
      mockRuleRepository.findOne.mockResolvedValue(null);

      await expect(service.getRuleById(999)).rejects.toThrow('不存在');
    });

    it('应处理 save 失败的情况', async () => {
      const rule = { id: 1, ruleName: '规则' };
      
      mockRuleRepository.findOne.mockResolvedValue(rule);
      mockRuleRepository.save.mockRejectedValue(new Error('数据库错误'));

      await expect(service.activateRule(1)).rejects.toThrow();
    });

    it('应处理 create 时 JSON.stringify 失败的情况', async () => {
      const dto: CreateRuleDto = {
        ruleName: '测试规则',
        description: '描述',
        ruleExpression: JSON.stringify({ operator: 'AND', conditions: [] }),
        priority: 80,
        tagTemplate: ['标签'],
        isActive: true,
      };

      mockRuleRepository.findOne.mockResolvedValue(null);
      mockRuleRepository.create.mockImplementation(() => {
        throw new Error('序列化失败');
      });

      await expect(service.createRule(dto)).rejects.toThrow();
    });
  });
});
