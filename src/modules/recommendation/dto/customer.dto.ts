import { IsString, IsOptional, IsInt, IsNumber, IsEnum, IsBoolean, Min, Max, IsEmail, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerLevel, RiskLevel, Gender } from '../entities/customer.entity';

// 创建客户 DTO
export class CreateCustomerDto {
  @ApiProperty({ description: '客户姓名', example: '张三' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ description: '邮箱', example: 'zhangsan@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: '手机号', example: '13800138000' })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/)
  phone?: string;

  @ApiPropertyOptional({ description: '性别', enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ description: '年龄', example: 35, minimum: 18, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(100)
  age?: number;

  @ApiPropertyOptional({ description: '城市', example: '北京' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '省份', example: '北京市' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: '详细地址' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '总资产', example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAssets?: number;

  @ApiPropertyOptional({ description: '月收入', example: 30000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyIncome?: number;

  @ApiPropertyOptional({ description: '年消费', example: 150000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualSpend?: number;

  @ApiPropertyOptional({ description: '订单数', example: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderCount?: number;

  @ApiPropertyOptional({ description: '持有产品数', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  productCount?: number;

  @ApiPropertyOptional({ description: '注册天数', example: 365 })
  @IsOptional()
  @IsInt()
  @Min(0)
  registerDays?: number;

  @ApiPropertyOptional({ description: '距上次登录天数', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lastLoginDays?: number;

  @ApiPropertyOptional({ description: '客户等级', enum: CustomerLevel, default: CustomerLevel.BRONZE })
  @IsOptional()
  @IsEnum(CustomerLevel)
  level?: CustomerLevel;

  @ApiPropertyOptional({ description: '风险等级', enum: RiskLevel, default: RiskLevel.LOW })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ description: '是否激活', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// 更新客户 DTO
export class UpdateCustomerDto extends CreateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  name?: string;
}

// 批量导入 DTO
export class BatchImportCustomerDto {
  @ApiProperty({ description: '客户数据数组' })
  @IsOptional()
  customers: CreateCustomerDto[];
}

// 查询参数 DTO
export class GetCustomersDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: '客户姓名/手机号模糊搜索' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '邮箱模糊搜索' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: '城市精确匹配', example: '北京' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '客户等级筛选', enum: CustomerLevel })
  @IsOptional()
  @IsEnum(CustomerLevel)
  level?: CustomerLevel;

  @ApiPropertyOptional({ description: '风险等级筛选', enum: RiskLevel })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({ description: '性别筛选', enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ description: '最小年龄' })
  @IsOptional()
  @IsInt()
  minAge?: number;

  @ApiPropertyOptional({ description: '最大年龄' })
  @IsOptional()
  @IsInt()
  maxAge?: number;

  @ApiPropertyOptional({ description: '最小总资产' })
  @IsOptional()
  @IsNumber()
  minAssets?: number;

  @ApiPropertyOptional({ description: '最大总资产' })
  @IsOptional()
  @IsNumber()
  maxAssets?: number;

  @ApiPropertyOptional({ description: '是否激活' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '排序字段', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: '排序方式', default: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// 随机生成参数 DTO
export class GenerateRandomCustomersDto {
  @ApiProperty({ description: '生成数量', minimum: 1, maximum: 10000, default: 100 })
  @IsInt()
  @Min(1)
  @Max(10000)
  count: number;

  @ApiPropertyOptional({ description: '指定城市列表', example: ['北京', '上海', '广州'] })
  @IsOptional()
  cities?: string[];

  @ApiPropertyOptional({ description: '最小年龄', default: 20 })
  @IsOptional()
  @IsInt()
  minAge?: number = 20;

  @ApiPropertyOptional({ description: '最大年龄', default: 65 })
  @IsOptional()
  @IsInt()
  maxAge?: number = 65;

  @ApiPropertyOptional({ description: '最小资产', default: 10000 })
  @IsOptional()
  @IsNumber()
  minAssets?: number = 10000;

  @ApiPropertyOptional({ description: '最大资产', default: 10000000 })
  @IsOptional()
  @IsNumber()
  maxAssets?: number = 10000000;
}

// 响应 DTO
export class PaginatedResponse<T> {
  @ApiProperty({ description: '数据列表' })
  data: T[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}