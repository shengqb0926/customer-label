# 功能规范：客户标签智能推荐系统

## 📊 文档版本

- **v1.0**: 初始规范（计划版） - 2026-03-26
- **v2.0**: 实际实现版（Phase 1 & 2 完成） - 2026-03-27

## 📋 完成情况概览

| 模块 | 功能 | 状态 | API 端点 | 测试覆盖 | 说明 |
|------|------|------|----------|----------|------|
| **数据库** | 5 个核心表 | ✅ 已完成 | - | - | 17 个索引优化 |
| **缓存** | RedisService | ✅ 已完成 | - | 13 项测试 | 支持多种数据类型 |
| **队列** | QueueService | ✅ 已完成 | - | 9 项测试 | 支持优先级调度 |
| **推荐模块** | RecommendationService | ✅ 基础完成 | 6 个 | ⏳ 待补充 | 框架就绪，算法待实现 |
| **评分模块** | ScoringService | ✅ 基础完成 | 6 个 | 72.72% | 综合评分完成，高级评分器待实现 |
| **反馈模块** | FeedbackService | ✅ 基础完成 | 6 个 | ⏳ 待补充 | 统计功能完成 |
| **认证模块** | AuthService | ✅ 已完成 | 3 个 | 100% | JWT + RBAC 完整实现 |
| **规则引擎** | RuleEngine | ⏳ Phase 3 | - | - | 待实现 |
| **聚类引擎** | ClusteringEngine | ⏳ Phase 3 | - | - | 待实现 |
| **关联引擎** | AssociationEngine | ⏳ Phase 3 | - | - | 待实现 |

---

## 1. 概述

本文档定义了客户标签智能推荐系统的详细功能规范，包括需求定义、接口设计、数据模型和验收标准。

### 1.1 Phase 1 & 2 已实现能力 ✅

**基础设施**:
- ✅ NestJS 模块化架构（符合 CODE_STYLE_GUIDE.md）
- ✅ PostgreSQL + TypeORM 数据层（5 个表，17 个索引）
- ✅ Redis 缓存系统（RedisService + CacheService）
- ✅ Bull 消息队列（QueueService + RecommendationQueueHandler）
- ✅ JWT 认证授权（JWT + Local Strategy + RBAC）
- ✅ Winston 日志系统（5 级日志）
- ✅ Prometheus 监控（/health, /ready, /metrics）

**业务模块**:
- ✅ RecommendationModule: 6 个 API 端点，180 行服务代码
- ✅ ScoringModule: 6 个 API 端点，195 行服务代码
- ✅ FeedbackModule: 6 个 API 端点，165 行服务代码
- ✅ AuthModule: 3 个 API 端点，80 行服务代码，100% 测试覆盖

**测试质量**:
- ✅ 34 个测试用例全部通过
- ✅ AuthModule: 100% 覆盖（18 个测试）
- ✅ ScoringService: 72.72% 覆盖（8 个测试）
- ✅ Jest 配置完善，生成 HTML + Clover 报告

### 1.2 Phase 3-5 待实现 ⏳

**核心算法**（预计 40 小时）:
- ⏳ RuleEngine 规则引擎
- ⏳ ClusteringEngine 聚类引擎
- ⏳ AssociationEngine 关联引擎
- ⏳ 推荐融合引擎
- ⏳ 冲突检测器
- ⏳ 高级评分器（IV 值、PSI 等）

**前端集成**（预计 24 小时）:
- ⏳ React 管理后台
- ⏳ 推荐展示页面
- ⏳ 评分可视化
- ⏳ 冲突检测界面

**优化部署**（预计 14 小时）:
- ⏳ 性能优化
- ⏳ 安全加固
- ⏳ Docker 容器化
- ⏳ CI/CD配置

---

## 2. 功能需求

### 2.1 客户数据分析 ⏳（Phase 3）

#### 2.1.1 客户画像构建

**Given** 一个有效的客户 ID  
**When** 调用 `analyzeCustomer` 方法  
**Then** 返回完整的客户画像数据

**当前状态**: 
- ✅ 数据库实体类已定义
- ✅ API 端点已就绪
- ⏳ 数据分析逻辑待实现（Phase 3）

