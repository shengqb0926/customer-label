import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

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
  /**
   * 创建客户
   */
  async create(data: CreateCustomerDto): Promise<Customer> {
    const response = await axios.post(`${API_BASE_URL}/customers`, data);
    return response.data;
  },

  /**
   * 批量创建客户
   */
  async batchCreate(customers: CreateCustomerDto[]): Promise<Customer[]> {
    const response = await axios.post(`${API_BASE_URL}/customers/batch`, { customers });
    return response.data;
  },

  /**
   * 随机生成客户数据
   */
  async generateRandom(params: GenerateRandomParams): Promise<Customer[]> {
    const response = await axios.post(`${API_BASE_URL}/customers/generate`, params);
    return response.data;
  },

  /**
   * 获取客户列表
   */
  async getList(params: GetCustomersParams): Promise<PaginatedResponse<Customer>> {
    const response = await axios.get(`${API_BASE_URL}/customers`, { params });
    return response.data;
  },

  /**
   * 获取客户统计信息
   */
  async getStatistics(): Promise<CustomerStatistics> {
    const response = await axios.get(`${API_BASE_URL}/customers/statistics`);
    return response.data;
  },

  /**
   * 获取客户详情
   */
  async getById(id: number): Promise<Customer> {
    const response = await axios.get(`${API_BASE_URL}/customers/${id}`);
    return response.data;
  },

  /**
   * 更新客户信息
   */
  async update(id: number, data: Partial<Customer>): Promise<Customer> {
    const response = await axios.put(`${API_BASE_URL}/customers/${id}`, data);
    return response.data;
  },

  /**
   * 删除客户
   */
  async remove(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/customers/${id}`);
  },

  /**
   * 批量删除客户
   */
  async batchRemove(ids: number[]): Promise<void> {
    await axios.post(`${API_BASE_URL}/customers/batch-delete`, { ids });
  },
};