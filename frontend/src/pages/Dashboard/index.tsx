import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin, Alert, Table, Typography } from 'antd';
import {
  UserOutlined,
  ExperimentOutlined,
  TrophyOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { getStats } from '@/services/scoring';
import { getRecommendations } from '@/services/recommendation';
import { getUsers } from '@/services/user';
import { useUserStore } from '@/stores/userStore';

const { Title } = Typography;

interface DashboardStats {
  userCount?: number;
  recommendationCount?: number;
  avgScore?: number;
  highScoreCount?: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({});
  const [recentRecommendations, setRecentRecommendations] = useState<any[]>([]);
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 并行加载数据
      const [statsData, recommendationsData, usersData] = await Promise.allSettled([
        getStats(),
        getRecommendations({ limit: 5 }),
        getUsers({ limit: 1 }),
      ]);

      const statsResult = statsData.status === 'fulfilled' ? statsData.value : null;
      const recommendationsResult = recommendationsData.status === 'fulfilled' 
        ? recommendationsData.value 
        : { data: [] };
      const usersResult = usersData.status === 'fulfilled' ? usersData.value : null;

      setStats({
        userCount: usersResult?.total || 0,
        recommendationCount: recommendationsResult?.total || 0,
        avgScore: statsResult?.averageScore || 0,
        highScoreCount: statsResult?.highScoreCount || 0,
      });

      setRecentRecommendations(recommendationsResult?.data || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const recommendationColumns = [
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
      render: (value: number) => `${(value * 100).toFixed(1)}%`,
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
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        欢迎回来，{user?.username}！
      </Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="用户总数"
              value={stats.userCount || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="推荐记录"
              value={stats.recommendationCount || 0}
              prefix={<ExperimentOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均评分"
              value={stats.avgScore || 0}
              precision={2}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="高分客户"
              value={stats.highScoreCount || 0}
              prefix={<DashboardOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近推荐" style={{ marginTop: 24 }}>
        {recentRecommendations.length > 0 ? (
          <Table
            columns={recommendationColumns}
            dataSource={recentRecommendations}
            rowKey="id"
            pagination={false}
            scroll={{ x: 800 }}
          />
        ) : (
          <Alert
            message="暂无推荐数据"
            description="请先为客户生成推荐标签"
            type="info"
            showIcon
          />
        )}
      </Card>
    </div>
  );
}
