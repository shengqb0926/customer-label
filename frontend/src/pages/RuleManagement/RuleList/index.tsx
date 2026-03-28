import React, { useEffect } from 'react';
import { Table, Button, Input, Select, Space, Tag, Popconfirm, message, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PoweroffOutlined,
  ExportOutlined,
  ImportOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useRuleStore } from '@/stores/ruleStore';
import type { Rule } from '@/services/rule';
import RuleFormModal from '../RuleForm/RuleFormModal';

const { Search } = Input;
const { Option } = Select;
const { Title } = Typography;

interface RuleListProps {
  onEdit?: (rule: Rule) => void;
  onTest?: (rule: Rule) => void;
}

const RuleList: React.FC<RuleListProps> = ({ onEdit, onTest }) => {
  const navigate = useNavigate();
  const {
    rules,
    loading,
    pagination,
    filters,
    fetchRules,
    deleteRule,
    activateRule,
    deactivateRule,
    setFilters,
  } = useRuleStore();

  const [formVisible, setFormVisible] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<Rule | null>(null);

  // 调试日志：监控状态变化
  useEffect(() => {
    console.log('[RuleList Debug] 状态变化:', {
      formVisible,
      editingRule,
      rulesCount: rules.length,
      loading,
    });
  }, [formVisible, editingRule, rules, loading]);

  // 加载规则列表
  useEffect(() => {
    console.log('[RuleList Debug] 初始加载规则列表');
    fetchRules({ page: pagination.current, limit: pagination.pageSize });
  }, []);

  // 处理刷新
  const handleRefresh = () => {
    fetchRules({ page: pagination.current, limit: pagination.pageSize });
    message.success('刷新成功');
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value });
    fetchRules({ page: 1, limit: pagination.pageSize });
  };

  // 处理状态筛选
  const handleStatusFilter = (value: boolean | undefined) => {
    setFilters({ ...filters, isActive: value });
    fetchRules({ page: 1, limit: pagination.pageSize, isActive: value });
  };

  // 处理删除
  const handleDelete = async (id: number) => {
    try {
      await deleteRule(id);
      message.success('删除成功');
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  // 处理激活/停用
  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      if (isActive) {
        await activateRule(id);
        message.success('规则已激活');
      } else {
        await deactivateRule(id);
        message.success('规则已停用');
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  // 处理编辑
  const handleEdit = (record: Rule) => {
    console.log('[RuleList Debug] 点击编辑:', record);
    setEditingRule(record);
    setFormVisible(true);
    onEdit?.(record);
  };

  // 处理测试 - 跳转到规则测试页面
  const handleTest = (record: Rule) => {
    console.log('[RuleList Debug] 点击测试按钮，准备跳转到规则测试页面:', record);
    // 跳转到规则测试页面，并通过 state 传递规则信息
    navigate('/rules/test', { 
      state: { 
        rule: {
          id: record.id,
          ruleName: record.ruleName,
          ruleExpression: typeof record.ruleExpression === 'string' 
            ? JSON.parse(record.ruleExpression) 
            : record.ruleExpression,
        } 
      } 
    });
  };

  // 处理创建 - 添加详细调试日志
  const handleCreate = () => {
    console.log('[RuleList Debug] === 点击新建规则按钮 ===');
    console.log('[RuleList Debug] 设置 formVisible = true');
    console.log('[RuleList Debug] 设置 editingRule = null');
    setEditingRule(null);
    setFormVisible(true);
    // 延迟日志确认状态已更新
    setTimeout(() => {
      console.log('[RuleList Debug] 100ms 后检查状态:', {
        formVisible,
        editingRule,
      });
    }, 100);
  };

  // 处理表单提交
  const handleFormSubmit = async (data: any) => {
    try {
      console.log('[RuleList Debug] 表单提交数据:', data);
      
      // 字段名转换：前端 -> 后端 API
      // ruleExpression 需要序列化为 JSON 字符串
      const transformedData = {
        ruleName: data.name,
        ruleExpression: JSON.stringify(data.expression), // 序列化为字符串
        tagTemplate: data.tags, // string[] 数组
        description: data.description,
        priority: data.priority,
        isActive: data.isActive,
      };
      
      console.log('[RuleList Debug] 转换后的数据:', transformedData);
      
      if (editingRule) {
        await useRuleStore.getState().updateRule(editingRule.id, transformedData);
        message.success('更新成功');
      } else {
        await useRuleStore.getState().createRule(transformedData);
        message.success('创建成功');
      }
      setFormVisible(false);
      setEditingRule(null);
    } catch (error: any) {
      console.error('[RuleList Debug] 表单提交错误:', error);
      message.error(error.message || '操作失败');
    }
  };

  // 表格列定义
  const columns: ColumnsType<Rule> = [
    {
      title: '规则名称',
      dataIndex: 'ruleName',
      key: 'ruleName',
      sorter: (a, b) => a.ruleName.localeCompare(b.ruleName),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      sorter: (a, b) => a.priority - b.priority,
      render: (priority: number) => (
        <span style={{ color: priority >= 80 ? '#ff4d4f' : priority >= 50 ? '#faad14' : '#52c41a' }}>
          {priority}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      filters: [
        { text: '活跃', value: true },
        { text: '停用', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? '活跃' : '停用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (createdAt: string) => new Date(createdAt).toLocaleString(),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      render: (updatedAt: string) => new Date(updatedAt).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 280,
      render: (_: any, record: Rule) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleTest(record)}
          >
            测试
          </Button>
          <Popconfirm
            title={`确定要${record.isActive ? '停用' : '激活'}此规则吗？`}
            onConfirm={() => handleToggleActive(record.id, !record.isActive)}
          >
            <Button
              type="link"
              size="small"
              icon={<PoweroffOutlined />}
            >
              {record.isActive ? '停用' : '激活'}
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确定要删除此规则吗？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>
          规则管理
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
          <Button icon={<ImportOutlined />}>
            导入
          </Button>
          <Button icon={<ExportOutlined />}>
            导出
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreate}
          >
            新建规则
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <Search
          placeholder="搜索规则名称"
          allowClear
          style={{ width: 300 }}
          onSearch={handleSearch}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 150 }}
          onChange={handleStatusFilter}
        >
          <Option value={true}>活跃</Option>
          <Option value={false}>停用</Option>
        </Select>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={rules}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 1200 }}
      />

      {/* 规则表单弹窗 */}
      <RuleFormModal
        visible={formVisible}
        rule={editingRule}
        onSubmit={handleFormSubmit}
        onCancel={() => {
          console.log('[RuleList Debug] 点击取消按钮');
          setFormVisible(false);
          setEditingRule(null);
        }}
      />
    </div>
  );
};

export default RuleList;