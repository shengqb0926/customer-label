# 📚 AI 辅助软件开发项目文档体系指南

**基于 customer-label 项目的实践经验总结**  
**版本**: v1.0  
**最后更新**: 2026-03-30  

---

## 🎯 文档体系总览

```
┌─────────────────────────────────────────────────────────────┐
│                    软件开发生命周期                          │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────┤
│ 需求阶段 │ 设计阶段 │ 开发阶段 │ 测试阶段 │ 上线阶段 │ 运维 │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────┘
     ↓           ↓          ↓          ↓          ↓        ↓
  需求文档    设计文档   开发文档   测试文档   部署文档  运维文档
  - PRD      - 架构设计  - API 文档  - 测试用例  - 部署手册  - 监控报告
  - 用户故事  - 数据库设计 - 代码注释  - 测试报告  - 回滚方案  - 问题追踪
  - 原型图    - 接口规范  - Git 提交   - 覆盖率    - 验收报告  - 优化建议
```

---

## 📋 一、需求阶段文档

### 1.1 产品需求文档 (PRD)

**文件示例**: `PRODUCT_REQUIREMENTS.md`

**核心内容**:
```markdown
# 产品需求文档

## 1. 项目背景
- 业务痛点：客户数据分散，缺乏统一标签管理
- 目标：构建智能推荐系统，提升营销转化率

## 2. 功能需求
### 2.1 客户管理
-  CRUD 操作
-  批量导入导出
-  RFM 分析
-  流失预警

### 2.2 推荐引擎
-  规则引擎：支持自定义业务规则
-  聚类引擎：K-Means 自动分群
-  关联引擎：Apriori 挖掘关联规则
-  融合引擎：多引擎结果加权融合

## 3. 非功能需求
- 性能：API 响应 < 500ms，引擎执行 < 5s
- 可用性：99.9% SLA
- 安全：JWT 认证，RBAC 权限控制

## 4. 验收标准
- 功能完整性：所有需求点 100% 实现
- 性能指标：压力测试通过率 100%
- 用户体验：前端加载 < 2s
```

**AI 辅助要点**:
- ✅ 使用自然语言描述业务场景，AI 可自动生成用户故事地图
- ✅ 提供竞品分析文档，AI 可提取关键功能特性
- ✅ 明确性能指标数值，AI 可在开发过程中持续验证

---

### 1.2 用户故事与用例文档

**文件示例**: `USER_STORIES.md`

**核心内容**:
```markdown
# 用户故事清单

## US-001: 作为销售经理，我希望查看 VIP 客户列表
**验收条件**:
- Given: 系统中有 1000 个客户数据
- When: 筛选条件"客户等级=GOLD"且点击查询
- Then: 显示 GOLD 等级客户列表，支持分页

## US-002: 作为运营人员，我希望触发推荐引擎
**验收条件**:
- Given: 已选中客户 ID=123
- When: 点击"规则引擎"按钮
- Then: 显示执行结果（生成 X 条推荐），推送到推荐列表
```

**最佳实践**:
- 📌 每个用户故事独立编号，便于追踪
- 📌 验收条件采用 GWT 格式（Given-When-Then）
- 📌 AI 可根据用户故事自动生成测试用例框架

---

### 1.3 原型图与交互设计

**文件示例**: `PROTOTYPE_DESIGN.md` / Figma 链接

**核心内容**:
```markdown
# 原型设计说明

## 页面布局
### 客户列表页
┌────────────────────────────────────┐
│ [搜索框] [筛选下拉] [查询] [重置] │
├────────────────────────────────────┤
│ [+新增] [导入] [导出] [删除选中]   │
├────────────────────────────────────┤
│ 表格区域（姓名/等级/资产/操作）    │
│ [规则] [聚合] [关联] 引擎按钮      │
└────────────────────────────────────┘

## 交互流程
1. 用户点击"规则引擎" → 弹出确认框
2. 确认后显示 Loading 提示
3. 后端执行完成 → 显示成功消息（X 条推荐）
4. 自动刷新推荐列表
```

**AI 辅助价值**:
- 🎨 AI 可根据文字描述生成 ASCII 原型图
- 🎨 提供 Figma/Sketch 链接，AI 可识别组件层级
- 🎨 标注关键交互节点（点击/加载/反馈）

---

## 🏗️ 二、设计阶段文档

### 2.1 系统架构设计文档

