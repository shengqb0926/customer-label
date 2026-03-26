# 变更提案：客户标签智能推荐系统

## 📋 基本信息

- **变更 ID**: add-smart-tag-recommendation
- **创建日期**: 2026-03-26
- **状态**: Draft
- **作者**: AI Assistant
- **优先级**: High

## 🎯 背景和目标

### 问题陈述

当前客户标签管理系统存在以下痛点：

1. **标签创建效率低**：用户需要手动创建每个标签，耗时耗力
2. **标签质量参差不齐**：不同用户创建的标签规范不统一，难以标准化管理
3. **标签重复率高**：相似标签重复创建，导致数据冗余
4. **标签使用率低**：创建的标签与实际业务场景匹配度不高

### 目标

1. **智能标签推荐**：基于客户数据和行为模式，自动推荐合适的标签
2. **标签标准化建议**：提供标签命名规范和分类建议
3. **相似度检测**：识别并合并相似标签，减少冗余
4. **使用场景预测**：根据历史数据预测标签的使用价值

## 💡 技术方案概述

### 核心功能

#### 1. 客户数据分析引擎

**功能描述**：
- 分析客户基本信息（行业、规模、地区等）
- 提取客户行为特征（购买频次、客单价、互动频率等）
- 识别客户生命周期阶段

**技术实现**：
```typescript
interface CustomerProfile {
  industry: string;
  companySize: 'small' | 'medium' | 'large';
  region: string;
  purchaseFrequency: number;
  averageOrderValue: number;
  engagementScore: number;
  lifecycleStage: 'new' | 'active' | 'churning' | 'churned';
}
```

#### 2. 标签推荐算法

**推荐策略**：
- **基于规则推荐**：根据预定义的业务规则生成标签
  - 例如：月消费 > 10000 → "高价值客户"
  - 例如：30 天未下单 → "需唤醒客户"
  
- **基于聚类推荐**：使用 K-Means 等算法发现客户群体特征
  - 自动识别相似客户群
  - 为群体生成共性标签
  
- **基于关联推荐**：分析标签共现关系
  - 已有"企业客户"标签 → 推荐"批量采购"标签
  - 已有"高频购买"标签 → 推荐"忠诚客户"标签

#### 3. 标签质量评分

**评分维度**：
| 维度 | 权重 | 说明 |
|------|------|------|
| 覆盖率 | 30% | 标签可应用的客户比例 |
| 区分度 | 25% | 标签对客户分群的区分能力 |
| 稳定性 | 20% | 标签值随时间变化的稳定性 |
| 业务价值 | 25% | 标签对业务决策的指导意义 |

**评分示例**：
```json
{
  "tagName": "高价值客户",
  "overallScore": 87,
  "breakdown": {
    "coverage": 0.92,
    "discrimination": 0.85,
    "stability": 0.78,
    "businessValue": 0.95
  },
  "recommendation": "强烈推荐"
}
```

#### 4. 标签冲突检测

**检测类型**：
- **命名冲突**：检测同名或高度相似的标签名称
- **逻辑冲突**：识别互斥的标签组合
  - 例如："高价值客户" 与 "低消费客户" 不应同时存在
- **冗余检测**：发现含义重复的标签

### 技术选型

#### 后端技术栈
- **运行时**: Node.js 18+
- **语言**: TypeScript 5.0+
- **机器学习**: TensorFlow.js 或 Brain.js
- **数据处理**: Lodash, Math.js
- **数据库**: PostgreSQL (支持 JSON 和向量索引)

#### 前端技术栈
- **框架**: React 18+
- **UI 组件**: Ant Design 或 Material UI
- **可视化**: ECharts 或 Chart.js
- **状态管理**: Zustand 或 Redux Toolkit

#### 基础设施
- **缓存**: Redis (用于推荐结果缓存)
- **消息队列**: Bull (用于异步标签计算)
- **API 风格**: RESTful + GraphQL (复杂查询)

## 🔍 影响范围

### 受影响的模块

1. **新增模块**:
   - `src/recommender/` - 推荐引擎核心
     - `analyzer.ts` - 客户数据分析
     - `recommender.ts` - 标签推荐算法
     - `scorer.ts` - 标签质量评分
     - `conflict-detector.ts` - 冲突检测

2. **修改模块**:
   - `src/tags/` - 标签管理模块
     - 新增推荐接口调用
     - 更新标签创建流程
   - `src/api/` - API 层
     - 新增推荐相关端点
   - `src/database/` - 数据层
     - 新增推荐结果表
     - 新增标签评分表

### 数据库变更

```sql
-- 标签推荐记录表
CREATE TABLE tag_recommendations (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  recommended_tags TEXT[] NOT NULL,
  recommendation_source VARCHAR(50), -- 'rule', 'clustering', 'association'
  confidence_score DECIMAL(5,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_accepted BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 标签评分表
CREATE TABLE tag_scores (
  id SERIAL PRIMARY KEY,
  tag_id INTEGER NOT NULL UNIQUE,
  coverage_score DECIMAL(5,4),
  discrimination_score DECIMAL(5,4),
  stability_score DECIMAL(5,4),
  business_value_score DECIMAL(5,4),
  overall_score DECIMAL(5,4),
  last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- 创建索引
CREATE INDEX idx_recommendations_customer ON tag_recommendations(customer_id);
CREATE INDEX idx_recommendations_source ON tag_recommendations(recommendation_source);
CREATE INDEX idx_tag_scores_overall ON tag_scores(overall_score DESC);
```

