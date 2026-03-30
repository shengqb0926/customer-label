# 运维规范 (Operations Guidelines)

**版本**: v1.0  
**生效日期**: 2026-03-30  
**适用范围**: customer-label 项目运维与 DevOps 人员

---

## 🚀 一、部署操作手册 (Runbook)

### 1.1 生产环境部署流程

#### 前置检查清单

```bash
# ✅ 代码准备
git checkout master
git pull origin master
git tag v1.0.0
git push origin v1.0.0

# ✅ 验证 CHANGELOG.md 已更新
cat CHANGELOG.md | head -20

# ✅ 检查 .env.example 包含所有新环境变量
cat .env.example

# ✅ 验证测试通过
npm test -- --coverage
# 确认覆盖率 >= 30%

# ✅ 安全检查
npm audit
npx snyk test
```

#### 部署步骤

```bash
# Step 1: 备份当前运行版本
pm2 describe customer-label > backup/v1.0.0-status.json
cp -r ./dist backup/dist-v1.0.0

# Step 2: 拉取最新代码
git fetch origin
git checkout v1.0.0

# Step 3: 安装依赖（生产模式）
npm ci --production

# Step 4: 数据库迁移
npm run typeorm migration:run

# Step 5: 重启服务
pm2 restart customer-label

# Step 6: 验证服务健康
sleep 10
curl http://localhost:3000/health
# 预期返回：{"status": "ok", "timestamp": "..."}

# Step 7: 查看日志确认无异常
pm2 logs customer-label --lines 50
```

#### 回滚预案

```bash
# 触发条件：
# 1. 严重 Bug 影响核心功能
# 2. 性能下降超过 50%
# 3. 数据不一致

# 回滚步骤
git checkout v0.9.0
npm install
pm2 restart customer-label
npm run typeorm migration:revert

# 验证回滚成功
curl http://localhost:3000/health
pm2 logs customer-label --lines 20
```

---

### 1.2 Docker 容器化部署

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 生产镜像
FROM node:18-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - TYPEORM_HOST=db
      - REDIS_HOST=redis
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis
    restart: always
  
  db:
    image: postgres:14
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: customer_label
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
  
  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data
    restart: always

volumes:
  postgres_data:
  redis_data:
```

部署命令：
```bash
docker-compose up -d
docker-compose ps  # 验证容器状态
docker-compose logs -f app  # 查看应用日志
```

---

## 🔍 二、监控配置手册

### 2.1 Prometheus 监控指标

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'customer-label-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### 2.2 关键监控指标

| 指标名称 | 类型 | 告警阈值 | 说明 |
|---------|------|----------|------|
| `http_requests_total` | Counter | - | 总请求数 |
| `http_request_duration_seconds` | Histogram | P95 > 2s | 请求耗时分布 |
| `nodejs_heap_size_bytes` | Gauge | > 80% | 堆内存使用 |
| `typeorm_connections_active` | Gauge | = 0 | 活跃 DB 连接 |
| `cache_hits_total` | Counter | - | 缓存命中数 |
| `cache_misses_total` | Counter | - | 缓存未命中数 |

### 2.3 Grafana Dashboard 配置

```json
{
  "dashboard": {
    "title": "Customer Label Monitor",
    "panels": [
      {
        "title": "QPS",
        "targets": [
          {
            "expr": "rate(http_requests_total[1m])"
          }
        ]
      },
      {
        "title": "P95 Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "cache_hits_total / (cache_hits_total + cache_misses_total)"
          }
        ]
      }
    ]
  }
}
```

---

### 2.4 告警规则配置

```yaml
# alerting_rules.yml
groups:
  - name: customer-label-alerts
    rules:
      # P0 级告警
      - alert: ServiceDown
        expr: up{job="customer-label-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "服务不可用"
          description: "{{ $labels.instance }} 服务已宕机超过 1 分钟"
      
      # P1 级告警
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) 
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "错误率过高"
          description: "错误率 {{ $value | humanizePercentage }} 超过 5%"
      
      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "响应时间过长"
          description: "P95 响应时间 {{ $value }}s 超过 2s"
      
      # P2 级告警
      - alert: HighMemoryUsage
        expr: |
          nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.8
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "内存使用率高"
          description: "堆内存使用率 {{ $value | humanizePercentage }}"
      
      - alert: LowCacheHitRate
        expr: |
          cache_hits_total / (cache_hits_total + cache_misses_total) < 0.6
        for: 30m
        labels:
          severity: info
        annotations:
          summary: "缓存命中率低"
          description: "缓存命中率 {{ $value | humanizePercentage }}"
