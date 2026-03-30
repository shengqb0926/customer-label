# 运维操作手册 (Runbook)

**文档类型**: 运维操作手册  
**适用系统**: 客户标签智能推荐系统  
**版本**: v1.0  
**编制日期**: 2026-03-30  
**最后更新**: 2026-03-30 (Phase 2 完成)  
**运维负责人**: 系统管理员

---

## 📋 一、日常巡检

### 1.1 每日晨检清单（9:30 AM）

**检查时间**: 每个工作日 9:30  
**执行人**: 值班工程师  
**预计耗时**: 15 分钟

```bash
# ========== 1. 服务状态检查 ==========

# 1.1 检查应用进程
pm2 status customer-label

# 预期输出:
# ┌────┬───────────┬─────────────┬─────────┬──────────┬────────┬──────┬───────────┐
# │ id │ name      │ namespace   │ status  │ uptime   │ cpu    │ mem  │ user      │
# ├────┼───────────┼─────────────┼─────────┼──────────┼────────┼──────┼───────────┤
# │ 0  │ customer-label │ default │ online  │ 15d      │ 0.3%   │ 256MB│ node      │
# └────┴───────────┴─────────────┴─────────┴──────────┴────────┴──────┴───────────┘

# ✅ 正常标准：status=online, uptime>1d, mem<500MB

# 1.2 检查健康端点
curl http://localhost:3000/health

# 预期输出：{"status":"ok","timestamp":"2026-03-30T01:30:00.000Z"}

# ✅ 正常标准：status="ok"


# ========== 2. 数据库检查 ==========

# 2.1 检查 PostgreSQL 状态
systemctl status postgresql

# ✅ 正常标准：active (running)

# 2.2 检查数据库连接数
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# ✅ 正常标准：< 80% max_connections (默认 100)

# 2.3 检查慢查询（过去 24 小时）
psql -U postgres -c "
  SELECT count(*) 
  FROM pg_stat_statements 
  WHERE mean_exec_time > 1000 
  AND last_executed_at > NOW() - INTERVAL '24 hours';
"

# ✅ 正常标准：< 10 条


# ========== 3. 缓存检查 ==========

# 3.1 检查 Redis 状态
redis-cli ping

# 预期输出：PONG

# ✅ 正常标准：PONG

# 3.2 检查内存使用
redis-cli INFO memory | grep used_memory_human

# ✅ 正常标准：< 80% 总内存 (默认 512MB)

# 3.3 检查命中率
redis-cli INFO stats | grep keyspace_hits
redis-cli INFO stats | grep keyspace_misses

# 计算命中率：hits / (hits + misses)
# ✅ 正常标准：> 60%


# ========== 4. 日志检查 ==========

# 4.1 查看应用错误日志
tail -n 100 /var/www/customer-label/logs/error.log | grep -E "(ERROR|FATAL)"

# ✅ 正常标准：无新增 ERROR/FATAL

# 4.2 查看 PM2 日志
pm2 logs customer-label --lines 50 --nostream

# ✅ 正常标准：无异常堆栈


# ========== 5. 磁盘空间检查 ==========

# 5.1 检查磁盘使用率
df -h

# ✅ 正常标准：/< 80%, /var/log < 70%

# 5.2 检查日志文件大小
du -sh /var/www/customer-label/logs/*

# ✅ 正常标准：单个日志文件 < 100MB


# ========== 6. 备份检查 ==========

# 6.1 检查昨日备份是否成功
ls -lh /backup/postgresql/$(date -d yesterday +%Y%m%d).sql.gz

# ✅ 正常标准：文件大小 > 1MB

# 6.2 检查备份完整性
gunzip -t /backup/postgresql/$(date -d yesterday +%Y%m%d).sql.gz

# ✅ 正常标准：无报错
```

**填写检查记录**:
```markdown
## 检查记录

**日期**: 2026-03-30  
**检查人**: [姓名]  
**检查时间**: 09:30

| 检查项 | 状态 | 备注 |
|--------|------|------|
| 应用进程 | ✅ / ❌ | |
| 健康端点 | ✅ / ❌ | |
| PostgreSQL | ✅ / ❌ | |
| Redis | ✅ / ❌ | |
| 日志检查 | ✅ / ❌ | |
| 磁盘空间 | ✅ / ❌ | |
| 备份检查 | ✅ / ❌ | |

**异常情况**: [详细描述]  
**处理措施**: [已采取的行动]
```

