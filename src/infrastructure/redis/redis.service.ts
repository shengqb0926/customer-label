import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

@Injectable()
export class RedisService {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private connected = false;

  constructor() {
    const config: RedisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: 0,
    };

    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      retryStrategy: (times) => {
        if (times > 10) {
          this.logger.warn('Redis connection failed after multiple retries');
          return null;
        }
        return Math.min(times * 50, 2000);
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
      this.connected = true;
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis error:', error.message);
      this.connected = false;
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
      this.connected = false;
    });
  }

  async onModuleInit() {
    try {
      await this.ping();
      this.logger.log('Redis service initialized successfully');
    } catch (error) {
      this.logger.warn('Redis not available, some features will be disabled');
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis service destroyed');
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    return this.client.hgetall(key);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hdel(key: string, field: string): Promise<number> {
    return this.client.hdel(key, field);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async flushdb(): Promise<void> {
    await this.client.flushdb();
  }

  isConnected(): boolean {
    return this.connected;
  }

  getClient(): Redis {
    return this.client;
  }
}
