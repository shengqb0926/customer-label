import apiClient from './api';

// 规则表达式类型
export interface RuleExpression {
  operator: 'AND' | 'OR' | 'NOT';
  conditions: (BaseCondition | RuleExpression)[];
}

export interface BaseCondition {
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'between' | 'in' | 'includes' | 'startsWith' | 'contains' | 'endsWith';
  value: any;
}

// 规则实体
export interface Rule {
  id: number;
  ruleName: string;
  description?: string;
  ruleExpression: RuleExpression | string; // 可能是解析后的对象，也可能是字符串
  priority: number;
  tagTemplate: any; // 标签模板对象
  isActive: boolean;
  hitCount?: number;
  acceptanceRate?: number;
  createdAt: string;
  updatedAt: string;
}

// 创建规则 DTO
export interface CreateRuleDto {
  ruleName: string;
  ruleExpression: RuleExpression | string;
  tagTemplate: any;
  description?: string;
  priority?: number;
  isActive?: boolean;
}

// 更新规则 DTO
export interface UpdateRuleDto {
  ruleName?: string;
  ruleExpression?: RuleExpression | string;
  tagTemplate?: any;
  description?: string;
  priority?: number;
  isActive?: boolean;
}

// 测试规则 DTO
export interface TestRuleDto {
  ruleExpression: RuleExpression;
  customerData: Record<string, any>;
}

// 测试结果
export interface TestResult {
  matched: boolean;
  confidence?: number;
  matchedConditions?: number;
  totalConditions?: number;
  error?: string;
  executionTime?: number;
  expression?: RuleExpression;
  customerData?: Record<string, any>;
}

// 获取规则参数
export interface GetRulesParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

// 推荐实体
export interface Recommendation {
  id: number;
  customerId: number;
  customerName?: string;
  tagName: string;
  tagCategory?: string;
  confidence: number;
  source: 'rule' | 'clustering' | 'association';
  reason: string;
  isAccepted: boolean;
  acceptedAt?: string;
  acceptedBy?: number;
  createdAt: string;
}

// 获取推荐列表参数
export interface GetRecommendationsParams {
  page?: number;
  limit?: number;
  customerId?: number;
  customerName?: string; // 新增：客户名称模糊查询
  status?: 'all' | 'pending' | 'accepted' | 'rejected';
  tagCategory?: string;
  startDate?: string;
  endDate?: string;
}

// 规则服务
export const ruleService = {
  // 获取规则列表
  async getRules(params?: GetRulesParams) {
    return await apiClient.get<{ data: Rule[]; total: number; page?: number; limit?: number }>('/rules', { params });
  },

  // 创建规则
  async createRule(data: CreateRuleDto) {
    return await apiClient.post<Rule>('/rules', data);
  },

  // 更新规则
  async updateRule(id: number, data: UpdateRuleDto) {
    return await apiClient.put<Rule>(`/rules/${id}`, data);
  },

  // 删除规则
  async deleteRule(id: number) {
    return await apiClient.delete(`/rules/${id}`);
  },

  // 激活规则
  async activateRule(id: number) {
    return await apiClient.post(`/rules/${id}/activate`);
  },

  // 停用规则
  async deactivateRule(id: number) {
    return await apiClient.post(`/rules/${id}/deactivate`);
  },

  // 测试规则
  async testRule(data: TestRuleDto) {
    return await apiClient.post<TestResult>('/rules/test', data);
  },
};

// 推荐结果管理
export const recommendationService = {
  // 获取推荐列表
  async getRecommendations(params?: GetRecommendationsParams) {
    return await apiClient.get<{ data: Recommendation[]; total: number; page?: number; limit?: number }>('/recommendations', { params });
  },

  // 获取状态统计
  async getStatusStats(params?: GetRecommendationsParams) {
    return await apiClient.get('/recommendations/stats/status', { params });
  },

  // 采纳推荐
  async acceptRecommendation(id: number, feedbackReason?: string) {
    return await apiClient.post(`/recommendations/${id}/accept`, { feedbackReason });
  },

  // 拒绝推荐
  async rejectRecommendation(id: number, feedbackReason?: string) {
    return await apiClient.post(`/recommendations/${id}/reject`, { feedbackReason });
  },

  // 批量接受推荐
  async batchAcceptRecommendations(ids: number[]) {
    return await apiClient.post('/recommendations/batch-accept', { ids });
  },

  // 批量拒绝推荐
  async batchRejectRecommendations(ids: number[], feedbackReason?: string) {
    const payload: any = { ids };
    if (feedbackReason) {
      payload.feedbackReason = feedbackReason;
    }
    
    return await apiClient.post('/recommendations/batch-reject', payload);
  },
};

