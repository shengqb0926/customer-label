# 运维操作手册 (Runbook Template)

**文档类型**: 运维操作手册  
**适用系统**: 客户标签推荐系统  
**版本**: v1.0  
**编制日期**: 2026-03-30  
**运维负责人**: [待填写]

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

# ✅ 正常标准：status=online, uptime>1d

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

# ✅ 正常标准：< 80% max_connections

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

# ✅ 正常标准：< 80% 总内存

# 3.3 检查命中率
redis-cli INFO stats | grep keyspace

# 计算命中率：hits / (hits + misses)
# ✅ 正常标准：> 60%


# ========== 4. 日志检查 ==========

# 4.1 查看应用错误日志
tail -n 100 /app/logs/error.log | grep -E "(ERROR|FATAL)"

# ✅ 正常标准：无新增 ERROR/FATAL

# 4.2 查看 PM2 日志
pm2 logs customer-label --lines 50 --nostream

# ✅ 正常标准：无异常堆栈


# ========== 5. 磁盘空间检查 ==========

# 5.1 检查磁盘使用率
df -h

# ✅ 正常标准：所有分区 < 70%

# 5.2 检查日志文件大小
du -sh /app/logs/*

# ✅ 正常标准：单个文件 < 1GB


# ========== 6. 监控告警检查 ==========

# 6.1 查看 Prometheus 采集状态
# 访问：http://prometheus:9090/targets

# ✅ 正常标准：所有 targets UP

# 6.2 查看 Grafana Dashboard
# 访问：http://grafana:3000

# ✅ 正常标准：核心指标无异常

# 6.3 检查 Alertmanager 历史告警
# 访问：http://alertmanager:9093

# ✅ 正常标准：无未恢复告警
```

**检查结果记录**:
```
检查日期：2026-03-30
检查人：[姓名]
检查结果：☑ 全部正常 ☐ 存在异常

异常记录:
[如有异常，详细描述并记录处理措施]

跟进事项:
[需要持续跟踪的问题]
```

---

### 1.2 每晚巡检清单（6:00 PM）

**检查时间**: 每个工作日 18:00  
**执行人**: 值班工程师  
**预计耗时**: 10 分钟

```bash
# ========== 1. 业务指标检查 ==========

# 1.1 今日客户总数变化
psql -U postgres -d customer_label -c "
  SELECT count(*) as total_customers,
         count(CASE WHEN created_at > CURRENT_DATE THEN 1 END) as new_today
  FROM customers;
"

# ✅ 正常标准：与昨日相比波动 < 20%

# 1.2 今日推荐生成数量
psql -U postgres -d customer_label -c "
  SELECT count(*) as recommendations_today
  FROM tag_recommendations
  WHERE created_at > CURRENT_DATE;
"

# ✅ 正常标准：有数据产生


# ========== 2. 性能指标检查 ==========

# 2.1 今日 API P95 响应时间
# 访问 Grafana Dashboard 查看

# ✅ 正常标准：< 500ms

# 2.2 今日缓存命中率
# 访问 Grafana Dashboard 查看

# ✅ 正常标准：> 60%


# ========== 3. 备份检查 ==========

# 3.1 检查今日备份是否完成
ls -lh /backup/postgresql/$(date +%Y%m%d)/

# ✅ 正常标准：有当日备份文件，大小合理

# 3.2 验证备份文件完整性
pg_restore --list /backup/postgresql/$(date +%Y%m%d)/customer_label.dump

# ✅ 正常标准：无报错
```

---

## 🔧 二、常规操作

### 2.1 应用部署操作

**场景**: 部署新版本到生产环境  
**前置条件**: 
- [ ] 测试环境验证通过
- [ ] 上线评审完成
- [ ] 回滚预案准备就绪

**操作步骤**:

```bash
# Step 1: 前置检查（预计 5 分钟）
# 1.1 确认 Git Tag
git tag -l | grep v1.0.0

# 1.2 验证测试通过
npm test -- --coverage
# 确认覆盖率 >= 30%

# 1.3 检查 CHANGELOG.md
cat CHANGELOG.md | head -20

# 1.4 备份当前版本
pm2 describe customer-label > backup/status-$(date +%Y%m%d_%H%M%S).json
cp -r ./dist backup/dist-$(date +%Y%m%d_%H%M%S)/


# Step 2: 拉取最新代码（预计 2 分钟）
cd /path/to/customer-label
git fetch origin
git checkout v1.0.0
git pull origin v1.0.0


# Step 3: 安装依赖（预计 5 分钟）
rm -rf node_modules package-lock.json
npm ci --production


# Step 4: 数据库迁移（预计 3 分钟）
npm run typeorm migration:run

# 验证迁移结果
psql -U postgres -d customer_label -c "SELECT COUNT(*) FROM customers;"


# Step 5: 重启服务（预计 2 分钟）
pm2 restart customer-label
pm2 save

# 验证进程状态
pm2 status


# Step 6: 健康检查（预计 5 分钟）
sleep 10  # 等待服务启动

# 检查健康端点
curl http://localhost:3000/health

# 查看日志
pm2 logs customer-label --lines 50

# 验证核心功能
curl http://localhost:3000/api/v1/customers?page=1

# 检查监控指标
# 访问 Grafana Dashboard 确认 QPS/P95/错误率正常


# Step 7: 观察期（预计 30 分钟）
# 每 5 分钟检查一次:
# - PM2 进程状态
# - 错误日志
# - 监控告警

echo "部署完成！请持续观察 30 分钟。"
```

**回滚步骤**（如遇问题）:
```bash
# 立即回滚到上一个版本
git checkout v0.9.0
npm install
pm2 restart customer-label
npm run typeorm migration:revert

# 验证回滚成功
curl http://localhost:3000/health
```

---

### 2.2 数据库备份操作

**场景**: 每日定时全量备份  
**执行时间**: 每天凌晨 2:00  
**预计耗时**: 10 分钟

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/postgresql/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# 执行备份
pg_dump -U postgres -d customer_label \
  --format=custom \
  --compress=9 \
  --verbose \
  --file=$BACKUP_DIR/customer_label.dump

# 验证备份
pg_restore --list $BACKUP_DIR/customer_label.dump > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ 备份成功：$BACKUP_DIR/customer_label.dump"
  
  # 删除 7 天前的备份
  find /backup/postgresql -type f -mtime +7 -delete
  
  exit 0
else
  echo "❌ 备份失败！"
  exit 1
fi
```

**Cron 配置**:
```bash
# 编辑 crontab
crontab -e

# 添加每日备份任务
0 2 * * * /app/scripts/backup.sh >> /var/log/backup.log 2>&1
```

---

### 2.3 日志清理操作

**场景**: 清理过期日志释放磁盘空间  
**执行频率**: 每周日凌晨 3:00  
**预计耗时**: 5 分钟

```bash
#!/bin/bash
# cleanup_logs.sh

LOG_DIR="/app/logs"
RETENTION_DAYS=7

echo "开始清理 ${LOG_DIR} 目录下 ${RETENTION_DAYS} 天前的日志..."

# 删除 7 天前的日志文件
find $LOG_DIR -name "*.log" -type f -mtime +$RETENTION_DAYS -exec rm -f {} \;

# 压缩 3 天前的日志（节省空间）
find $LOG_DIR -name "*.log" -type f -mtime +3 -exec gzip {} \;

# 显示清理结果
echo "清理完成！"
du -sh $LOG_DIR/*
```

**Cron 配置**:
```bash
0 3 * * 0 /app/scripts/cleanup_logs.sh >> /var/log/cleanup.log 2>&1
```

---

## 🚨 三、故障处理

### 3.1 服务不可用（P0 级）

**现象**: 
- 健康检查失败
- API 全部返回 502/503
- PM2 进程退出

**处理流程**:

```bash
# Step 1: 确认故障（1 分钟）
curl http://localhost:3000/health
pm2 status customer-label

# 如果进程退出，立即重启
pm2 restart customer-label

# Step 2: 查看日志定位原因（3 分钟）
pm2 logs customer-label --lines 100

# 常见错误及处理:
# Error 1: Out Of Memory
# → 增加服务器内存或优化代码

# Error 2: Database connection failed
# → 检查数据库状态和连接配置

# Error 3: Port already in use
# → 查找并终止占用端口的进程
lsof -i :3000
kill -9 <PID>

# Step 3: 紧急恢复（5 分钟）
# 如果重启无效，执行回滚
git checkout <previous_version>
npm install
pm2 restart customer-label

# Step 4: 通知相关人员（同步进行）
# 电话通知:
# - 技术负责人
# - 运维负责人
# - 产品经理

# Step 5: 持续观察（30 分钟）
# 每 5 分钟检查一次状态
watch -n 300 'pm2 status && curl http://localhost:3000/health'
```

---

### 3.2 数据库连接池耗尽（P1 级）

**现象**:
- API 响应超时
- 错误日志：`too many clients already`
- Grafana 显示连接数接近上限

**处理流程**:

```bash
# Step 1: 确认连接数（2 分钟）
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Step 2: 临时扩容（5 分钟）
# 修改配置文件
vi /app/config/application.yml

# 调整 max_connections
spring.datasource.hikari.maximum-pool-size: 200  # 从 100 调整到 200

# 重启应用
pm2 restart customer-label

# Step 3: 识别慢查询（10 分钟）
psql -U postgres -c "
  SELECT query, calls, mean_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Step 4: 优化慢查询（视情况而定）
# 添加索引或优化 SQL

# Step 5: 长期治理
# - 实施读写分离
# - 引入连接池监控
# - 建立 SQL 审查机制
```

---

### 3.3 缓存雪崩（P1 级）

**现象**:
- Redis 宕机或大量 key 同时过期
- 数据库请求激增
- 响应时间急剧上升

**处理流程**:

```bash
# Step 1: 确认 Redis 状态（2 分钟）
redis-cli ping
redis-cli INFO server

# Step 2: 如 Redis 宕机，立即重启（5 分钟）
systemctl restart redis

# Step 3: 启用本地降级方案（开发层面）
# @Cacheable 装饰器自动降级到内存缓存

# Step 4: 逐步恢复缓存（10 分钟）
# 避免同时加载所有缓存
# 采用随机 TTL 策略

# Step 5: 长期预防
# - 设置热点数据永不过期
# - 实施多级缓存策略
# - 添加熔断降级机制
```

---

## 📊 四、性能优化

### 4.1 数据库索引优化

**场景**: 发现慢查询，需要添加索引

**操作步骤**:

```sql
-- Step 1: 识别慢查询
SELECT query, calls, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Step 2: 分析查询计划
EXPLAIN ANALYZE
SELECT * FROM customers
WHERE level = 'GOLD' AND total_assets >= 5000000;

-- Step 3: 创建索引
CREATE INDEX CONCURRENTLY idx_customers_level_assets
ON customers(level, total_assets DESC);

-- Step 4: 验证效果
EXPLAIN ANALYZE
SELECT * FROM customers
WHERE level = 'GOLD' AND total_assets >= 5000000;

-- 对比 Index Scan 和 Seq Scan 的代价

-- Step 5: 监控索引使用情况
SELECT schemaname, relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

---

### 4.2 缓存命中率提升

**场景**: 缓存命中率低于 60%

**优化措施**:

```typescript
// 1. 热点数据预加载
@OnModuleInit
async onModuleInit() {
  // 预加载配置数据
  const configs = await this.configRepository.find();
  for (const config of configs) {
    await this.cacheService.set(`config:${config.key}`, config, { ttl: 0 });
  }
}

// 2. 批量查询使用 getOrSet 模式
async getCustomerDetails(ids: number[]) {
  return await Promise.all(
    ids.map(id => this.cacheService.getOrSet(
      `customer:${id}`,
      () => this.customerRepository.findOne({ where: { id } }),
      { ttl: 3600 }
    ))
  );
}

// 3. 设置合理的 TTL
// - 静态数据：24 小时
// - 动态数据：5-30 分钟
// - 热点数据：1 小时 + 随机过期时间
```

---

## 📋 五、变更管理

### 5.1 配置变更流程

**变更类型**: 
- ☐ 应用配置（application.yml）
- ☐ 数据库配置（postgresql.conf）
- ☐ Redis 配置（redis.conf）
- ☐ Nginx 配置（nginx.conf）

**变更流程**:

```
1. 变更申请（提前 3 个工作日）
   - 填写《配置变更申请表》
   - 说明变更原因、内容、预期影响
   - 提供回滚方案

2. 变更评审（提前 2 个工作日）
   - 技术负责人评审
   - DBA 评审（如涉及数据库）
   - 运维负责人评审

3. 变更测试（提前 1 个工作日）
   - 在测试环境验证
   - 记录测试结果
   - 更新 Runbook

4. 变更实施（变更窗口）
   - 选择业务低峰期（凌晨 2-4 点）
   - 按 Runbook 执行
   - 实时监

5. 变更验证（变更后 30 分钟）
   - 执行健康检查
   - 验证核心功能
   - 观察监控指标

6. 变更总结（变更后 1 个工作日）
   - 记录变更结果
   - 更新文档
   - 经验教训总结
```

---

## 📚 六、参考资料

### 6.1 相关文档

- [部署操作手册](../deployment/DEPLOYMENT_GUIDE.md)
- [监控配置手册](./MONITORING_SETUP.md)
- [事件复盘报告](./INCIDENT_REPORT.md)
- [运维规范](../standards/OPERATIONS_GUIDELINES.md)

### 6.2 工具链接

- **PM2 管理**: `pm2 list`
- **Prometheus**: http://prometheus:9090
- **Grafana**: http://grafana:3000
- **Alertmanager**: http://alertmanager:9093
- **Kibana**: http://kibana:5601

---

## 📞 七、联系方式

### 技术支持

| 角色 | 姓名 | 电话 | 企业微信 |
|------|------|------|---------|
| **值班工程师** | [姓名] | 138xxxx | [微信号] |
| **技术负责人** | [姓名] | 139xxxx | [微信号] |
| **DBA** | [姓名] | 137xxxx | [微信号] |
| **运维负责人** | [姓名] | 136xxxx | [微信号] |

### 升级流程

```
P3 问题 → 值班工程师 → 2 小时内解决
P2 问题 → 技术负责人 → 4 小时内解决
P1 问题 → 运维负责人 → 立即响应
P0 问题 → CTO → 全员应急响应
```

---

**文档版本**: v1.0  
**编制人**: [待填写]  
**审核人**: [待填写]  
**批准人**: [待填写]  
**最后更新**: 2026-03-30

**© 2026 客户标签推荐系统项目组 版权所有**
