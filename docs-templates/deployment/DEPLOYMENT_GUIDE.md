# 部署操作手册 (Deployment Guide)

**项目名称**: 客户标签智能推荐系统  
**版本**: v1.0  
**编制日期**: 2026-03-30  
**最后更新**: 2026-03-30 (Phase 2 完成)  
**运维负责人**: 系统管理员  
**当前状态**: 生产环境就绪

---

## 🚀 一、部署前准备

### 1.1 环境要求（实际配置）

| 资源 | 最低配置 | 推荐配置 | 生产环境配置 | 说明 |
|------|---------|---------|-------------|------|
| **CPU** | 2 核 | 4 核 | 4 核 | 推荐引擎计算密集 |
| **内存** | 4GB | 8GB | 8GB | Redis 缓存占用 |
| **磁盘** | 20GB SSD | 50GB SSD | 100GB SSD | 日志 + 数据库 |
| **带宽** | 1Mbps | 5Mbps | 10Mbps | 文件下载 |

### 1.2 依赖服务（实际版本）

| 服务 | 版本 | 端口 | 用途 | 安装命令 |
|------|------|------|------|---------|
| **Node.js** | 18.x LTS | - | 运行时环境 | `nvm install 18` |
| **PostgreSQL** | 14+ | 5432 | 主数据库 | `apt install postgresql-14` |
| **Redis** | 6+ | 6379 | 缓存层 | `apt install redis-server` |
| **PM2** | 5.x | - | 进程管理 | `npm install -g pm2` |
| **Nginx** | 1.20+ | 80/443 | 反向代理 | `apt install nginx` |

### 1.3 前置检查清单

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

# ✅ 检查 Node.js 版本
node -v  # 应显示 v18.x

# ✅ 检查 npm 版本
npm -v   # 应显示 9.x+
```

---

## 📦 二、开发环境部署流程

### 2.1 快速启动（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/your-org/customer-label.git
cd customer-label

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填写数据库连接信息

# 4. 启动后端服务
npm run dev

# 5. 启动前端服务（新终端）
cd frontend
npm install
npm run dev

# 访问地址:
# 后端：http://localhost:3000
# 前端：http://localhost:5173
# Swagger: http://localhost:3000/api/docs
```

### 2.2 Docker Compose 部署（一键启动）

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  # PostgreSQL 数据库
  postgres:
    image: postgres:14-alpine
    container_name: customer-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: customer_label
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis 缓存
  redis:
    image: redis:6-alpine
    container_name: customer-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 后端服务
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: customer-backend
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres123@postgres:5432/customer_label
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: your-secret-key-change-in-production
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

  # 前端服务
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: customer-frontend
    environment:
      VITE_API_BASE_URL: http://localhost:3000
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

**启动命令**:
```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

---

## 🌐 三、生产环境部署流程

### 3.1 服务器初始化

#### Step 1: 系统更新

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y git curl wget vim htop net-tools

# 设置时区
sudo timedatectl set-timezone Asia/Shanghai
```

#### Step 2: 安装 Node.js

```bash
# 安装 NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 加载 NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 安装 Node.js 18 LTS
nvm install 18
nvm use 18
nvm alias default 18

# 验证安装
node -v  # v18.x
npm -v   # 9.x+
```

#### Step 3: 安装 PostgreSQL

```bash
# 添加 PostgreSQL 仓库
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

# 安装 PostgreSQL 14
sudo apt update
sudo apt install -y postgresql-14 postgresql-contrib-14

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 检查状态
sudo systemctl status postgresql

# 创建数据库和用户
sudo -u postgres psql << EOF
CREATE DATABASE customer_label;
CREATE USER customer_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE customer_label TO customer_user;
\q
EOF
```

#### Step 4: 安装 Redis

```bash
# 安装 Redis
sudo apt install -y redis-server

# 配置 Redis
sudo vim /etc/redis/redis.conf

# 修改以下配置:
# bind 127.0.0.1
# protected-mode yes
# port 6379
# requirepass your_redis_password
# maxmemory 512mb
# maxmemory-policy allkeys-lru

# 启动服务
sudo systemctl start redis
sudo systemctl enable redis
sudo systemctl status redis

# 测试连接
redis-cli -a your_redis_password ping
```

#### Step 5: 安装 PM2

