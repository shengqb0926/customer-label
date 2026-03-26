import apiClient from './api';
import type { User, PaginatedResponse } from '@/types';

// 创建用户 DTO
export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  roles?: string[];
}

// 更新用户 DTO
export interface UpdateUserDto {
  email?: string;
  roles?: string[];
  isActive?: boolean;
}

// 获取用户列表参数
export interface GetUsersParams {
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
}

// 获取用户列表
export const getUsers = async (params?: GetUsersParams): Promise<PaginatedResponse<User>> => {
  return apiClient.get('/users', { params });
};

// 获取用户详情
export const getUser = async (id: number): Promise<User> => {
  return apiClient.get(`/users/${id}`);
};

// 创建用户
export const createUser = async (data: CreateUserDto): Promise<User> => {
  return apiClient.post('/users', data);
};

// 更新用户
export const updateUser = async (id: number, data: UpdateUserDto): Promise<User> => {
  return apiClient.patch(`/users/${id}`, data);
};

// 删除用户
export const deleteUser = async (id: number): Promise<void> => {
  return apiClient.delete(`/users/${id}`);
};
