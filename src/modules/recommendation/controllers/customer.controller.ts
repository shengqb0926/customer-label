import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { CustomerService } from '../services/customer.service';
import { CreateCustomerDto, UpdateCustomerDto, GetCustomersDto, GenerateRandomCustomersDto } from '../dto/customer.dto';
import { Customer } from '../entities/customer.entity';

@ApiTags('客户管理')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ApiOperation({ summary: '创建客户' })
  @ApiResponse({ status: 201, type: Customer })
  create(@Body() dto: CreateCustomerDto) {
    return this.customerService.create(dto);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量创建客户' })
  @ApiBody({ description: '客户数据数组', schema: { type: 'array', items: { $ref: '#/components/schemas/CreateCustomerDto' } } })
  batchCreate(@Body() customers: CreateCustomerDto[]) {
    return this.customerService.batchCreate(customers);
  }

  @Post('generate')
  @ApiOperation({ summary: '随机生成客户数据' })
  @ApiResponse({ status: 201, isArray: true, type: Customer })
  generateRandom(@Body() dto: GenerateRandomCustomersDto) {
    return this.customerService.generateRandomCustomers(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取客户列表（分页 + 筛选）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'keyword', required: false, type: String })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'level', required: false, enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'] })
  @ApiQuery({ name: 'riskLevel', required: false, enum: ['LOW', 'MEDIUM', 'HIGH'] })
  @ApiQuery({ name: 'gender', required: false, enum: ['M', 'F'] })
  @ApiQuery({ name: 'minAge', required: false, type: Number })
  @ApiQuery({ name: 'maxAge', required: false, type: Number })
  @ApiQuery({ name: 'minAssets', required: false, type: Number })
  @ApiQuery({ name: 'maxAssets', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  findAll(@Query() options: GetCustomersDto) {
    return this.customerService.findAll(options);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取客户统计信息' })
  statistics() {
    return this.customerService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取客户详情' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新客户信息' })
  @ApiParam({ name: 'id', type: Number })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    return this.customerService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除客户' })
  @ApiParam({ name: 'id', type: Number })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.remove(id);
  }

  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除客户' })
  @ApiBody({ description: '客户 ID 数组', schema: { type: 'array', items: { type: 'integer' } } })
  batchRemove(@Body() ids: number[]) {
    return this.customerService.batchRemove(ids);
  }
}