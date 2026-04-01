import { DEFAULT_RULES } from './default-rules.seed';
import { RecommendationRule } from '../entities/recommendation-rule.entity';

describe('Default Rules Seed', () => {
  it('应该导出 DEFAULT_RULES 数组', () => {
    expect(DEFAULT_RULES).toBeDefined();
    expect(Array.isArray(DEFAULT_RULES)).toBe(true);
  });

  it('DEFAULT_RULES 应该包含 4 个默认规则', () => {
    expect(DEFAULT_RULES.length).toBe(4);
  });

  it('每个规则都应该有所需的属性', () => {
    DEFAULT_RULES.forEach((rule, index) => {
      expect(rule).toHaveProperty('ruleName');
      expect(rule).toHaveProperty('description');
      expect(rule).toHaveProperty('ruleExpression');
      expect(rule).toHaveProperty('priority');
      expect(rule).toHaveProperty('tagTemplate');
      expect(rule).toHaveProperty('isActive');
      expect(rule).toHaveProperty('hitCount');
      
      // 验证基本类型
      expect(typeof rule.ruleName).toBe('string');
      expect(typeof rule.description).toBe('string');
      expect(typeof rule.ruleExpression).toBe('string');
      expect(typeof rule.priority).toBe('number');
      expect(typeof rule.tagTemplate).toBe('object');
      expect(typeof rule.isActive).toBe('boolean');
      expect(typeof rule.hitCount).toBe('number');
    });
  });

  it('第一个规则应该是高价值客户识别', () => {
    const rule = DEFAULT_RULES[0];
    
    expect(rule.ruleName).toBe('高价值客户识别');
    expect(rule.description).toContain('消费金额和订单数双高');
    expect(rule.priority).toBe(90);
    expect(rule.isActive).toBe(true);
    expect(rule.hitCount).toBe(0);
    
    // 验证规则表达式是有效的 JSON
    expect(() => JSON.parse(rule.ruleExpression!)).not.toThrow();
    
    const expression = JSON.parse(rule.ruleExpression!);
    expect(expression.operator).toBe('AND');
    expect(expression.conditions).toHaveLength(2);
  });

  it('第二个规则应该是流失风险预警', () => {
    const rule = DEFAULT_RULES[1];
    
    expect(rule.ruleName).toBe('流失风险预警');
    expect(rule.description).toContain('长时间未购买');
    expect(rule.priority).toBe(85);
    expect(rule.tagTemplate.name).toBe('流失风险');
    expect(rule.tagTemplate.category).toBe('客户风险');
  });

  it('第三个规则应该是潜力客户挖掘', () => {
    const rule = DEFAULT_RULES[2];
    
    expect(rule.ruleName).toBe('潜力客户挖掘');
    expect(rule.description).toContain('年轻且有消费能力');
    expect(rule.priority).toBe(80);
    expect(rule.tagTemplate.name).toBe('潜力客户');
    
    const expression = JSON.parse(rule.ruleExpression!);
    expect(expression.conditions).toHaveLength(3);
    
    // 验证包含年龄、城市、平均订单金额的筛选条件
    const fields = expression.conditions.map((c: any) => c.field);
    expect(fields).toContain('profile.age');
    expect(fields).toContain('profile.city');
    expect(fields).toContain('avgOrderValue');
  });

  it('第四个规则应该是频繁购买者', () => {
    const rule = DEFAULT_RULES[3];
    
    expect(rule.ruleName).toBe('频繁购买者');
    expect(rule.description).toContain('购买频率高');
    expect(rule.priority).toBe(75);
    expect(rule.tagTemplate.name).toBe('频繁购买者');
    expect(rule.tagTemplate.category).toBe('客户活跃度');
    
    const expression = JSON.parse(rule.ruleExpression!);
    expect(expression.conditions).toHaveLength(2);
    
    const fields = expression.conditions.map((c: any) => c.field);
    expect(fields).toContain('ordersLast30Days');
    expect(fields).toContain('ordersLast90Days');
  });

  it('所有规则的优先级应该在合理范围内 (0-100)', () => {
    DEFAULT_RULES.forEach(rule => {
      expect(rule.priority).toBeGreaterThanOrEqual(0);
      expect(rule.priority).toBeLessThanOrEqual(100);
    });
  });

  it('所有规则的 hitCount 初始值应该为 0', () => {
    DEFAULT_RULES.forEach(rule => {
      expect(rule.hitCount).toBe(0);
    });
  });

  it('所有规则的 isActive 应该为 true', () => {
    DEFAULT_RULES.forEach(rule => {
      expect(rule.isActive).toBe(true);
    });
  });

  it('所有规则的 tagTemplate 都应该有 baseConfidence', () => {
    DEFAULT_RULES.forEach(rule => {
      expect(rule.tagTemplate.baseConfidence).toBeDefined();
      expect(typeof rule.tagTemplate.baseConfidence).toBe('number');
      expect(rule.tagTemplate.baseConfidence).toBeGreaterThan(0);
      expect(rule.tagTemplate.baseConfidence).toBeLessThanOrEqual(1);
    });
  });

  describe('规则表达式结构验证', () => {
    it('所有规则表达式都应该是 AND 逻辑', () => {
      DEFAULT_RULES.forEach(rule => {
        const expression = JSON.parse(rule.ruleExpression!);
        expect(expression.operator).toBe('AND');
      });
    });

    it('所有规则表达式都应该有 conditions 数组', () => {
      DEFAULT_RULES.forEach(rule => {
        const expression = JSON.parse(rule.ruleExpression!);
        expect(expression.conditions).toBeDefined();
        expect(Array.isArray(expression.conditions)).toBe(true);
        expect(expression.conditions.length).toBeGreaterThan(0);
      });
    });

    it('conditions 中的每个条件都应该有 field、operator 和 value', () => {
      DEFAULT_RULES.forEach(rule => {
        const expression = JSON.parse(rule.ruleExpression!);
        
        expression.conditions.forEach((condition: any) => {
          expect(condition).toHaveProperty('field');
          expect(condition).toHaveProperty('operator');
          expect(condition).toHaveProperty('value');
          
          expect(typeof condition.field).toBe('string');
          expect(typeof condition.operator).toBe('string');
        });
      });
    });
  });
});