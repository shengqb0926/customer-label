# 监控配置手册 (Monitoring Setup)

**项目名称**: 客户标签推荐系统  
**版本**: v1.0  
**编制日期**: 2026-03-30  
**运维负责人**: [待填写]

---

## 📊 一、监控架构

### 1.1 整体架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   App       │────▶│ Prometheus  │────▶│   Grafana   │
│  Metrics    │     │   Server    │     │  Dashboard  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                      ┌────▼────┐
                      │ Alertmanager │
                      └─────────────┘
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
            企业微信      邮件        Webhook
```

---

## 🔧 二、Prometheus 配置

### 2.1 prometheus.yml

```yaml
global:
  scrape_interval: 15s          # 采集间隔
  evaluation_interval: 15s      # 规则评估间隔

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - "alerting_rules.yml"

scrape_configs:
  # Node  exporter（系统指标）
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
    
  # 应用指标（NestJS）
  - job_name: 'customer-label-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    
  # PostgreSQL 数据库
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
    
  # Redis 缓存
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
```

### 2.2 安装 Prometheus

```bash
# Docker 方式部署
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v /path/to/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v prometheus_data:/prometheus \
  prom/prometheus:v2.45.0

# 验证
curl http://localhost:9090/api/v1/targets
```

---

## 📈 三、关键监控指标

### 3.1 应用层指标

| 指标名称 | 类型 | 说明 | 告警阈值 |
|---------|------|------|---------|
| `http_requests_total` | Counter | 总请求数 | - |
| `http_request_duration_seconds` | Histogram | 请求耗时分布 | P95 > 2s |
| `http_requests_in_flight` | Gauge | 正在处理的请求数 | > 100 |
| `nodejs_heap_size_used_bytes` | Gauge | 堆内存使用 | > 80% |
| `typeorm_connections_active` | Gauge | 活跃 DB 连接 | > 80% |
| `cache_hits_total` | Counter | 缓存命中数 | - |
| `cache_misses_total` | Counter | 缓存未命中数 | - |

### 3.2 数据库指标

| 指标名称 | 类型 | 说明 | 告警阈值 |
|---------|------|------|---------|
| `pg_stat_activity_count` | Gauge | 活跃连接数 | > 80 |
| `pg_locks_count` | Gauge | 锁数量 | > 1000 |
| `pg_replication_lag_seconds` | Gauge | 复制延迟 | > 60s |
| `pg_slow_queries_total` | Counter | 慢查询总数 | > 10/天 |

### 3.3 Redis 指标

| 指标名称 | 类型 | 说明 | 告警阈值 |
|---------|------|------|---------|
| `redis_connected_clients` | Gauge | 连接客户端数 | > 1000 |
| `redis_used_memory_bytes` | Gauge | 内存使用 | > 80% |
| `redis_keyspace_hits_total` | Counter | 键空间命中 | - |
| `redis_keyspace_misses_total` | Counter | 键空间未命中 | - |

---

## 🎨 四、Grafana Dashboard 配置

### 4.1 安装 Grafana

```bash
# Docker 方式部署
docker run -d \
  --name grafana \
  -p 3000:3000 \
  -v grafana_data:/var/lib/grafana \
  -v ./grafana/provisioning:/etc/grafana/provisioning \
  grafana/grafana:10.0.0

# 默认账号
用户名：admin
密码：admin
```

### 4.2 Dashboard JSON 配置

```json
{
  "dashboard": {
    "title": "Customer Label Monitor",
    "panels": [
      {
        "id": 1,
        "title": "QPS",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[1m])",
            "legendFormat": "Requests/s"
          }
        ]
      },
      {
        "id": 2,
        "title": "P95 Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))",
            "legendFormat": "P95"
          }
        ]
      },
      {
        "id": 3,
        "title": "Cache Hit Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "cache_hits_total / (cache_hits_total + cache_misses_total)",
            "legendFormat": "Hit Rate"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                {"color": "red", "value": null},
                {"color": "yellow", "value": 0.6},
                {"color": "green", "value": 0.8}
              ]
            }
          }
        }
      },
      {
        "id": 4,
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_activity_count",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "id": 5,
        "title": "Recommendation Engine Execution Time",
        "type": "graph",
        "targets": [
          {
            "expr": "recommendation_engine_duration_seconds_sum / recommendation_engine_duration_seconds_count",
            "legendFormat": "Avg Execution Time"
          }
        ]
      }
    ]
  }
}
```

---

## ⚠️ 五、告警规则配置

### 5.1 alerting_rules.yml

```yaml
groups:
  - name: customer-label-alerts
    rules:
      # ========== P0 级告警 ==========
      
      - alert: ServiceDown
        expr: up{job="customer-label-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "🔴 服务不可用"
          description: "{{ $labels.instance }} 的 customer-label 服务已宕机超过 1 分钟"
          
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "🔴 数据库不可用"
          description: "PostgreSQL 数据库 {{ $labels.instance }} 已宕机"
          
      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "🔴 Redis 不可用"
          description: "Redis 缓存 {{ $labels.instance }} 已宕机"
      
      # ========== P1 级告警 ==========
      
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) 
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "🟠 错误率过高"
          description: "API 错误率 {{ $value | humanizePercentage }} 超过 5%，持续 5 分钟"
          
      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "🟠 响应时间过长"
          description: "P95 响应时间 {{ $value }}s 超过 2s 阈值"
          
      - alert: HighMemoryUsage
        expr: |
          nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "🟠 内存使用率高"
          description: "Node.js 堆内存使用率 {{ $value | humanizePercentage }}"
          
      - alert: DatabaseConnectionPoolExhausted
        expr: |
          pg_stat_activity_count / current_setting('max_connections')::int > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "🟠 数据库连接池耗尽"
          description: "数据库连接使用率 {{ $value | humanizePercentage }}"
      
      # ========== P2 级告警 ==========
      
      - alert: LowCacheHitRate
        expr: |
          cache_hits_total / (cache_hits_total + cache_misses_total) < 0.6
        for: 30m
        labels:
          severity: info
        annotations:
          summary: "🔵 缓存命中率低"
          description: "缓存命中率 {{ $value | humanizePercentage }}，建议优化缓存策略"
          
      - alert: HighDiskUsage
        expr: |
          (node_filesystem_size_bytes - node_filesystem_free_bytes) 
          / node_filesystem_size_bytes > 0.7
        for: 1h
        labels:
          severity: info
        annotations:
          summary: "🔵 磁盘使用率高"
          description: "磁盘使用率 {{ $value | humanizePercentage }}"
          
      - alert: SlowQueriesIncreasing
        expr: |
          increase(pg_slow_queries_total[1h]) > 10
        for: 1h
        labels:
          severity: info
        annotations:
          summary: "🔵 慢查询增加"
          description: "过去 1 小时新增慢查询 {{ $value }} 条"
