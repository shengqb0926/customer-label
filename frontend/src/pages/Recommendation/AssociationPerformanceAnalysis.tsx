import React, { useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Alert,
  Badge,
  Progress,
} from 'antd';
import {
  LinkOutlined,
  BarChartOutlined,
  TrophyOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface AssociationRule {
  id: number;
  antecedent: string[];
  consequent: string[];
  support: number;
  confidence: number;
  lift: number;
  conviction?: number;
}

interface AssociationPerformanceAnalysisProps {
  configId?: number;
}

// 模拟关联规则数据
const MOCK_RULES: AssociationRule[] = [
  {
    id: 1,
    antecedent: ['手机'],
    consequent: ['保护壳'],
    support: 0.25,
    confidence: 0.85,
    lift: 3.2,
    conviction: 1.8,
  },
  {
    id: 2,
    antecedent: ['笔记本电脑', '鼠标'],
    consequent: ['鼠标垫'],
    support: 0.18,
    confidence: 0.78,
    lift: 2.8,
    conviction: 1.6,
  },
  {
    id: 3,
    antecedent: ['男装'],
    consequent: ['休闲鞋'],
    support: 0.22,
    confidence: 0.65,
    lift: 2.1,
    conviction: 1.4,
  },
  {
    id: 4,
    antecedent: ['零食', '饮料'],
    consequent: ['电影票'],
    support: 0.15,
    confidence: 0.72,
    lift: 2.5,
    conviction: 1.5,
  },
  {
    id: 5,
    antecedent: ['护肤品'],
    consequent: ['彩妆'],
    support: 0.20,
    confidence: 0.68,
    lift: 2.3,
    conviction: 1.3,
  },
];

const AssociationPerformanceAnalysis: React.FC<AssociationPerformanceAnalysisProps> = ({ configId }) => {
  const [rules] = useState<AssociationRule[]>(MOCK_RULES);

  // 计算整体指标
  const overallMetrics = {
    totalRules: rules.length,
    avgSupport: rules.reduce((sum, r) => sum + r.support, 0) / rules.length,
    avgConfidence: rules.reduce((sum, r) => sum + r.confidence, 0) / rules.length,
    avgLift: rules.reduce((sum, r) => sum + r.lift, 0) / rules.length,
  };

  // 评估规则质量
  const evaluateRuleQuality = (lift: number) => {
    if (lift >= 3) return { level: '极强相关', color: 'purple' };
    if (lift >= 2) return { level: '强相关', color: 'red' };
    if (lift >= 1.5) return { level: '中等相关', color: 'orange' };
    if (lift >= 1) return { level: '弱相关', color: 'blue' };
    return { level: '不相关', color: 'gray' };
  };

  // 规则详情表格列定义
  const columns = [
    {
      title: '规则 ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => <Badge count={id} style={{ backgroundColor: '#1890ff' }} />,
    },
    {
      title: '前件',
      dataIndex: 'antecedent',
      key: 'antecedent',
      width: 200,
      render: (items: string[]) => (
        <Space wrap>
          {items.map(item => <Tag key={item} color="blue">{item}</Tag>)}
        </Space>
      ),
    },
    {
      title: '后件',
      dataIndex: 'consequent',
      key: 'consequent',
      width: 150,
      render: (items: string[]) => (
        <Space wrap>
          {items.map(item => <Tag key={item} color="green">{item}</Tag>)}
        </Space>
      ),
    },
    {
      title: '支持度',
      dataIndex: 'support',
      key: 'support',
      width: 120,
      render: (value: number) => (
        <Progress
          percent={value * 100}
          size="small"
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
          format={(percent) => `${percent.toFixed(1)}%`}
        />
      ),
      sorter: (a: any, b: any) => a.support - b.support,
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 120,
      render: (value: number) => (
        <Progress
          percent={value * 100}
          size="small"
          status="active"
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
          format={(percent) => `${percent.toFixed(1)}%`}
        />
      ),
      sorter: (a: any, b: any) => a.confidence - b.confidence,
    },
    {
      title: '提升度',
      dataIndex: 'lift',
      key: 'lift',
      width: 120,
      render: (value: number) => {
        const evaluation = evaluateRuleQuality(value);
        return (
          <Tag color={evaluation.color}>
            {value.toFixed(2)} ({evaluation.level})
          </Tag>
        );
      },
      sorter: (a: any, b: any) => a.lift - b.lift,
    },
  ];

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 整体质量评估 */}
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总规则数"
                value={overallMetrics.totalRules}
                prefix={<LinkOutlined />}
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>

          <Col span={6}>
            <Card>
              <Statistic
                title="平均支持度"
                value={overallMetrics.avgSupport}
                precision={2}
                prefix={<BarChartOutlined />}
                styles={{ content: { color: '#faad14' } }}
              />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">频繁程度</Text>
              </div>
            </Card>
          </Col>

          <Col span={6}>
            <Card>
              <Statistic
                title="平均置信度"
                value={overallMetrics.avgConfidence}
                precision={2}
                prefix={<TrophyOutlined />}
                styles={{ content: { color: '#52c41a' } }}
              />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">可信程度</Text>
              </div>
            </Card>
          </Col>

          <Col span={6}>
            <Card>
              <Statistic
                title="平均提升度"
                value={overallMetrics.avgLift}
                precision={2}
                prefix={<BarChartOutlined />}
                styles={{ content: { color: '#722ed1' } }}
              />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">相关强度</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 质量评估建议 */}
        {overallMetrics.avgLift < 1.5 && (
          <Alert
            message="⚠️ 关联强度待优化"
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>当前平均提升度为 {overallMetrics.avgLift.toFixed(2)}，低于推荐值 1.5。</Text>
                <ul>
                  <li>降低最小支持度阈值，发现更多潜在规则</li>
                  <li>调整商品选择，选择相关性更强的商品组合</li>
                  <li>增加数据量，提高统计显著性</li>
                  <li>尝试其他算法（如 FP-Growth）</li>
                </ul>
              </Space>
            }
            type="warning"
            showIcon
          />
        )}

        {overallMetrics.avgLift >= 2 && (
          <Alert
            message="✅ 关联强度优秀"
            description={`当前平均提升度达到 ${overallMetrics.avgLift.toFixed(2)}，规则具有很强的相关性。可以基于此结果进行业务应用。`}
            type="success"
            showIcon
          />
        )}

        {/* 规则详细列表 */}
        <Card title="📋 关联规则详细列表" size="small">
          <Table
            columns={columns}
            dataSource={rules}
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ x: 1000 }}
          />
        </Card>

        {/* 业务解读 */}
        <Card title="💡 业务解读与应用建议" size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            {rules.slice(0, 5).map(rule => {
              const qualityEval = evaluateRuleQuality(rule.lift);
              return (
                <Card key={rule.id} size="small" type="inner">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Space>
                        <Text strong>
                          {rule.antecedent.join(' + ')} → {rule.consequent.join(' + ')}
                        </Text>
                        <Tag color={qualityEval.color}>{qualityEval.level}</Tag>
                      </Space>
                      <Badge count={`提升度：${rule.lift.toFixed(2)}`} style={{ backgroundColor: '#722ed1' }} />
                    </div>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Text type="secondary">支持度：</Text>
                        <Progress
                          percent={rule.support * 100}
                          size="small"
                          format={(percent) => `${percent.toFixed(1)}%`}
                        />
                      </Col>
                      <Col span={8}>
                        <Text type="secondary">置信度：</Text>
                        <Progress
                          percent={rule.confidence * 100}
                          size="small"
                          status="active"
                          format={(percent) => `${percent.toFixed(1)}%`}
                        />
                      </Col>
                      <Col span={8}>
                        <Text type="secondary">提升度：</Text>
                        <Text strong>{rule.lift.toFixed(2)}</Text>
                      </Col>
                    </Row>

                    <Alert
                      message="🎯 应用建议"
                      description={
                        <ul>
                          <li><strong>捆绑销售：</strong>将{rule.antecedent.join('、')}与{rule.consequent.join('、')}组合销售</li>
                          <li><strong>页面推荐：</strong>在{rule.antecedent.join('、')}详情页推荐{rule.consequent.join('、')}</li>
                          <li><strong>购物车推荐：</strong>用户添加{rule.antecedent.join('、')}时提示购买{rule.consequent.join('、')}</li>
                          {rule.confidence > 0.7 && (
                            <li><strong>精准营销：</strong>对购买{rule.antecedent.join('、')}的用户推送{rule.consequent.join('、')}优惠券</li>
                          )}
                        </ul>
                      }
                      type="info"
                      showIcon
                      style={{ marginTop: 8 }}
                    />
                  </Space>
                </Card>
              );
            })}
          </Space>
        </Card>
      </Space>
    </Card>
  );
};

export default AssociationPerformanceAnalysis;
