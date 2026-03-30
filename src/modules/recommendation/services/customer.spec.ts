import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { Customer, CustomerLevel, RiskLevel, Gender } from '../entities/customer.entity';
import { CreateCustomerDto } from '../dto/customer.dto';

describe('CustomerService', () => {
  let service: CustomerService;
  let customerRepo: Repository<Customer>;

  const mockCustomer: Partial<Customer> = {
    id: 1,
    name: '张三',
    email: 'zhangsan@example.com',
    phone: '13800138000',
    gender: Gender.MALE,
    age: 30,
    city: '北京',
    province: '北京市',
    address: '北京市朝阳区某某路 1 号',
    totalAssets: 500000,
    monthlyIncome: 15000,
    annualSpend: 120000,
    orderCount: 10,
    productCount: 5,
    registerDays: 365,
    lastLoginDays: 7,
    level: CustomerLevel.SILVER,
    riskLevel: RiskLevel.LOW,
    isActive: true,
    remarks: '测试客户',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: getRepositoryToken(Customer),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    customerRepo = module.get<Repository<Customer>>(getRepositoryToken(Customer));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new customer successfully', async () => {
      const createDto: CreateCustomerDto = {
        name: '李四',
        email: 'lisi@example.com',
        phone: '13900139000',
        gender: Gender.FEMALE,
        age: 28,
        city: '上海',
        level: CustomerLevel.GOLD,
      };

      const createdCustomer = { ...createDto, id: 2 } as Customer;

      jest.spyOn(customerRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(customerRepo, 'create').mockReturnValue(createdCustomer as any);
      jest.spyOn(customerRepo, 'save').mockResolvedValue(createdCustomer as any);

      const result = await service.create(createDto);

      expect(result).toEqual(createdCustomer);
      expect(customerRepo.create).toHaveBeenCalledWith(createDto);
      expect(customerRepo.save).toHaveBeenCalledWith(createdCustomer);
    });

    it('should throw BadRequestException if email or phone already exists', async () => {
      const createDto: CreateCustomerDto = {
        name: '王五',
        email: 'existing@example.com',
        phone: '13800138000',
      };

      jest.spyOn(customerRepo, 'findOne').mockResolvedValue(mockCustomer as any);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow('邮箱或手机号已存在');
    });
  });

  describe('batchCreate', () => {
    it('should batch create customers successfully', async () => {
      const customers: CreateCustomerDto[] = [
        { name: '客户 1', email: 'customer1@example.com', phone: '13800000001' },
        { name: '客户 2', email: 'customer2@example.com', phone: '13800000002' },
      ];

      const createdCustomers = customers.map((c, i) => ({ ...c, id: i + 1 }) as Customer);

      jest.spyOn(customerRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(customerRepo, 'create').mockImplementation((dto) => dto as any);
      jest.spyOn(customerRepo, 'save').mockImplementation(async (customer) => customer as any);

      const result = await service.batchCreate(customers);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('客户 1');
      expect(result[1].name).toBe('客户 2');
    });

    it('should handle partial failures in batch creation', async () => {
      const customers: CreateCustomerDto[] = [
        { name: '客户 1', email: 'customer1@example.com', phone: '13800000001' },
        { name: '客户 2', email: 'existing@example.com', phone: '13800138000' },
      ];

      jest.spyOn(customerRepo, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockCustomer as any);
      jest.spyOn(customerRepo, 'create').mockImplementation((dto) => dto as any);
      jest.spyOn(customerRepo, 'save').mockImplementation(async (customer) => customer as any);

      const result = await service.batchCreate(customers);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('客户 1');
    });
  });

  describe('findById', () => {
    it('should return customer by id', async () => {
      jest.spyOn(customerRepo, 'findOne').mockResolvedValue(mockCustomer as any);

      const result = await service.findById(1);

      expect(result).toEqual(mockCustomer);
      expect(customerRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when customer not found', async () => {
      jest.spyOn(customerRepo, 'findOne').mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow('客户 #999 不存在');
    });
  });

  describe('findAll', () => {
    const mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    it('should return paginated customers with filters', async () => {
      const customers = [mockCustomer];
      
      jest.spyOn(customerRepo, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([customers, 1]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(customerRepo.createQueryBuilder).toHaveBeenCalledWith('customer');
    });

    it('should handle keyword search', async () => {
      jest.spyOn(customerRepo, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ keyword: '张三' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('customer.name LIKE :keyword OR customer.phone LIKE :keyword'),
        expect.objectContaining({ keyword: '%张三%' }),
      );
    });

    it('should handle empty results', async () => {
      jest.spyOn(customerRepo, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should apply sorting correctly', async () => {
      jest.spyOn(customerRepo, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ sortBy: 'name', sortOrder: 'asc' });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('customer.name', 'ASC');
    });
  });

  describe('update', () => {
    it('should update customer successfully', async () => {
      const updateDto = {
        email: 'updated@example.com',
        totalAssets: 600000,
      };

      const updatedCustomer = { ...mockCustomer, ...updateDto };

      jest.spyOn(service as any, 'findById').mockResolvedValue(mockCustomer as any);
      jest.spyOn(customerRepo, 'findOne')
        .mockResolvedValueOnce(null); // No duplicate found
      jest.spyOn(customerRepo, 'save').mockResolvedValue(updatedCustomer as any);

      const result = await service.update(1, updateDto);

      expect(result.email).toBe('updated@example.com');
      expect(result.totalAssets).toBe(600000);
    });

    it('should throw NotFoundException when updating non-existent customer', async () => {
      jest.spyOn(service as any, 'findById').mockRejectedValue(new NotFoundException('客户 #999 不存在'));

      await expect(service.update(999, { email: 'new@example.com' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if email is duplicated', async () => {
      const updateDto = { email: 'duplicate@example.com' };

      // Mock findById to return existing customer (first call in update method)
      jest.spyOn(service as any, 'findById').mockResolvedValue(mockCustomer as any);
      
      // Mock the duplicate check with Not operator (second call in update method)
      jest.spyOn(customerRepo, 'findOne')
        .mockResolvedValueOnce({ id: 2, email: 'duplicate@example.com' } as any);

      await expect(service.update(1, updateDto)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, updateDto)).rejects.toThrow(/邮箱或手机号已被其他客户使用/);
    });

    it('should succeed if email is not duplicated', async () => {
      const updateDto = { email: 'newemail@example.com' };
      const updatedCustomer = { ...mockCustomer, email: 'newemail@example.com' };

      jest.spyOn(service as any, 'findById').mockResolvedValue(mockCustomer as any);
      jest.spyOn(customerRepo, 'findOne')
        .mockResolvedValueOnce(null); // No duplicate found
      jest.spyOn(customerRepo, 'save').mockResolvedValue(updatedCustomer as any);

      const result = await service.update(1, updateDto);

      expect(result.email).toBe('newemail@example.com');
    });

  });

  describe('remove', () => {
    it('should delete customer successfully', async () => {
      jest.spyOn(customerRepo, 'findOne').mockResolvedValue(mockCustomer as any);
      jest.spyOn(customerRepo, 'remove').mockResolvedValue(mockCustomer as any);

      await service.remove(1);

      expect(customerRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(customerRepo.remove).toHaveBeenCalledWith(mockCustomer);
    });

    it('should throw NotFoundException when deleting non-existent customer', async () => {
      jest.spyOn(customerRepo, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('batchRemove', () => {
    it('should batch delete customers', async () => {
      jest.spyOn(customerRepo, 'delete').mockResolvedValue({ affected: 3 } as any);

      await service.batchRemove([1, 2, 3]);

      expect(customerRepo.delete).toHaveBeenCalledWith([1, 2, 3]);
    });
  });

  describe('getStatistics', () => {
    it('should return complete customer statistics', async () => {
      const mockLevelStats = [{ level: 'SILVER', count: '100' }];
      const mockRiskStats = [{ riskLevel: 'LOW', count: '80' }];
      const mockCityStats = [{ city: '北京', count: '50' }];

      // Mock count for total and activeCount - use mockResolvedValueOnce for two calls
      jest.spyOn(customerRepo, 'count')
        .mockResolvedValueOnce(250) // First call: total
        .mockResolvedValueOnce(200); // Second call: active
      
      jest.spyOn(customerRepo, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn()
          .mockResolvedValueOnce(mockLevelStats)
          .mockResolvedValueOnce(mockRiskStats)
          .mockResolvedValueOnce(mockCityStats),
        getRawOne: jest.fn().mockResolvedValue({ avg: 500000 }),
      } as any);

      const result = await service.getStatistics();

      expect(result.total).toBeGreaterThan(0);
      expect(result.activeCount).toBeDefined();
      expect(result.inactiveCount).toBeDefined();
      expect(result.levelStats).toBeDefined();
      expect(result.riskStats).toBeDefined();
      expect(result.cityStats).toBeDefined();
      expect(result.avgAssets).toBe(500000);
    });

    it('should handle zero customers', async () => {
      // Mock count to return zero for both calls
      jest.spyOn(customerRepo, 'count')
        .mockResolvedValueOnce(0) // First call: total
        .mockResolvedValueOnce(0); // Second call: active
      
      jest.spyOn(customerRepo, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ avg: null }),
      } as any);

      const result = await service.getStatistics();

      expect(result.total).toBe(0);
      expect(result.activeCount).toBe(0);
      expect(result.inactiveCount).toBe(0);
      expect(result.avgAssets).toBe(0);
    });
  });
});
