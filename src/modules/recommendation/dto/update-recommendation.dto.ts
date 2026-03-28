import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 接受推荐 DTO
 */
export class AcceptRecommendationDto {
  @ApiPropertyOptional({
    description: '修改后的标签名称',
    example: '高价值客户',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modifiedTagName?: string;

  @ApiPropertyOptional({
    description: '反馈原因',
    example: '推荐准确，符合客户实际情况',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  feedbackReason?: string;
}

/**
 * 拒绝推荐 DTO
 */
export class RejectRecommendationDto {
  @ApiPropertyOptional({
    description: '拒绝原因',
    example: '推荐不准确，客户不符合该特征',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  feedbackReason?: string;
}