**文件示例**: `SYSTEM_ARCHITECTURE.md` / `RECOMMENDATION_ENGINES_ARCHITECTURE.md` ✅

**核心内容**:
```markdown
# 系统架构设计

## 1. 技术栈选型
- 后端：NestJS + TypeORM + PostgreSQL
- 前端：React + Ant Design + TypeScript
- 缓存：Redis (CacheService)
- 队列：Bull (异步任务)

## 2. 整体架构图
```
┌─────────┐     ┌──────────┐     ┌──────────┐
│  Frontend │ --> │ Backend  │ --> │ Database │
│  (React)  │     │ (NestJS) │     │ (PostgreSQL)│
└─────────┘     └──────────┘     └──────────┘
                      ↓
                ┌──────────┐
                │  Redis   │
                └──────────┘
```

## 3. 核心模块设计
### 3.1 推荐引擎模块
- RuleEngine: 基于 JSON 规则表达式
- ClusteringEngine: K-Means 算法实现
- AssociationEngine: Apriori 关联规则
- FusionEngine: 加权融合 + 去重排序

## 4. 数据流设计
用户请求 → Controller → Service → Engine → Repository → DB
```

**经验教训**:
- ⚠️ **必须绘制清晰的模块关系图**，AI 才能准确理解依赖注入
- ⚠️ **明确数据流向**，避免 AI 生成循环依赖代码
- ✅ **提供技术选型理由**，AI 可推荐最佳实践

---

### 2.2 数据库设计文档

**文件示例**: `DATABASE_DESIGN.md`

**核心内容**:
```markdown
# 数据库设计

## ER 图
```
Customer (1) ----< TagRecommendation >---- (1) RecommendationRule
    |                                           |
    |                                           |
    v                                           v
CustomerTag                               ClusteringConfig
```

## 表结构

### customers
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PK | 主键 |
| name | VARCHAR(100) | NOT NULL | 姓名 |
| level | VARCHAR(20) | | 客户等级 |
| total_assets | DECIMAL(15,2) | | 总资产 |

### tag_recommendations
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | SERIAL | PK | |
| customer_id | INT | FK | 客户 ID |
| tag_name | VARCHAR(100) | | 标签名 |
| confidence | DECIMAL(5,4) | CHECK <= 1 | 置信度 |
| source | VARCHAR(20) | | rule/clustering/association |
```

**最佳实践**:
- 📊 提供完整 ER 关系图，AI 可自动生成 TypeORM Entity
- 📊 标注外键关系，AI 正确处理级联操作
- 📊 包含索引设计（如 `CREATE INDEX idx_customer_id ON tag_recommendations`）

---

### 2.3 API 接口设计文档

**文件示例**: `API_DESIGN.md` / Swagger OpenAPI Spec

**核心内容**:
```markdown
# API 接口设计

## RESTful 规范

### GET /api/v1/customers
**请求参数**:
```json
{
  "page": 1,
  "limit": 20,
  "keyword": "张三",
  "level": "GOLD"
}
```

**响应格式**:
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### POST /api/v1/recommendations/generate/:customerId
**请求 Body**:
```json
{
  "mode": "rule|clustering|association|all",
  "useCache": true
}
```

**Swagger 注解示例**:
```typescript
@ApiOperation({ summary: '手动触发推荐引擎' })
@ApiParam({ name: 'customerId', type: Number })
@ApiBody({
  schema: {
    properties: {
      mode: { enum: ['rule', 'clustering', 'association', 'all'] }
    }
  }
})
```
```

**AI 辅助亮点**:
- ✅ 提供 Swagger 注解模板，AI 可自动生成完整 Controller
- ✅ 明确 DTO 验证规则（class-validator 装饰器）
- ✅ 定义统一错误响应格式

---

## 💻 三、开发阶段文档

### 3.1 代码规范与约定

**文件示例**: `CODING_STANDARDS.md`

**核心内容**:
```markdown
# 代码规范

## 命名规范
- 变量：camelCase（如 `customerName`）
- 类名：PascalCase（如 `CustomerService`）
- 常量：UPPER_SNAKE_CASE（如 `MAX_RETRY_COUNT`）
- 文件名：kebab-case（如 `customer-list.tsx`）

## 目录结构
```
src/
├── common/         # 公共模块（ Guards/Interceptors/Filters）
├── infrastructure/ # 基础设施（Redis/Queue/Health）
├── modules/        # 业务模块
│   ├── customer/
│   ├── recommendation/
│   └── user/
└── main.ts
```

## Git 提交规范
```
feat: 新增推荐引擎融合功能
fix: 修复缓存命中率计算错误
docs: 更新 API 文档
test: 添加单元测试用例
refactor: 重构客户服务代码
```

## 注释规范
```typescript
/**
 * 为客户生成推荐标签
 * @param customerId - 客户 ID
 * @param options - 推荐选项
 * @returns 推荐标签数组
 */
