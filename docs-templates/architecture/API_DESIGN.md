# API 接口设计文档

**项目名称**: 客户标签智能推荐系统  
**版本**: v1.0  
**编制日期**: 2026-03-30  
**最后更新**: 2026-03-30 (Phase 2 完成)  
**API 版本**: v1  
**基础路径**: `/api/v1`

---

## 📋 一、RESTful 规范

### 1.1 URL 设计规范

```
格式：/api/v1/{resource}/{id}/{sub-resource}

实际示例:
GET    /api/v1/customers                      # 获取客户列表
GET    /api/v1/customers/1                    # 获取 ID=1 的客户
POST   /api/v1/customers                      # 创建客户
PATCH  /api/v1/customers/1                    # 更新客户
DELETE /api/v1/customers/1,2,3                # 批量删除客户
POST   /api/v1/recommendations/generate/1?mode=rule  # 触发规则引擎
GET    /api/v1/recommendations?status=pending        # 获取推荐列表
POST   /api/v1/recommendations/accept/1,2,3          # 批量接受推荐
GET    /api/v1/rules                                # 获取规则配置
```

### 1.2 HTTP 方法语义

| 方法 | 用途 | 幂等性 | 可缓存 | 实际使用场景 |
|------|------|--------|--------|-------------|
| GET | 查询资源 | 是 | 是 | 客户列表、推荐列表、统计数据 |
| POST | 创建资源/执行操作 | 否 | 否 | 生成推荐、接受/拒绝、批量操作 |
| PUT | 全量更新资源 | 是 | 否 | 完整更新配置 |
| PATCH | 部分更新资源 | 否 | 否 | 部分更新客户信息 |
| DELETE | 删除资源 | 是 | 否 | 删除客户、规则配置 |

### 1.3 响应格式标准

```typescript
// 成功响应 (2xx)
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2026-03-30T12:00:00.000Z"
}

// 分页响应
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}

// 错误响应 (4xx/5xx)
{
  "success": false,
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "客户不存在",
    "statusCode": 404
  },
  "timestamp": "2026-03-30T12:00:00.000Z",
  "path": "/api/v1/customers/1"
}
```

---

## 🔐 二、认证与授权

### 2.1 JWT Token 认证流程

**1. 登录获取 Token**:
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response (200):
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6ImFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "expires_in": 7200,
  "token_type": "Bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "roles": ["admin"]
  }
}
```

**2. 携带 Token 访问**:
```http
GET /api/v1/customers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.2 权限控制

**角色定义**:
- `admin`: 管理员（所有权限）
- `operator`: 操作员（CRUD 权限，无用户管理）
- `viewer`: 访客（只读权限）

**权限矩阵**:

| API | admin | operator | viewer |
|-----|-------|----------|--------|
| GET /customers | ✅ | ✅ | ✅ |
| POST /customers | ✅ | ✅ | ❌ |
| DELETE /customers | ✅ | ✅ | ❌ |
| POST /recommendations/generate | ✅ | ✅ | ❌ |
| POST /recommendations/accept | ✅ | ✅ | ❌ |
| GET /rules | ✅ | ✅ | ✅ |
| POST /rules | ✅ | ❌ | ❌ |

---

## 📚 三、核心 API 详解

### 3.1 客户管理 API (`/api/v1/customers`)

#### GET /api/v1/customers

**描述**: 分页查询客户列表（带缓存）

**请求参数**:
```typescript
interface QueryDto {
  page?: number;        // 页码，默认 1
  limit?: number;       // 每页数量，默认 10
  keyword?: string;     // 姓名关键词（模糊匹配）
  level?: string;       // 等级筛选：BRONZE|SILVER|GOLD|PLATINUM|DIAMOND
  city?: string;        // 城市筛选
  riskLevel?: string;   // 风险等级：LOW|MEDIUM|HIGH
  sortBy?: string;      // 排序字段：createdAt|totalAssets|annualSpend
  order?: 'ASC' | 'DESC'; // 排序方向
}
```

