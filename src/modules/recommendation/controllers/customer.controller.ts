import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerService } from '../services/customer.service';
import { RfmAnalysisService } from '../services/rfm-analysis.service';
import { CreateCustomerDto, UpdateCustomerDto, GetCustomersDto, GenerateRandomCustomersDto, GetRfmAnalysisParams } from '../dto/customer.dto';
import { Customer } from '../entities/customer.entity';

@Controller('customers')
@ApiTags('客户管理')
@ApiBearerAuth()
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly rfmAnalysisService: RfmAnalysisService,
  ) {}

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

  @Get('/test')
  @ApiOperation({ summary: '最简单的测试接口' })
  async test() {
    return { success: true, message: 'This is a test' };
  }

  @Get('/simple-test')
  @ApiOperation({ summary: '简单测试端点' })
  async simpleTest(@Query() query: any) {
    console.log('=== Simple Test Endpoint Called ===');
    return { 
      success: true, 
      message: 'Simple test passed',
      timestamp: new Date().toISOString()
    };
  }

  @Get('/health')
  @ApiOperation({ summary: '健康检查端点' })
  async healthCheck(@Query() query: any) {
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  @Get('/echo')
  @ApiOperation({ summary: '回显测试端点' })
  @ApiQuery({ name: 'message', required: false, type: String })
  async echo(@Query('message') message?: string) {
    return { 
      success: true,
      received: message || 'no message provided',
      timestamp: new Date().toISOString()
    };
  }

  @Get('/debug-info')
  @ApiOperation({ summary: '调试信息端点' })
  async debugInfo() {
    return { 
      success: true,
      environment: process.env.NODE_ENV || 'development',
      platform: process.platform,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };
  }

  @Post('/rfm-analysis')
  @ApiOperation({ summary: '获取客户 RFM 分析结果' })
  @ApiBody({ description: 'RFM 分析筛选参数', required: false, schema: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, segment: { type: 'string' }, minTotalScore: { type: 'integer' }, maxTotalScore: { type: 'integer' } } } })
  async getRfmAnalysis(@Body() body: any = {}) {
    // 手动转换参数为数字类型，避免验证管道问题
    const page = body.page ? parseInt(body.page, 10) : 1;
    const limit = body.limit ? parseInt(body.limit, 10) : 20;
    const segment = body.segment;
    const minTotalScore = body.minTotalScore ? parseInt(body.minTotalScore, 10) : undefined;
    const maxTotalScore = body.maxTotalScore ? parseInt(body.maxTotalScore, 10) : undefined;
    
    return this.rfmAnalysisService.getRfmAnalysis({
      page,
      limit,
      segment,
      minTotalScore,
      maxTotalScore,
    });
  }

  @Get('/rfm-test')
  @ApiOperation({ summary: '测试 RFM 接口（无验证）' })
  async testRfm() {
    // 直接返回简单数据，不经过任何验证
    return { 
      message: 'RFM test endpoint',
      timestamp: new Date().toISOString(),
      test: true,
    };
  }

  @Post('/rfm-summary')
  @ApiOperation({ summary: '获取 RFM 统计汇总' })
  async getRfmSummary(@Body() body: any = {}) {
    // rfm-summary 不需要参数，直接调用服务
    console.log('=== RFM Summary Endpoint Called ===');
    const result = await this.rfmAnalysisService.getRfmSummary();
    console.log('RFM Summary Result:', result);
    return result;
  }

  // 测试端点 - 用于排查验证问题
  @Get('/test-validation')
  @ApiOperation({ summary: '测试验证问题' })
  async testValidation(@Query() query: any) {
    console.log('=== Test Validation Endpoint Called ===');
    return { 
      message: 'Success! No validation here!',
      timestamp: new Date().toISOString(),
      success: true
    };
  }

  @Get('/test-response')
  @ApiOperation({ summary: '测试响应格式' })
  async testResponse() {
    return {
      success: true,
      data: {
        id: 1,
        name: 'Test Customer',
        email: 'test@example.com'
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  @Get('/test-error')
  @ApiOperation({ summary: '测试错误处理' })
  async testError() {
    // 这个端点可以用于测试前端的错误处理逻辑
    return {
      success: false,
      error: 'This is a simulated error for testing',
      errorCode: 'TEST_ERROR_001',
      timestamp: new Date().toISOString()
    };
  }

  @Post('/rfm-high-value')
  @ApiOperation({ summary: '获取高价值客户列表' })
  @ApiBody({ description: '高价值客户筛选参数', required: false, schema: { type: 'object', properties: { limit: { type: 'integer', example: 50 } } } })
  async getHighValueCustomers(@Body() body: any = {}) {
    const limit = body.limit ? parseInt(body.limit, 10) : 50;
    return this.rfmAnalysisService.getHighValueCustomers(limit);
  }

  @Post('/rfm-segment/:segment')
  @ApiOperation({ summary: '获取特定价值分类的客户' })
  @ApiParam({ name: 'segment', description: '客户分类', example: '重要价值客户' })
  @ApiBody({ required: false })
  async getRfmBySegment(@Param('segment') segment: string, @Body() body: any = {}) {
    return this.rfmAnalysisService.getRfmBySegment(segment);
  }
}