// 聚类配置相关类型
export interface ClusteringConfig {
  id: number;
  configName: string;
  description?: string;
  algorithm: 'k-means' | 'dbscan' | 'hierarchical';
  parameters: Record<string, any>;
  featureWeights?: Record<string, number>;
  isActive: boolean;
  lastRunAt?: Date;
  runCount: number;
  avgSilhouetteScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClusteringConfigDto {
  configName: string;
  description?: string;
  algorithm: 'k-means' | 'dbscan' | 'hierarchical';
  parameters: Record<string, any>;
  featureWeights?: Record<string, number>;
  isActive?: boolean;
}

export interface UpdateClusteringConfigDto {
  configName?: string;
  description?: string;
  algorithm?: 'k-means' | 'dbscan' | 'hierarchical';
  parameters?: Record<string, any>;
  featureWeights?: Record<string, number>;
  isActive?: boolean;
}

// 关联规则配置相关类型
export interface AssociationConfig {
  id: number;
  configName: string;
  description?: string;
  algorithm: 'apriori' | 'fpgrowth' | 'eclat';
  parameters: Record<string, any>;
  featureWeights?: Record<string, number>;
  isActive: boolean;
  lastRunAt?: Date;
  runCount: number;
  avgQualityScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssociationConfigDto {
  configName: string;
  description?: string;
  algorithm: 'apriori' | 'fpgrowth' | 'eclat';
  parameters: Record<string, any>;
  featureWeights?: Record<string, number>;
  isActive?: boolean;
}

export interface UpdateAssociationConfigDto {
  configName?: string;
  description?: string;
  algorithm?: 'apriori' | 'fpgrowth' | 'eclat';
  parameters?: Record<string, any>;
  featureWeights?: Record<string, number>;
  isActive?: boolean;
}

// 聚类配置管理服务
export const clusteringConfigService = {
  /**
   * 创建聚类配置
   */
  async createConfig(dto: CreateClusteringConfigDto): Promise<ClusteringConfig> {
    const response = await apiClient.post('/clustering', dto);
    return response.data;
  },

  /**
   * 获取聚类配置列表
   */
  async getConfigs(params?: {
    page?: number;
    limit?: number;
    configName?: string;
    algorithm?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: ClusteringConfig[]; total: number }> {
    const response = await apiClient.get('/clustering', { params });
    return response.data;
  },

  /**
   * 获取单个配置详情
   */
  async getConfigById(id: number): Promise<ClusteringConfig> {
    const response = await apiClient.get(`/clustering/${id}`);
    return response.data;
  },

  /**
   * 更新聚类配置
   */
  async updateConfig(id: number, dto: UpdateClusteringConfigDto): Promise<ClusteringConfig> {
    const response = await apiClient.put(`/clustering/${id}`, dto);
    return response.data;
  },

  /**
   * 删除聚类配置
   */
  async deleteConfig(id: number): Promise<void> {
    await apiClient.delete(`/clustering/${id}`);
  },

  /**
   * 激活聚类配置
   */
  async activateConfig(id: number): Promise<ClusteringConfig> {
    const response = await apiClient.post(`/clustering/${id}/activate`);
    return response.data;
  },

  /**
   * 停用聚类配置
   */
  async deactivateConfig(id: number): Promise<ClusteringConfig> {
    const response = await apiClient.post(`/clustering/${id}/deactivate`);
    return response.data;
  },

  /**
   * 手动运行聚类任务
   */
  async runClustering(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/clustering/${id}/run`);
    return response.data;
  },
};

// 关联规则配置管理服务
export const associationConfigService = {
  /**
   * 创建关联规则配置
   */
  async createConfig(dto: CreateAssociationConfigDto): Promise<AssociationConfig> {
    const response = await apiClient.post('/association', dto);
    return response.data;
  },

  /**
   * 获取关联规则配置列表
   */
  async getConfigs(params?: {
    page?: number;
    limit?: number;
    configName?: string;
    algorithm?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: AssociationConfig[]; total: number }> {
    const response = await apiClient.get('/association', { params });
    return response.data;
  },

  /**
   * 获取单个配置详情
   */
  async getConfigById(id: number): Promise<AssociationConfig> {
    const response = await apiClient.get(`/association/${id}`);
    return response.data;
  },

  /**
   * 更新关联规则配置
   */
  async updateConfig(id: number, dto: UpdateAssociationConfigDto): Promise<AssociationConfig> {
    const response = await apiClient.put(`/association/${id}`, dto);
    return response.data;
  },

  /**
   * 删除关联规则配置
   */
  async deleteConfig(id: number): Promise<void> {
    await apiClient.delete(`/association/${id}`);
  },

  /**
   * 激活关联规则配置
   */
  async activateConfig(id: number): Promise<AssociationConfig> {
    const response = await apiClient.post(`/association/${id}/activate`);
    return response.data;
  },

  /**
   * 停用关联规则配置
   */
  async deactivateConfig(id: number): Promise<AssociationConfig> {
    const response = await apiClient.post(`/association/${id}/deactivate`);
    return response.data;
  },

  /**
   * 手动运行关联规则挖掘任务
   */
  async runAssociation(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/association/${id}/run`);
    return response.data;
  },

  /**
   * 运行配置（用于批量操作）
   */
  async runConfig(id: string): Promise<{ success: boolean; message: string }> {
    return this.runAssociation(Number(id));
  },
};