async generateForCustomer(
  customerId: number,
  options: RecommendOptions = {}
): Promise<TagRecommendation[]> {
  // ...
}
```
```

**经验总结**:
- 📝 **必须在项目初期建立规范**，AI 生成的代码才能保持一致性
- 📝 提供 `.eslintrc.js`、`.prettierrc` 配置文件
- 📝 使用 `commitlint` 强制提交信息规范

---

### 3.2 核心算法与设计模式文档

**文件示例**: `ALGORITHM_DESIGN.md` / `DESIGN_PATTERNS.md`

**核心内容**:
```markdown
# 核心算法设计

## 1. K-Means 聚类算法
### 输入
- 特征矩阵：`features: number[][]`
- 簇数量：`k: number`

### 步骤
1. 初始化质心（K-Means++ 优化）
2. 分配样本到最近质心
3. 更新质心位置
4. 重复 2-3 直到收敛

### 伪代码
```
centroids = initializeCentroids(data, k)
while not converged:
  assignments = assignToNearestCentroid(data, centroids)
  newCentroids = calculateCentroids(data, assignments)
  if centroids == newCentroids:
    converged = true
```

## 2. Apriori 关联规则挖掘
### 关键概念
- 支持度：P(A)
- 置信度：P(B|A)
- 提升度：P(B|A) / P(B)
```

**设计模式应用**:
```markdown
# 设计模式使用记录

## 1. 策略模式 (Strategy Pattern)
**场景**: 多个推荐引擎可切换
```typescript
interface RecommendationStrategy {
  generateRecommendations(data: any): Promise<any[]>;
}

class RuleEngineService implements RecommendationStrategy {
  async generateRecommendations(data: any) { /* ... */ }
}
```

## 2. 工厂模式 (Factory Pattern)
**场景**: CacheService 创建缓存实例
```typescript
@Injectable()
export class CacheService {
  async getOrSet(key: string, getter: () => Promise<T>): Promise<T> {
    const cached = await this.get(key);
    if (cached) return cached;
    
    const result = await getter();
    await this.set(key, result);
    return result;
  }
}
```

## 3. 装饰器模式 (Decorator Pattern)
**场景**: @Cacheable 缓存装饰器
```typescript
function Cacheable(ttl: number): MethodDecorator {
  return (target, key, descriptor) => {
    const original = descriptor.value;
    descriptor.value = async function(...args) {
      // 添加缓存逻辑
    };
  };
}
```
```

**AI 辅助价值**:
- 🧠 提供算法伪代码，AI 可转换为精确的 TypeScript 实现
- 🧠 说明设计模式意图，AI 可在合适场景应用
- 🧠 标注性能关键点（如 K-Means++ 优化）

---

### 3.3 Git 提交历史文档

**文件示例**: `.git/logs/HEAD` / `CHANGELOG.md`

**核心内容**:
```markdown
# 变更日志

## [1.0.0] - 2026-03-30
### Added
- ✨ 实现四大推荐引擎（规则/聚类/关联/融合）
- ✨ 新增缓存模块（CacheModule）
- ✨ 添加客户管理 CRUD 功能

### Fixed
- 🐛 修复置信度溢出数据库问题（限制为 0.9999）
- 🐛 修复批量操作事务回滚逻辑

### Changed
- ♻️ 重构推荐服务，分离引擎调用与结果融合
- ⚡ 优化聚类性能（K-Means++ 初始化）

### Docs
- 📝 完善 API 文档和架构设计
- 📝 添加测试覆盖率报告
```

**最佳实践**:
- 📌 使用 `conventional-changelog-cli` 自动生成 CHANGELOG
- 📌 每个里程碑版本打 Tag（`git tag v1.0.0`）
- 📌 重大变更编写 MIGRATION_GUIDE.md

---

## 🧪 四、测试阶段文档

### 4.1 测试计划与策略文档

**文件示例**: `TEST_PLAN.md`

