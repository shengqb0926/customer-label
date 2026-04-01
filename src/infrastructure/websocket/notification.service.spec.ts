import { Test, TestingModule } from '@nestjs/testing';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';

// Mock NotificationGateway
const mockGateway = {
  notifyRecommendationGenerated: jest.fn(),
  notifyClusteringCompleted: jest.fn(),
  notifyScoringCompleted: jest.fn(),
  notifySystemAlert: jest.fn(),
  notifyRuleTriggered: jest.fn(),
  broadcast: jest.fn(),
  isUserOnline: jest.fn(),
  getOnlineStats: jest.fn(),
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: NotificationGateway,
          useValue: mockGateway,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该成功初始化', () => {
      expect(service).toBeDefined();
    });
  });

  describe('notifyRecommendationGenerated', () => {
    it('应该发送推荐生成通知', () => {
      const userId = 123;
      const customerId = 1;
      const recommendationId = 2;
      const tags = ['tag1', 'tag2'];
      const score = 0.95;

      service.notifyRecommendationGenerated(userId, customerId, recommendationId, tags, score);

      expect(mockGateway.notifyRecommendationGenerated).toHaveBeenCalledWith(userId, {
        customerId,
        recommendationId,
        tags,
        score,
      });
    });

    it('如果发送失败应该记录错误但不抛出异常', () => {
      mockGateway.notifyRecommendationGenerated.mockImplementation(() => {
        throw new Error('Send failed');
      });

      expect(() => {
        service.notifyRecommendationGenerated(123, 1, 2, ['tag'], 0.9);
      }).not.toThrow();
    });
  });

  describe('notifyClusteringCompleted', () => {
    it('应该发送聚类完成通知（带轮廓分数）', () => {
      const userId = 123;
      const configId = 1;
      const configName = 'Test Config';
      const clusterCount = 5;
      const executionTime = 1000;
      const avgSilhouetteScore = 0.8;

      service.notifyClusteringCompleted(
        userId,
        configId,
        configName,
        clusterCount,
        executionTime,
        avgSilhouetteScore,
      );

      expect(mockGateway.notifyClusteringCompleted).toHaveBeenCalledWith(userId, {
        configId,
        configName,
        clusterCount,
        executionTime,
        avgSilhouetteScore,
      });
    });

    it('应该发送聚类完成通知（不带轮廓分数）', () => {
      const userId = 123;
      const configId = 1;
      const configName = 'Test Config';
      const clusterCount = 5;
      const executionTime = 1000;

      service.notifyClusteringCompleted(
        userId,
        configId,
        configName,
        clusterCount,
        executionTime,
      );

      expect(mockGateway.notifyClusteringCompleted).toHaveBeenCalledWith(userId, {
        configId,
        configName,
        clusterCount,
        executionTime,
        avgSilhouetteScore: undefined,
      });
    });

    it('如果发送失败应该记录错误', () => {
      mockGateway.notifyClusteringCompleted.mockImplementation(() => {
        throw new Error('Send failed');
      });

      expect(() => {
        service.notifyClusteringCompleted(123, 1, 'Config', 5, 1000);
      }).not.toThrow();
    });
  });

  describe('notifyScoringCompleted', () => {
    it('应该发送评分完成通知', () => {
      const userId = 123;
      const customerId = 1;
      const scores = { rf: 0.9, m: 0.8, f: 0.7 };
      const totalScore = 0.8;

      service.notifyScoringCompleted(userId, customerId, scores, totalScore);

      expect(mockGateway.notifyScoringCompleted).toHaveBeenCalledWith(userId, {
        customerId,
        scores,
        totalScore,
      });
    });

    it('如果发送失败应该记录错误', () => {
      mockGateway.notifyScoringCompleted.mockImplementation(() => {
        throw new Error('Send failed');
      });

      expect(() => {
        service.notifyScoringCompleted(123, 1, { rf: 0.9 }, 0.9);
      }).not.toThrow();
    });
  });

  describe('sendSystemAlert', () => {
    it('应该发送系统告警（默认 info 级别）', () => {
      const userId = 123;
      const message = 'Test alert';

      service.sendSystemAlert(userId, message);

      expect(mockGateway.notifySystemAlert).toHaveBeenCalledWith(userId, {
        level: 'info',
        message,
        code: undefined,
      });
    });

    it('应该发送系统告警（指定级别和错误码）', () => {
      const userId = 123;
      const message = 'Critical error';
      const level = 'critical' as const;
      const code = 'ERR_001';

      service.sendSystemAlert(userId, message, level, code);

      expect(mockGateway.notifySystemAlert).toHaveBeenCalledWith(userId, {
        level,
        message,
        code,
      });
    });

    it('如果发送失败应该记录错误', () => {
      mockGateway.notifySystemAlert.mockImplementation(() => {
        throw new Error('Send failed');
      });

      expect(() => {
        service.sendSystemAlert(123, 'Test', 'error');
      }).not.toThrow();
    });
  });

  describe('notifyRuleTriggered', () => {
    it('应该发送规则触发通知', () => {
      const userId = 123;
      const ruleId = 1;
      const ruleName = 'Test Rule';
      const customerId = 2;

      service.notifyRuleTriggered(userId, ruleId, ruleName, customerId);

      expect(mockGateway.notifyRuleTriggered).toHaveBeenCalledWith(userId, {
        ruleId,
        ruleName,
        customerId,
        triggeredAt: expect.any(String),
      });
    });

    it('如果发送失败应该记录错误', () => {
      mockGateway.notifyRuleTriggered.mockImplementation(() => {
        throw new Error('Send failed');
      });

      expect(() => {
        service.notifyRuleTriggered(123, 1, 'Rule', 2);
      }).not.toThrow();
    });
  });

  describe('broadcastNotification', () => {
    it('应该广播通知', () => {
      const type = 'system_alert' as const;
      const data = { message: 'Broadcast test' };

      service.broadcastNotification(type, data);

      expect(mockGateway.broadcast).toHaveBeenCalledWith(type, data);
    });

    it('如果广播失败应该记录错误', () => {
      mockGateway.broadcast.mockImplementation(() => {
        throw new Error('Broadcast failed');
      });

      expect(() => {
        service.broadcastNotification('system_alert', {});
      }).not.toThrow();
    });
  });

  describe('isUserOnline', () => {
    it('应该检查用户是否在线', () => {
      mockGateway.isUserOnline.mockReturnValue(true);

      const result = service.isUserOnline(123);

      expect(result).toBe(true);
      expect(mockGateway.isUserOnline).toHaveBeenCalledWith(123);
    });

    it('当用户不在线时返回 false', () => {
      mockGateway.isUserOnline.mockReturnValue(false);

      const result = service.isUserOnline(456);

      expect(result).toBe(false);
    });
  });

  describe('getOnlineStats', () => {
    it('应该获取在线统计信息', () => {
      const mockStats = {
        totalConnected: 10,
        uniqueUsers: 5,
      };

      mockGateway.getOnlineStats.mockReturnValue(mockStats);

      const result = service.getOnlineStats();

      expect(result).toEqual(mockStats);
      expect(mockGateway.getOnlineStats).toHaveBeenCalled();
    });
  });
});
