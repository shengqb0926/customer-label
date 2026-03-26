# 后端优化待办事项

## ✅ 已完成 (2026-03-26)

### 安全性和数据验证
- [x] 全局验证管道（whitelist、forbidNonWhitelisted、自动类型转换）
- [x] XSS 防护（HTML 字符转义）
- [x] SQL 注入防护中间件
- [x] CORS 配置优化

### 性能监控
- [x] 性能监控中间件（响应时间统计、慢请求检测）
- [x] 缓存命中率分析（hits/misses/writes/evictions）
- [x] 按端点统计响应时间

### 业务功能准备
- [x] 规则管理 DTO（CreateRuleDto / UpdateRuleDto）
- [x] 聚类配置 DTO（CreateClusteringConfigDto / UpdateClusteringConfigDto）

---

## 📋 待完成内容

### 1. 业务功能完善 - 规则管理 API

**文件位置**: `src/modules/recommendation/rule-manager.controller.ts` (新建)

```typescript
POST   /api/v1/rules          // 创建规则
GET    /api/v1/rules          // 获取规则列表（分页、过滤）
GET    /api/v1/rules/:id      // 获取单个规则详情
PUT    /api/v1/rules/:id      // 更新规则
DELETE /api/v1/rules/:id      // 删除规则
POST   /api/v1/rules/test     // 测试规则表达式
PATCH  /api/v1/rules/:id/activate   // 激活规则
PATCH  /api/v1/rules/:id/deactivate // 停用规则
```

**需要实现**:
- RuleManagerService
- RuleManagerController
- 规则表达式解析和验证
- 规则优先级冲突检测
- 批量导入/导出功能

---

### 2. 业务功能完善 - 聚类配置管理 API

**文件位置**: `src/modules/recommendation/clustering-manager.controller.ts` (新建)

```typescript
POST   /api/v1/clustering/configs        // 创建配置
GET    /api/v1/clustering/configs        // 获取配置列表
GET    /api/v1/clustering/configs/:id    // 获取配置详情
PUT    /api/v1/clustering/configs/:id    // 更新配置
DELETE /api/v1/clustering/configs/:id    // 删除配置
POST   /api/v1/clustering/analyze        // 执行聚类分析
GET    /api/v1/clustering/results        // 获取聚类结果
POST   /api/v1/clustering/results/:id/generate-tags  // 根据聚类生成标签
```

**需要实现**:
- ClusteringManagerService
- ClusteringManagerController
- 聚类结果可视化数据接口
- 聚类效果评估指标（轮廓系数等）

---

### 3. 测试覆盖提升

#### E2E 集成测试
**文件位置**: `test/e2e/` (新建目录)

- [ ] `recommendation.e2e-spec.ts` - 推荐 API 端到端测试
- [ ] `scoring.e2e-spec.ts` - 评分 API 端到端测试
- [ ] `feedback.e2e-spec.ts` - 反馈 API 端到端测试
- [ ] `auth.e2e-spec.ts` - 认证 API 端到端测试
- [ ] `rules.e2e-spec.ts` - 规则管理 API 端到端测试（待实现）
- [ ] `clustering.e2e-spec.ts` - 聚类配置 API 端到端测试（待实现）

#### API 集成测试
**文件位置**: `test/integration/` (新建目录)

- [ ] 测试数据库事务回滚
- [ ] 测试 Redis 缓存一致性
- [ ] 测试队列任务处理
- [ ] 测试并发请求处理

#### 负载测试
**工具**: artillery 或 k6

**脚本**: `test/load/recommendation-load-test.yml`

```yaml
# 示例场景
config:
  target: "http://localhost:3000/api/v1"
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100

scenarios:
  - name: "Get Recommendations"
    requests:
      - get:
          url: "/recommendations/customer/{{ $randomNumber(1, 1000) }}"
          
  - name: "Generate Recommendations"
    requests:
      - post:
          url: "/recommendations/generate/{{ $randomNumber(1, 1000) }}"
```

**目标指标**:
- 95% 请求响应时间 < 500ms
- 错误率 < 0.1%
- 支持 100+ 并发用户

---

### 4. 性能优化进阶

#### 数据库优化
- [ ] 添加慢查询日志（TypeORM logging）
- [ ] 为常用查询添加索引
  - `tag_recommendation(customer_id, source)`
  - `tag_recommendation(tag_name, confidence)`
  - `recommendation_rule(is_active, priority)`
- [ ] 实现数据库连接池监控
- [ ] 添加查询结果缓存（TypeORM QueryResultCache）

#### Redis 优化
- [ ] 实现 Redis 集群支持
- [ ] 添加 Redis 连接池监控
- [ ] 实现缓存预热策略
- [ ] 添加缓存穿透保护（Bloom Filter）
- [ ] 实现分布式锁（防止重复推荐生成）