**输入示例**:
```json
{
  "customerId": 12345
}
```

**输出示例**:
``json
{
  "customerId": 12345,
  "profile": {
    "industry": "零售业",
    "companySize": "medium",
    "region": "华东",
    "registrationDate": "2025-06-15",
    "lifecycleStage": "active"
  },
  "behaviorMetrics": {
    "purchaseFrequency": 4.5,
    "averageOrderValue": 8500.00,
    "totalOrders": 23,
    "totalRevenue": 195500.00,
    "lastPurchaseDate": "2026-03-20",
    "engagementScore": 78.5,
    "responseRate": 0.65
  },
  "existingTags": [
    {"id": 1, "name": "企业客户"},
    {"id": 5, "name": "高频购买"}
  ]
}
```

**约束条件**:
- ✅ 响应时间 < 100ms（使用 Redis 缓存）
- ✅ 数据必须来自权威数据源（CRM 系统）
- ⏳ 敏感字段需要脱敏处理（Phase 3）

#### 2.1.2 行为特征提取 ⏳（Phase 3）

**Given** 客户的历史行为数据  
**When** 执行特征提取  
**Then** 生成结构化的特征向量

**特征维度**:
1. **交易特征** (权重 40%) ⏳
   - 消费金额分布
   - 购买频次趋势
   - 客单价变化
   - 支付方式偏好

2. **互动特征** (权重 30%) ⏳
   - 邮件打开率
   - 活动参与度
   - 客服咨询频次
   - 社交媒体互动

3. **时间特征** (权重 20%) ⏳
   - 客户生命周期阶段
   - 最近一次互动时间
   - 季节性购买模式

4. **其他特征** (权重 10%) ⏳
   - 产品类别偏好
   - 渠道偏好
   - 地理位置特征

### 2.2 标签推荐引擎 ✅（框架完成）⏳（算法待实现）

#### 2.2.1 基于规则的推荐 ⏳（Phase 3）

**Given** 客户画像和行为特征  
**When** 应用预定义的业务规则  
**Then** 生成符合规则的标签推荐

**当前状态**:
- ✅ RecommendationService 框架已搭建（180 行）
- ✅ API 端点已实现并可通过 Swagger 访问
- ⏳ RuleEngine 待实现（Phase 3 核心任务）

**规则示例**:

``typescript
// 规则 1: 高价值客户识别 ⏳
IF (monthly_revenue > 10000 AND purchase_frequency >= 3)
THEN recommend("高价值客户", confidence: 0.95)

// 规则 2: 流失风险预警 ⏳
IF (days_since_last_purchase > 60 AND previous_frequency > 2)
THEN recommend("流失风险", confidence: 0.85)

// 规则 3: 潜力客户挖掘 ⏳
IF (engagement_score > 70 AND total_orders < 5)
THEN recommend("潜力客户", confidence: 0.75)

// 规则 4: 交叉销售机会 ⏳
IF (category_count >= 3 AND avg_order_value > 5000)
THEN recommend("交叉销售目标", confidence: 0.80)
```

**验收标准**:
- ⏳ 规则引擎可以正确评估客户数据
- ⏳ 预定义规则都能正常工作（至少 4 个规则）
- ⏳ 规则管理 API 可用（CRUD + 激活/停用）
- ⏳ 单元测试覆盖率 > 90%

#### 2.2.2 基于聚类的推荐 ⏳（Phase 3）

**Given** 一群客户的特征数据  
**When** 执行聚类算法  
**Then** 将客户划分为不同的群体，并为每个群体生成标签

**算法要求**:
- ⏳ 使用 K-Means 或 DBSCAN 算法
- ⏳ 自动确定最优 K 值（肘部法则）
- ⏳ 簇质量评估（轮廓系数 > 0.5）
- ⏳ 性能要求：1000 客户 < 2 分钟

**当前状态**:
- ⏳ ClusteringEngine 待实现
- ⏳ TensorFlow.js 或替代库选型

#### 2.2.3 基于关联的推荐 ⏳（Phase 3）

