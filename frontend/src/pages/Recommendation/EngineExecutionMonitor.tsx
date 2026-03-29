import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  DatePicker,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  ClusterOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { recommendationService } from '@/services/rule';
import type { Recommendation } from '@/services/rule';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface EngineExecution {
  id: number;
  customerId: number;
  customerName?: string;
  engineType: 'rule' | 'clustering' | 'association';
  executionTime: Date;
  executionDuration?: number; // 毫秒
  status: 'success' | 'failed' | 'pending';
  generatedCount: number;
  errorMessage?: string;
}

const EngineExecutionMonitor: React.FC = () => {
  const [executions, setExecutions] = useState<EngineExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [engineFilter, setEngineFilter] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  // 加载推荐列表（作为执行记录）
  const loadExecutions = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: 1,
        limit: 100,
        source: engineFilter,
        customerName: customerSearch || undefined,
      };

      if (dateRange && dateRange.length === 2) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await recommendationService.getRecommendations(params);
      const dataList = response.data.data;

      // 将推荐数据转换为执行记录格式
      const transformedData: EngineExecution[] = dataList.map((rec: Recommendation) => ({
        id: rec.id,
        customerId: rec.customerId,
        customerName: rec.customerName,
        engineType: rec.source as any,
        executionTime: new Date(rec.createdAt),
        status: rec.isAccepted ? 'success' : 'pending',
        generatedCount: 1,
      }));

      setExecutions(transformedData);
    } catch (error: any) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutions();
  }, []);

  // 处理筛选
  const handleFilter = () => {
    loadExecutions();
  };

  // 重置筛选
  const handleReset = () => {
    setEngineFilter(undefined);
    setStatusFilter(undefined);
    setDateRange(null);
    setCustomerSearch('');
    setTimeout(loadExecutions, 100);
  };

  const columns: ColumnsType<EngineExecution> = [
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 150,
      render: (name?: string) => name || `客户${name}`,
    },
    {
      title: '引擎类型',
      dataIndex: 'engineType',
      key: 'engineType',
      width: 120,
      render: (type: string) => {
        const iconMap = {
          rule: <ThunderboltOutlined />,
          clustering: <ClusterOutlined />,
          association: <LinkOutlined />,
        };
        const colorMap = {
          rule: 'orange',
          clustering: 'blue',
          association: 'green',
        };
        return (
          <Tag icon={iconMap[type as keyof typeof iconMap]} color={colorMap[type as keyof typeof colorMap]}>
            {type === 'rule' ? '规则引擎' : type === 'clustering' ? '聚合引擎' : '关联引擎'}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag icon={status === 'success' ? <CheckCircleOutlined /> : <ReloadOutlined />} color={status === 'success' ? 'success' : 'processing'}>
          {status === 'success' ? '成功' : '待处理'}
        </Tag>
      ),
    },
    {
      title: '生成推荐数',
      dataIndex: 'generatedCount',
      key: 'generatedCount',
      width: 120,
      align: 'right',
      render: (count: number) => `${count}条`,
    },
    {
      title: '执行时间',
      dataIndex: 'executionTime',
      key: 'executionTime',
      width: 180,
      sorter: (a, b) => new Date(a.executionTime).getTime() - new Date(b.executionTime).getTime(),
      render: (time: Date) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  // 统计数据
  const stats = {
    total: executions.length,
    rule: executions.filter(e => e.engineType === 'rule').length,
    clustering: executions.filter(e => e.engineType === 'clustering').length,
    association: executions.filter(e => e.engineType === 'association').length,
    success: executions.filter(e => e.status === 'success').length,
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总执行次数"
              value={stats.total}
              suffix="次"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="规则引擎"
              value={stats.rule}
              suffix="次"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="聚合引擎"
              value={stats.clustering}
              suffix="次"
              prefix={<ClusterOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="关联引擎"
              value={stats.association}
              suffix="次"
              prefix={<LinkOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="成功次数"
              value={stats.success}
              suffix="次"
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress
              percent={stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}
              strokeColor="#52c41a"
              trailColor="#f5f5f5"
              format={(percent) => `${percent}% 成功率`}
              size="small"
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索客户名称"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            onSearch={handleFilter}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="引擎类型"
            value={engineFilter}
            onChange={setEngineFilter}
            allowClear
            style={{ width: 150 }}
          >
            <Option value="rule">规则引擎</Option>
            <Option value="clustering">聚合引擎</Option>
            <Option value="association">关联引擎</Option>
          </Select>
          <Select
            placeholder="状态"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            style={{ width: 120 }}
          >
            <Option value="success">成功</Option>
            <Option value="failed">失败</Option>
            <Option value="pending">待处理</Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as any)}
            style={{ width: 250 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleFilter}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      {/* 执行记录表格 */}
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={executions}
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>
    </div>
  );
};

export default EngineExecutionMonitor;
