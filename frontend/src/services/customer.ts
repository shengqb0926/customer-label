import apiClient from './api';

// 客户等级枚举
export enum CustomerLevel {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
}

// 风险等级枚举
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

// 性别枚举
export enum Gender {
  MALE = 'M',
  FEMALE = 'F',
}

// 客户接口
export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  gender?: Gender;
  age?: number;
  city?: string;
  province?: string;
  address?: string;
  totalAssets: number;
  monthlyIncome: number;
  annualSpend: number;
  orderCount: number;
  productCount: number;
  registerDays: number;
  lastLoginDays: number;
  level: CustomerLevel;
  riskLevel: RiskLevel;
  remarks?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 创建客户 DTO
export interface CreateCustomerDto extends Partial<Customer> {
  name: string;
}

// 查询参数
export interface GetCustomersParams {
  page?: number;
  limit?: number;
  keyword?: string;
  email?: string;
  city?: string;
  level?: CustomerLevel;
  riskLevel?: RiskLevel;
  gender?: Gender;
  minAge?: number;
  maxAge?: number;
  minAssets?: number;
  maxAssets?: number;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 随机生成参数
export interface GenerateRandomParams {
  count: number;
  cities?: string[];
  minAge?: number;
  maxAge?: number;
  minAssets?: number;
  maxAssets?: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 统计信息
export interface CustomerStatistics {
  total: number;
  activeCount: number;
  inactiveCount: number;
  levelStats: Array<{ level: string; count: number }>;
  riskStats: Array<{ riskLevel: string; count: number }>;
  cityStats: Array<{ city: string; count: number }>;
  avgAssets: number;
}

/**
 * 客户管理服务
 */
export const customerService = {
  async create(data: CreateCustomerDto): Promise<Customer> {
    return apiClient.post('/customers', data);
  },

  async batchCreate(customers: CreateCustomerDto[]): Promise<Customer[]> {
    return apiClient.post('/customers/batch', { customers });
  },

  async generateRandom(params: GenerateRandomParams): Promise<Customer[]> {
    return apiClient.post('/customers/generate', params);
  },

  async getList(params: GetCustomersParams): Promise<PaginatedResponse<Customer>> {
    return apiClient.get('/customers', { params });
  },

  async getStatistics(): Promise<CustomerStatistics> {
    return apiClient.get('/customers/statistics');
  },

  async getById(id: number): Promise<Customer> {
    return apiClient.get(`/customers/${id}`);
  },

  async update(id: number, data: Partial<Customer>): Promise<Customer> {
    return apiClient.put(`/customers/${id}`, data);
  },

  async remove(id: number): Promise<void> {
    return apiClient.delete(`/customers/${id}`);
  },

  async batchRemove(ids: number[]): Promise<void> {
    return apiClient.post('/customers/batch-delete', { ids });
  },

  async batchImport(formData: FormData): Promise<{ imported: number; skipped: number }> {
    return apiClient.post('/customers/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // RFM 分析相关 API
  /**
   * 获取客户 RFM 分析结果
   * 使用 POST 请求避免 Query 参数类型转换问题
   */
  async getRfmAnalysis(params?: {
    page?: number;
    limit?: number;
    segment?: string;
    minTotalScore?: number;
    maxTotalScore?: number;
  }): Promise<{ data: any[]; total: number }> {
    // 使用 POST 请求，将参数放在 body 中
    return apiClient.post('/customers/rfm-analysis', params || {});
  },

  async getRfmSummary(): Promise<any> {
    // 使用 POST 请求避免 Query 参数类型转换问题
    return apiClient.post('/customers/rfm-summary', {});
  },

  async getHighValueCustomers(limit?: number): Promise<any[]> {
    // 使用 POST 请求避免 Query 参数类型转换问题
    return apiClient.post('/customers/rfm-high-value', { limit: limit || 50 });
  },

  async getRfmBySegment(segment: string): Promise<any[]> {
    // 使用 POST 请求避免 Query 参数类型转换问题
    return apiClient.post('/customers/rfm-segment/' + segment, {});
  },

  /**
   * 触发推荐引擎
   * @param customerId 客户 ID
   * @param mode 引擎类型：rule=规则引擎，clustering=聚合引擎，association=关联引擎，all=全部引擎
   */
  async triggerRecommendationEngine(
    customerId: number,
    mode: 'rule' | 'clustering' | 'association' | 'all' = 'all'
  ): Promise<{
    success: boolean;
    count: number;
    recommendations: any[];
    message: string;
  }> {
    return apiClient.post(`/recommendations/generate/${customerId}`, { mode });
  },
};

export default customerService;
