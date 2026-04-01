# 性能基准测试指南

## 📋 概述

本项目包含完整的性能测试体系，用于：
- ✅ 建立性能基线
- ✅ 检测性能回归
- ✅ 验证优化效果
- ✅ 发现系统瓶颈
- ✅ 评估容量规划

---

## 🎯 测试类型

### 1. **基准测试 (Benchmark Test)**
**目的**: 测量关键操作的性能指标，建立性能基线

**测试场景**:
- 健康检查响应时间
- 客户 CRUD 操作（CREATE/READ/UPDATE/DELETE）
- 列表查询（不同分页大小）
- 复杂条件筛选
- 批量操作（批量创建、批量删除）
- RFM 分析性能
- 推荐生成性能
- 并发请求处理

**运行命令**:
```bash
# 运行所有基准测试
npm run test:benchmark

# 详细输出模式
npm run test:benchmark:verbose
```

**输出指标**:
- ⏱️ 平均响应时间 (Average Response Time)
- 📊 最小/最大响应时间 (Min/Max)
- 📈 百分位数 (P50/P75/P90/P95/P99)
- ✅ 成功率 (Success Rate)
- 🚀 每秒请求数 (Requests Per Second)

---

### 2. **负载测试 (Load Test)**
**目的**: 模拟多用户并发场景，测试系统在预期负载下的表现

**配置参数**:
```bash
# 环境变量配置
export CONCURRENT_USERS=50        # 并发用户数
export RAMP_UP_TIME=10000         # 用户启动时间 (ms)
export TEST_DURATION=60000        # 测试持续时间 (ms)
export BASE_URL=http://localhost:3000
```

**运行命令**:
```bash
# 使用默认配置运行
npm run load:test

# 自定义配置运行
CONCURRENT_USERS=100 TEST_DURATION=120000 npm run load:test
```

**测试报告包含**:
- 总请求数
- 成功/失败请求数
- 成功率
- 响应时间统计（平均、P95、P99）
- 吞吐量（requests/second）
- 错误分布

---

### 3. **压力测试 (Stress Test)**
**目的**: 逐步增加负载直到系统崩溃，找出系统极限和瓶颈

**配置参数**:
```bash
export START_USERS=10             # 起始用户数
export MAX_USERS=500              # 最大用户数
export STEP_INCREASE=20           # 每轮增加用户数
export STEP_DURATION=30000        # 每轮持续时间 (ms)
export FAILURE_THRESHOLD=0.05     # 失败率阈值 (5%)
```

**运行命令**:
```bash
# 使用默认配置运行
npm run stress:test

# 自定义配置运行
START_USERS=20 MAX_USERS=1000 STEP_INCREASE=50 npm run stress:test
```

**测试报告包含**:
- 不同并发用户数下的性能指标
- 瓶颈点分析（Breaking Point）
- 推荐最大并发数
- 性能优化建议

---

## 📊 性能指标说明

### 响应时间 (Response Time)
- **Average**: 平均响应时间
- **Min**: 最快响应时间
- **Max**: 最慢响应时间
- **P50 (Median)**: 50% 的请求响应时间小于此值
- **P75**: 75% 的请求响应时间小于此值
- **P90**: 90% 的请求响应时间小于此值
- **P95**: 95% 的请求响应时间小于此值
- **P99**: 99% 的请求响应时间小于此值

### 吞吐量 (Throughput)
- **Requests Per Second (RPS)**: 每秒处理的请求数
- **计算公式**: `总请求数 / 测试时间 (秒)`

### 成功率 (Success Rate)
- **计算公式**: `(成功请求数 / 总请求数) × 100%`
- **通过标准**: ≥ 99%

---

## 🎯 性能标准

### 响应时间标准

| 操作类型 | 优秀 (<100ms) | 良好 (<300ms) | 可接受 (<1s) | 需优化 (>1s) |
|---------|--------------|--------------|-------------|-------------|
| **健康检查** | ✅ | ✅ | ⚠️ | ❌ |
| **简单查询** | ✅ | ✅ | ⚠️ | ❌ |
| **复杂查询** | - | ✅ | ✅ | ⚠️ |
| **创建操作** | - | ✅ | ✅ | ⚠️ |
| **更新操作** | - | ✅ | ✅ | ⚠️ |
| **删除操作** | ✅ | ✅ | ⚠️ | ❌ |
| **批量操作** | - | - | ✅ | ⚠️ |
| **RFM 分析** | - | - | ✅ | ⚠️ |
| **推荐生成** | - | - | ✅ (2s) | ⚠️ |

### 并发能力标准

| 系统级别 | 并发用户数 | 吞吐量要求 |
|---------|-----------|-----------|
| **小型系统** | 10-50 | 100+ req/s |
| **中型系统** | 50-200 | 500+ req/s |
| **大型系统** | 200-1000 | 2000+ req/s |
| **超大型系统** | 1000+ | 10000+ req/s |

---

## 🔧 使用示例

### 示例 1: 运行完整性能测试套件

