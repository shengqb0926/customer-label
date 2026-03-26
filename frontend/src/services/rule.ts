import apiClient from './api';

// 规则实体
export interface Rule {
  id: number;
  name: string;
  description?: string;
  conditions: Record<string, any>;
  action: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 创建规则 DTO
export interface CreateRuleDto {
  name: string;
  description?: string;
  conditions: Record<string, any>;
  action: string;
  priority?: number;
}

// 更新规则 DTO
export interface UpdateRuleDto {
  name?: string;
  description?: string;
  conditions?: Record<string, any>;
  action?: string;
  priority?: number;
  isActive?: boolean;
}

// 获取规则参数
export interface GetRulesParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

// 获取规则列表
export const getRules = async (params?: GetRulesParams): Promise<any> => {
  return apiClient.get('/rules', { params });
};

// 获取规则详情
export const getRule = async (id: number): Promise<Rule> => {
  return apiClient.get(`/rules/${id}`);
};

// 创建规则
export const createRule = async (data: CreateRuleDto): Promise<Rule> => {
  return apiClient.post('/rules', data);
};

// 更新规则
export const updateRule = async (id: number, data: UpdateRuleDto): Promise<Rule> => {
  return apiClient.patch(`/rules/${id}`, data);
};

// 删除规则
export const deleteRule = async (id: number): Promise<void> => {
  return apiClient.delete(`/rules/${id}`);
};
