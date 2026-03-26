import { Injectable, Logger } from '@nestjs/common';
import { NotificationGateway, NotificationType } from './notification.gateway';

/**
 * 通知服务
 * 
 * 封装 WebSocket 通知发送逻辑，提供简便的 API
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly gateway: NotificationGateway) {}

  /**
   * 发送推荐生成完成通知
   */
  notifyRecommendationGenerated(
    userId: number,
    customerId: number,
    recommendationId: number,
    tags: string[],
    score: number,
  ): void {
    try {
      this.gateway.notifyRecommendationGenerated(userId, {
        customerId,
        recommendationId,
        tags,
        score,
      });
      this.logger.debug(
        `Sent recommendation notification to user ${userId} for customer ${customerId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send recommendation notification: ${error.message}`);
    }
  }

  /**
   * 发送聚类分析完成通知
   */
  notifyClusteringCompleted(
    userId: number,
    configId: number,
    configName: string,
    clusterCount: number,
    executionTime: number,
    avgSilhouetteScore?: number,
  ): void {
    try {
      this.gateway.notifyClusteringCompleted(userId, {
        configId,
        configName,
        clusterCount,
        executionTime,
        avgSilhouetteScore,
      });
      this.logger.debug(
        `Sent clustering notification to user ${userId}: ${clusterCount} clusters`,
      );
    } catch (error) {
      this.logger.error(`Failed to send clustering notification: ${error.message}`);
    }
  }

  /**
   * 发送评分计算完成通知
   */
  notifyScoringCompleted(
    userId: number,
    customerId: number,
    scores: Record<string, number>,
    totalScore: number,
  ): void {
    try {
      this.gateway.notifyScoringCompleted(userId, {
        customerId,
        scores,
        totalScore,
      });
      this.logger.debug(`Sent scoring notification to user ${userId} for customer ${customerId}`);
    } catch (error) {
      this.logger.error(`Failed to send scoring notification: ${error.message}`);
    }
  }

  /**
   * 发送系统告警
   */
  sendSystemAlert(
    userId: number,
    message: string,
    level: 'info' | 'warning' | 'error' | 'critical' = 'info',
    code?: string,
  ): void {
    try {
      this.gateway.notifySystemAlert(userId, {
        level,
        message,
        code,
      });
      this.logger.warn(`Sent system alert to user ${userId}: ${message}`);
    } catch (error) {
      this.logger.error(`Failed to send system alert: ${error.message}`);
    }
  }

  /**
   * 发送规则触发通知
   */
  notifyRuleTriggered(
    userId: number,
    ruleId: number,
    ruleName: string,
    customerId: number,
  ): void {
    try {
      this.gateway.notifyRuleTriggered(userId, {
        ruleId,
        ruleName,
        customerId,
        triggeredAt: new Date().toISOString(),
      });
      this.logger.debug(
        `Sent rule trigger notification: ${ruleName} for customer ${customerId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send rule trigger notification: ${error.message}`);
    }
  }

  /**
   * 广播系统通知
   */
  broadcastNotification(
    type: NotificationType,
    data: any,
  ): void {
    try {
      this.gateway.broadcast(type, data);
      this.logger.debug(`Broadcast notification: ${type}`);
    } catch (error) {
      this.logger.error(`Failed to broadcast notification: ${error.message}`);
    }
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: number): boolean {
    return this.gateway.isUserOnline(userId);
  }

  /**
   * 获取在线统计
   */
  getOnlineStats(): {
    totalConnected: number;
    uniqueUsers: number;
  } {
    return this.gateway.getOnlineStats();
  }
}
