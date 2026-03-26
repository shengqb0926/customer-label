import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackStatistic } from './entities/feedback-statistic.entity';

@Controller('feedback')
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(private readonly service: FeedbackService) {}

  /**
   * 记录每日反馈统计
   */
  @Post('daily')
  async recordDaily(@Body() body: any): Promise<FeedbackStatistic> {
    return await this.service.recordDailyFeedback(body);
  }

  /**
   * 获取指定日期的反馈
   */
  @Get(':date')
  async getByDate(@Param('date') date: string): Promise<FeedbackStatistic | null> {
    return await this.service.getByDate(date);
  }

  /**
   * 获取最近 N 天的反馈统计
   */
  @Get('recent/days')
  async getRecentDays(
    @Query('days') days: number = 30
  ): Promise<FeedbackStatistic[]> {
    return await this.service.getRecentDays(days);
  }

  /**
   * 获取平均采纳率
   */
  @Get('stats/avg-acceptance-rate')
  async getAverageAcceptanceRate(
    @Query('days') days: number = 30
  ): Promise<{ avgAcceptanceRate: number }> {
    const rate = await this.service.getAverageAcceptanceRate(days);
    return { avgAcceptanceRate: rate };
  }

  /**
   * 获取反馈趋势
   */
  @Get('stats/trend')
  async getTrend(
    @Query('days') days: number = 30
  ): Promise<{
    dates: string[];
    rates: number[];
    totals: number[];
  }> {
    return await this.service.getTrend(days);
  }

  /**
   * 获取统计摘要
   */
  @Get('stats/summary')
  async getSummary(): Promise<{
    totalDays: number;
    totalRecommendations: number;
    totalAccepted: number;
    avgAcceptanceRate: number;
  }> {
    return await this.service.getSummary();
  }
}
