import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('recommendation_rules')
@Index(['isActive'], { where: '"is_active" = TRUE' })
@Index('IDX_PRIORITY', ['priority'])
@Unique(['ruleName'])
export class RecommendationRule {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100, name: 'rule_name' })
  ruleName: string;

  @Column({ type: 'text', name: 'rule_expression' })
  ruleExpression: string;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'simple-json', name: 'tag_template' })
  tagTemplate: {
    name: string;
    category: string;
    baseConfidence: number;
  };

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'bigint', default: 0, name: 'hit_count' })
  hitCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true, name: 'acceptance_rate' })
  acceptanceRate: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_hit_at' })
  lastHitAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'int', nullable: true, name: 'created_by' })
  createdBy: number;

  @Column({ type: 'int', nullable: true, name: 'updated_by' })
  updatedBy: number;
}
