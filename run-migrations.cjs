const { DataSource } = require('typeorm');
const path = require('path');

// 导入所有迁移文件
const { CreateTagRecommendationsTable1711507200000 } = require('./src/database/migrations/1711507200000-CreateTagRecommendationsTable');
const { CreateTagScoresTable1711507260000 } = require('./src/database/migrations/1711507260000-CreateTagScoresTable');
const { CreateRecommendationRulesTable1711507320000 } = require('./src/database/migrations/1711507320000-CreateRecommendationRulesTable');
const { CreateClusteringConfigsTable1711507380000 } = require('./src/database/migrations/1711507380000-CreateClusteringConfigsTable');
const { CreateFeedbackStatisticsTable1711507440000 } = require('./src/database/migrations/1711507440000-CreateFeedbackStatisticsTable');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'customer_label',
  synchronize: false,
  logging: true,
  entities: [],
  migrations: [
    CreateTagRecommendationsTable1711507200000,
    CreateTagScoresTable1711507260000,
    CreateRecommendationRulesTable1711507320000,
    CreateClusteringConfigsTable1711507380000,
    CreateFeedbackStatisticsTable1711507440000,
  ],
});

async function runMigrations() {
  try {
    console.log('🚀 开始执行数据库迁移...\n');
    
    await AppDataSource.initialize();
    console.log('✅ 数据源初始化成功\n');

    const queryRunner = AppDataSource.createQueryRunner();
    
    // 检查是否已经执行过迁移
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // 创建迁移记录表（如果不存在）
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "migrations" (
          "id" SERIAL NOT NULL,
          "timestamp" BIGINT NOT NULL,
          "name" VARCHAR NOT NULL,
          CONSTRAINT "PK_migrations" PRIMARY KEY ("id")
        )
      `);
      
      console.log('📋 准备执行以下迁移:');
      const migrations = AppDataSource.migrations;
      migrations.forEach((migration, index) => {
        console.log(`   ${index + 1}. ${migration.name}`);
      });
      console.log('');

      // 执行每个迁移
      for (const migration of migrations) {
        console.log(`⏳ 执行迁移：${migration.name}...`);
        const instance = new migration();
        await instance.up(queryRunner);
        console.log(`✅ 迁移成功：${migration.name}\n`);
        
        // 记录迁移执行历史
        await queryRunner.query(
          `INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)`,
          [Date.now(), migration.name]
        );
      }
      
      await queryRunner.commitTransaction();
      console.log('🎉 所有迁移执行成功！\n');
      
      // 验证创建的表
      const tables = await queryRunner.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      console.log('📊 已创建的表:');
      tables.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
    
    await AppDataSource.destroy();
    console.log('\n✅ 数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    console.error('\n错误详情:', error.stack);
    process.exit(1);
  }
}

runMigrations();
