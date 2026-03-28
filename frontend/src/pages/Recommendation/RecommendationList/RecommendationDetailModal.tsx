import React from 'react';
import { Modal, Descriptions, Tag, Progress, Alert, Timeline, Typography, Divider } from 'antd';
import type { Recommendation } from '@/services/rule';

const { Title, Text } = Typography;

interface RecommendationDetailModalProps {
  visible: boolean;
  recommendation: Recommendation | null;
  onCancel: () => void;
}

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
      width={800}
      footer={null}
    >
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
            {recommendation.isAccepted ? '已接受' : '待处理'}
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
      </Descriptions>

      <Divider />

      {/* 推荐依据 */}
      <Alert
        message="推荐依据"
        description={
          <div style={{ marginBottom: 16 }}>
            <Text strong>置信度:</Text>
            <Progress
              percent={Number((recommendation.confidence * 100).toFixed(1))}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              status="active"
              style={{ width: 300, marginLeft: 16 }}
            />
            <br />
            <Text strong style={{ marginTop: 8, display: 'block' }}>
              推荐理由:
            </Text>
            <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
              {recommendation.reason}
            </Text>
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
          <Title level={5}>操作历史</Title>
          <Timeline
            items={[
              {
                color: 'green',
                children: (
                  <div>
                    <Text>推荐生成</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(recommendation.createdAt).toLocaleString()}
                    </Text>
                  </div>
                ),
              },
              ...(recommendation.acceptedAt ? [{
                color: 'blue',
                children: (
                  <div>
                    <Text>接受推荐</Text>
                    {recommendation.acceptedBy && (
                      <>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          操作人：用户 #{recommendation.acceptedBy}
                        </Text>
                      </>
                    )}
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(recommendation.acceptedAt).toLocaleString()}
                    </Text>
                  </div>
                ),
              }] : []),
            ]}
          />
        </>
      )}
    </Modal>
  );
};

export default RecommendationDetailModal;
