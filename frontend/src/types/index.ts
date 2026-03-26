// 用户角色枚举
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  ANALYST = 'analyst',
}

// 用户信息
export interface User {
  id: number;
  username: string;
  email: string;
  roles: UserRole[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  access_token: string;
  user: User;
}

// 通用 API 响应
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
