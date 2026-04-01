import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RedisClusterService } from './redis-cluster.service';
import { Cluster } from 'ioredis';

// Mock ioredis Cluster
jest.mock('ioredis', () => {
  return {
    Cluster: jest.fn().mockImplementation(() => ({
      // Basic commands
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      hgetall: jest.fn(),
      hset: jest.fn(),
      hdel: jest.fn(),
      hget: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      mget: jest.fn(),
      publish: jest.fn(),
      ping: jest.fn(),
      
      // Cluster specific methods
      cluster: jest.fn(),
      nodes: jest.fn(),
      duplicate: jest.fn(),
      subscribe: jest.fn(),
      quit: jest.fn(),
      
      // Event emitter methods
      on: jest.fn(),
      removeListener: jest.fn(),
    })),
  };
});

describe('RedisClusterService', () => {
  let service: RedisClusterService;
  let mockCluster: any;

  beforeEach(async () => {
    // Reset environment variables
    process.env.REDIS_CLUSTER_MODE = 'false';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.REDIS_PASSWORD = undefined;

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisClusterService],
    }).compile();

    service = module.get<RedisClusterService>(RedisClusterService);
    
    // Get the mock cluster instance
    mockCluster = (service as any).cluster;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Initialization', () => {
    it('should initialize with single node configuration', () => {
      expect(mockCluster).toBeDefined();
      expect(Cluster).toHaveBeenCalledWith(
        [{ host: 'localhost', port: 6379 }],
        expect.any(Object),
      );
    });

    it('should initialize with cluster configuration when REDIS_CLUSTER_MODE is true', async () => {
      // Reset and recreate with cluster mode
      process.env.REDIS_CLUSTER_MODE = 'true';
      process.env.REDIS_CLUSTER_NODES = 'node1:7000,node2:7001,node3:7002';
      process.env.REDIS_CLUSTER_PASSWORD = 'cluster-pass';

      const module: TestingModule = await Test.createTestingModule({
        providers: [RedisClusterService],
      }).compile();

      const clusterService = module.get<RedisClusterService>(RedisClusterService);
      expect(clusterService).toBeDefined();
      
      // Verify cluster was initialized with multiple nodes
      expect(Cluster).toHaveBeenCalledWith(
        [
          { host: 'node1', port: 7000 },
          { host: 'node2', port: 7001 },
          { host: 'node3', port: 7002 },
        ],
        expect.any(Object),
      );
    });
  });

  describe('Basic Operations', () => {
    describe('ping', () => {
      it('should return pong on successful ping', async () => {
        mockCluster.ping.mockResolvedValue('PONG');
        
        const result = await service.ping();
        
        expect(result).toBe('PONG');
        expect(mockCluster.ping).toHaveBeenCalled();
      });
    });

    describe('get', () => {
      it('should retrieve value by key', async () => {
        mockCluster.get.mockResolvedValue('test-value');
        
        const result = await service.get('test-key');
        
        expect(result).toBe('test-value');
        expect(mockCluster.get).toHaveBeenCalledWith('test-key');
      });

      it('should return null for non-existent key', async () => {
        mockCluster.get.mockResolvedValue(null);
        
        const result = await service.get('non-existent-key');
        
        expect(result).toBeNull();
      });
    });

    describe('set', () => {
      it('should set value without TTL', async () => {
        mockCluster.set.mockResolvedValue('OK');
        
        await service.set('test-key', 'test-value');
        
        expect(mockCluster.set).toHaveBeenCalledWith('test-key', 'test-value');
      });

      it('should set value with TTL using SETEX', async () => {
        mockCluster.setex.mockResolvedValue('OK');
        
        await service.set('test-key', 'test-value', 3600);
        
        expect(mockCluster.setex).toHaveBeenCalledWith('test-key', 3600, 'test-value');
      });
    });

    describe('del', () => {
      it('should delete single key', async () => {
        mockCluster.del.mockResolvedValue(1);
        
        const result = await service.del('test-key');
        
        expect(result).toBe(1);
        expect(mockCluster.del).toHaveBeenCalledWith('test-key');
      });

      it('should delete multiple keys', async () => {
        mockCluster.del.mockResolvedValue(3);
        
        const result = await service.del(['key1', 'key2', 'key3']);
        
        expect(result).toBe(3);
        expect(mockCluster.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
      });
    });

    describe('exists', () => {
      it('should return 1 if key exists', async () => {
        mockCluster.exists.mockResolvedValue(1);
        
        const result = await service.exists('test-key');
        
        expect(result).toBe(1);
      });

      it('should return 0 if key does not exist', async () => {
        mockCluster.exists.mockResolvedValue(0);
        
        const result = await service.exists('non-existent-key');
        
        expect(result).toBe(0);
      });
    });
  });

  describe('Hash Operations', () => {
    describe('hgetall', () => {
      it('should retrieve all fields of a hash', async () => {
        const mockData = { field1: 'value1', field2: 'value2' };
        mockCluster.hgetall.mockResolvedValue(mockData);
        
        const result = await service.hgetall('test-hash');
        
        expect(result).toEqual(mockData);
        expect(mockCluster.hgetall).toHaveBeenCalledWith('test-hash');
      });
    });

    describe('hset', () => {
      it('should set single field in hash', async () => {
        mockCluster.hset.mockResolvedValue(1);
        
        await service.hset('test-hash', 'field1', 'value1');
        
        expect(mockCluster.hset).toHaveBeenCalledWith('test-hash', 'field1', 'value1');
      });

      it('should set multiple fields in hash', async () => {
        mockCluster.hset.mockResolvedValue(2);
        const fields = { field1: 'value1', field2: 'value2' };
        
        await service.hset('test-hash', fields);
        
        expect(mockCluster.hset).toHaveBeenCalledWith('test-hash', fields);
      });
    });

    describe('hdel', () => {
      it('should delete single field from hash', async () => {
        mockCluster.hdel.mockResolvedValue(1);
        
        await service.hdel('test-hash', 'field1');
        
        expect(mockCluster.hdel).toHaveBeenCalledWith('test-hash', 'field1');
      });

      it('should delete multiple fields from hash', async () => {
        mockCluster.hdel.mockResolvedValue(2);
        
        await service.hdel('test-hash', ['field1', 'field2']);
        
        expect(mockCluster.hdel).toHaveBeenCalledWith('test-hash', 'field1', 'field2');
      });
    });

    describe('hget', () => {
      it('should retrieve field value from hash', async () => {
        mockCluster.hget.mockResolvedValue('value1');
        
        const result = await service.hget('test-hash', 'field1');
        
        expect(result).toBe('value1');
        expect(mockCluster.hget).toHaveBeenCalledWith('test-hash', 'field1');
      });
    });
  });

  describe('Counter Operations', () => {
    describe('incr', () => {
      it('should increment counter', async () => {
        mockCluster.incr.mockResolvedValue(5);
        
        const result = await service.incr('counter');
        
        expect(result).toBe(5);
        expect(mockCluster.incr).toHaveBeenCalledWith('counter');
      });
    });

    describe('decr', () => {
      it('should decrement counter', async () => {
        mockCluster.decr.mockResolvedValue(3);
        
        const result = await service.decr('counter');
        
        expect(result).toBe(3);
        expect(mockCluster.decr).toHaveBeenCalledWith('counter');
      });
    });
  });

  describe('TTL Operations', () => {
    describe('expire', () => {
      it('should set expiration time', async () => {
        mockCluster.expire.mockResolvedValue(1);
        
        const result = await service.expire('test-key', 3600);
        
        expect(result).toBe(1);
        expect(mockCluster.expire).toHaveBeenCalledWith('test-key', 3600);
      });
    });

    describe('ttl', () => {
      it('should return remaining TTL', async () => {
        mockCluster.ttl.mockResolvedValue(1800);
        
        const result = await service.ttl('test-key');
        
        expect(result).toBe(1800);
        expect(mockCluster.ttl).toHaveBeenCalledWith('test-key');
      });
    });
  });

  describe('Batch Operations', () => {
    describe('mget', () => {
      it('should get multiple values', async () => {
        mockCluster.mget.mockResolvedValue(['value1', 'value2', 'value3']);
        
        const result = await service.mget(['key1', 'key2', 'key3']);
        
        expect(result).toEqual(['value1', 'value2', 'value3']);
        expect(mockCluster.mget).toHaveBeenCalledWith('key1', 'key2', 'key3');
      });
    });
  });

  describe('Pub/Sub Operations', () => {
    describe('publish', () => {
      it('should publish message to channel', async () => {
        mockCluster.publish.mockResolvedValue(2);
        
        const result = await service.publish('channel1', 'message');
        
        expect(result).toBe(2);
        expect(mockCluster.publish).toHaveBeenCalledWith('channel1', 'message');
      });
    });

    describe('subscribe', () => {
      it('should subscribe to channel and receive messages', async () => {
        const mockSubscriber = {
          subscribe: jest.fn(),
          on: jest.fn((event, callback) => {
            if (event === 'message') {
              // Simulate receiving a message
              setTimeout(() => callback('channel1', 'test-message'), 0);
            }
          }),
        };
        
        mockCluster.duplicate.mockReturnValue(mockSubscriber);
        
        const callback = jest.fn();
        await service.subscribe('channel1', callback);
        
        expect(mockCluster.duplicate).toHaveBeenCalled();
        expect(mockSubscriber.subscribe).toHaveBeenCalledWith('channel1');
        
        // Wait for the simulated message
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(callback).toHaveBeenCalledWith('test-message');
      });
    });
  });

  describe('Cluster Information', () => {
    describe('getClusterInfo', () => {
      it('should return cluster information', async () => {
        const mockNodes = [
          { options: { role: 'master' } },
          { options: { role: 'master' } },
          { options: { role: 'slave' } },
        ];
        
        mockCluster.nodes.mockReturnValue(mockNodes);
        mockCluster.cluster.mockResolvedValue('cluster_slots_assigned:16384');
        
        const result = await service.getClusterInfo();
        
        expect(result).toEqual({
          nodesCount: 3,
          mastersCount: 2,
          slavesCount: 1,
          slotsAssigned: 16384,
          isConnected: false, // Default value since we didn't trigger connect event
        });
      });

      it('should handle errors gracefully', async () => {
        mockCluster.cluster.mockRejectedValue(new Error('Cluster error'));
        
        const result = await service.getClusterInfo();
        
        expect(result).toEqual({
          nodesCount: 0,
          mastersCount: 0,
          slavesCount: 0,
          slotsAssigned: 0,
          isConnected: false,
        });
      });
    });

    describe('isClusterMode', () => {
      it('should return true when multiple nodes are present', () => {
        mockCluster.nodes.mockReturnValue([
          { host: 'node1', port: 7000 },
          { host: 'node2', port: 7001 },
        ]);
        
        expect(service.isClusterMode()).toBe(true);
      });

      it('should return false when single node is present', () => {
        mockCluster.nodes.mockReturnValue([
          { host: 'localhost', port: 6379 },
        ]);
        
        expect(service.isClusterMode()).toBe(false);
      });
    });

    describe('getNodes', () => {
      it('should return all cluster nodes', () => {
        const mockNodes = [
          { host: 'node1', port: 7000 },
          { host: 'node2', port: 7001 },
        ];
        
        mockCluster.nodes.mockReturnValue(mockNodes);
        
        const result = service.getNodes();
        
        expect(result).toEqual(mockNodes);
      });
    });

    describe('getCluster', () => {
      it('should return the underlying cluster instance', () => {
        const result = service.getCluster();
        
        expect(result).toBe(mockCluster);
      });
    });

    describe('isConnected', () => {
      it('should return connection status', () => {
        const result = service.isConnected();
        
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('Lifecycle Hooks', () => {
    describe('onModuleInit', () => {
      it('should initialize and log cluster info', async () => {
        mockCluster.ping.mockResolvedValue('PONG');
        mockCluster.nodes.mockReturnValue([{ options: { role: 'master' } }]);
        mockCluster.cluster.mockResolvedValue('cluster_slots_assigned:16384');
        
        const loggerSpy = jest.spyOn(service['logger'], 'log');
        
        await service.onModuleInit();
        
        expect(mockCluster.ping).toHaveBeenCalled();
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('Redis Cluster initialized'),
        );
      });

      it('should handle initialization failure gracefully', async () => {
        mockCluster.ping.mockRejectedValue(new Error('Connection failed'));
        
        const warnSpy = jest.spyOn(service['logger'], 'warn');
        
        await service.onModuleInit();
        
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Redis Cluster not available'),
        );
      });
    });

    describe('onModuleDestroy', () => {
      it('should close cluster connection', async () => {
        mockCluster.quit.mockResolvedValue(undefined);
        
        const loggerSpy = jest.spyOn(service['logger'], 'log');
        
        await service.onModuleDestroy();
        
        expect(mockCluster.quit).toHaveBeenCalled();
        expect(loggerSpy).toHaveBeenCalledWith('Redis Cluster service destroyed');
      });

      it('should handle destroy error gracefully', async () => {
        mockCluster.quit.mockRejectedValue(new Error('Quit failed'));
        
        const errorSpy = jest.spyOn(service['logger'], 'error');
        
        await service.onModuleDestroy();
        
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error destroying cluster connection'),
        );
      });
    });
  });
});
