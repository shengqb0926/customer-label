import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateClusteringConfigsTable1711507380000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'clustering_configs',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'config_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'algorithm',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'parameters',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'feature_weights',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'last_run_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_cluster_count',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'avg_silhouette_score',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('clustering_configs');
  }
}
