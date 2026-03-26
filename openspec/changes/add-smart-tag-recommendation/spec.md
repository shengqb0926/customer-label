# 功能规范：客户标签智能推荐系统

## 1. 概述

本文档定义了客户标签智能推荐系统的详细功能规范，包括需求定义、接口设计、数据模型和验收标准。

## 2. 功能需求

### 2.1 客户数据分析

#### 2.1.1 客户画像构建

**Given** 一个有效的客户 ID  
**When** 调用 `analyzeCustomer` 方法  
**Then** 返回完整的客户画像数据

**输入示例**:
```json
{
  "customerId": 12345
}
```

**输出示例**:
```json
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
- 响应时间 < 100ms（使用缓存）
- 数据必须来自权威数据源（CRM 系统）
- 敏感字段需要脱敏处理

#### 2.1.2 行为特征提取

**Given** 客户的历史行为数据  
**When** 执行特征提取  
**Then** 生成结构化的特征向量

**特征维度**:
1. **交易特征** (权重 40%)
   - 消费金额分布
   - 购买频次趋势
   - 客单价变化
   - 支付方式偏好

2. **互动特征** (权重 30%)
   - 邮件打开率
   - 活动参与度
   - 客服咨询频次
   - 社交媒体互动

3. **时间特征** (权重 20%)
   - 客户生命周期阶段
   - 最近一次互动时间
   - 季节性购买模式

4. **其他特征** (权重 10%)
   - 产品类别偏好
   - 渠道偏好
   - 地理位置特征

### 2.2 标签推荐引擎

#### 2.2.1 基于规则的推荐

**Given** 客户画像和行为特征  
**When** 应用预定义的业务规则  
**Then** 生成符合规则的标签推荐

**规则示例**:

```typescript
// 规则 1: 高价值客户识别
IF (monthly_revenue > 10000 AND purchase_frequency >= 3)
THEN recommend("高价值客户", confidence: 0.95)

// 规则 2: 流失风险预警
IF (days_since_last_purchase > 60 AND previous_frequency > 2)
THEN recommend("流失风险", confidence: 0.85)

// 规则 3: 潜力客户挖掘
IF (engagement_score > 80 AND total_orders < 3)
THEN recommend("高潜力客户", confidence: 0.75)

// 规则 4: 交叉销售机会
IF (purchased_categories.length == 1 AND avg_order_value > 5000)
THEN recommend("交叉销售机会", confidence: 0.70)
```

**规则管理**:
- 支持动态添加/修改/删除规则
- 规则必须有明确的优先级
- 规则冲突时，按优先级高的执行

#### 2.2.2 基于聚类的推荐

**Given** 所有客户的特征数据  
**When** 执行 K-Means 聚类算法  
**Then** 发现客户群体并为群体生成标签

**算法参数**:
```typescript
interface ClusteringConfig {
  algorithm: 'k-means' | 'dbscan' | 'hierarchical';
  k: number;  // 聚类数量，默认 8
  maxIterations: number;  // 最大迭代次数，默认 100
  convergenceThreshold: number;  // 收敛阈值，默认 0.001
  minClusterSize: number;  // 最小簇大小，默认 10
}
```

**输出示例**:
```json
{
  "clusterId": 3,
  "clusterSize": 156,
  "clusterCharacteristics": {
    "avgOrderValue": 12500,
    "avgFrequency": 5.2,
    "primaryIndustry": "制造业",
    "commonRegion": "华南"
  },
  "recommendedTags": [
    {"name": "制造业大客户", "confidence": 0.88},
    {"name": "华南核心客户", "confidence": 0.82}
  ],
  "customersInCluster": [12345, 23456, 34567, ...]
}
```

#### 2.2.3 基于关联的推荐

**Given** 客户已有的标签集合  
**When** 分析标签共现关系  
**Then** 推荐高度相关的其他标签

**关联规则挖掘**:
```typescript
// 使用 Apriori 算法挖掘频繁项集
// 支持度 (Support): P(A and B)
// 置信度 (Confidence): P(B|A)
// 提升度 (Lift): P(B|A) / P(B)

