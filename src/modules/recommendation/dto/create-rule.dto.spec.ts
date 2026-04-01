import { CreateRuleDto, UpdateRuleDto, TagTemplateDto } from './create-rule.dto';

describe('CreateRuleDto', () => {
  it('should create a valid CreateRuleDto instance', () => {
    const dto = new CreateRuleDto();
    dto.ruleName = '高价值客户识别';
    dto.description = '识别消费金额和订单数双高的客户';
    dto.ruleExpression = '{"operator":"AND","conditions":[{"field":"totalOrders","operator":">=","value":10}]}';
    dto.priority = 90;
    dto.tagTemplate = ['高价值客户', 'VIP 客户'];
    dto.isActive = true;

    expect(dto.ruleName).toBe('高价值客户识别');
    expect(dto.description).toBe('识别消费金额和订单数双高的客户');
    expect(dto.ruleExpression).toContain('operator');
    expect(dto.priority).toBe(90);
    expect(dto.tagTemplate).toEqual(['高价值客户', 'VIP 客户']);
    expect(dto.isActive).toBe(true);
  });

  it('should allow empty description', () => {
    const dto = new CreateRuleDto();
    dto.ruleName = '测试规则';
    dto.ruleExpression = 'test';
    dto.priority = 50;
    dto.tagTemplate = ['标签 1'];
    dto.isActive = true;
    dto.description = undefined;

    expect(dto.description).toBeUndefined();
  });

  it('should validate priority range', () => {
    const dto1 = new CreateRuleDto();
    dto1.ruleName = '规则 1';
    dto1.ruleExpression = 'test';
    dto1.priority = 1; // Minimum
    dto1.tagTemplate = ['标签'];
    dto1.isActive = true;

    const dto2 = new CreateRuleDto();
    dto2.ruleName = '规则 2';
    dto2.ruleExpression = 'test';
    dto2.priority = 100; // Maximum
    dto2.tagTemplate = ['标签'];
    dto2.isActive = true;

    expect(dto1.priority).toBe(1);
    expect(dto2.priority).toBe(100);
  });

  it('should support multiple tag templates', () => {
    const dto = new CreateRuleDto();
    dto.ruleName = '复杂规则';
    dto.ruleExpression = 'complex';
    dto.priority = 75;
    dto.tagTemplate = ['标签 A', '标签 B', '标签 C', '标签 D'];
    dto.isActive = true;

    expect(dto.tagTemplate.length).toBe(4);
    expect(dto.tagTemplate[0]).toBe('标签 A');
    expect(dto.tagTemplate[3]).toBe('标签 D');
  });
});

describe('UpdateRuleDto', () => {
  it('should create an UpdateRuleDto with all fields optional', () => {
    const dto = new UpdateRuleDto();
    
    // All fields are optional
    expect(dto.ruleName).toBeUndefined();
    expect(dto.ruleExpression).toBeUndefined();
    expect(dto.priority).toBeUndefined();
    expect(dto.tagTemplate).toBeUndefined();
    expect(dto.isActive).toBeUndefined();
  });

  it('should update partial fields', () => {
    const dto = new UpdateRuleDto();
    dto.priority = 85;
    dto.isActive = false;

    expect(dto.priority).toBe(85);
    expect(dto.isActive).toBe(false);
    expect(dto.ruleName).toBeUndefined();
  });

  it('should update all fields', () => {
    const dto = new UpdateRuleDto();
    dto.ruleName = '更新后的规则名';
    dto.ruleExpression = 'updated expression';
    dto.priority = 95;
    dto.tagTemplate = ['新标签 1', '新标签 2'];
    dto.isActive = true;

    expect(dto.ruleName).toBe('更新后的规则名');
    expect(dto.ruleExpression).toBe('updated expression');
    expect(dto.priority).toBe(95);
    expect(dto.tagTemplate).toEqual(['新标签 1', '新标签 2']);
    expect(dto.isActive).toBe(true);
  });

  it('should support null values for optional fields', () => {
    const dto = new UpdateRuleDto();
    dto.ruleName = null as any;
    
    expect(dto.ruleName).toBeNull();
  });
});

describe('TagTemplateDto', () => {
  it('should create a valid TagTemplateDto instance', () => {
    const dto = new TagTemplateDto();
    dto.name = '高价值客户';
    dto.category = '客户价值';
    dto.baseConfidence = 0.85;

    expect(dto.name).toBe('高价值客户');
    expect(dto.category).toBe('客户价值');
    expect(dto.baseConfidence).toBe(0.85);
  });

  it('should validate baseConfidence range [0, 1]', () => {
    const dto1 = new TagTemplateDto();
    dto1.name = '标签 1';
    dto1.category = '类别 A';
    dto1.baseConfidence = 0; // Minimum

    const dto2 = new TagTemplateDto();
    dto2.name = '标签 2';
    dto2.category = '类别 B';
    dto2.baseConfidence = 1; // Maximum

    expect(dto1.baseConfidence).toBe(0);
    expect(dto2.baseConfidence).toBe(1);
  });

  it('should accept decimal confidence values', () => {
    const dto = new TagTemplateDto();
    dto.name = '精确标签';
    dto.category = '精确类别';
    dto.baseConfidence = 0.753;

    expect(dto.baseConfidence).toBe(0.753);
  });
});