### API 变更

#### 新增端点

```typescript
// 获取标签推荐
POST /api/tags/recommendations
Request:
{
  customerId?: number,
  limit?: number,
  includeScores?: boolean
}

Response:
{
  recommendations: Array<{
    tagName: string,
    category: string,
    confidence: number,
    reason: string,
    source: 'rule' | 'clustering' | 'association'
  }>
}

// 获取标签质量评分
GET /api/tags/:id/score

Response:
{
  tagId: number,
  overallScore: number,
  breakdown: {
    coverage: number,
    discrimination: number,
    stability: number,
    businessValue: number
  }
}

// 检测标签冲突
POST /api/tags/conflicts
Request:
{
  tagNames: string[]
}

Response:
{
  conflicts: Array<{
    type: 'naming' | 'logical' | 'redundancy',
    tags: string[],
    severity: 'high' | 'medium' | 'low',
    suggestion: string
  }>
}
```

## ⚠️ 回滚方案

如果功能上线后出现问题：

### 第一阶段：功能降级
1. 关闭实时推荐，改为定时批量计算
2. 降低推荐频率，从实时改为每日更新
3. 仅保留基于规则的推荐（最稳定）

### 第二阶段：完全回滚
1. 通过功能开关禁用整个推荐模块
2. 恢复原有的标签创建流程
3. 推荐数据保留在数据库中但不使用
4. 可随时重新启用

### 数据安全
1. 所有推荐记录都有 `is_accepted` 标记
2. 用户未接受的推荐不影响现有业务
3. 回滚时仅需删除新字段，不影响主表

## 📊 性能和安全性评估

### 性能影响

#### 计算负载
- **单次推荐计算**: 预计 100-500ms
- **批量推荐** (1000 客户): 预计 2-5 分钟
- **推荐更新频率**: 每日凌晨 2 点全量更新

#### 存储需求
- 推荐结果表：预计每月增长 10-50 万条记录
- 标签评分表：每个标签一条记录，增长缓慢
- 建议使用分区表管理历史推荐数据

#### 优化策略
1. **缓存策略**: Redis 缓存热门客户的推荐结果（TTL: 24 小时）
2. **增量计算**: 仅重新计算有行为变化的客户
3. **异步处理**: 使用消息队列异步处理批量推荐

### 安全性考虑

#### 数据隐私
- ✅ 推荐计算仅使用业务数据，不涉及敏感信息
- ✅ 客户数据脱敏后用于模型训练
- ✅ 符合 GDPR 数据最小化原则

#### 访问控制
- ✅ 推荐 API 需要认证和授权
- ✅ 仅管理员可查看和管理推荐规则
- ✅ 普通用户仅能查看自己客户的推荐

#### 审计日志
- ✅ 记录所有推荐的生成和采纳情况
- ✅ 追踪标签创建来源（人工 or 推荐）
- ✅ 定期生成推荐效果报告

## ✅ 验收标准

### 功能验收

- [ ] **基础推荐功能**
  - [ ] 能够为单个客户生成标签推荐
  - [ ] 能够批量为多个客户生成推荐
  - [ ] 推荐响应时间 < 500ms（单个客户）

- [ ] **推荐质量**
  - [ ] 用户对推荐的采纳率 > 60%
  - [ ] 推荐标签的准确率 > 80%（与人工标注对比）
  - [ ] 覆盖主流业务场景（至少 10 种推荐规则）

- [ ] **标签评分**
  - [ ] 所有活跃标签都有评分
  - [ ] 评分更新延迟 < 24 小时
  - [ ] 评分结果可视化展示

- [ ] **冲突检测**
  - [ ] 能够识别命名冲突
  - [ ] 能够识别逻辑冲突
  - [ ] 提供合理的解决建议

### 性能验收

- [ ] API 响应时间 P95 < 500ms
- [ ] 系统支持并发 100 次推荐请求
- [ ] 批量推荐 1000 客户 < 5 分钟
- [ ] 缓存命中率 > 70%

### 代码质量

- [ ] TypeScript 严格模式编译通过
- [ ] 单元测试覆盖率 > 90%
- [ ] 集成测试覆盖所有核心流程
- [ ] 代码审查通过团队审核

### 文档完整性

- [ ] API 文档完整且准确
- [ ] 用户使用指南完成
- [ ] 运维部署文档完成
- [ ] 故障排查手册完成

## 📅 项目里程碑

### Phase 1: 基础架构（2 周）
- 完成数据库设计
- 搭建推荐引擎框架
- 实现基于规则的推荐

### Phase 2: 算法优化（2 周）
- 实现聚类推荐算法
- 实现关联推荐算法
- 开发标签评分系统

### Phase 3: 集成测试（1 周）
- API 开发和测试
- 前端界面集成
- 性能优化

### Phase 4: 上线部署（1 周）
- 灰度发布
- 监控和告警
- 用户培训

---

**下一步**: 
1. 创建设计文档 (`design.md`)
2. 创建任务列表 (`tasks.md`)
3. 开始实施（使用 `/opsx:apply` 命令）

**审批状态**: 待审批

**相关人员**:
- 产品负责人：待定
- 技术负责人：待定
- 开发团队：待定
