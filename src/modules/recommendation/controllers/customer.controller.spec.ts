import { Test, TestingModule } from '@nestjs/testing';
import { CustomerController } from './customer.controller';
import { CustomerService } from '../services/customer.service';
import { RfmAnalysisService } from '../services/rfm-analysis.service';
import { CreateCustomerDto, UpdateCustomerDto, GetCustomersDto, GenerateRandomCustomersDto } from '../dto/customer.dto';
import { CustomerLevel, RiskLevel, Gender } from '../entities/customer.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CustomerController', () => {
  let controller: CustomerController;
  let customerService: Partial<CustomerService>;
  let rfmAnalysisService: Partial<RfmAnalysisService>;

  beforeEach(async () => {
    customerService = {
      create: jest.fn(),
      batchCreate: jest.fn(),
      generateRandomCustomers: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      batchRemove: jest.fn(),
      getStatistics: jest.fn(),
    };

    rfmAnalysisService = {
      getRfmAnalysis: jest.fn(),
      getRfmSummary: jest.fn(),
      getHighValueCustomers: jest.fn(),
      getRfmBySegment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [
        { provide: CustomerService, useValue: customerService },
        { provide: RfmAnalysisService, useValue: rfmAnalysisService },
      ],
    }).compile();

    controller = module.get<CustomerController>(CustomerController);
  });

  it('应该被定义', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('应该创建客户', async () => {
      const dto: CreateCustomerDto = {
        name: '测试客户',
        email: 'test@example.com',
        phone: '13800138000',
        level: CustomerLevel.GOLD,
      };
      const result = { id: 1, ...dto, createdAt: new Date() };
      
      (customerService.create as jest.Mock).mockResolvedValue(result);

      const created = await controller.create(dto);
      
      expect(customerService.create).toHaveBeenCalledWith(dto);
      expect(created).toEqual(result);
    });

    it('应该处理创建失败的情况', async () => {
      const dto: CreateCustomerDto = {
        name: '测试客户',
        email: 'invalid-email',
      };
      
      (customerService.create as jest.Mock).mockRejectedValue(new BadRequestException('邮箱格式不正确'));

      await expect(controller.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('batchCreate', () => {
    it('应该批量创建客户', async () => {
      const customers: CreateCustomerDto[] = [
        { name: '客户 1', email: 'c1@example.com' },
        { name: '客户 2', email: 'c2@example.com' },
      ];
      const result = [{ id: 1, ...customers[0] }, { id: 2, ...customers[1] }];
      
      (customerService.batchCreate as jest.Mock).mockResolvedValue(result);

      const created = await controller.batchCreate(customers);
      
      expect(customerService.batchCreate).toHaveBeenCalledWith(customers);
      expect(created).toEqual(result);
    });

    it('应该处理空数组', async () => {
      (customerService.batchCreate as jest.Mock).mockResolvedValue([]);

      const result = await controller.batchCreate([]);
      
      expect(result).toEqual([]);
    });
  });

  describe('generateRandom', () => {
    it('应该生成随机客户数据', async () => {
      const dto: GenerateRandomCustomersDto = { count: 10 };
      const result = Array(10).fill({ id: 1, name: '随机客户' });
      
      (customerService.generateRandomCustomers as jest.Mock).mockResolvedValue(result);

      const generated = await controller.generateRandom(dto);
      
      expect(customerService.generateRandomCustomers).toHaveBeenCalledWith(dto);
      expect(generated).toHaveLength(10);
    });

    it('应该使用默认数量生成', async () => {
      const result = Array(5).fill({ id: 1, name: '随机客户' });
      (customerService.generateRandomCustomers as jest.Mock).mockResolvedValue(result);

      await controller.generateRandom({ count: 5 } as GenerateRandomCustomersDto);
      
      expect(customerService.generateRandomCustomers).toHaveBeenCalledWith({ count: 5 });
    });
  });

  describe('findAll', () => {
    it('应该获取客户列表（分页）', async () => {
      const query: GetCustomersDto = { page: 1, limit: 10 };
      const result = { data: [{ id: 1, name: '客户 1' }], total: 1, page: 1, limit: 10 };
      
      (customerService.findAll as jest.Mock).mockResolvedValue(result);

      const customers = await controller.findAll(query);
      
      expect(customerService.findAll).toHaveBeenCalledWith(query);
      expect(customers).toEqual(result);
    });

    it('应该支持多条件筛选', async () => {
      const query: GetCustomersDto = {
        keyword: '测试',
        city: '北京',
        level: CustomerLevel.GOLD,
        riskLevel: RiskLevel.LOW,
        gender: Gender.MALE,
        minAge: 25,
        maxAge: 45,
        minAssets: 100000,
        maxAssets: 1000000,
        isActive: true,
      };
      const result = { data: [], total: 0, page: 1, limit: 20 };
      (customerService.findAll as jest.Mock).mockResolvedValue(result);

      await controller.findAll(query);
      
      expect(customerService.findAll).toHaveBeenCalledWith(query);
    });

    it('应该支持排序', async () => {
      const query: GetCustomersDto = {
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      const result = { data: [], total: 0, page: 1, limit: 20 };
      (customerService.findAll as jest.Mock).mockResolvedValue(result);

      await controller.findAll(query);
      
      expect(customerService.findAll).toHaveBeenCalledWith(query);
    });

    it('应该支持空参数查询', async () => {
      const result = { data: [], total: 0, page: 1, limit: 20 };
      (customerService.findAll as jest.Mock).mockResolvedValue(result);

      await controller.findAll({});
      
      expect(customerService.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('statistics', () => {
    it('应该获取客户统计信息', async () => {
      const stats = {
        total: 100,
        byLevel: { GOLD: 30, SILVER: 50, BRONZE: 20 },
        byCity: { '北京': 40, '上海': 60 },
        avgAge: 35,
        avgAssets: 500000,
      };
      (customerService.getStatistics as jest.Mock).mockResolvedValue(stats);

      const result = await controller.statistics();
      
      expect(customerService.getStatistics).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });

    it('应该处理空统计数据', async () => {
      const stats = { total: 0, byLevel: {}, byCity: {}, avgAge: 0, avgAssets: 0 };
      (customerService.getStatistics as jest.Mock).mockResolvedValue(stats);

      const result = await controller.statistics();
      
      expect(result).toEqual(stats);
    });
  });

  describe('findOne', () => {
    it('应该获取单个客户详情', async () => {
      const id = 1;
      const result = { 
        id, 
        name: '测试客户', 
        email: 'test@example.com',
        level: CustomerLevel.GOLD,
      };
      (customerService.findById as jest.Mock).mockResolvedValue(result);

      const customer = await controller.findOne(id);
      
      expect(customerService.findById).toHaveBeenCalledWith(id);
      expect(customer).toEqual(result);
    });

    it('应该处理客户不存在的情况', async () => {
      const id = 999;
      (customerService.findById as jest.Mock).mockRejectedValue(new NotFoundException(`客户 ${id} 不存在`));

      await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('应该更新客户', async () => {
      const id = 1;
      const dto: UpdateCustomerDto = { 
        name: '新名字',
        level: CustomerLevel.PLATINUM,
      };
      const result = { id, ...dto, updatedAt: new Date() };
      (customerService.update as jest.Mock).mockResolvedValue(result);

      const updated = await controller.update(id, dto);
      
      expect(customerService.update).toHaveBeenCalledWith(id, dto);
      expect(updated).toEqual(result);
    });

    it('应该处理部分更新', async () => {
      const id = 1;
      const dto: UpdateCustomerDto = { totalAssets: 2000000 };
      const result = { id, name: '原名', ...dto };
      (customerService.update as jest.Mock).mockResolvedValue(result);

      await controller.update(id, dto);
      
      expect(customerService.update).toHaveBeenCalledWith(id, dto);
    });

    it('应该处理更新失败', async () => {
      const id = 1;
      const dto: UpdateCustomerDto = { level: 'INVALID_LEVEL' as any };
      (customerService.update as jest.Mock).mockRejectedValue(new BadRequestException('无效的客户等级'));

      await expect(controller.update(id, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('应该删除客户', async () => {
      const id = 1;
      (customerService.remove as jest.Mock).mockResolvedValue(undefined);

      await controller.remove(id);
      
      expect(customerService.remove).toHaveBeenCalledWith(id);
    });

    it('应该处理删除不存在的客户', async () => {
      const id = 999;
      (customerService.remove as jest.Mock).mockRejectedValue(new NotFoundException(`客户 ${id} 不存在`));

      await expect(controller.remove(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('batchRemove', () => {
    it('应该批量删除客户', async () => {
      const ids = [1, 2, 3];
      (customerService.batchRemove as jest.Mock).mockResolvedValue(ids.length);

      const result = await controller.batchRemove(ids);
      
      expect(customerService.batchRemove).toHaveBeenCalledWith(ids);
      expect(result).toBe(ids.length);
    });

    it('应该处理空 ID 数组', async () => {
      (customerService.batchRemove as jest.Mock).mockResolvedValue(0);

      const result = await controller.batchRemove([]);
      
      expect(result).toBe(0);
    });
  });

  describe('test endpoints', () => {
    describe('test', () => {
      it('应该返回测试成功', async () => {
        const result = await controller.test();
        
        expect(result).toEqual({ success: true, message: 'This is a test' });
      });
    });

    describe('simpleTest', () => {
      it('应该返回简单测试结果', async () => {
        const result = await controller.simpleTest({});
        
        expect(result.success).toBe(true);
        expect(result.message).toBe('Simple test passed');
        expect(result.timestamp).toBeDefined();
      });
    });

    describe('healthCheck', () => {
      it('应该返回健康状态', async () => {
        const result = await controller.healthCheck({});
        
        expect(result.status).toBe('healthy');
        expect(result.timestamp).toBeDefined();
        expect(result.uptime).toBeDefined();
      });
    });

    describe('echo', () => {
      it('应该回显消息', async () => {
        const result = await controller.echo('Hello World');
        
        expect(result.success).toBe(true);
        expect(result.received).toBe('Hello World');
      });

      it('应该处理空消息', async () => {
        const result = await controller.echo();
        
        expect(result.received).toBe('no message provided');
      });
    });

    describe('debugInfo', () => {
      it('应该返回调试信息', async () => {
        const result = await controller.debugInfo();
        
        expect(result.success).toBe(true);
        expect(result.environment).toBeDefined();
        expect(result.platform).toBeDefined();
        expect(result.nodeVersion).toBeDefined();
      });
    });
  });

  describe('RFM Analysis endpoints', () => {
    describe('getRfmAnalysis', () => {
      it('应该获取 RFM 分析结果', async () => {
        const body = { page: 1, limit: 20 };
        const result = { data: [], total: 0 };
        (rfmAnalysisService.getRfmAnalysis as jest.Mock).mockResolvedValue(result);

        const response = await controller.getRfmAnalysis(body);
        
        expect(rfmAnalysisService.getRfmAnalysis).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          segment: undefined,
          minTotalScore: undefined,
          maxTotalScore: undefined,
        });
        expect(response).toEqual(result);
      });

      it('应该处理字符串参数转换', async () => {
        const body = { page: '2', limit: '50' };
        const result = { data: [], total: 0 };
        (rfmAnalysisService.getRfmAnalysis as jest.Mock).mockResolvedValue(result);

        await controller.getRfmAnalysis(body);
        
        expect(rfmAnalysisService.getRfmAnalysis).toHaveBeenCalledWith({
          page: 2,
          limit: 50,
          segment: undefined,
          minTotalScore: undefined,
          maxTotalScore: undefined,
        });
      });

      it('应该支持按分段筛选', async () => {
        const body = { segment: '重要价值客户' };
        const result = { data: [], total: 0 };
        (rfmAnalysisService.getRfmAnalysis as jest.Mock).mockResolvedValue(result);

        await controller.getRfmAnalysis(body);
        
        expect(rfmAnalysisService.getRfmAnalysis).toHaveBeenCalledWith(expect.objectContaining({
          segment: '重要价值客户',
        }));
      });
    });

    describe('testRfm', () => {
      it('应该返回 RFM 测试端点', async () => {
        const result = await controller.testRfm();
        
        expect(result.message).toBe('RFM test endpoint');
        expect(result.test).toBe(true);
      });
    });

    describe('getRfmSummary', () => {
      it('应该获取 RFM 统计汇总', async () => {
        const summary = {
          totalCustomers: 1000,
          segments: {
            '重要价值客户': 100,
            '重要发展客户': 200,
          },
        };
        (rfmAnalysisService.getRfmSummary as jest.Mock).mockResolvedValue(summary);

        const result = await controller.getRfmSummary({});
        
        expect(rfmAnalysisService.getRfmSummary).toHaveBeenCalled();
        expect(result).toEqual(summary);
      });
    });

    describe('getHighValueCustomers', () => {
      it('应该获取高价值客户列表', async () => {
        const body = { limit: 50 };
        const result = [{ id: 1, name: '高价值客户 1' }];
        (rfmAnalysisService.getHighValueCustomers as jest.Mock).mockResolvedValue(result);

        const response = await controller.getHighValueCustomers(body);
        
        expect(rfmAnalysisService.getHighValueCustomers).toHaveBeenCalledWith(50);
        expect(response).toEqual(result);
      });

      it('应该使用默认限制', async () => {
        const result = [{ id: 1, name: '高价值客户 1' }];
        (rfmAnalysisService.getHighValueCustomers as jest.Mock).mockResolvedValue(result);

        await controller.getHighValueCustomers({});
        
        expect(rfmAnalysisService.getHighValueCustomers).toHaveBeenCalledWith(50);
      });
    });

    describe('getRfmBySegment', () => {
      it('应该获取特定分段的客户', async () => {
        const segment = '重要价值客户';
        const result = [{ id: 1, name: '客户 1' }];
        (rfmAnalysisService.getRfmBySegment as jest.Mock).mockResolvedValue(result);

        const response = await controller.getRfmBySegment(segment, {});
        
        expect(rfmAnalysisService.getRfmBySegment).toHaveBeenCalledWith(segment);
        expect(response).toEqual(result);
      });
    });
  });

  describe('validation and error handling', () => {
    it('应该处理验证管道错误', async () => {
      const invalidDto = { email: 'invalid', level: 'INVALID' };
      (customerService.create as jest.Mock).mockRejectedValue(new BadRequestException('验证失败'));

      await expect(controller.create(invalidDto as any)).rejects.toThrow(BadRequestException);
    });

    it('应该处理数据库约束错误', async () => {
      const dto = { name: 'Duplicate', email: 'dup@example.com' };
      (customerService.create as jest.Mock).mockRejectedValue(new Error('duplicate key value violates unique constraint'));

      await expect(controller.create(dto)).rejects.toThrow();
    });
  });
});