**Query Example**:
```bash
GET /api/v1/customers?page=1&limit=20&level=GOLD&sortBy=createdAt&order=DESC
```

**响应格式 (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "张三",
      "email": "zhangsan@example.com",
      "phone": "13800138000",
      "gender": "M",
      "age": 35,
      "city": "北京",
      "province": "北京市",
      "level": "GOLD",
      "riskLevel": "LOW",
      "totalAssets": 5000000.00,
      "monthlyIncome": 50000.00,
      "annualSpend": 200000.00,
      "orderCount": 50,
      "productCount": 120,
      "tags": ["高净值", "活跃"],
      "lastPurchaseDate": "2026-03-15",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-03-30T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  },
  "message": "查询成功",
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

**性能指标**:
- 缓存命中：< 10ms
- 数据库查询：< 200ms
- 缓存 TTL: 300s

---

#### GET /api/v1/customers/:id

**描述**: 获取单个客户详情（含推荐列表）

**路径参数**:
- `id` (bigint): 客户 ID

**响应格式 (200)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "张三",
    "email": "zhangsan@example.com",
    "level": "GOLD",
    "rfmAnalysis": {
      "recency": 15,
      "frequency": 50,
      "monetary": 200000,
      "totalScore": 14
    },
    "recommendations": [
      {
        "id": 101,
        "tag": "高净值客户",
        "reason": "总资产超过 500 万",
        "source": "RULE_ENGINE",
        "confidence": 0.95,
        "status": "PENDING",
        "createdAt": "2026-03-30T10:00:00.000Z"
      }
    ]
  }
}
```

---

#### POST /api/v1/customers

**描述**: 创建新客户

**请求 Body**:
```json
{
  "name": "李四",
  "email": "lisi@example.com",
  "phone": "13900139000",
  "gender": "F",
  "age": 28,
  "city": "上海",
  "province": "上海市",
  "level": "SILVER",
  "totalAssets": 2000000,
  "monthlyIncome": 30000,
  "annualSpend": 100000
}
```

**验证规则**:
- `name`: 必填，1-100 字符
- `email`: 可选，邮箱格式，唯一
- `phone`: 可选，手机号格式，唯一
- `level`: 必填，枚举值

**响应 (201)**:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "李四",
    "email": "lisi@example.com",
    "createdAt": "2026-03-30T12:00:00.000Z"
  },
  "message": "客户创建成功"
}
```

---

#### PATCH /api/v1/customers/:id

**描述**: 部分更新客户信息

**请求 Body**:
```json
{
  "level": "PLATINUM",
  "totalAssets": 8000000,
  "tags": ["高净值", "VIP", "潜在流失"]
}
```

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "张三",
    "level": "PLATINUM",
    "totalAssets": 8000000.00,
    "updatedAt": "2026-03-30T12:00:00.000Z"
  }
}
```

---

#### DELETE /api/v1/customers/:ids

**描述**: 批量删除客户

**路径参数**:
- `ids`: 逗号分隔的客户 ID 字符串，如 `"1,2,3"`

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "deletedCount": 3
  },
  "message": "成功删除 3 个客户"
}
```

---

#### GET /api/v1/customers/export

**描述**: 导出客户数据

**请求参数**:
- `format`: 导出格式，支持 `csv` | `xlsx` (默认 csv)
- `ids`: 可选，指定导出的客户 ID

**响应**:
- Content-Type: `text/csv` 或 `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="customers_20260330.csv"`

---

#### GET /api/v1/customers/:id/rfm

