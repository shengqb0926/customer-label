import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RfmAnalysisService } from './rfm-analysis.service';
import { Customer } from '../entities/customer.entity';
import { CustomerTag } from '../entities/customer-tag.entity';

describe('RfmAnalysisService', () => {
  let service: RfmAnalysisService;
  let customerRepo: Repository<Customer>;
  let customerTagRepo: Repository<CustomerTag>;

  const mockCustomers: Partial<Customer>[] = [
    {
      id: 1,
      name: '客户 1',
      totalAssets: 1000000,
      totalOrders: 50,
      totalSpent: 200000,
      lastOrderDate: new Date('2024-01-15'),
    },
    {
      id: 2,
      name: '客户 2',
      totalAssets: 500000,
      totalOrders: 20,
      totalSpent: 80000,
      lastOrderDate: new Date('2024-02-20'),
    },
    {
      id: 3,
      name: '客户 3',
      totalAssets: 2000000,
      totalOrders: 100,
      totalSpent: 500000,
      lastOrderDate: new Date('2024-03-01'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RfmAnalysisService,
        {
          provide: getRepositoryToken(Customer),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CustomerTag),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RfmAnalysisService>(RfmAnalysisService);
    customerRepo = module.get<Repository<Customer>>(getRepositoryToken(Customer));
    customerTagRepo = module.get<Repository<CustomerTag>>(getRepositoryToken(CustomerTag));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateRFMScores', () => {
    it('should calculate RFM scores for customers', async () => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue(mockCustomers as any);

      const result = await service.calculateRFMScores();

      expect(result).toHaveLength(3);
      expect(customerRepo.find).toHaveBeenCalled();
      
      // 验证返回结构
      result.forEach(item => {
        expect(item).toHaveProperty('customerId');
        expect(item).toHaveProperty('rScore');
        expect(item).toHaveProperty('fScore');
        expect(item).toHaveProperty('mScore');
        expect(item).toHaveProperty('rfmSegment');
      });
    });

    it('should handle empty customer list', async () => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue([]);

      const result = await service.calculateRFMScores();

      expect(result).toHaveLength(0);
    });
  });

  describe('getSegmentLabel', () => {
    it('should return correct label for Champions segment', () => {
      expect(service.getSegmentLabel(5, 5, 5)).toBe('重要价值客户');
    });

    it('should return correct label for Loyal Customers segment', () => {
      expect(service.getSegmentLabel(4, 5, 4)).toBe('重要深耕客户');
    });

    it('should return correct label for Potential Loyalists segment', () => {
      expect(service.getSegmentLabel(5, 3, 3)).toBe('重要发展客户');
    });

    it('should return correct label for At Risk segment', () => {
      expect(service.getSegmentLabel(2, 4, 4)).toBe('重要挽留客户');
    });

    it('should return correct label for Hibernating segment', () => {
      expect(service.getSegmentLabel(1, 1, 1)).toBe('一般客户');
    });
  });

  describe('generateRfmTags', () => {
    it('should generate tags based on RFM segments', async () => {
      const rfmScores = [
        {
          customerId: 1,
          rScore: 5,
          fScore: 5,
          mScore: 5,
          rfmSegment: 'Champions',
        },
      ];

      const mockTag = {
        customerId: 1,
        tagName: '重要价值客户',
        tagCategory: 'RFM 分析',
        confidence: 0.95,
        source: 'rfm',
        reason: 'RFM 分析结果',
      };

      jest.spyOn(customerTagRepo, 'create').mockReturnValue(mockTag as any);
      jest.spyOn(customerTagRepo, 'save').mockResolvedValue(mockTag as any);

      const result = await service.generateRfmTags(rfmScores as any);

      expect(result).toHaveLength(1);
      expect(customerTagRepo.create).toHaveBeenCalledWith({
        customerId: 1,
        tagName: '重要价值客户',
        tagCategory: 'RFM 分析',
        confidence: 0.95,
        source: 'rfm',
        reason: expect.stringContaining('Champions'),
      });
    });

    it('should handle multiple RFM scores', async () => {
      const rfmScores = [
        { customerId: 1, rScore: 5, fScore: 5, mScore: 5, rfmSegment: 'Champions' },
        { customerId: 2, rScore: 4, fScore: 4, mScore: 4, rfmSegment: 'Loyal Customers' },
      ];

      jest.spyOn(customerTagRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(customerTagRepo, 'save').mockResolvedValue({} as any);

      const result = await service.generateRfmTags(rfmScores as any);

      expect(result).toHaveLength(2);
      expect(customerTagRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('analyzeCustomerValue', () => {
    it('should classify high-value customers', () => {
      const customer = {
        totalAssets: 1000000,
        totalSpent: 200000,
        totalOrders: 50,
      };

      const result = service.analyzeCustomerValue(customer as any);

      expect(result.level).toBe('high');
      expect(result.score).toBeGreaterThan(50);
    });

    it('should classify medium-value customers', () => {
      const customer = {
        totalAssets: 500000,
        totalSpent: 80000,
        totalOrders: 20,
      };

      const result = service.analyzeCustomerValue(customer as any);

      expect(result.level).toBe('medium');
    });

    it('should classify low-value customers', () => {
      const customer = {
        totalAssets: 100000,
        totalSpent: 10000,
        totalOrders: 5,
      };

      const result = service.analyzeCustomerValue(customer as any);

      expect(result.level).toBe('low');
    });
  });

  describe('getRfmAnalysis', () => {
    it('should return paginated RFM analysis results', async () => {
      const mockAnalysis = [{
        customerId: 1,
        customerName: '客户 1',
        rScore: 5,
        fScore: 5,
        mScore: 5,
        totalScore: 15,
        customerSegment: 'Champions',
      }];

      jest.spyOn(service as any, 'analyzeRfm').mockResolvedValue(mockAnalysis);

      const result = await service.getRfmAnalysis({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by segment', async () => {
      const mockAnalysis = [
        { customerId: 1, customerSegment: 'Champions', totalScore: 15 },
        { customerId: 2, customerSegment: 'Loyal Customers', totalScore: 12 },
      ];

      jest.spyOn(service as any, 'analyzeRfm').mockResolvedValue(mockAnalysis as any);

      const result = await service.getRfmAnalysis({ segment: 'Champions' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].customerSegment).toBe('Champions');
    });
  });

  describe('executeRfmAnalysis', () => {
    it('should complete full RFM analysis workflow', async () => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue(mockCustomers as any);
      jest.spyOn(customerTagRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(customerTagRepo, 'save').mockResolvedValue({} as any);

      const result = await service.executeRfmAnalysis();

      expect(result.success).toBe(true);
      expect(result.taggedCount).toBe(3);
      expect(customerRepo.find).toHaveBeenCalled();
      expect(customerTagRepo.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(customerRepo, 'find').mockRejectedValue(new Error('Database error'));

      const result = await service.executeRfmAnalysis();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });
});
