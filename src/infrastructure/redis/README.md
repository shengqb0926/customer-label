# Redis 缓存配置指南

## 📋 概述

本项目使用 [ioredis](https://github.com/luin/ioredis) 作为 Redis 客户端，提供了两个核心服务：

1. **RedisService** - 基础 Redis 操作服务
2. **CacheService** - 高级缓存管理服务

---

## 🏗️ 架构设计

### 模块结构

```
src/infrastructure/redis/
├── redis.service.ts      # 基础 Redis 服务
├── cache.service.ts      # 高级缓存服务
├── redis.module.ts       # Redis 模块
└── index.ts              # 模块导出
```

### 依赖关系

```typescript
RedisModule (Global Module)
├── RedisService
│   └── ioredis client
└── CacheService
    └── RedisService
```

---

## 🔧 配置说明

### 环境变量

在 `.env` 文件中配置：

```env
# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 模块注册

#### 方式一：默认配置（推荐）

```typescript
// app.module.ts
import { RedisModule } from './infrastructure/redis';

@Module({
  imports: [
    RedisModule.forRoot(), // 使用环境变量配置
  ],
})
export class AppModule {}
```

#### 方式二：自定义配置

```typescript
import { RedisModule } from './infrastructure/redis';

@Module({
  imports: [
    RedisModule.forRoot({
      host: 'localhost',
      port: 6379,
      password: 'your-password',
      db: 0,
    }),
  ],
})
export class AppModule {}
```

---

## 📖 使用示例

### 1. 使用 RedisService（基础操作）

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from './infrastructure/redis';

@Injectable()
export class UserService {
  constructor(private readonly redis: RedisService) {}

  async setUser(userId: string, userData: any) {
    // 设置值，5 分钟过期
    await this.redis.set(`user:${userId}`, JSON.stringify(userData), 300);
  }

  async getUser(userId: string) {
    const data = await this.redis.get(`user:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteUser(userId: string) {
    await this.redis.del(`user:${userId}`);
  }

  async checkUserExists(userId: string) {
    return await this.redis.exists(`user:${userId}`);
  }
}
```

### 2. 使用 CacheService（高级缓存）

```typescript
import { Injectable } from '@nestjs/common';
import { CacheService } from './infrastructure/redis';

@Injectable()
export class ProductService {
  constructor(private readonly cache: CacheService) {}

  /**
   * 获取产品详情（带缓存）
   */
  async getProduct(productId: string) {
    return await this.cache.wrap(
      `product:${productId}`,
      async () => {
        // 缓存未命中时执行此回调
        console.log('Cache miss, fetching from database...');
        return await this.database.getProduct(productId);
      },
      3600 // 缓存 1 小时
    );
  }

  /**
   * 批量获取缓存
   */
  async getProducts(productIds: string[]) {
    const keys = productIds.map(id => `product:${id}`);
    return await this.cache.mget(keys);
  }

  /**
   * 清除产品缓存
   */
  async invalidateProduct(productId: string) {
    await this.cache.delete(`product:${productId}`);
  }

  /**
   * 检查缓存是否存在
   */
  async hasProductCache(productId: string) {
    return await this.cache.exists(`product:${productId}`);
  }
}
```

### 3. 缓存统计信息

```typescript
import { Controller, Get } from '@nestjs/common';
import { CacheService } from './infrastructure/redis';

@Controller('cache')
export class CacheController {
  constructor(private readonly cache: CacheService) {}

  @Get('stats')
  async getStats() {
    return await this.cache.getStats();
  }

  @Post('clear')
  async clear() {
    await this.cache.clear();
    return { message: 'Cache cleared' };
  }
}
```

---

## 🎯 典型应用场景

### 场景 1: 数据库查询缓存

```typescript
@Injectable()
export class TagService {
  constructor(private readonly cache: CacheService) {}

  async getTagScore(tagId: string) {
    return await this.cache.wrap(
      `tag:score:${tagId}`,
      async () => {
        // 从数据库查询
        return await this.tagScoreRepository.findOne({ where: { tagId } });
      },
      1800 // 缓存 30 分钟
    );
  }

  async invalidateTagScore(tagId: string) {
    await this.cache.delete(`tag:score:${tagId}`);
  }
}
```

### 场景 2: API 响应缓存

```typescript
@Injectable()
export class RecommendationService {
  constructor(private readonly cache: CacheService) {}

  async getRecommendations(customerId: string) {
    return await this.cache.wrap(
      `recommendations:${customerId}`,
      async () => {
        // 生成推荐结果
        return await this.generateRecommendations(customerId);
      },
      600 // 缓存 10 分钟
    );
  }
}
```

### 场景 3: 会话管理

```typescript
@Injectable()
export class SessionService {
  constructor(private readonly redis: RedisService) {}

