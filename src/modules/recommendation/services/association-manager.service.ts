import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { AssociationConfig } from '../entities/association-config.entity';
import { CreateAssociationConfigDto, UpdateAssociationConfigDto, GetAssociationConfigsDto } from '../dto/association-config.dto';
import { PaginatedResponse } from '../dto/get-recommendations.dto';

@Injectable()
export class AssociationManagerService {
  private readonly logger = new Logger(AssociationManagerService.name);

  constructor(
    @InjectRepository(AssociationConfig)
    private readonly configRepo: Repository<AssociationConfig>,
  ) {}

  /**
   * 创建关联规则配置
   */
  async createConfig(dto: CreateAssociationConfigDto): Promise<AssociationConfig> {
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
    this.validateParameters(dto.parameters);

    const config = this.configRepo.create({
      configName: dto.configName,
      description: dto.description,
      algorithm: dto.algorithm,
      parameters: dto.parameters,
      isActive: dto.isActive,
      runCount: 0,
    });

    const saved = await this.configRepo.save(config);
    this.logger.log(`创建关联规则配置：${saved.configName} (ID: ${saved.id})`);
    return saved;
  }

  /**
   * 获取关联规则配置列表（支持分页和过滤）
   */
  async getConfigs(dto: GetAssociationConfigsDto): Promise<PaginatedResponse<AssociationConfig>> {
    const { page = 1, limit = 10, configName, algorithm, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = dto;

    const where: FindOptionsWhere<AssociationConfig> = {};

    if (configName) {
      where.configName = Like(`%${configName}%`);
    }

    if (algorithm) {
      where.algorithm = algorithm as any; // Type assertion to handle TypeORM type constraints
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await this.configRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: {
        [sortBy]: sortOrder.toUpperCase() as 'ASC' | 'DESC',
      },
    });

    return new PaginatedResponse(data, total, page, limit);
  }

  /**
   * 根据 ID 获取关联规则配置
   */
  async getConfigById(id: number): Promise<AssociationConfig> {
    const config = await this.configRepo.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(`关联规则配置 ${id} 不存在`);
    }

    return config;
  }

  /**
   * 更新关联规则配置
   */
  async updateConfig(id: number, dto: UpdateAssociationConfigDto): Promise<AssociationConfig> {
    const config = await this.getConfigById(id);

    // 如果修改了算法，验证新算法
    if (dto.algorithm) {
      this.validateAlgorithm(dto.algorithm);
    }

    // 如果修改了参数，验证新参数
    if (dto.parameters) {
      this.validateParameters(dto.parameters);
    }

    // 如果修改了配置名称，检查是否重复
    if (dto.configName && dto.configName !== config.configName) {
      const existing = await this.configRepo.findOne({
        where: { configName: dto.configName },
      });

      if (existing) {
        throw new BadRequestException(`配置名称 "${dto.configName}" 已存在`);
      }
    }

    Object.assign(config, dto);
    const updated = await this.configRepo.save(config);
    this.logger.log(`更新关联规则配置：${updated.configName} (ID: ${updated.id})`);
    return updated;
  }

  /**
   * 删除关联规则配置
   */
  async deleteConfig(id: number): Promise<void> {
    const config = await this.getConfigById(id);
    await this.configRepo.remove(config);
    this.logger.log(`删除关联规则配置：${config.configName} (ID: ${id})`);
  }

  /**
   * 激活关联规则配置
   */
  async activateConfig(id: number): Promise<AssociationConfig> {
    const config = await this.getConfigById(id);
    config.isActive = true;
    return await this.configRepo.save(config);
  }

  /**
   * 停用关联规则配置
   */
  async deactivateConfig(id: number): Promise<AssociationConfig> {
    const config = await this.getConfigById(id);
    config.isActive = false;
    return await this.configRepo.save(config);
  }

  /**
   * 运行关联规则挖掘任务
   */
  async runAssociation(id: number): Promise<AssociationConfig> {
    const config = await this.getConfigById(id);
    
    // 更新运行统计
    config.runCount += 1;
    config.lastRunAt = new Date();
    
    // TODO: 这里应该触发实际的关联规则引擎执行
    // 暂时只更新运行次数和时间
    
    const updated = await this.configRepo.save(config);
    this.logger.log(`运行关联规则配置：${config.configName} (ID: ${id}), 运行次数：${config.runCount}`);
    
    return updated;
  }

  /**
   * 复制配置
   */
  async copyConfig(id: number): Promise<AssociationConfig> {
    const sourceConfig = await this.getConfigById(id);
    
    const newConfig = this.configRepo.create({
      configName: `${sourceConfig.configName} (副本)`,
      description: sourceConfig.description,
      algorithm: sourceConfig.algorithm,
      parameters: { ...sourceConfig.parameters },
      isActive: false, // 复制的配置默认停用
      runCount: 0,
    });

    const saved = await this.configRepo.save(newConfig);
    this.logger.log(`复制关联规则配置：${sourceConfig.configName} -> ${saved.configName} (ID: ${saved.id})`);
    return saved;
  }

  /**
   * 验证算法类型
   */
  private validateAlgorithm(algorithm: string): void {
    const validAlgorithms = ['apriori', 'fpgrowth', 'eclat'];
    if (!validAlgorithms.includes(algorithm)) {
      throw new BadRequestException(
        `无效的算法类型：${algorithm}。支持的算法：${validAlgorithms.join(', ')}`
      );
    }
  }

  /**
   * 验证参数
   */
  private validateParameters(parameters: any): void {
    if (!parameters.minSupport || parameters.minSupport < 0 || parameters.minSupport > 1) {
      throw new BadRequestException('最小支持度必须在 0 到 1 之间');
    }

    if (!parameters.minConfidence || parameters.minConfidence < 0 || parameters.minConfidence > 1) {
      throw new BadRequestException('最小置信度必须在 0 到 1 之间');
    }

    if (!parameters.minLift || parameters.minLift < 0) {
      throw new BadRequestException('最小提升度必须大于 0');
    }
  }
}
