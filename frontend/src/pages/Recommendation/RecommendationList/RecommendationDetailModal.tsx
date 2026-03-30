import React from 'react';
import { Modal, Descriptions, Tag, Progress, Alert, Timeline, Typography, Divider, Table, Space, Badge, Tabs, Spin, Empty } from 'antd';
import type { Recommendation } from '@/services/rule';
import { recommendationService } from '@/services/rule';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface RecommendationDetailModalProps {
  visible: boolean;
  recommendation: Recommendation | null;
  onCancel: () => void;
}

interface SimilarCustomer {
  customerId: number;
  customerName: string;
  recommendationId: number;
  tagName: string;
  confidence: number;
  isAccepted: boolean | null;
  similarity: number;
}

interface HistoryRecommendation {
  id: number;
  tagName: string;
  tagCategory?: string;
  confidence: number;
  source: string;
  reason?: string;
  isAccepted: boolean | null;
  createdAt: string;
  acceptedAt?: string | null;
}

// Mock 数据 - 相似客户推荐（实际应从 API 获取）
const getSimilarCustomers = (recommendation: Recommendation) => {
  return [
    {
      id: recommendation.customerId + 1,
      customerName: `相似客户 A`,
      tagName: recommendation.tagName,
      confidence: recommendation.confidence - 0.05,
      status: 'accepted',
    },
    {
      id: recommendation.customerId + 2,
      customerName: `相似客户 B`,
      tagName: recommendation.tagName,
      confidence: recommendation.confidence - 0.1,
      status: 'pending',
    },
    {
      id: recommendation.customerId + 3,
      customerName: `相似客户 C`,
      tagName: recommendation.tagName,
      confidence: recommendation.confidence - 0.15,
      status: 'rejected',
    },
  ];
};

// Mock 数据 - 历史推荐记录
const getHistoryRecommendations = (recommendation: Recommendation) => {
  return [
    {
      id: recommendation.id - 1,
      tagName: '历史标签 1',
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      status: 'accepted',
      reason: '历史推荐原因 1',
    },
    {
      id: recommendation.id - 2,
      tagName: '历史标签 2',
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      status: 'rejected',
      reason: '历史推荐原因 2',
    },
  ];
};

