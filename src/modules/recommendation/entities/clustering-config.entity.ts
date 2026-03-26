import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('clustering_configs')
export class ClusteringConfig {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100, name: 'config_name' })
  configName: string;

  @Column({ type: 'varchar', length: 50 })
  algorithm: 'k-means' | 'dbscan' | 'hierarchical';

  @Column({ type: 'simple-json' })
  parameters: {
    k?: number;
    maxIterations?: number;
    convergenceThreshold?: number;
    minClusterSize?: number;
    [key: string]: any;
  };

  @Column({ type: 'simple-json', nullable: true, name: 'feature_weights' })
  featureWeights: {
    transactionFeatures?: number;
    interactionFeatures?: number;
    timeFeatures?: number;
    otherFeatures?: number;
  };

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_run_at' })
  lastRunAt: Date;

  @Column({ type: 'int', nullable: true, name: 'last_cluster_count' })
  lastClusterCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true, name: 'avg_silhouette_score' })
  avgSilhouetteScore: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
