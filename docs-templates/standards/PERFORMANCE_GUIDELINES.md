# 性能优化规范 (Performance Guidelines)

**版本**: v1.0  
**生效日期**: 2026-03-30  
**适用范围**: customer-label 项目全体开发人员

---

## 📊 一、性能指标基线

### 1.1 API 响应时间要求

| 类型 | 目标值 | 警告阈值 | 严重阈值 |
|------|--------|---------|---------|
| **简单查询** | < 200ms | > 500ms | > 1s |
| **复杂计算** | < 1s | > 2s | > 5s |
| **批量操作** | < 3s | > 5s | > 10s |
| **推荐引擎** | < 2s | > 5s | > 10s |

### 1.2 数据库查询性能

| 指标 | 目标值 | 测量方法 |
|------|--------|---------|
| **简单查询** | < 50ms | EXPLAIN ANALYZE |
| **关联查询** | < 200ms | 使用 JOIN 而非 N+1 |
| **批量插入** | < 1s/1000 条 | 使用事务批量 |
| **索引命中率** | > 90% | pg_stat_user_indexes |

### 1.3 缓存性能

| 指标 | 目标值 | 说明 |
|------|--------|------|
| **缓存命中率** | > 80% | hot data 应命中缓存 |
| **缓存读取延迟** | < 5ms | Redis GET |
| **缓存写入延迟** | < 10ms | Redis SET |
| **缓存穿透率** | < 1% | 布隆过滤器过滤 |

---

## ⚡ 二、数据库优化

### 2.1 索引优化策略

```sql
-- ✅ 为高频查询字段创建索引
CREATE INDEX idx_customers_level ON customers(level);
CREATE INDEX idx_customers_city ON customers(city);
CREATE INDEX idx_recommendations_customer_id 
  ON tag_recommendations(customer_id);

-- ✅ 复合索引（考虑最左前缀原则）
CREATE INDEX idx_customers_level_assets 
  ON customers(level, total_assets DESC);
-- 可用于：WHERE level = 'GOLD' ORDER BY total_assets DESC

-- ✅ 覆盖索引（避免回表）
CREATE INDEX idx_customers_email_name 
  ON customers(email, name);
-- SELECT email, name FROM customers WHERE email = '...'

-- ✅ 部分索引（减小索引体积）
CREATE INDEX idx_customers_vip 
  ON customers(id, name) 
  WHERE level IN ('GOLD', 'PLATINUM', 'DIAMOND');

-- ❌ 避免过度索引
-- 索引会降低写入性能，每个表索引数建议 <= 5
```

### 2.2 查询优化

```typescript
// ✅ 使用 SELECT 指定字段
async getCustomerNames(): Promise<string[]> {
  const customers = await this.repository.find({
    select: ['name'],  // 只查询需要的字段
  });
  return customers.map(c => c.name);
}

// ✅ 使用 JOIN 避免 N+1 查询
async getCustomersWithTags(): Promise<Customer[]> {
  return this.repository
    .createQueryBuilder('customer')
    .leftJoinAndSelect('customer.tags', 'tag')
    .getMany();
}

// ❌ N+1 查询（性能灾难）
const customers = await this.repository.find();
for (const customer of customers) {
  customer.tags = await this.tagRepository.findByCustomerId(customer.id);
}

// ✅ 使用子查询优化
async getCustomerStats(): Promise<any> {
  return this.repository
    .createQueryBuilder('customer')
    .select('customer.level')
    .addSelect('COUNT(*)', 'count')
    .addSelect('AVG(customer.totalAssets)', 'avgAssets')
    .groupBy('customer.level')
    .getRawMany();
}
```

### 2.3 批量操作优化

```typescript
// ✅ 使用事务批量插入
async batchInsert(customers: Customer[]): Promise<void> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  
  try {
    for (const customer of customers) {
      await queryRunner.manager.save(customer);
    }
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// ✅ 使用 VALUES 批量插入（更快）
async batchInsertFast(customers: Customer[]): Promise<void> {
  await this.repository
    .createQueryBuilder()
    .insert()
    .values(customers)
    .execute();
}
```

---

## 🔥 三、缓存优化

### 3.1 缓存策略选择

```typescript
// ✅ 热点数据：Cacheable 装饰器
@Cacheable({ ttl: 3600, prefix: 'customer:' })
async findOne(id: number): Promise<Customer> {
  return this.repository.findOne({ where: { id } });
}

// ✅ 未命中自动回填：getOrSet 模式
async getStatistics(): Promise<Stats> {
  return this.cacheService.getOrSet(
    'stats:daily',
    async () => this.calculateStatistics(),
    { ttl: 86400 }
  );
}

// ✅ 批量数据：mset 模式
async cacheTopCustomers(customers: Customer[]): Promise<void> {
  await this.cacheService.mset(
    customers.map(c => ({
      key: `customer:${c.id}`,
      value: c,
      ttl: 3600,
    }))
  );
}
```

