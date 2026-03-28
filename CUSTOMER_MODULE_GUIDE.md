# 客户信息管理模块使用指南

## 📋 功能概述

客户信息管理模块为客户标签智能推荐系统提供完整的客户数据管理能力，包括：

- ✅ **客户 CRUD 操作** - 创建、查询、更新、删除
- ✅ **批量随机生成** - 基于规则的智能模拟数据生成
- ✅ **CSV/Excel导入** - 支持标准格式批量导入
- ✅ **数据导出** - 支持导出为 CSV/Excel（待实现）
- ✅ **多维度筛选** - 姓名、邮箱、城市、等级、风险等
- ✅ **统计分析** - 客户分布、资产统计、等级分析

---

## 🏗️ 技术架构

### 后端组件

#### **1. Customer 实体** (`src/modules/recommendation/entities/customer.entity.ts`)

```typescript
@Entity('customers')
export class Customer {
  id: number;                    // 客户 ID
  name: string;                  // 姓名
  email?: string;                // 邮箱（唯一）
  phone?: string;                // 手机号（唯一）
  gender?: Gender;               // 性别（M/F）
  age?: number;                  // 年龄
  city?: string;                 // 城市
  totalAssets: number;           // 总资产
  monthlyIncome: number;         // 月收入
  annualSpend: number;           // 年消费
  orderCount: number;            // 订单数
  productCount: number;          // 持有产品数
  registerDays: number;          // 注册天数
  lastLoginDays: number;         // 距上次登录天数
  level: CustomerLevel;          // 客户等级
  riskLevel: RiskLevel;          // 风险等级
  isActive: boolean;             // 是否激活
}
```

#### **2. Customer Service** (`src/modules/recommendation/services/customer.service.ts`)

核心服务方法：
- `create(dto)` - 创建单个客户
- `batchCreate(customers)` - 批量创建
- `generateRandomCustomers(options)` - 随机生成
- `findAll(options)` - 分页查询 + 多条件筛选
- `findById(id)` - 获取详情
- `update(id, dto)` - 更新信息
- `remove(id)` - 删除客户
- `batchRemove(ids)` - 批量删除
- `getStatistics()` - 统计信息

#### **3. Customer Controller** (`src/modules/recommendation/controllers/customer.controller.ts`)

RESTful API 端点：
```
POST   /api/v1/customers              # 创建客户
POST   /api/v1/customers/batch        # 批量创建
POST   /api/v1/customers/generate     # 随机生成
GET    /api/v1/customers              # 获取列表
GET    /api/v1/customers/statistics   # 统计信息
GET    /api/v1/customers/:id          # 获取详情
PUT    /api/v1/customers/:id          # 更新信息
DELETE /api/v1/customers/:id          # 删除客户
POST   /api/v1/customers/batch-delete # 批量删除
```

### 前端组件

#### **客户服务** (`frontend/src/services/customer.ts`)

```typescript
// 使用示例
import { customerService } from '@/services/customer';

// 获取客户列表
const result = await customerService.getList({
  page: 1,
  limit: 20,
  keyword: '张三',
  level: CustomerLevel.GOLD,
});

// 随机生成 100 个客户
await customerService.generateRandom({ count: 100 });

// 获取统计信息
const stats = await customerService.getStatistics();
```

---

## 🚀 快速开始

### Step 1: 运行数据库迁移

```bash
cd customer-label

# 执行数据库迁移（创建 customers 表）
npm run migrate:customers
```

**预期输出**:
```
🚀 开始执行数据库迁移...

✅ 数据库连接成功

📄 执行 SQL 语句...

✅ 成功执行 8 个 SQL 语句

🎉 数据库迁移完成！
```

### Step 2: 生成测试数据

#### **方式 A：随机生成（推荐）**

```bash
# 通过 API 生成（推荐用于开发测试）
curl -X POST http://localhost:3000/api/v1/customers/generate \
  -H "Content-Type: application/json" \
  -d '{
    "count": 100,
    "minAge": 20,
    "maxAge": 65,
    "minAssets": 10000,
    "maxAssets": 10000000
  }'
```

#### **方式 B：CSV 导入**

1. 准备 CSV 文件 `customers-import.csv`：

```csv
name,email,phone,gender,age,city,totalAssets,monthlyIncome,annualSpend
张三，zhangsan@example.com,13800138000,M,35，北京，500000,30000,180000
李四，lisi@example.com,13900139000,F,28，上海，300000,25000,150000
```

2. 执行导入脚本：

```bash
node scripts/import-customers.cjs
```

### Step 3: 启动服务查看效果

```bash
# 启动前后端服务
npm run dev:all

# 访问前端页面
http://localhost:5176

# 访问 Swagger API 文档
http://localhost:3000/api/docs
```

---

## 📊 使用场景

### 场景 1：为客户生成推荐标签

```typescript
// 1. 从数据库获取真实客户数据
const customer = await customerService.getById(1);

// 2. 转换为推荐引擎需要的格式
const customerData: CustomerData = {
  id: customer.id,
  totalAssets: customer.totalAssets,
  monthlyIncome: customer.monthlyIncome,
  annualSpend: customer.annualSpend,
  orderCount: customer.orderCount,
  productCount: customer.productCount,
  registerDays: customer.registerDays,
  lastLoginDays: customer.lastLoginDays,
  riskLevel: customer.riskLevel,
  age: customer.age,
  gender: customer.gender,
  city: customer.city,
  membershipLevel: customer.level,
};

// 3. 调用推荐服务生成标签
const recommendations = await recommendationService.generateForCustomer(
  customer.id,
  { mode: 'all' },
  customerData
);

console.log(`为客户 ${customer.name} 生成了 ${recommendations.length} 条推荐`);
```

### 场景 2：批量生成测试数据

