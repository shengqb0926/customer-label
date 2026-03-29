import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { RecommendationRule } from '../entities/recommendation-rule.entity';
import { CreateRecommendationDto } from '../entities/tag-recommendation.entity';
import { RuleParser } from '../engines/rule-parser';
import { RuleEvaluator } from '../engines/rule-evaluator';
import { CreateRuleDto } from '../dto/create-rule.dto';
import { UpdateRuleDto } from '../dto/update-rule.dto';
import { TestRuleDto } from '../dto/test-rule.dto';

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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    @InjectRepository(RecommendationRule)
    private readonly ruleRepo: Repository<RecommendationRule>,
    private readonly parser: RuleParser,
    private readonly evaluator: RuleEvaluator,
  ) {}

  /**
   * 加载活跃规则
   */
  async loadActiveRules(): Promise<RecommendationRule[]> {
    return await this.ruleRepo.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
  }

  /**
   * 为客户生成推荐
   */
  async generateRecommendations(customer: CustomerData): Promise<any[]> {
    const recommendations: any[] = [];

    try {
      const rules = await this.loadActiveRules();
      this.logger.debug(`Loaded ${rules.length} active rules`);

      for (const rule of rules) {
        try {
          // 解析规则表达式 - 需要将 JSON 字符串转换为对象
          let expressionObj: any;
          
          if (typeof rule.ruleExpression === 'string') {
            try {
              expressionObj = JSON.parse(rule.ruleExpression);
            } catch (parseError) {
              this.logger.warn(`Failed to parse rule ${rule.id} expression as JSON: ${parseError.message}`);
              continue; // 跳过格式错误的规则
            }
          } else {
            expressionObj = rule.ruleExpression;
          }
          
          // 解析并评估规则
          const expression = this.parser.parse(expressionObj);
          const result = this.evaluator.evaluateExpression(expression, customer);
          
          if (result.matched && result.confidence && result.confidence >= 0.6) {
            // 为每个规则生成推荐标签
            // tagTemplate 现在是 string[] 格式，取第一个作为标签名
            const tagName = Array.isArray(rule.tagTemplate) 
              ? rule.tagTemplate[0] 
              : (rule.tagTemplate?.name || '未命名标签');
            
            // 限制置信度范围在 0-0.9999 之间，避免数据库溢出
            const confidence = Math.min(result.confidence, 0.9999);
            
            recommendations.push({
              customerId: customer.id,
              tagName: tagName,
              tagCategory: this.inferCategory(rule),
              confidence: confidence,
              source: 'rule',
              reason: `规则匹配:${rule.ruleName} (优先级：${rule.priority})`,
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to evaluate rule ${rule.id}: ${error.message}`);
        }
      }

      this.logger.log(`Rule engine generated ${recommendations.length} recommendations`);
      return recommendations;
    } catch (error) {
      this.logger.error('Rule engine failed:', error);
      return [];
    }
  }

  /**
   * 推断标签类别
   */
  private inferCategory(rule: RecommendationRule): string | undefined {
    const name = rule.ruleName.toLowerCase();
    
    if (name.includes('价值') || name.includes('vip') || name.includes('高净')) {
      return 'value';
    } else if (name.includes('流失') || name.includes('风险')) {
      return 'risk';
    } else if (name.includes('潜力') || name.includes('成长')) {
      return 'potential';
    } else if (name.includes('频繁') || name.includes('活跃')) {
      return 'activity';
    } else if (name.includes('新客') || name.includes('注册')) {
      return 'new_customer';
    }
    
    return undefined;
  }

  /**
   * 分页获取规则列表
   */
  async getRules(options: { page: number; limit: number; isActive?: boolean }): Promise<PaginatedResponse<RecommendationRule>> {
    const { page = 1, limit = 20, isActive } = options;
    
    const where: FindOptionsWhere<RecommendationRule> = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await this.ruleRepo.findAndCount({
      where,
      order: { priority: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /**
   * 根据 ID 获取规则
   */
  async getRuleById(id: number): Promise<RecommendationRule> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`规则 ${id} 不存在`);
    }
    return rule;
  }

  /**
   * 创建规则
   */
  async createRule(dto: CreateRuleDto): Promise<RecommendationRule> {
    // 检查名称是否重复
    const existing = await this.ruleRepo.findOne({
      where: { ruleName: dto.ruleName },
    });

    if (existing) {
      throw new BadRequestException(`规则名称 "${dto.ruleName}" 已存在`);
    }

    // 解析并验证表达式
    let expression;
    try {
      expression = typeof dto.ruleExpression === 'string' 
        ? JSON.parse(dto.ruleExpression) 
        : dto.ruleExpression;
      this.parser.parse(expression);
    } catch (error) {
      throw new BadRequestException(`规则表达式无效：${error.message}`);
    }

    const rule = this.ruleRepo.create({
      ruleName: dto.ruleName,
      description: dto.description,
      ruleExpression: JSON.stringify(expression),
      priority: dto.priority,
      tagTemplate: dto.tagTemplate,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.ruleRepo.save(rule);
    this.logger.log(`Created rule: ${saved.ruleName} (ID: ${saved.id})`);
    return saved;
  }

  /**
   * 更新规则
   */
  async updateRule(id: number, dto: UpdateRuleDto): Promise<RecommendationRule> {
    const rule = await this.getRuleById(id);

    // 如果修改了名称，检查是否重复
    if (dto.ruleName && dto.ruleName !== rule.ruleName) {
      const existing = await this.ruleRepo.findOne({
        where: { ruleName: dto.ruleName },
      });
      if (existing) {
        throw new BadRequestException(`规则名称 "${dto.ruleName}" 已存在`);
      }
      rule.ruleName = dto.ruleName;
    }

    // 如果修改了表达式，验证有效性
    if (dto.ruleExpression) {
      try {
        const expression = typeof dto.ruleExpression === 'string' 
          ? JSON.parse(dto.ruleExpression) 
          : dto.ruleExpression;
        this.parser.parse(expression);
        rule.ruleExpression = JSON.stringify(expression);
      } catch (error) {
        throw new BadRequestException(`规则表达式无效：${error.message}`);
      }
    }

    if (dto.description !== undefined) rule.description = dto.description;
    if (dto.priority !== undefined) rule.priority = dto.priority;
    if (dto.tagTemplate) rule.tagTemplate = dto.tagTemplate;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;

    const updated = await this.ruleRepo.save(rule);
    this.logger.log(`Updated rule: ${updated.ruleName} (ID: ${updated.id})`);
    return updated;
  }

  /**
   * 删除规则
   */
  async deleteRule(id: number): Promise<void> {
    const rule = await this.getRuleById(id);
    await this.ruleRepo.remove(rule);
    this.logger.log(`Deleted rule: ${rule.ruleName} (ID: ${id})`);
  }

  /**
   * 激活/停用规则
   */
  async activateRule(id: number): Promise<RecommendationRule> {
    const rule = await this.getRuleById(id);
    rule.isActive = true;
    const updated = await this.ruleRepo.save(rule);
    this.logger.log(`Activated rule: ${updated.ruleName}`);
    return updated;
  }

  async deactivateRule(id: number): Promise<RecommendationRule> {
    const rule = await this.getRuleById(id);
    rule.isActive = false;
    const updated = await this.ruleRepo.save(rule);
    this.logger.log(`Deactivated rule: ${updated.ruleName}`);
    return updated;
  }

  /**
   * 测试规则
   */
  async testRule(expression: any, customerData: Record<string, any>): Promise<any> {
    try {
      // 解析表达式
      const parsed = this.parser.parse(expression);
      
      // 评估规则
      const result = this.evaluator.evaluateExpression(parsed, customerData);
      
      return {
        matched: result.matched,
        confidence: result.confidence,
        expression,
        customerData,
      };
    } catch (error) {
      throw new BadRequestException(`规则测试失败：${error.message}`);
    }
  }

  /**
   * 导入规则
   */
  async importRules(rules: Partial<RecommendationRule>[]): Promise<number> {
    let count = 0;
    for (const ruleData of rules) {
      try {
        // 检查是否存在
        const existing = await this.ruleRepo.findOne({
          where: { ruleName: ruleData.ruleName! },
        });

        if (existing) {
          this.logger.warn(`Rule "${ruleData.ruleName}" already exists, skipping...`);
          continue;
        }

        // 创建规则
        const rule = this.ruleRepo.create({
          ruleName: ruleData.ruleName!,
          description: ruleData.description,
          ruleExpression: typeof ruleData.ruleExpression === 'string' ? ruleData.ruleExpression : JSON.stringify(ruleData.ruleExpression),
          priority: ruleData.priority ?? 50,
          tagTemplate: ruleData.tagTemplate!,
          isActive: ruleData.isActive ?? true,
        });

        await this.ruleRepo.save(rule);
        this.logger.log(`Imported rule: ${rule.ruleName}`);
        count++;
      } catch (error) {
        this.logger.error(`Failed to import rule "${ruleData.ruleName}": ${error.message}`);
      }
    }
    return count;
  }

  /**
   * 导出规则
   */
  async exportRules(): Promise<Partial<RecommendationRule>[]> {
    const rules = await this.ruleRepo.find({
      order: { priority: 'DESC' },
    });

    return rules.map(rule => ({
      ruleName: rule.ruleName,
      description: rule.description,
      ruleExpression: rule.ruleExpression,
      priority: rule.priority,
      tagTemplate: rule.tagTemplate,
      isActive: rule.isActive,
    }));
  }
}
