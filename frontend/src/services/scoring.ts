import apiClient from './api';

// 评分实体
export interface Score {
  id: number;
  customerId: number;
  score: number;
  level: string;
  factors: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// 获取评分参数
export interface GetScoresParams {
  customerId?: number;
  page?: number;
  limit?: number;
}

// 获取评分列表
export const getScores = async (params?: GetScoresParams): Promise<any> => {
  return apiClient.get('/scoring', { params });
};

// 获取客户评分
export const getCustomerScore = async (customerId: number): Promise<Score> => {
  return apiClient.get(`/scoring/${customerId}`);
};

// 更新评分
export const updateScore = async (customerId: number, data: any): Promise<Score> => {
  return apiClient.patch(`/scoring/${customerId}`, data);
};

// 获取统计信息
export const getStats = async (): Promise<any> => {
  return apiClient.get('/scoring/stats');
};
