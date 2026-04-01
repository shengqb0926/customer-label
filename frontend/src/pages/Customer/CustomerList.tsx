import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Input, Select, Tag, message, Popconfirm, Tooltip, Modal, InputNumber } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  UploadOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { customerService, type Customer, type CustomerLevel, type RiskLevel } from '@/services';
import CustomerDetailModal from './CustomerDetailModal';
import BatchImportModal from './BatchImportModal';
import CreateCustomerModal from './CreateCustomerModal';
import { CustomerExcelUtils } from '@/utils/CustomerExcelUtils';

const { Option } = Select;

const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [randomGenerateCount, setRandomGenerateCount] = useState<number>(0);

  // 筛选状态
  const [searchName, setSearchName] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('');
  const [filterCity, setFilterCity] = useState('');
  const [filterIsActive, setFilterIsActive] = useState<string>('');

  // 加载客户列表
  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
      };

      if (searchName) params.keyword = searchName;
      if (filterLevel) params.level = filterLevel;
      if (filterRiskLevel) params.riskLevel = filterRiskLevel;
      if (filterCity) params.city = filterCity;
      if (filterIsActive) params.isActive = filterIsActive === 'true';

      const result = await customerService.getList(params);
      setCustomers(result.data);
      setTotal(result.total);
    } catch (error: any) {
      message.error('加载客户列表失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page, limit]);

  // 刷新列表
  const handleRefresh = () => {
    loadCustomers();
    message.success('刷新成功');
  };

  // 批量随机生成客户
  const handleBatchGenerate = async () => {
    let generateCount = 100; // 默认值
    
    Modal.confirm({
      title: '批量随机生成客户',
      content: (
        <div>
          <p>请输入要生成的客户数量：</p>
          <InputNumber
            min={1}
            max={1000}
            defaultValue={100}
            style={{ width: '100%' }}
            onChange={(value) => {
              generateCount = value || 100;
            }}
          />
          <p style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>
            提示：将生成符合业务规则的随机客户数据
          </p>
        </div>
      ),
      okText: '生成',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 确保 count 至少为 1
          const count = Math.max(1, Math.min(1000, generateCount));
          message.loading(`正在生成 ${count} 个随机客户...`, 0);
          await customerService.generateRandom({ count });
          message.destroy();
          message.success(`成功生成 ${count} 个客户`);
          loadCustomers();
        } catch (error: any) {
          message.destroy();
          message.error('生成失败：' + error.message);
        }
      },
    });
  };

  // 触发推荐引擎
  const handleTriggerEngine = async (customerId: number, mode: 'rule' | 'clustering' | 'association' | 'all') => {
    try {
      const engineNames = {
        rule: '规则引擎',
        clustering: '聚合引擎',
        association: '关联引擎',
        all: '全部引擎',
      };

      message.loading(`正在触发${engineNames[mode]}...`, 0);

      const result = await customerService.triggerRecommendationEngine(customerId, mode);
      
      message.destroy();
      
      if (result.success && result.count > 0) {
        message.success(`${engineNames[mode]}执行成功！生成 ${result.count} 条推荐，已推送到推荐列表`);
      } else if (result.success) {
        message.info(`${engineNames[mode]}执行完成，但未匹配到符合条件的推荐`);
      } else {
        message.warning(`${engineNames[mode]}执行失败：${result.message}`);
      }
    } catch (error: any) {
      message.destroy();
      message.error('触发引擎失败：' + (error.message || '未知错误'));
    }
  };

  // 查看详情
  const handleViewDetail = (record: Customer) => {
    setSelectedCustomer(record);
    setDetailModalOpen(true);
  };

  // 编辑客户
  const handleEdit = (record: Customer) => {
    setSelectedCustomer(record);
    setCreateModalOpen(true);
  };

  // 删除客户
  const handleDelete = async (id: number) => {
    try {
      await customerService.remove(id);
      message.success('删除成功');
      loadCustomers();
    } catch (error: any) {
      message.error('删除失败：' + error.message);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的客户');
      return;
    }

    try {
      await customerService.batchRemove(selectedRowKeys.map(key => parseInt(key as string)));
      message.success(`成功删除 ${selectedRowKeys.length} 个客户`);
      setSelectedRowKeys([]);
      loadCustomers();
    } catch (error: any) {
      message.error('批量删除失败：' + error.message);
    }
  };

  // 导出 Excel
  const handleExport = async () => {
    try {
      message.loading('正在导出数据...', 0);
      
      // 获取当前筛选条件下的所有数据（不分页）
      const params: any = {
        page: 1,
        limit: 10000, // 获取所有数据
      };

      if (searchName) params.keyword = searchName;
      if (filterLevel) params.level = filterLevel;
      if (filterRiskLevel) params.riskLevel = filterRiskLevel;
      if (filterCity) params.city = filterCity;
      if (filterIsActive) params.isActive = filterIsActive === 'true';

      const result = await customerService.getList(params);
      
      message.destroy();
      
      if (result.data.length === 0) {
        message.warning('没有可导出的数据');
        return;
      }

      // 调用导出工具
      await CustomerExcelUtils.exportToExcel(result.data, `客户列表_${new Date().toLocaleDateString()}.xlsx`);
      message.success(`成功导出 ${result.data.length} 条客户数据`);
    } catch (error: any) {
      message.destroy();
      message.error('导出失败：' + error.message);
    }
  };

  // 下载模板
  const handleDownloadTemplate = async () => {
    try {
      await CustomerExcelUtils.downloadTemplate();
      message.success('模板下载成功');
    } catch (error: any) {
      message.error('下载模板失败：' + error.message);
    }
  };

  // 解析客户等级映射
  const levelFilterOptions = [
    { text: '青铜', value: 'BRONZE' },
    { text: '白银', value: 'SILVER' },
    { text: '黄金', value: 'GOLD' },
    { text: '铂金', value: 'PLATINUM' },
    { text: '钻石', value: 'DIAMOND' },
  ];

  // 表格列定义
  const columns: ColumnsType<Customer> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      sorter: true,
    },
    {
      title: '客户名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
      width: 80,
      filters: [
        { text: '北京', value: '北京' },
        { text: '上海', value: '上海' },
        { text: '广州', value: '广州' },
        { text: '深圳', value: '深圳' },
        { text: '成都', value: '成都' },
        { text: '杭州', value: '杭州' },
        { text: '南京', value: '南京' },
        { text: '武汉', value: '武汉' },
        { text: '重庆', value: '重庆' },
        { text: '西安', value: '西安' },
      ],
      onFilter: (value, record) => record.city === value,
    },
    {
      title: '客户等级',
      dataIndex: 'level',
      key: 'level',
      width: 90,
      render: (level: CustomerLevel) => {
        const colorMap: Partial<Record<CustomerLevel, string>> = {
          BRONZE: 'brown',
          SILVER: 'gray',
          GOLD: 'gold',
          PLATINUM: 'cyan',
          DIAMOND: 'blue',
        };
        return <Tag color={colorMap[level]}>{level}</Tag>;
      },
      filters: [
        { text: '青铜', value: 'BRONZE' },
        { text: '白银', value: 'SILVER' },
        { text: '黄金', value: 'GOLD' },
      ],
      onFilter: (value, record) => record.level === value,
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 90,
      render: (riskLevel: RiskLevel) => {
        const colorMap: Record<RiskLevel, string> = {
          LOW: 'green',
          MEDIUM: 'orange',
          HIGH: 'red',
        };
        return <Tag color={colorMap[riskLevel]}>{riskLevel}</Tag>;
      },
      filters: [
        { text: '低', value: 'LOW' },
        { text: '中', value: 'MEDIUM' },
        { text: '高', value: 'HIGH' },
      ],
      onFilter: (value, record) => record.riskLevel === value,
    },
    {
      title: '总资产',
      dataIndex: 'totalAssets',
      key: 'totalAssets',
      width: 110,
      render: (value: number) => `¥${((value || 0) / 10000).toFixed(1)}万`,
      sorter: (a, b) => (a.totalAssets || 0) - (b.totalAssets || 0),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 70,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '活跃' : ' inactive'}
        </Tag>
      ),
      filters: [
        { text: '活跃', value: 'true' },
        { text: '不活跃', value: 'false' },
      ],
      onFilter: (value, record) => String(record.isActive) === value,
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" direction="vertical">
          <Space size="small">
            <Tooltip title="查看详情">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetail(record)}
              />
            </Tooltip>
            <Tooltip title="编辑">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
            <Popconfirm
              title="确定删除此客户吗？"
              onConfirm={(e?: React.MouseEvent<HTMLElement>) => {
                e?.stopPropagation();
                handleDelete(record.id);
              }}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
          <Space size="small" style={{ borderTop: '1px solid #f0f0f0', paddingTop: '4px' }}>
            <Tooltip title="规则引擎">
              <Button
                type="primary"
                size="small"
                icon={<ThunderboltOutlined />}
                onClick={() => handleTriggerEngine(record.id, 'rule')}
              >
                规则
              </Button>
            </Tooltip>
            <Tooltip title="聚合引擎">
              <Button
                type="primary"
                size="small"
                icon={<ExperimentOutlined />}
                onClick={() => handleTriggerEngine(record.id, 'clustering')}
              >
                聚合
              </Button>
            </Tooltip>
            <Tooltip title="关联引擎">
              <Button
                type="primary"
                size="small"
                icon={<LinkOutlined />}
                onClick={() => handleTriggerEngine(record.id, 'association')}
              >
                关联
              </Button>
            </Tooltip>
          </Space>
        </Space>
      ),
    },
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 头部操作区 */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            新建客户
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setImportModalOpen(true)}
          >
            批量导入
          </Button>
          <Button
            icon={<ThunderboltOutlined />}
            onClick={handleBatchGenerate}
          >
            批量生成
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            导出 Excel
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
          >
            下载模板
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleBatchDelete}
            disabled={selectedRowKeys.length === 0}
          >
            批量删除 ({selectedRowKeys.length})
          </Button>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
        </Space>
      </div>

      {/* 筛选区 */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Input
          placeholder="搜索客户名称"
          prefix={<SearchOutlined />}
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          onPressEnter={loadCustomers}
          style={{ width: 200 }}
          allowClear
        />
        <Select
          placeholder="客户等级"
          value={filterLevel}
          onChange={setFilterLevel}
          style={{ width: 120 }}
          allowClear
        >
          <Option value="BRONZE">青铜</Option>
          <Option value="SILVER">白银</Option>
          <Option value="GOLD">黄金</Option>
        </Select>
        <Select
          placeholder="风险等级"
          value={filterRiskLevel}
          onChange={setFilterRiskLevel}
          style={{ width: 120 }}
          allowClear
        >
          <Option value="LOW">低</Option>
          <Option value="MEDIUM">中</Option>
          <Option value="HIGH">高</Option>
        </Select>
        <Input
          placeholder="城市"
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          onPressEnter={loadCustomers}
          style={{ width: 120 }}
          allowClear
        />
        <Select
          placeholder="状态"
          value={filterIsActive}
          onChange={setFilterIsActive}
          style={{ width: 100 }}
          allowClear
        >
          <Option value="true">活跃</Option>
          <Option value="false">不活跃</Option>
        </Select>
        <Button type="primary" onClick={loadCustomers}>
          查询
        </Button>
      </div>

      {/* 表格 */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={customers}
        loading={loading}
        rowSelection={rowSelection}
        pagination={{
          current: page,
          pageSize: limit,
          total: total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (page, pageSize) => {
            setPage(page);
            setLimit(pageSize);
          },
        }}
        scroll={{ x: 1400 }}
        bordered
      />

      {/* 详情弹窗 */}
      {selectedCustomer && (
        <CustomerDetailModal
          open={detailModalOpen}
          customer={selectedCustomer}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedCustomer(null);
          }}
        />
      )}

      {/* 批量导入弹窗 */}
      <BatchImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={loadCustomers}
      />

      {/* 新建/编辑客户弹窗 */}
      <CreateCustomerModal
        open={createModalOpen}
        customer={selectedCustomer}
        onClose={() => {
          setCreateModalOpen(false);
          setSelectedCustomer(null);
        }}
        onSuccess={loadCustomers}
      />
    </div>
  );
};

export default CustomerList;
