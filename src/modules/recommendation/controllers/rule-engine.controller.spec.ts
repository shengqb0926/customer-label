import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RuleEngineController } from './rule-engine.controller';
import { RuleEngineService } from '../services/rule-engine.service';
import { CreateRuleDto } from '../dto/create-rule.dto';
import { UpdateRuleDto } from '../dto/update-rule.dto';
import { TestRuleDto } from '../dto/test-rule.dto';

describe('RuleEngineController', () => {
  let controller: RuleEngineController;
  let service: RuleEngineService;

  const mockService = {
    getRules: jest.fn(),
    getRuleById: jest.fn(),
    createRule: jest.fn(),
    updateRule: jest.fn(),
    deleteRule: jest.fn(),
    activateRule: jest.fn(),
    deactivateRule: jest.fn(),
    testRule: jest.fn(),
    importRules: jest.fn(),
    exportRules: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RuleEngineController],
      providers: [
        {
          provide: RuleEngineService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RuleEngineController>(RuleEngineController);
    service = module.get<RuleEngineService>(RuleEngineService);
  });

  it('应被定义', () => {
    expect(controller).toBeDefined();
  });

  describe('getRules()', () => {
    it('应返回规则列表', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20 };
      
      mockService.getRules.mockResolvedValue(mockResult);

      const result = await controller.getRules(1, 20, true);

      expect(result).toEqual(mockResult);
      expect(service.getRules).toHaveBeenCalledWith({ page: 1, limit: 20, isActive: true });
    });
  });

  describe('getRule()', () => {
    it('应返回规则详情', async () => {
      const mockRule = { id: 1, name: '测试规则' };
      
      mockService.getRuleById.mockResolvedValue(mockRule);

      const result = await controller.getRule(1);

      expect(result).toEqual(mockRule);
      expect(service.getRuleById).toHaveBeenCalledWith(1);
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
      
      mockService.createRule.mockResolvedValue(createdRule);

      const result = await controller.createRule(dto);

      expect(result).toEqual(createdRule);
      expect(service.createRule).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateRule()', () => {
    it('应更新规则', async () => {
      const dto: UpdateRuleDto = { ruleName: '更新后的名称', priority: 90 };
      const updatedRule = { id: 1, ...dto };
      
      mockService.updateRule.mockResolvedValue(updatedRule);

      const result = await controller.updateRule(1, dto);

      expect(result).toEqual(updatedRule);
      expect(service.updateRule).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('deleteRule()', () => {
    it('应删除规则', async () => {
      mockService.deleteRule.mockResolvedValue(undefined);

      const result = await controller.deleteRule(1);

      expect(result).toEqual({ message: '删除成功' });
      expect(service.deleteRule).toHaveBeenCalledWith(1);
    });
  });

  describe('activateRule()', () => {
    it('应激活规则', async () => {
      const activatedRule = { id: 1, isActive: true };
      
      mockService.activateRule.mockResolvedValue(activatedRule);

      const result = await controller.activateRule(1);

      expect(result).toEqual(activatedRule);
      expect(service.activateRule).toHaveBeenCalledWith(1);
    });
  });

  describe('deactivateRule()', () => {
    it('应停用规则', async () => {
      const deactivatedRule = { id: 1, isActive: false };
      
      mockService.deactivateRule.mockResolvedValue(deactivatedRule);

      const result = await controller.deactivateRule(1);

      expect(result).toEqual(deactivatedRule);
      expect(service.deactivateRule).toHaveBeenCalledWith(1);
    });
  });

  describe('testRule()', () => {
    it('应测试规则', async () => {
      const dto: TestRuleDto = {
        ruleExpression: { operator: 'AND', conditions: [] },
        customerData: { age: 25 },
      };

      const mockResult = { success: true, matched: true, confidence: 0.9 };
      
      mockService.testRule.mockResolvedValue(mockResult);

      const result = await controller.testRule(dto);

      expect(result).toEqual(mockResult);
      expect(service.testRule).toHaveBeenCalledWith(dto.ruleExpression, dto.customerData);
    });
  });

  describe('exportRules()', () => {
    it('应导出规则', async () => {
      const mockRules = [{ name: '规则 1' }, { name: '规则 2' }];
      
      mockService.exportRules.mockResolvedValue(mockRules);

      const result = await controller.exportRules();

      expect(result).toEqual(mockRules);
      expect(service.exportRules).toHaveBeenCalled();
    });
  });
});
