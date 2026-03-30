import React, { useState } from 'react';
import { Card, Tabs, Typography, Space, Button, message } from 'antd';
import {
  AppstoreOutlined,
  TestOutlined,
  HistoryOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import RuleList from './RuleList';
import VisualRuleBuilder from './VisualRuleBuilder';
import RuleTesterTool from './RuleTesterTool';
import VersionHistory from './VersionHistory';
import PerformanceAnalysis from './PerformanceAnalysis';

const { Title } = Typography;

const RuleManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('rules');
  const [selectedRuleId, setSelectedRuleId] = useState<number | undefined>(undefined);

  // 处理规则选择（用于测试、版本、分析）
  const handleRuleSelect = (ruleId: number) => {
    setSelectedRuleId(ruleId);
    message.success('已选择规则，可进行测试或查看分析');
  };

  // Tab 配置
  const tabItems = [
    {
      key: 'rules',
      label: (
        <Space>
          <AppstoreOutlined />
          规则列表
        </Space>
      ),
      children: <RuleList onTest={(rule) => {
        setSelectedRuleId(rule.id);
        setActiveTab('test');
      }} />,
    },
    {
      key: 'build',
      label: (
        <Space>
          <AppstoreOutlined />
          可视化构建
        </Space>
      ),
      children: <VisualRuleBuilder />,
    },
    {
      key: 'test',
      label: (
        <Space>
          <TestOutlined />
          规则测试
        </Space>
      ),
      children: <RuleTesterTool ruleId={selectedRuleId} />,
    },
    {
      key: 'history',
      label: (
        <Space>
          <HistoryOutlined />
          版本历史
        </Space>
      ),
      children: <VersionHistory ruleId={selectedRuleId} />,
    },
    {
      key: 'analysis',
      label: (
        <Space>
          <BarChartOutlined />
          效果分析
        </Space>
      ),
      children: <PerformanceAnalysis ruleId={selectedRuleId} />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Title level={2}>🏷️ 规则管理</Title>
          <Typography.Text type="secondary">
            可视化规则构建、测试验证、版本控制及效果分析一体化平台
          </Typography.Text>
        </div>

        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            type="card"
          />
        </Card>
      </Space>
    </div>
  );
};

export default RuleManagement;
