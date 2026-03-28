import React, { useEffect, useState } from 'react';
import { Table, Button, Input, Select, Space, Tag, Popconfirm, message, Typography, DatePicker, Row, Col, Statistic, Card, Progress, Modal, Form } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useRuleStore } from '@/stores/ruleStore';
import type { Recommendation } from '@/services/rule';
import dayjs from 'dayjs';
import RecommendationDetailModal from './RecommendationDetailModal';
import * as XLSX from 'xlsx';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface FilterState {
  customerName?: string;
  category?: string;  // 改为 category，与后端 DTO 一致
  dateRange?: any[];
  status?: string;
  source?: string;
  minConfidence?: number;
}

const RecommendationList: React.FC = () => {
  const {
    recommendations,
    recommendationLoading,
    recommendationPagination,
    fetchRecommendations,
    acceptRecommendation,
    rejectRecommendation,
    batchAcceptRecommendations,
    batchRejectRecommendations,
  } = useRuleStore();

  const [detailVisible, setDetailVisible] = React.useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = React.useState<Recommendation | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([]);

  // 加载推荐列表
  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = (params?: any) => {
    fetchRecommendations({
      page: recommendationPagination.current,
      limit: recommendationPagination.pageSize,
      ...params,
    });
  };

  // 处理搜索（只更新状态，不查询）
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, customerName: value }));
  };

  // 处理标签类型筛选（只更新状态，不查询）
  const handleCategoryChange = (value: string) => {
    setFilters(prev => ({ ...prev, category: value }));
  };

  // 处理来源筛选（只更新状态，不查询）
  const handleSourceChange = (value: string) => {
    setFilters(prev => ({ ...prev, source: value }));
  };

  // 处理状态筛选（只更新状态，不查询）
  const handleStatusChange = (value: string) => {
    setFilters(prev => ({ ...prev, status: value }));
  };

  // 处理日期范围变化（只更新状态，不查询）
  const handleDateRangeChange = (dates: any) => {
    setFilters(prev => ({ ...prev, dateRange: dates }));
  };

  // 处理查询（点击查询按钮时触发）
  const handleQuery = () => {
    const values = form.getFieldsValue();
    const queryParams: any = {
      page: 1, // 重置到第一页
    };

    if (values.customerName) {
      queryParams.customerName = values.customerName;
    }
    if (values.category) {
      queryParams.category = values.category;
    }
    if (values.source) {
      queryParams.source = values.source;
    }
    if (values.status) {
      queryParams.status = values.status;
    }
    if (values.dateRange && values.dateRange.length === 2) {
      queryParams.startDate = values.dateRange[0].format('YYYY-MM-DD');
      queryParams.endDate = values.dateRange[1].format('YYYY-MM-DD');
    }

    setFilters(values);
    loadRecommendations(queryParams);
  };

  // 处理刷新
  const handleRefresh = () => {
    form.resetFields();
    setFilters({});
    loadRecommendations();
    message.success('刷新成功');
  };

  // 处理重置筛选
  const handleResetFilters = () => {
    form.resetFields();
    setFilters({});
    loadRecommendations({
      customerName: undefined,
      category: undefined,
      source: undefined,
      isAccepted: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  };

  // 处理接受
  const handleAccept = async (id: number) => {
    try {
      await acceptRecommendation(id);
      message.success('已接受推荐');
      loadRecommendations();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  // 处理拒绝
  const handleReject = async (id: number) => {
    let reasonValue = '';
    
    Modal.confirm({
      title: '拒绝推荐',
      content: (
        <div>
          <p>确定要拒绝这条推荐吗？</p>
          <div style={{ marginTop: '16px' }}>
            <p style={{ marginBottom: '8px', fontWeight: 500 }}>拒绝原因（必填）：</p>
            <Input.TextArea
              placeholder="请输入拒绝原因，例如：标签不准确、客户不符合条件等"
              rows={4}
              onChange={(e) => { reasonValue = e.target.value; }}
              autoFocus
            />
          </div>
        </div>
      ),
      okText: '确认拒绝',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!reasonValue || reasonValue.trim() === '') {
          message.error('请输入拒绝原因');
          return false;
        }
        
        try {
          await rejectRecommendation(id, reasonValue.trim());
          message.success('已拒绝推荐');
          loadRecommendations();
        } catch (error: any) {
          message.error(error.message || '操作失败');
        }
      },
    });
  };

  // 处理批量接受
  const handleBatchAccept = async (selectedRowKeys: React.Key[]) => {
    if (!selectedRowKeys.length) {
      message.warning('请选择要接受的推荐');
      return;
    }
    
    try {
      const result = await batchAcceptRecommendations(selectedRowKeys as number[]);
      const successCount = result?.success || selectedRowKeys.length;
      
      if (successCount === selectedRowKeys.length) {
        message.success(`已成功接受 ${successCount} 条推荐`);
      } else if (successCount > 0) {
        message.warning(`部分成功：成功接受 ${successCount} 条，失败 ${selectedRowKeys.length - successCount} 条`);
      } else {
        message.error('批量接受失败，请重试');
      }
      
      loadRecommendations();
    } catch (error: any) {
      message.error(error.message || '批量接受失败');
    }
  };

  // 处理批量拒绝
  const handleBatchReject = async (selectedRowKeys: React.Key[]) => {
    if (!selectedRowKeys.length) {
      message.warning('请选择要拒绝的推荐');
      return;
    }
    
    // 创建动态表单
    let reasonValue = '';
    
    Modal.confirm({
      title: '批量拒绝',
      content: (
        <div>
          <p>确定要拒绝选中的 {selectedRowKeys.length} 条推荐吗？</p>
          <div style={{ marginTop: '16px' }}>
            <p style={{ marginBottom: '8px', fontWeight: 500 }}>拒绝原因（必填）：</p>
            <Input.TextArea
              placeholder="请输入拒绝原因，例如：标签不准确、客户不符合条件等"
              rows={4}
              onChange={(e) => { reasonValue = e.target.value; }}
              autoFocus
            />
          </div>
        </div>
      ),
      okText: '确认拒绝',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        // 验证是否输入了原因
        if (!reasonValue || reasonValue.trim() === '') {
          message.error('请输入拒绝原因');
          return false; // 阻止关闭对话框
        }
        
        try {
          const result = await batchRejectRecommendations(selectedRowKeys as number[], reasonValue.trim());
          const successCount = result?.success || selectedRowKeys.length;
          
          if (successCount === selectedRowKeys.length) {
            message.success(`已成功拒绝 ${successCount} 条推荐`);
          } else if (successCount > 0) {
            message.warning(`部分成功：成功拒绝 ${successCount} 条，失败 ${selectedRowKeys.length - successCount} 条`);
          } else {
            message.error('批量拒绝失败，请重试');
          }
          
          loadRecommendations();
        } catch (error: any) {
          message.error(error.message || '批量拒绝失败');
        }
      },
    });
  };

  // 处理查看详情
  const handleViewDetail = (record: Recommendation) => {
    setSelectedRecommendation(record);
    setDetailVisible(true);
  };

  // 处理导出 Excel
  const handleExport = () => {
    try {
      const exportData = recommendations.map(rec => ({
        ID: rec.id,
        CustomerID: rec.customerId,
        CustomerName: rec.customerName || `客户#${rec.customerId}`,
        TagName: rec.tagName,
        TagCategory: rec.tagCategory || '-',
        Confidence: `${(rec.confidence * 100).toFixed(1)}%`,
        Source: getSourceText(rec.source),
        Reason: rec.reason,
        Status: rec.isAccepted ? '已接受' : '待处理',
        CreatedAt: dayjs(rec.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '推荐结果');

      const fileName = `推荐结果_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      message.success(`成功导出 ${recommendations.length} 条数据`);
    } catch (error: any) {
      message.error('导出失败：' + error.message);
    }
  };

  // 获取来源文本
  const getSourceText = (source: string) => {
    const sourceMap: Record<string, string> = {
      rule: '规则引擎',
      clustering: '聚类分析',
      association: '关联分析',
    };
    return sourceMap[source] || source;
  };

  // 表格列定义
  const columns: ColumnsType<Recommendation> = [
    {
      title: '客户',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (text, record) => (
        <a onClick={() => handleViewDetail(record)}>{text || `客户#${record.customerId}`}</a>
      ),
    },
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
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      sorter: (a, b) => a.confidence - b.confidence,
      render: (confidence: number) => (
        <Progress
          percent={Number((confidence * 100).toFixed(1))}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
          status="active"
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (source: 'rule' | 'clustering' | 'association') => {
        const sourceMap = {
          rule: { text: '规则引擎', color: 'blue' },
          clustering: { text: '聚类分析', color: 'green' },
          association: { text: '关联分析', color: 'purple' },
        };
        return <Tag color={sourceMap[source].color}>{sourceMap[source].text}</Tag>;
      },
    },
    {
      title: '推荐理由',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: '状态',
      key: 'status',
      // 后端已支持筛选，移除前端 onFilter
      render: (_: any, record: Recommendation) => (
        <Tag color={record.isAccepted ? 'green' : 'orange'}>
          {record.isAccepted ? '已接受' : '待处理'}
        </Tag>
      ),
    },
    {
      title: '推荐时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (createdAt: string) => dayjs(createdAt).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_: any, record: Recommendation) => (
        <Space>
          {!record.isAccepted && (
            <>
              <Popconfirm
                title="确定要接受此推荐吗？"
                onConfirm={() => handleAccept(record.id)}
              >
                <Button
                  type="link"
                  size="small"
                  icon={<CheckCircleOutlined />}
                >
                  接受
                </Button>
              </Popconfirm>
              <Popconfirm
                title="确定要拒绝此推荐吗？"
                onConfirm={() => handleReject(record.id)}
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                >
                  拒绝
                </Button>
              </Popconfirm>
            </>
          )}
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  // 统计卡片数据
  const statistics = {
    total: recommendationPagination.total,
    pending: recommendations.filter(r => !r.isAccepted).length,
    accepted: recommendations.filter(r => r.isAccepted).length,
    rejected: 0,
  };

  // 处理分页变化
  const handleTableChange = (pagination: any, tableFilters: any, sorter: any) => {
    // 分页时保留所有当前筛选条件
    loadRecommendations({
      page: pagination.current,
      limit: pagination.pageSize,
      ...filters, // 保留表单筛选条件
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>推荐结果管理</Title>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总推荐数"
              value={statistics.total}
              prefix={<Text type="secondary">📄</Text>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理"
              value={statistics.pending}
              valueStyle={{ color: '#faad14' }}
              prefix={<Text type="secondary">⏰</Text>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已接受"
              value={statistics.accepted}
              valueStyle={{ color: '#52c41a' }}
              prefix={<Text type="secondary">✅</Text>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已拒绝"
              value={statistics.rejected}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<Text type="secondary">❌</Text>}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选区 */}
      <Card style={{ marginBottom: 16 }} size="small" title={<><FilterOutlined /> 高级筛选</>}>
        <Form
          form={form}
          layout="inline"
          onValuesChange={(changedValues, allValues) => {
            // 可以在这里添加自动筛选逻辑
          }}
        >
          <Form.Item label="客户搜索" name="customerName">
            <Search
              placeholder="输入客户名称"
              allowClear
              onSearch={handleSearch}
              style={{ width: 250 }}
            />
          </Form.Item>
          
          <Form.Item label="标签类型" name="category">
            <Select
              placeholder="请选择"
              allowClear
              onChange={handleCategoryChange}
              style={{ width: 150 }}
            >
              <Option value="客户价值">客户价值</Option>
              <Option value="行为特征">行为特征</Option>
              <Option value="人口统计">人口统计</Option>
              <Option value="偏好分析">偏好分析</Option>
            </Select>
          </Form.Item>

          <Form.Item label="推荐来源" name="source">
            <Select
              placeholder="请选择"
              allowClear
              onChange={handleSourceChange}
              style={{ width: 150 }}
            >
              <Option value="rule">规则引擎</Option>
              <Option value="clustering">聚类分析</Option>
              <Option value="association">关联分析</Option>
            </Select>
          </Form.Item>

          <Form.Item label="状态" name="status">
            <Select
              placeholder="请选择"
              allowClear
              onChange={handleStatusChange}
              style={{ width: 120 }}
            >
              <Option value="pending">待处理</Option>
              <Option value="accepted">已接受</Option>
            </Select>
          </Form.Item>

          <Form.Item label="日期范围" name="dateRange">
            <RangePicker onChange={handleDateRangeChange} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" onClick={handleQuery}>
                查询
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
                刷新
              </Button>
              <Button onClick={handleResetFilters}>
                重置
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 数据表格 */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={recommendations}
        loading={recommendationLoading}
        onChange={handleTableChange}
        pagination={{
          current: recommendationPagination.current,
          pageSize: recommendationPagination.pageSize,
          total: recommendationPagination.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 1600 }}
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          selections: [
            Table.SELECTION_ALL,
            Table.SELECTION_INVERT,
            Table.SELECTION_NONE,
          ],
        }}
        footer={() => (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Space>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleBatchAccept(selectedRowKeys)}
                disabled={selectedRowKeys.length === 0}
              >
                批量接受 ({selectedRowKeys.length})
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleBatchReject(selectedRowKeys)}
                disabled={selectedRowKeys.length === 0}
              >
                批量拒绝 ({selectedRowKeys.length})
              </Button>
            </Space>
          </div>
        )}
      />

      {/* 详情弹窗 */}
      <RecommendationDetailModal
        visible={detailVisible}
        recommendation={selectedRecommendation}
        onCancel={() => setDetailVisible(false)}
      />
    </div>
  );
};

export default RecommendationList;