import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  Index,
} from 'typeorm';

@Entity('tag_scores')
@Index('IDX_TAG_SCORES_OVERALL', ['overall_score'])
@Unique(['tag_id'])
export class TagScore {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'int', name: 'tag_id' })
  tagId: number;

  @Column({ type: 'varchar', length: 100, name: 'tag_name' })
  tagName: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true, name: 'coverage_score' })
  coverageScore: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true, name: 'coverage_value' })
  coverageValue: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true, name: 'discrimination_score' })
  discriminationScore: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true, name: 'discrimination_iv' })
  discriminationIv: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true, name: 'stability_score' })
  stabilityScore: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true, name: 'stability_psi' })
  stabilityPsi: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true, name: 'business_value_score' })
  businessValueScore: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true, name: 'business_value_roi' })
  businessValueRoi: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true, name: 'overall_score' })
  overallScore: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  recommendation: '强烈推荐' | '推荐' | '中性' | '不推荐';

  @Column({ type: 'simple-array', nullable: true })
  insights: string[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'last_calculated_at' })
  lastCalculatedAt: Date;
}
