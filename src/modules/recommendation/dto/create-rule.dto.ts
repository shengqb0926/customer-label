import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsNumber, Min, Max, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRuleDto {
  @ApiProperty({ description: '规则名称', example: '高价值客户规则' })
  @IsString()
  ruleName: string;

  @ApiProperty({ description: '规则表达式', example: 'orderCount >= 10 && totalAmount >= 10000' })
  @IsString()
  ruleExpression: string;

  @ApiProperty({ description: '优先级 (0-100)', example: 80, minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  priority: number;

  @ApiPropertyOptional({ description: '标签模板名称', example: '高价值客户' })
  @IsOptional()
  @IsString()
  tagTemplate?: string;

  @ApiPropertyOptional({ description: '是否激活', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
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

  @ApiPropertyOptional({ description: '标签模板名称', example: '高价值客户' })
  @IsOptional()
  @IsString()
  tagTemplate?: string;

  @ApiPropertyOptional({ description: '是否激活', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