  async createSession(sessionId: string, userId: string) {
    const sessionData = {
      userId,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };
    
    // 会话有效期 24 小时
    await this.redis.set(
      `session:${sessionId}`,
      JSON.stringify(sessionData),
      86400
    );
  }

  async getSession(sessionId: string) {
    const data = await this.redis.get(`session:${sessionId}`);
    if (!data) return null;

    const session = JSON.parse(data);
    
    // 更新最后访问时间
    session.lastAccessedAt = Date.now();
    await this.redis.set(
      `session:${sessionId}`,
      JSON.stringify(session),
      86400
    );
    
    return session;
  }

  async destroySession(sessionId: string) {
    await this.redis.del(`session:${sessionId}`);
  }
}
```

### 场景 4: 分布式锁

```typescript
@Injectable()
export class LockService {
  constructor(private readonly redis: RedisService) {}

  async acquireLock(lockKey: string, ttl: number = 30): Promise<boolean> {
    const result = await this.redis.getClient().set(
      lockKey,
      '1',
      'NX',  // 仅在键不存在时设置
      'EX',  // 设置过期时间
      ttl
    );
    return result === 'OK';
  }

  async releaseLock(lockKey: string) {
    await this.redis.del(lockKey);
  }

  async withLock<T>(lockKey: string, callback: () => Promise<T>): Promise<T> {
    const acquired = await this.acquireLock(lockKey);
    if (!acquired) {
      throw new Error(`Failed to acquire lock: ${lockKey}`);
    }

    try {
      return await callback();
    } finally {
      await this.releaseLock(lockKey);
    }
  }
}
```

---

## 📊 缓存策略建议

### TTL 推荐值

| 数据类型 | 推荐 TTL | 说明 |
|---------|---------|------|
| 用户会话 | 86400s (24h) | 长期有效 |
| 配置信息 | 3600s (1h) | 定期刷新 |
| 热点数据 | 1800s (30m) | 平衡性能和一致性 |
| API 响应 | 600s (10m) | 快速变化数据 |
| 临时状态 | 300s (5m) | 短期有效 |

### 缓存键命名规范

```typescript
// 格式：<模块>:<类型>:<ID>
const keys = {
  user: `user:profile:${userId}`,
  tag: `tag:score:${tagId}`,
  recommendation: `rec:result:${customerId}`,
  session: `session:${sessionId}`,
  config: `config:${configKey}`,
};
```

---

## 🔍 监控和调试

### 健康检查

```typescript
@Controller('health')
export class HealthController {
  constructor(private readonly redis: RedisService) {}

  @Get('redis')
  async checkRedis() {
    try {
      const ping = await this.redis.ping();
      return {
        status: ping === 'PONG' ? 'up' : 'down',
        connected: this.redis.isConnected(),
      };
    } catch (error) {
      return {
        status: 'down',
        error: error.message,
      };
    }
  }
}
```

### 日志级别

Redis 服务包含以下日志级别：

- **LOG**: 连接成功、初始化完成
- **WARN**: 连接失败、多次重试后失败
- **ERROR**: Redis 错误、操作失败
- **DEBUG**: 缓存命中/未命中（需在 CacheService 中启用）

---

## ⚠️ 注意事项

### 1. 性能优化

```typescript
// ✅ 推荐：批量操作
const keys = ['key1', 'key2', 'key3'];
const results = await Promise.all(
  keys.map(key => redis.get(key))
);

// ❌ 避免：循环中的单次操作
for (const key of keys) {
  await redis.get(key); // 串行执行，性能差
}
```

### 2. 内存管理

```typescript
// 定期清理过期缓存
async cleanupExpiredCache() {
  const keys = await this.redis.keys('temp:*');
  for (const key of keys) {
    const ttl = await this.redis.getClient().ttl(key);
    if (ttl === -2) { // 已过期
      await this.redis.del(key);
    }
  }
}
```

### 3. 错误处理

```typescript
// 缓存降级策略
async getDataWithFallback(key: string) {
  try {
    const cached = await this.cache.get(key);
    if (cached) return cached;
  } catch (error) {
    // Redis 不可用时记录日志并继续
    console.error('Cache error, using fallback:', error);
  }
  
  // 回退到数据库
  return await this.database.get(key);
}
```

---

## 📚 相关资源

- [ioredis 官方文档](https://github.com/luin/ioredis)
- [NestJS 缓存最佳实践](https://docs.nestjs.com/techniques/caching)
- [Redis 官方文档](https://redis.io/documentation)

---

**文档版本**: 1.0  
**创建日期**: 2026-03-26  
**最后更新**: 2026-03-26
