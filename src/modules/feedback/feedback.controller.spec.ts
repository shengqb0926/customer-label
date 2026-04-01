import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { FeedbackStatistic } from './entities/feedback-statistic.entity';
import { GetFeedbackDto } from './dto/get-feedback.dto';

describe('FeedbackController', () => {
  let controller: FeedbackController;
  let service: FeedbackService;

  const mockFeedbackStatistic: Partial<FeedbackStatistic> = {
    date: '2024-01-15',
    totalRecommendations: 1000,
    acceptedCount: 750,
    rejectedCount: 250,
    acceptanceRate: 0.75,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [
        {
          provide: FeedbackService,
          useValue: {
            recordDailyFeedback: jest.fn(),
            getByDate: jest.fn(),
            findAllWithPagination: jest.fn(),
            getRecentDays: jest.fn(),
            getAverageAcceptanceRate: jest.fn(),
            getTrend: jest.fn(),
            getSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FeedbackController>(FeedbackController);
    service = module.get<FeedbackService>(FeedbackService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('recordDaily', () => {
    it('应该记录每日反馈统计', async () => {
      const body = {
        date: '2024-01-15',
        totalRecommendations: 1000,
        acceptedCount: 750,
      };

      jest.spyOn(service, 'recordDailyFeedback').mockResolvedValue(mockFeedbackStatistic as any);

      const result = await controller.recordDaily(body);

      expect(result).toEqual(mockFeedbackStatistic);
      expect(service.recordDailyFeedback).toHaveBeenCalledWith(body);
    });

    it('应该处理无效的请求体', async () => {
      const invalidBody = {};

      jest.spyOn(service, 'recordDailyFeedback').mockRejectedValue(new Error('缺少必要字段'));

      await expect(controller.recordDaily(invalidBody)).rejects.toThrow('缺少必要字段');
    });
  });

  describe('getByDate', () => {
    it('应该获取指定日期的反馈统计', async () => {
      const date = '2024-01-15';

      jest.spyOn(service, 'getByDate').mockResolvedValue(mockFeedbackStatistic as any);

      const result = await controller.getByDate(date);

      expect(result).toEqual(mockFeedbackStatistic);
      expect(service.getByDate).toHaveBeenCalledWith(date);
    });

    it('应该返回 null 当日期不存在时', async () => {
      jest.spyOn(service, 'getByDate').mockResolvedValue(null);

      const result = await controller.getByDate('2024-01-01');

      expect(result).toBeNull();
    });

    it('应该处理无效的日期格式', async () => {
      jest.spyOn(service, 'getByDate').mockRejectedValue(new Error('无效的日期格式'));

      await expect(controller.getByDate('invalid-date')).rejects.toThrow('无效的日期格式');
    });
  });

  describe('getAllFeedback', () => {
    it('应该获取分页反馈列表（默认参数）', async () => {
      const mockResponse = {
        data: [mockFeedbackStatistic],
        total: 1,
        page: 1,
        limit: 20,
      };

      jest.spyOn(service, 'findAllWithPagination').mockResolvedValue(mockResponse as any);

      const result = await controller.getAllFeedback({});

      expect(result).toEqual(mockResponse);
      expect(service.findAllWithPagination).toHaveBeenCalledWith({});
    });

    it('应该处理分页和过滤参数', async () => {
      const query: GetFeedbackDto = {
        page: 2,
        limit: 30,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        minAcceptanceRate: 0.6,
        maxAcceptanceRate: 0.9,
        sortBy: 'acceptanceRate',
        sortOrder: 'desc',
      };

      const mockResponse = {
        data: [mockFeedbackStatistic],
        total: 50,
        page: 2,
        limit: 30,
      };

      jest.spyOn(service, 'findAllWithPagination').mockResolvedValue(mockResponse as any);

      const result = await controller.getAllFeedback(query);

      expect(result).toEqual(mockResponse);
      expect(service.findAllWithPagination).toHaveBeenCalledWith(query);
    });

    it('应该处理空结果', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      jest.spyOn(service, 'findAllWithPagination').mockResolvedValue(mockResponse as any);

      const result = await controller.getAllFeedback({});

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('应该处理排序参数 asc', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      jest.spyOn(service, 'findAllWithPagination').mockResolvedValue(mockResponse as any);

      await controller.getAllFeedback({ sortBy: 'date', sortOrder: 'asc' });

      expect(service.findAllWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'date', sortOrder: 'asc' })
      );
    });

    it('应该处理排序参数 desc', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      jest.spyOn(service, 'findAllWithPagination').mockResolvedValue(mockResponse as any);

      await controller.getAllFeedback({ sortBy: 'acceptanceRate', sortOrder: 'desc' });

      expect(service.findAllWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'acceptanceRate', sortOrder: 'desc' })
      );
    });
  });

  describe('getRecentDays', () => {
    it('应该获取最近 30 天的反馈统计（默认值）', async () => {
      const mockData = [mockFeedbackStatistic];

      jest.spyOn(service, 'getRecentDays').mockResolvedValue(mockData as any);

      const result = await controller.getRecentDays();

      expect(result).toEqual(mockData);
      expect(service.getRecentDays).toHaveBeenCalledWith(30);
    });

    it('应该获取指定天数的反馈统计', async () => {
      const days = 7;
      const mockData = [mockFeedbackStatistic];

      jest.spyOn(service, 'getRecentDays').mockResolvedValue(mockData as any);

      const result = await controller.getRecentDays(days);

      expect(result).toEqual(mockData);
      expect(service.getRecentDays).toHaveBeenCalledWith(days);
    });

    it('应该处理大天数参数', async () => {
      const days = 365;
      const mockData = Array(365).fill(mockFeedbackStatistic);

      jest.spyOn(service, 'getRecentDays').mockResolvedValue(mockData as any);

      const result = await controller.getRecentDays(days);

      expect(result).toHaveLength(365);
    });
  });

  describe('getAverageAcceptanceRate', () => {
    it('应该获取平均采纳率（默认 30 天）', async () => {
      const avgRate = 0.75;

      jest.spyOn(service, 'getAverageAcceptanceRate').mockResolvedValue(avgRate);

      const result = await controller.getAverageAcceptanceRate();

      expect(result).toEqual({ avgAcceptanceRate: avgRate });
      expect(service.getAverageAcceptanceRate).toHaveBeenCalledWith(30);
    });

    it('应该获取指定天数的平均采纳率', async () => {
      const days = 7;
      const avgRate = 0.8;

      jest.spyOn(service, 'getAverageAcceptanceRate').mockResolvedValue(avgRate);

      const result = await controller.getAverageAcceptanceRate(days);

      expect(result).toEqual({ avgAcceptanceRate: avgRate });
      expect(service.getAverageAcceptanceRate).toHaveBeenCalledWith(days);
    });

    it('应该处理 0 天参数', async () => {
      jest.spyOn(service, 'getAverageAcceptanceRate').mockResolvedValue(0);

      const result = await controller.getAverageAcceptanceRate(0);

      expect(result).toEqual({ avgAcceptanceRate: 0 });
    });
  });

  describe('getTrend', () => {
    it('应该获取反馈趋势数据（默认 30 天）', async () => {
      const mockTrend = {
        dates: ['2024-01-01', '2024-01-02', '2024-01-03'],
        rates: [0.7, 0.75, 0.8],
        totals: [100, 120, 150],
      };

      jest.spyOn(service, 'getTrend').mockResolvedValue(mockTrend);

      const result = await controller.getTrend();

      expect(result).toEqual(mockTrend);
      expect(service.getTrend).toHaveBeenCalledWith(30);
    });

    it('应该获取指定天数的趋势数据', async () => {
      const days = 7;
      const mockTrend = {
        dates: Array(7).fill('2024-01-01'),
        rates: Array(7).fill(0.75),
        totals: Array(7).fill(100),
      };

      jest.spyOn(service, 'getTrend').mockResolvedValue(mockTrend);

      const result = await controller.getTrend(days);

      expect(result.dates).toHaveLength(7);
      expect(result.rates).toHaveLength(7);
      expect(result.totals).toHaveLength(7);
    });

    it('应该处理空趋势数据', async () => {
      const mockTrend = {
        dates: [],
        rates: [],
        totals: [],
      };

      jest.spyOn(service, 'getTrend').mockResolvedValue(mockTrend);

      const result = await controller.getTrend(0);

      expect(result.dates).toHaveLength(0);
      expect(result.rates).toHaveLength(0);
      expect(result.totals).toHaveLength(0);
    });
  });

  describe('getSummary', () => {
    it('应该获取统计摘要', async () => {
      const mockSummary = {
        totalDays: 365,
        totalRecommendations: 100000,
        totalAccepted: 75000,
        avgAcceptanceRate: 0.75,
      };

      jest.spyOn(service, 'getSummary').mockResolvedValue(mockSummary);

      const result = await controller.getSummary();

      expect(result).toEqual(mockSummary);
      expect(service.getSummary).toHaveBeenCalled();
    });

    it('应该处理空摘要数据', async () => {
      const mockSummary = {
        totalDays: 0,
        totalRecommendations: 0,
        totalAccepted: 0,
        avgAcceptanceRate: 0,
      };

      jest.spyOn(service, 'getSummary').mockResolvedValue(mockSummary);

      const result = await controller.getSummary();

      expect(result).toEqual(mockSummary);
    });

    it('应该处理大数据量', async () => {
      const mockSummary = {
        totalDays: 1000,
        totalRecommendations: 10000000,
        totalAccepted: 8000000,
        avgAcceptanceRate: 0.8,
      };

      jest.spyOn(service, 'getSummary').mockResolvedValue(mockSummary);

      const result = await controller.getSummary();

      expect(result.totalDays).toBe(1000);
      expect(result.totalRecommendations).toBe(10000000);
      expect(result.avgAcceptanceRate).toBe(0.8);
    });
  });
});