// 示例规则：
// {企业客户} => {批量采购} 
// Support: 0.35, Confidence: 0.78, Lift: 2.5
```

**推荐策略**:
- 仅推荐 Lift > 1.5 的强关联标签
- 置信度阈值 > 0.6
- 最多推荐 5 个关联标签

#### 2.2.4 推荐结果融合

**Given** 多个推荐源的结果  
**When** 执行结果融合  
**Then** 生成最终的推荐列表

**融合算法**:
```typescript
finalScore = w1 * ruleScore + w2 * clusterScore + w3 * associationScore

// 默认权重
w1 = 0.5  // 规则推荐权重
w2 = 0.3  // 聚类推荐权重
w3 = 0.2  // 关联推荐权重
```

**去重和排序**:
1. 合并相同标签，取最高分
2. 按最终分数降序排列
3. 过滤掉客户已有的标签
4. 返回 Top N 推荐（默认 10 个）

### 2.3 标签质量评分

#### 2.3.1 覆盖率评分

**Given** 一个标签  
**When** 计算覆盖率  
**Then** 返回该标签适用的客户比例

**计算公式**:
```
coverage = (有该标签的客户数 / 总客户数) * 100

评分标准:
- 0.5% - 50%: 100 分 (理想区间)
- < 0.5% 或 > 50%: 线性递减
```

**示例**:
```json
{
  "tagName": "高价值客户",
  "totalCustomers": 10000,
  "taggedCustomers": 1250,
  "coverage": 0.125,
  "coverageScore": 100
}
```

#### 2.3.2 区分度评分

**Given** 标签分组后的客户行为数据  
**When** 比较组间差异  
**Then** 评估标签的区分能力

**计算方法**:
```
使用信息值 (Information Value, IV):
IV = Σ (Good% - Bad%) * ln(Good% / Bad%)

其中:
- Good%: 目标行为客户在标签组中的占比
- Bad%: 目标行为客户在非标签组中的占比

评分映射:
- IV < 0.02: 20 分 (无区分力)
- 0.02-0.1: 40 分 (弱区分力)
- 0.1-0.3: 70 分 (中等区分力)
- 0.3-0.5: 90 分 (强区分力)
- > 0.5: 100 分 (过强区分力，可能过拟合)
```

#### 2.3.3 稳定性评分

**Given** 标签在不同时间段的变化数据  
**When** 计算标签稳定性  
**Then** 评估标签的可靠程度

**计算方法**:
```
PSI (Population Stability Index):
PSI = Σ (Actual% - Expected%) * ln(Actual% / Expected%)

其中:
- Expected%: 基期标签占比
- Actual%: 当期标签占比

评分映射:
- PSI < 0.1: 100 分 (非常稳定)
- 0.1-0.2: 80 分 (轻微变化)
- 0.2-0.25: 60 分 (显著变化)
- > 0.25: 40 分 (极不稳定)
```

#### 2.3.4 业务价值评分

**Given** 标签在业务决策中的应用效果  
**When** 评估业务影响  
**Then** 量化标签的业务价值

**评估维度**:
1. **营销响应提升** (权重 40%)
   - 使用该标签的营销活动 ROI
   - 对比基准的提升幅度

2. **收入贡献** (权重 30%)
   - 标签客户的平均收入 vs 非标签客户
   - 标签对收入的预测能力

3. **运营效率** (权重 20%)
   - 是否简化了运营流程
   - 是否减少了人工判断

4. **战略重要性** (权重 10%)
   - 是否符合公司战略方向
   - 是否支持关键业务决策

**综合计算**:
```
businessValueScore = 0.4*marketing + 0.3*revenue + 0.2*efficiency + 0.1*strategic
```

#### 2.3.5 综合评分

**Given** 四个维度的单项评分  
**When** 计算加权平均  
**Then** 返回综合评分和建议

**权重配置**:
```yaml
scoring:
  weights:
    coverage: 0.30
    discrimination: 0.25
    stability: 0.20
    businessValue: 0.25
  
  recommendationThresholds:
    highlyRecommended: 85   # >= 85 分，强烈推荐
    recommended: 70         # 70-84 分，推荐
    neutral: 50             # 50-69 分，中性
    notRecommended: 0       # < 50 分，不推荐
