import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { TagRecommendation } from './entities/tag-recommendation.entity';
import { GetRecommendationsDto, PaginatedResponse } from './dto/get-recommendations.dto';
import { RecommendationSeedService } from './services/recommendation-seed.service';

@ApiTags('推荐管理')
@Controller('recommendations')
export class RecommendationController {
  private readonly logger = new Logger(RecommendationController.name);

  constructor(
    private readonly service: RecommendationService,
    private readonly seedService: RecommendationSeedService
  ) {}

  /**
   * 获取客户的推荐列表（支持分页和过滤）
   */
  @Get('customer/:customerId')
  @ApiOperation({ summary: '获取客户推荐列表', description: '支持分页、过滤和排序' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码（从 1 开始）', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量 (1-100)', example: 20 })
  @ApiQuery({ name: 'category', required: false, type: String, description: '按标签类别过滤', example: '客户价值' })
  @ApiQuery({ name: 'source', required: false, enum: ['rule', 'clustering', 'association', 'fusion'], description: '按推荐来源过滤' })
  @ApiQuery({ name: 'minConfidence', required: false, type: Number, description: '最低置信度 (0-1)', example: 0.7 })
  @ApiQuery({ name: 'isAccepted', required: false, type: Boolean, description: '是否已接受（筛选状态）', example: true })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: '开始日期（ISO 格式）', example: '2026-03-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: '结束日期（ISO 格式）', example: '2026-03-31' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['confidence', 'createdAt'], description: '排序字段', example: 'confidence' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: '排序方向', example: 'desc' })
  @ApiResponse({ 
    status: 200, 
    description: '返回分页的推荐列表',
    type: PaginatedResponse,
  })
  async getCustomerRecommendations(
    @Param('customerId') customerId: number,
    @Query() query: GetRecommendationsDto
  ): Promise<PaginatedResponse<TagRecommendation>> {
    this.logger.log(`Getting paginated recommendations for customer ${customerId}`);
    return await this.service.findByCustomerWithPagination(customerId, query);
  }

  /**
   * 获取所有客户的推荐列表（支持分页和过滤）
   */
  @Get()
  @ApiOperation({ summary: '获取全局推荐列表', description: '支持分页、过滤和排序，用于推荐结果管理' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码（从 1 开始）', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量 (1-100)', example: 20 })
  @ApiQuery({ name: 'category', required: false, type: String, description: '按标签类别过滤', example: '客户价值' })
  @ApiQuery({ name: 'customerName', required: false, type: String, description: '按客户名称模糊查询', example: '张三' })
  @ApiQuery({ name: 'source', required: false, enum: ['rule', 'clustering', 'association', 'fusion'], description: '按推荐来源过滤' })
  @ApiQuery({ name: 'minConfidence', required: false, type: Number, description: '最低置信度 (0-1)', example: 0.7 })
  @ApiQuery({ name: 'isAccepted', required: false, type: Boolean, description: '是否已接受（筛选状态）', example: true })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: '开始日期（ISO 格式）', example: '2026-03-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: '结束日期（ISO 格式）', example: '2026-03-31' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['confidence', 'createdAt'], description: '排序字段', example: 'confidence' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: '排序方向', example: 'desc' })
  @ApiResponse({ 
    status: 200, 
    description: '返回分页的推荐列表',
    type: PaginatedResponse,
  })
  async getAllRecommendations(
    @Query() query: GetRecommendationsDto
  ): Promise<PaginatedResponse<TagRecommendation>> {
    this.logger.log(`Getting global recommendations`);
    return await this.service.findAllWithPagination(query);
  }

  /**
   * 获取客户的推荐列表（旧版，向后兼容）
   */
  @Get('customer/:customerId/simple')
  @ApiOperation({ summary: '获取客户推荐列表（简化版）', deprecated: true })
  @ApiResponse({ status: 200, description: '返回推荐列表（最多 20 条）', type: [TagRecommendation] })
  async getSimpleRecommendations(
    @Param('customerId') customerId: number
  ): Promise<TagRecommendation[]> {
    this.logger.log(`Getting simple recommendations for customer ${customerId}`);
    return await this.service.findByCustomer(customerId);
  }

