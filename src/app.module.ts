import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from './infrastructure/redis/index.js';
import { QueueModule } from './infrastructure/queue/index.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CommonModule } from './common/common.module.js';
import { RecommendationModule } from './modules/recommendation/recommendation.module.js';
import { ScoringModule } from './modules/scoring/scoring.module.js';
import { FeedbackModule } from './modules/feedback/feedback.module.js';
import { entities } from './entities.js';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 频率限制模块
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: config.get<number>('THROTTLE_TTL_SHORT', 1000), // 1 秒
            limit: config.get<number>('THROTTLE_LIMIT_SHORT', 5), // 每秒最多 5 次
          },
          {
            name: 'medium',
            ttl: config.get<number>('THROTTLE_TTL_MEDIUM', 60000), // 1 分钟
            limit: config.get<number>('THROTTLE_LIMIT_MEDIUM', 30), // 每分钟最多 30 次
          },
          {
            name: 'long',
            ttl: config.get<number>('THROTTLE_TTL_LONG', 3600000), // 1 小时
            limit: config.get<number>('THROTTLE_LIMIT_LONG', 500), // 每小时最多 500 次
          },
        ],
      }),
    }),

    // 数据库模块
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'customer_label',
      entities: entities,
      synchronize: false, // 生产环境禁用自动同步，使用 migrations
      logging: process.env.NODE_ENV === 'development',
      migrationsRun: false, // 手动运行迁移
    }),

    // 基础设施模块（全局）
    RedisModule.forRoot(),
    QueueModule.forRoot(),

    // 认证模块
    AuthModule,

    // 公共模块（日志、监控、健康检查）
    CommonModule,

    // 业务模块
    RecommendationModule,
    ScoringModule,
    FeedbackModule,
  ],
})
export class AppModule {}
