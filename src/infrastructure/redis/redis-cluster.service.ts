import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cluster } from 'ioredis';

export interface RedisClusterNode {
  host: string;
  port: number;
}

export interface NodeInfo {
  host: string;
  port: number;
}

export interface RedisClusterConfig {
  nodes: RedisClusterNode[];
  password?: string;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  scaleReads?: 'master' | 'slave' | 'all';
}

/**
 * Redis 集群服务
 * 
 * 支持 Redis Cluster 模式，提供高可用的分布式缓存能力
 * 
 * 配置方式：
 * 1. 环境变量 REDIS_CLUSTER_MODE=true 启用集群模式
 * 2. REDIS_CLUSTER_NODES=localhost:7000,localhost:7001,localhost:7002
 * 3. 或使用单个节点配置（自动降级为单机模式）
 */
@Injectable()
export class RedisClusterService implements OnModuleInit, OnModuleDestroy {
  private readonly cluster: Cluster;
  private readonly logger = new Logger(RedisClusterService.name);
  private connected = false;

  constructor() {
    const config = this.loadConfig();
    
    // 创建集群连接
    this.cluster = new Cluster(config.nodes.map(node => ({
      host: node.host,
      port: node.port,
    })), {
      redisOptions: {
        password: config.password,
      },
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 100,
      retryDelayOnMoved: 50,
      retryDelayOnTryAgain: 100,
    });

    this.setupEventHandlers();
  }

  private loadConfig(): RedisClusterConfig {
    const clusterMode = process.env.REDIS_CLUSTER_MODE === 'true';
    
    if (!clusterMode) {
      // 非集群模式，使用单节点配置
      return {
        nodes: [{
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        }],
        password: process.env.REDIS_PASSWORD || undefined,
      };
    }

    // 集群模式
    const nodesString = process.env.REDIS_CLUSTER_NODES || '';
    let nodes: RedisClusterNode[] = [];

    if (nodesString) {
      // 解析节点列表：host1:port1,host2:port2,...
      nodes = nodesString.split(',').map(nodeStr => {
        const [host, port] = nodeStr.trim().split(':');
        return {
          host: host || 'localhost',
          port: parseInt(port || '7000', 10),
        };
      });
    }

    // 如果没有配置节点，使用默认的三个节点
    if (nodes.length === 0) {
      nodes = [
        { host: 'localhost', port: 7000 },
        { host: 'localhost', port: 7001 },
        { host: 'localhost', port: 7002 },
      ];
    }

    return {
      nodes,
      password: process.env.REDIS_CLUSTER_PASSWORD || process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: parseInt(process.env.REDIS_CLUSTER_MAX_RETRIES || '3', 10),
      enableReadyCheck: process.env.REDIS_CLUSTER_READY_CHECK !== 'false',
      scaleReads: (process.env.REDIS_CLUSTER_SCALE_READS as any) || 'master',
    };
  }

  private setupEventHandlers() {
    this.cluster.on('connect', () => {
      this.logger.log('Connected to Redis Cluster');
      this.connected = true;
    });

    this.cluster.on('ready', () => {
      this.logger.log('Redis Cluster ready');
      this.connected = true;
    });

    this.cluster.on('error', (error) => {
      this.logger.error(`Redis Cluster error: ${error.message}`);
      if (error.message.includes('CLUSTERDOWN')) {
        this.logger.error('Cluster is down, attempting to reconnect...');
      }
      this.connected = false;
    });

    this.cluster.on('close', () => {
      this.logger.warn('Redis Cluster connection closed');
      this.connected = false;
    });

    this.cluster.on('node error', (error: Error, address: string) => {
      this.logger.error(`Node error at ${address}: ${error.message}`);
    });

    this.cluster.on('+node', (node: any) => {
      this.logger.log(`New node added: ${node.host}:${node.port}`);
    });

    this.cluster.on('-node', (node: any) => {
      this.logger.warn(`Node removed: ${node.host}:${node.port}`);
    });
  }

  async onModuleInit() {
    try {
      await this.ping();
      const nodesCount = this.cluster.nodes().length;
      this.logger.log(`Redis Cluster initialized with ${nodesCount} nodes`);
      
      // 打印集群信息
      await this.printClusterInfo();
    } catch (error) {
      this.logger.warn(`Redis Cluster not available: ${error.message}`);
      this.logger.warn('Some features will be disabled');
    }
  }

