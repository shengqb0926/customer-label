import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

export interface NotificationPayload<T = any> {
  type: NotificationType;
  data: T;
  timestamp: string;
  userId?: number;
}

export type NotificationType =
  | 'recommendation_generated'
  | 'recommendation_accepted'
  | 'recommendation_rejected'
  | 'clustering_completed'
  | 'scoring_completed'
  | 'system_alert'
  | 'rule_triggered';

/**
 * WebSocket 通知网关
 * 
 * 提供实时通知推送功能：
 * - 推荐生成完成通知
 * - 聚类分析完成通知
 * - 评分计算完成通知
 * - 系统告警通知
 * - 规则触发通知
 */
@WebSocketGateway({
  cors: {
    origin: process.env.WEBSOCKET_CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private connectedClients: Map<number, Set<string>> = new Map(); // userId -> socketIds

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Notification Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // 从查询参数或 auth 头中获取 token
      const token = client.handshake.auth.token || client.handshake.query.token;

      if (!token) {
        this.logger.warn('Client connected without token, disconnecting...');
        client.disconnect();
        return;
      }

      // 验证 token
      const decoded = await this.jwtService.verifyAsync(token);
      const userId = decoded.sub || decoded.userId;

      if (!userId) {
        this.logger.warn('Invalid token payload, disconnecting...');
        client.disconnect();
        return;
      }

      // 保存用户和 socket 的映射关系
      if (!this.connectedClients.has(userId)) {
        this.connectedClients.set(userId, new Set());
      }
      this.connectedClients.get(userId)!.add(client.id);

      // 加入用户专属房间
      client.join(`user:${userId}`);

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);

      // 发送欢迎消息
      client.emit('connected', {
        clientId: client.id,
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    // 从映射中移除
    for (const [userId, sockets] of this.connectedClients.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.connectedClients.delete(userId);
        }
        break;
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket): void {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  /**
   * 发送通知给特定用户
   */
  sendToUser<T>(userId: number, type: NotificationType, data: T): void {
    const payload: NotificationPayload<T> = {
      type,
      data,
      timestamp: new Date().toISOString(),
      userId,
    };

    const room = `user:${userId}`;
    this.server.to(room).emit('notification', payload);

    this.logger.debug(
      `Sent notification to user ${userId}: ${type}`,
    );
  }

  /**
   * 发送推荐生成完成通知
   */
  notifyRecommendationGenerated(
    userId: number,
    data: {
      customerId: number;
      recommendationId: number;
      tags: string[];
      score: number;
    },
  ): void {
    this.sendToUser(userId, 'recommendation_generated', data);
  }

  /**
   * 发送推荐被接受通知
   */
  notifyRecommendationAccepted(
    userId: number,
    data: {
      customerId: number;
      recommendationId: number;
      acceptedAt: string;
    },
  ): void {
    this.sendToUser(userId, 'recommendation_accepted', data);
  }

  /**
   * 发送推荐被拒绝通知
   */
  notifyRecommendationRejected(
    userId: number,
    data: {
      customerId: number;
      recommendationId: number;
      reason?: string;
    },
  ): void {
    this.sendToUser(userId, 'recommendation_rejected', data);
  }

  /**
   * 发送聚类分析完成通知
   */
  notifyClusteringCompleted(
    userId: number,
    data: {
      configId: number;
      configName: string;
      clusterCount: number;
      executionTime: number;
      avgSilhouetteScore?: number;
    },
  ): void {
    this.sendToUser(userId, 'clustering_completed', data);
  }

  /**
   * 发送评分计算完成通知
   */
  notifyScoringCompleted(
    userId: number,
    data: {
      customerId: number;
      scores: Record<string, number>;
      totalScore: number;
    },
  ): void {
    this.sendToUser(userId, 'scoring_completed', data);
  }

  /**
   * 发送系统告警通知
   */
  notifySystemAlert(
    userId: number,
    data: {
      level: 'info' | 'warning' | 'error' | 'critical';
      message: string;
      code?: string;
    },
  ): void {
    this.sendToUser(userId, 'system_alert', data);
  }

  /**
   * 发送规则触发通知
   */
  notifyRuleTriggered(
    userId: number,
    data: {
      ruleId: number;
      ruleName: string;
      customerId: number;
      triggeredAt: string;
    },
  ): void {
    this.sendToUser(userId, 'rule_triggered', data);
  }

  /**
   * 广播通知给所有在线用户
   */
  broadcast<T>(type: NotificationType, data: T): void {
    const payload: NotificationPayload<T> = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    this.server.emit('notification', payload);

    this.logger.debug(`Broadcast notification: ${type}`);
  }

  /**
   * 获取在线用户统计
   */
  getOnlineStats(): {
    totalConnected: number;
    uniqueUsers: number;
  } {
    let totalConnected = 0;
    for (const sockets of this.connectedClients.values()) {
      totalConnected += sockets.size;
    }

    return {
      totalConnected,
      uniqueUsers: this.connectedClients.size,
    };
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: number): boolean {
    return this.connectedClients.has(userId);
  }
}
