import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, Min, IsOptional, IsObject, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssociationConfigDto {
  @ApiProperty({ description: '配置名称', example: '购物篮分析配置' })
  @IsString()
  configName: string;

  @ApiPropertyOptional({ description: '描述', example: '用于分析商品关联规则的配置' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '算法类型', enum: ['apriori', 'fpgrowth', 'eclat'], example: 'apriori' })
  @IsString()
  @IsIn(['apriori', 'fpgrowth', 'eclat'])
  algorithm: 'apriori' | 'fpgrowth' | 'eclat';

  @ApiProperty({ description: '关联规则参数', example: { minSupport: 0.1, minConfidence: 0.6, minLift: 1.0, maxItems: 5 } })
  @IsObject()
  parameters: {
    minSupport: number;
    minConfidence: number;
    minLift: number;
    maxItems?: number;
  };

  @ApiPropertyOptional({ description: '是否激活', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateAssociationConfigDto {
  @ApiPropertyOptional({ description: '配置名称', example: '购物篮分析配置 V2' })
  @IsOptional()
  @IsString()
  configName?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '算法类型', enum: ['apriori', 'fpgrowth', 'eclat'] })
  @IsOptional()
  @IsString()
  @IsIn(['apriori', 'fpgrowth', 'eclat'])
  algorithm?: 'apriori' | 'fpgrowth' | 'eclat';

  @ApiPropertyOptional({ description: '关联规则参数' })
  @IsOptional()
  @IsObject()
  parameters?: {
    minSupport: number;
    minConfidence: number;
    minLift: number;
    maxItems?: number;
  };

  @ApiPropertyOptional({ description: '是否激活', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GetAssociationConfigsDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: '配置名称搜索' })
  @IsOptional()
  @IsString()
  configName?: string;

  @ApiPropertyOptional({ description: '算法类型筛选', enum: ['apriori', 'fpgrowth', 'eclat'] })
  @IsOptional()
  @IsString()
  algorithm?: string;

  @ApiPropertyOptional({ description: '状态筛选', example: true })
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: '排序字段', enum: ['createdAt', 'lastRunAt', 'avgQualityScore'] })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'lastRunAt' | 'avgQualityScore';

  @ApiPropertyOptional({ description: '排序方式', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
