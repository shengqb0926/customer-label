import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Select, Space, Alert, Progress, Table, Typography, message, Spin } from 'antd';
import { PlayCircleOutlined, SaveOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { useLocation } from 'react-router-dom';
import { useRuleStore } from '@/stores/ruleStore';
import type { Rule, TestResult, RuleExpression } from '@/services/rule';

const { Title, Text } = Typography;
const { Option } = Select;

interface RuleTesterProps {
  rule?: Rule | null;
}

const RuleTester: React.FC<RuleTesterProps> = ({ rule }) => {
  const location = useLocation();
  const { testRule } = useRuleStore();
  
  // 从路由 state 获取传递的规则数据
  const ruleFromRoute = (location.state as any)?.rule;
  
  const [selectedRule, setSelectedRule] = useState<Rule | null>(rule || ruleFromRoute || null);
  const [expression, setExpression] = useState<string>(
    rule || ruleFromRoute 
      ? JSON.stringify(
          typeof (rule || ruleFromRoute)?.ruleExpression === 'string'
            ? JSON.parse((rule || ruleFromRoute)?.ruleExpression)
            : (rule || ruleFromRoute)?.ruleExpression,
          null,
          2
        )
      : ''
  );
  const [customerData, setCustomerData] = useState<string>(
    JSON.stringify({
      id: 1,
      age: 30,
      city: '北京',
      totalOrders: 15,
      totalAmount: 25000,
      lastOrderDate: '2026-03-20',
      avgOrderValue: 800,
      ordersLast30Days: 5,
      ordersLast90Days: 12,
    }, null, 2)
  );
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  // 监听路由参数变化（兼容 URL 参数方式）
  useEffect(() => {
    const ruleId = new URLSearchParams(location.search).get('ruleId');
    if (ruleId) {
      // 这里应该从 store 或 API 获取规则详情
      // 为简化示例，直接设置默认值
      setSelectedRule({
        id: parseInt(ruleId, 10),
        ruleName: '示例规则',
        description: '这是一个示例规则',
        ruleExpression: {
          operator: 'AND',
          conditions: [
            { field: 'age', operator: '>', value: 25 },
            { field: 'city', operator: '=', value: '北京' },
          ],
        },
      } as Rule);
    }
  }, [location]);

  // 处理测试
  const handleTest = async () => {
    setTesting(true);
    try {
      const ruleExpression = JSON.parse(expression);
      const data = JSON.parse(customerData);
      
      console.log('[RuleTester] 发送测试请求:', {
        ruleExpression,
        customerData: data,
      });
      
      const result = await testRule({
        ruleExpression,
        customerData: data,
      });
      
      console.log('[RuleTester] 测试结果:', result);
      setTestResult(result);
      
      // 后端返回 matched 字段，没有 success 字段
      if (result.matched !== undefined) {
        message.success(result.matched ? '测试成功：规则匹配' : '测试完成：未匹配规则');
      } else {
        // 理论上不会到这里，除非后端返回格式错误
        console.warn('[RuleTester] 返回结果不包含 matched 字段:', result);
        message.warning('测试失败：' + (result.error || '未知错误'));
      }
    } catch (error: any) {
      console.error('[RuleTester] 测试错误:', error);
      console.error('[RuleTester] 错误堆栈:', error.stack);
      console.error('[RuleTester] 错误响应:', error.response);
      message.error(error.message || '测试失败，请检查输入');
      setTestResult({
        matched: false,
        error: error.message || '未知错误',
      });
    } finally {
      setTesting(false);
    }
  };

  // 处理规则选择
  const handleRuleChange = (ruleId: number) => {
    // 这里应该从 store 或 API 获取规则详情
    // 为简化示例，直接设置默认值
    if (ruleId === -1) {
      setExpression('');
      setSelectedRule(null);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>规则测试工具</Title>

      {/* 规则选择器 */}
      <Card style={{ marginBottom: 16 }} size="small">
        <Space>
          <Text strong>选择规则:</Text>
          <Select
            style={{ width: 300 }}
            value={selectedRule?.id || -1}
            onChange={handleRuleChange}
            placeholder="选择已有规则"
            allowClear
          >
            <Option value={-1}>手动编写规则</Option>
            {/* 这里可以动态加载规则列表 */}
          </Select>
        </Space>
      </Card>

      <Row gutter={16}>
        {/* 左侧：规则表达式编辑器 */}
        <Col span={12}>
          <Card
            title="规则表达式"
            size="small"
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                JSON 格式
              </Text>
            }
          >
            <Editor
              height="400px"
              language="json"
              theme="vs-dark"
              value={expression}
              onChange={(value) => setExpression(value || '')}
              options={{
                minimap: { enabled: false },
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />
          </Card>
        </Col>

        {/* 右侧：客户数据编辑器 */}
        <Col span={12}>
          <Card
            title="客户数据"
            size="small"
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                测试数据
              </Text>
            }
          >
            <Editor
              height="400px"
              language="json"
              theme="vs-light"
              value={customerData}
              onChange={(value) => setCustomerData(value || '')}
              options={{
                minimap: { enabled: false },
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 底部：测试按钮和结果 */}
      <Card style={{ marginTop: 16 }} size="small">
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleTest}
            loading={testing}
            size="large"
          >
            运行测试
          </Button>
          <Text type="secondary">快捷键：Ctrl+Enter</Text>
        </Space>

        {testResult && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 匹配状态 */}
            <Alert
              message={testResult.matched ? '✓ 匹配成功' : '✗ 未匹配'}
              description={
                testResult.matched
                  ? `置信度：${((testResult.confidence || 0) * 100).toFixed(1)}%`
                  : testResult.error || '不满足规则条件'
              }
              type={testResult.matched ? 'success' : 'warning'}
              showIcon
            />

            {/* 详细信息 */}
            {testResult.matched && testResult.confidence !== undefined && (
              <>
                <div>
                  <Text strong>置信度:</Text>
                  <Progress
                    percent={Number(((testResult.confidence || 0) * 100).toFixed(1))}
                    status="active"
                    style={{ marginLeft: 16, width: 300 }}
                  />
                </div>

                {testResult.matchedConditions !== undefined && (
                  <div>
                    <Text strong>匹配情况:</Text>
                    <Text style={{ marginLeft: 8 }}>
                      {testResult.matchedConditions} / {testResult.totalConditions} 个条件
                    </Text>
                  </div>
                )}

                {testResult.executionTime !== undefined && (
                  <div>
                    <Text strong>执行耗时:</Text>
                    <Text code style={{ marginLeft: 8 }}>
                      {testResult.executionTime} ms
                    </Text>
                  </div>
                )}
              </>
            )}
          </Space>
        )}
      </Card>
    </div>
  );
};

export default RuleTester;
