import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Customer, CustomerLevel, RiskLevel } from '../entities/customer.entity';
import { RfmAnalysisDto, RfmSummaryDto } from '../dto/customer.dto';

/**
 * RFM 分析服务
 * 
 * RFM 模型：
 * - R (Recency): 最近一次消费时间，越近越好
 * - F (Frequency): 消费频率，越高越好
 * - M (Monetary): 消费金额，越高越好
 */
@Injectable()
export class RfmAnalysisService {
  private readonly logger = new Logger(RfmAnalysisService.name);

  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  /**
   * 计算 RFM 分数（1-5 分制）
   * 使用五分位法将数据分为 5 个等级
   */
  private calculateRfmScore(value: number, allValues: number[], isHigherBetter: boolean): number {
    const sorted = [...allValues].sort((a, b) => a - b);
    const length = sorted.length;
    
    // 计算百分位
    const percentile = sorted.filter(v => v <= value).length / length;
    
    let score: number;
    if (isHigherBetter) {
      // R 值：越低越好（反向评分）
      score = Math.ceil((1 - percentile) * 5);
    } else {
      // F/M 值：越高越好（正向评分）
      score = Math.ceil(percentile * 5);
    }
    
    // 确保分数在 1-5 范围内
    return Math.max(1, Math.min(5, score));
  }

  /**
   * 根据 RFM 分数判断客户价值分类
   */
  private determineCustomerSegment(rScore: number, fScore: number, mScore: number): {
    segment: string;
    strategy: string;
  } {
    const totalScore = rScore + fScore + mScore;
    
    // 重要价值客户 (R>=4, F>=4, M>=4)
    if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
      return {
        segment: '重要价值客户',
        strategy: 'VIP 服务，优先维护，提供专属优惠和增值服务',
      };
    }
    
    // 重要发展客户 (R>=4, F>=4, M<4)
    if (rScore >= 4 && fScore >= 4 && mScore < 4) {
      return {
        segment: '重要发展客户',
        strategy: '推荐高价值产品，提升客单价，交叉销售',
      };
    }
    
    // 重要保持客户 (R>=4, F<4, M>=4)
    if (rScore >= 4 && fScore < 4 && mScore >= 4) {
      return {
        segment: '重要保持客户',
        strategy: '增加互动频率，提高忠诚度，防止流失',
      };
    }
    
    // 重要挽留客户 (R<4, F>=4, M>=4)
    if (rScore < 4 && fScore >= 4 && mScore >= 4) {
      return {
        segment: '重要挽留客户',
        strategy: '主动联系，了解需求变化，提供挽回优惠',
      };
    }
    
    // 一般价值客户 (R<4, F<4, M>=4)
    if (rScore < 4 && fScore < 4 && mScore >= 4) {
      return {
        segment: '一般价值客户',
        strategy: '定期回访，挖掘潜在需求',
      };
    }
    
    // 一般发展客户 (R>=4, F<4, M<4)
    if (rScore >= 4 && fScore < 4 && mScore < 4) {
      return {
        segment: '一般发展客户',
        strategy: '鼓励复购，培养消费习惯',
      };
    }
    
    // 一般保持客户 (R<4, F>=4, M<4)
    if (rScore < 4 && fScore >= 4 && mScore < 4) {
      return {
        segment: '一般保持客户',
        strategy: '维持现有关系，适度营销',
      };
    }
    
