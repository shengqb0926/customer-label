import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TagTemplateDto {
  @ApiProperty({ description: '标签名称', example: '高价值客户' })
  @IsString()
  name: string;

  @ApiProperty({ description: '标签类别', example: '客户价值' })
  @IsString()
  category: string;

  @ApiProperty({ description: '基础置信度', example: 0.7, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  baseConfidence: number;
}

/**
 * 创建规则数据传输对象
 */
export class CreateRuleDto {
  @ApiProperty({ description: '规则名称', example: '高价值客户识别' })
  @IsString()
  @IsNotEmpty()
  ruleName: string;

  @ApiPropertyOptional({ description: '规则描述', example: '识别消费金额和订单数双高的客户' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: '规则表达式（JSON 格式）',
    example: '{"operator":"AND","conditions":[{"field":"totalOrders","operator":">=","value":10}]}'
  })
  @IsString()
  ruleExpression: string;

  @ApiProperty({ description: '优先级（1-100）', example: 90, minimum: 1, maximum: 100 })
  @IsNumber()
  @Min(1)
  @Max(100)
  priority: number;

  @ApiProperty({ description: '推荐标签模板', example: ['高价值客户', 'VIP 客户'] })
  @IsArray()
  @IsString({ each: true })
  tagTemplate: string[];

  @ApiProperty({ description: '是否激活', example: true })
  @IsBoolean()
  isActive: boolean;
}

export class UpdateRuleDto {
  @ApiPropertyOptional({ description: '规则名称', example: '高价值客户规则' })
  @IsOptional()
  @IsString()
  ruleName?: string;

  @ApiPropertyOptional({ description: '规则表达式', example: 'orderCount >= 10 && totalAmount >= 10000' })
  @IsOptional()
  @IsString()
  ruleExpression?: string;

  @ApiPropertyOptional({ description: '优先级 (0-100)', example: 80, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional({ description: '标签模板', example: ['高价值客户', 'VIP 客户'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagTemplate?: string[];

  @ApiPropertyOptional({ description: '是否激活', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}