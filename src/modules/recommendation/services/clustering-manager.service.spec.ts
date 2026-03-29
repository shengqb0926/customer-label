import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ClusteringManagerService } from './clustering-manager.service';
import { ClusteringConfig } from '../entities/clustering-config.entity';
import { UpdateClusteringConfigDto } from '../dto/clustering-config.dto';

describe('ClusteringManagerService', () => {
  let service: ClusteringManagerService;
  let configRepo: Repository<ClusteringConfig>;

  const mockClusteringConfig: Partial<ClusteringConfig> = {
    id: 1,
    configName: '测试聚类配置',
    algorithm: 'k-means',
    parameters: { k: 5, maxIter: 100 },
    featureWeights: { transactionFeatures: 0.4, timeFeatures: 0.3, otherFeatures: 0.3 },
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClusteringManagerService,
        {
          provide: getRepositoryToken(ClusteringConfig),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
            delete: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ClusteringManagerService>(ClusteringManagerService);
    configRepo = module.get<Repository<ClusteringConfig>>(getRepositoryToken(ClusteringConfig));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConfig', () => {
    it('should create config successfully', async () => {
      const dto = {
        configName: '新聚类配置',
        description: '新描述',
        algorithm: 'k-means' as const,
        parameters: { k: 5 },
        isActive: true,
      };

      jest.spyOn(configRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(configRepo, 'create').mockReturnValue(dto as any);
      jest.spyOn(configRepo, 'save').mockResolvedValue(mockClusteringConfig as any);

      const result = await service.createConfig(dto);

      expect(result).toEqual(mockClusteringConfig);
      expect(configRepo.findOne).toHaveBeenCalledWith({
        where: { configName: dto.configName },
      });
    });

    it('should throw BadRequestException if config name exists', async () => {
      const dto = { 
        configName: '已存在', 
        algorithm: 'k-means' as const,
        parameters: { k: 5 }
      };

      jest.spyOn(configRepo, 'findOne').mockResolvedValue(mockClusteringConfig as any);

      await expect(service.createConfig(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getConfigs', () => {
    it('should return paginated configs', async () => {
      const mockConfigs = [mockClusteringConfig];
      jest.spyOn(configRepo, 'findAndCount').mockResolvedValue([mockConfigs as any, 1]);

      const result = await service.getConfigs({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by configName', async () => {
      jest.spyOn(configRepo, 'findAndCount').mockResolvedValue([[], 0]);

      await service.getConfigs({ configName: '测试' });

      expect(configRepo.findAndCount).toHaveBeenCalled();
    });
  });

  describe('getConfigById', () => {
    it('should return config by id', async () => {
      jest.spyOn(configRepo, 'findOne').mockResolvedValue(mockClusteringConfig as any);

      const result = await service.getConfigById(1);

      expect(result).toEqual(mockClusteringConfig);
    });

    it('should throw NotFoundException when config not found', async () => {
      jest.spyOn(configRepo, 'findOne').mockResolvedValue(null);

      await expect(service.getConfigById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateConfig', () => {
    it('should update config successfully', async () => {
      const dto: UpdateClusteringConfigDto = { configName: '更新后的名称' };

      jest.spyOn(service, 'getConfigById').mockResolvedValue(mockClusteringConfig as any);
      jest.spyOn(configRepo, 'save').mockResolvedValue({ ...mockClusteringConfig, ...dto } as any);

      const result = await service.updateConfig(1, dto);

      expect(result.configName).toBe('更新后的名称');
    });

    it('should throw NotFoundException when updating non-existent config', async () => {
      jest.spyOn(service, 'getConfigById').mockRejectedValue(new NotFoundException());

      await expect(service.updateConfig(999, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteConfig', () => {
    it('should delete config successfully', async () => {
      jest.spyOn(service, 'getConfigById').mockResolvedValue(mockClusteringConfig as any);
      jest.spyOn(configRepo, 'remove').mockResolvedValue(mockClusteringConfig as any);

      await service.deleteConfig(1);

      expect(configRepo.remove).toHaveBeenCalledWith(mockClusteringConfig);
    });

    it('should throw NotFoundException when deleting non-existent config', async () => {
      jest.spyOn(service, 'getConfigById').mockRejectedValue(new NotFoundException());

      await expect(service.deleteConfig(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateConfig', () => {
    it('should activate config successfully', async () => {
      jest.spyOn(service, 'getConfigById').mockResolvedValue(mockClusteringConfig as any);
      jest.spyOn(configRepo, 'save').mockResolvedValue({ ...mockClusteringConfig, isActive: true } as any);

      const result = await service.activateConfig(1);

      expect(result.isActive).toBe(true);
    });
  });

  describe('deactivateConfig', () => {
    it('should deactivate config successfully', async () => {
      jest.spyOn(service, 'getConfigById').mockResolvedValue(mockClusteringConfig as any);
      jest.spyOn(configRepo, 'save').mockResolvedValue({ ...mockClusteringConfig, isActive: false } as any);

      const result = await service.deactivateConfig(1);

      expect(result.isActive).toBe(false);
    });
  });
});
