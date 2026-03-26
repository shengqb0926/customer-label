import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ClusteringManagerService, GetClusteringConfigsDto } from '../services/clustering-manager.service';
import { CreateClusteringConfigDto, UpdateClusteringConfigDto } from '../dto/clustering-config.dto';
import { ClusteringConfig } from '../entities/clustering-config.entity';
import { PaginatedResponse } from '../dto/get-recommendations.dto';

@ApiTags('聚类配置管理')
@Controller('clustering')
export class ClusteringManagerController {
  constructor(private readonly service: ClusteringManagerService) {}

  @Post()
  @ApiOperation({ summary: '创建新的聚类配置' })
  @ApiResponse({ status: 201, description: '返回创建的聚类配置', type: ClusteringConfig })
  async createConfig(@Body() dto: CreateClusteringConfigDto): Promise<ClusteringConfig> {
    return await this.service.createConfig(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取聚类配置列表（支持分页和过滤）' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'configName', required: false, type: String, example: '客户分群' })
  @ApiQuery({ name: 'algorithm', required: false, type: String, enum: ['k-means', 'dbscan', 'hierarchical'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, example: true })
  @ApiQuery({ name: 'sortBy', required: false, type: String, enum: ['createdAt', 'lastRunAt', 'avgSilhouetteScore'] })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, enum: ['asc', 'desc'] })
  @ApiResponse({ 
    status: 200, 
    description: '返回聚类配置列表',
    schema: {
      allOf: [
        { $ref: '#/schemas/PaginatedResponse' },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/schemas/ClusteringConfig' },
            },
          },
        },
      ],
    },
  })
  async getConfigs(@Query() query: GetClusteringConfigsDto): Promise<PaginatedResponse<ClusteringConfig>> {
    return await this.service.getConfigs(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个聚类配置详情' })
  @ApiParam({ name: 'id', type: Number, description: '配置 ID' })
  @ApiResponse({ status: 200, description: '返回配置详情', type: ClusteringConfig })
  @ApiResponse({ status: 404, description: '配置不存在' })
  async getConfigById(@Param('id', ParseIntPipe) id: number): Promise<ClusteringConfig> {
    return await this.service.getConfigById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新聚类配置' })
  @ApiParam({ name: 'id', type: Number, description: '配置 ID' })
  @ApiResponse({ status: 200, description: '返回更新后的配置', type: ClusteringConfig })
  @ApiResponse({ status: 404, description: '配置不存在' })
  async updateConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClusteringConfigDto,
  ): Promise<ClusteringConfig> {
    return await this.service.updateConfig(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除聚类配置' })
  @ApiParam({ name: 'id', type: Number, description: '配置 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '配置不存在' })
  async deleteConfig(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.service.deleteConfig(id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: '激活聚类配置' })
  @ApiParam({ name: 'id', type: Number, description: '配置 ID' })
  @ApiResponse({ status: 200, description: '返回激活后的配置', type: ClusteringConfig })
  async activateConfig(@Param('id', ParseIntPipe) id: number): Promise<ClusteringConfig> {
    return await this.service.activateConfig(id);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: '停用聚类配置' })
  @ApiParam({ name: 'id', type: Number, description: '配置 ID' })
  @ApiResponse({ status: 200, description: '返回停用后的配置', type: ClusteringConfig })
  async deactivateConfig(@Param('id', ParseIntPipe) id: number): Promise<ClusteringConfig> {
    return await this.service.deactivateConfig(id);
  }

  @Post(':id/run')
  @ApiOperation({ summary: '执行聚类分析' })
  @ApiParam({ name: 'id', type: Number, description: '配置 ID' })
  @ApiResponse({ 
    status: 200, 
    description: '返回聚类结果',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        clusterCount: { type: 'number', example: 5 },
        executionTime: { type: 'number', example: 1234 },
        message: { type: 'string', example: '成功生成 5 个客户群体' },
      },
    },
  })
  async runClustering(
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: { customerIds?: number[] },
  ) {
    return await this.service.runClustering(id, body?.customerIds);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '获取聚类结果统计' })
  @ApiParam({ name: 'id', type: Number, description: '配置 ID' })
  @ApiResponse({ 
    status: 200, 
    description: '返回聚类统计信息',
    schema: {
      type: 'object',
      properties: {
        configName: { type: 'string', example: '客户分群配置' },
        algorithm: { type: 'string', example: 'k-means' },
        clusterCount: { type: 'number', example: 5 },
        avgSilhouetteScore: { type: 'number', example: 0.75 },
        lastRunAt: { type: 'string', format: 'date-time' },
        isActive: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 404, description: '配置不存在或未执行过聚类' })
  async getClusteringStats(@Param('id', ParseIntPipe) id: number) {
    return await this.service.getClusteringStats(id);
  }
}