### 3.2 缓存穿透防护

```typescript
// ✅ 布隆过滤器
async exists(customerId: number): Promise<boolean> {
  // 1. 布隆过滤器初筛
  const inBloom = await this.bloomFilter.has(customerId.toString());
  if (!inBloom) return false;  // 一定不存在
  
  // 2. 检查缓存
  const inCache = await this.cacheService.exists(`customer:${customerId}`);
  if (inCache) return true;
  
  // 3. 查询数据库并回填
  const customer = await this.repository.findOne({ where: { id: customerId } });
  if (customer) {
    await this.cacheService.set(`customer:${customerId}`, customer);
    return true;
  }
  
  return false;
}
```

### 3.3 缓存雪崩防护

```typescript
// ✅ 过期时间随机化
async setWithJitter(key: string, value: any, baseTtl: number): Promise<void> {
  // 在基础 TTL 上 ±20% 随机波动
  const jitter = baseTtl * 0.2 * (Math.random() - 0.5);
  const ttl = Math.round(baseTtl + jitter);
  await this.cacheService.set(key, value, { ttl });
}

// ✅ 热点数据永不过期（手动更新）
async preloadHotData(): Promise<void> {
  const topCustomers = await this.getTopCustomers(100);
  await this.cacheService.mset(
    topCustomers.map(c => ({
      key: `customer:${c.id}`,
      value: c,
      ttl: -1,  // 永不过期
    }))
  );
  
  // 定期更新（Cron Job）
  setInterval(async () => {
    const updated = await this.getTopCustomers(100);
    await this.cacheService.mset(/* ... */);
  }, 3600000);  // 每小时更新
}
```

---

## 🚀 四、推荐引擎性能优化

### 4.1 K-Means 聚类优化

```typescript
// ✅ K-Means++ 初始化（加速收敛）
private initializeCentroidsPlusPlus(data: number[][], k: number): number[][] {
  const centroids = [data[Math.floor(Math.random() * data.length)]];
  
  while (centroids.length < k) {
    // 计算每个点到最近质心的距离
    const distances = data.map(point => {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = this.distance(point, centroid);
        minDist = Math.min(minDist, dist);
      }
      return minDist;
    });
    
    // 按距离加权随机选择下一个质心
    const sumDist = distances.reduce((a, b) => a + b, 0);
    const random = Math.random() * sumDist;
    let cumulative = 0;
    
    for (let i = 0; i < data.length; i++) {
      cumulative += distances[i];
      if (cumulative >= random) {
        centroids.push(data[i]);
        break;
      }
    }
  }
  
  return centroids;
}

// ✅ 提前终止条件
async kMeans(data: number[][], k: number): Promise<Cluster[]> {
  let centroids = this.initializeCentroidsPlusPlus(data, k);
  let iterations = 0;
  const maxIterations = 100;
  const convergenceThreshold = 0.001;
  
  while (iterations < maxIterations) {
    const assignments = this.assignToClusters(data, centroids);
    const newCentroids = this.calculateCentroids(data, assignments);
    
    // 检查是否收敛
    const shift = this.calculateShift(centroids, newCentroids);
    if (shift < convergenceThreshold) {
      break;  // 已收敛，提前退出
    }
    
    centroids = newCentroids;
    iterations++;
  }
  
  return this.buildClusters(data, assignments, centroids);
}
```

### 4.2 并行计算

```typescript
// ✅ 多引擎并行执行
async generateAllEngines(customerId: number): Promise<Recommendation[]> {
  const customerData = await this.getCustomerData(customerId);
  
  // 三个引擎并行执行
  const [ruleResults, clusteringResults, associationResults] = 
    await Promise.all([
      this.ruleEngine.generate(customerData),
      this.clusteringEngine.generate(customerData),
      this.associationEngine.generate(customerData),
    ]);
  
  return [...ruleResults, ...clusteringResults, ...associationResults];
}

// ✅ 批量数据并行处理
async processBatchCustomers(customerIds: number[]): Promise<void> {
  const batchSize = 10;
  const batches = this.chunk(customerIds, batchSize);
  
  // 批次间并行，批次内串行
  await Promise.all(
    batches.map(batch => 
      Promise.all(
        batch.map(id => this.processSingleCustomer(id))
      )
    )
  );
}
```

---

## 🎯 五、前端性能优化

### 5.1 列表渲染优化