**核心内容**:
```markdown
# 测试计划

## 1. 测试范围
### 覆盖模块
- ✅ 客户管理模块（CRUD/RFM 分析）
- ✅ 推荐引擎模块（4 个引擎）
- ✅ 缓存模块（CacheService）
- ❌ 第三方集成（支付/短信）

### 不覆盖范围
- UI 自动化测试（仅手动测试）
- 性能压测（留待二期）

## 2. 测试类型
### 单元测试
- 框架：Jest (后端) / Vitest (前端)
- 目标：覆盖率 > 80%（核心模块）

### 集成测试
- 场景：推荐引擎端到端流程
- 工具：Supertest + TestContainers

### E2E 测试
- 工具：Playwright
- 浏览器：Chrome Headless

## 3. 测试环境
- 开发环境：localhost:3000
- 测试环境：test.example.com
- 预发环境：staging.example.com

## 4. 准入准出标准
### 准入
- 代码编译通过
- 静态检查无 Error

### 准出
- 单元测试通过率 100%
- 覆盖率 > 30%（短期目标）
- 严重 Bug 数为 0
```

**经验教训**:
- ⚠️ **明确测试优先级**：先单元测试后集成测试
- ⚠️ **设置合理覆盖率目标**：短期 30%，中期 50%，长期 80%
- ✅ **区分必测与选测**：核心业务逻辑 100% 覆盖，UI 组件选择性测试

---

### 4.2 测试用例文档

**文件示例**: `TEST_CASES.md` / Excel 测试用例表

**核心内容**:
```markdown
# 测试用例清单

## TC-001: 客户列表查询
**前置条件**: 数据库有 10 条客户记录
**步骤**:
1. GET /api/v1/customers?page=1&limit=10
2. 验证返回数据结构
3. 验证 pagination 字段

**预期结果**:
- status: 200
- data.length === 10
- total >= 10

## TC-002: 规则引擎执行
**前置条件**: 已激活规则"高价值客户识别"
**步骤**:
1. POST /api/v1/recommendations/generate/123
2. Body: { mode: 'rule' }
3. 检查 tag_recommendations 表

**预期结果**:
- 返回 success: true
- count > 0
- 数据库存在对应记录

## TC-003: 缓存命中率测试
**步骤**:
1. 第一次调用 getOrSet('key', getter)
2. 第二次调用相同参数
3. 检查 getter 调用次数

**预期结果**:
- 第一次：getter 执行，写入缓存
- 第二次：getter 不执行，返回缓存
- cacheHits: 1, cacheMisses: 1
```

**AI 辅助亮点**:
- ✅ AI 可根据用户故事自动生成测试用例草稿
- ✅ AI 可补充边界条件测试（空值/极端值/并发场景）
- ✅ AI 可生成 Mock 数据和断言逻辑

---

### 4.3 测试执行报告

**文件示例**: `TEST_REPORT_20260330.md` / `coverage/coverage-summary.txt` ✅

**核心内容**:
```markdown
# 测试执行报告

## 执行时间
2026-03-30 14:00 - 16:30

## 测试结果统计
### 单元测试
- 总用例数：274
- 通过：266 (97.1%)
- 失败：6 (2.2%)
- 跳过：2 (0.7%)

### 覆盖率统计
| 维度 | 覆盖率 | 目标 | 状态 |
|------|--------|------|------|
| Statements | 35.2% | 30% | ✅ |
| Branches | 28.5% | 25% | ✅ |
| Functions | 42.1% | 35% | ✅ |
| Lines | 35.8% | 30% | ✅ |

### 高覆盖率模块 (>80%)
- ✅ CacheService: 100%
- ✅ SimilarityService: 82.14%
- ✅ RuleEngine: 85%

### 零覆盖率模块（需补充）
- ❌ AuthModule (全部)
- ❌ ScoringService (部分方法)

## 失败用例分析
### FAIL src/modules/auth/auth.service.spec.ts
**原因**: bcrypt 模块缺失
**解决方案**: 安装 `npm install -D @types/bcrypt`

## 改进建议
1. 优先补充核心业务模块测试（Recommendation/Customer）
2. 修复 Auth 模块依赖问题
3. 下阶段目标：整体覆盖率 > 40%
```

**最佳实践**:
- 📊 每次测试运行后自动生成报告
- 📊 对比历史数据展示趋势（↑下降/↓提升）
- 📊 列出 Top 5 待改进模块

