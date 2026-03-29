import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from './infrastructure/redis/index.js';
import { QueueModule } from './infrastructure/queue/index.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { LockModule } from './infrastructure/lock/lock.module.js';
import { WebSocketModule } from './infrastructure/websocket/websocket.module.js';
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

    // 频率限制模块 - 临时禁用排查问题
    // ThrottlerModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => ({
    //     throttlers: [
    //       {
    //         name: 'short',
    //         ttl: config.get<number>('THROTTLE_TTL_SHORT', 1000), // 1 秒
    //         limit: config.get<number>('THROTTLE_LIMIT_SHORT', 5), // 每秒最多 5 次
    //       },
    //       {
    //         name: 'medium',
    //         ttl: config.get<number>('THROTTLE_TTL_MEDIUM', 60000), // 1 分钟
    //         limit: config.get<number>('THROTTLE_LIMIT_MEDIUM', 30), // 每分钟最多 30 次
    //       },
    //       {
    //         name: 'long',
    //         ttl: config.get<number>('THROTTLE_TTL_LONG', 3600000), // 1 小时
    //         limit: config.get<number>('THROTTLE_LIMIT_LONG', 500), // 每小时最多 500 次
    //       },
    //     ],
    //   }),
    // }),

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
      
      // 连接池优化配置
      extra: {
        // 最大连接数 - 根据服务器 CPU 核心数和内存调整
        // 公式：CPU 核心数 * 2 + 1 或 根据内存计算（每 2GB 内存 1 个连接）
        max: parseInt(process.env.DB_POOL_MAX || '20'),
        
        // 最小空闲连接数 - 保持一定的空闲连接以应对突发请求
        min: parseInt(process.env.DB_POOL_MIN || '5'),
        
        // 连接空闲超时时间（毫秒）- 超过此时间的空闲连接将被释放
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
        
        // 连接最大存活时间（毫秒）- 防止连接老化问题
        connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '60000'),
        
        // 获取连接超时时间（毫秒）
        acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '30000'),
        
        // 心跳检测间隔（毫秒）- 定期检测连接是否可用
        heartbeatIntervalMillis: parseInt(process.env.DB_POOL_HEARTBEAT_INTERVAL || '30000'),
        
        // 启用 SSL（生产环境推荐）
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      },
      
      // 启用连接池统计
      poolErrorHandler: (err) => {
        console.error('[Database] Connection pool error:', err);
      },
    }),

    // 基础设施模块（全局）
    DatabaseModule,
    LockModule,
    WebSocketModule.forRoot(),
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