```bash
# 1. 准备测试环境
createdb customer_label_test
redis-server

# 2. 启动应用（生产模式）
NODE_ENV=production node dist/main.js &

# 3. 等待应用启动
sleep 5

# 4. 运行基准测试
npm run test:benchmark

# 5. 运行负载测试
CONCURRENT_USERS=100 npm run load:test

# 6. 运行压力测试
MAX_USERS=300 npm run stress:test
```

### 示例 2: 针对特定 API 进行性能测试

```bash
# 只测试客户查询性能
BASE_URL=http://localhost:3000 \
ENDPOINT='/customers?page=1&limit=20' \
CONCURRENT_USERS=50 \
npm run load:test
```

### 示例 3: 持续集成中的性能测试

```yaml
# .github/workflows/performance-test.yml
name: Performance Test

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: customer_label_test
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Start application
        run: |
          NODE_ENV=test node dist/main.js &
          sleep 10
      
      - name: Run benchmark tests
        run: npm run test:benchmark
      
      - name: Run load tests
        run: |
          CONCURRENT_USERS=50 \
          TEST_DURATION=30000 \
          npm run load:test
      
      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: test/results/
```

---

## 📈 结果分析

### 查看测试报告

测试完成后，报告将保存在以下位置：

```bash
test/results/
├── benchmark-results.xml      # JUnit XML 格式报告
├── load-test-report.json      # 负载测试详细报告
└── stress-test-report.json    # 压力测试详细报告
```

### 解读负载测试报告

```json
{
  "summary": {
    "totalRequests": 15234,
    "successfulRequests": 15180,
    "failedRequests": 54,
    "successRate": "99.65%",
    "testDuration": "60000ms",
    "requestsPerSecond": "253.90"
  },
  "responseTime": {
    "average": "45.23ms",
    "min": "12ms",
    "max": "892ms",
    "p50": "38ms",
    "p75": "52ms",
    "p90": "78ms",
    "p95": "95ms",
    "p99": "156ms"
  }
}
```

**分析要点**:
1. **成功率**: 99.65% ✅ (≥99% 为优秀)
2. **吞吐量**: 254 req/s (根据业务需求评估)
3. **P95 响应时间**: 95ms ✅ (<100ms 为优秀)
4. **P99 响应时间**: 156ms ✅ (<300ms 为良好)

---

## 🐛 常见问题

### 问题 1: 测试连接失败

**错误信息**: `Error: connect ECONNREFUSED 127.0.0.1:3000`

**解决方案**:
```bash
# 确认应用已启动
ps aux | grep main.js

# 检查端口监听
netstat -an | grep 3000

# 或查看应用日志
tail -f logs/app.log
```

### 问题 2: 数据库连接超时

**错误信息**: `Error: Connection timeout to database`

**解决方案**:
```bash
# 检查 PostgreSQL 服务
pg_isready

# 检查 Redis 服务
redis-cli ping

# 确认测试数据库存在
psql -U postgres -c "\l" | grep customer_label_test
```

### 问题 3: 测试超时

**现象**: 测试运行超过预期时间

**解决方案**:
```bash
# 增加超时时间（在 jest-benchmark.json 中）
{
  "testTimeout": 120000  // 增加到 2 分钟
}

# 或减少测试迭代次数
# 修改 performance.benchmark.spec.ts 中的 iterations 参数
```

### 问题 4: 内存不足

**错误信息**: `JavaScript heap out of memory`

**解决方案**:
```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 或减少并发用户数
CONCURRENT_USERS=20 npm run load:test
```

---

## 🎓 最佳实践

### 1. 测试环境隔离
- ✅ 使用独立的测试数据库
- ✅ 使用独立的 Redis 实例
- ✅ 避免在生产环境运行压力测试

### 2. 基准测试频率
- 📅 每次代码提交前运行基准测试
- 📅 每周运行一次完整负载测试
- 📅 每月运行一次压力测试

### 3. 性能回归检测
```bash
# 保存历史基准数据
npm run test:benchmark > results/baseline-$(date +%Y%m%d).txt

# 对比历史数据
node test/compare-baselines.js baseline-old.txt baseline-new.txt
```

### 4. 性能优化循环
1. **测量**: 运行基准测试获取当前性能数据
2. **分析**: 识别性能瓶颈（慢查询、高延迟操作）
3. **优化**: 实施性能改进（索引、缓存、批量操作）
4. **验证**: 重新运行测试确认优化效果
5. **监控**: 在生产环境持续监控性能指标

---

## 📚 参考资源

### 内部文档
- [E2E_TEST_SUMMARY.md](./E2E_TEST_SUMMARY.md) - E2E 测试完整指南
- [TESTING_GUIDE.md](../TESTING_GUIDE.md) - 测试总体指南

### 外部资源
- [NestJS Performance Best Practices](https://docs.nestjs.com/techniques/performance)
- [k6 Load Testing Documentation](https://k6.io/docs/)
- [Apache JMeter User Manual](https://jmeter.apache.org/usermanual/index.html)

---

## 📞 支持与反馈

如有问题或建议，请：
1. 提交 Issue 到项目仓库
2. 联系开发团队
3. 查阅性能测试日志：`logs/performance-test.log`

---

**最后更新**: 2026-03-31  
**维护者**: 开发团队  
**版本**: v1.0.0