---

### 4.4 Bug 追踪与修复记录

**文件示例**: `BUG_TRACKING.md` / GitHub Issues

**核心内容**:
```markdown
# Bug 追踪清单

## BUG-001: 置信度溢出数据库
**严重程度**: 🔴 High
**发现时间**: 2026-03-30
**复现步骤**:
1. 执行融合引擎
2. 多来源加成导致置信度 > 1.0
3. 保存时数据库报错 numeric field overflow

**根本原因**: 
缺少置信度上限校验

**修复方案**:
```typescript
// 修复前
confidence: fusedConfidence

// 修复后
confidence: Math.min(fusedConfidence, 0.9999)
```

**验证结果**: ✅ 已修复，添加测试用例验证边界值

---

## BUG-002: 批量操作事务未回滚
**严重程度**: 🟡 Medium
**修复状态**: 🔄 In Progress
```

**经验总结**:
- 🐛 使用 Issue Template 标准化 Bug 报告
- 🐛 标注严重程度（High/Medium/Low）
- 🐛 记录根本原因（Root Cause）而不仅是现象

---

## 🚀 五、上线阶段文档

### 5.1 部署手册

**文件示例**: `DEPLOYMENT_GUIDE.md`

**核心内容**:
```markdown
# 部署手册

## 1. 环境准备
### 服务器配置
- CPU: 4 核
- 内存：8GB
- 磁盘：50GB SSD

### 依赖服务
- PostgreSQL 14+
- Redis 6+
- Node.js 18+

## 2. 部署步骤
### 2.1 克隆代码
```bash
git clone https://github.com/your-org/customer-label.git
cd customer-label
git checkout v1.0.0
```

### 2.2 安装依赖
```bash
npm install --production
```

### 2.3 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 填写数据库密码等
```

### 2.4 数据库迁移
```bash
npm run typeorm migration:run
```

### 2.5 启动服务
```bash
# PM2 方式
pm2 start ecosystem.config.js

# Docker 方式
docker-compose up -d
```

## 3. 验证检查清单
- [ ] 健康检查端点：GET /health 返回 200
- [ ] 数据库连接正常
- [ ] Redis 连接正常
- [ ] 前端页面可访问
- [ ] 核心 API 测试通过

## 4. 回滚方案
### 回滚触发条件
- 严重 Bug 影响核心功能
- 性能下降超过 50%
- 数据不一致

### 回滚步骤
```bash
# 1. 切换到上一个稳定版本
git checkout v0.9.0
npm install
pm2 restart all

# 2. 数据库回滚
npm run typeorm migration:revert
```
```

**AI 辅助价值**:
- 🤖 AI 可生成 Dockerfile、docker-compose.yml 模板
- 🤖 AI 可生成 Kubernetes YAML 配置
- 🤖 AI 可提供不同云厂商（AWS/Azure/阿里云）部署脚本

---

### 5.2 上线验收报告

**文件示例**: `ACCEPTANCE_REPORT.md`

**核心内容**:
```markdown
# 上线验收报告

## 项目信息
- 项目名称：客户标签推荐系统
- 版本号：v1.0.0
- 上线日期：2026-03-30

## 验收结果
### 功能验收 ✅
- 客户管理：100% 通过
- 推荐引擎：100% 通过
- 配置管理：95% 通过（关联规则配置待修复）

### 性能验收 ✅
- API 平均响应：234ms (< 500ms ✅)
- 引擎执行：1.2s (< 5s ✅)
- 前端首屏：1.5s (< 2s ✅)

### 安全验收 ✅
- JWT 认证：正常
- SQL 注入防护：通过
- XSS 防护：通过

## 遗留问题
1. ⚠️ 关联规则配置管理批量操作存在类型错误（P2，计划 v1.1.0 修复）
2. ⚠️ 测试覆盖率 35%（目标 50%，持续改进中）

## 签字确认
- 产品经理：__________ 日期：__________
- 技术负责人：__________ 日期：__________
- 测试工程师：__________ 日期：__________
```

---

### 5.3 用户手册与培训资料

**文件示例**: `USER_MANUAL.md` / `TRAINING_MATERIAL.md`

**核心内容**:
```markdown
# 用户手册

## 快速入门
### 1. 登录系统
访问 http://your-domain.com，使用分配的账号登录

### 2. 查看客户列表
导航栏点击"客户管理" → "客户列表"

