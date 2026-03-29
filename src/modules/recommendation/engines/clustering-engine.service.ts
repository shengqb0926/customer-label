import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClusteringConfig } from '../entities/clustering-config.entity';
import { TagRecommendation, CreateRecommendationDto } from '../entities/tag-recommendation.entity';

/**
 * 客户特征向量
 */
export interface CustomerFeatureVector {
  customerId: number;
  features: number[];
  featureNames: string[];
}

/**
 * 聚类结果
 */
interface ClusteringResult {
  clusterId: number;
  customerId: number;
  confidence: number;
  clusterProfile: ClusterProfile;
}

/**
 * 簇画像
 */
interface ClusterProfile {
  clusterId: number;
  size: number;
  center: number[];
  characteristics: string[];
  suggestedTags: Array<{ tagName: string; category: string; reason: string }>;
}

@Injectable()
export class ClusteringEngineService {
  private readonly logger = new Logger(ClusteringEngineService.name);
  
  // K-Means 算法参数
  private maxIterations = 100;
  private convergenceThreshold = 0.001;

  constructor(
    @InjectRepository(ClusteringConfig)
    private readonly configRepo: Repository<ClusteringConfig>,
  ) {}

  /**
   * 为客户生成推荐（聚类引擎）
   */
  async generateRecommendations(
    customers: CustomerFeatureVector[],
    config?: ClusteringConfig
  ): Promise<CreateRecommendationDto[]> {
    const recommendations: CreateRecommendationDto[] = [];

    try {
      // 加载默认配置
      if (!config) {
        config = await this.loadDefaultConfig();
      }

      const k = config.parameters?.k || 5;

      this.logger.log(`Starting clustering for ${customers.length} customers with K=${k}`);

      // 1. 提取特征矩阵
      const featureMatrix = customers.map(c => c.features);
      const featureNames = customers[0]?.featureNames || [];

      // 2. 执行 K-Means 聚类
      const clusters = await this.kMeans(featureMatrix, k);

      this.logger.log(`Clustering completed: ${clusters.centroids.length} clusters`);

      // 3. 分析每个簇的特征
      const clusterProfiles = await this.analyzeClusters(
        clusters,
        customers,
        featureNames,
        config
      );

      // 4. 为每个客户生成推荐
      for (let i = 0; i < customers.length; i++) {
        const clusterId = clusters.assignments[i];
        const profile = clusterProfiles.find(p => p.clusterId === clusterId);
        
        if (profile && profile.suggestedTags.length > 0) {
          const customer = customers[i];
          
          // 计算客户与簇中心的距离，作为置信度
          const distance = this.euclideanDistance(
            customer.features,
            profile.center
          );
          const maxDistance = this.calculateMaxDistance(clusters.centroids);
          const confidence = Math.max(0.5, 1 - (distance / maxDistance));

          for (const tag of profile.suggestedTags) {
            recommendations.push({
              customerId: customer.customerId,
              tagName: tag.tagName,
              tagCategory: tag.category,
              // 限制置信度范围在 0-0.9999 之间，避免数据库 numeric 字段溢出
              confidence: Math.min(Math.round(confidence * 100) / 100, 0.9999),
              source: 'clustering',
              reason: tag.reason,
            });
          }
        }
      }

      this.logger.log(`Clustering engine generated ${recommendations.length} recommendations`);
      return recommendations;
    } catch (error) {
      this.logger.error('Clustering engine failed:', error);
      return [];
    }
  }

  /**
   * K-Means 聚类算法实现
   */
  private async kMeans(
    data: number[][],
    k: number
  ): Promise<{ centroids: number[][]; assignments: number[] }> {
    if (data.length === 0 || k <= 0) {
      throw new Error('Invalid data or k value');
    }

    const n = data.length;
    const dimensions = data[0].length;

    // 1. 初始化质心（使用 K-Means++ 优化）
    let centroids = this.initializeCentroids(data, k);

    let assignments = new Array(n).fill(-1);
    let iterations = 0;

    while (iterations < this.maxIterations) {
      // 2. 分配每个点到最近的质心
      const newAssignments = data.map(point => 
        this.findNearestCentroid(point, centroids)
      );

      // 3. 检查是否收敛
      if (this.arraysEqual(assignments, newAssignments)) {
        this.logger.debug(`K-Means converged after ${iterations} iterations`);
        break;
      }

      assignments = newAssignments;

      // 4. 更新质心
      const newCentroids = [];
      for (let clusterId = 0; clusterId < k; clusterId++) {
        const clusterPoints = data.filter((_, idx) => assignments[idx] === clusterId);
        
        if (clusterPoints.length === 0) {
          // 空簇，随机重新初始化
          newCentroids.push(this.randomPoint(dimensions));
        } else {
          // 计算新质心（均值）
          const centroid = this.calculateCentroid(clusterPoints);
          newCentroids.push(centroid);
        }
      }

      centroids = newCentroids;
      iterations++;
    }

    return { centroids, assignments };
  }

