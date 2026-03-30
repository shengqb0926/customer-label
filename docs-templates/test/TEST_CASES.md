# 测试用例集 (Test Cases)

**项目名称**: 客户标签推荐系统  
**版本**: v1.0  
**编制日期**: 2026-03-30  
**测试负责人**: [待填写]

---

## 📋 一、测试用例编号规则

```
格式：TC-{模块}-{功能}-{序号}

示例:
TC-CUST-001: 客户列表 - 分页查询
TC-REC-005: 推荐引擎 - 手动触发规则引擎
TC-CACHE-003: 缓存服务 - getOrSet 模式
```

---

## 🧪 二、单元测试用例

### TC-CUST-001: 客户列表分页查询

**模块**: CustomerService.findAll  
**优先级**: P0  
**前置条件**: 数据库中有测试数据

**测试步骤**:
```typescript
describe('CustomerService.findAll', () => {
  it('should return paginated customers with all fields', async () => {
    // Arrange
    const mockCustomers = createMockCustomers(15);
    const mockTotal = 150;
    
    mockRepository.find.mockResolvedValue(mockCustomers.slice(0, 10));
    (mockRepository.createQueryBuilder as any).mockReturnValue({
      where: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([mockCustomers, mockTotal]),
    });

    // Act
    const result = await service.findAll({ page: 1, limit: 10 });

    // Assert
    expect(result.data).toHaveLength(10);
    expect(result.total).toBe(mockTotal);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(15);
  });

  it('should handle empty result when no customers match filter', async () => {
    // Arrange
    mockRepository.find.mockResolvedValue([]);

    // Act
    const result = await service.findAll({ level: 'DIAMOND' });

    // Assert
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
```

**预期结果**: 
- ✅ 返回正确的分页数据
- ✅ 总数计算准确
- ✅ 空数据处理正常

---

### TC-CUST-002: RFM 分析计算

**模块**: CustomerService.calculateRFM  
**优先级**: P0  
**前置条件**: 客户有交易记录

**测试步骤**:
```typescript
describe('CustomerService.calculateRFM', () => {
  it('should calculate correct R/F/M scores for customer', async () => {
    // Arrange
    const mockCustomer = createMockCustomer({
      lastTransactionAt: new Date('2026-03-25'), // 5 天前
      transactionCount: 25,
      totalAssets: 8000000,
    });
    
    mockRepository.findOne.mockResolvedValue(mockCustomer);

    // Act
    const rfmResult = await service.calculateRFM(1);

    // Assert
    expect(rfmResult.rScore).toBeGreaterThanOrEqual(1);
    expect(rfmResult.fScore).toBeGreaterThanOrEqual(1);
    expect(rfmResult.mScore).toBeGreaterThanOrEqual(1);
    expect(rfmResult.rfmTotal).toBe(rfmResult.rScore + rfmResult.fScore + rfmResult.mScore);
    expect(rfmResult.segment).toBeDefined();
  });

  it('should handle customer with no transactions', async () => {
    // Arrange
    const mockCustomer = createMockCustomer({
      lastTransactionAt: null,
      transactionCount: 0,
      totalAssets: 0,
    });
    
    mockRepository.findOne.mockResolvedValue(mockCustomer);

    // Act
    const rfmResult = await service.calculateRFM(1);

    // Assert
    expect(rfmResult.rScore).toBe(1); // 最低分
    expect(rfmResult.fScore).toBe(1);
    expect(rfmResult.mScore).toBe(1);
  });
});
```

**预期结果**:
- ✅ R/F/M 分数计算正确（1-5 分）
- ✅ 客户分群准确
- ✅ 无交易记录客户处理正常

---

### TC-REC-001: 规则引擎执行

**模块**: RuleEngineService.generateRecommendations  
**优先级**: P0  
**前置条件**: 配置了激活的规则

