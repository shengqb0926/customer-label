import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  CreateDateColumn,
} from 'typeorm';

@Entity('feedback_statistics')
@Unique(['date'])
export class FeedbackStatistic {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'date', unique: true })
  date: string;

  @Column({ type: 'bigint', default: 0, name: 'total_recommendations' })
  totalRecommendations: number;

  @Column({ type: 'bigint', default: 0, name: 'accepted_count' })
  acceptedCount: number;

  @Column({ type: 'bigint', default: 0, name: 'rejected_count' })
  rejectedCount: number;

  @Column({ type: 'bigint', default: 0, name: 'ignored_count' })
  ignoredCount: number;

  @Column({ type: 'bigint', default: 0, name: 'modified_count' })
  modifiedCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true, name: 'avg_confidence' })
  avgConfidence: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true, name: 'acceptance_rate' })
  acceptanceRate: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
