import apiClient from './api';

// 聚类配置实体
export interface ClusteringConfig {
  id: number;
  name: string;
  algorithm: string;
  parameters: Record<string, any>;
  featureFields: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 创建聚类配置 DTO
export interface CreateClusteringDto {
  name: string;
  algorithm: string;
  parameters: Record<string, any>;
  featureFields: string[];
}

// 更新聚类配置 DTO
export interface UpdateClusteringDto {
  name?: string;
  algorithm?: string;
  parameters?: Record<string, any>;
  featureFields?: string[];
  isActive?: boolean;
}

// 获取聚类配置列表
export const getClusteringConfigs = async (params?: any): Promise<any> => {
  return apiClient.get('/clustering', { params });
};

// 获取聚类配置详情
export const getClusteringConfig = async (id: number): Promise<ClusteringConfig> => {
  return apiClient.get(`/clustering/${id}`);
};

// 创建聚类配置
export const createClusteringConfig = async (data: CreateClusteringDto): Promise<ClusteringConfig> => {
  return apiClient.post('/clustering', data);
};

// 更新聚类配置
export const updateClusteringConfig = async (id: number, data: UpdateClusteringDto): Promise<ClusteringConfig> => {
  return apiClient.patch(`/clustering/${id}`, data);
};

// 删除聚类配置
export const deleteClusteringConfig = async (id: number): Promise<void> => {
  return apiClient.delete(`/clustering/${id}`);
};
