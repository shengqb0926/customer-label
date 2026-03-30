# API 接口设计文档

**项目名称**: 客户标签推荐系统  
**版本**: v1.0  
**编制日期**: 2026-03-30

---

## 📋 一、RESTful 规范

### 1.1 URL 设计规范

```
格式：/api/v1/{resource}/{id}/{sub-resource}

示例:
GET    /api/v1/customers              # 获取客户列表
GET    /api/v1/customers/123          # 获取单个客户
POST   /api/v1/customers              # 创建客户
PUT    /api/v1/customers/123          # 更新客户
DELETE /api/v1/customers/123          # 删除客户
POST   /api/v1/recommendations/generate/123  # 触发推荐引擎
```

### 1.2 HTTP 方法语义

| 方法 | 用途 | 幂等性 | 可缓存 |
|------|------|--------|--------|
| GET | 查询资源 | 是 | 是 |
| POST | 创建资源/执行操作 | 否 | 否 |
| PUT | 全量更新资源 | 是 | 否 |
| PATCH | 部分更新资源 | 否 | 否 |
| DELETE | 删除资源 | 是 | 否 |

---

## 🔐 二、认证与授权

### 2.1 JWT Token 认证

**请求头**:
```http
Authorization: Bearer <access_token>
```

**Token 获取**:
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 7200
}
```

---

## 📚 三、核心 API 详解

### 3.1 客户管理 API

#### GET /api/v1/customers

**描述**: 分页查询客户列表

**请求参数**:
```typescript
interface QueryDto {
  page?: number;        // 页码，默认 1
  limit?: number;       // 每页数量，默认 10
  keyword?: string;     // 姓名关键词
  level?: string;       // 等级筛选
  city?: string;        // 城市筛选
  isActive?: boolean;   // 活跃状态
}
```

**响应格式**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "张三",
      "level": "GOLD",
      "city": "北京",
      "totalAssets": 5000000,
      "rfmTotal": 14
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

#### POST /api/v1/recommendations/generate/:customerId

**描述**: 手动触发推荐引擎

**路径参数**:
```typescript
customerId: number  // 客户 ID
```

**请求体**:
```typescript
interface RecommendOptions {
  mode: 'rule' | 'clustering' | 'association' | 'all';
  useCache?: boolean;  // 默认 true
  weights?: {
    rule?: number;
    clustering?: number;
    association?: number;
  };
}
```

**请求示例**:
```bash
POST /api/v1/recommendations/generate/123
Content-Type: application/json
Authorization: Bearer <token>

{
  "mode": "all",
  "useCache": true
}
```

**响应示例**:
```json
{
  "success": true,
  "count": 8,
  "recommendations": [
    {
      "tagName": "高价值客户",
      "confidence": 0.95,
      "source": "rule+clustering",
      "reason": "多引擎联合推荐：资产达标且聚类特征匹配"
    }
  ],
  "message": "推荐生成成功，已推送到推荐列表"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "客户不存在",
    "details": {
      "customerId": 999
    }
  },
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

---

### 3.2 推荐管理 API

#### GET /api/v1/recommendations

**描述**: 查询推荐列表

**请求参数**:
```typescript
interface RecommendationQueryDto {
  page?: number;
  limit?: number;
  customerId?: number;     // 按客户筛选
  status?: string;         // pending/accepted/rejected
  source?: string;         // rule/clustering/association
  minConfidence?: number;  // 最小置信度
}
```