#### 队列优化
- [ ] 实现队列优先级（高价值客户优先）
- [ ] 添加失败重试机制
- [ ] 实现队列监控（Bull Dashboard）
- [ ] 添加死信队列处理

---

### 5. 可观测性增强

#### 日志系统
- [ ] 结构化日志（JSON 格式）
- [ ] 日志级别动态调整
- [ ] 敏感信息脱敏
- [ ] 日志聚合（ELK/Loki）

#### 监控告警
- [ ] Prometheus 指标暴露
  - API 响应时间直方图
  - 请求成功率
  - 缓存命中率
  - 队列长度
  - 数据库连接数
- [ ] Grafana 仪表盘配置
- [ ] 告警规则配置（AlertManager）

#### 链路追踪
- [ ] OpenTelemetry 集成
- [ ] 请求 ID 追踪
- [ ] 跨服务调用链追踪

---

### 6. API 功能扩展

#### 批量操作接口
```typescript
POST   /api/v1/recommendations/batch-generate    // 批量生成推荐
POST   /api/v1/recommendations/batch-export      // 批量导出推荐
POST   /api/v1/scoring/batch-update              // 批量更新评分
GET    /api/v1/customers/:id/profile             // 获取客户完整画像
```

#### 数据分析接口
```typescript
GET    /api/v1/analytics/recommendation-stats    // 推荐统计
GET    /api/v1/analytics/tag-distribution        // 标签分布
GET    /api/v1/analytics/customer-segments       // 客户分群分析
GET    /api/v1/analytics/trend/:metric           // 趋势分析
```

#### 导出功能
```typescript
POST   /api/v1/export/recommendations            // 导出推荐数据
POST   /api/v1/export/scores                     // 导出评分数据
GET    /api/v1/export/jobs/:id                   // 获取导出任务状态
```

---

### 7. GraphQL API (可选)

**文件位置**: `src/graphql/` (新建目录)

- [ ] Apollo Server 集成
- [ ] GraphQL Schema 定义
- [ ] Resolver 实现
- [ ] 订阅支持（实时推荐更新）

**优势**:
- 客户端按需查询
- 减少过度获取
- 实时数据推送

---

### 8. 实时通知功能

**技术栈**: WebSocket + Socket.IO

**文件位置**: `src/infrastructure/websocket/` (新建目录)

```typescript
// 事件定义
client -> server: 'subscribe-recommendations'
server -> client: 'recommendation-generated' { customerId, tags }
server -> client: 'recommendation-progress' { jobId, progress, status }
```

**应用场景**:
- 推荐生成进度实时推送
- 批量任务完成通知
- 系统告警通知

---

### 9. 文档完善

#### API 文档
- [ ] Swagger 注释完善（所有 DTO 添加 @ApiProperty）
- [ ] 添加请求/响应示例
- [ ] 添加错误码说明
- [ ] 生成 Markdown 格式 API 文档

#### 部署文档
- [ ] Docker 容器化配置
- [ ] Kubernetes 部署清单
- [ ] CI/CD 流水线配置
- [ ] 环境变量说明

#### 开发文档
- [ ] 架构设计文档
- [ ] 数据库 ER 图
- [ ] 业务流程图
- [ ] 常见问题 FAQ

---

## 优先级建议

### P0 - 高优先级（立即实施）
1. 规则管理 API（业务核心功能）
2. E2E 集成测试（质量保障）
3. 数据库索引优化（性能关键）

### P1 - 中优先级（近期实施）
1. 聚类配置管理 API
2. 批量操作接口
3. 慢查询日志和监控
4. 负载测试

### P2 - 低优先级（远期规划）
1. GraphQL API
2. WebSocket 实时通知
3. 分布式锁和集群支持
4. 完整的可观测性平台

---

## 技术债务

- [ ] 修复 RecommendationService 集成测试失败问题
- [ ] 统一异常处理机制
- [ ] 移除代码中的 TODO 注释
- [ ] 更新过时的依赖包
- [ ] 添加代码覆盖率要求（目标：95%+）

---

## 性能目标

| 指标 | 当前值 | 目标值 | 测量方法 |
|------|--------|--------|----------|
| API 平均响应时间 | - | < 200ms | Prometheus |
| 95 分位响应时间 | - | < 500ms | Prometheus |
| 缓存命中率 | - | > 80% | CacheService.getStats() |
| 数据库查询时间 | - | < 50ms | TypeORM logging |
| 错误率 | - | < 0.1% | Prometheus |
| 并发用户数 | - | > 100 | 负载测试 |

---

*最后更新：2026-03-26*