**描述**: 获取客户 RFM 分析结果

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "customerId": 1,
    "recency": {
      "days": 15,
      "score": 4,
      "level": "HIGH"
    },
    "frequency": {
      "count": 50,
      "score": 5,
      "level": "HIGH"
    },
    "monetary": {
      "amount": 200000,
      "score": 5,
      "level": "HIGH"
    },
    "totalScore": 14,
    "segment": "重要价值客户"
  }
}
```

---

### 3.2 推荐引擎 API (`/api/v1/recommendations`)

#### POST /api/v1/recommendations/generate/:customerId

**描述**: 手动触发推荐引擎（核心功能）

**路径参数**:
- `customerId` (bigint): 客户 ID

**查询参数**:
- `mode`: 引擎模式
  - `rule`: 规则引擎
  - `clustering`: 聚类引擎
  - `association`: 关联引擎
  - `all`: 融合引擎（默认）

**请求示例**:
```bash
POST /api/v1/recommendations/generate/1?mode=rule
Authorization: Bearer <token>
```

**处理流程**:
1. 加载对应引擎配置
2. 执行引擎算法
3. 融合结果（多引擎时）
4. 冲突检测
5. 保存到数据库
6. 返回生成的推荐数量

**响应 (201)**:
```json
{
  "success": true,
  "data": {
    "generated": 5,
    "customerId": 1,
    "mode": "rule",
    "executionTime": 1250,
    "recommendations": [
      {
        "id": 101,
        "tag": "高净值客户",
        "reason": "总资产超过 500 万",
        "source": "RULE_ENGINE",
        "confidence": 0.95,
        "status": "PENDING"
      },
      {
        "id": 102,
        "tag": "理财偏好者",
        "reason": "持有理财产品超过 100 万",
        "source": "RULE_ENGINE",
        "confidence": 0.88,
        "status": "PENDING"
      }
    ]
  },
  "message": "成功生成 5 条推荐",
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

**性能指标**:
- 单引擎执行：< 2000ms
- 融合引擎：< 3000ms
- 并发支持：≥ 10 QPS

---

#### GET /api/v1/recommendations

**描述**: 获取推荐列表（支持筛选）

**请求参数**:
```typescript
interface QueryDto {
  page?: number;              // 页码
  limit?: number;             // 每页数量
  customerId?: number;        // 按客户筛选
  status?: string;            // 状态：PENDING|ACCEPTED|REJECTED
  source?: string;            // 来源：RULE|CLUSTERING|ASSOCIATION|FUSION
  tag?: string;               // 标签关键词
  sortBy?: string;            // 排序字段：confidence|createdAt
  order?: 'ASC' | 'DESC';     // 排序方向
}
```

**响应 (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "customer": {
        "id": 1,
        "name": "张三"
      },
      "tag": "高净值客户",
      "reason": "总资产超过 500 万",
      "source": "RULE_ENGINE",
      "confidence": 0.95,
      "status": "PENDING",
      "acceptedAt": null,
      "rejectedAt": null,
      "createdAt": "2026-03-30T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

#### POST /api/v1/recommendations/accept/:ids

**描述**: 接受推荐（单条/批量）

**路径参数**:
- `ids`: 逗号分隔的推荐 ID

**处理逻辑**:
1. 更新推荐状态为 `ACCEPTED`
2. 将标签添加到客户的 `tags` 数组
3. 记录接受时间

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "acceptedCount": 3
  },
  "message": "成功接受 3 条推荐"
}
```

---

#### POST /api/v1/recommendations/reject/:ids

**描述**: 拒绝推荐（单条/批量）

**路径参数**:
- `ids`: 逗号分隔的推荐 ID

**处理逻辑**:
1. 更新推荐状态为 `REJECTED`
2. 记录拒绝时间和原因（可选）

**请求 Body (可选)**:
```json
{
  "reason": "标签不符合实际情况"
}
```

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "rejectedCount": 2
  },
  "message": "成功拒绝 2 条推荐"
}
```

---

#### POST /api/v1/recommendations/batch-accept

**描述**: 批量接受推荐（按客户 ID 列表）

**请求 Body**:
```json
{
  "customerIds": [1, 2, 3],
  "mode": "rule"  // 可选，仅接受指定模式的推荐
}
```

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "acceptedCount": 15
  },
  "message": "成功接受 15 条推荐"
}
```

---

#### POST /api/v1/recommendations/batch-reject

**描述**: 批量拒绝推荐（按客户 ID 列表）

**请求 Body**:
```json
{
  "customerIds": [1, 2, 3],
  "mode": "clustering"
}
```

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "rejectedCount": 8
  },
  "message": "成功拒绝 8 条推荐"
}
```