**响应格式**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer": {
        "id": 123,
        "name": "张三"
      },
      "tagName": "高价值客户",
      "confidence": 0.95,
      "source": "fusion",
      "status": "pending",
      "createdAt": "2026-03-30T12:00:00.000Z"
    }
  ],
  "pagination": { /* ... */ }
}
```

---

#### POST /api/v1/recommendations/:id/accept

**描述**: 接受推荐

**路径参数**:
```typescript
id: number  // 推荐 ID
```

**请求体**:
```typescript
interface AcceptDto {
  operatorId?: number;  // 可选，从 token 中提取
}
```

**响应**:
```json
{
  "success": true,
  "message": "推荐已接受",
  "data": {
    "id": 1,
    "status": "accepted",
    "acceptedAt": "2026-03-30T12:30:00.000Z"
  }
}
```

---

### 3.3 配置管理 API

#### GET /api/v1/rules

**描述**: 查询规则列表

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ruleName": "高价值客户识别",
      "description": "识别总资产>=500 万的客户",
      "conditions": {
        "operator": "AND",
        "conditions": [
          {"field": "totalAssets", "op": ">=", "value": 5000000}
        ]
      },
      "recommendedTags": ["高价值客户"],
      "priority": 100,
      "isActive": true,
      "executionCount": 256,
      "successRate": 0.85
    }
  ]
}
```

---

#### POST /api/v1/rules

**描述**: 创建新规则

**请求体**:
```typescript
interface CreateRuleDto {
  ruleName: string;
  description?: string;
  conditions: {
    operator: 'AND' | 'OR';
    conditions: Array<{
      field: string;
      op: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'contains';
      value: any;
    }>;
  };
  recommendedTags: string[];
  priority?: number;
  weight?: number;
}
```

**请求示例**:
```json
{
  "ruleName": "私人银行客户",
  "description": "资产>=600 万且年收入>=100 万",
  "conditions": {
    "operator": "AND",
    "conditions": [
      {"field": "totalAssets", "op": ">=", "value": 6000000},
      {"field": "annualIncome", "op": ">=", "value": 1000000}
    ]
  },
  "recommendedTags": ["私人银行客户", "高净值人群"],
  "priority": 200,
  "weight": 1.5
}
```

---

## ⚠️ 四、错误码字典

### 4.1 通用错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-----------|------|
| SUCCESS | 200 | 成功 |
| BAD_REQUEST | 400 | 请求参数错误 |
| UNAUTHORIZED | 401 | 未认证 |
| FORBIDDEN | 403 | 无权限 |
| NOT_FOUND | 404 | 资源不存在 |
| CONFLICT | 409 | 资源冲突 |
| INTERNAL_SERVER_ERROR | 500 | 服务器内部错误 |

### 4.2 业务错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-----------|------|
| CUSTOMER_NOT_FOUND | 404 | 客户不存在 |
| EMAIL_EXISTS | 409 | 邮箱已存在 |
| RECOMMENDATION_EXISTS | 409 | 推荐已存在 |
| RULE_INACTIVE | 400 | 规则未激活 |
| ENGINE_EXECUTION_FAILED | 500 | 引擎执行失败 |
| CACHE_SERVICE_UNAVAILABLE | 503 | 缓存服务不可用 |

---

## 📊 五、Swagger 注解示例

```typescript
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationController {
  
  @Post('generate/:customerId')
  @ApiOperation({ summary: '手动触发推荐引擎' })
  @ApiParam({ name: 'customerId', type: Number, description: '客户 ID' })
  @ApiBody({
    schema: {
      properties: {
        mode: {
          enum: ['rule', 'clustering', 'association', 'all'],
          default: 'all',
        },
        useCache: { type: 'boolean', default: true },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '推荐生成成功',
    schema: {
      properties: {
        success: { type: 'boolean' },
        count: { type: 'number' },
        recommendations: { type: 'array' },
      },
    },
  })
  @ApiResponse({ status: 404, description: '客户不存在' })
  async generateRecommendations(
    @Param('customerId') customerId: number,
    @Body() options: RecommendOptions,
  ) {
    // ...
  }
}
```

---

## 📚 六、参考资源

- [OpenAPI Specification](https://swagger.io/specification/)
- [NestJS Swagger 集成](https://docs.nestjs.com/recipes/swagger)
- [RESTful API 最佳实践](https://restfulapi.net/)

---

**文档版本**: v1.0  
**编制人**: [待填写]  
**审核人**: [待填写]  
**批准人**: [待填写]

**© 2026 客户标签推荐系统项目组 版权所有**
