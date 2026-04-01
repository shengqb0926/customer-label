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

  describe('evaluateExpression', () => {
    it('should return false when no conditions', () => {
      const expression: RuleExpression = {
        operator: 'AND',
      };

      const result = evaluator.evaluateExpression(expression, {});

      expect(result).toEqual({
        matched: false,
        confidence: 0,
      });
    });

    it('should evaluate AND conditions - all match', () => {
      const expression: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>', value: 30 },
          { field: 'score', operator: '>=', value: 80 },
          { field: 'status', operator: '==', value: 'active' },
        ],
      };

      const data = { age: 35, score: 85, status: 'active' };
      const result = evaluator.evaluateExpression(expression, data);

      expect(result).toEqual({
        matched: true,
        confidence: 1,
        matchedConditions: 3,
        totalConditions: 3,
      });
    });

    it('should evaluate AND conditions - partial match', () => {
      const expression: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>', value: 30 },
          { field: 'score', operator: '>=', value: 80 },
        ],
      };

      const data = { age: 35, score: 70 };
      const result = evaluator.evaluateExpression(expression, data);

      expect(result).toEqual({
        matched: false,
        confidence: 0,
        matchedConditions: 1,
        totalConditions: 2,
      });
    });

    it('should evaluate OR conditions - at least one matches', () => {
      const expression: RuleExpression = {
        operator: 'OR',
        conditions: [
          { field: 'age', operator: '>', value: 50 },
          { field: 'score', operator: '>=', value: 90 },
          { field: 'vip', operator: '==', value: true },
        ],
      };

      const data = { age: 25, score: 75, vip: true };
      const result = evaluator.evaluateExpression(expression, data);

      expect(result).toEqual({
        matched: true,
        confidence: 1 / 3, // 1/3 条件匹配
        matchedConditions: 1,
        totalConditions: 3,
      });
    });

    it('should evaluate OR conditions - none match', () => {
      const expression: RuleExpression = {
        operator: 'OR',
        conditions: [
          { field: 'age', operator: '>', value: 50 },
          { field: 'score', operator: '>=', value: 90 },
        ],
      };

      const data = { age: 25, score: 75 };
      const result = evaluator.evaluateExpression(expression, data);

      expect(result).toEqual({
        matched: false,
        confidence: 0,
        matchedConditions: 0,
        totalConditions: 2,
      });
    });

    it('should evaluate NOT conditions', () => {
      const expression: RuleExpression = {
        operator: 'NOT',
        conditions: [
          { field: 'status', operator: '==', value: 'inactive' },
          { field: 'blacklisted', operator: '==', value: true },
        ],
      };

      const data = { status: 'active', blacklisted: false };
      const result = evaluator.evaluateExpression(expression, data);

      expect(result.matched).toBe(true);
      expect(result.confidence).toBe(0); // NOT 运算符的置信度计算方式不同
    });

    it('should handle nested expressions', () => {
      const expression: RuleExpression = {
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

      const data = { age: 25, score: 95, vip: true };
      const result = evaluator.evaluateExpression(expression, data);

      expect(result).toEqual({
        matched: true,
        confidence: 1,
        matchedConditions: 2,
        totalConditions: 2,
      });
    });

    it('should calculate confidence based on matched conditions ratio', () => {
      const expression: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'a', operator: '>', value: 1 },
          { field: 'b', operator: '>', value: 2 },
          { field: 'c', operator: '>', value: 3 },
          { field: 'd', operator: '>', value: 4 },
        ],
      };

      const data = { a: 2, b: 1, c: 4, d: 3 }; // 匹配 2/4
      const result = evaluator.evaluateExpression(expression, data);

      expect(result.matched).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.matchedConditions).toBe(2);
      expect(result.totalConditions).toBe(4);
    });
  });

  describe('Numeric Operators', () => {
    const testData = {
      age: 35,
      score: 85.5,
      orders: 10,
    };

    it('should evaluate greater than (>)', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: '>', value: 30 }],
      };
      expect(evaluator.evaluateExpression(expr, testData).matched).toBe(true);

      const expr2: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: '>', value: 40 }],
      };
      expect(evaluator.evaluateExpression(expr2, testData).matched).toBe(false);
    });

    it('should evaluate less than (<)', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: '<', value: 40 }],
      };
      expect(evaluator.evaluateExpression(expr, testData).matched).toBe(true);
    });

    it('should evaluate greater than or equal (>=)', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'score', operator: '>=', value: 85.5 }],
      };
      expect(evaluator.evaluateExpression(expr, testData).matched).toBe(true);
    });

    it('should evaluate less than or equal (<=)', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'orders', operator: '<=', value: 10 }],
      };
      expect(evaluator.evaluateExpression(expr, testData).matched).toBe(true);
    });

    it('should evaluate equality (==)', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'orders', operator: '==', value: 10 }],
      };
      expect(evaluator.evaluateExpression(expr, testData).matched).toBe(true);
    });

    it('should evaluate inequality (!=)', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: '!=', value: 40 }],
      };
      expect(evaluator.evaluateExpression(expr, testData).matched).toBe(true);
    });

    it('should evaluate between operator', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: 'between', value: [30, 40] }],
      };
      expect(evaluator.evaluateExpression(expr, testData).matched).toBe(true);

      const expr2: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: 'between', value: [40, 50] }],
      };
      expect(evaluator.evaluateExpression(expr2, testData).matched).toBe(false);
    });
  });

  describe('Array Operators', () => {
    const testData = {
      tags: ['vip', 'premium', 'active'],
      categories: [1, 2, 3],
    };

    it('should evaluate includes operator', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'tags', operator: 'includes', value: 'vip' }],
      };
      expect(evaluator.evaluateExpression(expr, testData).matched).toBe(true);

      const expr2: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'tags', operator: 'includes', value: 'basic' }],
      };
      expect(evaluator.evaluateExpression(expr2, testData).matched).toBe(false);
    });

    it('should throw error when includes used on non-array field', () => {
      const data = { name: 'test' };
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'name', operator: 'includes', value: 't' }],
      };

      expect(() => evaluator.evaluateExpression(expr, data)).toThrow(
        'includes 运算符要求字段值为数组'
      );
    });

    it('should throw error when in operator used with non-array', () => {
      const data = { age: 30 };
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: 'in', value: 30 }],
      };

      expect(() => evaluator.evaluateExpression(expr, data)).toThrow(
        'in 运算符需要数组'
      );
    });
  });

  describe('String Operators', () => {
    const testData = {
      name: 'John Doe',
      email: 'john@example.com',
      description: 'This is a test',
    };

    it('should evaluate contains operator', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'name', operator: 'contains', value: 'John' }],
      };
      expect(evaluator.evaluateExpression(expr, testData).matched).toBe(true);
    });

    it('should evaluate startsWith operator', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'name', operator: 'startsWith', value: 'John' }],
      };
      expect(evaluator.evaluateExpression(expr, testData).matched).toBe(true);
    });

    it('should evaluate endsWith operator', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'email', operator: 'endsWith', value: '.com' }],
      };
      expect(evaluator.evaluateExpression(expr, testData).matched).toBe(true);
    });
  });

  describe('Nested Field Access', () => {
    const testData = {
      profile: {
        age: 35,
        score: 85,
        address: {
          city: 'Beijing',
          district: 'Chaoyang',
        },
      },
    };

    it('should access nested fields with dot notation', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'profile.age', operator: '>', value: 30 },
          { field: 'profile.score', operator: '>=', value: 80 },
        ],
      };
      expect(evaluator.evaluateExpression(expr, testData).matched).toBe(true);
    });

    it('should access deeply nested fields', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'profile.address.district', operator: '==', value: 'Chaoyang' }],
      };
      expect(evaluator.evaluateExpression(expr, testData).matched).toBe(true);
    });

    it('should handle undefined nested fields', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'profile.nonexistent.field', operator: '>', value: 0 }],
      };
      expect(evaluator.evaluateExpression(expr, testData).matched).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      const data = { age: null, score: undefined };
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: '>', value: 30 }],
      };
      expect(evaluator.evaluateExpression(expr, data).matched).toBe(false);
    });

    it('should handle empty string values', () => {
      const data = { name: '' };
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'name', operator: '==', value: '' }],
      };
      expect(evaluator.evaluateExpression(expr, data).matched).toBe(true);
    });

    it('should handle boolean values', () => {
      const data = { active: true, verified: false };
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'active', operator: '==', value: true },
          { field: 'verified', operator: '!=', value: true },
        ],
      };
      expect(evaluator.evaluateExpression(expr, data).matched).toBe(true);
    });

    it('should throw error for unsupported operator', () => {
      const data = { age: 30 };
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: 'invalid' as any, value: 30 }],
      };

      expect(() => evaluator.evaluateExpression(expr, data)).toThrow(
        '无效的运算符：invalid'
      );
    });

    it('should throw error when between operator has invalid array', () => {
      const data = { age: 30 };
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: 'between', value: [30] }],
      };

      expect(() => evaluator.evaluateExpression(expr, data)).toThrow(
        'between 运算符需要两个值的数组'
      );
    });
  });

  describe('Complex Scenarios', () => {
    it('should evaluate complex business rule', () => {
      const customerData = {
        age: 35,
        income: 50000,
        creditScore: 750,
        employmentYears: 10,
        hasLoan: false,
      };

      const loanApprovalRule: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'age', operator: '>=', value: 25 },
          { field: 'income', operator: '>=', value: 40000 },
          { field: 'creditScore', operator: '>=', value: 700 },
          {
            operator: 'OR',
            conditions: [
              { field: 'employmentYears', operator: '>=', value: 5 },
              { field: 'hasLoan', operator: '==', value: false },
            ],
          },
        ],
      };

      const result = evaluator.evaluateExpression(loanApprovalRule, customerData);

      expect(result.matched).toBe(true);
      expect(result.confidence).toBe(1);
      expect(result.matchedConditions).toBe(4);
      expect(result.totalConditions).toBe(4);
    });

    it('should evaluate RFM segmentation rule', () => {
      const customerData = {
        recency: 30,
        frequency: 15,
        monetary: 5000,
      };

      const highValueRule: RuleExpression = {
        operator: 'AND',
        conditions: [
          { field: 'recency', operator: '<=', value: 60 },
          { field: 'frequency', operator: '>=', value: 10 },
          { field: 'monetary', operator: '>=', value: 3000 },
        ],
      };

      const result = evaluator.evaluateExpression(highValueRule, customerData);

      expect(result.matched).toBe(true);
      expect(result.confidence).toBe(1);
    });
  });
});
