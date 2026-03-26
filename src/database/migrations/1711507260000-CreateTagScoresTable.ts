import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTagScoresTable1711507260000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tag_scores',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'tag_id',
            type: 'integer',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'tag_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'coverage_score',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'coverage_value',
            type: 'decimal',
            precision: 10,
            scale: 6,
            isNullable: true,
          },
          {
            name: 'discrimination_score',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'discrimination_iv',
            type: 'decimal',
            precision: 10,
            scale: 6,
            isNullable: true,
          },
          {
            name: 'stability_score',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'stability_psi',
            type: 'decimal',
            precision: 10,
            scale: 6,
            isNullable: true,
          },
          {
            name: 'business_value_score',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'business_value_roi',
            type: 'decimal',
            precision: 10,
            scale: 6,
            isNullable: true,
          },
          {
            name: 'overall_score',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'recommendation',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'insights',
            type: 'text',
            
            isNullable: true,
          },
          {
            name: 'last_calculated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 创建索引
    await queryRunner.createIndex(
      'tag_scores',
      new TableIndex({
        name: 'idx_scores_overall',
        columnNames: ['overall_score'],
      }),
    );

    await queryRunner.createIndex(
      'tag_scores',
      new TableIndex({
        name: 'idx_scores_updated',
        columnNames: ['last_calculated_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tag_scores');
  }
}
