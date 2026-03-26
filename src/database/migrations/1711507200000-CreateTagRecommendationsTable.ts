import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTagRecommendationsTable1711507200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tag_recommendations',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'customer_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'tag_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'tag_category',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'confidence',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'source',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'score_overall',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'is_accepted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'accepted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'accepted_by',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'modified_tag_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'feedback_reason',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      false, // 不要自动创建索引
    );

    await queryRunner.createIndex(
      'tag_recommendations',
      new TableIndex({
        name: 'idx_rec_source',
        columnNames: ['source'],
      }),
    );

    await queryRunner.createIndex(
      'tag_recommendations',
      new TableIndex({
        name: 'idx_rec_accepted',
        columnNames: ['is_accepted'],
      }),
    );

    await queryRunner.createIndex(
      'tag_recommendations',
      new TableIndex({
        name: 'idx_rec_created',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tag_recommendations');
  }
}