  /**
   * 为客户生成推荐（同步模式，手动触发）
   */
  @Post('generate/:customerId')
  @ApiOperation({ summary: '手动触发推荐引擎', description: '手动为客户生成推荐，支持指定引擎类型（规则引擎/聚合引擎/关联引擎）' })
  @ApiParam({ name: 'customerId', description: '客户 ID', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['rule', 'clustering', 'association', 'all'],
          description: '引擎类型：rule=规则引擎（最快），clustering=聚合引擎，association=关联引擎，all=全部引擎（最慢）',
          example: 'rule',
        },
        useCache: {
          type: 'boolean',
          description: '是否使用缓存（默认 true）',
          example: true,
          default: true,
        },
      },
      required: ['mode'],
    },
  })
  async generateRecommendations(
    @Param('customerId') customerId: number,
    @Body('mode') mode: 'rule' | 'clustering' | 'association' | 'all' = 'rule', // 默认使用最快的规则引擎
    @Body('useCache') useCache: boolean = true
  ): Promise<{ 
    success: boolean; 
    count: number; 
    recommendations: TagRecommendation[];
    message: string 
  }> {
    this.logger.log(`Manually triggering ${mode} engine for customer ${customerId}`);
    
    try {
      // 同步执行推荐生成
      const recommendations = await this.service.generateForCustomer(customerId, {
        mode,
        useCache,
      });

      return {
        success: true,
        count: recommendations.length,
        recommendations,
        message: `成功生成 ${recommendations.length} 条推荐 (${mode} 引擎)`,
      };
    } catch (error) {
      this.logger.error('Failed to generate recommendations:', error);
      throw error;
    }
  }

  /**
   * 批量生成推荐
   */
  @Post('batch-generate')
  async batchGenerate(
    @Body() body: { customerIds: number[] }
  ): Promise<{ total: number; queued: number; message: string }> {
    const { customerIds } = body;
    
    if (!customerIds || customerIds.length === 0) {
      throw new Error('customerIds is required');
    }

    const queued = await this.service.batchGenerate(customerIds);
    
    return {
      total: customerIds.length,
      queued,
      message: `成功添加 ${queued} 个推荐计算任务`,
    };
  }

  /**
   * 获取推荐的统计信息
   */
  @Get('stats')
  async getStats(): Promise<{
    total: number;
    bySource: Record<string, number>;
    avgConfidence: number;
  }> {
    return await this.service.getStats();
  }

  /**
   * 按状态统计推荐数量（支持筛选）
   */
  @Get('stats/status')
  @ApiOperation({ summary: '获取状态统计', description: '按待处理、已接受、已拒绝统计推荐数量，支持筛选条件' })
  @ApiQuery({ name: 'category', required: false, type: String, description: '按标签类别过滤', example: '客户价值' })
  @ApiQuery({ name: 'customerName', required: false, type: String, description: '按客户名称模糊查询', example: '张三' })
  @ApiQuery({ name: 'source', required: false, enum: ['rule', 'clustering', 'association'], description: '按推荐来源过滤' })
  @ApiQuery({ name: 'minConfidence', required: false, type: Number, description: '最低置信度 (0-1)', example: 0.7 })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: '开始日期（ISO 格式）', example: '2026-03-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: '结束日期（ISO 格式）', example: '2026-03-31' })
  @ApiResponse({ 
    status: 200, 
    description: '返回按状态分组的统计数据',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: '总记录数', example: 100 },
        pending: { type: 'number', description: '待处理数量', example: 60 },
        accepted: { type: 'number', description: '已接受数量', example: 30 },
        rejected: { type: 'number', description: '已拒绝数量', example: 10 },
      },
    },
  })
  async getStatusStats(
    @Query() options: GetRecommendationsDto
  ): Promise<{
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  }> {
    return await this.service.getStatusStats(options);
  }

  /**
   * 获取活跃规则列表
   */
  @Get('rules/active')
  async getActiveRules() {
    return await this.service.getActiveRules();
  }

  /**
   * 获取聚类配置列表
   */
  @Get('configs/clustering')
  async getClusteringConfigs() {
    return await this.service.getClusteringConfigs();
  }

  /**
   * 接受推荐
   */
  @Post(':id/accept')
  @ApiOperation({ summary: '接受推荐', description: '标记某个推荐为已接受状态，可选择修改标签名称或提供反馈原因' })
  @ApiParam({ name: 'id', description: '推荐 ID', type: Number })
  @ApiBody({
    description: '接受推荐的可选参数（修改后的标签名、反馈原因）',
    required: false,
    schema: {
      type: 'object',
      properties: {
        modifiedTagName: {
          type: 'string',
          description: '修改后的标签名称',
          example: '高价值客户',
        },
        feedbackReason: {
          type: 'string',
          description: '反馈原因',
          example: '推荐准确，符合客户实际情况',
        },
      },
    },
  })
  async acceptRecommendation(
    @Param('id') id: number,
    @Body() body?: { modifiedTagName?: string; feedbackReason?: string }
  ): Promise<TagRecommendation> {
    // TODO: 从认证上下文获取真实用户 ID
    const userId = 1; // 临时使用固定值
    return await this.service.acceptRecommendation(
      id,
      userId,
      body?.modifiedTagName,
      body?.feedbackReason
    );
  }

  /**
   * 拒绝推荐
   */
  @Post(':id/reject')
  @ApiOperation({ summary: '拒绝推荐', description: '拒绝某个标签推荐，可附带反馈原因' })
  @ApiParam({ name: 'id', description: '推荐 ID', type: Number })
  @ApiBody({
    description: '拒绝推荐的原因（可选）',
    required: false,
    schema: {
      type: 'object',
      properties: {
        feedbackReason: {
          type: 'string',
          description: '拒绝原因',
          example: '推荐不准确，客户不符合该特征',
        },
      },
    },
  })
  async rejectRecommendation(
    @Param('id') id: number,
    @Body() body?: { feedbackReason?: string }
  ): Promise<TagRecommendation> {
    // TODO: 从认证上下文获取真实用户 ID
    const userId = 1; // 临时使用固定值
    return await this.service.rejectRecommendation(id, userId, body?.feedbackReason);
  }

  /**
   * 批量接受推荐（支持自动打标签）
   */
  @Post('batch-accept')
  @ApiOperation({ 
    summary: '批量接受推荐', 
    description: '批量接受多个推荐，可选择是否自动为客户打上对应标签' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'integer' },
          description: '推荐 ID 列表',
          example: [1, 2, 3],
        },
        autoTag: {
          type: 'boolean',
          description: '是否自动为客户打上对应标签',
          default: false,
          example: true,
        },
      },
      required: ['ids'],
    },
  })
  @ApiResponse({ 
    status: 200, 
    description: '返回批量接受的结果统计',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number', description: '成功接受的数量' },
        total: { type: 'number', description: '总处理数量' },
      },
    },
  })
  async batchAcceptRecommendations(
    @Body() body: { ids: number[]; autoTag?: boolean }
  ): Promise<{ success: number; total: number }> {
    const userId = 1; // TODO: 从认证上下文获取
    const successCount = await this.service.batchAcceptRecommendations(body.ids, userId, body.autoTag);
    return {
      success: successCount,
      total: body.ids.length,
    };
  }

  /**
   * 批量拒绝推荐
   */
  @Post('batch-reject')
  @ApiOperation({ 
    summary: '批量拒绝推荐', 
    description: '批量拒绝多个推荐，需要提供拒绝原因' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'integer' },
          description: '推荐 ID 列表',
          example: [1, 2, 3],
        },
        reason: {
          type: 'string',
          description: '拒绝原因',
          example: '标签不准确，客户不符合条件',
        },
      },
      required: ['ids', 'reason'],
    },
  })
  async batchRejectRecommendations(
    @Body() body: { ids: number[]; reason: string }
  ): Promise<{ success: number; total: number }> {
    const userId = 1; // TODO: 从认证上下文获取
    const successCount = await this.service.batchRejectRecommendations(body.ids, userId, body.reason);
    return {
      success: successCount,
      total: body.ids.length,
    };
  }

  /**
   * 批量撤销推荐操作
   */
  @Post('batch-undo')
  @ApiOperation({ 
    summary: '批量撤销推荐', 
    description: '批量撤销已接受或已拒绝的推荐，恢复到待处理状态' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'integer' },
          description: '推荐 ID 列表',
          example: [1, 2, 3],
        },
      },
      required: ['ids'],
    },
  })
  @ApiResponse({ 
    status: 200, 
    description: '返回批量撤销的结果统计',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number', description: '成功撤销的数量' },
        total: { type: 'number', description: '总处理数量' },
      },
    },
  })
  async batchUndoRecommendations(
    @Body() body: { ids: number[] }
  ): Promise<{ success: number; total: number }> {
    const successCount = await this.service.batchUndoRecommendations(body.ids);
    return {
      success: successCount,
      total: body.ids.length,
    };
  }

  /**
   * 获取相似客户推荐
   */
  @Get(':id/similar')
  @ApiOperation({ 
    summary: '获取相似客户推荐', 
    description: '基于客户特征相似度，查找有相同推荐标签的其他客户' 
  })
  @ApiParam({ name: 'id', description: '推荐 ID', type: Number })
  @ApiQuery({ 
    name: 'tagName', 
    required: true, 
    type: String, 
    description: '推荐标签名称',
    example: '高价值客户'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: '返回数量限制 (默认 5，范围 1-20)',
    example: 5
  })
  @ApiResponse({ 
    status: 200, 
    description: '返回相似客户推荐列表',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          customerId: { type: 'number', description: '客户 ID' },
          customerName: { type: 'string', description: '客户名称' },
          tagName: { type: 'string', description: '推荐标签' },
          confidence: { type: 'number', description: '置信度' },
          status: { type: 'string', enum: ['pending', 'accepted', 'rejected'] },
          similarityScore: { type: 'number', description: '相似度分数 (0-1)' },
        },
      },
    },
  })
  async getSimilarCustomerRecommendations(
    @Param('id') id: number,
    @Query('tagName') tagName: string,
    @Query('limit') limit: number = 5
  ): Promise<Array<{
    customerId: number;
    customerName?: string;
    tagName: string;
    confidence: number;
    status: 'pending' | 'accepted' | 'rejected';
    similarityScore: number;
  }>> {
    // 先获取推荐信息拿到 customerId
    const recommendation = await this.service.getRecommendationById(id);
    if (!recommendation) {
      throw new HttpException(`推荐 ${id} 不存在`, HttpStatus.NOT_FOUND);
    }
    
    return await this.service.getSimilarCustomerRecommendations(
      recommendation.customerId,
      tagName,
      limit
    );
  }

  /**
   * 获取客户历史推荐记录
   */
  @Get('customer/:customerId/history')
  @ApiOperation({ 
    summary: '获取客户历史推荐', 
    description: '获取某个客户的所有历史推荐记录' 
  })
  @ApiParam({ name: 'customerId', description: '客户 ID', type: Number })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: '返回数量限制 (默认 10，范围 1-50)',
    example: 10
  })
  @ApiResponse({ 
    status: 200, 
    description: '返回历史推荐记录列表',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', description: '推荐 ID' },
          tagName: { type: 'string', description: '推荐标签' },
          tagCategory: { type: 'string', description: '标签类别' },
          createdAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['pending', 'accepted', 'rejected'] },
          reason: { type: 'string', description: '推荐理由' },
          acceptedAt: { type: 'string', format: 'date-time', description: '接受时间' },
        },
      },
    },
  })
  async getCustomerRecommendationHistory(
    @Param('customerId') customerId: number,
    @Query('limit') limit: number = 10
  ): Promise<Array<{
    id: number;
    tagName: string;
    tagCategory?: string;
    createdAt: Date;
    status: 'pending' | 'accepted' | 'rejected';
    reason: string;
    acceptedAt?: Date;
  }>> {
    return await this.service.getCustomerRecommendationHistory(customerId, limit);
  }

  /**
   * 生成测试数据
   */
  @Post('generate-test-data')
  @ApiOperation({ summary: '生成测试数据', description: '生成指定数量的模拟推荐数据用于测试' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'integer',
          description: '生成数据的数量',
          default: 20,
          minimum: 1,
          maximum: 1000,
        },
      },
    },
  })
  async generateTestData(
    @Body() body?: { count?: number }
  ): Promise<{ success: boolean; count: number; message: string }> {
    const count = body?.count || 20;
    try {
      const result = await this.seedService.generateTestData(count);
      return {
        success: true,
        count: result.length,
        message: `成功生成 ${result.length} 条测试推荐数据`,
      };
    } catch (error) {
      this.logger.error('Failed to generate test data:', error);
      return {
        success: false,
        count: 0,
        message: '生成测试数据失败',
      };
    }
  }

  /**
   * 清空测试数据
   */
  @Post('clear-test-data')
  @ApiOperation({ summary: '清空测试数据', description: '清空所有测试数据，谨慎操作！' })
  async clearTestData(): Promise<{ success: boolean; message: string }> {
    try {
      await this.seedService.clearTestData();
      return {
        success: true,
        message: '已清空所有测试数据',
      };
    } catch (error) {
      this.logger.error('Failed to clear test data:', error);
      return {
        success: false,
        message: '清空测试数据失败',
      };
    }
  }

  /**
   * 获取引擎执行历史
   */
  @Get('engine-executions')
  @ApiOperation({ summary: '获取引擎执行历史', description: '查询推荐引擎的执行历史记录，支持分页和筛选' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: '每页数量' })
  @ApiQuery({ name: 'customerId', required: false, type: Number, description: '按客户 ID 筛选' })
  @ApiQuery({ name: 'engineType', required: false, enum: ['rule', 'clustering', 'association'], description: '按引擎类型筛选' })
  @ApiQuery({ name: 'status', required: false, enum: ['success', 'failed', 'pending'], description: '按执行状态筛选' })
  @ApiResponse({ 
    status: 200, 
    description: '返回引擎执行历史列表（分页）',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '执行记录 ID' },
              customerId: { type: 'number', description: '客户 ID' },
              customerName: { type: 'string', description: '客户名称' },
              engineType: { type: 'string', enum: ['rule', 'clustering', 'association'] },
              status: { type: 'string', enum: ['success', 'failed', 'pending'] },
              executionTime: { type: 'number', description: '执行耗时（秒）' },
              generatedCount: { type: 'number', description: '生成结果数量' },
              executedAt: { type: 'string', format: 'date-time', description: '执行时间' },
            },
          },
        },
        total: { type: 'number', description: '总记录数' },
        page: { type: 'number', description: '当前页码' },
        limit: { type: 'number', description: '每页数量' },
      },
    },
  })
  async getEngineExecutions(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('customerId') customerId?: number,
    @Query('engineType') engineType?: string,
    @Query('status') status?: string,
  ): Promise<any> {
    // TODO: 实现从数据库查询 engine_executions 表
    // 暂时返回模拟数据
    const mockData = {
      data: [
        {
          id: 1,
          customerId: 1,
          customerName: '张三',
          engineType: 'rule',
          status: 'success',
          executionTime: 1.23,
          generatedCount: 5,
          executedAt: new Date().toISOString(),
        },
        {
          id: 2,
          customerId: 2,
          customerName: '李四',
          engineType: 'clustering',
          status: 'success',
          executionTime: 2.45,
          generatedCount: 8,
          executedAt: new Date().toISOString(),
        },
        {
          id: 3,
          customerId: 3,
          customerName: '王五',
          engineType: 'association',
          status: 'pending',
          executionTime: 0,
          generatedCount: 0,
          executedAt: new Date().toISOString(),
        },
      ],
      total: 3,
      page: Number(page),
      limit: Number(limit),
    };

    return mockData;
  }
}