```

**输出示例**:
```json
{
  "tagName": "高价值客户",
  "overallScore": 87.5,
  "recommendation": "强烈推荐",
  "breakdown": {
    "coverage": {"score": 90, "value": 0.125},
    "discrimination": {"score": 85, "iv": 0.35},
    "stability": {"score": 80, "psi": 0.12},
    "businessValue": {"score": 95, "roi": 2.5}
  },
  "insights": [
    "该标签覆盖 12.5% 的客户，处于理想区间",
    "对高价值客户的识别准确率达 85%",
    "标签稳定性良好，月度波动<12%",
    "使用该标签的营销活动 ROI 提升 2.5 倍"
  ]
}
```

### 2.4 冲突检测

#### 2.4.1 命名冲突检测

**Given** 一组标签名称  
**When** 检测相似度  
**Then** 识别同名或高度相似的标签

**检测方法**:
1. **精确匹配**: 完全相同的标签名
2. **模糊匹配**: Levenshtein 距离 < 2
3. **语义相似**: 使用词向量计算余弦相似度 > 0.85

**输出示例**:
```json
{
  "conflictType": "naming",
  "severity": "high",
  "tags": ["高价值客户", "高价值 VIP 客户"],
  "similarity": 0.88,
  "suggestion": "建议合并为'高价值客户'或明确区分定义"
}
```

#### 2.4.2 逻辑冲突检测

**Given** 标签的定义和应用规则  
**When** 检查逻辑一致性  
**Then** 识别互斥的标签组合

**冲突规则库**:
```typescript
const logicalConflicts = [
  {
    tags: ["高价值客户", "低消费客户"],
    condition: "mutually_exclusive",
    reason: "消费金额定义冲突"
  },
  {
    tags: ["新客户", "流失客户"],
    condition: "time_contradiction",
    reason: "生命周期阶段矛盾"
  },
  {
    tags: ["高频购买", "从未购买"],
    condition: "behavior_contradiction",
    reason: "购买行为矛盾"
  }
];
```

#### 2.4.3 冗余检测

**Given** 标签的客户分布数据  
**When** 分析标签重叠度  
**Then** 发现含义重复的标签

**冗余判定**:
```
Jaccard 相似系数 = |A ∩ B| / |A ∪ B|

如果 Jaccard > 0.9:
  → 两个标签覆盖的客户群高度重合
  → 建议合并或删除

如果 Jaccard > 0.7:
  → 存在较大冗余
  → 提示审查
```

### 2.5 推荐反馈机制

#### 2.5.1 用户反馈收集

**Given** 用户查看推荐结果  
**When** 用户进行操作  
**Then** 记录反馈行为

**反馈类型**:
- ✅ **采纳**: 用户接受了推荐标签
- ❌ **拒绝**: 用户明确拒绝了推荐
- ⏭️ **忽略**: 用户未进行任何操作
- 📝 **修改**: 用户修改了推荐标签后使用

#### 2.5.2 反馈数据分析

**Given** 累积的用户反馈  
**When** 分析反馈模式  
**Then** 优化推荐算法

**分析指标**:
```typescript
interface FeedbackMetrics {
  acceptanceRate: number;      // 采纳率 = 采纳数 / 展示数
  rejectionRate: number;       // 拒绝率
  ignoreRate: number;          // 忽略率
  modificationRate: number;    // 修改率
  averageConfidence: number;   // 平均置信度
  feedbackCount: number;       // 反馈总数
}
```

**优化策略**:
- 采纳率 < 30%: 调整推荐阈值或重新训练模型
- 拒绝率高: 分析拒绝原因，更新规则
- 修改率高: 学习用户的修改模式

## 3. 非功能需求

### 3.1 性能要求

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| 单次推荐响应时间 | < 500ms | P95 延迟 |
| 批量推荐 (1000 客户) | < 5 分钟 | 端到端时间 |
| API 并发能力 | 100 req/s | 压力测试 |
| 缓存命中率 | > 70% | 监控统计 |
| 推荐更新延迟 | < 24 小时 | 全量更新周期 |

### 3.2 可靠性要求

- **可用性**: > 99.5% (月度)
- **准确率**: 推荐准确率 > 80%
- **容错性**: 单个推荐源失败不影响整体服务
- **可恢复性**: 故障后 30 分钟内恢复

### 3.3 安全性要求

- **认证**: 所有 API 需要 JWT 认证
- **授权**: RBAC 权限控制
- **审计**: 记录所有推荐和采纳操作
- **隐私**: 符合 GDPR/个人信息保护法

### 3.4 可维护性要求

- **日志**: 结构化日志，支持 ELK 分析
- **监控**: Prometheus + Grafana 监控
- **告警**: 异常情况自动告警
- **文档**: 完整的 API 文档和运维手册

## 4. 接口定义

### 4.1 RESTful API

#### 获取标签推荐

```typescript
POST /api/v1/tags/recommendations