---

### 1.2 每周检查清单

**检查时间**: 每周一上午  
**执行人**: 运维工程师  
**预计耗时**: 1 小时

```bash
# ========== 1. 性能分析 ==========

# 1.1 查看慢查询 TOP 10
psql -U postgres -c "
  SELECT query, calls, mean_exec_time, total_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# 1.2 分析表大小
psql -U postgres -c "
  SELECT 
    schemaname || '.' || relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(relid) DESC
  LIMIT 10;
"

# 1.3 检查索引使用情况
psql -U postgres -c "
  SELECT 
    schemaname || '.' || relname AS table_name,
    indexrelname AS index_name,
    idx_scan AS index_scans
  FROM pg_stat_user_indexes
  WHERE idx_scan < 100
  ORDER BY idx_scan ASC
  LIMIT 10;
"


# ========== 2. 安全审计 ==========

# 2.1 检查登录日志
sudo last | head -20

# 2.2 检查 sudo 使用记录
sudo grep sudo /var/log/auth.log | tail -20

# 2.3 检查 SSH 失败登录
sudo grep "Failed password" /var/log/auth.log | wc -l

# 2.4 检查异常进程
ps auxf | grep -v grep | grep -E "(nc|netcat|wget|curl)"


# ========== 3. 容量规划 ==========

# 3.1 统计客户数量增长趋势
psql -U postgres -d customer_label -c "
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as daily_new
  FROM customers
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
"

# 3.2 统计推荐数据量
psql -U postgres -d customer_label -c "
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as daily_recs
  FROM tag_recommendations
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
"

# 3.3 预测存储需求
# 当前每天增长 * 30 天 = 月度增长
# 现有空间 / 月度增长 = 可用月数
```

---

## 🔧 二、常规操作

### 2.1 服务重启

#### 场景 1: 计划内重启

```bash
# 1. 通知相关人员
echo "计划于 $(date '+%Y-%m-%d %H:%M') 重启服务，预计耗时 2 分钟" | mail -s "服务重启通知" team@example.com

# 2. 停止服务
pm2 stop customer-label

# 3. 等待 30 秒确保请求处理完成
sleep 30

# 4. 清理缓存
rm -rf /var/www/customer-label/node_modules/.vite

# 5. 启动服务
pm2 start customer-label

# 6. 验证服务
sleep 10
curl http://localhost:3000/health

# 7. 检查日志
pm2 logs customer-label --lines 50
```

#### 场景 2: 紧急重启

```bash
# 1. 强制重启
pm2 restart customer-label --force

# 2. 立即验证
curl http://localhost:3000/health

# 3. 查看错误日志
pm2 logs customer-label --err --lines 100

# 4. 通知团队
echo "服务已于 $(date '+%Y-%m-%d %H:%M') 紧急重启" | mail -s "紧急重启通知" team@example.com
```

---

### 2.2 数据库备份

#### 每日自动备份

**备份脚本** (`/usr/local/bin/backup-postgresql.sh`):
```bash
#!/bin/bash

# 配置
DB_NAME="customer_label"
DB_USER="customer_user"
BACKUP_DIR="/backup/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# 设置权限
chmod 600 $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# 删除旧备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# 记录日志
echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup completed: ${DB_NAME}_${DATE}.sql.gz" >> /var/log/backup.log

# 验证备份
if [ -f "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz" ]; then
  echo "Backup successful"
  exit 0
else
  echo "Backup failed"
  exit 1
fi
```

**定时任务** (`/etc/cron.d/backup-postgresql`):
```bash
# 每天凌晨 2 点备份
0 2 * * * root /usr/local/bin/backup-postgresql.sh
```

#### 手动备份