  /**
   * K-Means++ 初始化质心
   */
  private initializeCentroids(data: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const n = data.length;

    // 1. 随机选择第一个质心
    const firstIndex = Math.floor(Math.random() * n);
    centroids.push([...data[firstIndex]]);

    // 2. 选择剩余质心
    while (centroids.length < k) {
      // 计算每个点到最近质心的距离平方
      const distances = data.map(point => {
        const minDist = Math.min(
          ...centroids.map(centroid => this.squaredDistance(point, centroid))
        );
        return minDist;
      });

      // 按距离平方比例选择下一个质心
      const totalDistance = distances.reduce((sum, d) => sum + d, 0);
      let random = Math.random() * totalDistance;
      
      for (let i = 0; i < n; i++) {
        random -= distances[i];
        if (random <= 0) {
          if (!centroids.some(c => this.arraysEqual(c, data[i]))) {
            centroids.push([...data[i]]);
          }
          break;
        }
      }
    }

    return centroids;
  }

  /**
   * 找到最近的质心
   */
  private findNearestCentroid(point: number[], centroids: number[][]): number {
    let minDistance = Infinity;
    let nearestCluster = 0;

    for (let i = 0; i < centroids.length; i++) {
      const distance = this.euclideanDistance(point, centroids[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCluster = i;
      }
    }

    return nearestCluster;
  }

  /**
   * 计算质心
   */
  private calculateCentroid(points: number[][]): number[] {
    const dimensions = points[0].length;
    const centroid = new Array(dimensions).fill(0);

    for (const point of points) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += point[i];
      }
    }

