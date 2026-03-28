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

// 推荐状态类型（兼容后端枚举）
type RecommendationStatus = 'pending' | 'accepted' | 'rejected' | boolean;

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
    statistics,
    statisticsLoading,
    fetchStatistics,
  } = useRuleStore();

  const [detailVisible, setDetailVisible] = React.useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = React.useState<Recommendation | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [form] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([]);

  // 加载推荐列表和统计数据
  useEffect(() => {
    loadRecommendations();
    loadStatistics();
  }, []);

  const loadRecommendations = (params?: any) => {
    fetchRecommendations({
      page: recommendationPagination.current,
      limit: recommendationPagination.pageSize,
      ...params,
    });
  };

  const loadStatistics = (params?: any) => {
    fetchStatistics(params);
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
    loadStatistics(queryParams); // 同时刷新统计数据
  };

  // 处理刷新
  const handleRefresh = () => {
    form.resetFields();
    setFilters({});
    loadRecommendations();
    loadStatistics();
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
      const successCount = (result as any)?.success || selectedRowKeys.length;
      
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
          const successCount = (result as any)?.success || selectedRowKeys.length;
          
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

  // 获取状态文本和颜色
  const getStatusConfig = (status: RecommendationStatus | boolean) => {
    if (typeof status === 'boolean') {
      // 向后兼容布尔值
      return status 
        ? { text: '已接受', color: 'green' } as const
        : { text: '待处理', color: 'orange' } as const;
    }
    
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: '待处理', color: 'orange' },
      accepted: { text: '已接受', color: 'green' },
      rejected: { text: '已拒绝', color: 'red' },
    };
    return statusMap[status] || { text: '未知', color: 'default' };
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#52c41a'; // 绿色 - 高置信度
    if (confidence >= 0.6) return '#faad14'; // 橙色 - 中等置信度
    if (confidence >= 0.4) return '#ff9500'; // 深橙色 - 较低置信度
    return '#ff4d4f'; // 红色 - 低置信度
  };

  // 表格列定义
  const columns: ColumnsType<Recommendation> = [
    {
      title: '客户',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 200,
      fixed: 'left',
      render: (text, record) => (
        <a onClick={() => handleViewDetail(record)}>{text || `客户#${record.customerId}`}</a>
      ),
    },
    {
      title: '推荐标签',
      dataIndex: 'tagName',
      key: 'tagName',
      width: 150,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '标签类型',
      dataIndex: 'tagCategory',
      key: 'tagCategory',
      width: 120,
      render: (text?: string) => text || '-',
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 140,
      sorter: (a, b) => a.confidence - b.confidence,
      render: (confidence: number) => {
        const percent = Number((confidence * 100).toFixed(1));
        const color = getConfidenceColor(confidence);
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Progress
              percent={percent}
              strokeColor={color}
              trailColor="#f5f5f5"
              status="active"
              format={() => `${percent}%`}
              style={{ width: 100, marginBottom: 0 }}
              size="small"
            />
          </div>
        );
      },
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 120,
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
      responsive: ['md'], // 中屏以上显示
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: Recommendation) => {
        // 优先使用 status 字段，向后兼容 isAccepted
        const statusValue = (record as any).status || record.isAccepted;
        const config = getStatusConfig(statusValue);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '推荐时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      responsive: ['lg'], // 大屏以上显示
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (createdAt: string) => dayjs(createdAt).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_: any, record: Recommendation) => {
        // 判断是否已处理
        const isProcessed = record.isAccepted || (record as any).status === 'accepted' || (record as any).status === 'rejected';
        
        return (
          <Space>
            {!isProcessed && (
              <>
                <Popconfirm
                  title="确定要接受此推荐吗？"
                  onConfirm={() => handleAccept(record.id)}
                  okText="接受"
                  cancelText="取消"
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
                  okText="拒绝"
                  cancelText="取消"
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
        );
      },
    },
  ];

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

      {/* 统计卡片 - 使用后端 API 数据 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable loading={statisticsLoading}>
            <Statistic
              title="总推荐数"
              value={statistics?.total ?? 0}
              prefix={<Text type="secondary">📄</Text>}
              valueStyle={{ fontSize: 24, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable loading={statisticsLoading}>
            <Statistic
              title="待处理"
              value={statistics?.pending ?? 0}
              valueStyle={{ color: '#faad14', fontSize: 24, fontWeight: 600 }}
              prefix={<Text type="secondary">⏰</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable loading={statisticsLoading}>
            <Statistic
              title="已接受"
              value={statistics?.accepted ?? 0}
              valueStyle={{ color: '#52c41a', fontSize: 24, fontWeight: 600 }}
              prefix={<Text type="secondary">✅</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable loading={statisticsLoading}>
            <Statistic
              title="已拒绝"
              value={statistics?.rejected ?? 0}
              valueStyle={{ color: '#ff4d4f', fontSize: 24, fontWeight: 600 }}
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
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 'max-content' }}
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
        locale={{
          emptyText: recommendations.length === 0 
            ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>📭</div>
                <div style={{ fontSize: 16, color: '#999', marginBottom: 8 }}>
                  暂无推荐数据
                </div>
                <div style={{ fontSize: 14, color: '#bbb' }}>
                  {filters.customerName || filters.category || filters.source || filters.status 
                    ? '当前筛选条件下没有数据，请尝试调整筛选条件' 
                    : '还没有生成任何推荐，请稍后刷新或查看规则配置'}
                </div>
              </div>
            ) 
            : '暂无数据',
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