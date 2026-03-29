import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, theme } from 'antd';
import type { TabsProps } from 'antd';
import {
  UserOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import CustomerList from './CustomerList';
import CustomerStatistics from './CustomerStatistics';

const CustomerManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('list'); // 默认显示客户列表
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const tabItems: TabsProps['items'] = [
    {
      key: 'list',
      label: (
        <span>
          <UserOutlined style={{ marginRight: 8 }} />
          客户列表
        </span>
      ),
      children: <CustomerList />,
    },
    {
      key: 'statistics',
      label: (
        <span>
          <BarChartOutlined style={{ marginRight: 8 }} />
          统计分析
        </span>
      ),
      children: <CustomerStatistics />,
    },
  ];

  return (
    <div
      style={{
        background: colorBgContainer,
        borderRadius: borderRadiusLG,
        minHeight: 'calc(100vh - 130px)',
        padding: '24px',
      }}
    >
      <Tabs
        activeKey={activeTab}
        items={tabItems}
        onChange={(key) => {
          setActiveTab(key);
        }}
        size="large"
        style={{ minHeight: '100%' }}
      />
    </div>
  );
};

export default CustomerManagement;