    return centroid.map(sum => sum / points.length);
  }

  /**
   * 分析簇特征并生成标签建议
   */
  private async analyzeClusters(
    clusters: { centroids: number[][]; assignments: number[] },
    customers: CustomerFeatureVector[],
    featureNames: string[],
    config: ClusteringConfig
  ): Promise<ClusterProfile[]> {
    const profiles: ClusterProfile[] = [];
    const k = clusters.centroids.length;

    for (let clusterId = 0; clusterId < k; clusterId++) {
      // 获取属于该簇的所有客户
      const clusterCustomers = customers.filter(
        (_, idx) => clusters.assignments[idx] === clusterId
      );

      if (clusterCustomers.length === 0) continue;

      // 计算簇的特征画像
      const characteristics = this.identifyClusterCharacteristics(
        clusters.centroids[clusterId],
        featureNames
      );

      // 生成建议标签
      const suggestedTags = this.generateSuggestedTags(
        characteristics,
        clusterId,
        config
      );

      profiles.push({
        clusterId,
        size: clusterCustomers.length,
        center: clusters.centroids[clusterId],
        characteristics,
        suggestedTags,
      });
    }

    return profiles;
  }

  /**
   * 识别簇特征
   */
  private identifyClusterCharacteristics(
    centroid: number[],
    featureNames: string[]
  ): string[] {
    const characteristics: string[] = [];

    // 找出显著高于平均的特征
    const avgValue = centroid.reduce((sum, v) => sum + v, 0) / centroid.length;
    
    for (let i = 0; i < centroid.length; i++) {
      if (centroid[i] > avgValue * 1.2) {
        characteristics.push(`${featureNames[i] || `Feature${i}`}偏高`);
      } else if (centroid[i] < avgValue * 0.8) {
        characteristics.push(`${featureNames[i] || `Feature${i}`}偏低`);
      }
    }

    return characteristics;
  }

  /**
   * 生成建议标签
   */
  private generateSuggestedTags(
    characteristics: string[],
    clusterId: number,
    config: ClusteringConfig
  ): Array<{ tagName: string; category: string; reason: string }> {
    const tags: Array<{ tagName: string; category: string; reason: string }> = [];

    // 基于特征组合生成标签
    const text = characteristics.join(' ');

    if (text.includes('资产') || text.includes('income') || text.includes('value')) {
      tags.push({
        tagName: '高价值客户群',
        category: '客户价值',
        reason: `聚类分析显示该群体特征：${characteristics.slice(0, 3).join(', ')}`,
      });
    }

    if (text.includes('活跃') || text.includes('active') || text.includes('frequency')) {
      tags.push({
        tagName: '活跃客户群',
        category: '行为特征',
        reason: `聚类分析显示该群体活跃度较高`,
      });
    }

    if (text.includes('风险') || text.includes('risk')) {
      tags.push({
        tagName: '关注客户群',
        category: '风险预警',
        reason: `聚类分析显示该群体存在一定风险特征`,
      });
    }

    // 如果标签太少，添加通用标签
    if (tags.length === 0) {
      tags.push({
        tagName: `特色客户群-${clusterId + 1}`,
        category: '智能分群',
        reason: `基于聚类算法识别的特色客户群体`,
      });
    }

    return tags;
  }

  // ===== 工具方法 =====

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(
      a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
    );
  }

  private squaredDistance(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0);
  }

  private arraysEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, i) => val === b[i]);
  }

  private randomPoint(dimensions: number): number[] {
    return Array.from({ length: dimensions }, () => Math.random());
  }

  private calculateMaxDistance(centroids: number[][]): number {
    let maxDist = 0;
    for (let i = 0; i < centroids.length; i++) {
      for (let j = i + 1; j < centroids.length; j++) {
        const dist = this.euclideanDistance(centroids[i], centroids[j]);
        maxDist = Math.max(maxDist, dist);
      }
    }
    return maxDist || 1;
  }

  /**
   * 标准化特征数据
   */
  normalizeFeatures(features: number[][]): number[][] {
    if (features.length === 0) return [];

    const dimensions = features[0].length;
    const means = new Array(dimensions).fill(0);
    const stds = new Array(dimensions).fill(0);

    // 计算均值
    for (const row of features) {
      for (let i = 0; i < dimensions; i++) {
        means[i] += row[i];
      }
    }
    means.forEach((sum, i) => (means[i] /= features.length));

    // 计算标准差
    for (const row of features) {
      for (let i = 0; i < dimensions; i++) {
        stds[i] += Math.pow(row[i] - means[i], 2);
      }
    }
    stds.forEach((sum, i) => (stds[i] = Math.sqrt(sum / features.length) || 1));

    // 标准化
    return features.map(row =>
      row.map((val, i) => (val - means[i]) / stds[i])
    );
  }

  /**
   * 加载默认聚类配置（公共方法用于测试）
   */
  async loadDefaultConfig(): Promise<ClusteringConfig> {
    const config = await this.configRepo.findOne({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (config) {
      return config;
    }

    // 创建默认配置
    const defaultConfig = this.configRepo.create({
      configName: '默认配置',
      algorithm: 'k-means',
      parameters: { k: 5, maxIterations: 100, convergenceThreshold: 0.001 },
      featureWeights: {},
      isActive: true,
    });

    return await this.configRepo.save(defaultConfig);
  }

  /**
   * 根据聚类轮廓推断标签（公共方法用于测试）
   */
  async inferTagsFromCluster(profile: {
    clusterId?: number;
    size?: number;
    center?: number[];
    centroid?: number[];
    customerCount?: number;
    characteristics?: string[];
    avgFeatures?: Record<string, number>;
  }): Promise<CreateRecommendationDto[]> {
    const tags: CreateRecommendationDto[] = [];
    
    // 支持 center 和 centroid 两种字段名
    const centroid = profile.center || profile.centroid || [];
    
    if (!centroid || centroid.length === 0) {
      // 如果没有质心数据，返回默认标签
      return [{
        customerId: 0,
        tagName: '潜力客户',
        tagCategory: '增长潜力',
        confidence: 0.5,
        source: 'clustering',
        reason: `基于聚类分析，该客户群体具有发展潜力`,
      }];
    }
    
    // 根据质心特征值推断标签
    // 简单规则：根据质心位置生成标签
    if (centroid[0] > 0.7) {
      tags.push({
        customerId: 0,
        tagName: '高价值客户',
        tagCategory: '客户价值',
        confidence: 0.8,
        source: 'clustering',
        reason: `基于聚类分析，该客户群体特征与高价值客户群匹配`,
      });
    }
    
    if (centroid.length > 1 && centroid[1] > 0.6) {
      tags.push({
        customerId: 0,
        tagName: '活跃客户',
        tagCategory: '行为特征',
        confidence: 0.75,
        source: 'clustering',
        reason: `基于聚类分析，该客户群体活跃度较高`,
      });
    }
    
    if (centroid.length > 2 && centroid[2] > 0.5) {
      tags.push({
        customerId: 0,
        tagName: '购买力强',
        tagCategory: '消费能力',
        confidence: 0.7,
        source: 'clustering',
        reason: `基于聚类分析，该客户群体购买力较强`,
      });
    }
    
    // 如果没有自动生成标签，则提供一个通用标签
    if (tags.length === 0) {
      tags.push({
        customerId: 0,
        tagName: '潜力客户',
        tagCategory: '增长潜力',
        confidence: 0.6,
        source: 'clustering',
        reason: `基于聚类分析，该客户群体具有发展潜力`,
      });
    }
    
    return tags;
  }
}
