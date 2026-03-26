import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class GetFeedbackDto {
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
    description: '开始日期（YYYY-MM-DD）',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: '结束日期（YYYY-MM-DD）',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: '最低采纳率过滤 (0-1)',
    minimum: 0,
    maximum: 1,
    example: 0.7,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  minAcceptanceRate?: number;

  @ApiPropertyOptional({
    description: '最高采纳率过滤 (0-1)',
    minimum: 0,
    maximum: 1,
    example: 0.9,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  maxAcceptanceRate?: number;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ['date', 'acceptanceRate', 'totalRecommendations', 'acceptedCount'],
    default: 'date',
  })
  @IsOptional()
  @IsEnum(['date', 'acceptanceRate', 'totalRecommendations', 'acceptedCount'])
  sortBy?: 'date' | 'acceptanceRate' | 'totalRecommendations' | 'acceptedCount' = 'date';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
