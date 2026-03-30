# 部署操作手册 (Deployment Guide)

**项目名称**: 客户标签推荐系统  
**版本**: v1.0  
**编制日期**: 2026-03-30  
**运维负责人**: [待填写]

---

## 🚀 一、部署前准备

### 1.1 环境要求

| 资源 | 最低配置 | 推荐配置 | 说明 |
|------|---------|---------|------|
| **CPU** | 2 核 | 4 核 | 推荐引擎计算密集 |
| **内存** | 4GB | 8GB | Redis 缓存占用 |
| **磁盘** | 20GB SSD | 50GB SSD | 日志 + 数据库 |
| **带宽** | 1Mbps | 5Mbps | 文件下载 |

### 1.2 依赖服务

- PostgreSQL 14+
- Redis 6+
- Node.js 18.x LTS
- PM2（进程管理）

---

## 📦 二、生产环境部署流程

### 2.1 前置检查清单

```bash
# ✅ 验证 Git Tag
git tag -l | grep v1.0.0

# ✅ 检查 CHANGELOG.md
cat CHANGELOG.md | head -20

# ✅ 验证测试通过
npm test -- --coverage
# 确认覆盖率 >= 30%

# ✅ 安全检查
npm audit
npx snyk test
```

### 2.2 部署步骤

#### Step 1: 备份当前版本

```bash
# 备份运行状态
pm2 describe customer-label > backup/status-$(date +%Y%m%d_%H%M%S).json

# 备份编译产物
cp -r ./dist backup/dist-$(date +%Y%m%d_%H%M%S)/
```

#### Step 2: 拉取最新代码

```bash
cd /path/to/customer-label
git fetch origin
git checkout v1.0.0
git pull origin v1.0.0
```

#### Step 3: 安装依赖

```bash
# 清理旧依赖
rm -rf node_modules package-lock.json

# 安装生产依赖
npm ci --production
```

#### Step 4: 数据库迁移

```bash
# 执行迁移
npm run typeorm migration:run

# 验证迁移结果
psql -U postgres -d customer_label -c "SELECT COUNT(*) FROM customers;"
```

#### Step 5: 重启服务

```bash
# 使用 PM2 Cluster 模式
pm2 restart customer-label
pm2 save

# 验证进程状态
pm2 status
```

#### Step 6: 健康检查

```bash
# 等待服务启动
sleep 10

# 检查健康端点
curl http://localhost:3000/health
# 预期返回：{"status":"ok","timestamp":"..."}

# 查看日志
pm2 logs customer-label --lines 50
```

---

## 🐳 三、Docker 容器化部署

### 3.1 Dockerfile

```dockerfile
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

### 3.2 Docker Compose

```yaml
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

### 3.3 部署命令

```bash
# 构建并启动
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

---

## 🔄 四、回滚预案

### 4.1 触发条件

- 严重 Bug 影响核心功能
- 性能下降超过 50%
- 数据不一致

### 4.2 回滚步骤

```bash
# Step 1: 切换代码版本
git checkout v0.9.0

# Step 2: 恢复依赖
npm install

# Step 3: 重启服务
pm2 restart customer-label

# Step 4: 数据库回滚
npm run typeorm migration:revert

# Step 5: 验证回滚成功
curl http://localhost:3000/health
pm2 logs customer-label --lines 20
```

---

## 📊 五、监控与告警

### 5.1 关键指标

| 指标 | 告警阈值 | 测量方法 |
|------|---------|---------|
| **API 错误率** | > 5% | Prometheus |
| **P95 响应时间** | > 2s | Grafana |
| **数据库连接数** | > 80% | pg_stat_activity |
| **缓存命中率** | < 60% | Redis INFO |

### 5.2 告警规则配置

```yaml
# prometheus/alerting_rules.yml
groups:
  - name: customer-label-alerts
    rules:
      - alert: ServiceDown
        expr: up{job="customer-label-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "服务不可用"
      
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) 
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
```

---

## 📋 六、运维检查清单

### 日常巡检（每天）

- [ ] `pm2 status` 检查进程状态
- [ ] `pm2 logs --lines 100` 查看错误日志
- [ ] 验证监控告警正常
- [ ] `df -h` 检查磁盘空间
- [ ] 查看数据库连接数

### 周常维护（每周）

- [ ] 分析慢查询日志
- [ ] 清理过期日志（>7 天）
- [ ] 检查备份完整性
- [ ] `npm outdated` 检查依赖更新

### 月常任务（每月）

- [ ] 性能基准测试
- [ ] 容量规划评审
- [ ] 灾难恢复演练
- [ ] 技术债务清理

---

## 📚 七、参考资源

- [运维规范](../standards/OPERATIONS_GUIDELINES.md)
- [PM2 官方文档](https://pm2.keymetrics.io/)
- [Docker 官方文档](https://docs.docker.com/)

---

**文档版本**: v1.0  
**编制人**: [待填写]  
**审核人**: [待填写]  
**批准人**: [待填写]

**© 2026 客户标签推荐系统项目组 版权所有**
