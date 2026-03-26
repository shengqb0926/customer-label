import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
} from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { TagScore } from './entities/tag-score.entity';

@Controller('scores')
export class ScoringController {
  private readonly logger = new Logger(ScoringController.name);

  constructor(private readonly service: ScoringService) {}

  /**
   * 获取标签评分
   */
  @Get(':tagId')
  async getTagScore(@Param('tagId') tagId: number): Promise<TagScore | null> {
    return await this.service.getTagScore(tagId);
  }

  /**
   * 获取所有标签评分
   */
  @Get()
  async getAllScores(): Promise<TagScore[]> {
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
  async batchUpdate(@Body() body: any[]): Promise<TagScore[]> {
    return await this.service.batchUpdateScores(body);
  }

  /**
   * 获取特定推荐等级的标签
   */
  @Get('recommendation/:level')
  async getByRecommendation(@Param('level') level: string): Promise<TagScore[]> {
    return await this.service.getByRecommendation(level);
  }

  /**
   * 获取评分统计信息
   */
  @Get('stats/overview')
  async getStats() {
    return await this.service.getStats();
  }
}
