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
import { GetFeedbackDto } from './dto/get-feedback.dto';
import { PaginatedResponse } from '../recommendation/dto/get-recommendations.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('反馈管理')
@Controller('feedback')
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(private readonly service: FeedbackService) {}

  /**
   * 记录每日反馈统计
   */
  @Post('daily')
  @ApiOperation({ summary: '记录每日反馈统计' })
  @ApiResponse({ status: 201, description: '返回创建的反馈统计', type: FeedbackStatistic })
  async recordDaily(@Body() body: any): Promise<FeedbackStatistic> {
    return await this.service.recordDailyFeedback(body);
  }

  /**
   * 获取指定日期的反馈
   */
  @Get(':date')
  @ApiOperation({ summary: '获取指定日期的反馈统计' })
  @ApiParam({ name: 'date', description: '日期（YYYY-MM-DD）', example: '2024-01-15' })
  @ApiResponse({ status: 200, description: '返回反馈统计', type: FeedbackStatistic })
  async getByDate(@Param('date') date: string): Promise<FeedbackStatistic | null> {
    return await this.service.getByDate(date);
  }

  /**
   * 获取反馈列表（支持分页和过滤）
   */
  @Get()
  @ApiOperation({ 
    summary: '获取反馈统计列表', 
    description: '支持分页、日期范围过滤、采纳率过滤和排序' 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码（从 1 开始）', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量 (1-100)', example: 20 })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: '开始日期（YYYY-MM-DD）', example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: '结束日期（YYYY-MM-DD）', example: '2024-12-31' })
  @ApiQuery({ name: 'minAcceptanceRate', required: false, type: Number, description: '最低采纳率 (0-1)', example: 0.7 })
  @ApiQuery({ name: 'maxAcceptanceRate', required: false, type: Number, description: '最高采纳率 (0-1)', example: 0.9 })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['date', 'acceptanceRate', 'totalRecommendations', 'acceptedCount'], description: '排序字段', example: 'date' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: '排序方向', example: 'desc' })
  @ApiResponse({ 
    status: 200, 
    description: '返回分页的反馈统计列表',
    type: PaginatedResponse,
  })
  async getAllFeedback(
    @Query() query: GetFeedbackDto
  ): Promise<PaginatedResponse<FeedbackStatistic>> {
    return await this.service.findAllWithPagination(query);
  }

  /**
   * 获取最近 N 天的反馈统计（简化版，兼容旧接口）
   */
  @Get('recent/days')
  @ApiOperation({ summary: '获取最近 N 天的反馈统计', deprecated: true })
  @ApiQuery({ name: 'days', required: false, type: Number, description: '天数', example: 30 })
  @ApiResponse({ status: 200, description: '返回最近 N 天的反馈统计列表', type: [FeedbackStatistic] })
  async getRecentDays(
    @Query('days') days: number = 30
  ): Promise<FeedbackStatistic[]> {
    return await this.service.getRecentDays(days);
  }

  /**
   * 获取平均采纳率
   */
  @Get('stats/avg-acceptance-rate')
  @ApiOperation({ summary: '获取平均采纳率' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: '统计天数', example: 30 })
  @ApiResponse({ status: 200, description: '返回平均采纳率' })
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
  @ApiOperation({ summary: '获取反馈趋势数据' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: '统计天数', example: 30 })
  @ApiResponse({ status: 200, description: '返回趋势数据（日期、采纳率、总量）' })
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
  @ApiOperation({ summary: '获取统计摘要信息' })
  @ApiResponse({ status: 200, description: '返回总体统计摘要' })
  async getSummary(): Promise<{
    totalDays: number;
    totalRecommendations: number;
    totalAccepted: number;
    avgAcceptanceRate: number;
  }> {
    return await this.service.getSummary();
  }
}
