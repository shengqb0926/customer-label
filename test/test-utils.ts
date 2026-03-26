import { ConfigService } from '@nestjs/config';

/**
 * E2E 测试工具类
 * 
 * 使用方法：
 * 1. 创建测试数据库：createdb customer_label_test
 * 2. 运行测试：npm run test:e2e
 * 
 * 环境变量配置：
 * - TEST_DB_HOST: 测试数据库主机 (默认：localhost)
 * - TEST_DB_PORT: 测试数据库端口 (默认：5432)
 * - TEST_DB_USERNAME: 测试数据库用户名 (默认：postgres)
 * - TEST_DB_PASSWORD: 测试数据库密码 (默认：postgres)
 * - TEST_DB_DATABASE: 测试数据库名称 (默认：customer_label_test)
 * - TEST_REDIS_URL: 测试 Redis URL (默认：redis://localhost:6379)
 */

export interface TestConfig {
  dbHost: string;
  dbPort: number;
  dbUsername: string;
  dbPassword: string;
  dbDatabase: string;
  redisUrl: string;
}

/**
 * 获取测试配置
 */
export function getTestConfig(): TestConfig {
  return {
    dbHost: process.env.TEST_DB_HOST || 'localhost',
    dbPort: parseInt(process.env.TEST_DB_PORT || '5432'),
    dbUsername: process.env.TEST_DB_USERNAME || 'postgres',
    dbPassword: process.env.TEST_DB_PASSWORD || 'postgres',
    dbDatabase: process.env.TEST_DB_DATABASE || 'customer_label_test',
    redisUrl: process.env.TEST_REDIS_URL || 'redis://localhost:6379',
  };
}

/**
 * 创建测试数据库配置
 */
export function createTestTypeOrmConfig() {
  const config = getTestConfig();
  
  return {
    type: 'postgres' as const,
    host: config.dbHost,
    port: config.dbPort,
    username: config.dbUsername,
    password: config.dbPassword,
    database: config.dbDatabase,
    autoLoadEntities: true,
    synchronize: true, // 测试环境使用自动同步
    logging: false, // 禁用日志以提高性能
    dropSchema: true, // 测试前删除 schema
  };
}

/**
 * 等待函数 - 用于异步操作完成后重试
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成唯一的测试标识符
 */
export function generateTestIdentifier(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
