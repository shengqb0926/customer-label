import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Typography,
  message,
  Table,
  Tag,
  Alert,
  Divider,
  Tabs,
} from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import type { Rule } from '@/services/rule';
import { ruleService } from '@/services/rule';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface TestCustomer {
  level: string;
  city: string;
  totalAssets: number;
  annualConsumption: number;
  riskLevel: string;
  rfmScore?: number;
  recency?: number;
  frequency?: number;
}

interface TestResult {
  matched: boolean;
  ruleName: string;
  tags: string[];
  confidence?: number;
  executionTime?: number;
}

const RuleTesterTool: React.FC<{ ruleId?: number }> = ({ ruleId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);

  // 测试单个规则
  const handleTestSingleRule = async () => {
    if (!ruleId) {
      message.warning('请先选择要测试的规则');
      return;
    }

    try {
      setLoading(true);
      const customerData = form.getFieldsValue();

      const startTime = Date.now();
      const result = await ruleService.testRule(ruleId, customerData);
      const executionTime = Date.now() - startTime;

      const testResult: TestResult = {
        matched: result.matched,
        ruleName: result.rule?.name || '未知规则',
        tags: result.tags || [],
        confidence: result.confidence,
        executionTime,
      };

      setTestResults([testResult]);
      message.success(`测试完成，耗时 ${executionTime}ms`);
    } catch (error: any) {
      message.error(error.message || '测试失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量测试所有规则
  const handleTestAllRules = async () => {
    try {
      setLoading(true);
      const customerData = form.getFieldsValue();

      const startTime = Date.now();
      const results = await ruleService.evaluateCustomer(customerData);
      const executionTime = Date.now() - startTime;

      const formattedResults: TestResult[] = results.map((r: any) => ({
        matched: true,
        ruleName: r.rule?.name || '未知规则',
        tags: r.tags || [],
        confidence: r.confidence,
        executionTime,
      }));

      setTestResults(formattedResults);
      message.success(`批量测试完成，共匹配 ${results.length} 条规则，耗时 ${executionTime}ms`);
    } catch (error: any) {
      message.error(error.message || '批量测试失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载预设客户数据
  const loadPresetCustomer = (type: string) => {
    const presets: Record<string, TestCustomer> = {
      highNetWorth: {
        level: 'GOLD',
        city: '北京',
        totalAssets: 8000000,
        annualConsumption: 500000,
        riskLevel: 'LOW',
        rfmScore: 14,
        recency: 7,
        frequency: 45,
      },
      potential: {
        level: 'SILVER',
        city: '上海',
        totalAssets: 3000000,
        annualConsumption: 200000,
        riskLevel: 'MEDIUM',
        rfmScore: 11,
        recency: 15,
        frequency: 25,
      },
      churnRisk: {
        level: 'BRONZE',
        city: '广州',
        totalAssets: 800000,
        annualConsumption: 50000,
        riskLevel: 'HIGH',
        rfmScore: 6,
        recency: 120,
        frequency: 3,
      },
    };

    form.setFieldsValue(presets[type]);
    message.success('已加载预设客户数据');
  };

  // 结果表格列定义
  const columns = [
    {
      title: '匹配状态',
      dataIndex: 'matched',
      key: 'matched',
      render: (matched: boolean) =>
        matched ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            匹配
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="default">
            未匹配
          </Tag>
        ),
    },
    {
      title: '规则名称',
      dataIndex: 'ruleName',
      key: 'ruleName',
    },
    {
      title: '推荐标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) =>
        tags.map(tag => (
          <Tag key={tag} color="blue">
            {tag}
          </Tag>
        )),
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (confidence?: number) =>
        confidence ? `${(confidence * 100).toFixed(1)}%` : '-',
    },
    {
      title: '执行时间',
      dataIndex: 'executionTime',
      key: 'executionTime',
      render: (time?: number) => (time ? `${time}ms` : '-'),
    },
  ];

  return (
    <div>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={4}>🧪 规则测试工具</Title>
            <Text type="secondary">
              输入客户数据，验证规则匹配效果，支持单规则和批量测试
            </Text>
          </div>

          {/* 客户数据输入 */}
          <Card
            title="📊 客户数据"
            size="small"
            extra={
              <Select
                placeholder="加载预设数据"
                onChange={loadPresetCustomer}
                style={{ width: 150 }}
              >
                <Select.Option value="highNetWorth">高净值客户</Select.Option>
                <Select.Option value="potential">潜力客户</Select.Option>
                <Select.Option value="churnRisk">流失风险客户</Select.Option>
              </Select>
            }
          >
            <Form form={form} layout="inline">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space wrap>
                  <Form.Item label="客户等级" name="level">
                    <Select style={{ width: 120 }}>
                      <Select.Option value="BRONZE">BRONZE</Select.Option>
                      <Select.Option value="SILVER">SILVER</Select.Option>
                      <Select.Option value="GOLD">GOLD</Select.Option>
                      <Select.Option value="DIAMOND">DIAMOND</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="城市" name="city">
                    <Input placeholder="北京" style={{ width: 120 }} />
                  </Form.Item>

                  <Form.Item label="总资产" name="totalAssets">
                    <InputNumber
                      placeholder="5000000"
                      style={{ width: 150 }}
                      formatter={(value) =>
                        `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      }
                      min={0}
                    />
                  </Form.Item>

                  <Form.Item label="年消费" name="annualConsumption">
                    <InputNumber
                      placeholder="200000"
                      style={{ width: 150 }}
                      formatter={(value) =>
                        `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      }
                      min={0}
                    />
                  </Form.Item>

                  <Form.Item label="风险等级" name="riskLevel">
                    <Select style={{ width: 100 }}>
                      <Select.Option value="LOW">低</Select.Option>
                      <Select.Option value="MEDIUM">中</Select.Option>
                      <Select.Option value="HIGH">高</Select.Option>
                    </Select>
                  </Form.Item>
                </Space>

                <Divider style={{ margin: '8px 0' }} />

                <Space wrap>
                  <Form.Item label="RFM 得分" name="rfmScore">
                    <InputNumber placeholder="12" min={3} max={15} style={{ width: 100 }} />
                  </Form.Item>

                  <Form.Item label="最近购买 (天)" name="recency">
                    <InputNumber placeholder="30" min={0} style={{ width: 100 }} />
                  </Form.Item>

                  <Form.Item label="购买频率 (次/年)" name="frequency">
                    <InputNumber placeholder="20" min={0} style={{ width: 100 }} />
                  </Form.Item>
                </Space>
              </Space>
            </Form>
          </Card>

          {/* 测试操作 */}
          <Card title="⚡ 测试操作" size="small">
            <Space>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={handleTestSingleRule}
                loading={loading}
                disabled={!ruleId}
              >
                测试当前规则
              </Button>

              <Button
                icon={<ExperimentOutlined />}
                onClick={handleTestAllRules}
                loading={loading}
              >
                批量测试所有规则
              </Button>
            </Space>
            {!ruleId && (
              <Text type="secondary" style={{ marginLeft: 16 }}>
                💡 提示：请在规则列表中选择一个规则后再进行测试
              </Text>
            )}
          </Card>

          {/* 测试结果 */}
          {testResults.length > 0 && (
            <Card title="📋 测试结果" size="small">
              <Table
                columns={columns}
                dataSource={testResults}
                rowKey={(record, index) => `result-${index}`}
                pagination={false}
                size="small"
              />

              <Divider />

              <Alert
                message="测试统计"
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Paragraph>
                      <Text strong>总规则数:</Text> {testResults.length} 条
                    </Paragraph>
                    <Paragraph>
                      <Text strong>匹配规则:</Text>{' '}
                      <Tag color="success">{testResults.filter(r => r.matched).length}</Tag>
                    </Paragraph>
                    <Paragraph>
                      <Text strong>平均执行时间:</Text>{' '}
                      {(
                        testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0) /
                        testResults.length
                      ).toFixed(2)}{' '}
                      ms
                    </Paragraph>
                  </Space>
                }
                type="info"
                showIcon
              />
            </Card>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default RuleTesterTool;