Request Headers:
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  customerId?: number,        // 可选，指定客户 ID
  customerIds?: number[],     // 可选，批量推荐
  limit?: number,             // 可选，默认 10
  includeScores?: boolean,    // 可选，默认 false
  sources?: ('rule' | 'clustering' | 'association')[]  // 可选，指定推荐源
}

Response 200 OK:
{
  success: true,
  data: {
    recommendations: Array<{
      customerId: number,
      tags: Array<{
        name: string,
        category: string,
        confidence: number,
        source: 'rule' | 'clustering' | 'association',
        reason: string,
        score?: number
      }>,
      generatedAt: string
    }>,
    metadata: {
      totalCustomers: number,
      averageConfidence: number,
      generationTimeMs: number
    }
  }
}
```

#### 获取标签评分

```typescript
GET /api/v1/tags/:tagId/score

Response 200 OK:
{
  success: true,
  data: {
    tagId: number,
    tagName: string,
    overallScore: number,
    recommendation: '强烈推荐' | '推荐' | '中性' | '不推荐',
    breakdown: {
      coverage: { score: number, value: number },
      discrimination: { score: number, iv: number },
      stability: { score: number, psi: number },
      businessValue: { score: number, roi: number }
    },
    insights: string[],
    lastUpdated: string
  }
}
```

#### 检测标签冲突

```typescript
POST /api/v1/tags/conflicts

Request Body:
{
  tagNames: string[],
  checkTypes?: ('naming' | 'logical' | 'redundancy')[]
}

Response 200 OK:
{
  success: true,
  data: {
    conflicts: Array<{
      type: 'naming' | 'logical' | 'redundancy',
      severity: 'high' | 'medium' | 'low',
      tags: string[],
      similarity?: number,
      reason: string,
      suggestion: string
    }>,
    checkedCount: number
  }
}
```

#### 提交反馈

```typescript
POST /api/v1/tags/recommendations/feedback

Request Body:
{
  recommendationId: number,
  action: 'accepted' | 'rejected' | 'modified',
  modifiedTag?: string,
  reason?: string
}

Response 200 OK:
{
  success: true,
  message: "Feedback recorded"
}
```

### 4.2 内部服务接口

#### 推荐引擎接口

```typescript
interface IRecommenderService {
  /**
   * 为单个客户生成推荐
   */
  recommendForCustomer(customerId: number, options?: RecommendOptions): Promise<RecommendationResult>;
  
  /**
   * 批量推荐
   */
  batchRecommend(customerIds: number[], options?: BatchRecommendOptions): Promise<BatchRecommendationResult>;
  
  /**
   * 刷新推荐缓存
   */
  refreshCache(customerId?: number): Promise<void>;
}

interface RecommendationResult {
  customerId: number;
  tags: RecommendedTag[];
  metadata: RecommendationMetadata;
}

interface RecommendedTag {
  name: string;
  category: string;
  confidence: number;
  source: RecommendationSource;
  reason: string;
  scores?: TagScores;
}

enum RecommendationSource {
  RULE = 'rule',
  CLUSTERING = 'clustering',
  ASSOCIATION = 'association'
}
```

#### 评分服务接口

```typescript
interface ITagScorerService {
  /**
   * 计算标签的综合评分
   */
  calculateScore(tagId: number): Promise<TagScore>;
  
  /**
   * 批量计算所有标签评分
   */
  calculateAllScores(): Promise<TagScore[]>;
  
  /**
   * 获取标签评分
   */
  getScore(tagId: number): Promise<TagScore | null>;
}

