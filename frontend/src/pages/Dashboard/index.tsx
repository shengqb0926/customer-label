import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Alert,
  Table,
  Typography,
  Badge,
  Tag,
  Space,
  Button,
  Progress,
  Tooltip,
  message,
} from 'antd';
import {
  UserOutlined,
  ExperimentOutlined,
  TrophyOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
  BellOutlined,
  TrendUpOutlined,
  TrendDownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { getStats } from '@/services/scoring';
import { getRecommendations } from '@/services/recommendation';
import { getUsers } from '@/services/user';
import { useUserStore } from '@/stores/userStore';
import type { Recommendation } from '@/services/recommendation';

const { Title, Text, Paragraph } = Typography;

// 核心指标接口
interface DashboardMetrics {
  // 基础统计
  totalCustomers: number;
  totalRecommendations: number;
  avgScore: number;
  highScoreCount: number;
  
  // 推荐相关
  acceptedRecommendations: number;
  pendingRecommendations: number;
  rejectionRate: number;
  acceptanceRate: number;
  
  // 趋势数据
  customerGrowthRate: number;
  recommendationGrowthRate: number;
  
  // 性能指标
  avgResponseTime: number;
  systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

// 通知类型
interface Notification {
  id: number;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// 模拟实时通知数据
const generateNotifications = (): Notification[] => [
  {
    id: 1,
    type: 'success',
    title: '推荐引擎执行完成',
    message: '成功为 156 位客户生成推荐标签',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    read: false,
  },
  {
    id: 2,
    type: 'info',
    title: '新规则已激活',
    message: '"高净值客户识别规则" 已启用',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: false,
  },
  {
    id: 3,
    type: 'warning',
    title: '匹配率偏低',
    message: '"潜力客户挖掘规则" 匹配率低于 30%',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    read: true,
  },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCustomers: 0,
    totalRecommendations: 0,
    avgScore: 0,
    highScoreCount: 0,
    acceptedRecommendations: 0,
    pendingRecommendations: 0,
    rejectionRate: 0,
    acceptanceRate: 0,
    customerGrowthRate: 0,
    recommendationGrowthRate: 0,
    avgResponseTime: 0,
    systemHealth: 'good',
  });
  const [recentRecommendations, setRecentRecommendations] = useState<Recommendation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const user = useUserStore((state) => state.user);

  // 加载仪表盘数据
  useEffect(() => {
    loadDashboardData();
    
    // 模拟实时通知推送（每 30 秒检查一次）
    const notificationInterval = setInterval(() => {
      checkNewNotifications();
    }, 30000);

    return () => clearInterval(notificationInterval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 并行加载数据
      const [statsData, recommendationsData, usersData] = await Promise.allSettled([
        getStats(),
        getRecommendations({ limit: 10 }),
        getUsers({ limit: 1 }),
      ]);

      const statsResult = statsData.status === 'fulfilled' ? statsData.value : null;
      const recommendationsResult = recommendationsData.status === 'fulfilled' 
        ? recommendationsData.value 
        : { data: [] };
      const usersResult = usersData.status === 'fulfilled' ? usersData.value : null;

      // 计算核心指标
      const totalRecs = recommendationsResult?.total || 0;
      const acceptedCount = recommendationsResult?.data?.filter((r: any) => r.isAccepted)?.length || 0;
      
      setMetrics({
        totalCustomers: usersResult?.total || 0,
        totalRecommendations: totalRecs,
        avgScore: statsResult?.averageScore || 0,
        highScoreCount: statsResult?.highScoreCount || 0,
        acceptedRecommendations: recommendationsResult?.data?.filter((r: any) => r.isAccepted)?.length || 0,
        pendingRecommendations: recommendationsResult?.data?.filter((r: any) => !r.isAccepted)?.length || 0,
        rejectionRate: totalRecs > 0 ? ((totalRecs - acceptedCount) / totalRecs) * 100 : 0,
        acceptanceRate: totalRecs > 0 ? (acceptedCount / totalRecs) * 100 : 0,
        customerGrowthRate: 5.2, // TODO: 从后端获取真实增长率
        recommendationGrowthRate: 12.8, // TODO: 从后端获取真实增长率
        avgResponseTime: 45.6, // TODO: 从后端获取真实性能数据
        systemHealth: 'excellent',
      });

      setRecentRecommendations(recommendationsResult?.data || []);
      
      // 加载通知
      const notis = generateNotifications();
      setNotifications(notis);
      setUnreadCount(notis.filter(n => !n.read).length);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      message.error('加载仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 检查新通知
  const checkNewNotifications = async () => {
    // TODO: 调用实际 API 获取新通知
    const newNoti: Notification = {
      id: Date.now(),
      type: 'info',
      title: '系统更新',
      message: '规则管理界面已升级，支持可视化构建',
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    setNotifications(prev => [newNoti, ...prev].slice(0, 10)); // 保留最近 10 条
    setUnreadCount(prev => prev + 1);
    message.info('收到一条新通知');
  };

  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    message.success('数据已刷新');
  };

  // 标记所有通知为已读
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" description="加载中..." />
      </div>
    );
  }

  return (
    <div>
      {/* 顶部标题栏 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <div>
          <Title level={2} style={{ marginBottom: 8 }}>
            📊 智能仪表盘
          </Title>
          <Text type="secondary">
            欢迎回来，{user?.username}！当前系统运行正常
          </Text>
        </div>
        
        <Space>
          <Badge count={unreadCount} offset={[-10, 0]}>
            <Button 
              icon={<BellOutlined />} 
              onClick={markAllAsRead}
            >
              通知中心
            </Button>
          </Badge>
          
          <Button 
            icon={<ReloadOutlined />} 
            loading={refreshing}
            onClick={handleRefresh}
          >
            刷新数据
          </Button>
        </Space>
      </div>

      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]}>
        {/* 客户总数 */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="客户总数"
              value={metrics.totalCustomers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 16 }}>
              <Space>
                <Tag color="blue">
                  {metrics.customerGrowthRate > 0 ? (
                    <TrendUpOutlined />
                  ) : (
                    <TrendDownOutlined />
                  )}
                  {metrics.customerGrowthRate > 0 ? '+' : ''}{metrics.customerGrowthRate}%
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  较上月
                </Text>
              </Space>
            </div>
          </Card>
        </Col>

        {/* 推荐记录 */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="推荐记录"
              value={metrics.totalRecommendations}
              prefix={<ExperimentOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 16 }}>
              <Space>
                <Tag color="green">
                  {metrics.recommendationGrowthRate > 0 ? (
                    <TrendUpOutlined />
                  ) : (
                    <TrendDownOutlined />
                  )}
                  {metrics.recommendationGrowthRate > 0 ? '+' : ''}{metrics.recommendationGrowthRate}%
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  较上周
                </Text>
              </Space>
            </div>
          </Card>
        </Col>

        {/* 平均评分 */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="平均评分"
              value={metrics.avgScore}
              precision={2}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ marginTop: 16 }}>
              <Progress
                percent={(metrics.avgScore / 15) * 100}
                size="small"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                showInfo={false}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                满分 15 分
              </Text>
            </div>
          </Card>
        </Col>

        {/* 高分客户 */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="高分客户"
              value={metrics.highScoreCount}
              prefix={<DashboardOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                评分前 20% 的客户
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 推荐分析卡片 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* 接受率分析 */}
        <Col xs={24} md={12}>
          <Card title="🎯 推荐接受率分析">
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 36, color: '#52c41a', fontWeight: 'bold' }}>
                    {metrics.acceptanceRate.toFixed(1)}%
                  </div>
                  <Text type="secondary">接受率</Text>
                  <div style={{ marginTop: 16 }}>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    <Text>{metrics.acceptedRecommendations} 条已接受</Text>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 36, color: '#ff4d4f', fontWeight: 'bold' }}>
                    {metrics.rejectionRate.toFixed(1)}%
                  </div>
                  <Text type="secondary">拒绝率</Text>
                  <div style={{ marginTop: 16 }}>
                    <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                    <Text>{metrics.pendingRecommendations} 条待处理</Text>
                  </div>
                </div>
              </Col>
            </Row>
            
            <div style={{ marginTop: 16 }}>
              <Progress
                percent={metrics.acceptanceRate}
                strokeColor="#52c41a"
                format={(percent) => `${percent?.toFixed(1)}%`}
              />
            </div>
          </Card>
        </Col>

        {/* 系统性能监控 */}
        <Col xs={24} md={12}>
          <Card title="⚡ 系统性能监控">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>平均响应时间</Text>
                <Text strong>{metrics.avgResponseTime.toFixed(2)} ms</Text>
              </div>
              <Progress
                percent={Math.min(100, (100 / metrics.avgResponseTime) * 50)}
                strokeColor="#1890ff"
                status="active"
                format={() => metrics.avgResponseTime < 50 ? '优秀' : '良好'}
              />
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>系统健康度</Text>
                <Tag color={
                  metrics.systemHealth === 'excellent' ? 'green' :
                  metrics.systemHealth === 'good' ? 'blue' :
                  metrics.systemHealth === 'fair' ? 'orange' : 'red'
                }>
                  {metrics.systemHealth === 'excellent' && '🟢 优秀'}
                  {metrics.systemHealth === 'good' && '🔵 良好'}
                  {metrics.systemHealth === 'fair' && '🟠 一般'}
                  {metrics.systemHealth === 'poor' && '🔴 较差'}
                </Tag>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>推荐引擎状态</Text>
                <Tag color="green">✅ 运行中</Tag>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 实时通知面板 */}
      <Card 
        title={
          <Space>
            <ThunderboltOutlined />
            实时通知
          </Space>
        }
        style={{ marginTop: 16 }}
        extra={
          <Button type="link" onClick={markAllAsRead}>
            全部标记为已读
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {notifications.map(noti => (
            <Alert
              key={noti.id}
              type={noti.type}
              showIcon
              closable
              style={{ 
                opacity: noti.read ? 0.6 : 1,
                transition: 'opacity 0.3s',
              }}
              message={
                <Space>
                  <Text strong>{noti.title}</Text>
                  {!noti.read && <Badge dot />}
                </Space>
              }
              description={
                <Paragraph style={{ margin: 0 }}>
                  {noti.message}
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(noti.timestamp).toLocaleString('zh-CN')}
                  </Text>
                </Paragraph>
              }
            />
          ))}
        </Space>
      </Card>

      {/* 最近推荐表格 */}
      <Card title="📋 最近推荐" style={{ marginTop: 16 }}>
        {recentRecommendations.length > 0 ? (
          <Table
            columns={[
              {
                title: '客户 ID',
                dataIndex: 'customerId',
                key: 'customerId',
                width: 100,
              },
              {
                title: '标签名称',
                dataIndex: 'tagName',
                key: 'tagName',
              },
              {
                title: '标签分类',
                dataIndex: 'tagCategory',
                key: 'tagCategory',
                width: 120,
              },
              {
                title: '置信度',
                dataIndex: 'confidence',
                key: 'confidence',
                width: 100,
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
              },
              {
                title: '来源',
                dataIndex: 'source',
                key: 'source',
                width: 100,
                render: (source: string) => {
                  const sourceMap: Record<string, string> = {
                    rule: '规则',
                    clustering: '聚类',
                    association: '关联',
                    fusion: '融合',
                  };
                  return sourceMap[source] || source;
                },
              },
              {
                title: '状态',
                key: 'status',
                width: 80,
                render: (_: any, record: any) => (
                  record.isAccepted ? (
                    <Tag color="green">已接受</Tag>
                  ) : (
                    <Tag color="default">待处理</Tag>
                  )
                ),
              },
            ]}
            dataSource={recentRecommendations}
            rowKey="id"
            pagination={false}
            scroll={{ x: 800 }}
            size="small"
          />
        ) : (
          <Alert
            title="暂无推荐数据"
            description="请先为客户生成推荐标签"
            type="info"
            showIcon
          />
        )}
      </Card>
    </div>
  );
}
