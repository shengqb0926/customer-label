import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type { ApiResponse } from '@/types';

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => {
    // 直接返回 data
    return response.data;
  },
  (error: AxiosError<ApiResponse>) => {
    // 统一处理错误
    if (error.response?.status === 401) {
      // token 过期或无效，清除本地存储
      // 注意：不自动跳转，由 AuthGuard 组件自行处理
      console.warn('API 401 Error - Token may be invalid');
    }

    const message = error.response?.data?.message || error.message || '请求失败';
    console.error('API Error:', message);
    
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