```bash
# 全局安装 PM2
npm install -g pm2

# 设置开机自启
pm2 startup
# 执行输出的命令

# 验证安装
pm2 -v
```

### 3.2 应用部署

#### Step 1: 拉取代码

```bash
# 创建应用目录
sudo mkdir -p /var/www/customer-label
sudo chown $USER:$USER /var/www/customer-label
cd /var/www/customer-label

# 克隆代码（或上传代码包）
git clone https://github.com/your-org/customer-label.git .
git checkout v1.0.0  # 或特定分支
```

#### Step 2: 配置环境变量

```bash
# 创建 .env 文件
cat > .env << EOF
# 环境配置
NODE_ENV=production

# 数据库配置
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=customer_label
DATABASE_USER=customer_user
DATABASE_PASSWORD=your_secure_password

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT 配置
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=24h

# 应用配置
PORT=3000
API_PREFIX=/api/v1

# 限流配置
THROTTLE_TTL=60
THROTTLE_LIMIT=60

# 前端配置
FRONTEND_URL=https://your-domain.com
EOF

# 设置权限
chmod 600 .env
```

#### Step 3: 安装依赖

```bash
# 清理旧依赖（如果有）
rm -rf node_modules package-lock.json

# 安装生产依赖
npm ci --production

# 编译 TypeScript
npm run build
```

#### Step 4: 数据库迁移

```bash
# 执行迁移
npm run typeorm migration:run

# 验证迁移结果
psql -U customer_user -d customer_label -c "SELECT COUNT(*) FROM customers;"
```

#### Step 5: 启动服务

```bash
# 使用 PM2 启动
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup

# 查看状态
pm2 status

# 查看日志
pm2 logs customer-label
```

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [{
    name: 'customer-label',
    script: './dist/main.js',
    instances: 4,  // CPU 核心数
    exec_mode: 'cluster',
    
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    
    env_production: {
      NODE_ENV: 'production',
    },
    
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    max_memory_restart: '500M',
    watch: false,
    
    // 重启策略
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
  }],
};
```

### 3.3 Nginx 配置

#### Step 1: 安装 Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Step 2: 配置反向代理

```bash
sudo vim /etc/nginx/sites-available/customer-label
```

**配置文件**:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 配置
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # 前端静态文件
    location / {
        root /var/www/customer-label/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # 缓存策略
        location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # 后端 API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 限流
        limit_req zone=api burst=20 nodelay;
    }
    
    # WebSocket 支持
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
    
    # 日志
    access_log /var/log/nginx/customer-label-access.log;
    error_log /var/log/nginx/customer-label-error.log;
}

# 限流区域
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

#### Step 3: 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/customer-label /etc/nginx/sites-enabled/

# 删除默认配置
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 3.4 SSL 证书配置

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run

# 设置定时任务（已自动添加）
sudo crontab -l
# 0 3 * * * certbot renew --quiet
```

---

## 🔧 四、部署后验证

### 4.1 功能验证清单

```bash
# ========== 1. 服务健康检查 ==========

# 1.1 检查 PM2 进程
pm2 status
# 应显示 online 状态

# 1.2 检查健康端点
curl http://localhost:3000/health
# 应返回：{"status":"ok","timestamp":"..."}

# 1.3 检查 API 端点
curl http://localhost:3000/api/v1/customers?page=1&limit=10
# 应返回客户列表

# ========== 2. 数据库连接检查 ==========

# 2.1 检查数据库连接
psql -U customer_user -d customer_label -c "SELECT NOW();"

# 2.2 检查表是否存在
psql -U customer_user -d customer_label -c "\dt"

# ========== 3. Redis 连接检查 ==========

# 3.1 检查 Redis 连接
redis-cli -a your_redis_password ping

# 3.2 检查缓存功能
redis-cli -a your_redis_password SET test_key "test_value"
redis-cli -a your_redis_password GET test_key

# ========== 4. 前端访问检查 ==========

# 4.1 访问前端页面
curl -I https://your-domain.com
# 应返回 200 OK

# 4.2 检查静态资源
curl -I https://your-domain.com/assets/main.js
# 应返回 200 OK

# ========== 5. HTTPS 检查 ==========

# 5.1 检查 SSL 证书
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# 5.2 检查 HTTPS 重定向
curl -I http://your-domain.com
# 应返回 301 重定向到 HTTPS
```

