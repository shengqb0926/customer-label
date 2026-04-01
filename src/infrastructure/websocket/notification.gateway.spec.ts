import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { NotificationGateway } from './notification.gateway';

// Mock Socket.IO
const mockServer = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};

const mockSocket = {
  id: 'test-socket-id',
  handshake: {
    auth: {} as any,
    query: {} as any,
  },
  join: jest.fn(),
  leave: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
};

describe('NotificationGateway', () => {
  let gateway: NotificationGateway;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationGateway,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<NotificationGateway>(NotificationGateway);
    jwtService = module.get<JwtService>(JwtService);

    // 设置 mock server
    (gateway as any).server = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该成功初始化', () => {
      expect(gateway).toBeDefined();
    });

    it('afterInit 应该记录日志', () => {
      gateway.afterInit(mockServer as any);
    });
  });

  describe('handleConnection', () => {
    it('应该允许带有有效 token 的客户端连接', async () => {
      const mockToken = 'valid-token';
      const mockUserId = 123;

      (mockSocket.handshake.auth as any).token = mockToken;
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: mockUserId });

      await gateway.handleConnection(mockSocket as any);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken);
      expect(mockSocket.join).toHaveBeenCalledWith(`user:${mockUserId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('connected', expect.any(Object));
    });

    it('应该拒绝没有 token 的客户端', async () => {
      (mockSocket.handshake.auth as any).token = undefined;
      (mockSocket.handshake.query as any).token = undefined;

      await gateway.handleConnection(mockSocket as any);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('应该拒绝带有无效 token 的客户端', async () => {
      (mockSocket.handshake.auth as any).token = 'invalid-token';
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(mockSocket as any);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('应该拒绝 token 中没有 userId 的客户端', async () => {
      (mockSocket.handshake.auth as any).token = 'token-without-userid';
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: undefined });

      await gateway.handleConnection(mockSocket as any);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('应该支持从查询参数获取 token', async () => {
      const mockToken = 'query-token';
      const mockUserId = 456;

      (mockSocket.handshake.auth as any).token = undefined;
      (mockSocket.handshake.query as any).token = mockToken;
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ userId: mockUserId });

      await gateway.handleConnection(mockSocket as any);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken);
      expect(mockSocket.join).toHaveBeenCalledWith(`user:${mockUserId}`);
    });
  });

  describe('handleDisconnect', () => {
    it('应该处理客户端断开连接', async () => {
      const mockUserId = 123;
      const testSocketId = 'test-socket-id';

      // 先添加一个在线用户
      (gateway as any).connectedClients = new Map([[mockUserId, new Set([testSocketId])]]);

      // 设置 mock socket id
      mockSocket.id = testSocketId;

      await gateway.handleDisconnect(mockSocket as any);

      // 验证用户被移除
      expect((gateway as any).connectedClients.has(mockUserId)).toBe(false);
    });
  });

  describe('handlePing', () => {
    it('应该响应 ping 请求', () => {
      gateway.handlePing(mockSocket as any);
      expect(mockSocket.emit).toHaveBeenCalledWith('pong', expect.objectContaining({
        timestamp: expect.any(String),
      }));
    });
  });

  describe('sendToUser', () => {
    it('应该发送通知给特定用户', () => {
      const userId = 123;
      const type = 'recommendation_generated' as const;
      const data = { customerId: 1, recommendationId: 2 };

      gateway.sendToUser(userId, type, data);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('notification', expect.objectContaining({
        type,
        data,
        userId,
        timestamp: expect.any(String),
      }));
    });
  });

  describe('notifyRecommendationGenerated', () => {
    it('应该发送推荐生成通知', () => {
      const userId = 123;
      const data = {
        customerId: 1,
        recommendationId: 2,
        tags: ['tag1', 'tag2'],
        score: 0.95,
      };

      gateway.notifyRecommendationGenerated(userId, data);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('notification', expect.objectContaining({
        type: 'recommendation_generated',
        data,
      }));
    });
  });

  describe('notifyRecommendationAccepted', () => {
    it('应该发送推荐接受通知', () => {
      const userId = 123;
      const data = {
        customerId: 1,
        recommendationId: 2,
        acceptedAt: '2026-03-31T10:00:00Z',
      };

      gateway.notifyRecommendationAccepted(userId, data);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('notification', expect.objectContaining({
        type: 'recommendation_accepted',
        data,
      }));
    });
  });

  describe('notifyRecommendationRejected', () => {
    it('应该发送推荐拒绝通知', () => {
      const userId = 123;
      const data = {
        customerId: 1,
        recommendationId: 2,
        reason: '不匹配',
      };

      gateway.notifyRecommendationRejected(userId, data);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('notification', expect.objectContaining({
        type: 'recommendation_rejected',
        data,
      }));
    });
  });

  describe('notifyClusteringCompleted', () => {
    it('应该发送聚类完成通知', () => {
      const userId = 123;
      const data = {
        configId: 1,
        configName: 'Test Config',
        clusterCount: 5,
        executionTime: 1000,
        avgSilhouetteScore: 0.8,
      };

      gateway.notifyClusteringCompleted(userId, data);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('notification', expect.objectContaining({
        type: 'clustering_completed',
        data,
      }));
    });
  });

  describe('notifyScoringCompleted', () => {
    it('应该发送评分完成通知', () => {
      const userId = 123;
      const data = {
        customerId: 1,
        scores: { rf: 0.9, m: 0.8, f: 0.7 },
        totalScore: 0.8,
      };

      gateway.notifyScoringCompleted(userId, data);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('notification', expect.objectContaining({
        type: 'scoring_completed',
        data,
      }));
    });
  });

  describe('notifySystemAlert', () => {
    it('应该发送系统告警通知', () => {
      const userId = 123;
      const data = {
        level: 'warning' as const,
        message: 'Test alert',
        code: 'TEST_001',
      };

      gateway.notifySystemAlert(userId, data);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('notification', expect.objectContaining({
        type: 'system_alert',
        data,
      }));
    });

    it('应该支持不同级别的告警', () => {
      const levels: Array<'info' | 'warning' | 'error' | 'critical'> = ['info', 'warning', 'error', 'critical'];

      levels.forEach(level => {
        jest.clearAllMocks();
        gateway.notifySystemAlert(123, {
          level,
          message: `${level} alert`,
        });

        expect(mockServer.to).toHaveBeenCalledWith('user:123');
        expect(mockServer.emit).toHaveBeenCalledWith('notification', expect.objectContaining({
          type: 'system_alert',
          data: expect.objectContaining({ level }),
        }));
      });
    });
  });

  describe('notifyRuleTriggered', () => {
    it('应该发送规则触发通知', () => {
      const userId = 123;
      const data = {
        ruleId: 1,
        ruleName: 'Test Rule',
        customerId: 2,
        triggeredAt: '2026-03-31T10:00:00Z',
      };

      gateway.notifyRuleTriggered(userId, data);

      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('notification', expect.objectContaining({
        type: 'rule_triggered',
        data,
      }));
    });
  });

  describe('broadcast', () => {
    it('应该广播通知给所有用户', () => {
      const type = 'system_alert' as const;
      const data = { message: 'Broadcast test' };

      gateway.broadcast(type, data);

      expect(mockServer.emit).toHaveBeenCalledWith('notification', expect.objectContaining({
        type,
        data,
        timestamp: expect.any(String),
      }));
    });
  });

  describe('getOnlineStats', () => {
    it('应该返回在线用户统计', () => {
      // 模拟多个用户和 socket 连接
      (gateway as any).connectedClients = new Map([
        [1, new Set(['socket-1', 'socket-2'])],
        [2, new Set(['socket-3'])],
        [3, new Set(['socket-4', 'socket-5', 'socket-6'])],
      ]);

      const stats = gateway.getOnlineStats();

      expect(stats).toEqual({
        totalConnected: 6,
        uniqueUsers: 3,
      });
    });

    it('如果没有用户在线应该返回 0', () => {
      (gateway as any).connectedClients = new Map();
      const stats = gateway.getOnlineStats();
      expect(stats).toEqual({
        totalConnected: 0,
        uniqueUsers: 0,
      });
    });
  });

  describe('isUserOnline', () => {
    it('如果用户在线应该返回 true', () => {
      (gateway as any).connectedClients = new Map([[123, new Set(['socket-1'])]]);
      expect(gateway.isUserOnline(123)).toBe(true);
    });

    it('如果用户不在线应该返回 false', () => {
      (gateway as any).connectedClients = new Map([[123, new Set(['socket-1'])]]);
      expect(gateway.isUserOnline(456)).toBe(false);
    });
  });
});
