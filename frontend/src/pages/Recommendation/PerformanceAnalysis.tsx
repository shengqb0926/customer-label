import React, { useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  Alert,
  Badge,
  Descriptions,
} from 'antd';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface ClusterMetrics {
  clusterId: number;
  sampleCount: number;
  centroid: Record<string, number>;
  silhouetteScore: number;
  inertia: number;
  characteristics: string[];
}

interface PerformanceAnalysisProps {
  configId?: number;
}

// 模拟聚类效果数据
const MOCK_CLUSTER_METRICS: ClusterMetrics[] = [
  {
    clusterId: 1,
    sampleCount: 320,
    centroid: { totalAssets: 8500000, annualConsumption: 450000, rfmScore: 13 },
    silhouetteScore: 0.75,
    inertia: 234.56,
    characteristics: ['高净值客户', '高消费能力', '忠诚度高'],
  },
  {
    clusterId: 2,
    sampleCount: 450,
    centroid: { totalAssets: 3200000, annualConsumption: 180000, rfmScore: 10 },
    silhouetteScore: 0.68,
    inertia: 345.67,
    characteristics: ['中等资产', '稳定消费', '潜力客户'],
  },
  {
    clusterId: 3,
    sampleCount: 280,
    centroid: { totalAssets: 1500000, annualConsumption: 90000, rfmScore: 7 },
    silhouetteScore: 0.62,
    inertia: 456.78,
    characteristics: ['成长型客户', '低频消费'],
  },
  {
    clusterId: 4,
    sampleCount: 150,
    centroid: { totalAssets: 500000, annualConsumption: 30000, rfmScore: 4 },
    silhouetteScore: 0.58,
    inertia: 567.89,
    characteristics: ['低价值客户', '流失风险'],
  },
  {
    clusterId: 5,
    sampleCount: 50,
    centroid: { totalAssets: 200000, annualConsumption: 10000, rfmScore: 3 },
    silhouetteScore: 0.45,
    inertia: 678.90,
    characteristics: ['负资产', '几乎无消费'],
  },
];

