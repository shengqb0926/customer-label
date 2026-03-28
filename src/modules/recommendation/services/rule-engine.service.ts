import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RuleEngine } from '../engines/rule-engine';
import { RecommendationRule } from '../entities/recommendation-rule.entity';
import { TagRecommendation } from '../entities/tag-recommendation.entity';
import { CreateRuleDto } from '../dto/create-rule.dto';
import { UpdateRuleDto } from '../dto/update-rule.dto';

/**
 * 规则引擎业务服务
 */
@Injectable()
export class RuleEngineService {
  constructor(
    private ruleEngine: RuleEngine,
    @InjectRepository(RecommendationRule)
    private ruleRepository: Repository<RecommendationRule>,
    @InjectRepository(TagRecommendation)
    private recommendationRepository: Repository<TagRecommendation>,
  ) {}

  /**
   * 为客户生成推荐
   */
  async generateRecommendations(customerId: number): Promise<Partial<TagRecommendation>[]> {
    // TODO: 从数据库或缓存获取客户完整数据
    // 这里使用示例数据
    const customer = await this.getCustomerData(customerId);
    
    // 执行规则引擎
    const recommendations = await this.ruleEngine.recommend(customer);
    
    // 保存到数据库
    return await this.saveRecommendations(recommendations);
  }

  /**
   * 测试规则
   */
  async testRule(
    expression: any,
    customerData: Record<string, any>
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await this.ruleEngine.evaluateSingleExpression(expression, customerData);
      
      return {
        success: true,
        matched: result.matched,
        confidence: result.confidence,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        matched: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 获取规则列表
   */
  async getRules(params?: { page?: number; limit?: number; isActive?: boolean }) {
    const { page = 1, limit = 20, isActive } = params || {};
    
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [rules, total] = await this.ruleRepository.findAndCount({
      where,
      order: { priority: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: rules,
      total,
      page,
      limit,
    };
  }

  /**
   * 获取规则详情
   */
  async getRuleById(id: number): Promise<RecommendationRule> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`规则 ${id} 不存在`);
    }
    return rule;
  }

  /**
   * 创建规则
   */
  async createRule(dto: CreateRuleDto): Promise<RecommendationRule> {
    // 检查名称是否已存在
    const existing = await this.ruleRepository.findOne({ 
      where: { ruleName: dto.ruleName } 
    });
    
    if (existing) {
      throw new Error(`规则名称 "${dto.ruleName}" 已存在`);
    }

    const rule = this.ruleRepository.create({
      ruleName: dto.ruleName,
      description: dto.description,
      ruleExpression: JSON.stringify(dto.ruleExpression),
      priority: dto.priority,
      tagTemplate: dto.tagTemplate,
      isActive: dto.isActive ?? true,
    });
    return await this.ruleRepository.save(rule);
  }

  /**
   * 更新规则
   */
  async updateRule(id: number, dto: UpdateRuleDto): Promise<RecommendationRule> {
    const rule = await this.getRuleById(id);
    
    // 如果修改了名称，检查新名称是否已存在
    if (dto.ruleName && dto.ruleName !== rule.ruleName) {
      const existing = await this.ruleRepository.findOne({ 
        where: { ruleName: dto.ruleName } 
      });
      
      if (existing) {
        throw new Error(`规则名称 "${dto.ruleName}" 已存在`);
      }
      rule.ruleName = dto.ruleName;
    }

    if (dto.ruleExpression) {
      rule.ruleExpression = JSON.stringify(dto.ruleExpression);
    }
    if (dto.description !== undefined) rule.description = dto.description;
    if (dto.priority !== undefined) rule.priority = dto.priority;
    if (dto.tagTemplate) rule.tagTemplate = dto.tagTemplate;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;
    
    return await this.ruleRepository.save(rule);
  }

  /**
   * 删除规则
   */
  async deleteRule(id: number): Promise<void> {
    const rule = await this.getRuleById(id);
    await this.ruleRepository.remove(rule);
  }

  /**
   * 激活规则
   */
  async activateRule(id: number): Promise<RecommendationRule> {
    const rule = await this.getRuleById(id);
    rule.isActive = true;
    return await this.ruleRepository.save(rule);
  }

  /**
   * 停用规则
   */
  async deactivateRule(id: number): Promise<RecommendationRule> {
    const rule = await this.getRuleById(id);
    rule.isActive = false;
    return await this.ruleRepository.save(rule);
  }

  /**
   * 批量导入规则
   */
  async importRules(rules: Partial<RecommendationRule>[]): Promise<number> {
    let successCount = 0;
    
    for (const ruleData of rules) {
      try {
        if (ruleData.ruleName) {
          const existing = await this.ruleRepository.findOne({ 
            where: { ruleName: ruleData.ruleName } 
          });
          
          if (existing) {
            // 更新现有规则
            existing.ruleExpression = typeof ruleData.ruleExpression === 'string' ? ruleData.ruleExpression : JSON.stringify(ruleData.ruleExpression);
            if (ruleData.description) existing.description = ruleData.description;
            if (ruleData.priority) existing.priority = ruleData.priority;
            if (ruleData.tagTemplate) existing.tagTemplate = ruleData.tagTemplate;
            if (ruleData.isActive !== undefined) existing.isActive = ruleData.isActive;
            await this.ruleRepository.save(existing);
          } else {
            // 创建新规则
            const rule = this.ruleRepository.create({
              ruleName: ruleData.ruleName,
              description: ruleData.description,
              ruleExpression: typeof ruleData.ruleExpression === 'string' ? ruleData.ruleExpression : JSON.stringify(ruleData.ruleExpression),
              priority: ruleData.priority ?? 50,
              tagTemplate: ruleData.tagTemplate,
              isActive: ruleData.isActive ?? true,
            });
            await this.ruleRepository.save(rule);
          }
          successCount++;
        }
      } catch (error) {
        console.error(`导入规则失败：${ruleData.ruleName}`, error);
        // 继续导入其他规则
      }
    }
    
    return successCount;
  }

  /**
   * 批量导出规则
   */
  async exportRules(): Promise<RecommendationRule[]> {
    return await this.ruleRepository.find({
      order: { priority: 'DESC' },
    });
  }

  /**
   * 获取客户数据（示例实现）
   */
  private async getCustomerData(customerId: number): Promise<any> {
    // TODO: 实际项目中应从数据库或缓存获取
    // 这里返回示例数据用于测试
    return {
      id: customerId,
      totalOrders: 15,
      totalAmount: 25000,
      avgOrderValue: 1666,
      lastOrderDate: new Date('2026-03-20'),
      ordersLast30Days: 5,
      ordersLast90Days: 12,
      profile: {
        age: 35,
        city: '上海',
        membershipLevel: 'gold',
      },
      tags: ['VIP', '高频购买'],
    };
  }

  /**
   * 保存推荐结果
   */
  private async saveRecommendations(
    recommendations: Partial<TagRecommendation>[]
  ): Promise<Partial<TagRecommendation>[]> {
    if (recommendations.length === 0) {
      return [];
    }

    // 批量保存
    const saved = await this.recommendationRepository.save(recommendations);
    return saved;
  }
}
