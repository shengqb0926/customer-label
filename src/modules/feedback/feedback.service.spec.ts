import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedbackService } from './feedback.service';
import { FeedbackStatistic } from './entities/feedback-statistic.entity';
import { GetFeedbackDto } from './dto/get-feedback.dto';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let feedbackRepo: Repository<FeedbackStatistic>;

  const mockFeedbackRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: getRepositoryToken(FeedbackStatistic),
          useValue: mockFeedbackRepo,
        },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    feedbackRepo = module.get<Repository<FeedbackStatistic>>(getRepositoryToken(FeedbackStatistic));
  });

  it('应被定义', () => {
    expect(service).toBeDefined();
  });

  describe('calculateAcceptanceRate()', () => {
    it('应该正确计算采纳率', () => {
      const rate = service.calculateAcceptanceRate(100, 75);
      expect(rate).toBe(0.75);
    });

    it('应该处理总数为 0 的情况', () => {
      const rate = service.calculateAcceptanceRate(0, 0);
      expect(rate).toBe(0);
    });

    it('应该保留 4 位小数', () => {
      const rate = service.calculateAcceptanceRate(3, 1);
      expect(rate).toBeCloseTo(0.3333, 4);
    });

    it('应该处理全部采纳的情况', () => {
      const rate = service.calculateAcceptanceRate(50, 50);
      expect(rate).toBe(1);
    });

    it('应该处理全部拒绝的情况', () => {
      const rate = service.calculateAcceptanceRate(50, 0);
      expect(rate).toBe(0);
    });
  });

  describe('recordDailyFeedback()', () => {
    const dto = {
      date: '2026-03-31',
      totalRecommendations: 100,
      acceptedCount: 80,
    };

    beforeEach(() => {
      mockFeedbackRepo.findOne.mockReset();
      mockFeedbackRepo.create.mockReset();
      mockFeedbackRepo.save.mockReset();
    });

    it('应该创建新的反馈记录', async () => {
      mockFeedbackRepo.findOne.mockResolvedValue(null);
      
      const mockEntity = { ...dto, rejectedCount: 20, acceptanceRate: 0.8 };
      mockFeedbackRepo.create.mockReturnValue(mockEntity);
      mockFeedbackRepo.save.mockResolvedValue(mockEntity);

      const result = await service.recordDailyFeedback(dto);

      expect(result.acceptanceRate).toBe(0.8);
      expect(result.rejectedCount).toBe(20);
      expect(feedbackRepo.create).toHaveBeenCalled();
      expect(feedbackRepo.save).toHaveBeenCalled();
    });

    it('应该更新现有的反馈记录', async () => {
      const existingEntity = { 
        id: 1, 
        ...dto, 
        acceptedCount: 50,
        rejectedCount: 50,
        acceptanceRate: 0.5 
      };
      
      mockFeedbackRepo.findOne.mockResolvedValue(existingEntity);
      mockFeedbackRepo.save.mockResolvedValue({
        ...existingEntity,
        acceptedCount: 80,
        rejectedCount: 20,
        acceptanceRate: 0.8,
      });

      const result = await service.recordDailyFeedback(dto);

      expect(result.acceptanceRate).toBe(0.8);
      expect(feedbackRepo.findOne).toHaveBeenCalled();
      expect(feedbackRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        acceptanceRate: 0.8,
      }));
    });

    it('应该使用提供的 rejectedCount', async () => {
      mockFeedbackRepo.findOne.mockResolvedValue(null);
      
      const dtoWithRejected = {
        ...dto,
        rejectedCount: 15,
      };
      
      const mockEntity = { ...dtoWithRejected, acceptanceRate: 0.85 };
      mockFeedbackRepo.create.mockReturnValue(mockEntity);
      mockFeedbackRepo.save.mockResolvedValue(mockEntity);

      await service.recordDailyFeedback(dtoWithRejected);

      expect(feedbackRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        rejectedCount: 15,
      }));
    });

    it('应该自动计算 rejectedCount 当未提供时', async () => {
      mockFeedbackRepo.findOne.mockResolvedValue(null);
      
      const mockEntity = { ...dto, rejectedCount: 20, acceptanceRate: 0.8 };
      mockFeedbackRepo.create.mockReturnValue(mockEntity);
      mockFeedbackRepo.save.mockResolvedValue(mockEntity);

      await service.recordDailyFeedback(dto);

      expect(feedbackRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        rejectedCount: 20, // 100 - 80
      }));
    });
  });

  describe('getByDate()', () => {
    it('应该获取指定日期的反馈', async () => {
      const mockFeedback = { date: '2026-03-31', acceptedCount: 50 };
      mockFeedbackRepo.findOne.mockResolvedValue(mockFeedback);

      const result = await service.getByDate('2026-03-31');

      expect(result).toEqual(mockFeedback);
      expect(feedbackRepo.findOne).toHaveBeenCalledWith({
        where: { date: '2026-03-31' },
      });
    });

    it('应该返回 null 当日期不存在', async () => {
      mockFeedbackRepo.findOne.mockResolvedValue(null);

      const result = await service.getByDate('2026-01-01');

      expect(result).toBeNull();
    });
  });

  describe('getRecentDays()', () => {
    it('应该获取最近 N 天的反馈', async () => {
      const mockFeedbacks = [
        { date: '2026-03-31', acceptedCount: 50 },
        { date: '2026-03-30', acceptedCount: 45 },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockFeedbacks),
      };

      mockFeedbackRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getRecentDays(7);

      expect(result).toHaveLength(2);
      expect(feedbackRepo.createQueryBuilder).toHaveBeenCalledWith('feedback');
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('feedback.date', 'DESC');
    });

    it('应该使用默认值 30 天', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockFeedbackRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getRecentDays();

      expect(feedbackRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('应该返回空数组当没有数据', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockFeedbackRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getRecentDays(7);

      expect(result).toHaveLength(0);
    });
  });

  describe('findAllWithPagination()', () => {
    beforeEach(() => {
      mockFeedbackRepo.findAndCount.mockReset();
    });

    it('应该分页获取反馈列表', async () => {
      const mockFeedbacks = [
        { date: '2026-03-31', acceptedCount: 50 },
        { date: '2026-03-30', acceptedCount: 45 },
      ];

      mockFeedbackRepo.findAndCount.mockResolvedValue([mockFeedbacks, 2]);

      const result = await service.findAllWithPagination({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(feedbackRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { date: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('应该应用日期范围过滤', async () => {
      mockFeedbackRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllWithPagination({
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      });

      expect(feedbackRepo.findAndCount).toHaveBeenCalledWith({
        where: {
          date: {
            '>=': '2026-03-01',
            '<=': '2026-03-31',
          },
        },
        order: { date: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('应该只应用开始日期过滤', async () => {
      mockFeedbackRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllWithPagination({
        startDate: '2026-03-01',
      });

      expect(feedbackRepo.findAndCount).toHaveBeenCalledWith({
        where: {
          date: {
            '>=': '2026-03-01',
          },
        },
        order: { date: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('应该只应用结束日期过滤', async () => {
      mockFeedbackRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllWithPagination({
        endDate: '2026-03-31',
      });

      expect(feedbackRepo.findAndCount).toHaveBeenCalledWith({
        where: {
          date: {
            '<=': '2026-03-31',
          },
        },
        order: { date: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('应该应用采纳率范围过滤', async () => {
      mockFeedbackRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllWithPagination({
        minAcceptanceRate: 0.5,
        maxAcceptanceRate: 0.9,
      });

      expect(feedbackRepo.findAndCount).toHaveBeenCalledWith({
        where: {
          acceptanceRate: {
            '>=': 0.5,
            '<=': 0.9,
          },
        },
        order: { date: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('应该支持自定义排序', async () => {
      mockFeedbackRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllWithPagination({
        sortBy: 'acceptedCount',
        sortOrder: 'asc',
      });

      expect(feedbackRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { acceptedCount: 'ASC' },
        skip: 0,
        take: 20,
      });
    });

    it('应该处理复杂的多条件查询', async () => {
      mockFeedbackRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllWithPagination({
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        minAcceptanceRate: 0.6,
        page: 2,
        limit: 10,
      });

      expect(feedbackRepo.findAndCount).toHaveBeenCalledWith({
        where: {
          date: {
            '>=': '2026-03-01',
            '<=': '2026-03-31',
          },
          acceptanceRate: {
            '>=': 0.6,
          },
        },
        order: { date: 'DESC' },
        skip: 10,
        take: 10,
      });
    });
  });

  describe('getAverageAcceptanceRate()', () => {
    it('应该计算平均采纳率', async () => {
      const mockStats = [
        { acceptanceRate: 0.8, date: '2026-03-31', totalRecommendations: 100, acceptedCount: 80, rejectedCount: 20, ignoredCount: 0, modifiedCount: 0, id: 1 },
        { acceptanceRate: 0.6, date: '2026-03-30', totalRecommendations: 100, acceptedCount: 60, rejectedCount: 40, ignoredCount: 0, modifiedCount: 0, id: 2 },
        { acceptanceRate: 0.7, date: '2026-03-29', totalRecommendations: 100, acceptedCount: 70, rejectedCount: 30, ignoredCount: 0, modifiedCount: 0, id: 3 },
      ] as any;

      jest.spyOn(service, 'getRecentDays').mockResolvedValue(mockStats);

      const result = await service.getAverageAcceptanceRate(30);

      expect(result).toBeCloseTo(0.7, 4);
      expect(service.getRecentDays).toHaveBeenCalledWith(30);
    });

    it('应该返回 0 当没有数据', async () => {
      jest.spyOn(service, 'getRecentDays').mockResolvedValue([]);

      const result = await service.getAverageAcceptanceRate(30);

      expect(result).toBe(0);
    });

    it('应该保留 4 位小数', async () => {
      const mockStats = [
        { acceptanceRate: 1 / 3, date: '2026-03-31', totalRecommendations: 100, acceptedCount: 33, rejectedCount: 67, id: 1 },
        { acceptanceRate: 2 / 3, date: '2026-03-30', totalRecommendations: 100, acceptedCount: 67, rejectedCount: 33, id: 2 },
      ] as any;

      jest.spyOn(service, 'getRecentDays').mockResolvedValue(mockStats);

      const result = await service.getAverageAcceptanceRate(30);

      expect(result).toBeCloseTo(0.5, 4);
    });
  });

  describe('getTrend()', () => {
    it('应该获取反馈趋势数据', async () => {
      const mockStats = [
        { date: '2026-03-30', acceptanceRate: 0.6, totalRecommendations: 100, acceptedCount: 60, rejectedCount: 40, ignoredCount: 0, modifiedCount: 0, id: 1 },
        { date: '2026-03-31', acceptanceRate: 0.8, totalRecommendations: 120, acceptedCount: 96, rejectedCount: 24, ignoredCount: 0, modifiedCount: 0, id: 2 },
      ] as any;

      jest.spyOn(service, 'getRecentDays').mockResolvedValue(mockStats);

      const result = await service.getTrend(7);

      expect(result.dates).toEqual(['2026-03-30', '2026-03-31']);
      expect(result.rates).toEqual([0.6, 0.8]);
      expect(result.totals).toEqual([100, 120]);
    });

    it('应该按日期升序排序', async () => {
      const mockStats = [
        { date: '2026-03-31', acceptanceRate: 0.8, totalRecommendations: 120, acceptedCount: 96, rejectedCount: 24, id: 1 },
        { date: '2026-03-30', acceptanceRate: 0.6, totalRecommendations: 100, acceptedCount: 60, rejectedCount: 40, id: 2 },
      ] as any;

      jest.spyOn(service, 'getRecentDays').mockResolvedValue(mockStats);

      const result = await service.getTrend(7);

      expect(result.dates).toEqual(['2026-03-30', '2026-03-31']);
    });

    it('应该处理 Date 对象类型的日期', async () => {
      const mockStats = [
        { date: new Date('2026-03-31'), acceptanceRate: 0.8, totalRecommendations: 120, acceptedCount: 96, rejectedCount: 24, id: 1 },
      ] as any;

      jest.spyOn(service, 'getRecentDays').mockResolvedValue(mockStats);

      const result = await service.getTrend(7);

      expect(result.dates).toEqual(['2026-03-31']);
    });

    it('应该返回空数组当没有数据', async () => {
      jest.spyOn(service, 'getRecentDays').mockResolvedValue([]);

      const result = await service.getTrend(30);

      expect(result.dates).toHaveLength(0);
      expect(result.rates).toHaveLength(0);
      expect(result.totals).toHaveLength(0);
    });
  });

  describe('getSummary()', () => {
    it('应该获取统计摘要', async () => {
      mockFeedbackRepo.count.mockResolvedValue(10);
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalRecs: '1000',
          totalAccepted: '800',
          avgRate: '0.8',
        }),
      };

      mockFeedbackRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getSummary();

      expect(result.totalDays).toBe(10);
      expect(result.totalRecommendations).toBe(1000);
      expect(result.totalAccepted).toBe(800);
      expect(result.avgAcceptanceRate).toBe(0.8);
    });

    it('应该处理空数据情况', async () => {
      mockFeedbackRepo.count.mockResolvedValue(0);
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalRecs: null,
          totalAccepted: null,
          avgRate: null,
        }),
      };

      mockFeedbackRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getSummary();

      expect(result.totalDays).toBe(0);
      expect(result.totalRecommendations).toBe(0);
      expect(result.totalAccepted).toBe(0);
      expect(result.avgAcceptanceRate).toBe(0);
    });

    it('应该处理 undefined 值', async () => {
      mockFeedbackRepo.count.mockResolvedValue(5);
      
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(undefined),
      };

      mockFeedbackRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getSummary();

      expect(result.totalDays).toBe(5);
      expect(result.totalRecommendations).toBe(0);
      expect(result.totalAccepted).toBe(0);
      expect(result.avgAcceptanceRate).toBe(0);
    });
  });
});
