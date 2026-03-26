import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { RecommendationRule } from '../entities/recommendation-rule.entity';
import { CreateRuleDto, UpdateRuleDto } from '../dto/create-rule.dto';
import { PaginatedResponse } from '../dto/get-recommendations.dto';

export interface GetRulesDto {
  page?: number;
  limit?: number;
  ruleName?: string;
  isActive?: boolean;
  sortBy?: 'priority' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class RuleManagerService {
  private readonly logger = new Logger(RuleManagerService.name);

  constructor(
    @InjectRepository(RecommendationRule)
    private readonly ruleRepo: Repository<RecommendationRule>,
  ) {}

  /**
   * 创建规则
   */
  async createRule(dto: CreateRuleDto): Promise<RecommendationRule> {
    // 检查规则名称是否已存在
    const existing = await this.ruleRepo.findOne({
      where: { ruleName: dto.ruleName },
    });

    if (existing) {
      throw new BadRequestException(`规则名称 "${dto.ruleName}" 已存在`);
    }

    // 验证规则表达式
    this.validateRuleExpression(dto.ruleExpression);

    // 转换 tagTemplate 为对象类型（如果传入的是字符串）
    const tagTemplate = typeof dto.tagTemplate === 'string' 
      ? JSON.parse(dto.tagTemplate)
      : dto.tagTemplate;

    const rule = this.ruleRepo.create({
      ruleName: dto.ruleName,
      ruleExpression: dto.ruleExpression,
      priority: dto.priority,
      tagTemplate,
      isActive: dto.isActive,
    });
    
    const saved = await this.ruleRepo.save(rule);
    this.logger.log(`Created rule: ${saved.ruleName} (ID: ${saved.id})`);
    return saved;
  }

  /**
   * 分页获取规则列表
   */
  async getRules(options: GetRulesDto): Promise<PaginatedResponse<RecommendationRule>> {
    const {
      page = 1,
      limit = 20,
      ruleName,
      isActive,
      sortBy = 'priority',
      sortOrder = 'desc',
    } = options;

    const where: FindOptionsWhere<RecommendationRule> = {};

    if (ruleName) {
      where.ruleName = Like(`%${ruleName}%`);
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const order: any = {};
    order[sortBy] = sortOrder === 'desc' ? 'DESC' : 'ASC';
    order.createdAt = 'DESC';

    const [data, total] = await this.ruleRepo.findAndCount({
      where,
      order,
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponse(data, total, page, limit);
  }

  /**
   * 获取单个规则详情
   */
  async getRuleById(id: number): Promise<RecommendationRule> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    
    if (!rule) {
      throw new NotFoundException(`规则 ID ${id} 不存在`);
    }
    
    return rule;
  }

  /**
   * 更新规则
   */
  async updateRule(id: number, dto: UpdateRuleDto): Promise<RecommendationRule> {
    const rule = await this.getRuleById(id);

    // 如果修改了规则名称，检查是否与其他规则冲突
    if (dto.ruleName && dto.ruleName !== rule.ruleName) {
      const existing = await this.ruleRepo.findOne({
        where: { ruleName: dto.ruleName },
      });
      
      if (existing) {
        throw new BadRequestException(`规则名称 "${dto.ruleName}" 已存在`);
      }
    }

    // 如果修改了规则表达式，验证其有效性
    if (dto.ruleExpression) {
      this.validateRuleExpression(dto.ruleExpression);
    }

    // 处理 tagTemplate 类型转换
    if (dto.tagTemplate !== undefined) {
      rule.tagTemplate = typeof dto.tagTemplate === 'string' 
        ? JSON.parse(dto.tagTemplate)
        : dto.tagTemplate;
      delete dto.tagTemplate;
    }

    Object.assign(rule, dto);
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
   * 激活规则
   */
  async activateRule(id: number): Promise<RecommendationRule> {
    const rule = await this.getRuleById(id);
    rule.isActive = true;
    const updated = await this.ruleRepo.save(rule);
    this.logger.log(`Activated rule: ${rule.ruleName} (ID: ${id})`);
    return updated;
  }

  /**
   * 停用规则
   */
  async deactivateRule(id: number): Promise<RecommendationRule> {
    const rule = await this.getRuleById(id);
    rule.isActive = false;
    const updated = await this.ruleRepo.save(rule);
    this.logger.log(`Deactivated rule: ${rule.ruleName} (ID: ${id})`);
    return updated;
  }

  /**
   * 测试规则表达式
   */
  async testRuleExpression(expression: string, testData: Record<string, any>): Promise<{
    valid: boolean;
    result?: boolean;
    error?: string;
  }> {
    try {
      this.validateRuleExpression(expression);
      
      // 创建安全的执行环境
      const context = { ...testData };
      const keys = Object.keys(context);
      const values = Object.values(context);
      
      // 使用 Function 构造器安全执行表达式
      const func = new Function(...keys, `return ${expression};`);
      const result = func(...values);
      
      return {
        valid: true,
        result: Boolean(result),
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * 验证规则表达式
   */
  private validateRuleExpression(expression: string): void {
    if (!expression || expression.trim().length === 0) {
      throw new BadRequestException('规则表达式不能为空');
    }

    // 检查危险关键词
    const dangerousKeywords = [
      'require', 'import', 'eval', 'Function', 'constructor',
      'process', 'global', 'Buffer', '__dirname', '__filename',
    ];

    for (const keyword of dangerousKeywords) {
      if (new RegExp(`\\b${keyword}\\b`, 'i').test(expression)) {
        throw new BadRequestException(`规则表达式包含不安全的内容：${keyword}`);
      }
    }

    // 简单语法检查：尝试编译表达式
    try {
      new Function('context', `with(context) { return ${expression}; }`);
    } catch (error) {
      throw new BadRequestException(`规则表达式语法错误：${error.message}`);
    }
  }

  /**
   * 批量导入规则
   */
  async batchImportRules(rules: CreateRuleDto[]): Promise<{
    total: number;
    success: number;
    failed: number;
    errors: Array<{ index: number; error: string }>;
  }> {
    const result = {
      total: rules.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ index: number; error: string }>,
    };

    for (let i = 0; i < rules.length; i++) {
      try {
        await this.createRule(rules[i]);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          index: i,
          error: error.message,
        });
      }
    }

    return result;
  }

  /**
   * 批量导出规则
   */
  async exportRules(): Promise<CreateRuleDto[]> {
    const rules = await this.ruleRepo.find({
      select: ['ruleName', 'ruleExpression', 'priority', 'tagTemplate'],
    });

    return rules.map((rule) => ({
      ruleName: rule.ruleName,
      ruleExpression: rule.ruleExpression,
      priority: rule.priority,
      // 将对象转换为字符串以符合 DTO 类型
      tagTemplate: typeof rule.tagTemplate === 'object' 
        ? JSON.stringify(rule.tagTemplate)
        : rule.tagTemplate,
    }));
  }
}
