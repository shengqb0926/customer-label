import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  message,
  Typography,
  Modal,
  Form,
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Switch,
  Descriptions,
  Popconfirm,
  Checkbox,
  Dropdown,
  Divider,
  Tabs,
  Alert,
  Slider,
  InputNumber,
  TreeSelect,
  Badge,
  Tooltip,
  Steps,
} from 'antd';
import type { InputRef } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  StopOutlined,
  AppstoreOutlined,
  SettingOutlined,
  BarChartOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { clusteringConfigService } from '@/services/rule';
import type { ClusteringConfig, CreateClusteringConfigDto, UpdateClusteringConfigDto } from '@/services/rule';
import VisualConfigBuilder from './VisualConfigBuilder';
import FeatureSelector from './FeatureSelector';
import ExecutionMonitor from './ExecutionMonitor';
import PerformanceAnalysis from './PerformanceAnalysis';

const { Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const ClusteringConfigManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [configs, setConfigs] = useState<ClusteringConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [templateVisible, setTemplateVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ClusteringConfig | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<ClusteringConfig | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [algorithmFilter, setAlgorithmFilter] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>();
  // 批量操作相关状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [selectedConfigForAction, setSelectedConfigForAction] = useState<number | null>(null);

  // 预设模板定义
  const configTemplates = [
    {
      id: 'template-1',
      name: '客户细分基础模板',
      description: '适用于一般客户分群场景，K=5 的 K-Means 算法',
      algorithm: 'k-means' as const,
      parameters: {
        k: 5,
        maxIterations: 100,
        minSupport: 0.1,
        minConfidence: 0.6,
      },
      recommended: true,
    },
    {
      id: 'template-2',
      name: '精细化分群模板',
      description: '适用于需要更细粒度分群的场景，K=8',
      algorithm: 'k-means' as const,
      parameters: {
        k: 8,
        maxIterations: 150,
        minSupport: 0.05,
        minConfidence: 0.7,
      },
      recommended: false,
    },
    {
      id: 'template-3',
      name: 'DBSCAN 密度聚类模板',
      description: '适用于发现任意形状的簇，对噪声不敏感',
      algorithm: 'dbscan' as const,
      parameters: {
        eps: 0.5,
        minSamples: 5,
        maxIterations: 100,
      },
      recommended: false,
    },
    {
      id: 'template-4',
      name: '层次聚类模板',
      description: '适用于需要树状结构分析的场景',
      algorithm: 'hierarchical' as const,
      parameters: {
        nClusters: 5,
        linkage: 'ward',
        maxIterations: 100,
      },
      recommended: false,
    },
  ];

  // 加载配置列表
  const loadConfigs = async () => {
    setLoading(true);
    try {
      const response = await clusteringConfigService.getConfigs({
        configName: searchText || undefined,
        algorithm: algorithmFilter,
        isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
      });
      setConfigs(response.data);
    } catch (error: any) {
      message.error(`加载失败：${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  // 处理搜索
  const handleSearch = () => {
    loadConfigs();
  };

  // 打开创建/编辑弹窗
  const openModal = (config?: ClusteringConfig) => {
    if (config) {
      setEditingConfig(config);
      form.setFieldsValue({
        ...config,
        k: config.parameters?.k,
        maxIterations: config.parameters?.maxIterations,
        minSupport: config.parameters?.minSupport,
        minConfidence: config.parameters?.minConfidence,
      });
    } else {
      setEditingConfig(null);
      form.resetFields();
      form.setFieldsValue({
        algorithm: 'k-means',
        isActive: true,
      });
    }
    setModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { k, maxIterations, minSupport, minConfidence, ...restValues } = values;

      // 构建参数对象
      const parameters: Record<string, any> = {};
      if (k !== undefined) parameters.k = k;
      if (maxIterations !== undefined) parameters.maxIterations = maxIterations;
      if (minSupport !== undefined) parameters.minSupport = minSupport;
      if (minConfidence !== undefined) parameters.minConfidence = minConfidence;

      const dto: CreateClusteringConfigDto | UpdateClusteringConfigDto = {
        ...restValues,
        parameters,
      };

      if (editingConfig) {
        await clusteringConfigService.updateConfig(editingConfig.id, dto);
        message.success('更新成功');
      } else {
        await clusteringConfigService.createConfig(dto as CreateClusteringConfigDto);
        message.success('创建成功');
      }

      setModalVisible(false);
      loadConfigs();
    } catch (error: any) {
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (error.message) {
        message.error(error.message);
      }
    }
  };

  // 删除配置
  const handleDelete = async (id: number) => {
    try {
      await clusteringConfigService.deleteConfig(id);
      message.success('删除成功');
      loadConfigs();
    } catch (error: any) {
      message.error(`删除失败：${error.message}`);
    }
  };

  // 激活/停用配置
  const toggleStatus = async (config: ClusteringConfig) => {
    try {
      if (config.isActive) {
        await clusteringConfigService.deactivateConfig(config.id);
        message.success('已停用配置');
      } else {
        await clusteringConfigService.activateConfig(config.id);
        message.success('已激活配置');
      }
      loadConfigs();
    } catch (error: any) {
      message.error(`操作失败：${error.message}`);
    }
  };

  // 运行聚类任务
  const handleRun = async (id: number) => {
    try {
      const result = await clusteringConfigService.runClustering(id);
      message.success(result.message);
    } catch (error: any) {
      message.error(`运行失败：${error.message}`);
    }
  };

  // 批量运行配置
  const handleBatchRun = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请至少选择一个配置');
      return;
    }

    Modal.confirm({
      title: `确认批量运行 ${selectedRowKeys.length} 个配置？`,
      content: '批量运行将并发执行所有选中的配置任务，这可能需要一些时间。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setBatchRunning(true);
        try {
          const promises = selectedRowKeys.map((key) =>
            clusteringConfigService.runClustering(Number(key))
          );
          
          const results = await Promise.allSettled(promises);
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          const failCount = results.filter(r => r.status === 'rejected').length;

          message.success(
            `批量运行完成！成功：${successCount}, 失败：${failCount}`
          );
          
          setSelectedRowKeys([]);
          loadConfigs();
        } catch (error: any) {
          message.error(`批量运行失败：${error.message}`);
        } finally {
          setBatchRunning(false);
        }
      },
    });
  };

  // 批量删除配置
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请至少选择一个配置');
      return;
    }

    Modal.confirm({
      title: `确认删除选中的 ${selectedRowKeys.length} 个配置吗？`,
      content: '此操作不可恢复，请谨慎操作！',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const promises = selectedRowKeys.map((key) =>
            clusteringConfigService.deleteConfig(Number(key))
          );
          
          await Promise.all(promises);
          message.success('批量删除成功');
          
          setSelectedRowKeys([]);
          loadConfigs();
        } catch (error: any) {
          message.error(`批量删除失败：${error.message}`);
        }
      },
    });
  };

  // 批量激活/停用配置
  const handleBatchToggleStatus = async (activate: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请至少选择一个配置');
      return;
    }

    try {
      const promises = selectedRowKeys.map((key) =>
        activate
          ? clusteringConfigService.activateConfig(Number(key))
          : clusteringConfigService.deactivateConfig(Number(key))
      );
      
      await Promise.all(promises);
      message.success(activate ? '批量激活成功' : '批量停用成功');
      
      setSelectedRowKeys([]);
      loadConfigs();
    } catch (error: any) {
      message.error(`操作失败：${error.message}`);
    }
  };

  // 查看详情
  const showDetail = (config: ClusteringConfig) => {
    setSelectedConfig(config);
    setDetailVisible(true);
  };

  // Table 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record: ClusteringConfig) => ({
      disabled: record.configName === 'Disabled User',
      name: record.configName,
    }),
  };

  // 从模板创建配置
  const handleCreateFromTemplate = (template: any) => {
    form.resetFields();
    form.setFieldsValue({
      configName: `${template.name}-${dayjs().format('YYYYMMDD')}`,
      description: template.description,
      algorithm: template.algorithm,
      k: template.parameters.k,
      maxIterations: template.parameters.maxIterations,
      minSupport: template.parameters.minSupport,
      minConfidence: template.parameters.minConfidence,
      isActive: true,
    });
    setTemplateVisible(false);
    setModalVisible(true);
    message.success(`已应用模板：${template.name}`);
  };

  const columns: ColumnsType<ClusteringConfig> = [
    {
      title: '配置名称',
      dataIndex: 'configName',
      key: 'configName',
      width: 200,
      sorter: (a, b) => a.configName.localeCompare(b.configName),
    },
    {
      title: '算法类型',
      dataIndex: 'algorithm',
      key: 'algorithm',
      width: 120,
      render: (algorithm: string) => {
        const colorMap: Record<string, string> = {
          'k-means': 'blue',
          'dbscan': 'green',
          'hierarchical': 'purple',
        };
        return <Tag color={colorMap[algorithm] || 'default'}>{algorithm}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />} color={isActive ? 'success' : 'default'}>
          {isActive ? '活跃' : '停用'}
        </Tag>
      ),
    },
    {
      title: '运行次数',
      dataIndex: 'runCount',
      key: 'runCount',
      width: 100,
      sorter: (a, b) => a.runCount - b.runCount,
      render: (count: number) => `${count}次`,
    },
    {
      title: '平均轮廓系数',
      dataIndex: 'avgSilhouetteScore',
      key: 'avgSilhouetteScore',
      width: 150,
      render: (score?: number) => {
        if (!score) return '-';
        const percentage = Math.round(score * 100);
        let color = score > 0.7 ? '#52c41a' : score > 0.5 ? '#faad14' : '#ff4d4f';
        return (
          <Progress
            percent={percentage}
            strokeColor={color}
            trailColor="#f5f5f5"
            format={() => score.toFixed(3)}
            size="small"
          />
        );
      },
    },
    {
      title: '最后运行时间',
      dataIndex: 'lastRunAt',
      key: 'lastRunAt',
      width: 180,
      sorter: (a, b) => {
        const aTime = a.lastRunAt ? new Date(a.lastRunAt).getTime() : 0;
        const bTime = b.lastRunAt ? new Date(b.lastRunAt).getTime() : 0;
        return aTime - bTime;
      },
      render: (time?: Date) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '未运行',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (time: Date) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space split={<span>|</span>}>
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleRun(record.id)}
            disabled={!record.isActive}
          >
            运行
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          >
            编辑
          </Button>
          <Switch
            size="small"
            checked={record.isActive}
            onChange={() => toggleStatus(record)}
            checkedChildren="开"
            unCheckedChildren="关"
          />
          <Popconfirm
            title="确定要删除这个配置吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总配置数"
              value={configs.length}
              suffix="个"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃配置"
              value={configs.filter(c => c.isActive).length}
              suffix="个"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总运行次数"
              value={configs.reduce((sum, c) => sum + c.runCount, 0)}
              suffix="次"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均质量"
              value={
                configs.filter(c => c.avgSilhouetteScore).length > 0
                  ? (configs.reduce((sum, c) => sum + (c.avgSilhouetteScore || 0), 0) /
                      configs.filter(c => c.avgSilhouetteScore).length).toFixed(3)
                  : '0.000'
              }
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder="搜索配置名称"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="算法类型"
            value={algorithmFilter}
            onChange={setAlgorithmFilter}
            allowClear
            style={{ width: 150 }}
          >
            <Option value="k-means">K-Means</Option>
            <Option value="dbscan">DBSCAN</Option>
            <Option value="hierarchical">层次聚类</Option>
          </Select>
          <Select
            placeholder="状态"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            style={{ width: 120 }}
          >
            <Option value="active">活跃</Option>
            <Option value="inactive">停用</Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            新建配置
          </Button>
          <Dropdown menu={{
            items: configTemplates.map(template => ({
              key: template.id,
              label: (
                <div>
                  <div style={{ fontWeight: 500 }}>{template.name}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{template.description}</div>
                </div>
              ),
              icon: template.recommended ? <CheckCircleOutlined /> : undefined,
              onClick: () => handleCreateFromTemplate(template),
            })),
          }}>
            <Button icon={<AppstoreOutlined />}>
              从模板创建
            </Button>
          </Dropdown>
          <Button icon={<SearchOutlined />} onClick={handleSearch}>
            查询
          </Button>
          
          {/* 批量操作按钮组 - 仅当有选中项时显示 */}
          {selectedRowKeys.length > 0 && (
            <>
              <span style={{ color: '#999', marginLeft: 8 }}>
                已选择 {selectedRowKeys.length} 项
              </span>
              <Button 
                danger
                icon={<DeleteOutlined />} 
                onClick={handleBatchDelete}
                loading={batchRunning}
              >
                批量删除
              </Button>
              <Button 
                icon={<ThunderboltOutlined />} 
                onClick={handleBatchRun}
                loading={batchRunning}
                type="primary"
              >
                批量运行
              </Button>
              <Dropdown menu={{
                items: [
                  { key: 'activate', label: '批量激活', icon: <CheckCircleOutlined /> },
                  { key: 'deactivate', label: '批量停用', icon: <CloseCircleOutlined /> },
                ],
                onClick: ({ key }: { key: string }) => handleBatchToggleStatus(key === 'activate'),
              }}>
                <Button icon={<Switch />}>
                  批量状态
                </Button>
              </Dropdown>
            </>
          )}
        </Space>
      </Card>

      {/* 配置列表表格 */}
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={configs}
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={editingConfig ? '编辑聚类配置' : '新建聚类配置'}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={700}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            algorithm: 'k-means',
            isActive: true,
          }}
        >
          <Form.Item
            name="configName"
            label="配置名称"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="例如：客户分群配置 V1" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入配置描述" />
          </Form.Item>

          <Form.Item
            name="algorithm"
            label="算法类型"
            rules={[{ required: true, message: '请选择算法类型' }]}
          >
            <Select>
              <Option value="k-means">K-Means（适合球形簇）</Option>
              <Option value="dbscan">DBSCAN（适合任意形状簇）</Option>
              <Option value="hierarchical">层次聚类（适合小数据集）</Option>
            </Select>
          </Form.Item>

          <Card title="算法参数" size="small" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="k" label="K 值（簇数量）" tooltip="仅 K-Means 使用">
                  <Input min={2} max={20} placeholder="默认：5" type="number" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="maxIterations" label="最大迭代次数" tooltip="仅 K-Means 使用">
                  <Input min={10} max={1000} placeholder="默认：100" type="number" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="minSupport" label="最小支持度" tooltip="仅 DBSCAN 使用">
                  <Input min={0.01} max={1} step={0.01} placeholder="默认：0.1" type="number" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="minConfidence" label="最小置信度" tooltip="仅关联规则使用">
                  <Input min={0.1} max={1} step={0.05} placeholder="默认：0.6" type="number" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.Item name="isActive" label="是否激活" valuePropName="checked" style={{ marginTop: 16 }}>
            <Switch checkedChildren="开" unCheckedChildren="关" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 模板选择弹窗 */}
      <Modal
        title="从模板创建配置"
        visible={templateVisible}
        onCancel={() => setTemplateVisible(false)}
        footer={null}
        width={900}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: '#666' }}>选择一个预设模板快速创建配置：</p>
        </div>
        <Row gutter={[16, 16]}>
          {configTemplates.map((template) => (
            <Col span={12} key={template.id}>
              <Card
                hoverable
                onClick={() => handleCreateFromTemplate(template)}
                style={{ 
                  cursor: 'pointer',
                  border: template.recommended ? '2px solid #52c41a' : undefined,
                }}
                actions={[
                  <Button 
                    type="primary" 
                    size="small" 
                    block
                    icon={<PlusOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateFromTemplate(template);
                    }}
                  >
                    使用此模板
                  </Button>,
                ]}
              >
                <Card.Meta
                  title={
                    <Space>
                      <span>{template.name}</span>
                      {template.recommended && (
                        <Tag color="green">推荐</Tag>
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <div style={{ fontSize: 13, marginBottom: 8 }}>{template.description}</div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ fontSize: 12 }}>
                        <div><strong>算法:</strong> {template.algorithm}</div>
                        <div><strong>参数:</strong></div>
                        <ul style={{ margin: '4px 0', paddingLeft: 20, fontSize: 11 }}>
                          {Object.entries(template.parameters).map(([key, value]) => (
                            <li key={key}>{key}: {String(value)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
        <Divider />
        <div style={{ textAlign: 'center', color: '#999', fontSize: 13 }}>
          💡 提示：您也可以先使用模板创建，然后在编辑界面自定义参数
        </div>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="配置详情"
        visible={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {selectedConfig && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="配置 ID">{selectedConfig.id}</Descriptions.Item>
            <Descriptions.Item label="配置名称">{selectedConfig.configName}</Descriptions.Item>
            <Descriptions.Item label="算法类型" span={2}>
              <Tag>{selectedConfig.algorithm}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>
              {selectedConfig.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selectedConfig.isActive ? 'success' : 'default'}>
                {selectedConfig.isActive ? '活跃' : '停用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="运行次数">{selectedConfig.runCount}次</Descriptions.Item>
            <Descriptions.Item label="平均轮廓系数">
              {selectedConfig.avgSilhouetteScore?.toFixed(4) || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="最后运行时间">
              {selectedConfig.lastRunAt ? dayjs(selectedConfig.lastRunAt).format('YYYY-MM-DD HH:mm:ss') : '未运行'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {dayjs(selectedConfig.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间" span={2}>
              {dayjs(selectedConfig.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="算法参数" span={2}>
              <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                {JSON.stringify(selectedConfig.parameters, null, 2)}
              </pre>
            </Descriptions.Item>
            {selectedConfig.featureWeights && (
              <Descriptions.Item label="特征权重" span={2}>
                <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                  {JSON.stringify(selectedConfig.featureWeights, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ClusteringConfigManagement;