### 4.2 性能基准测试

```bash
# 安装 Apache Bench
sudo apt install -y apache2-utils

# 测试首页响应时间
ab -n 1000 -c 10 https://your-domain.com/

# 测试 API 响应时间
ab -n 1000 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-domain.com/api/v1/customers

# 预期结果:
# Requests per second: > 100
# Time per request: < 100ms
```

---

## 🔄 五、持续集成/持续部署 (CI/CD)

### 5.1 GitHub Actions 配置

**.github/workflows/deploy.yml**:
```yaml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Build
        run: npm run build
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/customer-label
            git fetch origin
            git checkout ${{ github.ref_name }}
            npm ci --production
            npm run build
            npm run typeorm migration:run
            pm2 restart customer-label
            pm2 save
      
      - name: Notify success
        run: echo "Deployment completed successfully!"
```

---

## 📊 六、监控与告警

### 6.1 应用监控

```bash
# 安装 PM2 Plus (可选)
pm2 plus

# 登录并关联应用
pm2 link your_secret_key your_public_key
```

### 6.2 日志聚合

```bash
# 安装 Filebeat
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-7.17.0-amd64.deb
sudo dpkg -i filebeat-7.17.0-amd64.deb

# 配置 Filebeat
sudo vim /etc/filebeat/filebeat.yml

filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/www/customer-label/logs/*.log

output.elasticsearch:
  hosts: ["localhost:9200"]

# 启动 Filebeat
sudo systemctl start filebeat
sudo systemctl enable filebeat
```

---

## 🔙 七、回滚方案

### 7.1 快速回滚脚本

```bash
#!/bin/bash
# rollback.sh

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./rollback.sh <version>"
  exit 1
fi

echo "Rolling back to $VERSION..."

# 1. 备份当前版本
pm2 describe customer-label > backup/status-$(date +%Y%m%d_%H%M%S).json

# 2. 切换 Git 版本
cd /var/www/customer-label
git checkout $VERSION

# 3. 重新安装依赖
npm ci --production

# 4. 重新编译
npm run build

# 5. 回滚数据库迁移（如果有）
npm run typeorm migration:revert

# 6. 重启服务
pm2 restart customer-label
pm2 save

echo "Rollback completed!"
pm2 status
```

### 7.2 回滚检查清单

- [ ] 确认回滚版本号
- [ ] 备份当前状态
- [ ] 通知相关人员
- [ ] 执行回滚脚本
- [ ] 验证服务正常
- [ ] 更新监控告警
- [ ] 记录回滚原因

---

## 📝 八、常见问题排查

### 8.1 服务无法启动

```bash
# 查看 PM2 日志
pm2 logs customer-label --lines 100

# 检查端口占用
netstat -tlnp | grep :3000

# 检查环境变量
cat .env

# 检查数据库连接
psql -U customer_user -d customer_label -c "SELECT 1"
```

### 8.2 内存溢出

```bash
# 查看内存使用
pm2 monit

# 调整 PM2 配置
vim ecosystem.config.js
# 修改 max_memory_restart: '500M'

# 重启服务
pm2 restart customer-label
```

### 8.3 数据库连接失败

```bash
# 检查 PostgreSQL 状态
systemctl status postgresql

# 检查连接数
psql -U customer_user -d customer_label -c "SELECT count(*) FROM pg_stat_activity"

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

---

## 🔗 九、参考资料

- [`MONITORING_SETUP.md`](../operations/MONITORING_SETUP.md) - 监控配置手册
- [`RUNBOOK_TEMPLATE.md`](../operations/RUNBOOK_TEMPLATE.md) - 运维操作手册
- [`INCIDENT_REPORT.md`](../operations/INCIDENT_REPORT.md) - 事件复盘报告
- [PM2 官方文档](https://pm2.keymetrics.io/)
- [Nginx 配置指南](https://nginx.org/en/docs/)

---

**维护记录**:

| 日期 | 维护人 | 变更描述 |
|------|--------|---------|
| 2026-03-30 | AI Assistant | 基于 Phase 2 实际项目填充真实部署流程 |

**审批签字**:

- 运维负责人：________________  日期：__________
- 技术负责人：________________  日期：__________