import { RuleEvaluator } from './rule-evaluator';
import { RuleParser } from './rule-parser';
import type { RuleExpression, Condition } from '../entities/recommendation-rule.entity';

describe('RuleEvaluator', () => {
  let evaluator: RuleEvaluator;
  let parser: RuleParser;

  beforeEach(() => {
    parser = new RuleParser();
    evaluator = new RuleEvaluator(parser);
  });

  describe('evaluateCondition()', () => {
    it('应评估数值大于比较', () => {
      const data = { age: 25 };
      const condition: Condition = { field: 'age', operator: '>', value: 18 };
      
      expect(evaluator['evaluateCondition'](condition, data)).toBe(true);
    });

    it('应评估数值小于比较', () => {
      const data = { age: 15 };
      const condition: Condition = { field: 'age', operator: '<', value: 18 };
      
      expect(evaluator['evaluateCondition'](condition, data)).toBe(true);
    });

    it('应评估数值范围（between）', () => {
      const data = { age: 30 };
      const condition: Condition = { field: 'age', operator: 'between', value: [25, 40] };
      
      expect(evaluator['evaluateCondition'](condition, data)).toBe(true);
    });

    it('应评估数组包含（in）', () => {
      const data = { city: '上海' };
      const condition: Condition = { field: 'city', operator: 'in', value: ['北京', '上海', '广州'] };
      
      expect(evaluator['evaluateCondition'](condition, data)).toBe(true);
    });

    it('应评估嵌套字段访问', () => {
      const data = { profile: { age: 35, city: '上海' } };
      const condition: Condition = { field: 'profile.city', operator: 'in', value: ['北京', '上海'] };
      
      expect(evaluator['evaluateCondition'](condition, data)).toBe(true);
    });

    it('应处理空值返回 false', () => {
      const data = { age: null };
      const condition: Condition = { field: 'age', operator: '>=', value: 18 };
      
      expect(evaluator['evaluateCondition'](condition, data)).toBe(false);
    });
  });

  describe('evaluateExpression()', () => {
    it('应评估 AND 表达式', () => {
      const data = { age: 25, amount: 5000 };
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>=', value: 18 },
          { field: 'amount', operator: '>=', value: 1000 },
        ],
      };

      const result = evaluator.evaluateExpression(expr, data);
      
      expect(result.matched).toBe(true);
      expect(result.confidence).toBe(1);
      expect(result.matchedConditions).toBe(2);
      expect(result.totalConditions).toBe(2);
    });

    it('应评估 OR 表达式', () => {
      const data = { age: 15, amount: 5000 };
      const expr: RuleExpression = {
        operator: 'OR',
        conditions: [
          { field: 'age', operator: '>=', value: 18 },
          { field: 'amount', operator: '>=', value: 1000 },
        ],
      };

      const result = evaluator.evaluateExpression(expr, data);
      
      expect(result.matched).toBe(true);
      expect(result.confidence).toBeCloseTo(0.5);
    });

    it('应评估 NOT 表达式', () => {
      const data = { age: 15 };
      const expr: RuleExpression = {
        operator: 'NOT',
        conditions: [
          { field: 'age', operator: '>=', value: 18 },
        ],
      };

      const result = evaluator.evaluateExpression(expr, data);
      
      expect(result.matched).toBe(true);
    });

    it('应计算置信度分数', () => {
      const data = { age: 25, amount: 500 };
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>=', value: 18 },
          { field: 'amount', operator: '>=', value: 1000 },
        ],
      };

      const result = evaluator.evaluateExpression(expr, data);
      
      expect(result.matched).toBe(false);
      expect(result.matchedConditions).toBe(1);
      expect(result.totalConditions).toBe(2);
    });

    it('应处理嵌套表达式', () => {
      const data = { 
        age: 35, 
        city: '上海',
        amount: 15000 
      };
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          {
            operator: 'OR',
            conditions: [
              { field: 'age', operator: 'between', value: [25, 40] },
              { field: 'city', operator: 'in', value: ['北京'] },
            ],
          },
          { field: 'amount', operator: '>=', value: 10000 },
        ],
      };

      const result = evaluator.evaluateExpression(expr, data);
      
      expect(result.matched).toBe(true);
      expect(result.confidence).toBe(1);
    });
  });

  describe('边界情况处理', () => {
    it('应处理字符串比较', () => {
      const data = { name: '张三' };
      const condition: Condition = { field: 'name', operator: 'startsWith', value: '张' };
      
      expect(evaluator['evaluateCondition'](condition, data)).toBe(true);
    });

    it('应处理数组字段包含', () => {
      const data = { tags: ['VIP', '高频购买'] };
      const condition: Condition = { field: 'tags', operator: 'includes', value: 'VIP' };
      
      expect(evaluator['evaluateCondition'](condition, data)).toBe(true);
    });

    it('应处理字符串包含', () => {
      const data = { description: '这是一个测试' };
      const condition: Condition = { field: 'description', operator: 'contains', value: '测试' };
      
      expect(evaluator['evaluateCondition'](condition, data)).toBe(true);
    });
  });
});