const PerformanceAnalysis: React.FC<PerformanceAnalysisProps> = ({ configId }) => {
  const [clusterMetrics] = useState<ClusterMetrics[]>(MOCK_CLUSTER_METRICS);

  // 计算整体指标
  const overallMetrics = {
    totalSamples: clusterMetrics.reduce((sum, c) => sum + c.sampleCount, 0),
    avgSilhouetteScore: clusterMetrics.reduce((sum, c) => sum + c.silhouetteScore, 0) / clusterMetrics.length,
    totalInertia: clusterMetrics.reduce((sum, c) => sum + c.inertia, 0),
  };

  // 评估聚类质量
  const evaluateQuality = (score: number) => {
    if (score >= 0.7) return { level: '优秀', color: 'green' };
    if (score >= 0.5) return { level: '良好', color: 'blue' };
    if (score >= 0.3) return { level: '一般', color: 'orange' };
    return { level: '较差', color: 'red' };
  };

  const qualityEval = evaluateQuality(overallMetrics.avgSilhouetteScore);

  // 簇详情表格列定义
  const columns = [
    {
      title: '簇 ID',
      dataIndex: 'clusterId',
      key: 'clusterId',
      width: 80,
      render: (id: number) => <Badge count={id} style={{ backgroundColor: '#1890ff' }} />,
    },
    {
      title: '样本数',
      dataIndex: 'sampleCount',
      key: 'sampleCount',
      width: 100,
      sorter: (a: any, b: any) => a.sampleCount - b.sampleCount,
    },
    {
      title: '占比',
      key: 'percentage',
      width: 100,
      render: (_: any, record: ClusterMetrics) => (
        <Progress
          percent={(record.sampleCount / overallMetrics.totalSamples) * 100}
          size="small"
          format={(percent) => `${percent?.toFixed(1)}%`}
        />
      ),
    },
    {
      title: '轮廓系数',
      dataIndex: 'silhouetteScore',
      key: 'silhouetteScore',
      width: 120,
      render: (score: number) => {
        const evalution = evaluateQuality(score);
        return (
          <Tag color={evalution.color}>
            {score.toFixed(2)} ({evalution.level})
          </Tag>
        );
      },
      sorter: (a: any, b: any) => a.silhouetteScore - b.silhouetteScore,
    },
    {
      title: '惯性',
      dataIndex: 'inertia',
      key: 'inertia',
      width: 100,
      render: (value: number) => value.toFixed(2),
    },
    {
      title: '特征描述',
      dataIndex: 'characteristics',
      key: 'characteristics',
      render: (tags: string[]) =>
        tags.map(tag => <Tag key={tag} color="blue">{tag}</Tag>),
    },
  ];

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 整体质量评估 */}
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card>
              <Statistic
                title="平均轮廓系数"
                value={overallMetrics.avgSilhouetteScore}
                precision={2}
                prefix={<BarChartOutlined />}
                styles={{ content: { color: qualityEval.color === 'green' ? '#52c41a' : '#1890ff' } }}
              />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">聚类质量:</Text>{' '}
                <Tag color={qualityEval.color}>{qualityEval.level}</Tag>
              </div>
            </Card>
          </Col>

          <Col span={8}>
            <Card>
              <Statistic
                title="总样本数"
                value={overallMetrics.totalSamples}
                prefix={<TrophyOutlined />}
                styles={{ content: { color: '#faad14' } }}
              />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">簇数量:</Text>{' '}
                <Badge count={clusterMetrics.length} style={{ backgroundColor: '#722ed1' }} />
              </div>
            </Card>
          </Col>

          <Col span={8}>
            <Card>
              <Statistic
                title="总惯性"
                value={overallMetrics.totalInertia}
                precision={2}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: '#722ed1' } }}
              />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">值越小越好</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 质量评估建议 */}
        {overallMetrics.avgSilhouetteScore < 0.5 && (
          <Alert
            message="⚠️ 聚类质量待优化"
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>当前平均轮廓系数为 {overallMetrics.avgSilhouetteScore.toFixed(2)}，低于推荐值 0.5。</Text>
                <ul>
                  <li>尝试调整 K 值（簇数量）</li>
                  <li>检查特征选择是否合理，去除高度相关的特征</li>
                  <li>考虑对特征进行标准化/归一化处理</li>
                  <li>尝试其他聚类算法（如 DBSCAN、层次聚类）</li>
                </ul>
              </Space>
            }
            type="warning"
            showIcon
          />
        )}

        {overallMetrics.avgSilhouetteScore >= 0.7 && (
          <Alert
            message="✅ 聚类质量优秀"
            description="当前聚类效果良好，轮廓系数达到 0.7 以上。可以基于此结果进行业务分析。"
            type="success"
            showIcon
          />
        )}

        {/* 各簇详细指标 */}
        <Card title="📊 各簇详细指标" size="small">
          <Table
            columns={columns}
            dataSource={clusterMetrics}
            rowKey="clusterId"
            pagination={false}
            size="small"
            scroll={{ x: 1000 }}
          />
        </Card>

        {/* 簇中心雷达图占位 */}
        <Card title="🎯 簇中心可视化" size="small">
          <div
            style={{
              height: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f5f5',
              borderRadius: 4,
            }}
          >
            <Alert
              message="雷达图区域（可集成 Recharts/G2Plot）"
              description="展示各簇在总资产、年消费、RFM 得分等维度的对比"
              type="info"
              showIcon
            />
          </div>
        </Card>

        {/* 业务解读 */}
        <Card title="💡 业务解读建议" size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            {clusterMetrics.map(cluster => (
              <Card key={cluster.clusterId} size="small" type="inner">
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="簇 ID">
                    <Badge count={cluster.clusterId} style={{ backgroundColor: '#1890ff' }} />
                  </Descriptions.Item>
                  <Descriptions.Item label="样本占比">
                    {(cluster.sampleCount / overallMetrics.totalSamples * 100).toFixed(1)}%
                  </Descriptions.Item>
                  <Descriptions.Item label="核心特征" span={2}>
                    {cluster.characteristics.join('、')}
                  </Descriptions.Item>
                  <Descriptions.Item label="质心数据">
                    <pre style={{ margin: 0, fontSize: 12 }}>
                      {JSON.stringify(cluster.centroid, null, 2)}
                    </pre>
                  </Descriptions.Item>
                  <Descriptions.Item label="聚类质量">
                    <Tag color={evaluateQuality(cluster.silhouetteScore).color}>
                      {cluster.silhouetteScore.toFixed(2)}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ))}
          </Space>
        </Card>
      </Space>
    </Card>
  );
};

export default PerformanceAnalysis;
