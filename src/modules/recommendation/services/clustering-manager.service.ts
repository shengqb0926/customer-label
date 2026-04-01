import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { ClusteringConfig } from '../entities/clustering-config.entity';
import { CreateClusteringConfigDto, UpdateClusteringConfigDto } from '../dto/clustering-config.dto';
import { PaginatedResponse } from '../dto/get-recommendations.dto';

export interface GetClusteringConfigsDto {
  page?: number;
  limit?: number;
  configName?: string;
  algorithm?: string;
  isActive?: boolean;
  sortBy?: 'createdAt' | 'lastRunAt' | 'avgSilhouetteScore';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ClusteringManagerService {
  private readonly logger = new Logger(ClusteringManagerService.name);

  constructor(
    @InjectRepository(ClusteringConfig)
    private readonly configRepo: Repository<ClusteringConfig>,
  ) {}

  /**
   * 创建聚类配置
   */
  async createConfig(dto: CreateClusteringConfigDto): Promise<ClusteringConfig> {
    // 检查配置名称是否已存在
    const existing = await this.configRepo.findOne({
      where: { configName: dto.configName },
    });

    if (existing) {
      throw new BadRequestException(`配置名称 "${dto.configName}" 已存在`);
    }

    // 验证算法类型
    this.validateAlgorithm(dto.algorithm);

    // 验证参数
    this.validateParameters(dto.algorithm, dto.parameters);

    const config = this.configRepo.create({
      configName: dto.configName,
      algorithm: dto.algorithm,
      parameters: dto.parameters,
      featureWeights: dto.featureWeights || {},
      isActive: dto.isActive,
    });

    const saved = await this.configRepo.save(config);
    this.logger.log(`Created clustering config: ${saved.configName} (ID: ${saved.id})`);
    return saved;
  }

  /**
   * 分页获取聚类配置列表
   */
  async getConfigs(options: GetClusteringConfigsDto): Promise<PaginatedResponse<ClusteringConfig>> {
    const {
      page = 1,
      limit = 20,
      configName,
      algorithm,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const where: FindOptionsWhere<ClusteringConfig> = {};

    if (configName) {
      where.configName = Like(`%${configName}%`);
    }

    if (algorithm) {
      where.algorithm = algorithm as any;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const order: any = {};
    order[sortBy] = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const [data, total] = await this.configRepo.findAndCount({
      where,
      order,
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponse(data, total, page, limit);
  }

  /**
   * 获取单个配置详情
   */
  async getConfigById(id: number): Promise<ClusteringConfig> {
    const config = await this.configRepo.findOne({ where: { id } });

    if (!config) {
      throw new NotFoundException(`配置 ID ${id} 不存在`);
    }

    return config;
  }

  /**
   * 更新聚类配置
   */
  async updateConfig(id: number, dto: UpdateClusteringConfigDto): Promise<ClusteringConfig> {
    const config = await this.getConfigById(id);

    // 如果修改了配置名称，检查是否与其他配置冲突
    if (dto.configName && dto.configName !== config.configName) {
      const existing = await this.configRepo.findOne({
        where: { configName: dto.configName },
      });

      if (existing) {
        throw new BadRequestException(`配置名称 "${dto.configName}" 已存在`);
      }
    }

    // 如果修改了算法，验证有效性
    if (dto.algorithm) {
      this.validateAlgorithm(dto.algorithm);
      if (dto.parameters) {
        this.validateParameters(dto.algorithm, dto.parameters);
      }
    }

    Object.assign(config, dto);
    const updated = await this.configRepo.save(config);

    this.logger.log(`Updated clustering config: ${updated.configName} (ID: ${updated.id})`);
    return updated;
  }

  /**
   * 删除聚类配置
   */
  async deleteConfig(id: number): Promise<void> {
    const config = await this.getConfigById(id);

    await this.configRepo.remove(config);
    this.logger.log(`Deleted clustering config: ${config.configName} (ID: ${id})`);
  }

  /**
   * 激活配置
   */
  async activateConfig(id: number): Promise<ClusteringConfig> {
    const config = await this.getConfigById(id);
    config.isActive = true;
    const updated = await this.configRepo.save(config);
    this.logger.log(`Activated config: ${config.configName} (ID: ${id})`);
    return updated;
  }

  /**
   * 停用配置
   */
  async deactivateConfig(id: number): Promise<ClusteringConfig> {
    const config = await this.getConfigById(id);
    config.isActive = false;
    const updated = await this.configRepo.save(config);
    this.logger.log(`Deactivated config: ${config.configName} (ID: ${id})`);
    return updated;
  }

  /**
   * 执行聚类分析
   */
  async runClustering(configId: number, customerIds?: number[]): Promise<{
    success: boolean;
    clusterCount?: number;
    executionTime?: number;
    message?: string;
  }> {
    const config = await this.getConfigById(configId);

    if (!config.isActive) {
      throw new BadRequestException(`配置 "${config.configName}" 未激活，无法执行聚类`);
    }

    const startTime = Date.now();

    try {
      // TODO: 实现实际的聚类算法逻辑
      // 这里暂时返回模拟结果
      const mockClusterCount = config.parameters?.k || 5;
      const executionTime = Date.now() - startTime;

      // 更新配置的运行统计
      config.lastRunAt = new Date();
      config.lastClusterCount = mockClusterCount;
      config.avgSilhouetteScore = 0.75; // 模拟分数
      await this.configRepo.save(config);

      this.logger.log(`Clustering completed: ${mockClusterCount} clusters in ${executionTime}ms`);

      return {
        success: true,
        clusterCount: mockClusterCount,
        executionTime,
        message: `成功生成 ${mockClusterCount} 个客户群体`,
      };
    } catch (error) {
      this.logger.error(`Clustering failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: `聚类分析失败：${error.message}`,
      };
    }
  }

  /**
   * 获取聚类结果统计
   */
  async getClusteringStats(configId: number): Promise<{
    configName: string;
    algorithm: string;
    clusterCount: number;
    avgSilhouetteScore: number;
    lastRunAt: Date;
    isActive: boolean;
  } | null> {
    const config = await this.configRepo.findOne({ where: { id: configId } });

    if (!config || !config.lastRunAt) {
      return null;
    }

    return {
      configName: config.configName,
      algorithm: config.algorithm,
      clusterCount: config.lastClusterCount || 0,
      avgSilhouetteScore: config.avgSilhouetteScore || 0,
      lastRunAt: config.lastRunAt,
      isActive: config.isActive,
    };
  }

  /**
   * 验证算法类型
   */
  private validateAlgorithm(algorithm: string): void {
    const validAlgorithms = ['k-means', 'dbscan', 'hierarchical'];
    if (!validAlgorithms.includes(algorithm)) {
      throw new BadRequestException(
        `无效的算法类型：${algorithm}。支持的算法：${validAlgorithms.join(', ')}`,
      );
    }
  }

  /**
   * 验证算法参数
   */
  private validateParameters(algorithm: string, parameters: Record<string, any>): void {
    // 检查参数是否为有效对象
    if (!parameters || typeof parameters !== 'object') {
      throw new BadRequestException('参数必须是有效的对象');
    }

    // 根据不同算法验证必需参数
    if (algorithm === 'k-means') {
      // K-Means 需要 k 参数（聚类数量）
      const k = typeof parameters.k === 'string' ? Number(parameters.k) : parameters.k;
      if (k === undefined || k === null || typeof k !== 'number' || isNaN(k) || k < 2) {
        throw new BadRequestException('K-Means 算法需要指定参数 k（聚类数量），且必须 >= 2');
      }
      // 可选参数：最大迭代次数
      if (parameters.maxIterations !== undefined && parameters.maxIterations !== null) {
        const maxIter = typeof parameters.maxIterations === 'string' 
          ? Number(parameters.maxIterations) 
          : parameters.maxIterations;
        if (typeof maxIter !== 'number' || isNaN(maxIter) || maxIter < 1) {
          throw new BadRequestException('maxIterations 必须是正整数');
        }
      }
    } else if (algorithm === 'dbscan') {
      // DBSCAN 需要 eps 参数（邻域半径）
      const eps = typeof parameters.eps === 'string' ? Number(parameters.eps) : parameters.eps;
      if (eps === undefined || eps === null || typeof eps !== 'number' || isNaN(eps) || eps <= 0) {
        throw new BadRequestException('DBSCAN 算法需要指定参数 eps（邻域半径），且必须 > 0');
      }
      // DBSCAN 需要 minPoints 参数
      const minPoints = typeof parameters.minPoints === 'string' ? Number(parameters.minPoints) : parameters.minPoints;
      if (minPoints === undefined || minPoints === null || typeof minPoints !== 'number' || isNaN(minPoints) || minPoints < 1) {
        throw new BadRequestException('DBSCAN 算法需要指定参数 minPoints，且必须 >= 1');
      }
    } else if (algorithm === 'hierarchical') {
      // 层次聚类需要 nClusters 参数
      const nClusters = typeof parameters.nClusters === 'string' ? Number(parameters.nClusters) : parameters.nClusters;
      if (nClusters === undefined || nClusters === null || typeof nClusters !== 'number' || isNaN(nClusters) || nClusters < 2) {
        throw new BadRequestException('层次聚类需要指定参数 nClusters（聚类数量），且必须 >= 2');
      }
    }
  }
}