**测试步骤**:
```typescript
describe('RuleEngineService.generateRecommendations', () => {
  it('should generate recommendations based on active rules', async () => {
    // Arrange
    const mockCustomerData = {
      id: 1,
      name: '张三',
      level: 'GOLD',
      totalAssets: 6000000,
      annualIncome: 1200000,
    };
    
    const mockRules = [
      {
        id: 1,
        ruleName: '高价值客户',
        conditions: {
          operator: 'AND',
          conditions: [
            { field: 'totalAssets', op: '>=', value: 5000000 },
          ],
        },
        recommendedTags: ['高价值客户', 'VIP 客户'],
        priority: 100,
      },
    ];
    
    mockRuleRepository.find.mockResolvedValue(mockRules);

    // Act
    const recommendations = await ruleEngine.generateRecommendations(mockCustomerData);

    // Assert
    expect(recommendations).toHaveLength(2);
    expect(recommendations[0].tagName).toBe('高价值客户');
    expect(recommendations[0].confidence).toBeGreaterThan(0.7);
    expect(recommendations[0].source).toBe('rule');
  });

  it('should not generate recommendations when no rules match', async () => {
    // Arrange
    const mockCustomerData = {
      id: 2,
      name: '李四',
      level: 'BRONZE',
      totalAssets: 100000,
    };
    
    mockRuleRepository.find.mockResolvedValue([]);

    // Act
    const recommendations = await ruleEngine.generateRecommendations(mockCustomerData);

    // Assert
    expect(recommendations).toHaveLength(0);
  });
});
```

**预期结果**:
- ✅ 匹配规则生成推荐
- ✅ 置信度合理（>0.7）
- ✅ 无匹配时返回空数组

---

### TC-REC-002: 融合引擎多来源加成

**模块**: FusionEngineService.fuseRecommendations  
**优先级**: P0  
**前置条件**: 多个引擎推荐同一标签

**测试步骤**:
```typescript
describe('FusionEngineService.fuseRecommendations', () => {
  it('should apply multi-source bonus when same tag from multiple engines', async () => {
    // Arrange
    const mockRecommendations = [
      {
        tagName: '高价值客户',
        confidence: 0.9,
        source: 'rule',
      },
      {
        tagName: '高价值客户',
        confidence: 0.85,
        source: 'clustering',
      },
    ];

    // Act
    const fused = await fusionEngine.fuseRecommendations(mockRecommendations);

    // Assert
    expect(fused).toHaveLength(1);
    expect(fused[0].tagName).toBe('高价值客户');
    expect(fused[0].confidence).toBeGreaterThan(0.9); // 应有加成
    expect(fused[0].source).toBe('rule+clustering');
  });

  it('should deduplicate recommendations from same engine', async () => {
    // Arrange
    const mockRecommendations = [
      { tagName: '高价值客户', confidence: 0.9, source: 'rule' },
      { tagName: '高价值客户', confidence: 0.8, source: 'rule' }, // 重复
    ];

    // Act
    const fused = await fusionEngine.fuseRecommendations(mockRecommendations);

    // Assert
    expect(fused).toHaveLength(1);
    expect(fused[0].confidence).toBe(0.9); // 取最高
  });
});
```

**预期结果**:
- ✅ 多来源标签置信度加成（+10%~20%）
- ✅ 同来源重复标签去重（取最高置信度）
- ✅ 复合来源标识正确

---

### TC-CACHE-001: getOrSet 模式

**模块**: CacheService.getOrSet  
**优先级**: P0  
**前置条件**: Redis 服务可用

**测试步骤**:
```typescript
describe('CacheService.getOrSet', () => {
  it('should return cached value if exists', async () => {
    // Arrange
    const mockCachedValue = { id: 1, name: '缓存客户' };
    mockRedisClient.get.mockResolvedValue(JSON.stringify(mockCachedValue));

    const getterMock = jest.fn();

    // Act
    const result = await cacheService.getOrSet('customer:1', getterMock);

    // Assert
    expect(result).toEqual(mockCachedValue);
    expect(getterMock).not.toHaveBeenCalled(); // 未调用 getter
  });

  it('should execute getter and cache result if not cached', async () => {
    // Arrange
    mockRedisClient.get.mockResolvedValue(null); // 缓存未命中
    
    const mockDbValue = { id: 1, name: '数据库客户' };
    const getterMock = jest.fn().mockResolvedValue(mockDbValue);

    // Act
    const result = await cacheService.getOrSet('customer:1', getterMock, { ttl: 3600 });

    // Assert
    expect(result).toEqual(mockDbValue);
    expect(getterMock).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'customer:1',
      JSON.stringify(mockDbValue),
      'EX',
      3600
    );
  });
});
```

