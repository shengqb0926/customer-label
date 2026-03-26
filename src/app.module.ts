import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from './infrastructure/redis';
import { QueueModule } from './infrastructure/queue';
import { AuthModule } from './modules/auth/auth.module';
import { CommonModule } from './common/common.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { entities } from './entities';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
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
