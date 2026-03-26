# WebSocket 实时通知使用指南

## 概述

系统提供基于 WebSocket 的实时通知功能，支持以下通知类型：

- ✅ 推荐生成完成通知
- ✅ 推荐接受/拒绝通知
- ✅ 聚类分析完成通知
- ✅ 评分计算完成通知
- ✅ 规则触发通知
- ✅ 系统告警通知

## 服务端使用

### 1. 注入 NotificationService

在任意 Service 中注入 `NotificationService`：

```typescript
import { Injectable } from '@nestjs/common';
import { NotificationService } from '../infrastructure/websocket/notification.service';

@Injectable()
export class RecommendationService {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  async generateRecommendations(customerId: number, userId: number) {
    // 业务逻辑...
    const result = await this.doGenerate(customerId);

    // 发送通知
    this.notificationService.notifyRecommendationGenerated(
      userId,
      customerId,
      result.id,
      result.tags,
      result.score,
    );

    return result;
  }
}
```

### 2. 通知类型 API

#### 推荐生成完成

```typescript
notificationService.notifyRecommendationGenerated(
  userId: number,
  customerId: number,
  recommendationId: number,
  tags: string[],
  score: number,
);
```

#### 聚类分析完成

```typescript
notificationService.notifyClusteringCompleted(
  userId: number,
  configId: number,
  configName: string,
  clusterCount: number,
  executionTime: number,
  avgSilhouetteScore?: number,
);
```

#### 评分计算完成

```typescript
notificationService.notifyScoringCompleted(
  userId: number,
  customerId: number,
  scores: Record<string, number>,
  totalScore: number,
);
```

#### 规则触发

```typescript
notificationService.notifyRuleTriggered(
  userId: number,
  ruleId: number,
  ruleName: string,
  customerId: number,
);
```

#### 系统告警

```typescript
notificationService.sendSystemAlert(
  userId: number,
  message: string,
  level: 'info' | 'warning' | 'error' | 'critical',
  code?: string,
);
```

#### 广播通知

```typescript
notificationService.broadcastNotification(
  type: NotificationType,
  data: any,
);
```

## 客户端使用

### 1. 连接 WebSocket

```javascript
import io from 'socket.io-client';

// 连接到通知命名空间
const socket = io('http://localhost:3000/notifications', {
  auth: {
    token: 'your_jwt_token', // 必需：JWT token
  },
});

// 连接成功
socket.on('connect', () => {
  console.log('Connected to notification server');
});

// 接收通知
socket.on('notification', (notification) => {
  console.log('Received notification:', notification);
  
  // notification 结构:
  // {
  //   type: 'recommendation_generated',
  //   data: { ... },
  //   timestamp: '2024-01-01T12:00:00.000Z',
  //   userId: 123
  // }
  
  // 根据类型处理
  switch (notification.type) {
    case 'recommendation_generated':
      handleRecommendationGenerated(notification.data);
      break;
    case 'clustering_completed':
      handleClusteringCompleted(notification.data);
      break;
    // ... 其他类型
  }
});

// 断开连接
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// 错误处理
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### 2. React 示例

```tsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

interface Notification {
  type: string;
  data: any;
  timestamp: string;
}

