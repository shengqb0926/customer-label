import { Injectable } from '@nestjs/common';
import { RuleParser } from './rule-parser';
import type { RuleExpression, Condition } from '../entities/recommendation-rule.entity';

/**
 * 评估结果接口
 */
export interface EvaluationResult {
  matched: boolean;
  confidence: number;
  matchedConditions?: number;
  totalConditions?: number;
}

/**
 * 规则评估器
 * 负责评估规则表达式与客户数据的匹配程度
 */
@Injectable()
export class RuleEvaluator {
  constructor(private parser: RuleParser) {}

  /**
   * 评估整个表达式
   */
  evaluateExpression(
    expression: RuleExpression,
    data: Record<string, any>
  ): EvaluationResult {
    // 先验证表达式
    const validatedExpr = this.parser.parse(expression);

    if (!validatedExpr.conditions || validatedExpr.conditions.length === 0) {
      return { matched: false, confidence: 0 };
    }

    const results = validatedExpr.conditions.map(condition => 
      this.evaluateConditionRecursive(condition, data)
    );

    let matched: boolean;
    switch (validatedExpr.operator) {
      case 'AND':
        matched = results.every(r => r.matched);
        break;
      case 'OR':
        matched = results.some(r => r.matched);
        break;
      case 'NOT':
        matched = !results.some(r => r.matched);
        break;
      default:
        matched = false;
    }

    // 计算置信度（基于匹配的条件数量）
    const matchedCount = results.filter(r => r.matched).length;
    const totalCount = results.length;
    const confidence = matched && totalCount > 0 ? matchedCount / totalCount : matched ? 1 : 0;

    return {
      matched,
      confidence,
      matchedConditions: matchedCount,
      totalConditions: totalCount,
    };
  }

  /**
   * 递归评估条件（支持嵌套表达式）
   */
  private evaluateConditionRecursive(
    condition: Condition | RuleExpression,
    data: Record<string, any>
  ): EvaluationResult {
    // 如果是嵌套表达式，递归评估
    if ('operator' in condition && ['AND', 'OR', 'NOT'].includes(condition.operator)) {
      return this.evaluateExpression(condition as RuleExpression, data);
    }

    // 评估简单条件
    const cond = condition as Condition;
    const matched = this.evaluateCondition(cond, data);
    
    return {
      matched,
      confidence: matched ? 1 : 0,
    };
  }

  /**
   * 评估单个条件
   */
  private evaluateCondition(condition: Condition, data: Record<string, any>): boolean {
    const value = this.getFieldValue(data, condition.field);
    
    // 处理空值情况
    if (value === undefined || value === null) {
      return false;
    }

    const { operator, value: expectedValue } = condition;

    switch (operator) {
      // 数值比较
      case '>':
        return Number(value) > Number(expectedValue);
      case '<':
        return Number(value) < Number(expectedValue);
      case '>=':
        return Number(value) >= Number(expectedValue);
      case '<=':
        return Number(value) <= Number(expectedValue);
      case '==':
        return value == expectedValue;
      case '!=':
        return value != expectedValue;

      // 范围判断
      case 'between':
        if (!Array.isArray(expectedValue) || expectedValue.length !== 2) {
          throw new Error('between 运算符需要两个值的数组');
        }
        return Number(value) >= Number(expectedValue[0]) && 
               Number(value) <= Number(expectedValue[1]);

      // 包含判断
      case 'in':
        if (!Array.isArray(expectedValue)) {
          throw new Error('in 运算符需要数组');
        }
        return expectedValue.includes(value);
      
      case 'includes':
        if (!Array.isArray(value)) {
          throw new Error('includes 运算符要求字段值为数组');
        }
        return value.includes(expectedValue);

      case 'contains':
        return String(value).includes(String(expectedValue));

      // 字符串判断
      case 'startsWith':
        return String(value).startsWith(String(expectedValue));
      
      case 'endsWith':
        return String(value).endsWith(String(expectedValue));

      default:
        throw new Error(`不支持的运算符：${operator}`);
    }
  }

  /**
   * 获取嵌套字段的值
   * 支持路径访问：'profile.age' -> data.profile.age
   */
  private getFieldValue(data: Record<string, any>, fieldPath: string): any {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], data);
  }
}
