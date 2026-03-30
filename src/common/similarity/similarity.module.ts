import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../../modules/recommendation/entities/customer.entity';
import { SimilarityService } from './similarity.service';

/**
 * 相似度计算模块
 * 
 * 提供通用的客户相似度计算能力
 */
@Module({
  imports: [TypeOrmModule.forFeature([Customer])],
  providers: [SimilarityService],
  exports: [SimilarityService],
})
export class SimilarityModule {}
