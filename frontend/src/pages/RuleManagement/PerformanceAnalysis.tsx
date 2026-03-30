import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  DatePicker,
  Select,
  Button,
  Empty,
} from 'antd';
import {
  BarChartOutlined,
  TrendUpOutlined,
  UsergroupAddOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { Rule } from '@/services/rule';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface PerformanceMetrics {
  totalExecutions: number;
  matchedCount: number;
  matchRate: number;
  avgExecutionTime: number;
  acceptedTags: number;
  rejectedTags: number;
  acceptanceRate: number;
}

interface DailyStats {
  date: string;
  executions: number;
  matches: number;
  acceptances: number;
}

interface TopCustomer {
  id: number;
  name: string;
  matchedRules: number;
  acceptedTags: string[];
}

const PerformanceAnalysis: React.FC<{ ruleId?: number }> = ({ ruleId }) => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[any, any] | null>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);

  // 加载性能数据
  useEffect(() => {
    if (ruleId && dateRange) {
      loadPerformanceData(ruleId, dateRange);
    }
  }, [ruleId, dateRange]);

  const loadPerformanceData = async (id: number, range: [any, any]) => {
    try {
      setLoading(true);
      
      // TODO: 调用实际 API
      // const startDate = range[0].format('YYYY-MM-DD');
      // const endDate = range[1].format('YYYY-MM-DD');
      // const data = await ruleService.getPerformanceMetrics(id, { startDate, endDate });

      // 模拟数据
      const mockMetrics: PerformanceMetrics = {
        totalExecutions: 1250,
        matchedCount: 890,
        matchRate: 0.712,
        avgExecutionTime: 45.6,
        acceptedTags: 650,
        rejectedTags: 240,
        acceptanceRate: 0.73,
      };

      const mockDailyStats: DailyStats[] = Array.from({ length: 30 }, (_, i) => ({
        date: dayjs().subtract(29 - i, 'day').format('YYYY-MM-DD'),
        executions: Math.floor(Math.random() * 100) + 20,
        matches: Math.floor(Math.random() * 80) + 10,
        acceptances: Math.floor(Math.random() * 60) + 5,
      }));

      const mockTopCustomers: TopCustomer[] = [
        {
          id: 1,
          name: '张三',
          matchedRules: 5,
          acceptedTags: ['高净值客户', '理财偏好'],
        },
        {
          id: 2,
          name: '李四',
          matchedRules: 4,
          acceptedTags: ['潜力客户', '活跃客户'],
        },
        {
          id: 3,
          name: '王五',
          matchedRules: 3,
          acceptedTags: ['流失风险'],
        },
      ];

      setMetrics(mockMetrics);
      setDailyStats(mockDailyStats);
      setTopCustomers(mockTopCustomers);
    } catch (error: any) {
      message.error(error.message || '加载性能数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (!ruleId) {
    return (
      <Empty
        description={
          <Space direction="vertical">
            <Text>请先在规则列表中选择一个规则</Text>
            <Button type="primary" onClick={() => {}}>
              查看规则列表
            </Button>
          </Space>
        }
      />
    );
  }

  return (
    <div>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <Title level={4}>📊 效果分析</Title>
              <Text type="secondary">
                多维度分析规则执行效果和业务价值
              </Text>
            </div>

            <Space>
              <Text strong>时间范围:</Text>
              <RangePicker
                value={dateRange}
                onChange={(dates) => dates && setDateRange([dates[0], dates[1]])}
                allowClear={false}
              />
            </Space>
          </div>

          {/* 核心指标卡片 */}
          {metrics && (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card>
                  <Statistic
                    title="总执行次数"
                    value={metrics.totalExecutions}
                    prefix={<BarChartOutlined />}
                    suffix="次"
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    选定时间段内规则执行总次数
                  </Text>
                </Card>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6}>
                <Card>
                  <Statistic
                    title="匹配次数"
                    value={metrics.matchedCount}
                    prefix={<CheckCircleOutlined />}
                    suffix="次"
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    匹配成功率：{(metrics.matchRate * 100).toFixed(1)}%
                  </Text>
                </Card>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6}>
                <Card>
                  <Statistic
                    title="平均执行时间"
                    value={metrics.avgExecutionTime}
                    precision={2}
                    prefix={<TrendUpOutlined />}
                    suffix="ms"
                    valueStyle={{ color: '#faad14' }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    性能表现良好
                  </Text>
                </Card>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6}>
                <Card>
                  <Statistic
                    title="标签接受率"
                    value={metrics.acceptanceRate * 100}
                    precision={1}
                    prefix={<UsergroupAddOutlined />}
                    suffix="%"
                    valueStyle={{ color: '#722ed1' }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    已接受：{metrics.acceptedTags} / 已拒绝：{metrics.rejectedTags}
                  </Text>
                </Card>
              </Col>
            </Row>
          )}

          {/* 趋势图表占位 */}
          <Card title="📈 执行趋势" size="small">
            <div
              style={{
                height: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f5f5f5',
                borderRadius: 4,
              }}
            >
              <Empty
                description={
                  <Space direction="vertical">
                    <Text type="secondary">趋势图区域（可集成 Recharts/G2Plot）</Text>
                    <Text type="tertiary" style={{ fontSize: 12 }}>
                      展示每日执行次数、匹配次数、接受数量的趋势变化
                    </Text>
                  </Space>
                }
              />
            </div>
          </Card>

          {/* TOP 客户表格 */}
          <Card title="🏆 匹配度 TOP 客户" size="small">
            <Table
              dataSource={topCustomers}
              columns={[
                {
                  title: '客户姓名',
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: '匹配规则数',
                  dataIndex: 'matchedRules',
                  key: 'matchedRules',
                  sorter: (a, b) => a.matchedRules - b.matchedRules,
                },
                {
                  title: '已接受标签',
                  dataIndex: 'acceptedTags',
                  key: 'acceptedTags',
                  render: (tags: string[]) =>
                    tags.map(tag => (
                      <Tag key={tag} color="blue">
                        {tag}
                      </Tag>
                    )),
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_: any, record: TopCustomer) => (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        // TODO: 跳转到客户详情
                        message.info(`查看客户 ${record.name} 详情`);
                      }}
                    >
                      查看详情
                    </Button>
                  ),
                },
              ]}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>

          {/* 优化建议 */}
          <Card title="💡 优化建议" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {metrics && metrics.matchRate < 0.5 && (
                <Alert
                  message="匹配率偏低"
                  description="当前规则匹配率低于 50%，建议检查条件是否过于严格，或考虑调整阈值。"
                  type="warning"
                  showIcon
                />
              )}
              {metrics && metrics.acceptanceRate < 0.6 && (
                <Alert
                  message="接受率偏低"
                  description="推荐标签的接受率低于 60%，建议优化规则逻辑或调整推荐策略。"
                  type="warning"
                  showIcon
                />
              )}
              {metrics && metrics.avgExecutionTime > 100 && (
                <Alert
                  message="执行时间偏长"
                  description="平均执行时间超过 100ms，建议优化表达式逻辑或添加索引。"
                  type="info"
                  showIcon
                />
              )}
              {!metrics?.matchRate || metrics.matchRate >= 0.5 ? (
                <Alert
                  message="规则表现良好"
                  description="当前规则各项指标正常，继续保持监控。"
                  type="success"
                  showIcon
                />
              ) : null}
            </Space>
          </Card>
        </Space>
      </Card>
    </div>
  );
};

export default PerformanceAnalysis;