```bash
# 完整备份
pg_dump -U customer_user -h localhost customer_label > backup_$(date +%Y%m%d).sql

# 仅备份结构
pg_dump -U customer_user -h localhost --schema-only customer_label > schema.sql

# 仅备份数据
pg_dump -U customer_user -h localhost --data-only customer_label > data.sql

# 压缩备份
pg_dump -U customer_user -h localhost customer_label | gzip > backup_$(date +%Y%m%d).sql.gz

# 恢复备份
psql -U customer_user -h localhost customer_label < backup_20260330.sql
```

---

### 2.3 日志清理

#### 自动清理策略

**清理脚本** (`/usr/local/bin/cleanup-logs.sh`):
```bash
#!/bin/bash

LOG_DIR="/var/www/customer-label/logs"
MAX_SIZE_MB=100
RETENTION_DAYS=7

# 清理大于 100MB 的日志文件
find $LOG_DIR -type f -size +${MAX_SIZE_MB}M -exec truncate -s 0 {} \;

# 删除 7 天前的日志
find $LOG_DIR -type f -name "*.log.*" -mtime +$RETENTION_DAYS -delete

# 压缩旧日志
find $LOG_DIR -type f -name "*.log" -mtime +1 ! -name "*.gz" -exec gzip {} \;

echo "$(date '+%Y-%m-%d %H:%M:%S') - Log cleanup completed" >> /var/log/cleanup.log
```

**定时任务**:
```bash
# 每周日凌晨 3 点清理
0 3 * * 0 root /usr/local/bin/cleanup-logs.sh
```

#### 手动清理

```bash
# 查看日志大小
du -sh /var/www/customer-label/logs/*

# 清空当前日志
> /var/www/customer-label/logs/error.log
> /var/www/customer-label/logs/out.log

# 归档旧日志
cd /var/www/customer-label/logs
tar -czf logs_$(date +%Y%m%d).tar.gz *.log.*
mv logs_*.tar.gz /backup/logs/

# 删除归档
rm -rf /backup/logs/logs_*.tar.gz
find /backup/logs -mtime +30 -delete
```

---

### 2.4 证书续期

```bash
# 检查证书有效期
sudo certbot certificates

# 自动续期（已配置 cron）
sudo certbot renew

# 手动续期
sudo certbot renew --force-renewal

# 验证续期
sudo systemctl reload nginx
curl -I https://your-domain.com
```

---

## 🚨 三、故障处理

### 3.1 P0 级故障 - 服务不可用

**症状**: 
- 用户无法访问系统
- 健康检查失败
- PM2 进程异常退出

**响应时间**: 立即（5 分钟内）

**处理流程**:
```bash
# Step 1: 确认故障
pm2 status
curl http://localhost:3000/health

# Step 2: 查看错误日志
pm2 logs customer-label --err --lines 200

# Step 3: 尝试重启
pm2 restart customer-label

# Step 4: 如果重启失败，回滚到上一版本
cd /var/www/customer-label
git log --oneline -5
git checkout <previous_version>
npm ci --production
npm run build
pm2 restart customer-label

# Step 5: 通知团队
echo "[P0] 服务已恢复，正在调查原因" | mail -s "P0 故障恢复" team@example.com

# Step 6: 保留现场
cp /var/www/customer-label/logs/error.log /backup/incident_$(date +%Y%m%d_%H%M%S).log
```

---

### 3.2 P1 级故障 - 性能严重下降

**症状**:
- API 响应时间 > 5 秒
- 数据库连接池耗尽
- 内存使用率 > 90%

**响应时间**: 15 分钟内

**处理流程**:
```bash
# Step 1: 识别瓶颈
top -bn1 | head -20
pm2 monit

# Step 2: 检查数据库
psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE state != 'idle';"

# Step 3: 终止慢查询
psql -U postgres -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';
"

# Step 4: 清理缓存
redis-cli FLUSHDB

# Step 5: 扩容（如需要）
# 调整 PM2 实例数
vim ecosystem.config.js
# instances: 4 -> 8

pm2 restart customer-label

# Step 6: 限流保护
# 临时降低限流阈值
vim /etc/nginx/sites-available/customer-label
# limit_req_zone rate=10r/s -> rate=5r/s

sudo nginx -t && sudo nginx -s reload
```