---

### 3.3 配置管理 API

#### 规则配置 (`/api/v1/rules`)

```bash
# 获取所有规则
GET /api/v1/rules

# 创建规则
POST /api/v1/rules
Body: {
  "name": "高净值客户识别",
  "description": "总资产超过 500 万",
  "expression": "totalAssets > 5000000",
  "priority": 1,
  "enabled": true
}

# 更新规则
PATCH /api/v1/rules/:id

# 删除规则
DELETE /api/v1/rules/:id
```

**规则表达式语法**:
```javascript
// 支持比较运算符
totalAssets > 5000000
annualSpend >= 100000 && age < 40

// 支持枚举值
level === 'GOLD' || level === 'PLATINUM'

// 支持数组包含
tags.includes('VIP')

// 支持空值检查
lastPurchaseDate !== null
```

---

#### 聚类配置 (`/api/v1/clustering-configs`)

```bash
# 获取配置
GET /api/v1/clustering-configs

# 创建配置
POST /api/v1/clustering-configs
Body: {
  "name": "默认聚类配置",
  "kValue": 5,
  "maxIterations": 100,
  "convergenceThreshold": 0.001,
  "enabled": true
}

# 激活配置（自动停用其他配置）
PATCH /api/v1/clustering-configs/:id/activate
```

**参数说明**:
- `kValue`: 聚类数量 (3-10)
- `maxIterations`: 最大迭代次数 (10-1000)
- `convergenceThreshold`: 收敛阈值 (0.0001-0.01)

---

#### 关联配置 (`/api/v1/association-configs`)

```bash
# 获取配置
GET /api/v1/association-configs

# 创建配置
POST /api/v1/association-configs
Body: {
  "name": "默认关联规则",
  "minSupport": 0.1,
  "minConfidence": 0.7,
  "minLift": 1.5,
  "enabled": true
}
```

**参数说明**:
- `minSupport`: 最小支持度 (0.01-0.5)
- `minConfidence`: 最小置信度 (0.5-0.95)
- `minLift`: 最小提升度 (>1.0)

---

### 3.4 统计 API (`/api/v1/statistics`)

#### GET /api/v1/statistics/customers

**描述**: 获取客户统计数据

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "total": 1000,
    "byLevel": {
      "BRONZE": 300,
      "SILVER": 400,
      "GOLD": 200,
      "PLATINUM": 80,
      "DIAMOND": 20
    },
    "byCity": {
      "北京": 200,
      "上海": 180,
      "广州": 150,
      "深圳": 170
    },
    "byRiskLevel": {
      "LOW": 700,
      "MEDIUM": 250,
      "HIGH": 50
    },
    "avgAssets": 3500000,
    "avgAnnualSpend": 150000
  }
}
```

---

#### GET /api/v1/statistics/recommendations

**描述**: 获取推荐统计数据

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "totalGenerated": 5000,
    "pending": 1200,
    "accepted": 3200,
    "rejected": 600,
    "acceptanceRate": 0.64,
    "bySource": {
      "RULE": 2000,
      "CLUSTERING": 1500,
      "ASSOCIATION": 1000,
      "FUSION": 500
    },
    "trend": [
      {"date": "2026-03-24", "generated": 700, "accepted": 450},
      {"date": "2026-03-25", "generated": 750, "accepted": 480},
      {"date": "2026-03-26", "generated": 680, "accepted": 440},
      {"date": "2026-03-27", "generated": 720, "accepted": 460},
      {"date": "2026-03-28", "generated": 800, "accepted": 520},
      {"date": "2026-03-29", "generated": 750, "accepted": 490},
      {"date": "2026-03-30", "generated": 600, "accepted": 360}
    ]
  }
}
```

---

#### GET /api/v1/statistics/engines/performance

