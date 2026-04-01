import { Test, TestingModule } from '@nestjs/testing';
import { ClusteringManagerController } from './clustering-manager.controller';
import { ClusteringManagerService } from '../services/clustering-manager.service';
import { CreateClusteringConfigDto, UpdateClusteringConfigDto } from '../dto/clustering-config.dto';

describe('ClusteringManagerController', () => {
  let controller: ClusteringManagerController;
  let service: Partial<ClusteringManagerService>;

  beforeEach(async () => {
    service = {
      createConfig: jest.fn(),
      getConfigs: jest.fn(),
      getConfigById: jest.fn(),
      updateConfig: jest.fn(),
      deleteConfig: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClusteringManagerController],
      providers: [
        { provide: ClusteringManagerService, useValue: service },
      ],
    }).compile();

    controller = module.get<ClusteringManagerController>(ClusteringManagerController);
  });

  it('应该被定义', () => {
    expect(controller).toBeDefined();
  });

  describe('createConfig', () => {
    it('应该创建聚类配置', async () => {
      const dto: CreateClusteringConfigDto = {
        configName: '客户分群',
        algorithm: 'k-means',
        parameters: {
          k: 5,
          maxIterations: 100,
          features: ['age', 'assets'],
        },
      };
      const result = { id: 1, ...dto, isActive: true };
      
      (service.createConfig as jest.Mock).mockResolvedValue(result);

      const created = await controller.createConfig(dto);
      
      expect(service.createConfig).toHaveBeenCalledWith(dto);
      expect(created).toEqual(result);
    });
  });

  describe('getConfigs', () => {
    it('应该获取聚类配置列表', async () => {
      const query = { page: 1, limit: 20, algorithm: 'k-means' };
      const result = { data: [{ id: 1, configName: '测试配置' }], total: 1 };
      
      (service.getConfigs as jest.Mock).mockResolvedValue(result);

      const configs = await controller.getConfigs(query);
      
      expect(service.getConfigs).toHaveBeenCalledWith(query);
      expect(configs).toEqual(result);
    });

    it('应该支持空参数查询', async () => {
      const result = { data: [], total: 0 };
      (service.getConfigs as jest.Mock).mockResolvedValue(result);

      await controller.getConfigs({});
      
      expect(service.getConfigs).toHaveBeenCalledWith({});
    });
  });

  describe('getConfigById', () => {
    it('应该获取配置详情', async () => {
      const id = 1;
      const result = { 
        id, 
        configName: '客户分群', 
        algorithm: 'k-means',
        parameters: { k: 5, maxIterations: 100 },
      };
      (service.getConfigById as jest.Mock).mockResolvedValue(result);

      const config = await controller.getConfigById(id);
      
      expect(service.getConfigById).toHaveBeenCalledWith(id);
      expect(config).toEqual(result);
    });
  });

  describe('updateConfig', () => {
    it('应该更新聚类配置', async () => {
      const id = 1;
      const dto: UpdateClusteringConfigDto = { 
        configName: '新名称',
        parameters: { k: 10, maxIterations: 200 },
      };
      const result = { id, ...dto };
      (service.updateConfig as jest.Mock).mockResolvedValue(result);

      const updated = await controller.updateConfig(id, dto);
      
      expect(service.updateConfig).toHaveBeenCalledWith(id, dto);
      expect(updated).toEqual(result);
    });
  });

  describe('deleteConfig', () => {
    it('应该删除聚类配置', async () => {
      const id = 1;
      (service.deleteConfig as jest.Mock).mockResolvedValue(undefined);

      await controller.deleteConfig(id);
      
      expect(service.deleteConfig).toHaveBeenCalledWith(id);
    });
  });
});
