// 🚨 FORCE RELOAD: CustomerStatistics-2026-03-29-v3-FORCED-RELOAD
const __COMPONENT_VERSION__ = 'CustomerStatistics-2026-03-29-v3-FORCED-RELOAD';
console.log('🚨 FORCE RELOAD:', __COMPONENT_VERSION__, 'Time:', new Date().toISOString());
console.log('🔖 LevelPieConfig Version: 2026-03-29-v2-FIXED');

import React, { useState, useEffect } from 'react';
import { Card, Spin, Alert, Table, Tag, Space, Button, Row, Col, Select, Statistic, Progress, Empty } from 'antd';
import { Pie, Column } from '@ant-design/charts';
import type { CustomerStatistics as CustomerStatisticsType } from '@/services';
import { customerService } from '@/services';

interface RfmAnalysis {
  customerId: number;
  customerName: string;
  recency: number;
  frequency: number;
  monetary: number;
  rScore: number;
  fScore: number;
  mScore: number;
  totalScore: number;
  customerSegment: string;
  strategy: string;
}

interface RfmSummary {
  totalCustomers: number;
  segmentDistribution: Record<string, number>;
  avgRecency: number;
  avgFrequency: number;
  avgMonetary: number;
  highValueRatio: number;
}

const CustomerStatistics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<any>(null);
  const [levelChartData, setLevelChartData] = useState<any[]>([]);
  const [riskChartData, setRiskChartData] = useState<any[]>([]);
  const [rfmSummary, setRfmSummary] = useState<any>(null);
  const [rfmData, setRfmData] = useState<any[]>([]);
  const [rfmLoading, setRfmLoading] = useState(true);
  const [segmentFilter, setSegmentFilter] = useState<string | undefined>(undefined);

  // 🎯 在组件内部也添加调试输出（确保能看到）
  useEffect(() => {
    console.log('🚨 CustomerStatistics Component MOUNTED!');
    console.log('🔖 Version:', __COMPONENT_VERSION__);
    console.log('⏰ Load time:', new Date().toISOString());
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      console.log('🔍 开始调用 /api/v1/customers/statistics...');
      const data = await customerService.getStatistics();
      console.log('✅ 统计数据加载成功:', data);
      console.log('=== 统计数据 ===', data);
      console.log('等级分布原始数据:', data.levelStats);
      console.log('风险分布原始数据:', data.riskStats);
      
      // 调试：检查数据类型
      if (data.levelStats && data.levelStats.length > 0) {
        console.log('第一条等级数据:', data.levelStats[0]);
        console.log('第一条等级数据的 type:', typeof data.levelStats[0]);
        console.log('第一条等级数据的 level 属性:', data.levelStats[0].level);
        console.log('第一条等级数据的 count 属性:', data.levelStats[0].count);
        console.log('第一条等级数据的 count 类型:', typeof data.levelStats[0].count);
      } else {
        console.warn('⚠️ levelStats 为空或不存在:', data.levelStats);
      }
      
      setStatistics(data);
      
      // 直接在这里转换图表数据并设置到 state
      const levelData = data.levelStats.map((item) => ({
        name: item.level === 'BRONZE' ? '青铜' : item.level === 'SILVER' ? '白银' : item.level === 'GOLD' ? '黄金' : item.level === 'PLATINUM' ? '铂金' : '钻石',
        value: Number(item.count),
      }));
      console.log('📊 Level Chart Data:', levelData);
      console.log('📊 Level Chart Data JSON:', JSON.stringify(levelData, null, 2));
      setLevelChartData(levelData);
      
      const riskData = data.riskStats.map((item) => ({
        name: item.riskLevel === 'LOW' ? '低风险' : item.riskLevel === 'MEDIUM' ? '中风险' : '高风险',
        value: Number(item.count),
      }));
      console.log('📊 Risk Chart Data:', riskData);
      setRiskChartData(riskData);
    } catch (error: any) {
      console.error('❌ 加载统计数据失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
      });
      // 设置 statistics 为 null 以显示错误提示
      setStatistics(null);
    } finally {
      setLoading(false);
      console.log('🏁 Loading 状态设置为 false');
    }
  };

  const loadRfmAnalysis = async () => {
    setRfmLoading(true);
    try {
      const params: any = { page: 1, limit: 100 };
      if (segmentFilter) params.segment = segmentFilter;
      
      const result = await customerService.getRfmAnalysis(params);
      console.log('=== RFM Analysis 结果 ===', result);
      setRfmData(result.data || []);
      
      // 加载汇总数据
      const summary = await customerService.getRfmSummary();
      console.log('=== RFM Summary 结果 ===', summary);
      setRfmSummary(summary);
    } catch (error: any) {
      console.error('❌ 加载 RFM 分析失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
    } finally {
      setRfmLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
    loadRfmAnalysis();
  }, []);

  useEffect(() => {
    loadRfmAnalysis();
  }, [segmentFilter]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" description="正在加载统计数据..." />
      </div>
    );
  }

  if (!statistics) {
    return (
      <Alert
        message="加载失败"
        description="无法加载客户统计数据，请稍后重试。请查看浏览器控制台获取详细错误信息。"
        type="error"
        showIcon
      />
    );
  }

  // 图表数据已在 loadStatistics 中转换并设置到 state
  // levelChartData 和 riskChartData 现在直接使用 state 的值
  console.log('=== RFM 数据 ===', rfmSummary);

  // 🔍 调试：检查饼图数据
  console.log('🔍 levelChartData:', levelChartData);
  console.log('🔍 levelChartData length:', levelChartData.length);
  console.log('🔍 levelChartData[0]:', levelChartData[0]);
  console.log('🔍 levelChartData keys:', levelChartData.map(item => ({ name: item.name, value: item.value })));

  // 等级分布饼图配置 - 添加版本号用于调试
  
  const levelPieConfig = {
    appendPadding: 10,
    data: levelChartData,
    angleField: 'value',
    colorField: 'name',
    radius: 0.8,
    label: {
      content: (item: any) => {
        const total = levelChartData.reduce((sum, d) => sum + d.value, 0);
        const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
        return `${item.name}: ${percent}%`;
      },
      style: {
        textAlign: 'center',
        fontSize: 12,
      },
    },
    interactions: [{ type: 'element-active' }],
    color: ['#cd7f32', '#c0c0c0', '#ffd700', '#e5e4e2', '#b9f2ff'],
    tooltip: {
      showMarkers: true,
      shared: true,
      formatter: (datum: any) => {
        return {
          name: datum.name,
          value: `${datum.value}人`,
        };
      },
    },
  };

  // 风险分布饼图配置
  const riskPieConfig = {
    appendPadding: 10,
    data: riskChartData,
    angleField: 'value',
    colorField: 'name',
    radius: 0.8,
    label: {
      content: (item: any) => {
        const total = riskChartData.reduce((sum, d) => sum + d.value, 0);
        const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
        return `${item.name}: ${percent}%`;
      },
      style: {
        textAlign: 'center',
        fontSize: 12,
      },
    },
    interactions: [{ type: 'element-active' }],
    color: ['#52c41a', '#faad14', '#f5222d'],
    tooltip: {
      showMarkers: true,
      shared: true,
      formatter: (datum: any) => {
        return {
          name: datum.name,
          value: `${datum.value}人`,
        };
      },
    },
  };

  // 城市柱状图配置 - 修复 label position 和 tooltip
  const cityColumnConfig = {
    data: statistics.cityStats.slice(0, 10).map((item: any) => ({
      city: item.city || '未知城市',
      count: Number(item.count) || 0,
    })),
    xField: 'city',
    yField: 'count',
    label: {
      position: 'top', // 修改为 'top' 避免 'middle' 导致的错误
      style: {
        fill: '#000000', // 改为黑色文字
        opacity: 1,
      },
    },
    xAxis: {
      label: {
        autoRotate: true,
        autoHide: false,
      },
    },
    color: '#1890ff',
    tooltip: {
      showMarkers: true,
      formatter: (datum: { city: string; count: number }) => {
        return {
          name: datum.city,
          value: `${datum.count}人`,
        };
      },
    },
  };

  // RFM 价值分布图表
  const segmentPieConfig = {
    appendPadding: 10,
    data: rfmSummary && rfmSummary.segmentDistribution ? Object.entries(rfmSummary.segmentDistribution).map(([key, value]) => ({
      name: key,
      value: Number(value),
    })) : [],
    angleField: 'value',
    colorField: 'name',
    radius: 0.8,
    label: {
      content: (item: any) => {
        const total = segmentPieConfig.data.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
        const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
        return `${item.name}: ${percent}%`;
      },
      style: {
        textAlign: 'center',
        fontSize: 12,
      },
    },
    interactions: [{ type: 'element-active' }],
    color: ['#fa8c16', '#1890ff', '#722ed1', '#52c41a', '#eb2f96', '#13c2c2', '#fadb14', '#ff7a45'],
    tooltip: {
      showMarkers: true,
      shared: true,
      formatter: (datum: any) => {
        return {
          name: datum?.name || '未知',
          value: `${datum?.value || 0}人`,
        };
      },
    },
  };

  console.log('=== RFM 价值分布数据 ===', segmentPieConfig.data);

  // RFM 分数分布 - 修复 label position 和 tooltip
  const scoreColumnConfig = {
    data: [
      { score: '3-5 分', count: rfmData.filter(item => item.totalScore <= 5).length },
      { score: '6-8 分', count: rfmData.filter(item => item.totalScore > 5 && item.totalScore <= 8).length },
      { score: '9-11 分', count: rfmData.filter(item => item.totalScore > 8 && item.totalScore <= 11).length },
      { score: '12-15 分', count: rfmData.filter(item => item.totalScore > 11).length },
    ],
    xField: 'score',
    yField: 'count',
    label: {
      position: 'top', // 修改为 'top' 避免 'middle' 导致的错误
      style: {
        fill: '#000000',
        opacity: 1,
      },
    },
    color: '#1890ff',
    tooltip: {
      showMarkers: true,
      formatter: (datum: { score: string; count: number }) => {
        return {
          name: datum.score,
          value: `${datum.count}人`,
        };
      },
    },
  };

  // 表格列定义
  const columns = [
    {
      title: '客户 ID',
      dataIndex: 'customerId',
      key: 'customerId',
      width: 80,
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 120,
    },
    {
      title: 'R (天)',
      dataIndex: 'recency',
      key: 'recency',
      width: 80,
      sorter: (a: RfmAnalysis, b: RfmAnalysis) => a.recency - b.recency,
    },
    {
      title: 'F (次)',
      dataIndex: 'frequency',
      key: 'frequency',
      width: 80,
      sorter: (a: RfmAnalysis, b: RfmAnalysis) => a.frequency - b.frequency,
    },
    {
      title: 'M (元)',
      dataIndex: 'monetary',
      key: 'monetary',
      width: 100,
      sorter: (a: RfmAnalysis, b: RfmAnalysis) => a.monetary - b.monetary,
      render: (value: number) => `¥${value.toLocaleString()}`,
    },
    {
      title: 'R 分',
      dataIndex: 'rScore',
      key: 'rScore',
      width: 70,
      render: (score: number) => (
        <Progress
          percent={(score / 5) * 100}
          size="small"
          strokeColor={score >= 4 ? '#52c41a' : score >= 3 ? '#faad14' : '#f5222d'}
          format={() => score}
        />
      ),
    },
    {
      title: 'F 分',
      dataIndex: 'fScore',
      key: 'fScore',
      width: 70,
      render: (score: number) => (
        <Progress
          percent={(score / 5) * 100}
          size="small"
          strokeColor={score >= 4 ? '#52c41a' : score >= 3 ? '#faad14' : '#f5222d'}
          format={() => score}
        />
      ),
    },
    {
      title: 'M 分',
      dataIndex: 'mScore',
      key: 'mScore',
      width: 70,
      render: (score: number) => (
        <Progress
          percent={(score / 5) * 100}
          size="small"
          strokeColor={score >= 4 ? '#52c41a' : score >= 3 ? '#faad14' : '#f5222d'}
          format={() => score}
        />
      ),
    },
    {
      title: '总分',
      dataIndex: 'totalScore',
      key: 'totalScore',
      width: 80,
      sorter: (a: RfmAnalysis, b: RfmAnalysis) => a.totalScore - b.totalScore,
      render: (score: number) => (
        <Tag color={score >= 12 ? 'gold' : score >= 9 ? 'blue' : score >= 6 ? 'orange' : 'gray'}>
          {score}分
        </Tag>
      ),
    },
    {
      title: '价值分类',
      dataIndex: 'customerSegment',
      key: 'customerSegment',
      width: 120,
      filters: rfmSummary ? Object.keys(rfmSummary.segmentDistribution).map(segment => ({
        text: segment,
        value: segment,
      })) : [],
      onFilter: (value: any, record: RfmAnalysis) => record.customerSegment === String(value),
      render: (segment: string) => {
        const colorMap: Record<string, string> = {
          '重要价值客户': 'gold',
          '重要发展客户': 'blue',
          '重要保持客户': 'purple',
          '重要挽留客户': 'orange',
          '一般价值客户': 'cyan',
          '一般发展客户': 'green',
          '一般保持客户': 'default',
          '一般挽留客户': 'gray',
        };
        return <Tag color={colorMap[segment] || 'default'}>{segment}</Tag>;
      },
    },
    {
      title: '营销策略',
      dataIndex: 'strategy',
      key: 'strategy',
      width: 200,
      ellipsis: true,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 基础统计卡片 - 修复 antd 警告 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card variant="outlined">
            <Statistic
              title="总客户数"
              value={statistics.total}
              suffix="人"
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="outlined">
            <Statistic
              title="活跃客户"
              value={statistics.activeCount}
              suffix={`/${statistics.total}人`}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="outlined">
            <Statistic
              title="平均资产"
              precision={2}
              value={statistics.avgAssets}
              prefix="¥"
              styles={{ content: { color: '#722ed1' } }}
            />
          </Card>
        </Col>
        {rfmSummary && (
          <Col xs={24} sm={12} md={6}>
            <Card variant="outlined">
              <Statistic
                title="高价值客户占比"
                value={rfmSummary.highValueRatio * 100}
                suffix="%"
                precision={1}
                styles={{ content: { color: '#fa8c16' } }}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* RFM 分析汇总 - 修复 antd 警告 */}
      {rfmSummary && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} md={12}>
              <Card title="RFM 价值分布" variant="outlined">
                {rfmSummary && Object.keys(rfmSummary.segmentDistribution).length > 0 ? (
                  <Pie {...segmentPieConfig} height={300} />
                ) : (
                  <Empty description="暂无 RFM 数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="RFM 分数分布" variant="outlined">
                <Column {...scoreColumnConfig} height={300} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col span={24}>
              <Card
                title="RFM 分析详情"
                variant="outlined"
                extra={
                  <Select
                    placeholder="筛选价值分类"
                    value={segmentFilter}
                    onChange={setSegmentFilter}
                    style={{ width: 200 }}
                    allowClear
                  >
                    {Object.keys(rfmSummary.segmentDistribution).map(segment => (
                      <Select.Option key={segment} value={segment}>
                        {segment}
                      </Select.Option>
                    ))}
                  </Select>
                }
              >
                <Table
                  rowKey="customerId"
                  columns={columns}
                  dataSource={rfmData}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                  scroll={{ x: 1400 }}
                  bordered
                  size="middle"
                  loading={rfmLoading}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* 原有统计图表 - 修复 antd 警告 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="客户等级分布" variant="outlined">
            {levelChartData.length > 0 ? (
              <Pie {...levelPieConfig} height={300} />
            ) : (
              <Empty description="暂无等级数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="风险等级分布" variant="outlined">
            {riskChartData.length > 0 ? (
              <Pie {...riskPieConfig} height={300} />
            ) : (
              <Empty description="暂无风险数据" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24}>
          <Card title="城市分布 TOP10" variant="outlined">
            {statistics.cityStats && statistics.cityStats.length > 0 ? (
              <Column {...cityColumnConfig} height={300} />
            ) : (
              <Empty description="暂无城市数据" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CustomerStatistics;