```

---

## 📊 三、日志管理规范

### 3.1 日志级别使用

```typescript
// ✅ 正确使用日志级别
logger.error('Database connection failed', error.stack);  // 错误
logger.warn('Cache miss rate is high');                   // 警告
logger.log('Recommendation engine executed in 1.2s');     // 信息
logger.debug(`Query params: ${JSON.stringify(params)}`);  // 调试

// ❌ 避免滥用
logger.info('User login');  // 过于频繁，应使用 debug
logger.error('Normal operation');  // 不是错误
```

### 3.2 结构化日志格式

```typescript
// winston 配置
import * as winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'customer-label' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// 使用示例
logger.info('Recommendation generated', {
  customerId: 123,
  mode: 'all',
  count: 5,
  executionTime: 1234,
  correlationId: 'req-abc-123',
});
```

### 3.3 日志收集（ELK Stack）

```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /app/logs/*.log
    json.keys_under_root: true
    add_locale: true

output.logstash:
  hosts: ["logstash:5044"]
```

---

## 🔄 四、故障响应流程

### 4.1 事件分级

| 级别 | 定义 | 响应 SLA | 通知方式 |
|------|------|----------|---------|
| **P0 重大事故** | 核心功能完全不可用 | 15 分钟响应，1 小时恢复 | 电话 + 企业微信 |
| **P1 严重事故** | 部分功能受影响 | 30 分钟响应，4 小时恢复 | 企业微信 |
| **P2 一般事故** | 非核心功能异常 | 2 小时响应，24 小时解决 | 邮件 |
| **P3 轻微问题** | UI 瑕疵、体验问题 | 1 天响应，1 周修复 | 工单系统 |

### 4.2 故障处理 SOP

```markdown
## 故障处理标准流程

### 1. 发现与报告
- 监控系统自动告警
- 用户反馈或客服上报
- 值班人员巡检发现

### 2. 初步评估（5 分钟内）
- 确认影响范围（多少用户/功能受影响）
- 判断事件级别（P0/P1/P2/P3）
- 通知相关人员（按级别）

### 3. 紧急止损（优先恢复服务）
- 启用降级策略（如关闭非核心功能）
- 回滚到上一稳定版本
- 扩容或重启服务

### 4. 问题定位
- 查看监控指标（CPU/内存/请求量）
- 分析错误日志
- 追踪调用链路
- 复现问题场景

### 5. 修复验证
- 开发修复补丁
- 在测试环境验证
- 灰度发布（10% → 50% → 100%）
- 持续监控指标

### 6. 复盘总结（24 小时内）
- 编写事故报告
- 分析根本原因（5 Why）
- 制定改进措施
- 更新应急预案
```

---

## 🎯 五、性能优化规范

### 5.1 数据库优化

```sql
-- ✅ 添加索引
CREATE INDEX idx_customers_level_city ON customers(level, city);
CREATE INDEX idx_recommendations_customer_id ON tag_recommendations(customer_id);

-- ✅ 分析慢查询
EXPLAIN ANALYZE 
SELECT * FROM customers 
WHERE level = 'GOLD' AND total_assets > 10000;

-- ✅ 定期维护
VACUUM ANALYZE customers;
REINDEX TABLE customers;
```

### 5.2 缓存优化

```typescript
// ✅ 热点数据预加载
@Cron('0 0 * * * *')  // 每小时整点
async preloadHotData() {
  const topCustomers = await this.getTopCustomers(100);
  await this.cacheService.mset(
    topCustomers.map(c => ({
      key: `customer:${c.id}`,
      value: c,
      ttl: 3600,
    }))
  );
}

// ✅ 缓存穿透防护（布隆过滤器）
async exists(customerId: number): Promise<boolean> {
  const inBloom = await this.bloomFilter.has(customerId.toString());
  if (!inBloom) return false;  // 一定不存在
  
  const inCache = await this.cacheService.exists(`customer:${customerId}`);
  if (inCache) return true;
  
  // 查询数据库并回填缓存
  const customer = await this.repository.findOne({ where: { id: customerId } });
  if (customer) {
    await this.cacheService.set(`customer:${customerId}`, customer);
    return true;
  }
  
  return false;
}
```

### 5.3 并发控制

```typescript
// ✅ 使用分布式锁防止超卖
async updateCustomerAssets(
  customerId: number,
  amount: number
): Promise<void> {
  const lockKey = `lock:customer:${customerId}`;
  
  const acquired = await this.redisClient.set(
    lockKey,
    '1',
    'NX',
    'EX',
    5  // 5 秒超时
  );
  
  if (!acquired) {
    throw new ConflictException('操作正在执行中，请稍后重试');
  }
  
  try {
    // 执行更新逻辑
    await this.repository.update(customerId, { totalAssets: amount });
  } finally {
    await this.redisClient.del(lockKey);
  }
}
```

---

## 📈 六、容量规划

### 6.1 资源需求估算

基于 1000 个客户数据、日均 1 万次 API 调用：

| 资源 | 最低配置 | 推荐配置 | 说明 |
|------|---------|---------|------|
| **CPU** | 2 核 | 4 核 | 推荐引擎计算密集 |
| **内存** | 4GB | 8GB | Redis 缓存占用 |
| **磁盘** | 20GB SSD | 50GB SSD | 日志 + 数据库 |
| **带宽** | 1Mbps | 5Mbps | 文件下载 |

### 6.2 扩缩容策略

```yaml
# Kubernetes HPA 配置
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: customer-label-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: customer-label
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

## 🔒 七、备份与恢复

### 7.1 数据库备份策略

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

# 全量备份
pg_dump -h localhost -U postgres customer_label > \
  ${BACKUP_DIR}/full_${DATE}.sql

# 压缩备份
pg_dump -h localhost -U postgres customer_label | gzip > \
  ${BACKUP_DIR}/compressed_${DATE}.sql.gz

# 保留最近 7 天备份
find ${BACKUP_DIR} -name "*.sql*" -mtime +7 -delete

# 上传到云存储（可选）
aws s3 cp ${BACKUP_DIR}/full_${DATE}.sql.gz \
  s3://my-bucket/backups/postgres/
```

### 7.2 恢复演练

```bash
# 从备份恢复
gunzip < compressed_20260330_120000.sql.gz | \
  psql -h localhost -U postgres customer_label

# 验证恢复结果
psql -h localhost -U postgres customer_label -c \
  "SELECT COUNT(*) FROM customers;"
```

---

## 📋 八、运维检查清单

### 日常巡检（每天）

- [ ] 检查服务状态（`pm2 status`）
- [ ] 查看错误日志（`pm2 logs --lines 100`）
- [ ] 验证监控告警是否正常
- [ ] 检查磁盘空间（`df -h`）
- [ ] 查看数据库连接数

### 周常维护（每周）

- [ ] 分析慢查询日志
- [ ] 清理过期日志（>7 天）
- [ ] 检查备份完整性
- [ ] 审查安全告警
- [ ] 更新依赖包（`npm outdated`）

### 月常任务（每月）

- [ ] 性能基准测试
- [ ] 容量规划评审
- [ ] 灾难恢复演练
- [ ] 技术债务清理
- [ ] 文档更新审查

---

## 📚 九、参考资源

### 9.1 监控工具

- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Grafana Labs](https://grafana.com/)
- [ELK Stack 官方文档](https://www.elastic.co/guide/index.html)

### 9.2 部署工具

- [PM2 官方文档](https://pm2.keymetrics.io/docs/)
- [Docker 官方文档](https://docs.docker.com/)
- [Kubernetes 官方文档](https://kubernetes.io/docs/)

---

**文档版本**: v1.0  
**编制日期**: 2026-03-30  
**审核人**: [待填写]  
**批准人**: [待填写]

**© 2026 客户标签推荐系统项目组 版权所有**
