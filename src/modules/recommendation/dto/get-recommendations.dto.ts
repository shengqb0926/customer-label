import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsEnum, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 推荐来源枚举
 */
export enum RecommendationSource {
  RULE = 'rule',
  CLUSTERING = 'clustering',
  ASSOCIATION = 'association',
  FUSION = 'fusion',
}

/**
 * 推荐列表查询参数 DTO
 */
export class GetRecommendationsDto {
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
    description: '按标签类别过滤',
    example: '客户价值',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: '按推荐来源过滤',
    enum: RecommendationSource,
    example: 'rule',
  })
  @IsOptional()
  @IsEnum(RecommendationSource)
  source?: RecommendationSource;

  @ApiPropertyOptional({
    description: '最低置信度过滤 (0-1)',
    minimum: 0,
    maximum: 1,
    example: 0.7,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  minConfidence?: number;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ['confidence', 'createdAt'],
    default: 'confidence',
  })
  @IsOptional()
  @IsEnum(['confidence', 'createdAt'])
  sortBy?: 'confidence' | 'createdAt' = 'confidence';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * 分页响应 DTO
 */
export class PaginatedResponse<T> {
  @ApiProperty({ description: '数据列表' })
  data: T[];

  @ApiProperty({ description: '总记录数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
  }
}
