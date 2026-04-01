import { Test, TestingModule } from '@nestjs/testing';
import { AssociationManagerController } from './association-manager.controller';
import { AssociationManagerService } from '../services/association-manager.service';
import { CreateAssociationConfigDto, UpdateAssociationConfigDto } from '../dto/association-config.dto';

describe('AssociationManagerController', () => {
  let controller: AssociationManagerController;
  let service: Partial<AssociationManagerService>;

  beforeEach(async () => {
    service = {
      createConfig: jest.fn(),
      getConfigs: jest.fn(),
      getConfigById: jest.fn(),
      updateConfig: jest.fn(),
      deleteConfig: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssociationManagerController],
      providers: [
        { provide: AssociationManagerService, useValue: service },
      ],
    }).compile();

    controller = module.get<AssociationManagerController>(AssociationManagerController);
  });

  it('应该被定义', () => {
    expect(controller).toBeDefined();
  });

  describe('createConfig', () => {
    it('应该创建关联规则配置', async () => {
      const dto: CreateAssociationConfigDto = {
        configName: '购物篮分析',
        algorithm: 'fpgrowth',
        parameters: {
          minSupport: 0.1,
          minConfidence: 0.6,
          minLift: 1.0,
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
    it('应该获取配置列表', async () => {
      const query = { page: 1, limit: 10, algorithm: 'fpgrowth' };
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
        configName: '购物篮分析', 
        algorithm: 'fpgrowth',
        parameters: { minSupport: 0.1, minConfidence: 0.6, minLift: 1.0 },
      };
      (service.getConfigById as jest.Mock).mockResolvedValue(result);

      const config = await controller.getConfigById(id);
      
      expect(service.getConfigById).toHaveBeenCalledWith(id);
      expect(config).toEqual(result);
    });
  });

  describe('updateConfig', () => {
    it('应该更新配置', async () => {
      const id = 1;
      const dto: UpdateAssociationConfigDto = { 
        configName: '新名称',
        parameters: { minSupport: 0.2, minConfidence: 0.7, minLift: 1.2 },
      };
      const result = { id, ...dto };
      (service.updateConfig as jest.Mock).mockResolvedValue(result);

      const updated = await controller.updateConfig(id, dto);
      
      expect(service.updateConfig).toHaveBeenCalledWith(id, dto);
      expect(updated).toEqual(result);
    });
  });

  describe('deleteConfig', () => {
    it('应该删除配置', async () => {
      const id = 1;
      (service.deleteConfig as jest.Mock).mockResolvedValue(undefined);

      await controller.deleteConfig(id);
      
      expect(service.deleteConfig).toHaveBeenCalledWith(id);
    });
  });
});
