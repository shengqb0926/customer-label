import { create } from 'zustand';
import type { Rule, Recommendation, CreateRuleDto, UpdateRuleDto, TestRuleDto, TestResult } from '@/services/rule';
import { ruleService, recommendationService } from '@/services/rule';

interface Statistics {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}

interface RuleState {
  // 规则相关状态
  rules: Rule[];
  loading: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  filters: {
    isActive?: boolean;
    search?: string;
  };
  
  // 推荐相关状态
  recommendations: Recommendation[];
  recommendationLoading: boolean;
  recommendationPagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  
  // 统计相关状态
  statistics: Statistics | null;
  statisticsLoading: boolean;
  
  // 规则 Actions
  fetchRules: (params?: { page?: number; limit?: number; isActive?: boolean }) => Promise<void>;
  createRule: (data: CreateRuleDto) => Promise<any>;
  updateRule: (id: number, data: UpdateRuleDto) => Promise<any>;
  deleteRule: (id: number) => Promise<void>;
  activateRule: (id: number) => Promise<void>;
  deactivateRule: (id: number) => Promise<void>;
  testRule: (data: TestRuleDto) => Promise<TestResult>;
  setFilters: (filters: { isActive?: boolean; search?: string }) => void;
  resetFilters: () => void;
  
  // 推荐 Actions
  fetchRecommendations: (params?: any) => Promise<void>;
  acceptRecommendation: (id: number, feedbackReason?: string) => Promise<void>;
  rejectRecommendation: (id: number, feedbackReason?: string) => Promise<void>;
  batchAcceptRecommendations: (ids: number[], autoTag?: boolean) => Promise<any>;
  batchRejectRecommendations: (ids: number[], reason?: string) => Promise<any>;
  batchUndoRecommendations: (ids: number[]) => Promise<any>;
  
  // 统计 Actions
  fetchStatistics: (params?: any) => Promise<void>;
}

export const useRuleStore = create<RuleState>((set, get) => ({
  // 初始状态
  rules: [],
  loading: false,
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
  },
  filters: {},
  
  recommendations: [],
  recommendationLoading: false,
  recommendationPagination: {
    current: 1,
    pageSize: 20,
    total: 0,
  },
  
  statistics: null,
  statisticsLoading: false,
  
  // 规则 Actions
  fetchRules: async (params) => {
    set({ loading: true });
    try {
      const mergedParams = {
        page: params?.page || get().pagination.current,
        limit: params?.limit || get().pagination.pageSize,
        isActive: params?.isActive ?? get().filters.isActive,
      };
      
      const response: any = await ruleService.getRules(mergedParams);
      
      set({
        rules: response.data || [],
        pagination: {
          current: response.page || mergedParams.page!,
          pageSize: mergedParams.limit!,
          total: response.total || 0,
        },
        filters: {
          isActive: params?.isActive ?? get().filters.isActive,
        },
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch rules:', error);
      set({ loading: false });
      throw error;
    }
  },
  
  createRule: async (data: CreateRuleDto) => {
    return await ruleService.createRule(data);
  },
  
  updateRule: async (id: number, data: UpdateRuleDto) => {
    return await ruleService.updateRule(id, data);
  },
  
  deleteRule: async (id: number) => {
    await ruleService.deleteRule(id);
    await get().fetchRules();
  },
  
  activateRule: async (id: number) => {
    await ruleService.activateRule(id);
    await get().fetchRules();
  },
  
  deactivateRule: async (id: number) => {
    await ruleService.deactivateRule(id);
    await get().fetchRules();
  },
  
  testRule: async (data: TestRuleDto): Promise<TestResult> => {
    const response: any = await ruleService.testRule(data);
    return response;
  },
  
  setFilters: (filters) => {
    set({ filters });
  },
  
  resetFilters: () => {
    set({ filters: {} });
  },
  
  // 推荐 Actions
  fetchRecommendations: async (params) => {
    set({ recommendationLoading: true });
    try {
      const response: any = await recommendationService.getRecommendations(params);
      
      set({
        recommendations: response.data || [],
        recommendationPagination: {
          current: response.page || 1,
          pageSize: response.limit || 20,
          total: response.total || 0,
        },
        recommendationLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      set({ recommendationLoading: false });
      throw error;
    }
  },
  
  acceptRecommendation: async (id: number, feedbackReason?: string) => {
    await recommendationService.acceptRecommendation(id, feedbackReason);
    await get().fetchRecommendations();
    await get().fetchStatistics(); // 刷新统计
  },
  
  rejectRecommendation: async (id: number, feedbackReason?: string) => {
    await recommendationService.rejectRecommendation(id, feedbackReason);
    await get().fetchRecommendations();
    await get().fetchStatistics(); // 刷新统计
  },
  
  batchAcceptRecommendations: async (ids: number[], autoTag?: boolean) => {
    const result = await recommendationService.batchAcceptRecommendations(ids, autoTag);
    await get().fetchRecommendations();
    await get().fetchStatistics(); // 刷新统计
    return result; // 返回 API 响应
  },
  
  batchRejectRecommendations: async (ids: number[], reason?: string) => {
    const result = await recommendationService.batchRejectRecommendations(ids, reason);
    await get().fetchRecommendations();
    await get().fetchStatistics(); // 刷新统计
    return result; // 返回 API 响应
  },

  batchUndoRecommendations: async (ids: number[]) => {
    const result = await recommendationService.batchUndoRecommendations(ids);
    await get().fetchRecommendations();
    await get().fetchStatistics(); // 刷新统计
    return result; // 返回 API 响应
  },

  // 统计 Actions
  fetchStatistics: async (params) => {
    set({ statisticsLoading: true });
    try {
      const response: any = await recommendationService.getStatusStats(params);
      
      set({
        statistics: response,
        statisticsLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      set({ statisticsLoading: false });
      throw error;
    }
  },
}));