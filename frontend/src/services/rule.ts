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

// 推荐服务
export const recommendationService = {
  // 获取推荐列表
  async getRecommendations(params?: GetRecommendationsParams) {
    return await apiClient.get<{ data: Recommendation[]; total: number; page?: number; limit?: number }>('/recommendations', { params });
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
