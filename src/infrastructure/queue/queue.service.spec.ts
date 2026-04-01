import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';

// Mock Bull.Queue
const createMockQueue = () => ({
  on: jest.fn(),
  add: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
  empty: jest.fn().mockResolvedValue(undefined),
  getWaitingCount: jest.fn().mockResolvedValue(0),
  getActiveCount: jest.fn().mockResolvedValue(0),
  getCompletedCount: jest.fn().mockResolvedValue(0),
  getFailedCount: jest.fn().mockResolvedValue(0),
  getDelayedCount: jest.fn().mockResolvedValue(0),
});

// Mock bull 库
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => createMockQueue());
});

describe('QueueService', () => {
  let service: QueueService;
  let mockQueueInstance: any;

  beforeEach(async () => {
    const Bull = require('bull');
    mockQueueInstance = createMockQueue();
    Bull.mockImplementation(() => mockQueueInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [QueueService],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该成功初始化并创建默认队列', () => {
      expect(service).toBeDefined();
      const Bull = require('bull');
      expect(Bull).toHaveBeenCalled();
      expect(mockQueueInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockQueueInstance.on).toHaveBeenCalledWith('waiting', expect.any(Function));
      expect(mockQueueInstance.on).toHaveBeenCalledWith('active', expect.any(Function));
      expect(mockQueueInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockQueueInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockQueueInstance.on).toHaveBeenCalledWith('stalled', expect.any(Function));
    });
  });

  describe('createQueue', () => {
    it('应该创建新队列并返回队列实例', () => {
      const queueName = 'test-queue';
      const redisConfig = {
        host: 'localhost',
        port: 6379,
      };

      const newMockQueue = createMockQueue();
      const Bull = require('bull');
      Bull.mockImplementationOnce(() => newMockQueue);

      const queue = service.createQueue(queueName, redisConfig);

      expect(queue).toBeDefined();
      expect(Bull).toHaveBeenCalledWith(
        queueName,
        expect.objectContaining({
          redis: redisConfig,
          defaultJobOptions: expect.any(Object),
        }),
      );
    });

    it('如果队列已存在应该返回现有队列', () => {
      const queueName = 'existing-queue';
      const newMockQueue = createMockQueue();
      const Bull = require('bull');
      Bull.mockImplementationOnce(() => newMockQueue);
      
      // 第一次创建
      const firstQueue = service.createQueue(queueName, {
        host: 'localhost',
        port: 6379,
      });

      // 第二次创建（应该返回同一个实例）
      const secondQueue = service.createQueue(queueName, {
        host: 'localhost',
        port: 6379,
      });

      expect(firstQueue).toBe(secondQueue);
    });

    it('应该为新队列注册事件监听器', () => {
      const queueName = 'new-queue';
      const newMockQueue = createMockQueue();
      const Bull = require('bull');
      Bull.mockImplementationOnce(() => newMockQueue);
      
      service.createQueue(queueName, {
        host: 'localhost',
        port: 6379,
      });

      expect(newMockQueue.on).toHaveBeenCalledTimes(6); // 6 个事件监听器
    });
  });

  describe('getQueue', () => {
    it('应该返回已存在的队列', () => {
      const queueName = 'default';
      const queue = service.getQueue(queueName);
      expect(queue).toBeDefined();
    });

    it('如果队列不存在应该返回 null', () => {
      const queue = service.getQueue('non-existent-queue');
      expect(queue).toBeNull();
    });
  });

  describe('addJob', () => {
    it('应该添加任务到队列', async () => {
      const queueName = 'default';
      const jobData = { test: 'data' };
      const mockJob = { id: '1', data: jobData };

      mockQueueInstance.add.mockResolvedValue(mockJob);

      const result = await service.addJob(queueName, jobData);

      expect(result).toEqual(mockJob);
      expect(mockQueueInstance.add).toHaveBeenCalledWith(jobData, undefined);
    });

    it('如果队列不存在应该返回 null', async () => {
      const result = await service.addJob('non-existent-queue', { test: 'data' });
      expect(result).toBeNull();
    });

    it('应该支持自定义任务选项', async () => {
      const queueName = 'default';
      const jobData = { test: 'data' };
      const options = { attempts: 5, delay: 1000 };
      const mockJob = { id: '1', data: jobData };

      mockQueueInstance.add.mockResolvedValue(mockJob);

      await service.addJob(queueName, jobData, options);

      expect(mockQueueInstance.add).toHaveBeenCalledWith(jobData, options);
    });

    it('如果添加失败应该抛出错误', async () => {
      const queueName = 'default';
      const error = new Error('Queue error');
      mockQueueInstance.add.mockRejectedValue(error);

      await expect(service.addJob(queueName, { test: 'data' })).rejects.toThrow('Queue error');
    });
  });

  describe('getQueueStats', () => {
    it('应该获取队列统计信息', async () => {
      const queueName = 'default';

      mockQueueInstance.getWaitingCount.mockResolvedValue(5);
      mockQueueInstance.getActiveCount.mockResolvedValue(2);
      mockQueueInstance.getCompletedCount.mockResolvedValue(100);
      mockQueueInstance.getFailedCount.mockResolvedValue(3);
      mockQueueInstance.getDelayedCount.mockResolvedValue(1);

      const stats = await service.getQueueStats(queueName);

      expect(stats).toEqual({
        name: queueName,
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        paused: false,
      });
    });

    it('如果队列不存在应该返回 null', async () => {
      const stats = await service.getQueueStats('non-existent-queue');
      expect(stats).toBeNull();
    });
  });

  describe('clearQueue', () => {
    it('应该清空队列', async () => {
      const queueName = 'default';
      mockQueueInstance.empty.mockResolvedValue(undefined);

      await service.clearQueue(queueName);

      expect(mockQueueInstance.empty).toHaveBeenCalled();
    });

    it('如果队列不存在应该跳过清空操作', async () => {
      await service.clearQueue('non-existent-queue');
      expect(mockQueueInstance.empty).not.toHaveBeenCalled();
    });

    it('如果清空失败应该抛出错误', async () => {
      const queueName = 'default';
      const error = new Error('Clear error');
      mockQueueInstance.empty.mockRejectedValue(error);

      await expect(service.clearQueue(queueName)).rejects.toThrow('Clear error');
    });
  });

  describe('closeAll', () => {
    it('应该关闭所有队列', async () => {
      const queue1Mock = createMockQueue();
      const queue2Mock = createMockQueue();
      
      const Bull = require('bull');
      Bull
        .mockImplementationOnce(() => queue1Mock)
        .mockImplementationOnce(() => queue2Mock);

      // 创建多个队列
      service.createQueue('queue1', { host: 'localhost', port: 6379 });
      service.createQueue('queue2', { host: 'localhost', port: 6379 });

      await service.closeAll();

      expect(queue1Mock.close).toHaveBeenCalled();
      expect(queue2Mock.close).toHaveBeenCalled();
    });

    it('如果没有队列应该正常完成', async () => {
      // 创建一个新的 QueueService 实例来测试空队列情况
      const emptyService = new QueueService();
      await emptyService.closeAll();
    });
  });

  describe('onModuleDestroy', () => {
    it('在模块销毁时应该关闭所有队列', async () => {
      const queue1Mock = createMockQueue();
      const Bull = require('bull');
      Bull.mockImplementationOnce(() => queue1Mock);

      service.createQueue('queue1', { host: 'localhost', port: 6379 });

      await service.onModuleDestroy();

      expect(queue1Mock.close).toHaveBeenCalled();
    });
  });
});