export function NotificationPanel({ userId, token }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // 初始化连接
    const newSocket = io('http://localhost:3000/notifications', {
      auth: { token },
    });

    newSocket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      
      // 显示浏览器通知
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('新通知', {
          body: getNotificationBody(notification),
          icon: '/logo.png',
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  const getNotificationBody = (notification: Notification) => {
    switch (notification.type) {
      case 'recommendation_generated':
        return `为客户 ${notification.data.customerId} 生成了 ${notification.data.tags.length} 个标签`;
      case 'clustering_completed':
        return `聚类分析完成，生成 ${notification.data.clusterCount} 个群体`;
      default:
        return '收到新通知';
    }
  };

  return (
    <div className="notification-panel">
      <h3>实时通知</h3>
      <ul>
        {notifications.map((n, i) => (
          <li key={i}>
            <strong>{n.type}</strong>: {JSON.stringify(n.data)}
            <small>{new Date(n.timestamp).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. Vue 示例

```vue
<template>
  <div class="notification-panel">
    <h3>实时通知</h3>
    <ul>
      <li v-for="(notif, index) in notifications" :key="index">
        <strong>{{ notif.type }}</strong>: {{ formatData(notif.data) }}
        <small>{{ formatDate(notif.timestamp) }}</small>
      </li>
    </ul>
  </div>
</template>

<script>
import { io } from 'socket.io-client';

export default {
  props: ['userId', 'token'],
  data() {
    return {
      socket: null,
      notifications: [],
    };
  },
  mounted() {
    this.socket = io('http://localhost:3000/notifications', {
      auth: { token: this.token },
    });

    this.socket.on('notification', (notification) => {
      this.notifications.unshift(notification);
      this.$emit('new-notification', notification);
    });
  },
  beforeDestroy() {
    if (this.socket) {
      this.socket.close();
    }
  },
  methods: {
    formatData(data) {
      return JSON.stringify(data);
    },
    formatDate(timestamp) {
      return new Date(timestamp).toLocaleString();
    },
  },
};
</script>
```

## 配置

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| WEBSOCKET_CORS_ORIGIN | WebSocket CORS 白名单 | * |
| JWT_SECRET | JWT 密钥（用于验证 token） | default-secret |

### 服务器配置

```typescript
// main.ts
app.enableCors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
});
```

## 心跳检测

客户端应定期发送 ping 保持连接：

```javascript
// 每 30 秒发送一次 ping
setInterval(() => {
  if (socket.connected) {
    socket.emit('ping');
  }
}, 30000);

// 监听 pong 响应
socket.on('pong', (data) => {
  console.log('Server responded to ping:', data.timestamp);
});
```

## 断线重连

Socket.IO 会自动尝试重连，可以自定义重连策略：

```javascript
const socket = io('http://localhost:3000/notifications', {
  auth: { token },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`Reconnected after ${attemptNumber} attempts`);
});

socket.on('reconnect_failed', () => {
  console.error('Failed to reconnect');
});
```

## 安全建议

### 1. Token 验证

- 始终使用 JWT token 进行身份验证
- Token 应通过安全方式（HTTPS）传输
- 设置合理的 token 过期时间

### 2. CORS 配置

生产环境应限制 CORS 来源：

```bash
WEBSOCKET_CORS_ORIGIN=https://your-domain.com
```

### 3. 频率限制

虽然 WebSocket 本身不支持频率限制，但可以在应用层实现：

```typescript
// 在 Gateway 中添加速率限制
private userMessageCount: Map<string, number> = new Map();

@SubscribeMessage('message')
handleMessage(client: Socket, payload: any) {
  const userId = this.getUserIdFromSocket(client);
  const count = this.userMessageCount.get(userId) || 0;
  
  if (count > 100) { // 每分钟最多 100 条消息
    client.disconnect();
    return;
  }
  
  this.userMessageCount.set(userId, count + 1);
}
```

## 性能优化

### 1. 房间管理

使用房间（Room）机制精准推送：

```typescript
// 用户加入专属房间
client.join(`user:${userId}`);

// 只发送给特定用户
this.server.to(`user:${userId}`).emit('notification', data);
```

### 2. 消息压缩

启用 Socket.IO 的消息压缩：

```typescript
@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
  perMessageDeflate: {
    threshold: 1024, // 超过 1KB 的消息才压缩
  },
})
```

### 3. 批量发送

对于高频通知，可以批量发送：

```typescript
private notificationBuffer: Map<number, any[]> = new Map();

async batchNotify(userId: number, notification: any) {
  if (!this.notificationBuffer.has(userId)) {
    this.notificationBuffer.set(userId, []);
  }
  
  const buffer = this.notificationBuffer.get(userId)!;
  buffer.push(notification);
  
  // 每 100ms 或积累 10 条消息发送一次
  if (buffer.length >= 10) {
    await this.sendBatch(userId, buffer);
    buffer.length = 0;
  }
}
```

## 监控和调试

### 1. 在线统计

```typescript
// 获取在线用户数
const stats = this.notificationService.getOnlineStats();
console.log(`Total connections: ${stats.totalConnected}`);
console.log(`Unique users: ${stats.uniqueUsers}`);
```

### 2. 检查用户在线状态

```typescript
const isOnline = this.notificationService.isUserOnline(userId);
console.log(`User ${userId} is ${isOnline ? 'online' : 'offline'}`);
```

### 3. 日志级别

调整日志级别以查看详细日志：

```bash
LOG_LEVEL=debug
```

## 常见问题

### Q: 客户端收不到通知？

**A**: 检查以下几点：
1. Token 是否有效
2. 用户是否正确连接到房间
3. 服务端是否正确调用了通知方法
4. 查看服务端和客户端日志

### Q: 如何处理大量并发连接？

**A**: 
1. 使用 Redis Adapter 实现多实例扩展
2. 启用 WebSocket 压缩
3. 合理设置心跳间隔
4. 使用负载均衡器

### Q: 移动端如何保持长连接？

**A**:
1. 使用后台服务保持连接
2. 实现智能重连策略
3. 考虑使用推送通知（FCM/APNs）作为补充

## 下一步计划

- [ ] 添加通知历史记录
- [ ] 支持通知订阅偏好设置
- [ ] 实现通知分组和聚合
- [ ] 添加通知优先级队列
- [ ] 集成第三方推送服务（FCM/APNs）
