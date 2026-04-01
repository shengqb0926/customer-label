import { CustomerService } from './customer.service';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Customer, CustomerLevel, RiskLevel, Gender } from '../entities/customer.entity';
import { CreateCustomerDto, UpdateCustomerDto, GetCustomersDto, GenerateRandomCustomersDto } from '../dto/customer.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CustomerService', () => {
  let service: CustomerService;
  let mockCustomerRepo: Partial<Repository<Customer>>;

  beforeEach(() => {
    // Mock TypeORM Repository
    mockCustomerRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    service = new CustomerService(mockCustomerRepo as Repository<Customer>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a customer', async () => {
      const createDto: CreateCustomerDto = {
        name: '张三',
        email: 'zhangsan@example.com',
        phone: '13800138000',
        gender: Gender.MALE,
        age: 30,
        city: '北京',
        level: CustomerLevel.GOLD,
        riskLevel: RiskLevel.MEDIUM,
        totalAssets: 1000000,
        isActive: true,
      };

      const savedCustomer = { id: 1, ...createDto } as Customer;

      (mockCustomerRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockCustomerRepo.create as jest.Mock).mockReturnValue(savedCustomer);
      (mockCustomerRepo.save as jest.Mock).mockResolvedValue(savedCustomer);

      const result = await service.create(createDto);

      expect(result).toEqual(savedCustomer);
      expect(mockCustomerRepo.findOne).toHaveBeenCalledWith({
        where: [{ email: 'zhangsan@example.com' }, { phone: '13800138000' }],
      });
      expect(mockCustomerRepo.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw BadRequestException when email already exists', async () => {
      const createDto: CreateCustomerDto = {
        name: '李四',
        email: 'existing@example.com',
        phone: '13900139000',
      };

      (mockCustomerRepo.findOne as jest.Mock).mockResolvedValue({
        id: 999,
        email: 'existing@example.com',
      });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow('邮箱或手机号已存在');
    });

    it('should throw BadRequestException when phone already exists', async () => {
      const createDto: CreateCustomerDto = {
        name: '王五',
        email: 'new@example.com',
        phone: '13800138000',
      };

      (mockCustomerRepo.findOne as jest.Mock).mockResolvedValue({
        id: 999,
        phone: '13800138000',
      });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('batchCreate', () => {
    it('should create multiple customers successfully', async () => {
      const customers: CreateCustomerDto[] = [
        { name: '客户 1', email: 'c1@example.com', phone: '13800000001' },
        { name: '客户 2', email: 'c2@example.com', phone: '13800000002' },
        { name: '客户 3', email: 'c3@example.com', phone: '13800000003' },
      ];

      const savedCustomers = customers.map((c, i) => ({ id: i + 1, ...c }));

      (mockCustomerRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockCustomerRepo.create as jest.Mock).mockImplementation((dto) => dto);
      (mockCustomerRepo.save as jest.Mock).mockImplementation(async (customer) => 
        savedCustomers.find(c => c.name === customer.name)
      );

      const result = await service.batchCreate(customers);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('客户 1');
      expect(result[1].name).toBe('客户 2');
      expect(result[2].name).toBe('客户 3');
    });

    it('should continue creating remaining customers even if some fail', async () => {
      const customers: CreateCustomerDto[] = [
        { name: '客户 1', email: 'c1@example.com', phone: '13800000001' },
        { name: '客户 2', email: 'duplicate@example.com', phone: '13800000002' }, // Will fail
        { name: '客户 3', email: 'c3@example.com', phone: '13800000003' },
      ];

      // First and third succeed, second fails
      (mockCustomerRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // For customer 1
        .mockResolvedValueOnce({ id: 999 }) // For customer 2 (duplicate)
        .mockResolvedValueOnce(null); // For customer 3

      (mockCustomerRepo.create as jest.Mock).mockImplementation((dto) => dto);
      (mockCustomerRepo.save as jest.Mock).mockImplementation(async (customer) => ({
        id: 1,
        ...customer,
      }));

      const result = await service.batchCreate(customers);

      expect(result).toHaveLength(2); // Only 2 succeeded
      expect(result.map(c => c.name)).toEqual(['客户 1', '客户 3']);
    });
  });

  describe('findById', () => {
    it('should return customer by ID', async () => {
      const mockCustomer = {
        id: 1,
        name: '张三',
        email: 'zhangsan@example.com',
      } as Customer;

      (mockCustomerRepo.findOne as jest.Mock).mockResolvedValue(mockCustomer);

      const result = await service.findById(1);

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when customer not found', async () => {
      (mockCustomerRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow('客户 #999 不存在');
    });
  });

  describe('findAll', () => {
    it('should return paginated customers without filters', async () => {
      const mockCustomers = [
        { id: 1, name: '客户 1' },
        { id: 2, name: '客户 2' },
      ] as Customer[];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockCustomers, 100]),
      } as unknown as SelectQueryBuilder<Customer>;

      (mockCustomerRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const options: GetCustomersDto = { page: 1, limit: 20 };
      const result = await service.findAll(options);

      expect(result.data).toEqual(mockCustomers);
      expect(result.total).toBe(100);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(5);
    });

    it('should filter by keyword (name or phone)', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      } as unknown as SelectQueryBuilder<Customer>;

      (mockCustomerRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      await service.findAll({ keyword: '张三' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(customer.name LIKE :keyword OR customer.phone LIKE :keyword)',
        { keyword: '%张三%' },
      );
    });

    it('should filter by email', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      } as unknown as SelectQueryBuilder<Customer>;

      (mockCustomerRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      await service.findAll({ email: 'test@example.com' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'customer.email LIKE :email',
        { email: '%test@example.com%' },
      );
    });

    it('should filter by city', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      } as unknown as SelectQueryBuilder<Customer>;

      (mockCustomerRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      await service.findAll({ city: '北京' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'customer.city = :city',
        { city: '北京' },
      );
    });

    it('should filter by level', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      } as unknown as SelectQueryBuilder<Customer>;

      (mockCustomerRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      await service.findAll({ level: CustomerLevel.GOLD });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'customer.level = :level',
        { level: CustomerLevel.GOLD },
      );
    });

    it('should filter by riskLevel', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      } as unknown as SelectQueryBuilder<Customer>;

      (mockCustomerRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      await service.findAll({ riskLevel: RiskLevel.HIGH });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'customer.riskLevel = :riskLevel',
        { riskLevel: RiskLevel.HIGH },
      );
    });

    it('should filter by gender', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      } as unknown as SelectQueryBuilder<Customer>;

      (mockCustomerRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      await service.findAll({ gender: Gender.FEMALE });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'customer.gender = :gender',
        { gender: Gender.FEMALE },
      );
    });

    it('should filter by age range', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      } as unknown as SelectQueryBuilder<Customer>;

      (mockCustomerRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      await service.findAll({ minAge: 25, maxAge: 45 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'customer.age >= :minAge',
        { minAge: 25 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'customer.age <= :maxAge',
        { maxAge: 45 },
      );
    });

    it('should filter by assets range', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      } as unknown as SelectQueryBuilder<Customer>;

      (mockCustomerRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      await service.findAll({ minAssets: 500000, maxAssets: 2000000 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'customer.totalAssets >= :minAssets',
        { minAssets: 500000 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'customer.totalAssets <= :maxAssets',
        { maxAssets: 2000000 },
      );
    });

    it('should filter by isActive status', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      } as unknown as SelectQueryBuilder<Customer>;

      (mockCustomerRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      await service.findAll({ isActive: false });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'customer.isActive = :isActive',
        { isActive: false },
      );
    });

    it('should apply custom sorting', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      } as unknown as SelectQueryBuilder<Customer>;

      (mockCustomerRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      await service.findAll({ sortBy: 'totalAssets', sortOrder: 'asc' });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('customer.totalAssets', 'ASC');
    });
  });

  describe('update', () => {
    it('should successfully update customer', async () => {
      const existingCustomer = {
        id: 1,
        name: '张三',
        email: 'zhangsan@example.com',
        phone: '13800138000',
      } as Customer;

      const updateDto: UpdateCustomerDto = {
        name: '张三（更新）',
        totalAssets: 2000000,
      };

      const updatedCustomer = {
        ...existingCustomer,
        ...updateDto,
      } as Customer;

      (mockCustomerRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(existingCustomer) // findById
        .mockResolvedValueOnce(null); // check duplicate
      (mockCustomerRepo.save as jest.Mock).mockResolvedValue(updatedCustomer);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(updatedCustomer);
      expect(mockCustomerRepo.save).toHaveBeenCalledWith(expect.objectContaining(updateDto));
    });

    it('should throw BadRequestException when updating to duplicate email', async () => {
      const existingCustomer = { id: 1, email: 'old@example.com' } as Customer;
      const otherCustomer = { id: 2, email: 'new@example.com' } as Customer;

      (mockCustomerRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(existingCustomer)
        .mockResolvedValueOnce(otherCustomer);

      await expect(service.update(1, { email: 'new@example.com' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when updating non-existent customer', async () => {
      (mockCustomerRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.update(999, { name: 'New Name' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should successfully remove customer', async () => {
      const mockCustomer = { id: 1, name: '张三' } as Customer;

      (mockCustomerRepo.findOne as jest.Mock).mockResolvedValue(mockCustomer);
      (mockCustomerRepo.remove as jest.Mock).mockResolvedValue(mockCustomer);

      await service.remove(1);

      expect(mockCustomerRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockCustomerRepo.remove).toHaveBeenCalledWith(mockCustomer);
    });

    it('should throw NotFoundException when removing non-existent customer', async () => {
      (mockCustomerRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('batchRemove', () => {
    it('should batch delete customers by IDs', async () => {
      (mockCustomerRepo.delete as jest.Mock).mockResolvedValue({ affected: 3 });

      await service.batchRemove([1, 2, 3]);

      expect(mockCustomerRepo.delete).toHaveBeenCalledWith([1, 2, 3]);
    });
  });

  describe('getStatistics', () => {
    it('should return customer statistics', async () => {
      const mockStats = {
        total: 1000,
        activeCount: 800,
        levelStats: [{ level: 'GOLD', count: '200' }],
        riskStats: [{ riskLevel: 'HIGH', count: '100' }],
        cityStats: [{ city: '北京', count: '150' }],
        avgAssets: { avg: '500000' },
      };

      (mockCustomerRepo.count as jest.Mock)
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(800); // activeCount

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockStats.levelStats),
        getRawOne: jest.fn().mockResolvedValue(mockStats.avgAssets),
      } as unknown as any;

      (mockCustomerRepo.createQueryBuilder as jest.Mock)
        .mockReturnValue(mockQueryBuilder);

      const result = await service.getStatistics();

      expect(result.total).toBe(1000);
      expect(result.activeCount).toBe(800);
      expect(result.inactiveCount).toBe(200);
      expect(result.levelStats).toHaveLength(1);
      expect(result.levelStats[0].count).toBe(200); // Converted to number
    });

    it('should handle empty statistics', async () => {
      (mockCustomerRepo.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ avg: null }),
      } as unknown as any;

      (mockCustomerRepo.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

      const result = await service.getStatistics();

      expect(result.total).toBe(0);
      expect(result.avgAssets).toBe(0);
    });
  });

  describe('generateChineseName', () => {
    it('should generate Chinese name for male', () => {
      const name = (service as any).generateChineseName(Gender.MALE);
      
      expect(name).toBeDefined();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(1);
    });

    it('should generate Chinese name for female', () => {
      const name = (service as any).generateChineseName(Gender.FEMALE);
      
      expect(name).toBeDefined();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(1);
    });

    it('should generate different names', () => {
      const names = new Set();
      for (let i = 0; i < 10; i++) {
        names.add((service as any).generateChineseName(Gender.MALE));
      }
      
      // Should generate unique names (high probability)
      expect(names.size).toBeGreaterThan(5);
    });
  });
});
