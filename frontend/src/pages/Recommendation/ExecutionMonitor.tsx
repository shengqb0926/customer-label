import React, { useState, useEffect } from 'react';
import {
  Card,
  Progress,
  Timeline,
  Typography,
  Space,
  Tag,
  Button,
  Statistic,
  Row,
  Col,
  Descriptions,
  Alert,
  Badge,
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface ExecutionTask {
  id: number;
  configId: number;
  configName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: string;
  endTime?: string;
  result?: {
    clusterCount: number;
    sampleCount: number;
    silhouetteScore?: number;
    inertia?: number;
  };
  error?: string;
}

interface ExecutionMonitorProps {
  configId?: number;
}

// 模拟任务数据
const MOCK_TASKS: ExecutionTask[] = [
  {
    id: 1,
    configId: 1,
    configName: '客户细分基础配置',
    status: 'completed',
    progress: 100,
    startTime: '2026-03-30 19:00:00',
    endTime: '2026-03-30 19:05:23',
    result: {
      clusterCount: 5,
      sampleCount: 1250,
      silhouetteScore: 0.72,
      inertia: 1234.56,
    },
  },
  {
    id: 2,
    configId: 2,
    configName: '精细化分群配置',
    status: 'running',
    progress: 67,
    startTime: '2026-03-30 19:30:00',
  },
  {
    id: 3,
    configId: 3,
    configName: 'DBSCAN 密度聚类',
    status: 'failed',
    progress: 45,
    startTime: '2026-03-30 18:00:00',
    endTime: '2026-03-30 18:02:15',
    error: '内存不足：无法分配 2GB 空间',
  },
];

const ExecutionMonitor: React.FC<ExecutionMonitorProps> = ({ configId }) => {
  const [tasks, setTasks] = useState<ExecutionTask[]>(MOCK_TASKS);
  const [selectedTask, setSelectedTask] = useState<ExecutionTask | null>(null);

  // 获取任务状态统计
  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const running = tasks.filter(t => t.status === 'running').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const pending = tasks.filter(t => t.status === 'pending').length;

    return { total, completed, running, failed, pending };
  };

  const stats = getTaskStats();

  // 渲染任务状态标签
  const renderStatusTag = (status: string) => {
    const statusMap = {
      pending: { color: 'default', icon: <ClockCircleOutlined />, text: '等待中' },
      running: { color: 'processing', icon: <SyncOutlined spin />, text: '执行中' },
      completed: { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' },
      failed: { color: 'error', icon: <CloseCircleOutlined />, text: '失败' },
    };
    const config = statusMap[status as keyof typeof statusMap];
    return <Tag icon={config.icon} color={config.color}>{config.text}</Tag>;
  };

  // 渲染进度条
  const renderProgress = (progress: number, status: string) => {
    let strokeColor = '#1890ff';
    if (status === 'completed') strokeColor = '#52c41a';
    if (status === 'failed') strokeColor = '#ff4d4f';

    return (
      <Progress
        percent={progress}
        strokeColor={strokeColor}
        status={status === 'running' ? 'active' : status === 'failed' ? 'exception' : undefined}
        size="small"
      />
    );
  };

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 统计卡片 */}
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总任务数"
                value={stats.total}
                prefix={<ThunderboltOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="成功"
                value={stats.completed}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="执行中"
                value={stats.running}
                valueStyle={{ color: '#1890ff' }}
                prefix={<SyncOutlined spin />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="失败"
                value={stats.failed}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 任务列表 */}
        <Card title="📋 执行任务列表" size="small">
          <Timeline
            items={tasks.map(task => ({
              key: task.id,
              color: task.status === 'completed' ? 'green' :
                     task.status === 'running' ? 'blue' :
                     task.status === 'failed' ? 'red' : 'gray',
              children: (
                <Card
                  size="small"
                  hoverable
                  onClick={() => setSelectedTask(task)}
                  style={{
                    border: selectedTask?.id === task.id ? '2px solid #1890ff' : undefined,
                    cursor: 'pointer',
                  }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Space>
                        <Text strong>{task.configName}</Text>
                        {renderStatusTag(task.status)}
                      </Space>
                      <Text type="secondary">ID: {task.id}</Text>
                    </div>

                    <div>
                      <Text type="secondary">进度:</Text>
                      {renderProgress(task.progress, task.status)}
                    </div>

                    <Space split={<span>|</span>} size={16}>
                      <span>开始：{task.startTime || '-'}</span>
                      <span>结束：{task.endTime || '-'}</span>
                    </Space>

                    {task.result && (
                      <Alert
                        message="执行结果"
                        description={
                          <Space size={16}>
                            <span>簇数：{task.result.clusterCount}</span>
                            <span>样本：{task.result.sampleCount}</span>
                            {task.result.silhouetteScore && (
                              <span>轮廓系数：{task.result.silhouetteScore.toFixed(2)}</span>
                            )}
                          </Space>
                        }
                        type="success"
                        showIcon
                        style={{ marginTop: 8 }}
                      />
                    )}

                    {task.error && (
                      <Alert
                        message="错误信息"
                        description={task.error}
                        type="error"
                        showIcon
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </Space>
                </Card>
              ),
            }))}
          />
        </Card>

        {/* 任务详情 */}
        {selectedTask && (
          <Modal
            title={`任务详情 - ${selectedTask.configName}`}
            open={!!selectedTask}
            onCancel={() => setSelectedTask(null)}
            footer={null}
            width={700}
          >
            <Descriptions column={2} bordered>
              <Descriptions.Item label="任务 ID">{selectedTask.id}</Descriptions.Item>
              <Descriptions.Item label="配置 ID">{selectedTask.configId}</Descriptions.Item>
              <Descriptions.Item label="配置名称" span={2}>
                {selectedTask.configName}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {renderStatusTag(selectedTask.status)}
              </Descriptions.Item>
              <Descriptions.Item label="进度">
                <Progress
                  percent={selectedTask.progress}
                  status={selectedTask.status === 'running' ? 'active' : 
                          selectedTask.status === 'failed' ? 'exception' : undefined}
                />
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">{selectedTask.startTime || '-'}</Descriptions.Item>
              <Descriptions.Item label="结束时间">{selectedTask.endTime || '-'}</Descriptions.Item>
              
              {selectedTask.result && (
                <>
                  <Descriptions.Item label="簇数量" span={2}>
                    <Badge count={selectedTask.result.clusterCount} style={{ backgroundColor: '#52c41a' }} />
                  </Descriptions.Item>
                  <Descriptions.Item label="样本数量">{selectedTask.result.sampleCount}</Descriptions.Item>
                  <Descriptions.Item label="轮廓系数">
                    <Text strong>{selectedTask.result.silhouetteScore?.toFixed(2)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="惯性">{selectedTask.result.inertia?.toFixed(2)}</Descriptions.Item>
                </>
              )}

              {selectedTask.error && (
                <Descriptions.Item label="错误信息" span={2}>
                  <Alert message={selectedTask.error} type="error" showIcon />
                </Descriptions.Item>
              )}
            </Descriptions>
          </Modal>
        )}
      </Space>
    </Card>
  );
};

export default ExecutionMonitor;