**Given** 历史标签使用数据  
**When** 分析标签共现关系  
**Then** 发现关联规则并用于推荐

**算法要求**:
- ⏳ 使用 Apriori 或 FP-Growth 算法
- ⏳ 最小支持度 > 0.1
- ⏳ 最小置信度 > 0.6
- ⏳ 最小提升度 > 1.5

**当前状态**:
- ⏳ AssociationEngine 待实现

### 2.3 标签评分系统 ✅（基础完成）⏳（增强待 Phase 3）

#### 2.3.1 综合评分计算 ✅（已完成）

**Given** 一个标签及其统计数据  
**When** 计算各项评分指标  
**Then** 生成综合评分和等级

**当前状态**:
- ✅ ScoringService 已实现（195 行）
- ✅ 覆盖率评分完成
- ✅ 综合评分计算完成
- ✅ 等级划分完成（S/A/B/C/D）
- ⏳ 区分度、稳定性、业务价值评分待实现（Phase 3）

**评分公式**:
``typescript
overallScore = coverage * 0.30 + discrimination * 0.25 + 
               stability * 0.20 + businessValue * 0.25

grade = overallScore >= 0.9 ? 'S' :
        overallScore >= 0.8 ? 'A' :
        overallScore >= 0.7 ? 'B' :
        overallScore >= 0.6 ? 'C' : 'D'
```

**API 端点**（已实现）✅:
```typescript
GET  /api/v1/scores/:tagId       // ✅ 获取标签评分
GET  /api/v1/scores              // ✅ 获取所有评分
POST /api/v1/scores              // ✅ 更新评分
POST /api/v1/scores/batch        // ✅ 批量更新
GET  /api/v1/scores/recommendation/:lvl // ✅ 按等级查询
GET  /api/v1/scores/stats/overview      // ✅ 统计摘要
```

#### 2.3.2 区分度评分（IV 值）⏳（Phase 3）

**Given** 标签在不同群体中的分布  
**When** 计算 Information Value (IV)  
**Then** 评估标签的区分能力

**评价标准**:
- IV < 0.02: 无用
- 0.02 <= IV < 0.1: 弱
- 0.1 <= IV < 0.3: 中等
- 0.3 <= IV < 0.5: 强
- IV >= 0.5: 过于完美（可能过拟合）

#### 2.3.3 稳定性评分（PSI）⏳（Phase 3）

**Given** 标签在不同时间段的分布  
**When** 计算 Population Stability Index (PSI)  
**Then** 评估标签的稳定性

**评价标准**:
- PSI < 0.1: 非常稳定
- 0.1 <= PSI < 0.2: 稳定
- 0.2 <= PSI < 0.25: 轻微不稳定
- PSI >= 0.25: 不稳定

#### 2.3.4 业务价值评分 ⏳（Phase 3）

**Given** 标签对业务决策的影响  
**When** 评估 ARPU 提升、转化率提升等指标  
**Then** 量化标签的业务价值

**评估维度**:
- ARPU 提升率
- 转化率提升
- 客户留存率提升
- 营销 ROI 提升

### 2.4 标签冲突检测 ⏳（Phase 3）

#### 2.4.1 命名冲突检测

**Given** 一个新的标签名称  
**When** 与现有标签名称比较  
**Then** 识别同名或高度相似的标签

**检测算法**:
- ⏳ 精确匹配（完全相同）
- ⏳ 模糊匹配（编辑距离 < 3）
- ⏳ 语义相似度（使用词向量）

#### 2.4.2 逻辑冲突检测

**Given** 一组标签  
**When** 检查标签组合的逻辑一致性  
**Then** 识别互斥的标签

**冲突规则**:
- ⏳ "高价值客户" 与 "低消费客户" 互斥
- ⏳ "频繁购买者" 与 "长期未购" 互斥
- ⏳ "新客户" 与 "老客户" 互斥

#### 2.4.3 冗余检测

**Given** 两个标签  
**When** 计算它们的相关性  
**Then** 发现含义重复的标签

**冗余标准**:
- ⏳ 相关系数 > 0.9
- ⏳ 共现率 > 0.95
- ⏳ Jaccard 相似度 > 0.8
