import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CustomerService } from './customer.service';
import { Customer, CustomerLevel, RiskLevel, Gender } from '../entities/customer.entity';
import { CreateCustomerDto, UpdateCustomerDto, GetCustomersDto } from '../dto/customer.dto';

describe('CustomerService', () => {
  let service: CustomerService;
  let repository: Repository<Customer>;

  const mockCustomer: Customer = {
    id: 1,
    name: '测试客户',
    email: 'test@example.com',
    phone: '13800138000',
    city: '北京',
    age: 35,
    gender: Gender.MALE,
    level: CustomerLevel.GOLD,
    riskLevel: RiskLevel.LOW,
    totalAssets: 500000,
    totalOrders: 50,
    totalSpent: 100000,
    lastOrderDate: new Date(),
    registerDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
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
            findAndCount: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    repository = module.get<Repository<Customer>>(getRepositoryToken(Customer));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new customer successfully', async () => {
      const dto: CreateCustomerDto = {
        name: '新客户',
        email: 'new@example.com',
        phone: '13900139000',
        city: '上海',
        age: 30,
        gender: Gender.FEMALE,
        level: CustomerLevel.SILVER,
        riskLevel: RiskLevel.MEDIUM,
        totalAssets: 200000,
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue(mockCustomer as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockCustomer as any);

      const result = await service.create(dto);

      expect(result).toEqual(mockCustomer);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: [
          { email: dto.email },
          { phone: dto.phone },
        ],
      });
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      const dto: CreateCustomerDto = {
        name: '重复客户',
        email: 'existing@example.com',
        phone: '13900139000',
        city: '北京',
        age: 25,
        gender: Gender.MALE,
        level: CustomerLevel.BRONZE,
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockCustomer as any);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow('邮箱或手机号已存在');
    });
  });

  describe('findById', () => {
    it('should return customer by id', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockCustomer as any);

      const result = await service.findById(1);

      expect(result).toEqual(mockCustomer);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when customer not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow('客户 #999 不存在');
    });
  });

  describe('findAll', () => {
    it('should return paginated customers with filters', async () => {
      const options: GetCustomersDto = {
        page: 1,
        limit: 20,
        keyword: '测试',
        city: '北京',
        level: 'gold',
      };

      const mockCustomers = [mockCustomer];
      jest.spyOn(repository, 'findAndCount').mockResolvedValue([mockCustomers as any, 1]);

      const result = await service.findAll(options);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should handle empty results', async () => {
      const options: GetCustomersDto = { page: 1, limit: 20 };

      jest.spyOn(repository, 'findAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll(options);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('update', () => {
    it('should update customer successfully', async () => {
      const updateDto: UpdateCustomerDto = {
        name: '更新后的名字',
        totalAssets: 600000,
      };

      const updatedCustomer = { ...mockCustomer, ...updateDto };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockCustomer as any);
      jest.spyOn(repository, 'update').mockResolvedValue({ affected: 1 } as any);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedCustomer as any);

      const result = await service.update(1, updateDto);

      expect(result.name).toBe('更新后的名字');
      expect(result.totalAssets).toBe(600000);
      expect(repository.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw NotFoundException when updating non-existent customer', async () => {
      const updateDto: UpdateCustomerDto = { name: '新名字' };

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete customer successfully', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockCustomer as any);
      jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 1 } as any);

      await service.delete(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when deleting non-existent customer', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('batchCreate', () => {
    it('should create multiple customers and skip failures', async () => {
      const dtos: CreateCustomerDto[] = [
        { name: '客户 1', email: 'c1@example.com', city: '北京', age: 30, gender: Gender.MALE, level: CustomerLevel.GOLD },
        { name: '客户 2', email: 'c2@example.com', city: '上海', age: 25, gender: Gender.FEMALE, level: CustomerLevel.SILVER },
      ];

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue(mockCustomer as any);
      jest.spyOn(repository, 'save').mockResolvedValue(mockCustomer as any);

      const result = await service.batchCreate(dtos);

      expect(result).toHaveLength(2);
    });
  });
});