interface TagScore {
  tagId: number;
  tagName: string;
  overallScore: number;
  recommendation: string;
  breakdown: ScoreBreakdown;
  insights: string[];
  calculatedAt: Date;
}
```

## 5. 数据模型

### 5.1 核心表结构

```sql
-- 推荐结果表
CREATE TABLE tag_recommendations (
  id BIGSERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  tag_name VARCHAR(100) NOT NULL,
  tag_category VARCHAR(50),
  confidence DECIMAL(5,4) NOT NULL,
  source VARCHAR(20) NOT NULL,
  reason TEXT,
  score_overall DECIMAL(5,4),
  is_accepted BOOLEAN DEFAULT FALSE,
  accepted_at TIMESTAMP,
  accepted_by INTEGER,
  modified_tag_name VARCHAR(100),
  feedback_reason VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT chk_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- 标签评分表
CREATE TABLE tag_scores (
  id BIGSERIAL PRIMARY KEY,
  tag_id INTEGER NOT NULL UNIQUE,
  tag_name VARCHAR(100) NOT NULL,
  coverage_score DECIMAL(5,4),
  coverage_value DECIMAL(10,6),
  discrimination_score DECIMAL(5,4),
  discrimination_iv DECIMAL(10,6),
  stability_score DECIMAL(5,4),
  stability_psi DECIMAL(10,6),
  business_value_score DECIMAL(5,4),
  business_value_roi DECIMAL(10,6),
  overall_score DECIMAL(5,4),
  recommendation VARCHAR(20),
  insights TEXT[],
  last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_tag FOREIGN KEY (tag_id) REFERENCES tags(id),
  CONSTRAINT chk_scores CHECK (
    coverage_score >= 0 AND coverage_score <= 100 AND
    discrimination_score >= 0 AND discrimination_score <= 100 AND
    stability_score >= 0 AND stability_score <= 100 AND
    business_value_score >= 0 AND business_value_score <= 100 AND
    overall_score >= 0 AND overall_score <= 100
  )
);

-- 推荐规则表
CREATE TABLE recommendation_rules (
  id BIGSERIAL PRIMARY KEY,
  rule_name VARCHAR(100) NOT NULL UNIQUE,
  rule_expression TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  tag_template JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  hit_count BIGINT DEFAULT 0,
  acceptance_rate DECIMAL(5,4),
  last_hit_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_by INTEGER
);

-- 聚类配置表
CREATE TABLE clustering_configs (
  id BIGSERIAL PRIMARY KEY,
  config_name VARCHAR(100) NOT NULL,
  algorithm VARCHAR(50) NOT NULL,
  parameters JSONB NOT NULL,
  feature_weights JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMP,
  last_cluster_count INTEGER,
  avg_silhouette_score DECIMAL(5,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 反馈统计表
CREATE TABLE feedback_statistics (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_recommendations BIGINT DEFAULT 0,
  accepted_count BIGINT DEFAULT 0,
  rejected_count BIGINT DEFAULT 0,
  ignored_count BIGINT DEFAULT 0,
  modified_count BIGINT DEFAULT 0,
  avg_confidence DECIMAL(5,4),
  acceptance_rate DECIMAL(5,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_recommendations_customer ON tag_recommendations(customer_id);
CREATE INDEX idx_recommendations_source ON tag_recommendations(source);
CREATE INDEX idx_recommendations_accepted ON tag_recommendations(is_accepted);
CREATE INDEX idx_recommendations_created ON tag_recommendations(created_at);

CREATE INDEX idx_tag_scores_overall ON tag_scores(overall_score DESC);
CREATE INDEX idx_tag_scores_updated ON tag_scores(last_calculated_at DESC);

CREATE INDEX idx_rules_active ON recommendation_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_rules_priority ON recommendation_rules(priority DESC);

CREATE INDEX idx_feedback_date ON feedback_statistics(date DESC);
```

### 5.2 Redis 缓存结构

```typescript
// 推荐结果缓存
Key: recommendation:{customerId}
Type: Hash
TTL: 86400 (24 小时)
Value: {
  tags: JSON.stringify(recommendedTags),
  generatedAt: timestamp,
  hitCount: number
}

// 标签评分缓存
Key: tag:score:{tagId}
Type: String (JSON)
TTL: 3600 (1 小时)
Value: JSON.stringify(tagScore)

// 客户画像缓存
Key: customer:profile:{customerId}
Type: Hash
TTL: 3600 (1 小时)
Value: {
  industry: string,
  companySize: string,
  metrics: JSON.stringify(behaviorMetrics),
  ...
}
```

## 6. 错误处理

### 6.1 错误码定义

| 错误码 | HTTP 状态码 | 含义 | 处理建议 |
|--------|-----------|------|----------|
| REC_001 | 400 | 客户 ID 无效 | 检查客户 ID 是否存在 |
| REC_002 | 404 | 客户不存在 | 确认客户数据 |
| REC_003 | 500 | 推荐引擎初始化失败 | 检查配置和依赖 |
| REC_004 | 503 | 推荐服务不可用 | 稍后重试，检查服务状态 |
| REC_005 | 429 | 请求频率超限 | 降低请求频率 |
| REC_006 | 400 | 标签名称格式错误 | 检查标签命名规范 |
| REC_007 | 409 | 标签已存在 | 使用已有标签或选择新名称 |
| REC_008 | 500 | 聚类算法执行失败 | 检查数据和参数配置 |
| SCore_001 | 404 | 标签评分不存在 | 触发评分计算 |
| SCore_002 | 500 | 评分计算失败 | 检查数据和算法 |
| CONF_001 | 400 | 冲突检测参数错误 | 检查请求参数 |

### 6.2 异常处理策略

```typescript
try {
  const result = await recommender.recommend(customerId);
  return result;
} catch (error) {
  if (error instanceof CustomerNotFoundError) {
    throw new HttpException('Customer not found', 404);
  } else if (error instanceof RecommenderUnavailableError) {
    // 降级策略：返回空推荐或缓存结果
    logger.warn('Recommender unavailable, using fallback', { customerId });
    return await this.getFallbackRecommendation(customerId);
  } else if (error instanceof RateLimitError) {
    throw new HttpException('Rate limit exceeded', 429);
  } else {
    logger.error('Unexpected error in recommendation', { error, customerId });
    throw new HttpException('Internal server error', 500);
  }
}
```

### 6.3 降级策略

**Level 1: 部分降级**
- 关闭实时推荐，使用定时计算结果
- 仅保留规则推荐（最稳定）
- 增加缓存 TTL

**Level 2: 完全降级**
- 暂停推荐服务
- 返回友好的错误提示
- 引导用户使用手动标签

**Level 3: 灾难恢复**
- 切换到备用服务实例
- 从备份恢复数据
- 通知相关干系人

## 7. 验收标准

### 7.1 功能验收清单

#### 核心功能
- [ ] 能够为单个客户生成个性化标签推荐
- [ ] 支持批量推荐（至少 1000 客户）
- [ ] 三种推荐源都能正常工作（规则、聚类、关联）
- [ ] 推荐结果融合算法正确
- [ ] 标签评分系统准确计算四个维度
- [ ] 冲突检测能识别三类冲突
- [ ] 用户反馈能够被记录和分析

#### 数据完整性
- [ ] 所有推荐都有明确的来源和置信度
- [ ] 评分数据及时更新（< 24 小时延迟）
- [ ] 反馈数据完整记录
- [ ] 历史数据可追溯

### 7.2 性能验收标准

- [ ] 单次推荐 API P95 响应时间 < 500ms
- [ ] 批量推荐 1000 客户 < 5 分钟
- [ ] 系统支持 100 并发请求
- [ ] 缓存命中率 > 70%
- [ ] 数据库查询优化，无慢查询

### 7.3 质量验收标准

- [ ] 单元测试覆盖率 > 90%
- [ ] 集成测试覆盖所有核心流程
- [ ] 代码审查通过
- [ ] TypeScript 严格模式编译通过
- [ ] 无严重和安全漏洞

### 7.4 业务验收标准

- [ ] 推荐采纳率 > 60%（试运行 1 个月）
- [ ] 用户满意度 > 4.0/5.0
- [ ] 标签创建效率提升 > 50%
- [ ] 标签重复率下降 > 30%

---

**文档状态**: Draft  
**版本**: 1.0  
**创建日期**: 2026-03-26  
**最后更新**: 2026-03-26  
**审核人**: 待定