```tsx
// ✅ 虚拟滚动（大数据量列表）
import { VirtualList } from 'antd';

function CustomerList({ customers }: { customers: Customer[] }) {
  return (
    <VirtualList
      data={customers}
      height={600}
      itemHeight={50}
      renderItem={(customer) => (
        <CustomerCard key={customer.id} customer={customer} />
      )}
    />
  );
}

// ✅ 分页加载
function PaginatedList() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  
  useEffect(() => {
    customerService.getList({ page }).then(setData);
  }, [page]);
  
  return (
    <>
      <List data={data} />
      <Pagination current={page} onChange={setPage} />
    </>
  );
}
```

### 5.2 防抖与节流

```tsx
// ✅ 搜索框防抖
function SearchBox() {
  const [keyword, setKeyword] = useState('');
  
  const debouncedSearch = useMemo(
    () => debounce((kw: string) => {
      customerService.search(kw).then(setResults);
    }, 300),
    []
  );
  
  useEffect(() => {
    debouncedSearch(keyword);
  }, [keyword]);
  
  return (
    <Input
      placeholder="搜索客户"
      onChange={(e) => setKeyword(e.target.value)}
    />
  );
}

// ✅ 按钮点击节流
function ThrottledButton() {
  const handleClick = useCallback(
    throttle(() => {
      api.expensiveOperation();
    }, 1000),
    []
  );
  
  return <Button onClick={handleClick}>提交</Button>;
}
```

### 5.3 懒加载与代码分割

```tsx
// ✅ 路由懒加载
const CustomerList = lazy(() => import('@/pages/Customer/CustomerList'));
const RecommendationList = lazy(() => import('@/pages/Recommendation/RecommendationList'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/recommendations" element={<RecommendationList />} />
      </Routes>
    </Suspense>
  );
}

// ✅ 组件懒加载
const HeavyChart = lazy(() => import('@/components/HeavyChart'));

function Dashboard() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <HeavyChart data={data} />
    </Suspense>
  );
}
```

---

## 📈 六、性能监控与基准测试

### 6.1 性能基准测试脚本

```typescript
// benchmark/recommendation.bench.ts
import { Benchmark } from 'benchmark';

const suite = new Benchmark.Suite();

suite
  .add('RuleEngine#generate', async () => {
    await ruleEngine.generate(mockData);
  })
  .add('ClusteringEngine#generate', async () => {
    await clusteringEngine.generate(mockData);
  })
  .add('FusionEngine#fuse', async () => {
    await fusionEngine.fuse(mockResults);
  })
  .on('cycle', (event) => {
    console.log(String(event.target));
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ async: true });
```

### 6.2 性能监控仪表板

```yaml
# Grafana Dashboard 配置示例
panels:
  - title: "API Response Time (P95)"
    targets:
      - expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))
  
  - title: "Database Query Time"
    targets:
      - expr: rate(pg_stat_statements_total_time_seconds[1m])
  
  - title: "Cache Hit Rate"
    targets:
      - expr: cache_hits_total / (cache_hits_total + cache_misses_total)
  
  - title: "Recommendation Engine Execution Time"
    targets:
      - expr: recommendation_engine_duration_seconds_sum 
              / recommendation_engine_duration_seconds_count
```

---

## 🔄 七、持续优化流程

### 7.1 性能回归测试

```yaml
# .github/workflows/performance.yml
name: Performance Regression Test

on:
  pull_request:
    branches: [develop]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run benchmarks
        run: npm run benchmark
      
      - name: Compare with baseline
        run: |
          node scripts/compare-benchmark.js
          # 如果性能下降超过 10%，失败退出
```

### 7.2 性能优化检查清单

在合并代码前检查：

- [ ] 数据库查询已添加必要索引
- [ ] 避免 N+1 查询问题
- [ ] 热点数据已添加缓存
- [ ] 大数据量列表使用虚拟滚动或分页
- [ ] 耗时操作使用异步队列处理
- [ ] 循环中无同步 I/O 操作
- [ ] 大文件流式处理而非一次性加载
- [ ] 复杂计算有进度反馈或超时控制

---

## 📚 八、参考资源

### 8.1 性能工具

- [Artillery](https://artillery.io/) - 负载测试
- [k6](https://k6.io/) - 性能测试
- [Clinic.js](https://clinicjs.org/) - Node.js 性能分析
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html) - PostgreSQL 查询统计

### 8.2 性能优化书籍

- 《高性能 MySQL》
- 《PostgreSQL 性能优化指南》
- 《Web 性能权威指南》

---

**文档版本**: v1.0  
**编制日期**: 2026-03-30  
**审核人**: [待填写]  
**批准人**: [待填写]

**© 2026 客户标签推荐系统项目组 版权所有**
