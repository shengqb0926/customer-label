import { RuleParser } from './rule-parser';
import type { RuleExpression } from '../entities/recommendation-rule.entity';

describe('RuleParser', () => {
  let parser: RuleParser;

  beforeEach(() => {
    parser = new RuleParser();
  });

  describe('parse()', () => {
    it('应正确解析简单条件', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>=', value: 18 },
        ],
      };

      const result = parser.parse(expr);
      
      expect(result.operator).toBe('AND');
      expect(result.conditions).toHaveLength(1);
      expect(result.conditions![0]).toEqual({
        field: 'age',
        operator: '>=',
        value: 18,
      });
    });

    it('应正确解析 AND 表达式', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>=', value: 18 },
          { field: 'city', operator: 'in', value: ['北京', '上海'] },
        ],
      };

      const result = parser.parse(expr);
      
      expect(result.operator).toBe('AND');
      expect(result.conditions).toHaveLength(2);
    });

    it('应正确解析嵌套表达式', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          {
            operator: 'OR',
            conditions: [
              { field: 'age', operator: '>=', value: 18 },
              { field: 'age', operator: '<=', value: 60 },
            ],
          },
          { field: 'city', operator: 'in', value: ['北京', '上海'] },
        ],
      };

      const result = parser.parse(expr);
      
      expect(result.operator).toBe('AND');
      expect(result.conditions).toHaveLength(2);
      expect(result.conditions![0]).toHaveProperty('operator', 'OR');
    });

    it('应拒绝无效的运算符', () => {
      const invalidExpr = { operator: 'INVALID', conditions: [] };
      
      expect(() => parser.parse(invalidExpr)).toThrow('无效的运算符');
    });

    it('应拒绝缺失 field 的条件', () => {
      const invalidExpr = {
        operator: 'AND',
        conditions: [{ operator: '>=', value: 18 }],
      };
      
      expect(() => parser.parse(invalidExpr)).toThrow('必须包含 field 字段');
    });

    it('应拒绝缺失 value 的条件', () => {
      const invalidExpr = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: '>=' }],
      };
      
      expect(() => parser.parse(invalidExpr)).toThrow('必须包含 value 字段');
    });
  });

  describe('stringify()', () => {
    it('应将表达式序列化为可读格式', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>=', value: 18 },
          { field: 'city', operator: 'in', value: ['北京', '上海'] },
        ],
      };

      const result = parser.stringify(expr);
      
      expect(result).toContain('AND');
      expect(result).toContain('age >= 18');
      expect(result).toContain('city in ["北京","上海"]');
    });

    it('应正确处理嵌套表达式', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          {
            operator: 'OR',
            conditions: [
              { field: 'age', operator: '>=', value: 18 },
              { field: 'age', operator: '<=', value: 60 },
            ],
          },
        ],
      };

      const result = parser.stringify(expr);
      
      expect(result).toContain('AND');
      expect(result).toContain('OR');
    });
  });

  describe('validate()', () => {
    it('应返回 true 对于有效的表达式', () => {
      const validExpr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>=', value: 18 },
        ],
      };

      expect(parser.validate(validExpr)).toBe(true);
    });

    it('应返回 false 对于无效的表达式', () => {
      const invalidExpr = { operator: 'INVALID' } as any;
      expect(parser.validate(invalidExpr)).toBe(false);
    });
  });
});