  async onModuleDestroy() {
    try {
      await this.cluster.quit();
      this.logger.log('Redis Cluster service destroyed');
    } catch (error) {
      this.logger.error(`Error destroying cluster connection: ${error.message}`);
    }
  }

  /**
   * 测试连接
   */
  async ping(): Promise<string> {
    return this.cluster.ping();
  }

  /**
   * 获取值
   */
  async get(key: string): Promise<string | null> {
    return this.cluster.get(key);
  }

  /**
   * 设置值
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.cluster.setex(key, ttl, value);
    } else {
      await this.cluster.set(key, value);
    }
  }

  /**
   * 删除键
   */
  async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return this.cluster.del(...key);
    }
    return this.cluster.del(key);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<number> {
    return this.cluster.exists(key);
  }

  /**
   * 获取哈希所有字段
   */
  async hgetall(key: string): Promise<Record<string, string> | null> {
    return this.cluster.hgetall(key);
  }

  /**
   * 设置哈希字段
   */
  async hset(key: string, field: string | Record<string, string>, value?: string): Promise<number> {
    if (typeof field === 'object') {
      return this.cluster.hset(key, field);
    }
    return this.cluster.hset(key, field, value!);
  }

  /**
   * 删除哈希字段
   */
  async hdel(key: string, field: string | string[]): Promise<number> {
    if (Array.isArray(field)) {
      return this.cluster.hdel(key, ...field);
    }
    return this.cluster.hdel(key, field);
  }

  /**
   * 获取哈希字段值
   */
  async hget(key: string, field: string): Promise<string | null> {
    return this.cluster.hget(key, field);
  }

  /**
   * 增加计数
   */
  async incr(key: string): Promise<number> {
    return this.cluster.incr(key);
  }

  /**
   * 减少计数
   */
  async decr(key: string): Promise<number> {
    return this.cluster.decr(key);
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<number> {
    return this.cluster.expire(key, seconds);
  }

  /**
   * 获取剩余生存时间
   */
  async ttl(key: string): Promise<number> {
    return this.cluster.ttl(key);
  }

  /**
   * 批量获取（mget）- 注意：在集群模式下，key 必须在同一个 slot
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    return this.cluster.mget(...keys);
  }

  /**
   * 发布消息
   */
  async publish(channel: string, message: string): Promise<number> {
    return this.cluster.publish(channel, message);
  }

  /**
   * 订阅频道
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const subscriber = this.cluster.duplicate();
    await subscriber.subscribe(channel);
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });
  }

  /**
   * 获取集群信息
   */
  async getClusterInfo(): Promise<{
    nodesCount: number;
    mastersCount: number;
    slavesCount: number;
    slotsAssigned: number;
    isConnected: boolean;
  }> {
    try {
      const nodes = this.cluster.nodes();
      const masters = nodes.filter(n => n.options.role === 'master');
      const slaves = nodes.filter(n => n.options.role === 'slave');
      
      // 获取槽位信息
      const clusterInfo = await this.cluster.cluster('INFO');
      const slotsMatch = clusterInfo.match(/cluster_slots_assigned:(\d+)/);
      const slotsAssigned = slotsMatch ? parseInt(slotsMatch[1], 10) : 0;

      return {
        nodesCount: nodes.length,
        mastersCount: masters.length,
        slavesCount: slaves.length,
        slotsAssigned,
        isConnected: this.connected,
      };
    } catch (error) {
      this.logger.error(`Failed to get cluster info: ${error.message}`);
      return {
        nodesCount: 0,
        mastersCount: 0,
        slavesCount: 0,
        slotsAssigned: 0,
        isConnected: this.connected,
      };
    }
  }

  /**
   * 打印集群信息（用于调试）
   */
  private async printClusterInfo() {
    try {
      const info = await this.getClusterInfo();
      this.logger.log(
        `Cluster Status: ${info.nodesCount} nodes ` +
        `(${info.mastersCount} masters, ${info.slavesCount} slaves), ` +
        `${info.slotsAssigned}/16384 slots assigned`,
      );
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 检查是否是集群模式
   */
  isClusterMode(): boolean {
    return this.cluster.nodes().length > 1;
  }

  /**
   * 获取所有节点
   */
  getNodes(): any[] {
    return this.cluster.nodes();
  }

  /**
   * 获取底层集群实例
   */
  getCluster(): Cluster {
    return this.cluster;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