const RecommendationDetailModal: React.FC<RecommendationDetailModalProps> = ({
  visible,
  recommendation,
  onCancel,
}) => {
  if (!recommendation) return null;

  const sourceMap = {
    rule: '规则引擎',
    clustering: '聚类分析',
    association: '关联分析',
  };

  // 相似客户表格列
  const similarColumns = [
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '推荐标签',
      dataIndex: 'tagName',
      key: 'tagName',
      render: (text: string) => <Tag color="cyan">{text}</Tag>,
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (confidence: number) => (
        <Progress
          percent={Number((confidence * 100).toFixed(1))}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
          status="active"
          width={100}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'isAccepted',
      key: 'isAccepted',
      render: (isAccepted: boolean | null) => {
        const statusMap: Record<string, string> = {
          true: '✅ 已接受',
          false: '❌ 已拒绝',
          null: '⏰ 待处理',
        };
        const statusKey = isAccepted === null ? 'null' : String(isAccepted);
        return <Badge status={isAccepted === null ? 'processing' : isAccepted ? 'success' : 'error'} text={statusMap[statusKey]} />;
      },
    },
    {
      title: '相似度',
      dataIndex: 'similarity',
      key: 'similarity',
      render: (similarity: number) => (
        <Progress
          percent={Number((similarity * 100).toFixed(1))}
          strokeColor={{
            '0%': '#ff4d4f',
            '100%': '#52c41a',
          }}
          width={80}
          format={(percent) => `${percent}%`}
        />
      ),
    },
  ];

  // 历史记录表格列
  const historyColumns = [
    {
      title: '推荐标签',
      dataIndex: 'tagName',
      key: 'tagName',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '标签类型',
      dataIndex: 'tagCategory',
      key: 'tagCategory',
      render: (text?: string) => text ? <Tag color="default">{text}</Tag> : '-',
    },
    {
      title: '推荐时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '状态',
      dataIndex: 'isAccepted',
      key: 'isAccepted',
      render: (isAccepted: boolean | null) => {
        const statusMap: Record<string, string> = {
          true: '✅ 已接受',
          false: '❌ 已拒绝',
          null: '⏰ 待处理',
        };
        const statusKey = isAccepted === null ? 'null' : String(isAccepted);
        return <Tag color={isAccepted === null ? 'orange' : isAccepted ? 'green' : 'red'}>{statusMap[statusKey]}</Tag>;
      },
    },
    {
      title: '推荐理由',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      width: 200,
    },
  ];

  return (
    <Modal
      title={
        <div>
          <Text strong>推荐标签：</Text>
          <Tag color="blue">{recommendation.tagName}</Tag>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={1000}
      footer={null}
    >
      <Tabs defaultActiveKey="basic">
        {/* 基本信息标签页 */}
        <TabPane tab="📋 基本信息" key="basic">
          {/* 基本信息 */}
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="客户名称">
              {recommendation.customerName || `客户 #${recommendation.customerId}`}
            </Descriptions.Item>
            <Descriptions.Item label="客户 ID">
              {recommendation.customerId}
            </Descriptions.Item>
            <Descriptions.Item label="标签类型">
              {recommendation.tagCategory || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="推荐来源">
              <Tag color="blue">{sourceMap[recommendation.source]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={recommendation.isAccepted ? 'green' : 'orange'}>
                {recommendation.isAccepted ? '✅ 已接受' : '⏰ 待处理'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="推荐时间">
              {new Date(recommendation.createdAt).toLocaleString()}
            </Descriptions.Item>
            {recommendation.acceptedAt && (
              <Descriptions.Item label="接受时间">
                {new Date(recommendation.acceptedAt).toLocaleString()}
              </Descriptions.Item>
            )}
            {recommendation.acceptedBy && (
              <Descriptions.Item label="操作人 ID">
                {recommendation.acceptedBy}
              </Descriptions.Item>
            )}
          </Descriptions>

          <Divider />

          {/* 推荐依据 */}
          <Alert
            message="🎯 推荐依据"
            description={
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <Text strong>置信度:</Text>
                  <Progress
                    percent={Number((recommendation.confidence * 100).toFixed(1))}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    status="active"
                    width={300}
                    format={(percent) => (
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{percent}%</span>
                    )}
                  />
                </div>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    💡 推荐理由:
                  </Text>
                  <Text type="secondary" style={{ display: 'block', lineHeight: 1.8 }}>
                    {recommendation.reason}
                  </Text>
                </div>
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />

          {/* 操作历史 */}
          {(recommendation.acceptedAt || recommendation.acceptedBy) && (
            <>
              <Divider />
              <Title level={5}>📝 操作历史</Title>
              <Timeline
                mode="left"
                items={[
                  {
                    color: 'green',
                    children: (
                      <div>
                        <Text strong>接受推荐</Text>
                        <br />
                        <Text type="secondary">
                          {recommendation.acceptedAt 
                            ? new Date(recommendation.acceptedAt).toLocaleString() 
                            : '未知时间'}
                        </Text>
                        {recommendation.acceptedBy && (
                          <>
                            <br />
                            <Text type="secondary">操作人：{recommendation.acceptedBy}</Text>
                          </>
                        )}
                      </div>
                    ),
                  },
                  {
                    color: 'blue',
                    children: (
                      <div>
                        <Text strong>生成推荐</Text>
                        <br />
                        <Text type="secondary">
                          {new Date(recommendation.createdAt).toLocaleString()}
                        </Text>
                      </div>
                    ),
                  },
                ]}
              />
            </>
          )}
        </TabPane>

        {/* 相似客户对比标签页 */}
        <TabPane tab="👥 相似客户对比" key="similar">
          <Alert
            message="💡 智能推荐"
            description="以下是与当前客户特征相似的其他客户及其推荐情况，供参考对比。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Spin spinning={similarLoading}>
            {similarData.length > 0 ? (
              <Table
                rowKey="recommendationId"
                columns={similarColumns as any}
                dataSource={similarData}
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
              />
            ) : (
              <Empty description="暂无相似客户推荐" />
            )}
          </Spin>
        </TabPane>

        {/* 历史记录标签页 */}
        <TabPane tab="📜 历史推荐记录" key="history">
          <Alert
            message="📊 历史追溯"
            description="该客户的历史推荐记录，帮助了解推荐趋势和变化。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Spin spinning={historyLoading}>
            {historyData.length > 0 ? (
              <Table
                rowKey="id"
                columns={historyColumns as any}
                dataSource={historyData}
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
              />
            ) : (
              <Empty description="暂无历史推荐记录" />
            )}
          </Spin>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default RecommendationDetailModal;