### 3. 触发推荐引擎
在客户列表操作列，点击"规则"按钮

### 4. 查看推荐结果
导航栏点击"推荐管理" → "推荐列表"

## 常见问题
### Q: 推荐引擎执行失败？
A: 检查客户是否有足够的数据（订单/资产），至少需要 3 条记录

### Q: 如何导出客户数据？
A: 在客户列表点击"导出"按钮，选择 Excel/CSV 格式

## 视频教程
- [客户管理操作视频](link-to-video)
- [推荐引擎配置教程](link-to-video)
```

**最佳实践**:
- 📹 录制屏幕操作视频（Loom/OBS）
- 📹 提供 FAQ 知识库
- 📹 定期组织用户培训会议

---

## 🔧 六、运维阶段文档

### 6.1 监控与告警文档

**文件示例**: `MONITORING_SETUP.md`

**核心内容**:
```markdown
# 监控配置手册

## 1. 监控指标
### 应用层
- HTTP 请求量（QPS）
- 响应时间（P95/P99）
- 错误率（5xx 占比）

### 业务层
- 推荐引擎执行次数
- 缓存命中率
- 推荐接受率

### 基础设施层
- CPU 使用率
- 内存使用率
- 磁盘 IO

## 2. 告警规则
### Critical (电话通知)
- 服务不可用 > 1 分钟
- 数据库连接失败

### Warning (邮件通知)
- CPU > 80% 持续 5 分钟
- 错误率 > 5%

## 3. Grafana Dashboard
- URL: http://grafana.example.com
- Dashboard ID: customer-label-prod

## 4. 日志收集
- ELK Stack: Elasticsearch + Logstash + Kibana
- 日志级别：INFO (生产), DEBUG (开发)
```

**AI 辅助亮点**:
- 📊 AI 可生成 Prometheus 配置模板
- 📊 AI 可提供 Grafana Dashboard JSON 导出
- 📊 AI 可编写日志分析脚本

---

### 6.2 问题追踪与复盘报告

**文件示例**: `INCIDENT_REPORT_20260330.md`

**核心内容**:
```markdown
# 生产事件复盘报告

## 事件概述
**时间**: 2026-03-30 15:30-16:00  
**影响**: 推荐引擎执行失败 30 分钟  
**严重程度**: P1

## 时间线
- 15:30 监控告警（错误率突增）
- 15:35 值班工程师介入
- 15:45 定位原因为 Redis 连接池耗尽
- 15:55 重启服务临时恢复
- 16:00 服务恢复正常

## 根本原因分析 (5 Why)
1. Why: Redis 连接池耗尽？
   → 并发请求过多，默认连接数不足

2. Why: 并发请求突增？
   → 运营活动触发批量推荐生成

3. Why: 连接池未自动扩容？
   → 配置固定大小（max: 10）

4. Why: 未设置动态扩容？
   → 初期设计未考虑高并发场景

5. Why: 压力测试未发现？
   → 测试数据量不足（仅 100 条）

## 改进措施
### 短期（1 周内）
- ✅ 增加 Redis 连接池配置（max: 50）
- ✅ 添加连接池监控指标

### 中期（1 个月内）
- 🔄 实现连接池自动扩容
- 🔄 引入请求限流（Rate Limiter）

### 长期（3 个月内）
- 🔄 架构升级（微服务拆分）
- 🔄 全链路压测常态化

## 经验教训
1. 容量规划要考虑业务增长
2. 监控要覆盖连接池等底层资源
3. 压力测试要模拟真实场景
```

**最佳实践**:
- 🔍 使用 5 Why 分析法找到根本原因
- 🔍 区分短期/中期/长期改进措施
- 🔍 明确责任人和截止日期

---

### 6.3 性能优化报告

**文件示例**: `PERFORMANCE_OPTIMIZATION_REPORT.md`

**核心内容**:
```markdown
# 性能优化报告

## 优化背景
- 初始性能：推荐引擎平均执行时间 3.5s
- 目标性能：< 1s
- 优化周期：2 周

## 优化措施
### 1. 缓存优化
**问题**: 重复查询数据库
**方案**: 引入 Redis 缓存相似客户查询结果
**效果**: 500ms → 50ms (10 倍提升)

### 2. 并行执行
**问题**: 三个引擎串行执行
**方案**: 使用 Promise.all() 并行调用
**效果**: 3.5s → 1.5s

