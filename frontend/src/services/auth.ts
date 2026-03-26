import apiClient from './api';
import type { LoginRequest, LoginResponse, User } from '@/types';

// 用户登录
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  return apiClient.post('/auth/login', data);
};

// 获取当前用户信息
export const getCurrentUser = async (): Promise<User> => {
  return apiClient.get('/auth/me');
};

// 刷新 token
export const refreshToken = async (): Promise<LoginResponse> => {
  return apiClient.post('/auth/refresh');
};

// 登出
export const logout = async (): Promise<void> => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_info');
};
