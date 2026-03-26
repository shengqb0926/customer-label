import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRecommendationRulesTable1711507320000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'recommendation_rules',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'rule_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'rule_expression',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'priority',
            type: 'integer',
            default: 0,
          },
          {
            name: 'tag_template',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'hit_count',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'acceptance_rate',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'last_hit_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'created_by',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'integer',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 创建索引
    await queryRunner.createIndex(
      'recommendation_rules',
      new TableIndex({
        name: 'idx_rules_active',
        columnNames: ['is_active'],
        where: 'is_active = TRUE',
      }),
    );

    await queryRunner.createIndex(
      'recommendation_rules',
      new TableIndex({
        name: 'idx_rules_priority',
        columnNames: ['priority'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('recommendation_rules');
  }
}
