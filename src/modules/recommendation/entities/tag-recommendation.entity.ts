import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// 推荐状态枚举
export enum RecommendationStatus {
  PENDING = 'pending',      // 待处理
  ACCEPTED = 'accepted',    // 已接受
  REJECTED = 'rejected',    // 已拒绝
}

export interface CreateRecommendationDto {
  customerId: number;
  tagName: string;
  tagCategory: string;
  confidence: number;
  source: 'rule' | 'clustering' | 'association';
  reason: string;
}

@Entity('tag_recommendations')
@Index(['customerId'])
@Index(['source'])
@Index(['status'])
@Index(['createdAt'])
export class TagRecommendation {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int', name: 'customer_id' })
  customerId: number;

  @Column({ type: 'varchar', length: 100, name: 'tag_name' })
  tagName: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'tag_category' })
  tagCategory: string;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  confidence: number;

  @Column({ type: 'varchar', length: 20 })
  source: 'rule' | 'clustering' | 'association';

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true, name: 'score_overall' })
  scoreOverall: number;

  @Column({ type: 'enum', enum: RecommendationStatus, default: RecommendationStatus.PENDING, name: 'status' })
  status: RecommendationStatus;

  @Column({ type: 'boolean', default: false, name: 'is_accepted', nullable: true })
  isAccepted: boolean; // 保留字段用于向后兼容，新代码使用 status

  @Column({ type: 'timestamp', nullable: true, name: 'accepted_at' })
  acceptedAt: Date;

  @Column({ type: 'int', nullable: true, name: 'accepted_by' })
  acceptedBy: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'modified_tag_name' })
  modifiedTagName: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'feedback_reason' })
  feedbackReason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'expires_at' })
  expiresAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}