    // 一般挽留客户 (R<4, F<4, M<4)
    return {
      segment: '一般挽留客户',
      strategy: '低成本维护，观察价值变化',
    };
  }

  /**
   * 执行完整的 RFM 分析
   */
  async analyzeRfm(): Promise<RfmAnalysisDto[]> {
    this.logger.log('开始执行 RFM 分析...');
    
    // 获取所有活跃客户
    const customers = await this.customerRepository.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });

    if (customers.length === 0) {
      this.logger.warn('没有活跃客户数据进行 RFM 分析');
      return [];
    }

    // 提取 R/F/M 值
    const now = Date.now();
    const rfmData = customers.map(customer => {
      // R: 注册天数（可以用 lastLoginDays 替代）
      const recency = customer.lastLoginDays || 365;
      
      // F: 订单数量
      const frequency = customer.orderCount || 0;
      
      // M: 年消费金额
      const monetary = customer.annualSpend || 0;
      
      return {
        customer,
        recency,
        frequency,
        monetary,
      };
    });

    // 收集所有值用于计算分数
    const recencies = rfmData.map(d => d.recency);
    const frequencies = rfmData.map(d => d.frequency);
    const monetaries = rfmData.map(d => d.monetary);

    // 计算每个客户的 RFM 分数
    const analysisResults: RfmAnalysisDto[] = rfmData.map(data => {
      const rScore = this.calculateRfmScore(data.recency, recencies, true); // R 越低越好
      const fScore = this.calculateRfmScore(data.frequency, frequencies, false); // F 越高越好
      const mScore = this.calculateRfmScore(data.monetary, monetaries, false); // M 越高越好
      
      const { segment, strategy } = this.determineCustomerSegment(rScore, fScore, mScore);

      return {
        customerId: data.customer.id,
        customerName: data.customer.name,
        recency: data.recency,
        frequency: data.frequency,
        monetary: data.monetary,
        rScore,
        fScore,
        mScore,
        totalScore: rScore + fScore + mScore,
        customerSegment: segment,
        strategy,
      };
    });

    this.logger.log(`RFM 分析完成，共分析 ${analysisResults.length} 个客户`);
    return analysisResults;
  }

  /**
   * 获取 RFM 分析结果（带分页和筛选）
   */
  async getRfmAnalysis(params: {
    page?: number;
    limit?: number;
    segment?: string;
    minTotalScore?: number;
    maxTotalScore?: number;
  }): Promise<{ data: RfmAnalysisDto[]; total: number }> {
    const { page = 1, limit = 20, segment, minTotalScore, maxTotalScore } = params;

    // 获取完整分析结果
    const allAnalysis = await this.analyzeRfm();

    // 应用筛选条件
    let filtered = allAnalysis;
    
    if (segment) {
      filtered = filtered.filter(item => item.customerSegment === segment);
    }
    
    if (minTotalScore) {
      filtered = filtered.filter(item => item.totalScore >= minTotalScore);
    }
    
    if (maxTotalScore) {
      filtered = filtered.filter(item => item.totalScore <= maxTotalScore);
    }

    // 分页
    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filtered.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total,
    };
  }

  /**
   * 获取 RFM 统计汇总
   */
  async getRfmSummary(): Promise<RfmSummaryDto> {
    const allAnalysis = await this.analyzeRfm();
    
    if (allAnalysis.length === 0) {
      return {
        totalCustomers: 0,
        segmentDistribution: {},
        avgRecency: 0,
        avgFrequency: 0,
        avgMonetary: 0,
        highValueRatio: 0,
      };
    }

    // 计算各价值分类分布
    const segmentDistribution: Record<string, number> = {};
    allAnalysis.forEach(item => {
      segmentDistribution[item.customerSegment] = (segmentDistribution[item.customerSegment] || 0) + 1;
    });

    // 计算平均值
    const avgRecency = allAnalysis.reduce((sum, item) => sum + item.recency, 0) / allAnalysis.length;
    const avgFrequency = allAnalysis.reduce((sum, item) => sum + item.frequency, 0) / allAnalysis.length;
    const avgMonetary = allAnalysis.reduce((sum, item) => sum + item.monetary, 0) / allAnalysis.length;

    // 高价值客户（总分 >= 10）
    const highValueCustomers = allAnalysis.filter(item => item.totalScore >= 10).length;
    const highValueRatio = highValueCustomers / allAnalysis.length;

    return {
      totalCustomers: allAnalysis.length,
      segmentDistribution,
      avgRecency: Math.round(avgRecency),
      avgFrequency: Math.round(avgFrequency * 10) / 10,
      avgMonetary: Math.round(avgMonetary),
      highValueRatio: Math.round(highValueRatio * 100) / 100,
    };
  }

  /**
   * 获取特定客户群的 RFM 分析
   */
  async getRfmBySegment(segment: string): Promise<RfmAnalysisDto[]> {
    const allAnalysis = await this.analyzeRfm();
    return allAnalysis.filter(item => item.customerSegment === segment);
  }

  /**
   * 获取高价值客户列表（RFM 总分 >= 10）
   */
  async getHighValueCustomers(limit: number = 50): Promise<RfmAnalysisDto[]> {
    const allAnalysis = await this.analyzeRfm();
    return allAnalysis
      .filter(item => item.totalScore >= 10)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);
  }
}