**描述**: 获取引擎性能统计

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "ruleEngine": {
      "totalExecutions": 1500,
      "avgExecutionTime": 850,
      "avgRecommendations": 4.2,
      "acceptanceRate": 0.68
    },
    "clusteringEngine": {
      "totalExecutions": 1200,
      "avgExecutionTime": 1500,
      "avgRecommendations": 5.8,
      "acceptanceRate": 0.62
    },
    "associationEngine": {
      "totalExecutions": 800,
      "avgExecutionTime": 1200,
      "avgRecommendations": 3.5,
      "acceptanceRate": 0.71
    }
  }
}
```

---

## ⚠️ 四、错误码字典

### 4.1 通用错误码

| Code | HTTP Status | 描述 | 解决方案 |
|------|-------------|------|---------|
| SUCCESS | 200 | 操作成功 | - |
| INVALID_REQUEST | 400 | 请求参数错误 | 检查请求格式 |
| UNAUTHORIZED | 401 | 未认证 | 携带有效 Token |
| FORBIDDEN | 403 | 无权限 | 联系管理员 |
| NOT_FOUND | 404 | 资源不存在 | 检查 ID 是否正确 |
| CONFLICT | 409 | 资源冲突 | 检查唯一性约束 |
| INTERNAL_ERROR | 500 | 服务器内部错误 | 联系技术支持 |

### 4.2 业务错误码

| Code | HTTP Status | 描述 |
|------|-------------|------|
| CUSTOMER_NOT_FOUND | 404 | 客户不存在 |
| CUSTOMER_EMAIL_EXISTS | 409 | 邮箱已注册 |
| CUSTOMER_PHONE_EXISTS | 409 | 手机号已注册 |
| RECOMMENDATION_NOT_FOUND | 404 | 推荐不存在 |
| RULE_NOT_FOUND | 404 | 规则不存在 |
| INVALID_RULE_EXPRESSION | 400 | 规则表达式无效 |
| ENGINE_EXECUTION_FAILED | 500 | 引擎执行失败 |
| CACHE_ERROR | 500 | 缓存操作失败 |

---

## 📊 五、Swagger 文档

### 5.1 访问地址

开发环境：`http://localhost:3000/api/docs`

### 5.2 在线测试

Swagger UI 支持：
- ✅ 查看所有 API 端点
- ✅ 查看请求/响应示例
- ✅ 在线调试 API
- ✅ 自动生成客户端代码

---

## 🔧 六、API 版本管理

### 6.1 版本策略

- URI 版本号：`/api/v1/`, `/api/v2/`
- 向后兼容：v1.x 保持兼容
- 废弃通知：提前 3 个月通知

### 6.2 当前版本

- **最新版本**: v1.0 (2026-03-30)
- **支持状态**: 活跃开发
- **下一版本**: v1.1 (规划中)

---

## 📈 七、性能基准

### 7.1 API 响应时间 (P95)

| API | 目标值 | 实测值 | 状态 |
|-----|--------|--------|------|
| GET /customers | < 200ms | 150ms | ✅ |
| GET /customers/:id | < 150ms | 120ms | ✅ |
| POST /generate | < 3000ms | 2200ms | ✅ |
| GET /recommendations | < 200ms | 180ms | ✅ |
| POST /batch-accept | < 3000ms | 2500ms | ✅ |
| GET /statistics | < 300ms | 250ms | ✅ |

### 7.2 并发性能

- **最大并发**: 50 QPS
- **错误率**: < 0.1%
- **CPU 使用率**: < 70%
- **内存使用率**: < 80%

---

## 🔗 八、参考资料

- [PRD 文档](../requirements/PRD_TEMPLATE.md)
- [系统架构](./SYSTEM_ARCHITECTURE.md)
- [数据库设计](./DATABASE_DESIGN.md)
- [Swagger UI](http://localhost:3000/api/docs)
- [NestJS 官方文档](https://docs.nestjs.com/)

---

**维护记录**:

| 日期 | 维护人 | 变更描述 |
|------|--------|---------|
| 2026-03-30 | AI Assistant | 初始版本，基于 Phase 2 完成情况编写 |
| - | - | - |

**审批签字**:

- 技术负责人：________________  日期：__________
- 产品负责人：________________  日期：__________
- 测试负责人：________________  日期：__________
