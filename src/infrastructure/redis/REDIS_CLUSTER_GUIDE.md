# Redis 集群配置指南

## 概述

系统支持 Redis 单机模式和 Redis Cluster 集群模式，可通过环境变量灵活切换。

## 配置方式

### 1. 单机模式（默认）

适用于开发和测试环境：

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password  # 可选
```

### 2. 集群模式

适用于生产环境，提供高可用性和水平扩展能力：

```bash
# .env
REDIS_CLUSTER_MODE=true
REDIS_CLUSTER_NODES=redis-node-1:7000,redis-node-2:7001,redis-node-3:7002,redis-node-4:7003,redis-node-5:7004,redis-node-6:7005
REDIS_CLUSTER_PASSWORD=your_cluster_password  # 可选
```

## 环境变量说明

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| REDIS_CLUSTER_MODE | 是否启用集群模式 | false | true/false |
| REDIS_CLUSTER_NODES | 集群节点列表（逗号分隔） | localhost:7000,localhost:7001,localhost:7002 | redis-1:7000,redis-2:7001 |
| REDIS_CLUSTER_PASSWORD | 集群密码 | 无 | mypassword |
| REDIS_CLUSTER_MAX_RETRIES | 每个请求最大重试次数 | 3 | 5 |
| REDIS_CLUSTER_READY_CHECK | 启用就绪检查 | true | true/false |
| REDIS_CLUSTER_SCALE_READS | 读操作负载均衡策略 | master | master/slave/all |
| REDIS_HOST | 单机模式主机 | localhost | redis-server |
| REDIS_PORT | 单机模式端口 | 6379 | 6379 |
| REDIS_PASSWORD | 单机模式密码 | 无 | mypassword |

## Docker 部署 Redis 集群

### 使用 Docker Compose

创建 `docker-compose.redis-cluster.yml`：

```yaml
version: '3.8'

services:
  redis-node-1:
    image: redis:7-alpine
    command: redis-server --port 7000 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7000:7000"
    volumes:
      - redis-data-1:/data
  
  redis-node-2:
    image: redis:7-alpine
    command: redis-server --port 7001 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7001:7001"
    volumes:
      - redis-data-2:/data
  
  redis-node-3:
    image: redis:7-alpine
    command: redis-server --port 7002 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7002:7002"
    volumes:
      - redis-data-3:/data
  
  redis-node-4:
    image: redis:7-alpine
    command: redis-server --port 7003 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7003:7003"
    volumes:
      - redis-data-4:/data
  
  redis-node-5:
    image: redis:7-alpine
    command: redis-server --port 7004 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7004:7004"
    volumes:
      - redis-data-5:/data
  
  redis-node-6:
    image: redis:7-alpine
    command: redis-server --port 7005 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7005:7005"
    volumes:
      - redis-data-6:/data
  
  redis-cluster-creator:
    image: redis:7-alpine
    depends_on:
      - redis-node-1
      - redis-node-2
      - redis-node-3
      - redis-node-4
      - redis-node-5
      - redis-node-6
    command: >
      sh -c "
        sleep 5 &&
        redis-cli --cluster create 
        redis-node-1:7000 redis-node-2:7001 redis-node-3:7002 
        redis-node-4:7003 redis-node-5:7004 redis-node-6:7005 
        --cluster-replicas 1 --cluster-yes
      "

volumes:
  redis-data-1:
  redis-data-2:
  redis-data-3:
  redis-data-4:
  redis-data-5:
  redis-data-6:
```

启动集群：

```bash
docker-compose -f docker-compose.redis-cluster.yml up -d
```

### 手动创建集群

如果已有 Redis 实例，可以手动创建集群：

```bash
# 进入任一 Redis 容器
docker exec -it redis-node-1 bash

# 创建集群（3 主 3 从）
redis-cli --cluster create \
  10.0.0.1:7000 10.0.0.2:7001 10.0.0.3:7002 \
  10.0.0.4:7003 10.0.0.5:7004 10.0.0.6:7005 \
  --cluster-replicas 1

# 按提示输入 yes 确认
```

## 集群架构说明

### 节点角色

- **Master 节点**：处理写操作和部分读操作，负责数据分片存储
- **Slave 节点**：作为 Master 的备份，提供读操作负载均衡和故障转移

### 数据分片

Redis Cluster 使用哈希槽（Hash Slot）进行数据分片：
- 总共 16384 个槽位
- 每个 Key 通过 CRC16 算法计算槽位：`slot = CRC16(key) % 16384`
- 槽位均匀分配给各个 Master 节点

### 推荐配置

#### 小型应用（QPS < 10k）
- 3 个 Master + 3 个 Slave
- 每个 Master 负责约 5461 个槽位

#### 中型应用（QPS 10k-50k）
- 6 个 Master + 6 个 Slave
- 每个 Master 负责约 2730 个槽位

#### 大型应用（QPS > 50k）
- 9 个 Master + 9 个 Slave 或更多
- 根据实际负载调整

## 监控和维护

### 查看集群状态

```bash
redis-cli -h <host> -p <port> cluster info
```

### 查看节点信息

```bash
redis-cli -h <host> -p <port> cluster nodes
```

### 检查键分布

```bash
# 查看某个键所在的槽位
redis-cli -h <host> -p <port> cluster keyslot mykey

# 查看槽位分布情况
redis-cli -h <host> -p <port> cluster slots
```

## 注意事项

### ⚠️ 多键操作限制

在集群模式下，以下操作有限制：

1. **MGET/MSET**: 所有键必须在同一个槽位
   ```javascript
   // 错误：键可能在不同槽位
   await redis.mget(['user:1', 'product:2'])
   
   // 正确：使用 hash tag 确保在同一槽位
   await redis.mget(['{user}:1', '{user}:2'])
   ```

2. **KEYS 命令**: 集群模式不支持 KEYS 命令
   - 使用 SCAN 命令替代
   - 或在设计时避免使用通配符查询

3. **事务**: 所有键必须在同一槽位

### ✅ 最佳实践

1. **使用 Hash Tag**: 确保相关键在同一槽位
   ```javascript
   // 用户相关数据放在同一槽位
   const userKey = `{user:${userId}}:profile`;
   const orderKey = `{user:${userId}}:orders`;
   ```

2. **连接池配置**:
   ```bash
   REDIS_CLUSTER_MAX_RETRIES=5
   REDIS_CLUSTER_SCALE_READS=slave  # 读操作负载均衡到从节点
   ```

3. **监控告警**: 定期检查集群健康状态

## 故障转移

Redis Cluster 支持自动故障转移：

1. Master 节点故障时，对应的 Slave 会自动接管
2. 如果 Master 和 Slave 都故障，该 Master 负责的槽位将不可用
3. 修复故障节点后，需要手动或自动重新加入集群

## 扩缩容

### 添加节点

```bash
# 添加新的 Master 节点
redis-cli --cluster add-node <new-ip>:<new-port> <existing-ip>:<existing-port>

# 重新分配槽位
redis-cli --cluster reshard <any-node-ip>:<any-node-port>
```

### 删除节点

```bash
# 先迁移槽位，然后删除节点
redis-cli --cluster del-node <node-ip>:<node-port> <node-id>
```

## 性能优化

1. **管道化（Pipeline）**: 批量操作使用 pipeline
2. **读写分离**: 启用 `REDIS_CLUSTER_SCALE_READS=slave`
3. **合理设置超时**: 避免过长的等待时间
4. **监控慢查询**: 定期检查 `slowlog get`
