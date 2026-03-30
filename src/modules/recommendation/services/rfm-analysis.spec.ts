import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RfmAnalysisService } from './rfm-analysis.service';
import { Customer, CustomerLevel, RiskLevel, Gender } from '../entities/customer.entity';

describe('RfmAnalysisService', () => {
  let service: RfmAnalysisService;
  let customerRepo: Repository<Customer>;

  const mockCustomers: Partial<Customer>[] = [
    {
      id: 1,
      name: '高价值客户',
      email: 'vip@example.com',
      isActive: true,
      orderCount: 50,
      annualSpend: 500000,
      lastLoginDays: 7,
      level: CustomerLevel.DIAMOND,
    },
    {
      id: 2,
      name: '普通客户',
      email: 'normal@example.com',
      isActive: true,
      orderCount: 5,
      annualSpend: 10000,
      lastLoginDays: 30,
      level: CustomerLevel.SILVER,
    },
    {
      id: 3,
      name: '流失客户',
      email: 'lost@example.com',
      isActive: true,
      orderCount: 1,
      annualSpend: 1000,
      lastLoginDays: 180,
      level: CustomerLevel.BRONZE,
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
          },
        },
      ],
    }).compile();

    service = module.get<RfmAnalysisService>(RfmAnalysisService);
    customerRepo = module.get<Repository<Customer>>(getRepositoryToken(Customer));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeRfm', () => {
    it('should return RFM analysis results for active customers', async () => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue(mockCustomers as any);

      const result = await service.analyzeRfm();

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('customerId');
      expect(result[0]).toHaveProperty('rScore');
      expect(result[0]).toHaveProperty('fScore');
      expect(result[0]).toHaveProperty('mScore');
      expect(result[0]).toHaveProperty('customerSegment');
      expect(result[0]).toHaveProperty('strategy');
    });

    it('should return empty array when no active customers', async () => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue([]);

      const result = await service.analyzeRfm();

      expect(result).toEqual([]);
    });

    it('should calculate RFM scores correctly', async () => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue(mockCustomers as any);

      const result = await service.analyzeRfm();

      // 高价值客户应该有较高的 F 和 M 分数
      expect(result[0].fScore).toBeGreaterThanOrEqual(1);
      expect(result[0].fScore).toBeLessThanOrEqual(5);
      expect(result[0].mScore).toBeGreaterThanOrEqual(1);
      expect(result[0].mScore).toBeLessThanOrEqual(5);
    });

    it('should assign correct customer segments', async () => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue(mockCustomers as any);

      const result = await service.analyzeRfm();

      result.forEach(item => {
        expect([
          '重要价值客户',
          '重要发展客户',
          '重要保持客户',
          '重要挽留客户',
          '一般价值客户',
          '一般发展客户',
          '一般保持客户',
          '一般挽留客户',
        ]).toContain(item.customerSegment);
      });
    });
  });

  describe('getRfmAnalysis', () => {
    beforeEach(() => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue(mockCustomers as any);
    });

    it('should return paginated RFM analysis', async () => {
      const result = await service.getRfmAnalysis({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
    });

    it('should filter by segment', async () => {
      const allAnalysis = await service.analyzeRfm();
      const targetSegment = allAnalysis[0].customerSegment;

      const result = await service.getRfmAnalysis({ segment: targetSegment });

      expect(result.data.every(item => item.customerSegment === targetSegment)).toBe(true);
    });

    it('should filter by minTotalScore', async () => {
      const result = await service.getRfmAnalysis({ minTotalScore: 10 });

      expect(result.data.every(item => item.totalScore >= 10)).toBe(true);
    });

    it('should filter by maxTotalScore', async () => {
      const result = await service.getRfmAnalysis({ maxTotalScore: 8 });

      expect(result.data.every(item => item.totalScore <= 8)).toBe(true);
    });
  });

  describe('getRfmSummary', () => {
    it('should return RFM summary statistics', async () => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue(mockCustomers as any);

      const result = await service.getRfmSummary();

      expect(result).toHaveProperty('totalCustomers', 3);
      expect(result).toHaveProperty('segmentDistribution');
      expect(result).toHaveProperty('avgRecency');
      expect(result).toHaveProperty('avgFrequency');
      expect(result).toHaveProperty('avgMonetary');
      expect(result).toHaveProperty('highValueRatio');
    });

    it('should handle zero customers', async () => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue([]);

      const result = await service.getRfmSummary();

      expect(result.totalCustomers).toBe(0);
      expect(result.avgRecency).toBe(0);
      expect(result.highValueRatio).toBe(0);
    });

    it('should calculate high value ratio correctly', async () => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue(mockCustomers as any);

      const result = await service.getRfmSummary();

      expect(result.highValueRatio).toBeGreaterThanOrEqual(0);
      expect(result.highValueRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('getRfmBySegment', () => {
    it('should return customers for specific segment', async () => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue(mockCustomers as any);

      const allAnalysis = await service.analyzeRfm();
      const targetSegment = allAnalysis[0].customerSegment;

      const result = await service.getRfmBySegment(targetSegment);

      expect(result.length).toBeGreaterThan(0);
      expect(result.every(item => item.customerSegment === targetSegment)).toBe(true);
    });

    it('should filter by segment correctly', async () => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue(mockCustomers as any);

      // Mock analyzeRfm to return controlled data
      const mockAnalysis = [
        { customerId: 1, customerSegment: '重要价值客户', totalScore: 15 },
        { customerId: 2, customerSegment: '一般发展客户', totalScore: 8 },
      ];

      jest.spyOn(service as any, 'analyzeRfm').mockResolvedValue(mockAnalysis);

      const result = await service.getRfmBySegment('重要价值客户');

      expect(result).toHaveLength(1);
      expect(result[0].customerSegment).toBe('重要价值客户');
    });
  });

  describe('getHighValueCustomers', () => {
    it('should return high value customers sorted by score', async () => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue(mockCustomers as any);

      const result = await service.getHighValueCustomers();

      expect(result.every(item => item.totalScore >= 10)).toBe(true);
      
      // 验证按分数降序排列
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].totalScore).toBeGreaterThanOrEqual(result[i].totalScore);
      }
    });

    it('should respect the limit parameter', async () => {
      jest.spyOn(customerRepo, 'find').mockResolvedValue(mockCustomers as any);

      const result = await service.getHighValueCustomers(2);

      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('calculateRfmScore', () => {
    it('should calculate score in range 1-5', async () => {
      const values = [10, 20, 30, 40, 50];
      
      // 测试正向评分（越高越好）
      const score1 = (service as any).calculateRfmScore(50, values, false);
      const score2 = (service as any).calculateRfmScore(10, values, false);
      
      expect(score1).toBeGreaterThanOrEqual(1);
      expect(score1).toBeLessThanOrEqual(5);
      expect(score2).toBeGreaterThanOrEqual(1);
      expect(score2).toBeLessThanOrEqual(5);
      expect(score1).toBeGreaterThan(score2);
    });

    it('should calculate reverse score correctly (lower is better)', async () => {
      const values = [10, 20, 30, 40, 50];
      
      // 测试反向评分（越低越好，如 R 值）
      const score1 = (service as any).calculateRfmScore(10, values, true);
      const score2 = (service as any).calculateRfmScore(50, values, true);
      
      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('determineCustomerSegment', () => {
    it('should classify as 重要价值客户 for high scores', () => {
      const result = (service as any).determineCustomerSegment(5, 5, 5);
      expect(result.segment).toBe('重要价值客户');
    });

    it('should classify as 重要发展客户 for high R,F but lower M', () => {
      const result = (service as any).determineCustomerSegment(4, 4, 3);
      expect(result.segment).toBe('重要发展客户');
    });

    it('should classify as 重要保持客户 for high R,M but lower F', () => {
      const result = (service as any).determineCustomerSegment(4, 3, 4);
      expect(result.segment).toBe('重要保持客户');
    });

    it('should classify as 重要挽留客户 for low R but high F,M', () => {
      const result = (service as any).determineCustomerSegment(3, 4, 4);
      expect(result.segment).toBe('重要挽留客户');
    });

    it('should include strategy for each segment', () => {
      const testCases = [
        [5, 5, 5],
        [4, 4, 3],
        [4, 3, 4],
        [3, 4, 4],
        [3, 3, 4],
        [4, 3, 3],
        [3, 4, 3],
        [3, 3, 3],
      ];

      testCases.forEach(([r, f, m]) => {
        const result = (service as any).determineCustomerSegment(r, f, m);
        expect(result.segment).toBeDefined();
        expect(result.strategy).toBeDefined();
      });
    });
  });
});
