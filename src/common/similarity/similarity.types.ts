/**
 * 特征向量权重配置
 */
export interface FeatureWeights {
  /** 资产权重 (默认：0.25) */
  assetWeight?: number;
  
  /** 收入权重 (默认：0.20) */
  incomeWeight?: number;
  
  /** 消费权重 (默认：0.20) */
  spendWeight?: number;
  
  /** 订单数权重 (默认：0.10) */
  orderCountWeight?: number;
  
  /** 客户等级权重 (默认：0.15) */
  levelWeight?: number;
  
  /** 风险等级权重 (默认：0.10) */
  riskLevelWeight?: number;
  
  /** 城市权重 (默认：0.05) */
  cityWeight?: number;
  
  /** 注册天数权重 (默认：0.05) */
  registerDaysWeight?: number;
}

/**
 * 相似度计算配置
 */
export interface SimilarityConfig {
  /** 算法类型 */
  algorithm: 'cosine' | 'euclidean' | 'pearson';
  
  /** 归一化方法 */
  normalizeMethod: 'minmax' | 'zscore' | 'none';
  
  /** 特征权重 */
  featureWeights: FeatureWeights;
  
  /** 最小相似度阈值 (0-1) */
  minSimilarity?: number;
  
  /** 最大返回数量 */
  maxResults?: number;
}

/**
 * 客户特征向量
 */
export interface CustomerFeatureVector {
  customerId: number;
  features: number[];
  normalizedFeatures?: number[];
}

/**
 * 相似度计算结果
 */
export interface SimilarityResult {
  /** 目标客户 ID */
  targetCustomerId: number;
  
  /** 相似客户 ID */
  similarCustomerId: number;
  
  /** 相似度得分 (0-1) */
  similarity: number;
  
  /** 排名 */
  rank?: number;
}

/**
 * 批量相似度计算结果
 */
export interface BatchSimilarityResults {
  targetCustomerId: number;
  results: Array<{
    customerId: number;
    customerName?: string;
    similarity: number;
    rank: number;
  }>;
  totalCandidates: number;
  aboveThreshold: number;
  computationTime: number; // 毫秒
}

/**
 * 特征统计信息 (用于 Z-Score 归一化)
 */
export interface FeatureStatistics {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

/**
 * 相似度算法接口
 */
export interface ISimilarityAlgorithm {
  /**
   * 计算两个向量的相似度
   * @param vecA 向量 A
   * @param vecB 向量 B
   * @returns 相似度值 (0-1)
   */
  calculate(vecA: number[], vecB: number[]): number;
  
  /**
   * 算法名称
   */
  readonly name: string;
}

/**
 * 默认配置
 */
export const DEFAULT_SIMILARITY_CONFIG: SimilarityConfig = {
  algorithm: 'cosine',
  normalizeMethod: 'minmax',
  featureWeights: {
    assetWeight: 0.25,
    incomeWeight: 0.20,
    spendWeight: 0.20,
    orderCountWeight: 0.10,
    levelWeight: 0.15,
    riskLevelWeight: 0.10,
    cityWeight: 0.05,
    registerDaysWeight: 0.05,
  },
  minSimilarity: 0.6,
  maxResults: 10,
};
