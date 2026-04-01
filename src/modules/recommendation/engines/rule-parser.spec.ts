import { RuleParser } from './rule-parser';
import type { RuleExpression, Condition } from '../entities/recommendation-rule.entity';

describe('RuleParser', () => {
  let parser: RuleParser;

  beforeEach(() => {
    parser = new RuleParser();
  });

  describe('parse', () => {
    it('should throw error when expression is null', () => {
      expect(() => parser.parse(null as any)).toThrow(
        '规则表达式必须是对象'
      );
    });

    it('should throw error when expression is not an object', () => {
      expect(() => parser.parse('string' as any)).toThrow(
        '规则表达式必须是对象'
      );

      expect(() => parser.parse(123 as any)).toThrow(
        '规则表达式必须是对象'
      );

      expect(() => parser.parse(undefined as any)).toThrow(
        '规则表达式必须是对象'
      );
    });

    it('should throw error when operator is missing', () => {
      const expr = {
        conditions: [{ field: 'age', operator: '>', value: 30 }],
      };

      expect(() => parser.parse(expr as any)).toThrow(
        '无效的运算符：undefined'
      );
    });

    it('should throw error when operator is invalid', () => {
      const expr = {
        operator: 'INVALID',
        conditions: [{ field: 'age', operator: '>', value: 30 }],
      };

      expect(() => parser.parse(expr as any)).toThrow(
        '无效的运算符：INVALID'
      );
    });

    it('should parse valid AND expression', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>', value: 30 },
          { field: 'score', operator: '>=', value: 80 },
        ],
      };

      const result = parser.parse(expr);

      expect(result.operator).toBe('AND');
      expect(result.conditions).toHaveLength(2);
      expect(result.conditions![0]).toEqual({
        field: 'age',
        operator: '>',
        value: 30,
      });
    });

    it('should parse valid OR expression', () => {
      const expr: RuleExpression = {
        operator: 'OR',
        conditions: [
          { field: 'status', operator: '==', value: 'active' },
          { field: 'vip', operator: '==', value: true },
        ],
      };

      const result = parser.parse(expr);

      expect(result.operator).toBe('OR');
      expect(result.conditions).toHaveLength(2);
    });

    it('should parse NOT expression', () => {
      const expr: RuleExpression = {
        operator: 'NOT',
        conditions: [{ field: 'blacklisted', operator: '==', value: true }],
      };

      const result = parser.parse(expr);

      expect(result.operator).toBe('NOT');
      expect(result.conditions).toHaveLength(1);
    });

    it('should parse nested expressions', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          {
            operator: 'OR',
            conditions: [
              { field: 'age', operator: '>', value: 50 },
              { field: 'score', operator: '>=', value: 90 },
            ],
          },
          { field: 'vip', operator: '==', value: true },
        ],
      };

      const result = parser.parse(expr);

      expect(result.operator).toBe('AND');
      expect(result.conditions).toHaveLength(2);
      expect(result.conditions![0]).toEqual({
        operator: 'OR',
        conditions: [
          { field: 'age', operator: '>', value: 50 },
          { field: 'score', operator: '>=', value: 90 },
        ],
      });
    });

    it('should parse expression without conditions', () => {
      const expr: RuleExpression = {
        operator: 'AND',
      };

      const result = parser.parse(expr);

      expect(result.operator).toBe('AND');
      expect(result.conditions).toBeUndefined();
    });

    it('should throw error when condition missing field', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ operator: '>', value: 30 }] as any,
      };

      expect(() => parser.parse(expr)).toThrow(
        '条件必须包含 field 字段（字符串类型）'
      );
    });

    it('should throw error when field is not a string', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 123, operator: '>', value: 30 }] as any,
      };

      expect(() => parser.parse(expr)).toThrow(
        '条件必须包含 field 字段（字符串类型）'
      );
    });

    it('should throw error when condition has invalid operator', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: 'INVALID', value: 30 }],
      };

      expect(() => parser.parse(expr)).toThrow(
        '无效的运算符：INVALID'
      );
    });

    it('should throw error when condition missing value', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: '>' }] as any,
      };

      expect(() => parser.parse(expr)).toThrow(
        '条件必须包含 value 字段'
      );
    });

    it('should support all comparison operators', () => {
      const operators = [
        '>', '<', '>=', '<=', '==', '!=',
        'between', 'in', 'includes', 'contains',
        'startsWith', 'endsWith'
      ];

      operators.forEach(op => {
        const expr: RuleExpression = {
          operator: 'AND',
          conditions: [{ field: 'test', operator: op, value: 'value' }],
        };

        expect(() => parser.parse(expr)).not.toThrow();
      });
    });
  });

  describe('stringify', () => {
    it('should stringify simple expression', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>', value: 30 },
          { field: 'score', operator: '>=', value: 80 },
        ],
      };

      const result = parser.stringify(expr);

      expect(result).toContain('AND(');
      expect(result).toContain('age > 30');
      expect(result).toContain('score >= 80');
    });

    it('should stringify nested expression', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          {
            operator: 'OR',
            conditions: [
              { field: 'age', operator: '>', value: 50 },
              { field: 'score', operator: '>=', value: 90 },
            ],
          },
          { field: 'vip', operator: '==', value: true },
        ],
      };

      const result = parser.stringify(expr);

      expect(result).toContain('AND(');
      expect(result).toContain('OR(');
      expect(result).toContain('age > 50');
      expect(result).toContain('score >= 90');
      expect(result).toContain('vip == true');
    });

    it('should stringify expression with indentation', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'name', operator: 'startsWith', value: 'John' },
        ],
      };

      const result = parser.stringify(expr, 4);

      expect(result).toContain('    AND(');
    });

    it('should stringify array values', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'tags', operator: 'in', value: ['vip', 'premium'] },
          { field: 'age', operator: 'between', value: [20, 30] },
        ],
      };

      const result = parser.stringify(expr);

      expect(result).toContain('["vip","premium"]');
      expect(result).toContain('[20,30]');
    });

    it('should handle empty conditions', () => {
      const expr: RuleExpression = {
        operator: 'AND',
      };

      const result = parser.stringify(expr);

      expect(result).toBe('AND');
    });
  });

  describe('validate', () => {
    it('should return true for valid expression', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>', value: 30 },
          { field: 'score', operator: '>=', value: 80 },
        ],
      };

      expect(parser.validate(expr)).toBe(true);
    });

    it('should return false for invalid expression', () => {
      const expr = {
        operator: 'INVALID',
        conditions: [{ field: 'age', operator: '>', value: 30 }],
      };

      expect(parser.validate(expr)).toBe(false);
    });

    it('should return false for null expression', () => {
      expect(parser.validate(null as any)).toBe(false);
    });

    it('should return false for expression with missing field', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ operator: '>', value: 30 }] as any,
      };

      expect(parser.validate(expr)).toBe(false);
    });

    it('should return true for complex nested expression', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          {
            operator: 'OR',
            conditions: [
              { field: 'age', operator: '>', value: 50 },
              { field: 'income', operator: '>=', value: 50000 },
            ],
          },
          {
            operator: 'NOT',
            conditions: [{ field: 'blacklisted', operator: '==', value: true }],
          },
        ],
      };

      expect(parser.validate(expr)).toBe(true);
    });

    it('should return true for expression with all supported operators', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'a', operator: '>', value: 1 },
          { field: 'b', operator: '<', value: 2 },
          { field: 'c', operator: '>=', value: 3 },
          { field: 'd', operator: '<=', value: 4 },
          { field: 'e', operator: '==', value: 5 },
          { field: 'f', operator: '!=', value: 6 },
          { field: 'g', operator: 'between', value: [7, 8] },
          { field: 'h', operator: 'in', value: [9, 10] },
          { field: 'i', operator: 'includes', value: 'x' },
          { field: 'j', operator: 'contains', value: 'y' },
          { field: 'k', operator: 'startsWith', value: 'z' },
          { field: 'l', operator: 'endsWith', value: 'w' },
        ],
      };

      expect(parser.validate(expr)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle deeply nested expressions', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          {
            operator: 'OR',
            conditions: [
              {
                operator: 'AND',
                conditions: [
                  { field: 'a', operator: '>', value: 1 },
                  { field: 'b', operator: '<', value: 2 },
                ],
              },
              { field: 'c', operator: '==', value: 3 },
            ],
          },
          { field: 'd', operator: '!=', value: 4 },
        ],
      };

      const result = parser.parse(expr);
      expect(result.operator).toBe('AND');
      expect(result.conditions).toHaveLength(2);
    });

    it('should handle string values with special characters', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'email', operator: 'contains', value: '@example.com' },
          { field: 'name', operator: 'startsWith', value: 'Mr. ' },
        ],
      };

      const result = parser.parse(expr);
      expect((result.conditions![0] as Condition).value).toBe('@example.com');
      expect((result.conditions![1] as Condition).value).toBe('Mr. ');
    });

    it('should handle numeric values', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>', value: 30 },
          { field: 'score', operator: '>=', value: 85.5 },
          { field: 'count', operator: '<=', value: -10 },
        ],
      };

      const result = parser.parse(expr);
      expect((result.conditions![0] as Condition).value).toBe(30);
      expect((result.conditions![1] as Condition).value).toBe(85.5);
      expect((result.conditions![2] as Condition).value).toBe(-10);
    });

    it('should handle boolean values', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'active', operator: '==', value: true },
          { field: 'deleted', operator: '!=', value: false },
        ],
      };

      const result = parser.parse(expr);
      expect((result.conditions![0] as Condition).value).toBe(true);
      expect((result.conditions![1] as Condition).value).toBe(false);
    });

    it('should handle null values in conditions', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'value', operator: '==', value: null }],
      };

      const result = parser.parse(expr);
      expect((result.conditions![0] as Condition).value).toBeNull();
    });
  });

  describe('Real-world Examples', () => {
    it('should parse customer segmentation rule', () => {
      const rule: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'rfm.recency', operator: '<=', value: 30 },
          { field: 'rfm.frequency', operator: '>=', value: 10 },
          { field: 'rfm.monetary', operator: '>=', value: 5000 },
        ],
      };

      const result = parser.parse(rule);
      expect(result.operator).toBe('AND');
      expect(result.conditions).toHaveLength(3);
      expect(parser.validate(rule)).toBe(true);
    });

    it('should parse loan approval rule', () => {
      const rule: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>=', value: 25 },
          { field: 'income', operator: '>=', value: 40000 },
          { field: 'creditScore', operator: '>=', value: 700 },
          {
            operator: 'OR',
            conditions: [
              { field: 'employmentYears', operator: '>=', value: 5 },
              { field: 'hasCollateral', operator: '==', value: true },
            ],
          },
        ],
      };

      const result = parser.parse(rule);
      expect(result.operator).toBe('AND');
      expect(result.conditions).toHaveLength(4);
      expect(parser.validate(rule)).toBe(true);
    });

    it('should parse churn risk rule', () => {
      const rule: RuleExpression = {
        operator: 'OR',
        conditions: [
          { field: 'lastLoginDays', operator: '>', value: 90 },
          {
            operator: 'AND',
            conditions: [
              { field: 'complaintCount', operator: '>=', value: 3 },
              { field: 'satisfactionScore', operator: '<=', value: 3 },
            ],
          },
          { field: 'contractEndDays', operator: '<=', value: 30 },
        ],
      };

      const result = parser.parse(rule);
      expect(result.operator).toBe('OR');
      expect(result.conditions).toHaveLength(3);
      expect(parser.validate(rule)).toBe(true);
    });
  });
});