```typescript
// 生成 500 个不同城市的客户
await customerService.generateRandom({
  count: 500,
  cities: ['北京', '上海', '广州', '深圳', '杭州'],
  minAge: 25,
  maxAge: 60,
  minAssets: 50000,
  maxAssets: 5000000,
});
```

### 场景 3：客户分群分析

```typescript
// 获取所有黄金等级客户
const goldCustomers = await customerService.getList({
  level: CustomerLevel.GOLD,
  minAssets: 1000000,
  sortBy: 'totalAssets',
  sortOrder: 'desc',
});

// 获取高风险客户
const highRiskCustomers = await customerService.getList({
  riskLevel: RiskLevel.HIGH,
  minAge: 40,
});
```

### 场景 4：统计报表

```typescript
const stats = await customerService.getStatistics();

console.log('客户总数:', stats.total);
console.log('活跃客户:', stats.activeCount);
console.log('平均资产:', stats.avgAssets);
console.log('等级分布:', stats.levelStats);
console.log('城市 TOP10:', stats.cityStats);
```

---

## 🔍 高级筛选示例

### 组合条件查询

```typescript
// 查询北京地区 30-45 岁、资产 100 万以上的黄金客户
const beijingGoldCustomers = await customerService.getList({
  city: '北京',
  minAge: 30,
  maxAge: 45,
  minAssets: 1000000,
  level: CustomerLevel.GOLD,
  sortBy: 'totalAssets',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
});
```

### 关键词搜索

```typescript
// 搜索姓名或手机号包含"张"的客户
const searchResult = await customerService.getList({
  keyword: '张',
  page: 1,
  limit: 20,
});
```

---

## 📝 数据导入模板

### CSV 文件格式

```csv
name,email,phone,gender,age,city,totalAssets,monthlyIncome,annualSpend
张三，zhangsan@example.com,13800138000,M,35，北京，500000,30000,180000
李四，lisi@example.com,13900139000,F,28，上海，300000,25000,150000
王五，wangwu@example.com,13700137000,M,42，广州，800000,50000,300000
```

**字段说明**:
- `name`: 客户姓名（必填）
- `email`: 邮箱（唯一，可选）
- `phone`: 手机号（唯一，可选）
- `gender`: 性别 M/F（可选）
- `age`: 年龄（可选）
- `city`: 城市（可选）
- `totalAssets`: 总资产（元）
- `monthlyIncome`: 月收入（元）
- `annualSpend`: 年消费（元）

---

## 🎯 与推荐系统集成

### 修改 Recommendation Service

在 `recommendation.service.ts` 中接入真实客户数据：

```typescript
async generateForCustomer(
  customerId: number,
  options: RecommendOptions = {},
  customerData?: CustomerData
): Promise<TagRecommendation[]> {
  // 如果没有提供客户数据，从数据库获取
  if (!customerData) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    
    if (!customer) {
      throw new NotFoundException(`客户 #${customerId} 不存在`);
    }
    
    // 转换为客户数据对象
    customerData = {
      id: customer.id,
      totalAssets: Number(customer.totalAssets),
      monthlyIncome: Number(customer.monthlyIncome),
      annualSpend: Number(customer.annualSpend),
      orderCount: customer.orderCount,
      productCount: customer.productCount,
      registerDays: customer.registerDays,
      lastLoginDays: customer.lastLoginDays,
      riskLevel: customer.riskLevel,
      age: customer.age,
      gender: customer.gender,
      city: customer.city,
      membershipLevel: customer.level,
    };
  }
  
  // ... 继续原有的推荐逻辑
}
```

---

## 🛠️ 常见问题

### Q1: 如何清空客户数据重新生成？

```sql
-- 方法 1：TRUNCATE（快速清空）
TRUNCATE TABLE customers RESTART IDENTITY CASCADE;

-- 方法 2：DELETE（可加 WHERE 条件）
DELETE FROM customers;
```

### Q2: 如何处理重复的邮箱/手机号？

导入脚本已自动处理：
```typescript
ON CONFLICT (email) DO NOTHING
```

如需更新已有数据：
```typescript
ON CONFLICT (email) DO UPDATE SET
  phone = EXCLUDED.phone,
  total_assets = EXCLUDED.total_assets,
  ...
```

### Q3: 如何优化大数据量查询性能？

1. **添加索引**（已自动创建）：
```sql
CREATE INDEX idx_customers_level ON customers(level);
CREATE INDEX idx_customers_city ON customers(city);
```

2. **分页查询**：始终使用 `page` 和 `limit` 参数

3. **避免全表扫描**：尽量使用精确匹配条件

---

## 📈 后续扩展计划

### Phase 1: 基础功能 ✅
- [x] Customer 实体定义
- [x] CRUD 操作
- [x] 随机数据生成
- [x] CSV 导入支持

### Phase 2: 增强功能 ⏳
- [ ] Excel 导入导出（使用 exceljs 库）
- [ ] 客户画像可视化
- [ ] 批量编辑功能
- [ ] 客户标签关联展示

### Phase 3: 高级功能 🎯
- [ ] 客户生命周期管理
- [ ] 客户价值分析模型
- [ ] 流失预警系统
- [ ] 智能推荐策略优化

---

## 🔗 相关资源

- **API 文档**: http://localhost:3000/api/docs
- **实体定义**: `src/modules/recommendation/entities/customer.entity.ts`
- **服务实现**: `src/modules/recommendation/services/customer.service.ts`
- **前端服务**: `frontend/src/services/customer.ts`
- **迁移脚本**: `src/modules/recommendation/migrations/create-customers-table.sql`

---

## 📞 技术支持

如有问题请查阅：
1. Swagger API 文档
2. TypeORM 官方文档
3. NestJS 最佳实践

**祝使用愉快！** 🎉