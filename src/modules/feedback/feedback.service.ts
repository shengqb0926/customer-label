import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedbackStatistic } from './entities/feedback-statistic.entity';
import { GetFeedbackDto } from './dto/get-feedback.dto';
import { PaginatedResponse } from '../recommendation/dto/get-recommendations.dto';

export interface DailyFeedbackDto {
  date: string; // YYYY-MM-DD
  totalRecommendations: number;
  acceptedCount: number;
  rejectedCount?: number;
  ignoredCount?: number;
  modifiedCount?: number;
  avgConfidence?: number;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(FeedbackStatistic)
    private readonly feedbackRepo: Repository<FeedbackStatistic>
  ) {}

  /**
   * 计算采纳率
   */
  calculateAcceptanceRate(
    total: number,
    accepted: number
  ): number {
    if (total === 0) return 0;
    return parseFloat((accepted / total).toFixed(4));
  }

  /**
   * 记录每日反馈统计
   */
  async recordDailyFeedback(dto: DailyFeedbackDto): Promise<FeedbackStatistic> {
    const date = new Date(dto.date);
    
    // 查找是否已存在该日期的记录
    let entity = await this.feedbackRepo.findOne({ where: { date: date.toISOString().split('T')[0] } as any });

    if (entity) {
      // 更新现有记录
      const rejectedCount = dto.rejectedCount || (dto.totalRecommendations - dto.acceptedCount);
      const acceptanceRate = this.calculateAcceptanceRate(
        dto.totalRecommendations,
        dto.acceptedCount
      );

      Object.assign(entity, {
        ...dto,
        rejectedCount,
        acceptanceRate,
      });
    } else {
      // 创建新记录
      const rejectedCount = dto.rejectedCount || (dto.totalRecommendations - dto.acceptedCount);
      const acceptanceRate = this.calculateAcceptanceRate(
        dto.totalRecommendations,
        dto.acceptedCount
      );

      entity = this.feedbackRepo.create({
        ...dto,
        rejectedCount,
        acceptanceRate,
      });
    }

    const saved = await this.feedbackRepo.save(entity);
    this.logger.log(`Recorded feedback for ${dto.date}: ${saved.acceptanceRate * 100}% acceptance rate`);
    return saved;
  }

  /**
   * 获取指定日期的反馈统计
   */
  async getByDate(date: string): Promise<FeedbackStatistic | null> {
    return await this.feedbackRepo.findOne({ 
      where: { date } as any,
    });
  }

  /**
   * 获取最近 N 天的反馈统计
   */
  async getRecentDays(days: number = 30): Promise<FeedbackStatistic[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.feedbackRepo
      .createQueryBuilder('feedback')
      .where('feedback.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('feedback.date', 'DESC')
      .getMany();
  }

  /**
   * 分页获取反馈统计列表
   */
  async findAllWithPagination(
    options: GetFeedbackDto,
  ): Promise<PaginatedResponse<FeedbackStatistic>> {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      minAcceptanceRate,
      maxAcceptanceRate,
      sortBy = 'date',
      sortOrder = 'desc',
    } = options;

    // 构建查询条件
    const where: any = {};
    
    if (startDate) {
      where.date = `>= ${startDate}`;
    }
    
    if (endDate) {
      if (!where.date) where.date = {};
      where.date['<='] = endDate;
    }
    
    if (minAcceptanceRate !== undefined || maxAcceptanceRate !== undefined) {
      where.acceptanceRate = {};
      if (minAcceptanceRate !== undefined) {
        where.acceptanceRate['>='] = minAcceptanceRate;
      }
      if (maxAcceptanceRate !== undefined) {
        where.acceptanceRate['<='] = maxAcceptanceRate;
      }
    }

    // 构建排序
    const order: any = {};
    order[sortBy] = sortOrder === 'desc' ? 'DESC' : 'ASC';

    // 查询总数和数据
    const [data, total] = await this.feedbackRepo.findAndCount({
      where,
      order,
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponse(data, total, page, limit);
  }

  /**
   * 获取平均采纳率
   */
  async getAverageAcceptanceRate(days: number = 30): Promise<number> {
    const recentStats = await this.getRecentDays(days);
    
    if (recentStats.length === 0) return 0;

    const totalRate = recentStats.reduce(
      (sum, stat) => sum + stat.acceptanceRate,
      0
    );
    
    return parseFloat((totalRate / recentStats.length).toFixed(4));
  }

  /**
   * 获取反馈趋势
   */
  async getTrend(days: number = 30): Promise<{
    dates: string[];
    rates: number[];
    totals: number[];
  }> {
    const stats = await this.getRecentDays(days);
    
    // 按日期升序排序（将 date 字符串转为时间戳）
    stats.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      dates: stats.map(s => {
        if (typeof s.date === 'string') return s.date;
        // 如果是 Date 对象，转为字符串
        return new Date(s.date as any).toISOString().split('T')[0];
      }),
      rates: stats.map(s => s.acceptanceRate),
      totals: stats.map(s => s.totalRecommendations),
    };
  }

  /**
   * 获取统计摘要
   */
  async getSummary(): Promise<{
    totalDays: number;
    totalRecommendations: number;
    totalAccepted: number;
    avgAcceptanceRate: number;
  }> {
    const [countResult, sumResult] = await Promise.all([
      this.feedbackRepo.count(),
      this.feedbackRepo
        .createQueryBuilder('feedback')
        .select('SUM(feedback.totalRecommendations)', 'totalRecs')
        .addSelect('SUM(feedback.acceptedCount)', 'totalAccepted')
        .addSelect('AVG(feedback.acceptanceRate)', 'avgRate')
        .getRawOne(),
    ]);

    return {
      totalDays: countResult,
      totalRecommendations: parseInt(sumResult.totalRecs) || 0,
      totalAccepted: parseInt(sumResult.totalAccepted) || 0,
      avgAcceptanceRate: parseFloat(sumResult.avgRate) || 0,
    };
  }
}
