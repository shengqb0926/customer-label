import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, theme } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  UserOutlined,
  SettingOutlined,
  ExperimentOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ThunderboltOutlined,
  MonitorOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/stores/userStore';
import { UserRole } from '@/types';
import './index.css';

const { Header, Sider, Content } = Layout;

export default function BasicLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole } = useUserStore();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 菜单项配置
  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '仪表盘',
    },
    {
      key: '/recommendations',
      icon: <ExperimentOutlined />,
      label: '推荐结果',
    },
    {
      key: '/engine-monitor',
      icon: <MonitorOutlined />,
      label: '引擎监控',
    },
    // 客户管理 - 所有登录用户可访问
    {
      key: '/customers',
      icon: <TeamOutlined />,
      label: '客户管理',
    },
    // 规则管理和配置管理 - 需要分析师或管理员权限
    ...(hasRole([UserRole.ADMIN, UserRole.ANALYST]) ? [
      {
        key: '/rules',
        icon: <SettingOutlined />,
        label: '规则管理',
      },
      {
        key: '/clustering-configs',
        icon: <ExperimentOutlined />,
        label: '聚类配置',
      },
      {
        key: '/association-configs',
        icon: <LinkOutlined />,
        label: '关联规则',
      },
    ] : []),
    // 用户管理 - 仅管理员权限
    ...(hasRole(UserRole.ADMIN) ? [
      {
        key: '/users',
        icon: <UserOutlined />,
        label: '用户管理',
      },
    ] : []),
  ];

  // 用户菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: `${user?.username} (${user?.roles.join(', ')})`,
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout className="layout-container">
      <Sider trigger={null} collapsible collapsed={collapsed} className="layout-sider">
        <div className="logo">
          {collapsed ? '标签系统' : '客户标签智能推荐系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header className="layout-header" style={{ background: colorBgContainer }}>
          <span
            className="trigger"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </span>
          <div className="header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="user-info">
                <Avatar icon={<UserOutlined />} />
                <span className="username">{user?.username}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          className="layout-content"
          style={{
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}