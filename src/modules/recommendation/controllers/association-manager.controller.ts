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
import { AssociationManagerService } from '../services/association-manager.service';
import { CreateAssociationConfigDto, UpdateAssociationConfigDto, GetAssociationConfigsDto } from '../dto/association-config.dto';
import { AssociationConfig } from '../entities/association-config.entity';
import { PaginatedResponse } from '../dto/get-recommendations.dto';

@ApiTags('关联规则配置管理')
@Controller('association-configs')
export class AssociationManagerController {
  constructor(private readonly service: AssociationManagerService) {}

  @Post()
  @ApiOperation({ summary: '创建新的关联规则配置', description: '创建一个新的关联规则挖掘配置，支持 Apriori、FP-Growth、Eclat 算法' })
  @ApiResponse({ status: 201, description: '返回创建的关联规则配置', type: AssociationConfig })
  async createConfig(@Body() dto: CreateAssociationConfigDto): Promise<AssociationConfig> {
    return await this.service.createConfig(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取关联规则配置列表（支持分页和过滤）', description: '获取所有关联规则配置，支持按名称、算法、状态等条件筛选' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: '每页数量' })
  @ApiQuery({ name: 'configName', required: false, type: String, example: '购物篮', description: '配置名称搜索' })
  @ApiQuery({ name: 'algorithm', required: false, type: String, enum: ['apriori', 'fpgrowth', 'eclat'], description: '算法类型筛选' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, example: true, description: '状态筛选' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, enum: ['createdAt', 'lastRunAt', 'avgQualityScore'], description: '排序字段' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, enum: ['asc', 'desc'], description: '排序方式' })
  @ApiResponse({ 
    status: 200, 
    description: '返回关联规则配置列表',
    schema: {
      allOf: [
        { $ref: '#/schemas/PaginatedResponse' },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/schemas/AssociationConfig' },
            },
          },
        },
      ],
    },
  })
  async getConfigs(@Query() dto: GetAssociationConfigsDto): Promise<PaginatedResponse<AssociationConfig>> {
    return await this.service.getConfigs(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '根据 ID 获取关联规则配置详情' })
  @ApiParam({ name: 'id', type: Number, description: '配置 ID' })
  @ApiResponse({ status: 200, description: '返回配置详情', type: AssociationConfig })
  @ApiResponse({ status: 404, description: '配置不存在' })
  async getConfigById(@Param('id', ParseIntPipe) id: number): Promise<AssociationConfig> {
    return await this.service.getConfigById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新关联规则配置' })
  @ApiParam({ name: 'id', type: Number, description: '配置 ID' })
  @ApiResponse({ status: 200, description: '返回更新后的配置', type: AssociationConfig })
  @ApiResponse({ status: 404, description: '配置不存在' })
  async updateConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssociationConfigDto,
  ): Promise<AssociationConfig> {
    return await this.service.updateConfig(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除关联规则配置' })
  @ApiParam({ name: 'id', type: Number, description: '配置 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '配置不存在' })
  async deleteConfig(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.service.deleteConfig(id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: '激活关联规则配置' })
  @ApiParam({ name: 'id', type: Number, description: '配置 ID' })
  @ApiResponse({ status: 200, description: '返回激活后的配置', type: AssociationConfig })
  async activateConfig(@Param('id', ParseIntPipe) id: number): Promise<AssociationConfig> {
    return await this.service.activateConfig(id);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: '停用关联规则配置' })
  @ApiParam({ name: 'id', type: Number, description: '配置 ID' })
  @ApiResponse({ status: 200, description: '返回停用后的配置', type: AssociationConfig })
  async deactivateConfig(@Param('id', ParseIntPipe) id: number): Promise<AssociationConfig> {
    return await this.service.deactivateConfig(id);
  }

  @Post(':id/run')
  @ApiOperation({ summary: '运行关联规则挖掘任务', description: '使用指定配置执行关联规则挖掘算法，生成商品关联推荐' })
  @ApiParam({ name: 'id', type: Number, description: '配置 ID' })
  @ApiResponse({ 
    status: 200, 
    description: '返回运行后的配置',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: '配置 ID' },
        configName: { type: 'string', description: '配置名称' },
        runCount: { type: 'number', description: '运行次数' },
        lastRunAt: { type: 'string', format: 'date-time', description: '最后运行时间' },
      },
    },
  })
  async runAssociation(@Param('id', ParseIntPipe) id: number): Promise<AssociationConfig> {
    return await this.service.runAssociation(id);
  }

  @Post(':id/copy')
  @ApiOperation({ summary: '复制关联规则配置', description: '基于现有配置创建一个新配置，配置名称会自动添加"(副本)"后缀' })
  @ApiParam({ name: 'id', type: Number, description: '配置 ID' })
  @ApiResponse({ status: 201, description: '返回复制的新配置', type: AssociationConfig })
  async copyConfig(@Param('id', ParseIntPipe) id: number): Promise<AssociationConfig> {
    return await this.service.copyConfig(id);
  }
}
