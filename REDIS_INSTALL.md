# Redis 安装与配置指南

## 📦 方式一：使用安装包安装（Windows）

### 步骤 1: 下载 Redis

由于 Redis 官方不支持 Windows，我们使用微软维护的 Windows 移植版：

**下载地址**: https://github.com/microsoftarchive/redis/releases

选择：`Redis-x64-3.0.504.msi`

### 步骤 2: 安装 Redis

1. **运行安装程序**
   - 双击下载的 `.msi` 安装包

2. **接受许可协议**
   - 点击 "I Accept"

3. **选择安装目录**
   ```
   推荐：C:\Redis
   ```

4. **完成安装**
   - 点击 "Next" → "Install" → "Finish"

### 步骤 3: 验证安装

打开命令行窗口：

```bash
# 切换到 Redis 目录
cd C:\Redis

# 启动 Redis 服务器
redis-server.exe redis.windows.conf

# 应该看到 Redis 启动日志
```

打开新的命令行窗口测试：

```bash
# 连接到 Redis
redis-cli

# 测试连接
ping

# 应该返回：PONG

# 设置一个键值对
set test_key "Hello Redis"

# 获取值
get test_key

# 应该返回："Hello Redis"

# 退出
exit
```

---

## 🐳 方式二：使用 Docker 安装（如果您有 Docker Desktop）

```bash
# 拉取 Redis 镜像
docker pull redis:7-alpine

# 启动 Redis 容器
docker run -d -p 6379:6379 --name customer-label-redis redis:7-alpine

# 验证容器运行状态
docker ps

# 测试连接
docker exec -it customer-label-redis redis-cli ping

# 应该返回：PONG
```

---

## 🔧 方式三：使用 WSL2 安装（适用于 Windows 11）

```bash
# 在 WSL2 中安装 Redis
sudo apt update
sudo apt install redis-server -y

# 启动 Redis 服务
sudo service redis-server start

# 检查状态
sudo service redis-server status

# 测试连接
redis-cli ping

# 应该返回：PONG
```

---

## ⚙️ 配置 Redis

### 配置文件位置

Windows 安装后，配置文件位于：
```
C:\Redis\redis.windows.conf
```

### 重要配置项

```conf
# 绑定地址
bind 127.0.0.1

# 端口
port 6379

# 密码（可选，建议生产环境设置）
# requirepass your_password_here

# 最大内存限制（可选）
# maxmemory 256mb

# 内存淘汰策略（可选）
# maxmemory-policy allkeys-lru
```

### 修改配置后重启 Redis

```bash
# Windows
redis-server.exe redis.windows.conf --service-restart

# 或者停止并重新启动
net stop Redis
net start Redis
```

---

## 🚀 项目集成

### 步骤 1: 确认 Redis 运行

```bash
redis-cli ping
# 应该返回：PONG
```

### 步骤 2: 配置项目环境变量

确保 `.env` 文件中包含：

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

如果有密码，设置：
```env
REDIS_PASSWORD=your_password
```

### 步骤 3: 安装项目依赖

```bash
cd d:\VsCode\customer-label
npm install
```

### 步骤 4: 测试 Redis 连接

创建测试文件 `test-redis.ts`:

```typescript
import Redis from 'ioredis';

async function testRedis() {
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
  });

  try {
    await redis.set('test', 'Hello from NestJS!');
    const value = await redis.get('test');
    console.log('Redis test result:', value);
    
    await redis.del('test');
    await redis.quit();
    console.log('Redis test completed successfully!');
  } catch (error) {
    console.error('Redis test failed:', error);
  }
}

testRedis();
```

运行测试：
```bash
npx ts-node test-redis.ts
```

---

## 🔍 常见问题排查

### 问题 1: Redis 无法启动

**错误**: `Could not create server TCP listening socket *:6379: bind: Address already in use`

**原因**: 端口 6379 被占用

**解决方案**:
```bash
# 查找占用端口的进程
netstat -ano | findstr :6379

# 杀死进程（替换 PID）
taskkill /PID <PID> /F

# 或者修改 Redis 端口
# 编辑 redis.windows.conf，修改 port 为其他值，如 6380
```

### 问题 2: 无法连接 Redis

**错误**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**原因**: Redis 服务未运行

**解决方案**:
```bash
# Windows 检查服务状态
sc query Redis

# 启动服务
net start Redis

# 或者手动启动
cd C:\Redis
redis-server.exe redis.windows.conf
```

### 问题 3: 密码认证失败

**错误**: `ERR AUTH <password> called without any password configured for the default user`

**解决方案**:
1. 如果要使用密码，编辑 `redis.windows.conf`：
   ```conf
   requirepass your_password
   ```
2. 重启 Redis 服务
3. 更新项目 `.env` 文件：
   ```env
   REDIS_PASSWORD=your_password
   ```

---

## 📊 Redis 监控命令

```bash
# 查看 Redis 信息
redis-cli info

# 查看内存使用
redis-cli info memory

# 查看连接数
redis-cli info clients

# 查看统计信息
redis-cli info stats

# 实时监控命令
redis-cli --stat

# 查看所有键（开发环境使用）
redis-cli keys '*'

# 查看键的数量
redis-cli dbsize

# 清空数据库（谨慎使用！）
redis-cli FLUSHDB
```

---

## 🎯 下一步

Redis 安装完成后，继续执行项目的 Task 1.2：

1. ✅ 安装 Redis
2. ✅ 启动 Redis 服务
3. ✅ 配置 `.env` 文件
4. ✅ 创建 Redis 模块和服务
5. ⏳ 测试 Redis 连接
6. ⏳ 配置消息队列（Bull）

---

## 📞 需要帮助？

如果您在安装过程中遇到问题，请告诉我：
- 具体的错误信息
- 您已经尝试过的步骤
- 您的 Windows 版本

我会为您提供针对性的解决方案！

---

**文档版本**: 1.0  
**创建日期**: 2026-03-26  
**参考**: [Redis 官方文档](https://redis.io/documentation)
