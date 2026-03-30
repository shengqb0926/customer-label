import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AssociationManagerService } from './association-manager.service';
import { AssociationConfig } from '../entities/association-config.entity';

describe('AssociationManagerService', () => {
  let service: AssociationManagerService;
  let configRepo: Repository<AssociationConfig>;

  const mockAssociationConfig: Partial<AssociationConfig> = {
    id: 1,
    configName: '测试配置',
    description: '测试描述',
    algorithm: 'apriori',
    parameters: { minSupport: 0.5, minConfidence: 0.7, minLift: 1.0 },
    isActive: true,
    runCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssociationManagerService,
        {
          provide: getRepositoryToken(AssociationConfig),
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

    service = module.get<AssociationManagerService>(AssociationManagerService);
    configRepo = module.get<Repository<AssociationConfig>>(getRepositoryToken(AssociationConfig));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConfig', () => {
    it('should create config successfully', async () => {
      const dto = {
        configName: '新配置',
        description: '新描述',
        algorithm: 'apriori' as const,
        parameters: { minSupport: 0.3, minConfidence: 0.5, minLift: 1.0 },
        isActive: true,
      };

      jest.spyOn(configRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(configRepo, 'create').mockReturnValue(dto as any);
      jest.spyOn(configRepo, 'save').mockResolvedValue(mockAssociationConfig as any);

      const result = await service.createConfig(dto);

      expect(result).toEqual(mockAssociationConfig);
      expect(configRepo.findOne).toHaveBeenCalledWith({
        where: { configName: dto.configName },
      });
    });

    it('should throw BadRequestException if config name exists', async () => {
      const dto = { 
        configName: '已存在', 
        algorithm: 'apriori' as const,
        parameters: { minSupport: 0.5, minConfidence: 0.7, minLift: 1.0 }
      };

      jest.spyOn(configRepo, 'findOne').mockResolvedValue(mockAssociationConfig as any);

      await expect(service.createConfig(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getConfigs', () => {
    it('should return paginated configs', async () => {
      const mockConfigs = [mockAssociationConfig];
      jest.spyOn(configRepo, 'findAndCount').mockResolvedValue([mockConfigs as any, 1]);

      const result = await service.getConfigs({ page: 1, limit: 10 } as any);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by configName', async () => {
      jest.spyOn(configRepo, 'findAndCount').mockResolvedValue([[], 0]);

      await service.getConfigs({ configName: '测试' } as any);

      // Verify that findAndCount was called with a where condition containing the configName
      expect(configRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        }),
      );
      
      // Extract the actual call arguments to verify configName filter
      const callArgs = (configRepo.findAndCount as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.configName).toBeDefined();
    });

  });

  describe('getConfigById', () => {
    it('should return config by id', async () => {
      jest.spyOn(configRepo, 'findOne').mockResolvedValue(mockAssociationConfig as any);

      const result = await service.getConfigById(1);

      expect(result).toEqual(mockAssociationConfig);
    });

    it('should throw NotFoundException when config not found', async () => {
      jest.spyOn(configRepo, 'findOne').mockResolvedValue(null);

      await expect(service.getConfigById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateConfig', () => {
    it('should update config successfully', async () => {
      const dto = { description: '更新后的描述' };

      jest.spyOn(service, 'getConfigById').mockResolvedValue(mockAssociationConfig as any);
      jest.spyOn(configRepo, 'save').mockResolvedValue({ ...mockAssociationConfig, ...dto } as any);

      const result = await service.updateConfig(1, dto);

      expect(result.description).toBe('更新后的描述');
    });

    it('should throw NotFoundException when updating non-existent config', async () => {
      jest.spyOn(service, 'getConfigById').mockRejectedValue(new NotFoundException());

      await expect(service.updateConfig(999, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteConfig', () => {
    it('should delete config successfully', async () => {
      jest.spyOn(service, 'getConfigById').mockResolvedValue(mockAssociationConfig as any);
      jest.spyOn(configRepo, 'remove').mockResolvedValue(mockAssociationConfig as any);

      await service.deleteConfig(1);

      expect(configRepo.remove).toHaveBeenCalledWith(mockAssociationConfig);
    });

    it('should throw NotFoundException when deleting non-existent config', async () => {
      jest.spyOn(service, 'getConfigById').mockRejectedValue(new NotFoundException());

      await expect(service.deleteConfig(999)).rejects.toThrow(NotFoundException);
    });
  });
});
