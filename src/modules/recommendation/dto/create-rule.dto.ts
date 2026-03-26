import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsNumber, Min, Max, IsOptional, IsBoolean, ValidateNested } from 'class-validator';
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

  @ApiPropertyOptional({ description: '标签模板', type: TagTemplateDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TagTemplateDto)
  tagTemplate?: TagTemplateDto | string;

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

  @ApiPropertyOptional({ description: '标签模板', type: TagTemplateDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TagTemplateDto)
  tagTemplate?: TagTemplateDto | string;

  @ApiPropertyOptional({ description: '是否激活', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
