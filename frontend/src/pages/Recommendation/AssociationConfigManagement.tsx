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
  Slider,
  Popconfirm,
  Dropdown,
  Checkbox,
  Divider,
  Tabs,
  Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  EyeOutlined,
  CopyOutlined,
  LinkOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  SettingOutlined,
  BarChartOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { associationConfigService } from '@/services/rule';
import type { AssociationConfig, CreateAssociationConfigDto, UpdateAssociationConfigDto } from '@/services/rule';
import VisualRuleBuilder from './VisualAssociationRuleBuilder';
import ItemsetSelector from './ItemsetSelector';
import AssociationExecutionMonitor from './AssociationExecutionMonitor';
import AssociationPerformanceAnalysis from './AssociationPerformanceAnalysis';

const { Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const AssociationConfigManagement: React.FC = () => {
  const [configs, setConfigs] = useState<AssociationConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [templateVisible, setTemplateVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AssociationConfig | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<AssociationConfig | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [algorithmFilter, setAlgorithmFilter] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>();
  // 批量操作相关状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);

  // 预设模板定义
  const configTemplates = [
    {
      id: 'template-1',
      name: '购物篮分析模板',
      description: '适用于商品关联推荐，发现经常一起购买的商品组合',
      algorithm: 'apriori' as const,
      parameters: {
        minSupport: 0.1,
        minConfidence: 0.6,
        minLift: 1.0,
        maxItems: 5,
      },
      recommended: true,
    },
    {
      id: 'template-2',
      name: '强关联规则挖掘模板',
      description: '高置信度要求，适合发现强关联关系',
      algorithm: 'apriori' as const,
      parameters: {
        minSupport: 0.15,
        minConfidence: 0.8,
        minLift: 1.5,
        maxItems: 4,
      },
      recommended: false,
    },
    {
      id: 'template-3',
      name: 'FP-Growth 高效模板',
      description: '使用 FP-Growth 算法，适合大数据集快速挖掘',
      algorithm: 'fpgrowth' as const,
      parameters: {
        minSupport: 0.05,
        minConfidence: 0.7,
        minLift: 1.2,
        maxItems: 6,
      },
      recommended: false,
    },
    {
      id: 'template-4',
      name: 'Eclat 垂直数据模板',
      description: '使用 Eclat 算法，适合密集数据集',
      algorithm: 'eclat' as const,
      parameters: {
        minSupport: 0.1,
        minConfidence: 0.65,
        minLift: 1.3,
        maxItems: 5,
      },
      recommended: false,
    },
  ];

  const columns: ColumnsType<AssociationConfig> = [
    {
      title: '配置名称',
      dataIndex: 'configName',
      key: 'configName',
      width: 200,
      render: (text, record) => (
        <a onClick={() => handleView(record)}>{text}</a>
      ),
    },
    {
      title: '算法类型',
      dataIndex: 'algorithm',
      key: 'algorithm',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (text, record) => (
        <Tag color={record.isActive ? 'success' : 'default'}>
          {record.isActive ? '活跃' : '停用'}
        </Tag>
      ),
    },
    {
      title: '运行次数',
      dataIndex: 'runCount',
      key: 'runCount',
      width: 100,
    },
    {
      title: '平均质量得分',
      dataIndex: 'avgQualityScore',
      key: 'avgQualityScore',
      width: 120,
      render: (text) => (text ? text.toFixed(4) : '-'),
    },
    {
      title: '最后运行时间',
      dataIndex: 'lastRunAt',
      key: 'lastRunAt',
      width: 150,
      render: (text) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '未运行'),
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (text, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleView(record)}>
            查看
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" icon={<CopyOutlined />} onClick={() => handleCopy(record)}>
            复制
          </Button>
          <Popconfirm
            title="确定要删除该配置吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
          <Button
            type="link"
            icon={<PlayCircleOutlined />}
            onClick={() => handleRun(record.id)}
            disabled={record.isActive === false}
          >
            运行
          </Button>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    fetchConfigs();
  }, []);

  // 【调试用】监听 configs 状态变化
  useEffect(() => {
    console.log('🔍 [DEBUG-Association] configs 状态变化:', configs);
    console.log('🔍 [DEBUG-Association] configs 长度:', configs?.length || 0);
    console.log('🔍 [DEBUG-Association] 活跃配置数:', configs?.filter(c => c.isActive).length || 0);
  }, [configs]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await associationConfigService.getConfigs();
      console.log('🔍 [DEBUG-Association] fetchConfigs - response:', response);
      console.log('🔍 [DEBUG-Association] fetchConfigs - response.data:', response?.data);
      
      // ✅ 修复：response 可能是数组或包含 data 属性的对象
      const configsData = Array.isArray(response) ? response : (response.data || []);
      console.log('🔍 [DEBUG-Association] fetchConfigs - 实际使用的数据:', configsData);
      console.log('🔍 [DEBUG-Association] fetchConfigs - 实际数据长度:', configsData.length);
      
      setConfigs(configsData);
      console.log('✅ [DEBUG-Association] fetchConfigs - 已调用 setConfigs');
    } catch (error: any) {
      console.error('❌ [DEBUG-Association] fetchConfigs - 错误:', error);
      message.error(`获取配置列表失败：${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // 这里可以添加搜索逻辑
    fetchConfigs();
  };

  const openModal = () => {
    setEditingConfig(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (config: AssociationConfig) => {
    setEditingConfig(config);
    form.setFieldsValue({
      configName: config.configName,
      description: config.description,
      algorithm: config.algorithm,
      minSupport: config.parameters.minSupport,
      minConfidence: config.parameters.minConfidence,
      minLift: config.parameters.minLift,
      maxItems: config.parameters.maxItems,
      isActive: config.isActive,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingConfig) {
        const updatedConfig: UpdateAssociationConfigDto = {
          configName: values.configName,
          description: values.description,
          algorithm: values.algorithm,
          parameters: {
            minSupport: values.minSupport,
            minConfidence: values.minConfidence,
            minLift: values.minLift,
            maxItems: values.maxItems,
          },
          featureWeights: values.featureWeights,
          isActive: values.isActive,
        };
        await associationConfigService.updateConfig(editingConfig.id, updatedConfig);
        message.success('配置更新成功');
      } else {
        const newDto: CreateAssociationConfigDto = {
          configName: values.configName,
          description: values.description,
          algorithm: values.algorithm,
          parameters: {
            minSupport: values.minSupport,
            minConfidence: values.minConfidence,
            minLift: values.minLift,
            maxItems: values.maxItems,
          },
          featureWeights: values.featureWeights,
          isActive: values.isActive,
        };
        await associationConfigService.createConfig(newDto);
        message.success('配置创建成功');
      }
      fetchConfigs();
      setModalVisible(false);
    } catch (error) {
      message.error('表单验证失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await associationConfigService.deleteConfig(id);
      message.success('配置删除成功');
      fetchConfigs();
    } catch (error) {
      message.error('配置删除失败');
    }
  };

  // 运行关联规则挖掘任务
  const handleRun = async (id: number) => {
    try {
      const result = await associationConfigService.runConfig(id);
      message.success(result?.message || '配置运行成功');
      fetchConfigs();
    } catch (error: any) {
      message.error(`运行失败：${error.message || '未知错误'}`);
    }
  };

  // 复制配置
  const handleCopy = async (config: AssociationConfig) => {
    try {
      const newDto: CreateAssociationConfigDto = {
        configName: `${config.configName} (副本)`,
        description: config.description,
        algorithm: config.algorithm,
        parameters: { ...config.parameters },
        isActive: false,
      };
      await associationConfigService.createConfig(newDto);
      message.success('复制成功');
      fetchConfigs();
    } catch (error: any) {
      message.error(`复制失败：${error.message || '未知错误'}`);
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
            associationConfigService.runConfig(Number(key))
          );
          
          const results = await Promise.allSettled(promises);
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          const failCount = results.filter(r => r.status === 'rejected').length;

          message.success(
            `批量运行完成！成功：${successCount}, 失败：${failCount}`
          );
          
          setSelectedRowKeys([]);
          fetchConfigs();
        } catch (error: any) {
          message.error(`批量运行失败：${error.message || '未知错误'}`);
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
            associationConfigService.deleteConfig(Number(key))
          );
          
          await Promise.all(promises);
          message.success('批量删除成功');
          
          setSelectedRowKeys([]);
          fetchConfigs();
        } catch (error: any) {
          message.error(`批量删除失败：${error.message || '未知错误'}`);
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
      const promises = selectedRowKeys.map((key) => {
        const config = configs.find(c => c.id === Number(key));
        if (!config) return Promise.resolve();
        
        const updateDto: UpdateAssociationConfigDto = {
          configName: config.configName,
          description: config.description,
          algorithm: config.algorithm,
          parameters: config.parameters,
          isActive: activate,
        };
        return associationConfigService.updateConfig(Number(key), updateDto);
      });
      
      await Promise.all(promises);
      message.success(activate ? '批量激活成功' : '批量停用成功');
      
      setSelectedRowKeys([]);
      fetchConfigs();
    } catch (error: any) {
      message.error(`操作失败：${error.message || '未知错误'}`);
    }
  };

  const handleView = (config: AssociationConfig) => {
    setSelectedConfig(config);
    setDetailVisible(true);
  };

  // Table 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record: AssociationConfig) => ({
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
      minSupport: template.parameters.minSupport,
      minConfidence: template.parameters.minConfidence,
      minLift: template.parameters.minLift,
      maxItems: template.parameters.maxItems,
      isActive: true,
    });
    setTemplateVisible(false);
    setModalVisible(true);
    message.success(`已应用模板：${template.name}`);
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总配置数"
              value={(configs || []).length}
              suffix="个"
              styles={{ content: { color: '#1890ff' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃配置"
              value={(configs || []).filter(c => c.isActive).length}
              suffix="个"
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总运行次数"
              value={(configs || []).reduce((sum, c) => sum + (c.runCount || 0), 0)}
              suffix="次"
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均质量"
              value={
                (configs || []).filter(c => c.avgQualityScore).length > 0
                  ? ((configs || []).reduce((sum, c) => sum + (c.avgQualityScore || 0), 0) /
                      (configs || []).filter(c => c.avgQualityScore).length).toFixed(3)
                  : '0.000'
              }
              styles={{ content: { color: '#722ed1' } }}
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
            <Option value="apriori">Apriori</Option>
            <Option value="fpgrowth">FP-Growth</Option>
            <Option value="eclat">Eclat</Option>
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
                onClick: ({ key }) => handleBatchToggleStatus(key === 'activate'),
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
        title={editingConfig ? '编辑关联规则配置' : '新建关联规则配置'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={750}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            algorithm: 'apriori',
            isActive: true,
            minSupport: 0.1,
            minConfidence: 0.6,
            minLift: 1.0,
            maxItems: 5,
          }}
        >
          <Form.Item
            name="configName"
            label="配置名称"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="例如：购物篮分析配置 V1" />
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
              <Option value="apriori">Apriori（经典算法，适合中小数据集）</Option>
              <Option value="fpgrowth">FP-Growth（高效，适合大数据集）</Option>
              <Option value="eclat">Eclat（垂直数据格式，适合密集数据）</Option>
            </Select>
          </Form.Item>

          <Card title="算法参数" size="small" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="minSupport" 
                  label="最小支持度" 
                  tooltip="项集出现的最小频率比例"
                >
                  <Slider min={0.01} max={1} step={0.01} marks={{ 0.01: '0.01', 0.5: '0.5', 1: '1' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="minConfidence" 
                  label="最小置信度" 
                  tooltip="规则成立的最小概率"
                >
                  <Slider min={0.1} max={1} step={0.05} marks={{ 0.1: '0.1', 0.5: '0.5', 1: '1' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="minLift" 
                  label="最小提升度" 
                  tooltip="规则的有效性指标（>1 表示正相关）"
                >
                  <Input min={0.5} max={5} step={0.1} placeholder="默认：1.0" type="number" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="maxItems" 
                  label="最大项集大小" 
                  tooltip="频繁项集包含的最大项数"
                >
                  <Input min={2} max={10} placeholder="默认：5" type="number" />
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
        open={templateVisible}
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
        open={detailVisible}
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
            <Descriptions.Item label="平均质量得分">
              {selectedConfig.avgQualityScore?.toFixed(4) || '-'}
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

export default AssociationConfigManagement;