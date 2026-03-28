import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 规则表达式接口
 */
export interface RuleExpression {
  operator: 'AND' | 'OR' | 'NOT';
  conditions?: (RuleExpression | Condition)[];
}

/**
 * 单个条件接口
 */
export interface Condition {
  field: string;
  operator: string;
  value: any;
}

/**
 * 推荐规则实体
 * 用于存储和管理业务规则配置
 */
@Entity('recommendation_rules')
@Index(['isActive'])
@Index(['priority'])
export class RecommendationRule {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 规则名称（唯一）
   */
  @Column({ name: 'rule_name', type: 'varchar', length: 100, unique: true })
  ruleName: string;

  /**
   * 规则描述
   */
  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  /**
   * 规则表达式（JSON 格式）
   */
  @Column({ name: 'rule_expression', type: 'text' })
  ruleExpression: string;

  /**
   * 优先级（1-100，数字越大优先级越高）
   */
  @Column({ name: 'priority', type: 'int', default: 0 })
  priority: number;

  /**
   * 推荐的标签模板
   */
  @Column({ name: 'tag_template', type: 'jsonb' })
  tagTemplate: any;

  /**
   * 是否激活
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /**
   * 命中次数统计
   */
  @Column({ name: 'hit_count', type: 'bigint', default: 0 })
  hitCount: number;

  /**
   * 接受率
   */
  @Column({ name: 'acceptance_rate', type: 'decimal', precision: 5, scale: 4, nullable: true })
  acceptanceRate?: number;

  /**
   * 最后命中时间
   */
  @Column({ name: 'last_hit_at', type: 'timestamp', nullable: true })
  lastHitAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * 创建者 ID
   */
  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy?: number;

  /**
   * 更新者 ID
   */
  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy?: number;
}
