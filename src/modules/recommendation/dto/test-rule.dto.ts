import { IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 测试规则数据传输对象
 */
export class TestRuleDto {
  @ApiProperty({ description: '规则表达式' })
  @IsNotEmpty()
  ruleExpression: any;

  @ApiProperty({ description: '客户测试数据' })
  @IsNotEmpty()
  @IsObject()
  customerData: Record<string, any>;
}
