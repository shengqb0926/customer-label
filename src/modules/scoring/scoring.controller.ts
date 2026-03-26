import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  Query,
} from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { TagScore } from './entities/tag-score.entity';
import { GetScoresDto } from './dto/get-scores.dto';
import { PaginatedResponse } from '../recommendation/dto/get-recommendations.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('评分管理')
@Controller('scores')
export class ScoringController {
  private readonly logger = new Logger(ScoringController.name);

  constructor(private readonly service: ScoringService) {}

  /**
   * 获取标签评分
   */
  @Get(':tagId')
  @ApiOperation({ summary: '获取单个标签评分', description: '根据标签 ID 获取评分详情' })
  @ApiResponse({ status: 200, description: '返回标签评分详情', type: TagScore })
  async getTagScore(@Param('tagId') tagId: number): Promise<TagScore | null> {
    return await this.service.getTagScore(tagId);
  }

  /**
   * 获取所有标签评分（支持分页和过滤）
   */
  @Get()
  @ApiOperation({ 
    summary: '获取标签评分列表', 
    description: '支持分页、标签名称搜索、推荐等级过滤、评分范围过滤和排序' 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码（从 1 开始）', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量 (1-100)', example: 20 })
  @ApiQuery({ name: 'tagName', required: false, type: String, description: '按标签名称模糊搜索', example: '年龄' })
  @ApiQuery({ name: 'recommendation', required: false, enum: ['强烈推荐', '推荐', '中性', '不推荐', '禁用'], description: '按推荐等级过滤' })
  @ApiQuery({ name: 'minScore', required: false, type: Number, description: '最低综合评分 (0-1)', example: 0.7 })
  @ApiQuery({ name: 'maxScore', required: false, type: Number, description: '最高综合评分 (0-1)', example: 0.9 })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['overallScore', 'coverageScore', 'discriminationScore', 'stabilityScore', 'businessValueScore', 'tagId'], description: '排序字段', example: 'overallScore' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: '排序方向', example: 'desc' })
  @ApiResponse({ 
    status: 200, 
    description: '返回分页的标签评分列表',
    type: PaginatedResponse,
  })
  async getAllScores(
    @Query() query: GetScoresDto
  ): Promise<PaginatedResponse<TagScore>> {
    return await this.service.findAllWithPagination(query);
  }

  /**
   * 获取所有标签评分（简化版，兼容旧接口）
   */
  @Get('all/simple')
  @ApiOperation({ summary: '获取所有标签评分（简化版）', deprecated: true })
  @ApiResponse({ status: 200, description: '返回所有标签评分', type: [TagScore] })
  async getSimpleAllScores(): Promise<TagScore[]> {
    return await this.service.getAllScores();
  }

  /**
   * 更新标签评分
   */
  @Post()
  async updateScore(
    @Body() body: any
  ): Promise<TagScore> {
    return await this.service.updateTagScore(body);
  }

  /**
   * 批量更新标签评分
   */
  @Post('batch')
  @ApiOperation({ summary: '批量更新标签评分' })
  @ApiResponse({ status: 200, description: '返回更新后的标签评分列表', type: [TagScore] })
  async batchUpdate(@Body() body: any[]): Promise<TagScore[]> {
    return await this.service.batchUpdateScores(body);
  }

  /**
   * 获取特定推荐等级的标签
   */
  @Get('recommendation/:level')
  @ApiOperation({ summary: '按推荐等级获取标签', description: '获取特定推荐等级的所有标签' })
  @ApiParam({ name: 'level', enum: ['强烈推荐', '推荐', '中性', '不推荐', '禁用'], description: '推荐等级' })
  @ApiResponse({ status: 200, description: '返回标签列表', type: [TagScore] })
  async getByRecommendation(@Param('level') level: string): Promise<TagScore[]> {
    return await this.service.getByRecommendation(level);
  }

  /**
   * 获取评分统计信息
   */
  @Get('stats/overview')
  @ApiOperation({ summary: '获取评分统计信息', description: '返回总体统计数据和按推荐等级分布' })
  @ApiResponse({ status: 200, description: '返回统计信息' })
  async getStats() {
    return await this.service.getStats();
  }
}