### 3. 算法优化
**问题**: K-Means 初始化随机性大
**方案**: 采用 K-Means++ 优化
**效果**: 收敛迭代次数从 50 降至 15

### 4. 数据库索引
**问题**: 全表扫描
**方案**: 添加复合索引
```sql
CREATE INDEX idx_customer_level_assets 
ON customers(level, total_assets);
```
**效果**: 查询从 200ms → 20ms

## 性能对比
| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 平均响应时间 | 3.5s | 0.8s | 77% ↓ |
| P95 响应时间 | 5.2s | 1.2s | 77% ↓ |
| 缓存命中率 | 0% | 85% | - |
| QPS | 50 | 300 | 6 倍 ↑ |

## 后续优化方向
1. 引入机器学习模型替代规则引擎
2. 使用 GPU 加速聚类计算
3. 实现增量更新避免全量重算
```

---

## 📁 七、文档管理最佳实践

### 7.1 文档版本控制

```markdown
# 文档版本管理规范

## 版本号规则
- 主版本号：重大架构变更（如 v1.0.0 → v2.0.0）
- 次版本号：功能新增（如 v1.0.0 → v1.1.0）
- 修订号：Bug 修复/文档勘误（如 v1.0.0 → v1.0.1）

## Git 分支策略
```
master (生产)
  ↑
develop (开发)
  ↑
feature/* (功能分支)
```

## 文档评审流程
1. 作者起草文档
2. 技术评审（Peer Review）
3. 产品经理审核
4. 归档到 Wiki/GitBook
```

---

### 7.2 文档模板库

建议建立统一的文档模板仓库：

```
docs-templates/
├── PRD_TEMPLATE.md          # 产品需求文档模板
├── ARCHITECTURE_TEMPLATE.md # 架构设计模板
├── API_DESIGN_TEMPLATE.md   # API 设计模板
├── TEST_CASE_TEMPLATE.md    # 测试用例模板
├── TEST_REPORT_TEMPLATE.md  # 测试报告模板
├── DEPLOYMENT_TEMPLATE.md   # 部署手册模板
└── INCIDENT_TEMPLATE.md     # 事件复盘模板
```

**AI 辅助价值**:
- 🤖 AI 可根据模板快速生成文档初稿
- 🤖 AI 可检查文档完整性（是否缺失关键章节）
- 🤖 AI 可自动更新文档中的代码示例

---

### 7.3 文档质量检查清单

```markdown
# 文档质量检查清单

## 完整性检查
- [ ] 是否包含所有必需章节
- [ ] 是否有清晰的目录结构
- [ ] 是否有版本历史记录
- [ ] 是否有相关文档链接

## 准确性检查
- [ ] 代码示例是否可运行
- [ ] 数据是否最新
- [ ] 术语是否统一
- [ ] 图表是否清晰

## 可读性检查
- [ ] 语句是否通顺
- [ ] 是否有错别字
- [ ] 格式是否一致
- [ ] 是否避免歧义

## 实用性检查
- [ ] 是否有具体示例
- [ ] 是否有操作步骤
- [ ] 是否有故障排查指南
- [ ] 是否有最佳实践建议
```

---

## 🎯 八、AI 辅助文档生成技巧

### 8.1 Prompt 工程

**优秀 Prompt 示例**:
```
请根据以下信息生成产品需求文档（PRD）：

【项目背景】
我们需要构建一个客户标签推荐系统，解决客户数据分散、营销效率低的问题。

【核心功能】
1. 客户管理（CRUD、批量导入导出、RFM 分析）
2. 推荐引擎（规则/聚类/关联/融合四种引擎）
3. 配置管理（规则配置、聚类参数调整）

【性能要求】
- API 响应时间 < 500ms
- 推荐引擎执行 < 5s
- 支持 1000 并发用户

【验收标准】
- 功能完整性 100%
- 测试覆盖率 > 80%
- 用户满意度 > 4.5/5

请按照标准 PRD 格式输出，包含：
1. 项目背景与目标
2. 功能需求详细说明
3. 非功能需求（性能/安全/可用性）
4. 验收标准与测试策略
5. 风险评估与应对措施
```

**Prompt 设计原则**:
- 🎯 **明确角色**: "你是一位资深产品经理"
- 🎯 **提供上下文**: 项目背景、目标用户、业务场景
- 🎯 **指定格式**: Markdown/Word/Excel
- 🎯 **列出要点**: 必须包含的章节和内容
- 🎯 **给出示例**: 参考文档或样例

---

### 8.2 文档自动生成工作流

```
需求讨论会议纪要
       ↓
  AI 整理成 PRD
       ↓
  人工审核修改
       ↓