```

---

## 📱 六、告警通知配置

### 6.1 Alertmanager 配置

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m
  
route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default-receiver'
  
  routes:
    # P0 级告警 - 电话通知
    - match:
        severity: critical
      receiver: 'phone-alert'
      
    # P1 级告警 - 企业微信
    - match:
        severity: warning
      receiver: 'wechat-alert'
      
    # P2 级告警 - 邮件
    - match:
        severity: info
      receiver: 'email-alert'

receivers:
  - name: 'default-receiver'
    email_configs:
      - to: 'ops-team@example.com'
        from: 'alert@example.com'
        smarthost: 'smtp.example.com:587'
        
  - name: 'phone-alert'
    webhook_configs:
      - url: 'http://phone-gateway.example.com/alert'
        
  - name: 'wechat-alert'
    webhook_configs:
      - url: 'http://wechat-gateway.example.com/alert'
        
  - name: 'email-alert'
    email_configs:
      - to: 'dev-team@example.com'
```

### 6.2 企业微信机器人配置

```yaml
# 在 receivers 中添加
- name: 'wechat-bot'
  webhook_configs:
    - url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY'
      send_resolved: true
```

---

## 🔍 七、日志收集（ELK Stack）

### 7.1 Filebeat 配置

```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /app/logs/*.log
    json.keys_under_root: true
    add_locale: true
    fields:
      service: customer-label

processors:
  - add_host_metadata: ~
  - add_cloud_metadata: ~

output.logstash:
  hosts: ["logstash:5044"]
```

### 7.2 Kibana Dashboard

导入预定义 Dashboard:
```bash
curl -X POST "localhost:5601/api/saved_objects/_import" \
  -H "kbn-xsrf: true" \
  --form file=@customer-label-dashboard.ndjson
```

---

## 📊 八、自定义业务指标

### 8.1 NestJS 中集成 Prometheus

```typescript
// main.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
})
export class AppModule {}
```

### 8.2 推荐引擎自定义指标

```typescript
// recommendation.service.ts
import { Counter, Histogram } from 'prom-client';

const recommendationCounter = new Counter({
  name: 'recommendations_generated_total',
  help: 'Total number of recommendations generated',
  labelNames: ['engine', 'status'],
});

const recommendationDuration = new Histogram({
  name: 'recommendation_engine_duration_seconds',
  help: 'Duration of recommendation engine execution',
  labelNames: ['engine'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

async generateForCustomer(customerId: number) {
  const endTimer = recommendationDuration.startTimer({ engine: 'all' });
  
  try {
    // ... 执行推荐逻辑
    
    recommendationCounter.inc({ engine: 'all', status: 'success' });
  } catch (error) {
    recommendationCounter.inc({ engine: 'all', status: 'error' });
    throw error;
  } finally {
    endTimer();
  }
}
```

---

## 📋 九、监控检查清单

### 日常巡检（每天）

- [ ] 查看 Grafana Dashboard 核心指标
- [ ] 检查 Prometheus 采集状态
- [ ] 查看 Alertmanager 告警历史
- [ ] 确认日志收集正常
- [ ] 检查磁盘空间使用率

### 周常维护（每周）

- [ ] 分析慢查询趋势
- [ ] 检查告警规则有效性
- [ ] 清理过期监控数据
- [ ] 审查 Dashboard 完整性
- [ ] 更新文档和 Runbook

### 月常任务（每月）

- [ ] 性能基准对比
- [ ] 容量规划评审
- [ ] 灾难恢复演练
- [ ] 监控盲点识别
- [ ] 工具链升级评估

---

## 📚 十、参考资料

- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Grafana Labs](https://grafana.com/)
- [Alertmanager 配置指南](https://prometheus.io/docs/alerting/latest/configuration/)
- [运维规范](../standards/OPERATIONS_GUIDELINES.md)

---

**文档版本**: v1.0  
**编制人**: [待填写]  
**审核人**: [待填写]  
**批准人**: [待填写]

**© 2026 客户标签推荐系统项目组 版权所有**
