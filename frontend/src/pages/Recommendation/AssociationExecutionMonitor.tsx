import React, { useState } from 'react';
import {
  Card,
  Progress,
  Timeline,
  Typography,
  Space,
  Tag,
  Statistic,
  Row,
  Col,
  Alert,
  Badge,
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  LinkOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface AssociationTask {
  id: number;
  configId: number;
  configName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: string;
  endTime?: string;
  result?: {
    ruleCount: number;
    frequentItemCount: number;
    avgSupport: number;
    avgConfidence: number;
    avgLift: number;
    topRules?: Array<{
      antecedent: string[];
      consequent: string[];
      support: number;
      confidence: number;
      lift: number;
    }>;
  };
  error?: string;
}

interface AssociationExecutionMonitorProps {
  configId?: number;
}

// 模拟任务数据
const MOCK_TASKS: AssociationTask[] = [
  {
    id: 1,
    configId: 1,
    configName: '购物篮分析配置',
    status: 'completed',
    progress: 100,
    startTime: '2026-03-30 19:00:00',
    endTime: '2026-03-30 19:08:45',
    result: {
      ruleCount: 156,
      frequentItemCount: 45,
      avgSupport: 0.15,
      avgConfidence: 0.72,
      avgLift: 2.3,
      topRules: [
        {
          antecedent: ['手机'],
          consequent: ['保护壳'],
          support: 0.25,
          confidence: 0.85,
          lift: 3.2,
        },
        {
          antecedent: ['笔记本电脑', '鼠标'],
          consequent: ['鼠标垫'],
          support: 0.18,
          confidence: 0.78,
          lift: 2.8,
        },
      ],
    },
  },
  {
    id: 2,
    configId: 2,
    configName: '服装搭配推荐配置',
    status: 'running',
    progress: 45,
    startTime: '2026-03-30 19:30:00',
  },
  {
    id: 3,
    configId: 3,
    configName: '图书关联推荐配置',
    status: 'failed',
    progress: 30,
    startTime: '2026-03-30 18:00:00',
    endTime: '2026-03-30 18:03:20',
    error: '支持度过低：无法找到满足条件的频繁项集',
  },
];

const AssociationExecutionMonitor: React.FC<AssociationExecutionMonitorProps> = ({ configId }) => {
  const [tasks] = useState<AssociationTask[]>(MOCK_TASKS);

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
                styles={{ content: { color: '#52c41a' } }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="执行中"
                value={stats.running}
                styles={{ content: { color: '#1890ff' } }}
                prefix={<SyncOutlined spin />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="失败"
                value={stats.failed}
                styles={{ content: { color: '#ff4d4f' } }}
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
                <Card size="small" hoverable>
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
                          <Space direction="vertical" style={{ width: '100%' }} size="small">
                            <Row gutter={8}>
                              <Col span={6}>
                                <Statistic
                                  title="规则数量"
                                  value={task.result.ruleCount}
                                  suffix="条"
                                  styles={{ content: { fontSize: 16 } }}
                                />
                              </Col>
                              <Col span={6}>
                                <Statistic
                                  title="频繁项集"
                                  value={task.result.frequentItemCount}
                                  suffix="个"
                                  styles={{ content: { fontSize: 16 } }}
                                />
                              </Col>
                              <Col span={6}>
                                <Statistic
                                  title="平均支持度"
                                  value={task.result.avgSupport}
                                  precision={2}
                                  styles={{ content: { fontSize: 16 } }}
                                />
                              </Col>
                              <Col span={6}>
                                <Statistic
                                  title="平均置信度"
                                  value={task.result.avgConfidence}
                                  precision={2}
                                  styles={{ content: { fontSize: 16 } }}
                                />
                              </Col>
                            </Row>
                            <Row gutter={8}>
                              <Col span={8}>
                                <Text type="secondary">平均提升度：</Text>
                                <Badge count={task.result.avgLift.toFixed(2)} style={{ backgroundColor: '#722ed1' }} />
                              </Col>
                            </Row>
                            
                            {task.result.topRules && task.result.topRules.length > 0 && (
                              <Alert
                                message="TOP 规则示例"
                                description={
                                  <ul>
                                    {task.result.topRules.slice(0, 3).map((rule, idx) => (
                                      <li key={idx}>
                                        <Text strong>
                                          {rule.antecedent.join(' + ')} → {rule.consequent.join(' + ')}
                                        </Text>
                                        <br />
                                        <Text type="secondary">
                                          支持度：{rule.support.toFixed(2)}, 置信度：{rule.confidence.toFixed(2)}, 
                                          提升度：{rule.lift.toFixed(2)}
                                        </Text>
                                      </li>
                                    ))}
                                  </ul>
                                }
                                type="success"
                                showIcon
                                style={{ marginTop: 8 }}
                              />
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
      </Space>
    </Card>
  );
};

export default AssociationExecutionMonitor;