AI 生成架构设计草稿
       ↓
  架构师评审完善
       ↓
AI 生成测试用例框架
       ↓
  测试工程师补充细节
       ↓
AI 生成部署脚本
       ↓
  DevOps 工程师验证
```

**工具链推荐**:
- 📝 **Markdown 编辑器**: Typora / VS Code + Markdown All in One
- 📊 **图表工具**: Draw.io / Excalidraw / Mermaid
- 📚 **文档平台**: GitBook / Confluence / Notion
- 🤖 **AI 助手**: GitHub Copilot / Cursor / 通义灵码

---

## 📊 九、文档成熟度评估模型

### 文档成熟度等级

| 等级 | 特征 | 适用场景 |
|------|------|---------|
| **L1 初始级** | 口头沟通为主，零星文档 | 原型验证（PoC） |
| **L2 可重复级** | 关键文档齐全（PRD/架构/API） | 小团队内部项目 |
| **L3 已定义级** | 标准化模板，版本控制 | 正式商业项目 ✅ |
| **L4 已管理级** | 质量度量，持续改进 | 大型企业级应用 |
| **L5 优化级** | 数据驱动，自动化生成 | 行业标杆 |

**本项目当前状态**: L3（已定义级）✅

---

## 🔮 十、持续改进建议

### 10.1 文档维护机制

```markdown
# 文档维护 SOP

## 定期审查
- 频率：每季度一次
- 参与者：产品经理 + 技术负责人 + 测试主管
- 检查项：
  - 文档是否与代码一致
  - 是否有过期内容
  - 是否有缺失章节

## 更新流程
1. 发现文档问题 → 创建 Issue
2. 指派责任人 → 限期修复
3. 修复完成后 → Peer Review
4. 合并到主分支 → 发布新版本

## 知识传承
- 新人入职必读文档清单
- 定期组织文档编写培训
- 建立文档贡献奖励机制
```

---

### 10.2 经验教训知识库

```markdown
# 经验教训知识库 (Lessons Learned)

## 分类标签
- #需求管理
- #架构设计
- #开发实践
- #测试策略
- #部署运维
- #团队协作

## 条目格式
### 标题
**类别**: 需求管理  
**时间**: 2026-03-30  
**描述**: 需求变更未及时同步导致返工  
**影响**: 浪费 3 人天  
**改进措施**: 建立需求变更审批流程  
**相关链接**: [[需求管理流程]]
```

---

## 📋 总结：核心文档清单（按优先级）

### P0（必须文档）✅
1. ✅ **产品需求文档 (PRD)** - 明确做什么
2. ✅ **系统架构设计** - 明确怎么做
3. ✅ **API 接口文档** - 前后端协作基础
4. ✅ **数据库设计文档** - 数据结构定义
5. ✅ **测试报告** - 质量证明
6. ✅ **部署手册** - 上线必备

### P1（重要文档）📌
7. 📌 **用户故事与用例** - 敏捷开发输入
8. 📌 **代码规范** - 保证代码质量
9. 📌 **测试用例** - 指导测试执行
10. 📌 **用户手册** - 帮助用户使用
11. 📌 **监控告警配置** - 运维保障

### P2（增强文档）💡
12. 💡 **核心算法设计** - 技术深度体现
13. 💡 **设计模式应用** - 最佳实践沉淀
14. 💡 **性能优化报告** - 持续改进记录
15. 💡 **事件复盘报告** - 避免重复犯错
16. 💡 **变更日志** - 版本演进历史

---

## 🎁 附录：文档模板下载

所有文档模板已整理到项目仓库：

```bash
# 克隆模板仓库
git clone https://github.com/your-org/docs-templates.git

# 或使用本项目的文档
cd customer-label/docs/templates
```

**在线预览**:
- PRD 模板：[链接]
- 架构设计模板：[链接]
- 测试报告模板：[链接]

---

**文档版本**: v1.0  
**编制日期**: 2026-03-30  
**编制人**: AI Assistant  
**审核人**: [待填写]  
**批准人**: [待填写]

---

**© 2026 客户标签推荐系统项目组 版权所有**
