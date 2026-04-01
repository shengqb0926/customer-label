import { AssociationManagerService } from './association-manager.service';
import { Repository } from 'typeorm';
import { AssociationConfig } from '../entities/association-config.entity';
import { CreateAssociationConfigDto, UpdateAssociationConfigDto, GetAssociationConfigsDto } from '../dto/association-config.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaginatedResponse } from '../dto/get-recommendations.dto';

describe('AssociationManagerService', () => {
  let service: AssociationManagerService;
  let mockConfigRepo: Partial<Repository<AssociationConfig>>;

  beforeEach(() => {
    // Mock TypeORM Repository
    mockConfigRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
    };

    service = new AssociationManagerService(mockConfigRepo as Repository<AssociationConfig>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createConfig', () => {
    it('should successfully create a new association config', async () => {
      const createDto: CreateAssociationConfigDto = {
        configName: 'test-config',
        description: 'Test configuration',
        algorithm: 'apriori',
        parameters: {
          minSupport: 0.5,
          minConfidence: 0.6,
          minLift: 1.2,
          maxItems: 3,
        },
        isActive: true,
      };

      const savedConfig = {
        id: 1,
        ...createDto,
        runCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as AssociationConfig;

      (mockConfigRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockConfigRepo.create as jest.Mock).mockReturnValue(savedConfig);
      (mockConfigRepo.save as jest.Mock).mockResolvedValue(savedConfig);

      const result = await service.createConfig(createDto);

      expect(result).toEqual(savedConfig);
      expect(mockConfigRepo.findOne).toHaveBeenCalledWith({
        where: { configName: 'test-config' },
      });
      expect(mockConfigRepo.create).toHaveBeenCalledWith({
        configName: 'test-config',
        description: 'Test configuration',
        algorithm: 'apriori',
        parameters: createDto.parameters,
        isActive: true,
        runCount: 0,
      });
    });

    it('should throw BadRequestException when config name already exists', async () => {
      const createDto: CreateAssociationConfigDto = {
        configName: 'existing-config',
        description: 'Test',
        algorithm: 'apriori',
        parameters: {
          minSupport: 0.5,
          minConfidence: 0.6,
          minLift: 1.2,
          maxItems: 3,
        },
      };

      (mockConfigRepo.findOne as jest.Mock).mockResolvedValue({ id: 1, configName: 'existing-config' });

      await expect(service.createConfig(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createConfig(createDto)).rejects.toThrow(
        '配置名称 "existing-config" 已存在',
      );
    });

    it('should throw BadRequestException for invalid algorithm', async () => {
      const createDto: CreateAssociationConfigDto = {
        configName: 'test-config',
        description: 'Test',
        algorithm: 'invalid-algo' as any,
        parameters: {
          minSupport: 0.5,
          minConfidence: 0.6,
          minLift: 1.2,
          maxItems: 3,
        },
      };

      await expect(service.createConfig(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid parameters - minSupport out of range', async () => {
      const createDto: CreateAssociationConfigDto = {
        configName: 'test-config',
        description: 'Test',
        algorithm: 'apriori',
        parameters: {
          minSupport: 1.5, // Invalid: > 1
          minConfidence: 0.6,
          minLift: 1.2,
          maxItems: 3,
        },
      };

      await expect(service.createConfig(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid parameters - minConfidence out of range', async () => {
      const createDto: CreateAssociationConfigDto = {
        configName: 'test-config',
        description: 'Test',
        algorithm: 'apriori',
        parameters: {
          minSupport: 0.5,
          minConfidence: -0.1, // Invalid: < 0
          minLift: 1.2,
          maxItems: 3,
        },
      };

      await expect(service.createConfig(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createConfig(createDto)).rejects.toThrow(
        '最小置信度必须在 0 到 1 之间',
      );
    });

    it('should throw BadRequestException for invalid parameters - minLift <= 0', async () => {
      const createDto: CreateAssociationConfigDto = {
        configName: 'test-config',
        description: 'Test',
        algorithm: 'apriori',
        parameters: {
          minSupport: 0.5,
          minConfidence: 0.6,
          minLift: 0, // Invalid: must be > 0
          maxItems: 3,
        },
      };

      await expect(service.createConfig(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createConfig(createDto)).rejects.toThrow(
        '最小提升度必须大于 0',
      );
    });
  });

  describe('getConfigs', () => {
    it('should return paginated configs without filters', async () => {
      const mockConfigs = [
        { id: 1, configName: 'config1', algorithm: 'apriori' },
        { id: 2, configName: 'config2', algorithm: 'fpgrowth' },
      ] as AssociationConfig[];

      (mockConfigRepo.findAndCount as jest.Mock).mockResolvedValue([mockConfigs, 2]);

      const dto: GetAssociationConfigsDto = { page: 1, limit: 10 };
      const result = await service.getConfigs(dto);

      expect(result).toBeInstanceOf(PaginatedResponse);
      expect(result.data).toEqual(mockConfigs);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by configName', async () => {
      const mockConfigs = [{ id: 1, configName: 'test-config', algorithm: 'apriori' }] as AssociationConfig[];
      (mockConfigRepo.findAndCount as jest.Mock).mockResolvedValue([mockConfigs, 1]);

      const dto: GetAssociationConfigsDto = { configName: 'test' };
      await service.getConfigs(dto);

      expect(mockConfigRepo.findAndCount).toHaveBeenCalledWith({
        where: { configName: expect.anything() },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' }, // Use uppercase to match actual implementation
      });
    });

    it('should filter by algorithm', async () => {
      const mockConfigs = [{ id: 1, configName: 'config1', algorithm: 'apriori' }] as AssociationConfig[];
      (mockConfigRepo.findAndCount as jest.Mock).mockResolvedValue([mockConfigs, 1]);

      const dto: GetAssociationConfigsDto = { algorithm: 'apriori' };
      await service.getConfigs(dto);

      expect(mockConfigRepo.findAndCount).toHaveBeenCalledWith({
        where: { algorithm: 'apriori' },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter by isActive status', async () => {
      const mockConfigs = [{ id: 1, configName: 'config1', isActive: true }] as AssociationConfig[];
      (mockConfigRepo.findAndCount as jest.Mock).mockResolvedValue([mockConfigs, 1]);

      const dto: GetAssociationConfigsDto = { isActive: true };
      await service.getConfigs(dto);

      expect(mockConfigRepo.findAndCount).toHaveBeenCalledWith({
        where: { isActive: true },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });

    it('should support custom sorting', async () => {
      const mockConfigs = [] as AssociationConfig[];
      (mockConfigRepo.findAndCount as jest.Mock).mockResolvedValue([mockConfigs, 0]);

      const dto: GetAssociationConfigsDto = { sortBy: 'createdAt', sortOrder: 'asc' };
      await service.getConfigs(dto);

      expect(mockConfigRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('getConfigById', () => {
    it('should return config by ID', async () => {
      const mockConfig = {
        id: 1,
        configName: 'test-config',
        algorithm: 'apriori',
      } as AssociationConfig;

      (mockConfigRepo.findOne as jest.Mock).mockResolvedValue(mockConfig);

      const result = await service.getConfigById(1);

      expect(result).toEqual(mockConfig);
      expect(mockConfigRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when config not found', async () => {
      (mockConfigRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getConfigById(999)).rejects.toThrow(NotFoundException);
      await expect(service.getConfigById(999)).rejects.toThrow(
        '关联规则配置 999 不存在',
      );
    });
  });

  describe('updateConfig', () => {
    it('should successfully update config', async () => {
      const existingConfig = {
        id: 1,
        configName: 'old-name',
        algorithm: 'apriori',
        parameters: { minSupport: 0.5 },
      } as AssociationConfig;

      const updateDto: UpdateAssociationConfigDto = {
        configName: 'new-name',
        parameters: { minSupport: 0.6, minConfidence: 0.7, minLift: 1.5 },
      };

      const updatedConfig = {
        ...existingConfig,
        ...updateDto,
      } as AssociationConfig;

      (mockConfigRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(existingConfig) // getConfigById
        .mockResolvedValueOnce(null); // check duplicate name
      (mockConfigRepo.save as jest.Mock).mockResolvedValue(updatedConfig);

      const result = await service.updateConfig(1, updateDto);

      expect(result).toEqual(updatedConfig);
      expect(mockConfigRepo.save).toHaveBeenCalledWith(expect.objectContaining(updateDto));
    });

    it('should throw BadRequestException when updating to duplicate name', async () => {
      const existingConfig = { id: 1, configName: 'old-name' } as AssociationConfig;
      const duplicateConfig = { id: 2, configName: 'new-name' } as AssociationConfig;

      (mockConfigRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(existingConfig)
        .mockResolvedValueOnce(duplicateConfig);

      await expect(service.updateConfig(1, { configName: 'new-name' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate new algorithm when updating', async () => {
      const existingConfig = { id: 1, configName: 'test' } as AssociationConfig;

      (mockConfigRepo.findOne as jest.Mock).mockResolvedValueOnce(existingConfig);

      await expect(service.updateConfig(1, { algorithm: 'invalid-algo' as any })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate new parameters when updating', async () => {
      const existingConfig = { id: 1, configName: 'test' } as AssociationConfig;

      (mockConfigRepo.findOne as jest.Mock).mockResolvedValueOnce(existingConfig);

      await expect(service.updateConfig(1, { parameters: { minSupport: 2.0, minConfidence: 0.5, minLift: 1.0 } })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteConfig', () => {
    it('should successfully delete config', async () => {
      const mockConfig = { id: 1, configName: 'test-config' } as AssociationConfig;

      (mockConfigRepo.findOne as jest.Mock).mockResolvedValue(mockConfig);
      (mockConfigRepo.remove as jest.Mock).mockResolvedValue(mockConfig);

      await service.deleteConfig(1);

      expect(mockConfigRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockConfigRepo.remove).toHaveBeenCalledWith(mockConfig);
    });

    it('should throw NotFoundException when deleting non-existent config', async () => {
      (mockConfigRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteConfig(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateConfig', () => {
    it('should activate config', async () => {
      const mockConfig = { id: 1, configName: 'test', isActive: false } as AssociationConfig;
      const activatedConfig = { ...mockConfig, isActive: true };

      (mockConfigRepo.findOne as jest.Mock).mockResolvedValue(mockConfig);
      (mockConfigRepo.save as jest.Mock).mockResolvedValue(activatedConfig);

      const result = await service.activateConfig(1);

      expect(result.isActive).toBe(true);
      expect(mockConfigRepo.save).toHaveBeenCalledWith(activatedConfig);
    });
  });

  describe('deactivateConfig', () => {
    it('should deactivate config', async () => {
      const mockConfig = { id: 1, configName: 'test', isActive: true } as AssociationConfig;
      const deactivatedConfig = { ...mockConfig, isActive: false };

      (mockConfigRepo.findOne as jest.Mock).mockResolvedValue(mockConfig);
      (mockConfigRepo.save as jest.Mock).mockResolvedValue(deactivatedConfig);

      const result = await service.deactivateConfig(1);

      expect(result.isActive).toBe(false);
    });
  });

  describe('runAssociation', () => {
    it('should increment runCount and update lastRunAt', async () => {
      const mockConfig = {
        id: 1,
        configName: 'test',
        runCount: 5,
        lastRunAt: new Date('2024-01-01'),
      } as AssociationConfig;

      const updatedConfig = {
        ...mockConfig,
        runCount: 6,
        lastRunAt: new Date(),
      };

      (mockConfigRepo.findOne as jest.Mock).mockResolvedValue(mockConfig);
      (mockConfigRepo.save as jest.Mock).mockResolvedValue(updatedConfig);

      const result = await service.runAssociation(1);

      expect(result.runCount).toBe(6);
      expect(result.lastRunAt).toBeDefined();
      expect(mockConfigRepo.save).toHaveBeenCalledWith(updatedConfig);
    });
  });

  describe('copyConfig', () => {
    it('should create a copy of config with "(副本)" suffix', async () => {
      const sourceConfig = {
        id: 1,
        configName: 'original-config',
        description: 'Test description',
        algorithm: 'apriori',
        parameters: { minSupport: 0.5 },
        isActive: true,
        runCount: 10,
      } as AssociationConfig;

      const copiedConfig = {
        id: 2,
        configName: 'original-config (副本)',
        description: 'Test description',
        algorithm: 'apriori',
        parameters: { minSupport: 0.5 },
        isActive: false,
        runCount: 0,
      } as AssociationConfig;

      (mockConfigRepo.findOne as jest.Mock).mockResolvedValue(sourceConfig);
      (mockConfigRepo.create as jest.Mock).mockReturnValue(copiedConfig);
      (mockConfigRepo.save as jest.Mock).mockResolvedValue(copiedConfig);

      const result = await service.copyConfig(1);

      expect(result.configName).toBe('original-config (副本)');
      expect(result.isActive).toBe(false);
      expect(result.runCount).toBe(0);
      expect(mockConfigRepo.create).toHaveBeenCalledWith({
        configName: 'original-config (副本)',
        description: 'Test description',
        algorithm: 'apriori',
        parameters: { minSupport: 0.5 },
        isActive: false,
        runCount: 0,
      });
    });
  });

  describe('validateAlgorithm', () => {
    it('should accept valid algorithms', () => {
      const validAlgorithms = ['apriori', 'fpgrowth', 'eclat'];
      
      validAlgorithms.forEach(algo => {
        expect(() => (service as any).validateAlgorithm(algo)).not.toThrow();
      });
    });

    it('should reject invalid algorithms', () => {
      expect(() => (service as any).validateAlgorithm('kmeans')).toThrow(BadRequestException);
      expect(() => (service as any).validateAlgorithm('dbscan')).toThrow(BadRequestException);
    });
  });

  describe('validateParameters', () => {
    it('should accept valid parameters', () => {
      const validParams = {
        minSupport: 0.5,
        minConfidence: 0.6,
        minLift: 1.2,
      };

      expect(() => (service as any).validateParameters(validParams)).not.toThrow();
    });

    it('should reject minSupport out of range', () => {
      expect(() => (service as any).validateParameters({ minSupport: -0.1, minConfidence: 0.5, minLift: 1.0 })).toThrow();
      expect(() => (service as any).validateParameters({ minSupport: 1.1, minConfidence: 0.5, minLift: 1.0 })).toThrow();
    });

    it('should reject minConfidence out of range', () => {
      expect(() => (service as any).validateParameters({ minSupport: 0.5, minConfidence: -0.1, minLift: 1.0 })).toThrow(BadRequestException);
      expect(() => (service as any).validateParameters({ minSupport: 0.5, minConfidence: 1.1, minLift: 1.0 })).toThrow(BadRequestException);
    });

    it('should reject minLift <= 0', () => {
      expect(() => (service as any).validateParameters({ minSupport: 0.5, minConfidence: 0.5, minLift: 0 })).toThrow(
        BadRequestException,
      );
      expect(() => (service as any).validateParameters({ minSupport: 0.5, minConfidence: 0.5, minLift: -1.0 })).toThrow(
        BadRequestException,
      );
      // Match the actual error message in Chinese
      expect(() => (service as any).validateParameters({ minSupport: 0.5, minConfidence: 0.5, minLift: 0 })).toThrow(
        '最小提升度必须大于 0',
      );
    });
  });
});
