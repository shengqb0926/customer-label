import { Injectable } from '@nestjs/common';
import type { RuleExpression, Condition } from '../entities/recommendation-rule.entity';

/**
 * 验证后的规则表达式
 */
interface ValidatedRuleExpression extends RuleExpression {
  conditions?: (ValidatedRuleExpression | Condition)[];
}

/**
 * 规则解析器
 * 负责解析和验证规则表达式
 */
@Injectable()
export class RuleParser {
  /**
   * 支持的逻辑运算符
   */
  private readonly LOGICAL_OPERATORS = ['AND', 'OR', 'NOT'];

  /**
   * 支持的比较运算符
   */
  private readonly COMPARISON_OPERATORS = [
    '>', '<', '>=', '<=', '==', '!=', 
    'between', 'in', 'includes', 'contains',
    'startsWith', 'endsWith'
  ];

  /**
   * 解析并验证规则表达式
   * @param expression 原始表达式
   * @returns 验证后的表达式
   * @throws Error 当表达式无效时
   */
  parse(expression: unknown): ValidatedRuleExpression {
    if (!expression || typeof expression !== 'object') {
      throw new Error('规则表达式必须是对象');
    }

    const expr = expression as Record<string, any>;

    // 验证运算符
    if (!expr.operator || !this.LOGICAL_OPERATORS.includes(expr.operator)) {
      throw new Error(`无效的运算符：${expr.operator}。支持的运算符：${this.LOGICAL_OPERATORS.join(', ')}`);
    }

    // 递归解析条件
    const validatedExpr: ValidatedRuleExpression = {
      operator: expr.operator as 'AND' | 'OR' | 'NOT',
    };

    if (Array.isArray(expr.conditions)) {
      validatedExpr.conditions = expr.conditions.map((condition: any) => 
        this.parseCondition(condition)
      );
    }

    return validatedExpr;
  }

  /**
   * 解析单个条件
   */
  private parseCondition(condition: unknown): Condition | ValidatedRuleExpression {
    if (!condition || typeof condition !== 'object') {
      throw new Error('条件必须是对象');
    }

    const cond = condition as Record<string, any>;

    // 如果是嵌套表达式，递归解析
    if (cond.operator && this.LOGICAL_OPERATORS.includes(cond.operator)) {
      return this.parse(cond);
    }

    // 验证简单条件
    if (!cond.field || typeof cond.field !== 'string') {
      throw new Error('条件必须包含 field 字段（字符串类型）');
    }

    if (!cond.operator || !this.COMPARISON_OPERATORS.includes(cond.operator)) {
      throw new Error(`无效的运算符：${cond.operator}。支持的运算符：${this.COMPARISON_OPERATORS.join(', ')}`);
    }

    if (cond.value === undefined) {
      throw new Error('条件必须包含 value 字段');
    }

    return {
      field: cond.field,
      operator: cond.operator,
      value: cond.value,
    };
  }

  /**
   * 序列化表达式为可读格式（用于显示和调试）
   */
  stringify(expression: RuleExpression, indent = 0): string {
    const spaces = ' '.repeat(indent);
    
    if (!expression.conditions || expression.conditions.length === 0) {
      return `${spaces}${expression.operator}`;
    }

    let result = `${spaces}${expression.operator}(\n`;
    
    for (let i = 0; i < expression.conditions.length; i++) {
      const condition = expression.conditions[i];
      
      if ('operator' in condition && this.LOGICAL_OPERATORS.includes(condition.operator)) {
        result += this.stringify(condition as RuleExpression, indent + 2);
      } else {
        const cond = condition as Condition;
        result += `${spaces}  ${cond.field} ${cond.operator} ${JSON.stringify(cond.value)}`;
      }
      
      if (i < expression.conditions.length - 1) {
        result += ',';
      }
      result += '\n';
    }
    
    result += `${spaces})`;
    return result;
  }

  /**
   * 验证表达式语法是否正确
   */
  validate(expression: unknown): boolean {
    try {
      this.parse(expression);
      return true;
    } catch {
      return false;
    }
  }
}
