import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsNumber, Min, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClusteringConfigDto {
  @ApiProperty({ description: '配置名称', example: '客户分群配置' })
  @IsString()
  configName: string;

  @ApiProperty({ description: '算法类型', enum: ['k-means', 'dbscan', 'hierarchical'], example: 'k-means' })
  @IsString()
  algorithm: string;

  @ApiProperty({ description: '聚类参数', example: { k: 5, maxIterations: 100 } })
  @IsObject()
  parameters: Record<string, any>;

  @ApiPropertyOptional({ description: '特征权重', example: { assets: 0.4, income: 0.3, age: 0.3 } })
  @IsOptional()
  @IsObject()
  featureWeights?: Record<string, number>;

  @ApiPropertyOptional({ description: '是否激活', example: true })
  @IsOptional()
  isActive?: boolean = true;
}

export class UpdateClusteringConfigDto {
  @ApiPropertyOptional({ description: '配置名称', example: '客户分群配置' })
  @IsOptional()
  @IsString()
  configName?: string;

  @ApiPropertyOptional({ description: '算法类型', enum: ['k-means', 'dbscan', 'hierarchical'] })
  @IsOptional()
  @IsString()
  algorithm?: string;

  @ApiPropertyOptional({ description: '聚类参数', example: { k: 5, maxIterations: 100 } })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({ description: '特征权重', example: { assets: 0.4, income: 0.3, age: 0.3 } })
  @IsOptional()
  @IsObject()
  featureWeights?: Record<string, number>;

  @ApiPropertyOptional({ description: '是否激活', example: true })
  @IsOptional()
  isActive?: boolean;
}
