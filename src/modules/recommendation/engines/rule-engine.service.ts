import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationRule } from '../entities/recommendation-rule.entity';
import { CreateRecommendationDto } from '../entities/tag-recommendation.entity';

export interface CustomerData {
  id: number;
  totalAssets?: number;
  monthlyIncome?: number;
  annualSpend?: number;
  lastLoginDays?: number;
  registerDays?: number;
  orderCount?: number;
  productCount?: number;
  riskLevel?: string;
  age?: number;
  gender?: string;
  city?: string;
  membershipLevel?: string;
}

interface RuleEvaluationResult {
  rule: RecommendationRule;
  matched: boolean;
  confidence?: number;
  reason?: string;
}

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    @InjectRepository(RecommendationRule)
    private readonly ruleRepo: Repository<RecommendationRule>,
  ) {}

  async loadActiveRules(): Promise<RecommendationRule[]> {
    return await this.ruleRepo.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async generateRecommendations(customer: CustomerData): Promise<CreateRecommendationDto[]> {
    const recommendations: CreateRecommendationDto[] = [];

    try {
      const rules = await this.loadActiveRules();
      this.logger.debug(`Loaded ${rules.length} active rules`);

      for (const rule of rules) {
        const result = await this.evaluateRule(rule, customer);
        
        if (result.matched && result.confidence && result.confidence >= 0.6) {
          const tagTemplate = rule.tagTemplate || { name: '智能推荐标签', category: '规则推荐' };
          
          recommendations.push({
            customerId: customer.id,
            tagName: tagTemplate.name,
            tagCategory: tagTemplate.category || this.inferCategory(rule),
            confidence: result.confidence,
            source: 'rule',
            reason: result.reason || `规则匹配：${rule.ruleName} (优先级：${rule.priority})`,
          });
        }
      }

      this.logger.log(`Rule engine generated ${recommendations.length} recommendations`);
      return recommendations;
    } catch (error) {
      this.logger.error('Rule engine failed:', error);
      return [];
    }
  }

  private async evaluateRule(
    rule: RecommendationRule,
    customer: CustomerData
  ): Promise<RuleEvaluationResult> {
    try {
      const condition = this.parseCondition(rule.ruleExpression);
      const matched = this.evaluateCondition(condition, customer);

      if (!matched) {
        return { rule, matched: false };
      }

      const confidence = this.calculateConfidence(rule);

      return {
        rule,
        matched: true,
        confidence,
        reason: `规则匹配：${rule.ruleName}`,
      };
    } catch (error) {
      this.logger.warn(`Failed to evaluate rule ${rule.id}: ${error.message}`);
      return { rule, matched: false };
    }
  }

  private parseCondition(condition: string): any {
    const andParts = condition.split(/\s+AND\s+/i);
    
    const groups = andParts.map(part => {
      const orParts = part.split(/\s+OR\s+/i);
      return orParts.map(expr => {
        const match = expr.trim().match(/^(\w+)\s*(>=|<=|!=|==|>|<|contains|in)\s*(.+)$/i);
        if (!match) {
          throw new Error(`Invalid condition: ${expr}`);
        }
        return {
          field: match[1],
          operator: match[2].toLowerCase(),
          value: this.parseValue(match[3]),
        };
      });
    });

    return { type: 'and', groups };
  }

  private evaluateCondition(condition: any, customer: any): boolean {
    if (condition.type === 'and') {
      return condition.groups.every((group: any[]) => 
        group.some((cond: any) => this.evaluateSingleCondition(cond, customer))
      );
    }
    return false;
  }

  private evaluateSingleCondition(cond: any, customer: any): boolean {
    const fieldValue = customer[cond.field];
    
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    switch (cond.operator) {
      case '>': return Number(fieldValue) > Number(cond.value);
      case '>=': return Number(fieldValue) >= Number(cond.value);
      case '<': return Number(fieldValue) < Number(cond.value);
      case '<=': return Number(fieldValue) <= Number(cond.value);
      case '==': return String(fieldValue) === String(cond.value);
      case '!=': return String(fieldValue) !== String(cond.value);
      case 'contains': return String(fieldValue).includes(String(cond.value));
      case 'in': {
        const values = Array.isArray(cond.value) ? cond.value : [cond.value];
        return values.includes(String(fieldValue));
      }
      default: return false;
    }
  }

  private calculateConfidence(rule: RecommendationRule): number {
    let confidence = rule.tagTemplate?.baseConfidence || 0.7;

    if (rule.priority >= 90) {
      confidence = Math.min(1.0, confidence + 0.15);
    } else if (rule.priority >= 70) {
      confidence = Math.min(1.0, confidence + 0.1);
    }

    return Math.round(confidence * 100) / 100;
  }

  private inferCategory(rule: RecommendationRule): string {
    const name = rule.ruleName.toLowerCase();

    if (name.includes('价值') || name.includes('high-value')) return '客户价值';
    if (name.includes('流失') || name.includes('risk')) return '风险预警';
    if (name.includes('潜力') || name.includes('potential')) return '增长潜力';
    if (name.includes('交叉') || name.includes('cross')) return '营销机会';
    if (name.includes('活跃') || name.includes('active')) return '行为特征';

    return '智能推荐';
  }

  private parseValue(valueStr: string): any {
    valueStr = valueStr.trim();
    if (valueStr.startsWith('[\'') && valueStr.endsWith('\']')) {
      return valueStr.slice(2, -2).split('\',\'');
    }
    if (/^\d+(\.\d+)?$/.test(valueStr)) return Number(valueStr);
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;
    if ((valueStr.startsWith('\'') && valueStr.endsWith('\'')) ||
        (valueStr.startsWith('"') && valueStr.endsWith('"'))) {
      return valueStr.slice(1, -1);
    }
    return valueStr;
  }

  async createPredefinedRules(): Promise<void> {
    const rules: Partial<RecommendationRule>[] = [
      {
        ruleName: '高价值客户识别',
        ruleExpression: 'totalAssets >= 1000000 AND monthlyIncome >= 50000',
        priority: 95,
        tagTemplate: { name: '高价值客户', category: '客户价值', baseConfidence: 0.9 },
        isActive: true,
      },
      {
        ruleName: '流失风险预警',
        ruleExpression: 'lastLoginDays >= 30 AND totalAssets >= 100000',
        priority: 90,
        tagTemplate: { name: '流失风险客户', category: '风险预警', baseConfidence: 0.85 },
        isActive: true,
      },
      {
        ruleName: '潜力客户挖掘',
        ruleExpression: 'age <= 35 AND monthlyIncome >= 10000 AND registerDays <= 365',
        priority: 80,
        tagTemplate: { name: '高潜力客户', category: '增长潜力', baseConfidence: 0.75 },
        isActive: true,
      },
      {
        ruleName: '交叉销售机会',
        ruleExpression: 'productCount >= 3 AND totalAssets >= 500000',
        priority: 85,
        tagTemplate: { name: '交叉销售目标', category: '营销机会', baseConfidence: 0.8 },
        isActive: true,
      },
      {
        ruleName: '活跃客户标识',
        ruleExpression: 'orderCount >= 10 AND lastLoginDays <= 7',
        priority: 75,
        tagTemplate: { name: '活跃客户', category: '行为特征', baseConfidence: 0.85 },
        isActive: true,
      },
    ];

    for (const ruleData of rules) {
      const existing = await this.ruleRepo.findOne({
        where: { ruleName: ruleData.ruleName! },
      });

      if (!existing) {
        const rule = this.ruleRepo.create(ruleData);
        await this.ruleRepo.save(rule);
        this.logger.log(`Created rule: ${ruleData.ruleName}`);
      }
    }
  }
}
