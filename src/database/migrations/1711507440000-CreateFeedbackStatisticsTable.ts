import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFeedbackStatisticsTable1711507440000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'feedback_statistics',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'total_recommendations',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'accepted_count',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'rejected_count',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'ignored_count',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'modified_count',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'avg_confidence',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'acceptance_rate',
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

    // 创建索引
    await queryRunner.createIndex(
      'feedback_statistics',
      new TableIndex({
        name: 'idx_feedback_date',
        columnNames: ['date'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('feedback_statistics');
  }
}
