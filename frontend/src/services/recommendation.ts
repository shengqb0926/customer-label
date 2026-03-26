import apiClient from './api';

// 推荐标签实体
export interface Recommendation {
  id: number;
  customerId: number;
  tagName: string;
  tagCategory: string;
  confidence: number;
  source: 'rule' | 'clustering' | 'association' | 'fusion';
  reason: string;
  createdAt: string;
}

// 获取推荐参数
export interface GetRecommendationsParams {
  customerId?: number;
  page?: number;
  limit?: number;
  tagCategory?: string;
  source?: string;
}

// 获取推荐列表
export const getRecommendations = async (params?: GetRecommendationsParams): Promise<any> => {
  return apiClient.get('/recommendations', { params });
};

// 生成推荐
export const generateRecommendations = async (customerId: number): Promise<Recommendation[]> => {
  return apiClient.post(`/recommendations/generate/${customerId}`);
};
