import { PartialType } from '@nestjs/swagger';
import { CreateRuleDto } from './create-rule.dto';

/**
 * 更新规则数据传输对象
 */
export class UpdateRuleDto extends PartialType(CreateRuleDto) {}