**预期结果**:
- ✅ 缓存命中时直接返回
- ✅ 缓存未命中时执行 getter 并回填
- ✅ TTL 设置正确

---

## 🔗 三、集成测试用例

### TC-API-001: 推荐引擎 API 完整流程

**模块**: RecommendationController  
**优先级**: P0  
**前置条件**: 测试数据库已初始化

**测试步骤**:
```typescript
describe('POST /api/v1/recommendations/generate/:customerId', () => {
  it('should complete full recommendation workflow', async () => {
    // Step 1: 创建测试客户
    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .send({
        name: '测试客户',
        email: 'test@example.com',
        level: 'GOLD',
        totalAssets: 5000000,
      })
      .expect(201);
    
    const customerId = createResponse.body.data.id;

    // Step 2: 触发规则引擎
    const generateResponse = await request(app.getHttpServer())
      .post(`/api/v1/recommendations/generate/${customerId}`)
      .send({ mode: 'rule' })
      .expect(201);
    
    expect(generateResponse.body.success).toBe(true);
    expect(generateResponse.body.count).toBeGreaterThanOrEqual(0);

    // Step 3: 查询推荐列表
    const listResponse = await request(app.getHttpServer())
      .get(`/api/v1/recommendations?customerId=${customerId}`)
      .expect(200);
    
    expect(listResponse.body.data.length).toBe(generateResponse.body.count);

    // Step 4: 接受推荐
    if (listResponse.body.data.length > 0) {
      const recommendId = listResponse.body.data[0].id;
      const acceptResponse = await request(app.getHttpServer())
        .post(`/api/v1/recommendations/${recommendId}/accept`)
        .expect(200);
      
      expect(acceptResponse.body.data.status).toBe('accepted');
    }
  });
});
```

**预期结果**:
- ✅ 客户创建成功
- ✅ 推荐引擎执行成功
- ✅ 推荐列表可查询
- ✅ 接受操作正常

---

### TC-API-002: 缓存拦截器验证

**模块**: CacheInterceptor  
**优先级**: P0  
**前置条件**: Redis 服务运行

**测试步骤**:
```typescript
describe('GET /api/v1/customers/:id (with caching)', () => {
  it('should cache customer details on first request', async () => {
    const customerId = 1;

    // First request - cache miss
    const response1 = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}`)
      .expect(200);
    
    expect(mockRedisClient.get).toHaveBeenCalledWith(`customer:${customerId}`);
    expect(mockRedisClient.set).toHaveBeenCalled(); // 写入缓存

    // Reset mock calls
    jest.clearAllMocks();

    // Second request - cache hit
    const response2 = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customerId}`)
      .expect(200);
    
    expect(response2.body).toEqual(response1.body);
    expect(mockRedisClient.get).toHaveBeenCalled();
    expect(mockRedisClient.set).not.toHaveBeenCalled(); // 未写数据库
  });
});
```

**预期结果**:
- ✅ 首次请求查询数据库并写入缓存
- ✅ 第二次请求直接返回缓存
- ✅ 响应数据一致

---

## 🎭 四、E2E 测试用例

### TC-E2E-001: 客户管理完整工作流

**场景**: 销售经理日常操作流程  
**优先级**: P0  
**浏览器**: Chrome/Firefox/Safari

**测试步骤**:
```typescript
test('complete customer management workflow', async ({ page }) => {
  // 1. 登录系统
  await page.goto('/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');

  // 2. 查看客户列表
  await page.goto('/customers');
  await expect(page.locator('h1')).toContainText('客户管理');
  await expect(page.locator('table')).toBeVisible();

  // 3. 新增 VIP 客户
  await page.click('button:has-text("新增")');
  await page.fill('input[name="name"]', 'E2E VIP 客户');
  await page.fill('input[name="email"]', 'vip@test.com');
  await page.selectOption('select[name="level"]', 'GOLD');
  await page.fill('input[name="totalAssets"]', '8000000');
  await page.click('button:has-text("确定")');
  await expect(page.locator('.ant-message-success')).toBeVisible();

  // 4. 筛选 GOLD 等级客户
  await page.selectOption('select[name="level"]', 'GOLD');
  await page.click('button:has-text("查询")');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('tbody tr')).toHaveCount({ min: 1 });

  // 5. 触发推荐引擎
  const firstRow = page.locator('tbody tr').first();
  await firstRow.locator('button:has-text("规则")').click();
  await expect(page.locator('.ant-message-success'))
    .toContainText(/生成 \d+ 条推荐/);

  // 6. 查看推荐列表
  await page.goto('/recommendations');
  await expect(page.locator('tbody tr')).toHaveCount({ min: 1 });
  
  // 7. 接受推荐
  await page.click('button:has-text("接受")');
  await expect(page.locator('.ant-message-success'))
    .toContainText('接受成功');
});
```

