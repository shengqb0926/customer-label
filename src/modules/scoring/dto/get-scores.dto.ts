import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsEnum, Min, Max, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum RecommendationLevel {
  STRONGLY_RECOMMENDED = '强烈推荐',
  RECOMMENDED = '推荐',
  NEUTRAL = '中性',
  NOT_RECOMMENDED = '不推荐',
  DISABLED = '禁用',
}

export class GetScoresDto {
  @ApiPropertyOptional({
    description: '页码（从 1 开始）',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: '按标签名称模糊搜索',
    example: '年龄',
  })
  @IsOptional()
  @IsString()
  tagName?: string;

  @ApiPropertyOptional({
    description: '按推荐等级过滤',
    enum: RecommendationLevel,
    example: '推荐',
  })
  @IsOptional()
  @IsEnum(RecommendationLevel)
  recommendation?: RecommendationLevel;

  @ApiPropertyOptional({
    description: '最低综合评分过滤 (0-1)',
    minimum: 0,
    maximum: 1,
    example: 0.7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number;

  @ApiPropertyOptional({
    description: '最高综合评分过滤 (0-1)',
    minimum: 0,
    maximum: 1,
    example: 0.9,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  maxScore?: number;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ['overallScore', 'coverageScore', 'discriminationScore', 'stabilityScore', 'businessValueScore', 'tagId'],
    default: 'overallScore',
  })
  @IsOptional()
  @IsEnum(['overallScore', 'coverageScore', 'discriminationScore', 'stabilityScore', 'businessValueScore', 'tagId'])
  sortBy?:
    | 'overallScore'
    | 'coverageScore'
    | 'discriminationScore'
    | 'stabilityScore'
    | 'businessValueScore'
    | 'tagId' = 'overallScore';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
