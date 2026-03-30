import React, { useEffect, useState } from 'react';
import { Table, Button, Input, Select, Space, Tag, Popconfirm, message, Typography, DatePicker, Row, Col, Statistic, Card, Progress, Modal, Form, Slider, Checkbox, Divider, Badge, Tooltip, Radio } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  FilterOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
  UndoOutlined,
  TagOutlined,
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
  category?: string;
  dateRange?: any[];
  status?: string;
  source?: string | string[];
  minConfidence?: number;
  maxConfidence?: number;
  categories?: string[];
  sources?: string[];
}

// 推荐状态类型（兼容后端枚举）
type RecommendationStatus = 'pending' | 'accepted' | 'rejected' | boolean;

// 置信度等级
const CONFIDENCE_LEVELS = [
  { label: '高', value: 'high', range: [0.7, 1], color: 'green' },
  { label: '中', value: 'medium', range: [0.4, 0.7), color: 'orange' },
  { label: '低', value: 'low', range: [0, 0.4), color: 'red' },
];

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
  const [advancedSearchVisible, setAdvancedSearchVisible] = React.useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState<string>('all');

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

  // 处理置信度等级筛选
  const handleConfidenceLevelChange = (value: string) => {
    setConfidenceLevel(value);
    const level = CONFIDENCE_LEVELS.find(l => l.value === value);
    if (level) {
      setFilters(prev => ({ 
        ...prev, 
        minConfidence: level.range[0],
        maxConfidence: level.range[1]
      }));
    } else {
      setFilters(prev => ({ ...prev, minConfidence: undefined, maxConfidence: undefined }));
    }
  };

  // 处理标签类别多选
  const handleCategoriesChange = (values: string[]) => {
    setFilters(prev => ({ ...prev, categories: values }));
  };

  // 处理来源多选
  const handleSourcesChange = (values: string[]) => {
    setFilters(prev => ({ ...prev, sources: values }));
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
    if (filters.minConfidence !== undefined) {
      queryParams.minConfidence = filters.minConfidence;
    }
    if (filters.categories && filters.categories.length > 0) {
      queryParams.categories = filters.categories.join(',');
    }
    if (filters.sources && filters.sources.length > 0) {
      queryParams.sources = filters.sources.join(',');
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

  // 处理批量接受（带自动打标签选项）
  const handleBatchAccept = async (selectedRowKeys: React.Key[]) => {
    if (!selectedRowKeys.length) {
      message.warning('请选择要接受的推荐');
      return;
    }
    
    let autoTag = false;
    
    Modal.confirm({
      title: '批量接受推荐',
      content: (
        <div>
          <p>确定要接受选中的 {selectedRowKeys.length} 条推荐吗？</p>
          <Checkbox 
            checked={autoTag}
            onChange={(e) => { autoTag = e.target.checked; }}
            style={{ marginTop: 16, display: 'block' }}
          >
            接受后自动为客户打上对应标签
          </Checkbox>
        </div>
      ),
      okText: '确认接受',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await batchAcceptRecommendations(selectedRowKeys as number[], autoTag);
          const successCount = (result as any)?.success || selectedRowKeys.length;
          
          if (successCount === selectedRowKeys.length) {
            message.success(`已成功接受 ${successCount} 条推荐${autoTag ? '并自动打标签' : ''}`);
          } else if (successCount > 0) {
            message.warning(`部分成功：成功接受 ${successCount} 条，失败 ${selectedRowKeys.length - successCount} 条`);
          } else {
            message.error('批量接受失败，请重试');
          }
          
          loadRecommendations();
        } catch (error: any) {
          message.error(error.message || '批量接受失败');
        }
      },
    });
  };

  // 处理批量拒绝（保持原有逻辑）
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

  // 处理批量撤销（新增功能）
  const handleBatchUndo = async (selectedRowKeys: React.Key[]) => {
    if (!selectedRowKeys.length) {
      message.warning('请选择要撤销的推荐');
      return;
    }
    
    Modal.confirm({
      title: '批量撤销操作',
      content: `确定要撤销选中的 ${selectedRowKeys.length} 条推荐的操作吗？这将恢复到待处理状态。`,
      okText: '确认撤销',
      cancelText: '取消',
      onOk: async () => {
        try {
          // TODO: 调用后端撤销 API
          // const result = await undoRecommendations(selectedRowKeys as number[]);
          message.success(`已成功撤销 ${selectedRowKeys.length} 条推荐`);
          loadRecommendations();
        } catch (error: any) {
          message.error(error.message || '批量撤销失败');
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
      ellipsis: true,
      render: (customerName: string, record: Recommendation) => (
        <Text strong style={{ color: '#1890ff' }}>
          {customerName || `客户 #${record.customerId}`}
        </Text>
      ),
    },
    {
      title: '推荐标签',
      dataIndex: 'tagName',
      key: 'tagName',
      width: 150,
      ellipsis: true,
      render: (text: string) => (
        <Tag color="cyan" style={{ fontWeight: 500 }}>{text}</Tag>
      ),
    },
    {
      title: '标签类型',
      dataIndex: 'tagCategory',
      key: 'tagCategory',
      width: 120,
      filters: [
        { text: '客户价值', value: '客户价值' },
        { text: '行为偏好', value: '行为偏好' },
        { text: '风险特征', value: '风险特征' },
        { text: '基础属性', value: '基础属性' },
        { text: '新推荐的客户', value: '新推荐的客户' },
      ],
      onFilter: (value, record) => record.tagCategory === value,
      render: (text: string) => {
        const categoryColors: Record<string, string> = {
          '客户价值': 'orange',
          '行为偏好': 'blue',
          '风险特征': 'red',
          '基础属性': 'green',
          '新推荐的客户': 'purple',
        };
        return <Tag color={categoryColors[text] || 'default'}>{text}</Tag>;
      },
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 160,
      sorter: (a, b) => a.confidence - b.confidence,
      render: (confidence: number) => {
        const percent = Number((confidence * 100).toFixed(1));
        const color = getConfidenceColor(confidence);
        
        // 根据置信度设置不同的状态图标
        let statusIcon = '';
        let statusText = '';
        if (confidence >= 0.8) {
          statusIcon = '🟢';
          statusText = '高';
        } else if (confidence >= 0.6) {
          statusIcon = '🟡';
          statusText = '中';
        } else if (confidence >= 0.4) {
          statusIcon = '🟠';
          statusText = '较低';
        } else {
          statusIcon = '🔴';
          statusText = '低';
        }
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Progress
              percent={percent}
              strokeColor={color}
              trailColor="#f0f0f0"
              status="active"
              format={() => <span style={{ fontWeight: 600 }}>{percent}%</span>}
              style={{ marginBottom: 0 }}
              size="small"
              strokeWidth={8}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {statusIcon} {statusText}
            </Text>
          </div>
        );
      },
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 130,
      filters: [
        { text: '规则引擎', value: 'rule' },
        { text: '聚类分析', value: 'clustering' },
        { text: '关联分析', value: 'association' },
      ],
      onFilter: (value, record) => record.source === value,
      render: (source: 'rule' | 'clustering' | 'association') => {
        const sourceMap = {
          rule: { text: '规则引擎', color: 'blue', icon: '⚙️' },
          clustering: { text: '聚类分析', color: 'green', icon: '🔍' },
          association: { text: '关联分析', color: 'purple', icon: '🔗' },
        };
        return (
          <Tag color={sourceMap[source].color} style={{ fontWeight: 500 }}>
            {sourceMap[source].icon} {sourceMap[source].text}
          </Tag>
        );
      },
    },
    {
      title: '推荐理由',
      dataIndex: 'reason',
      key: 'reason',
      width: 250,
      ellipsis: true,
      responsive: ['md'],
      render: (text: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>{text}</Text>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 110,
      filters: [
        { text: '待处理', value: 'pending' },
        { text: '已接受', value: 'accepted' },
        { text: '已拒绝', value: 'rejected' },
      ],
      onFilter: (value, record) => {
        if ('status' in record) {
          return (record as any).status === value;
        }
        // 向后兼容
        if (value === 'pending') return !record.isAccepted;
        if (value === 'accepted') return record.isAccepted;
        return false;
      },
      render: (_: any, record: Recommendation) => {
        const statusValue = (record as any).status || record.isAccepted;
        const config = getStatusConfig(statusValue);
        return (
          <Tag color={config.color} style={{ fontWeight: 600, padding: '4px 12px' }}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '推荐时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      responsive: ['lg'],
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (createdAt: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {dayjs(createdAt).format('YYYY-MM-DD HH:mm:ss')}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      fixed: 'right',
      render: (_: any, record: Recommendation) => {
        // 判断是否已处理
        const isProcessed = record.isAccepted || (record as any).status === 'accepted' || (record as any).status === 'rejected';
        
        return (
          <Space size="small">
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
                    style={{ color: '#52c41a', fontWeight: 500 }}
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
                    style={{ fontWeight: 500 }}
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
              style={{ fontWeight: 500 }}
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

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            loading={statisticsLoading}
            style={{ 
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#fff', fontWeight: 500 }}>📄 总推荐数</span>}
              value={statistics?.total ?? 0}
              valueStyle={{ fontSize: 32, fontWeight: 700, color: '#fff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            loading={statisticsLoading}
            style={{ 
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#fff', fontWeight: 500 }}>⏰ 待处理</span>}
              value={statistics?.pending ?? 0}
              valueStyle={{ fontSize: 32, fontWeight: 700, color: '#fff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            loading={statisticsLoading}
            style={{ 
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#fff', fontWeight: 500 }}>✅ 已接受</span>}
              value={statistics?.accepted ?? 0}
              valueStyle={{ fontSize: 32, fontWeight: 700, color: '#fff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            loading={statisticsLoading}
            style={{ 
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#fff', fontWeight: 500 }}>❌ 已拒绝</span>}
              value={statistics?.rejected ?? 0}
              valueStyle={{ fontSize: 32, fontWeight: 700, color: '#fff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选区 */}
      <Card 
        style={{ marginBottom: 16, borderRadius: 8 }} 
        size="small" 
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <FilterOutlined style={{ color: '#1890ff' }} /> 
            高级筛选
          </span>
        }
        extra={
          <Button 
            type="link" 
            onClick={() => setAdvancedSearchVisible(!advancedSearchVisible)}
            icon={advancedSearchVisible ? <CloseCircleOutlined /> : <FilterOutlined />}
          >
            {advancedSearchVisible ? '收起' : '展开'}
          </Button>
        }
      >
        <Form
          form={form}
          layout="inline"
          onValuesChange={(changedValues, allValues) => {
            // 可以在这里添加自动筛选逻辑
          }}
        >
          <Form.Item label={<span style={{ fontWeight: 500 }}>客户搜索</span>} name="customerName">
            <Search
              placeholder="输入客户名称或 ID"
              allowClear
              onSearch={handleSearch}
              style={{ width: 260 }}
            />
          </Form.Item>
          
          <Form.Item label={<span style={{ fontWeight: 500 }}>标签类型</span>} name="category">
            <Select
              placeholder="全部类型"
              allowClear
              onChange={handleCategoryChange}
              style={{ width: 160 }}
            >
              <Option value="客户价值">📊 客户价值</Option>
              <Option value="行为特征">🎯 行为特征</Option>
              <Option value="人口统计">👥 人口统计</Option>
              <Option value="偏好分析">❤️ 偏好分析</Option>
            </Select>
          </Form.Item>

          <Form.Item label={<span style={{ fontWeight: 500 }}>推荐来源</span>} name="source">
            <Select
              placeholder="全部来源"
              allowClear
              onChange={handleSourceChange}
              style={{ width: 160 }}
            >
              <Option value="rule">⚙️ 规则引擎</Option>
              <Option value="clustering">🔍 聚类分析</Option>
              <Option value="association">🔗 关联分析</Option>
            </Select>
          </Form.Item>

          <Form.Item label={<span style={{ fontWeight: 500 }}>状态</span>} name="status">
            <Select
              placeholder="全部状态"
              allowClear
              onChange={handleStatusChange}
              style={{ width: 140 }}
            >
              <Option value="pending">⏰ 待处理</Option>
              <Option value="accepted">✅ 已接受</Option>
              <Option value="rejected">❌ 已拒绝</Option>
            </Select>
          </Form.Item>

          <Form.Item label={<span style={{ fontWeight: 500 }}>日期范围</span>} name="dateRange">
            <RangePicker />
          </Form.Item>

          <Form.Item>
            <Space size="small">
              <Button 
                type="primary" 
                htmlType="submit" 
                onClick={handleQuery}
                icon={<SearchOutlined />}
              >
                查询
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
              >
                刷新
              </Button>
              <Button onClick={handleResetFilters}>
                重置
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={handleExport}
              >
                导出
              </Button>
            </Space>
          </Form.Item>

          {/* 高级筛选区域 */}
          {advancedSearchVisible && (
            <>
              <Form.Item label={<span style={{ fontWeight: 500 }}>置信度等级</span>} name="confidenceLevel">
                <Radio.Group 
                  value={confidenceLevel}
                  onChange={(e) => handleConfidenceLevelChange(e.target.value)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="all">全部</Radio.Button>
                  <Radio.Button value="high">🟢 高 (70%+)</Radio.Button>
                  <Radio.Button value="medium">🟡 中 (40-70%)</Radio.Button>
                  <Radio.Button value="low">🔴 低 (&lt;40%)</Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item label={<span style={{ fontWeight: 500 }}>置信度范围</span>}>
                <div style={{ width: 200 }}>
                  <Slider
                    range
                    min={0}
                    max={1}
                    step={0.01}
                    value={[filters.minConfidence || 0, filters.maxConfidence || 1]}
                    onChange={(value) => {
                      setFilters(prev => ({ 
                        ...prev, 
                        minConfidence: value[0], 
                        maxConfidence: value[1] 
                      }));
                    }}
                    marks={{
                      0: '0%',
                      0.4: '40%',
                      0.7: '70%',
                      1: '100%'
                    }}
                  />
                </div>
              </Form.Item>

              <Form.Item label={<span style={{ fontWeight: 500 }}>标签类别多选</span>}>
                <Checkbox.Group
                  value={filters.categories || []}
                  onChange={handleCategoriesChange}
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <Checkbox value="客户价值">📊 客户价值</Checkbox>
                  <Checkbox value="行为特征">🎯 行为特征</Checkbox>
                  <Checkbox value="人口统计">👥 人口统计</Checkbox>
                  <Checkbox value="偏好分析">❤️ 偏好分析</Checkbox>
                  <Checkbox value="风险特征">⚠️ 风险特征</Checkbox>
                </Checkbox.Group>
              </Form.Item>

              <Form.Item label={<span style={{ fontWeight: 500 }}>来源多选</span>}>
                <Checkbox.Group
                  value={filters.sources || []}
                  onChange={handleSourcesChange}
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <Checkbox value="rule">⚙️ 规则引擎</Checkbox>
                  <Checkbox value="clustering">🔍 聚类分析</Checkbox>
                  <Checkbox value="association">🔗 关联分析</Checkbox>
                </Checkbox.Group>
              </Form.Item>
            </>
          )}
        </Form>
      </Card>

      {/* 数据表格 */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={recommendations}
        loading={{
          spinning: recommendationLoading,
          tip: '加载中...',
          size: 'large',
        }}
        onChange={handleTableChange}
        pagination={{
          current: recommendationPagination.current,
          pageSize: recommendationPagination.pageSize,
          total: recommendationPagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
          pageSizeOptions: ['10', '20', '50', '100'],
          itemRender: (page, type, originalElement) => {
            if (type === 'prev') {
              return <Button type="text" icon={<LeftOutlined />}>上一页</Button>;
            } else if (type === 'next') {
              return <Button type="text" icon={<RightOutlined />}>下一页</Button>;
            }
            return originalElement;
          },
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
        title={() => (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
            <div>
              <Text strong>推荐列表</Text>
              {selectedRowKeys.length > 0 && (
                <Tag color="blue" style={{ marginLeft: 12 }}>
                  已选择 {selectedRowKeys.length} 条
                </Tag>
              )}
            </div>
            {selectedRowKeys.length > 0 && (
              <Space size="middle">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleBatchAccept(selectedRowKeys)}
                  style={{ fontWeight: 600 }}
                >
                  批量接受
                </Button>
                <Button
                  danger
                  size="small"
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleBatchReject(selectedRowKeys)}
                  style={{ fontWeight: 600 }}
                >
                  批量拒绝
                </Button>
                <Button
                  size="small"
                  icon={<UndoOutlined />}
                  onClick={() => handleBatchUndo(selectedRowKeys)}
                  style={{ fontWeight: 600 }}
                >
                  批量撤销
                </Button>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => handleExport()}
                  style={{ fontWeight: 600 }}
                >
                  导出选中
                </Button>
              </Space>
            )}
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