**预期结果**:
- ✅ 登录成功并跳转 dashboard
- ✅ 客户列表正常显示
- ✅ 新增客户成功
- ✅ 筛选功能正常
- ✅ 推荐引擎执行并反馈
- ✅ 接受推荐成功

---

## 📊 五、性能测试用例

### TC-PERF-001: 推荐引擎并发执行

**目标**: 验证 100 并发下推荐引擎性能  
**优先级**: P1  
**工具**: Artillery/k6

**测试脚本**:
```yaml
# artillery.yml
config:
  target: http://localhost:3000
  phases:
    - duration: 60
      arrivalRate: 10  # 每秒 10 个请求
  
scenarios:
  - name: "Generate Recommendations"
    flow:
      - post:
          url: "/api/v1/recommendations/generate/{{ $randomNumber(1, 100) }}"
          json:
            mode: "all"
            useCache: true
          headers:
            Authorization: "Bearer {{ $env(TOKEN) }}"
```

**预期指标**:
- ✅ P95 响应时间 < 5s
- ✅ 错误率 < 1%
- ✅ 吞吐量 > 50 QPS

---

## 🐛 六、边界条件测试

### TC-EDGE-001: 置信度边界值

**模块**: FusionEngine  
**优先级**: P0

**测试步骤**:
```typescript
it('should handle confidence boundary values correctly', async () => {
  // Test 1: Confidence = 0
  const recs1 = [{ tagName: 'Test', confidence: 0, source: 'rule' }];
  const fused1 = await fusionEngine.fuseRecommendations(recs1);
  expect(fused1[0].confidence).toBe(0);

  // Test 2: Confidence = 1.0 (should cap at 0.9999)
  const recs2 = [
    { tagName: 'Test', confidence: 1.0, source: 'rule' },
    { tagName: 'Test', confidence: 0.95, source: 'clustering' },
  ];
  const fused2 = await fusionEngine.fuseRecommendations(recs2);
  expect(fused2[0].confidence).toBeLessThanOrEqual(0.9999);

  // Test 3: Multi-source bonus should not exceed 1.0
  const recs3 = [
    { tagName: 'Test', confidence: 0.95, source: 'rule' },
    { tagName: 'Test', confidence: 0.9, source: 'clustering' },
    { tagName: 'Test', confidence: 0.85, source: 'association' },
  ];
  const fused3 = await fusionEngine.fuseRecommendations(recs3);
  expect(fused3[0].confidence).toBeLessThanOrEqual(1.0);
});
```

**预期结果**:
- ✅ 置信度 0 处理正常
- ✅ 置信度上限 0.9999
- ✅ 多来源加成不超过 1.0

---

## 📈 七、测试用例统计

| 类别 | 用例数 | 已通过 | 失败 | 跳过 | 通过率 |
|------|--------|--------|------|------|--------|
| **单元测试** | 15 | - | - | - | - |
| **集成测试** | 8 | - | - | - | - |
| **E2E 测试** | 5 | - | - | - | - |
| **性能测试** | 3 | - | - | - | - |
| **边界测试** | 4 | - | - | - | - |
| **总计** | **35** | - | - | - | - |

---

## 🔄 八、测试执行顺序

```bash
# 1. 单元测试（最快，无依赖）
npm test -- --testPathPattern="unit"

# 2. 集成测试（需要 Docker 容器）
npm run test:integration

# 3. E2E 测试（需要启动应用）
npm run test:e2e

# 4. 性能测试（独立运行）
artillery run artillery.yml
```

---

**文档版本**: v1.0  
**编制人**: [待填写]  
**审核人**: [待填写]  
**批准人**: [待填写]

**© 2026 客户标签推荐系统项目组 版权所有**