---

### 3.3 P2 级故障 - 功能异常

**症状**:
- 某个功能模块报错
- 部分 API 返回 500 错误
- 数据不一致

**响应时间**: 1 小时内

**处理流程**:
```bash
# Step 1: 定位问题模块
grep "ERROR" /var/www/customer-label/logs/error.log | tail -20

# Step 2: 查看具体错误堆栈
pm2 logs customer-label --err | grep -A 20 "TypeError\|ReferenceError"

# Step 3: 检查相关服务
# 数据库连接
psql -U customer_user -d customer_label -c "SELECT 1"

# Redis 连接
redis-cli ping

# Step 4: 修复数据（如需要）
psql -U customer_user -d customer_label << EOF
-- 示例：修复错误的推荐状态
UPDATE tag_recommendations 
SET status = 'PENDING' 
WHERE status = 'INVALID_STATUS';
EOF

# Step 5: 热修复（紧急）
cd /var/www/customer-label
git pull origin hotfix/xxx
npm run build
pm2 restart customer-label

# Step 6: 记录故障
# 填写 INCIDENT_REPORT.md
```

---

## 📊 四、监控配置

### 4.1 Prometheus 监控

**安装 Prometheus**:
```bash
# 下载
wget https://github.com/prometheus/prometheus/releases/download/v2.40.0/prometheus-2.40.0.linux-amd64.tar.gz
tar -xzf prometheus-*.tar.gz
cd prometheus-*/

# 配置
cat > prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
EOF

# 启动
./prometheus --config.file=prometheus.yml &
```

### 4.2 Grafana 可视化

**导入 Dashboard**:
- Node Exporter: 1860
- PostgreSQL: 9628
- Redis: 763

**告警规则**:
```yaml
groups:
- name: customer-label-alerts
  rules:
  - alert: ServiceDown
    expr: up{job="node"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Service {{ \$labels.instance }} is down"
  
  - alert: HighMemoryUsage
    expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage on {{ \$labels.instance }}"
  
  - alert: PostgresSlowQueries
    expr: rate(pg_stat_statements_mean_exec_time_seconds[5m]) > 1
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "PostgreSQL slow queries detected"
```

---

## 📈 五、性能优化

### 5.1 数据库优化

```bash
# 1. 添加索引
psql -U customer_user -d customer_label << EOF
-- 客户查询优化
CREATE INDEX IF NOT EXISTS idx_customers_level_created 
ON customers(level, created_at DESC);

-- 推荐查询优化
CREATE INDEX IF NOT EXISTS idx_rec_customer_status 
ON tag_recommendations(customer_id, status);

-- 定期分析表
ANALYZE customers;
ANALYZE tag_recommendations;
EOF

# 2. 清理死元组
VACUUM ANALYZE customers;
VACUUM ANALYZE tag_recommendations;

# 3. 调整配置
psql -U postgres << EOF
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '64MB';
SELECT pg_reload_conf();
EOF
```

### 5.2 Redis 优化

```bash
# 配置最大内存
redis-cli CONFIG SET maxmemory 512mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# 持久化配置
redis-cli CONFIG SET save "900 1 300 10 60 10000"
redis-cli CONFIG SET appendonly yes

# 保存到配置文件
redis-cli CONFIG REWRITE
```

---

## 🔗 六、参考资料

- [`MONITORING_SETUP.md`](./MONITORING_SETUP.md) - 监控配置手册
- [`INCIDENT_REPORT.md`](./INCIDENT_REPORT.md) - 事件复盘报告
- [`DEPLOYMENT_GUIDE.md`](../deployment/DEPLOYMENT_GUIDE.md) - 部署操作手册
- [PostgreSQL 性能优化](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Redis 最佳实践](https://redis.io/topics/best-practices)

---

**维护记录**:

| 日期 | 维护人 | 变更描述 |
|------|--------|---------|
| 2026-03-30 | AI Assistant | 基于 Phase 2 实际项目填充真实运维流程 |
| - | - | - |

**审批签字**:

- 运维负责人：________________  日期：__________
- 技术负责人：________________  日期：__________
