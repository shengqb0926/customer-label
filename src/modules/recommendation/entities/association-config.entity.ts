import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('association_configs')
export class AssociationConfig {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100, name: 'config_name' })
  configName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50 })
  algorithm: 'apriori' | 'fpgrowth' | 'eclat';

  @Column({ type: 'simple-json', name: 'parameters' })
  parameters: {
    minSupport: number;
    minConfidence: number;
    minLift: number;
    maxItems?: number;
    [key: string]: any;
  };

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'int', default: 0, name: 'run_count' })
  runCount: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_run_at' })
  lastRunAt: Date;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true, name: 'avg_quality_score' })
  avgQualityScore: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
