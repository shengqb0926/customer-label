import React, { useState, useEffect } from 'react';
import {
  Card,
  Timeline,
  Typography,
  Tag,
  Button,
  Space,
  Modal,
  Descriptions,
  message,
  Empty,
} from 'antd';
import {
  HistoryOutlined,
  RollbackOutlined,
  EyeOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { Rule } from '@/services/rule';
import { ruleService } from '@/services/rule';

const { Title, Text, Paragraph } = Typography;

interface VersionHistoryItem {
  id: number;
  version: string;
  createdAt: string;
  createdBy?: string;
  changeDescription?: string;
  snapshot: Partial<Rule>;
}

const VersionHistory: React.FC<{ ruleId?: number }> = ({ ruleId }) => {
  const [versions, setVersions] = useState<VersionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionHistoryItem | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparingVersions, setComparingVersions] = useState<number[]>([]);

  // 加载版本历史
  useEffect(() => {
    if (ruleId) {
      loadVersions(ruleId);
    }
  }, [ruleId]);

  const loadVersions = async (id: number) => {
    try {
      setLoading(true);
      // TODO: 调用实际 API
      // const data = await ruleService.getVersionHistory(id);
      
      // 模拟数据
      const mockData: VersionHistoryItem[] = [
        {
          id: 1,
          version: 'v1.0.0',
          createdAt: '2026-03-28 10:00:00',
          createdBy: 'admin',
          changeDescription: '初始版本创建',
          snapshot: {
            name: '高净值客户识别规则',
            priority: 5,
            enabled: true,
          },
        },
        {
          id: 2,
          version: 'v1.1.0',
          createdAt: '2026-03-29 14:30:00',
          createdBy: 'admin',
          changeDescription: '调整资产阈值从 500 万提升到 800 万',
          snapshot: {
            name: '高净值客户识别规则',
            priority: 6,
            enabled: true,
          },
        },
        {
          id: 3,
          version: 'v1.2.0',
          createdAt: '2026-03-30 09:15:00',
          createdBy: 'admin',
          changeDescription: '增加 RFM 得分条件，优化匹配精度',
          snapshot: {
            name: '高净值客户识别规则',
            priority: 7,
            enabled: true,
          },
        },
      ];
      
      setVersions(mockData);
    } catch (error: any) {
      message.error(error.message || '加载版本历史失败');
    } finally {
      setLoading(false);
    }
  };

  // 回滚到指定版本
  const handleRollback = async (versionId: number) => {
    Modal.confirm({
      title: '确认回滚',
      content: '确定要回滚到这个版本吗？当前版本将被覆盖。',
      okText: '确认回滚',
      cancelText: '取消',
      onOk: async () => {
        try {
          // TODO: 调用实际 API
          // await ruleService.rollback(versionId);
          message.success('回滚成功');
          loadVersions(ruleId!);
        } catch (error: any) {
          message.error(error.message || '回滚失败');
        }
      },
    });
  };

  // 删除版本
  const handleDeleteVersion = async (versionId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个版本吗？此操作不可恢复。',
      okText: '删除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          // TODO: 调用实际 API
          // await ruleService.deleteVersion(versionId);
          message.success('删除成功');
          loadVersions(ruleId!);
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      },
    });
  };

  // 版本对比
  const handleCompare = () => {
    if (comparingVersions.length !== 2) {
      message.warning('请选择两个版本进行对比');
      return;
    }

    const version1 = versions.find(v => v.id === comparingVersions[0]);
    const version2 = versions.find(v => v.id === comparingVersions[1]);

    if (version1 && version2) {
      setSelectedVersion(version1);
      // 打开对比弹窗
      Modal.info({
        title: '版本对比',
        width: 800,
        content: (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="版本">{version1.version}</Descriptions.Item>
            <Descriptions.Item label="版本">{version2.version}</Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {version1.createdAt} → {version2.createdAt}
            </Descriptions.Item>
            <Descriptions.Item label="变更描述" span={2}>
              {version1.changeDescription || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="优先级" span={2}>
              {version1.snapshot.priority} → {version2.snapshot.priority}
            </Descriptions.Item>
          </Descriptions>
        ),
      });
    }
  };

  const toggleCompareSelection = (versionId: number) => {
    if (comparingVersions.includes(versionId)) {
      setComparingVersions(comparingVersions.filter(id => id !== versionId));
    } else {
      if (comparingVersions.length >= 2) {
        message.warning('最多选择两个版本进行对比');
        return;
      }
      setComparingVersions([...comparingVersions, versionId]);
    }
  };

  if (!ruleId) {
    return (
      <Empty
        description={
          <Space direction="vertical">
            <Text>请先在规则列表中选择一个规则</Text>
            <Button type="primary" onClick={() => setCompareMode(false)}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={4}>📜 版本历史</Title>
              <Text type="secondary">
                追踪规则的每次变更，支持回滚和版本对比
              </Text>
            </div>

            <Space>
              {compareMode ? (
                <>
                  <Button
                    type="primary"
                    onClick={handleCompare}
                    disabled={comparingVersions.length !== 2}
                  >
                    开始对比
                  </Button>
                  <Button onClick={() => setCompareMode(false)}>取消对比</Button>
                </>
              ) : (
                <Button onClick={() => setCompareMode(true)}>版本对比</Button>
              )}
            </Space>
          </div>

          {versions.length === 0 ? (
            <Empty description="暂无版本历史" />
          ) : (
            <Timeline
              mode="left"
              items={versions.map((version) => ({
                key: version.id,
                color: version.id === versions[0].id ? 'green' : 'blue',
                children: (
                  <Card
                    size="small"
                    hoverable
                    style={{
                      border: compareMode && comparingVersions.includes(version.id)
                        ? '2px solid #1890ff'
                        : undefined,
                    }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Space>
                          <Tag color={version.id === versions[0].id ? 'green' : 'blue'}>
                            {version.version}
                          </Tag>
                          <Text strong>{version.snapshot.name}</Text>
                        </Space>

                        {compareMode && (
                          <input
                            type="checkbox"
                            checked={comparingVersions.includes(version.id)}
                            onChange={() => toggleCompareSelection(version.id)}
                          />
                        )}
                      </div>

                      <Paragraph type="secondary" style={{ margin: 0 }}>
                        <HistoryOutlined /> {version.createdAt} by {version.createdBy || '未知'}
                      </Paragraph>

                      {version.changeDescription && (
                        <Paragraph style={{ margin: 0 }}>
                          <Text type="secondary">变更说明:</Text> {version.changeDescription}
                        </Paragraph>
                      )}

                      <Space style={{ marginTop: 8 }}>
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => setSelectedVersion(version)}
                        >
                          查看详情
                        </Button>
                        <Button
                          size="small"
                          icon={<RollbackOutlined />}
                          onClick={() => handleRollback(version.id)}
                          disabled={version.id === versions[0].id}
                        >
                          回滚到此版本
                        </Button>
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => {
                            // TODO: 复制为新规则
                            message.info('复制功能开发中...');
                          }}
                        >
                          复制为新规则
                        </Button>
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteVersion(version.id)}
                          disabled={version.id === versions[0].id}
                        >
                          删除版本
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                ),
              }))}
            />
          )}
        </Space>
      </Card>

      {/* 版本详情弹窗 */}
      {selectedVersion && (
        <Modal
          title={`版本详情 - ${selectedVersion.version}`}
          open={!!selectedVersion}
          onCancel={() => setSelectedVersion(null)}
          footer={null}
          width={700}
        >
          <Descriptions column={1} bordered>
            <Descriptions.Item label="版本号">{selectedVersion.version}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{selectedVersion.createdAt}</Descriptions.Item>
            <Descriptions.Item label="创建人">{selectedVersion.createdBy}</Descriptions.Item>
            <Descriptions.Item label="变更描述" span={3}>
              {selectedVersion.changeDescription || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="规则名称">
              {selectedVersion.snapshot.name}
            </Descriptions.Item>
            <Descriptions.Item label="优先级">
              {selectedVersion.snapshot.priority}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {selectedVersion.snapshot.enabled ? (
                <Tag color="success">启用</Tag>
              ) : (
                <Tag color="default">停用</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="标签颜色">
              {selectedVersion.snapshot.tagColor}
            </Descriptions.Item>
          </Descriptions>
        </Modal>
      )}
    </div>
  );
};

export default VersionHistory;
