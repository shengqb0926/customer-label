import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Row,
  Col,
  Typography,
  message,
  Steps,
  InputNumber,
  Slider,
  Switch,
  Divider,
  Alert,
  Tag,
} from 'antd';
import {
  SaveOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { ClusteringConfig } from '@/services/rule';
import { clusteringConfigService } from '@/services/rule';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface VisualConfigBuilderProps {
  config?: ClusteringConfig;
  onSuccess?: () => void;
}

// 算法选项定义
const ALGORITHM_OPTIONS = [
  {
    value: 'k-means',
    label: 'K-Means',
    description: '基于距离的划分方法，适合球形簇',
    color: 'blue',
    icon: '🎯',
  },
  {
    value: 'dbscan',
    label: 'DBSCAN',
    description: '基于密度的聚类，可发现任意形状',
    color: 'green',
    icon: '🔍',
  },
  {
    value: 'hierarchical',
    label: '层次聚类',
    description: '树状结构分析，支持多层次',
    color: 'purple',
    icon: '🌳',
  },
];

// 参数配置模板
const PARAMETER_TEMPLATES: Record<string, any> = {
  'k-means': {
    k: { min: 2, max: 20, step: 1, default: 5, label: '簇数量 (K)' },
    maxIterations: { min: 50, max: 500, step: 10, default: 100, label: '最大迭代次数' },
    initMethod: { options: ['random', 'k-means++'], default: 'k-means++', label: '初始化方法' },
  },
  'dbscan': {
    eps: { min: 0.1, max: 5, step: 0.1, default: 0.5, label: '邻域半径 (ε)' },
    minSamples: { min: 2, max: 20, step: 1, default: 5, label: '最小样本数' },
    metric: { options: ['euclidean', 'manhattan', 'cosine'], default: 'euclidean', label: '距离度量' },
  },
  'hierarchical': {
    nClusters: { min: 2, max: 20, step: 1, default: 5, label: '簇数量' },
    linkage: { options: ['ward', 'complete', 'average', 'single'], default: 'ward', label: '连接方式' },
    metric: { options: ['euclidean', 'manhattan', 'cosine'], default: 'euclidean', label: '距离度量' },
  },
};

const VisualConfigBuilder: React.FC<VisualConfigBuilderProps> = ({ config, onSuccess }) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(config?.algorithm || 'k-means');
  const [saving, setSaving] = useState(false);

  // 处理算法切换
  const handleAlgorithmChange = (value: string) => {
    setSelectedAlgorithm(value);
    form.setFieldsValue({ algorithm: value });
    // 重置参数为默认值
    const template = PARAMETER_TEMPLATES[value];
    const defaultParams: Record<string, any> = {};
    Object.keys(template).forEach(key => {
      defaultParams[key] = template[key].default;
    });
    form.setFieldsValue(defaultParams);
  };

  // 保存配置
  const handleSave = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      
      setSaving(true);
      
      if (config) {
        // 更新现有配置
        await clusteringConfigService.updateConfig(config.id, values);
        message.success('配置更新成功！');
      } else {
        // 创建新配置
        await clusteringConfigService.createConfig(values);
        message.success('配置创建成功！');
      }
      
      onSuccess?.();
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { title: '选择算法', description: '根据业务场景选择合适的聚类算法', icon: <ThunderboltOutlined /> },
    { title: '配置参数', description: '调整算法参数以优化聚类效果', icon: <SettingOutlined /> },
    { title: '特征选择', description: '选择用于聚类的特征字段', icon: <BarChartOutlined /> },
    { title: '预览保存', description: '确认配置信息并保存', icon: <SaveOutlined /> },
  ];

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 步骤条 */}
        <Steps current={currentStep} items={steps} />

        <Divider />

        {/* 步骤 1: 选择算法 */}
        {currentStep === 0 && (
          <Card title="🎯 选择聚类算法" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Row gutter={[16, 16]}>
                {ALGORITHM_OPTIONS.map((algo) => (
                  <Col span={8} key={algo.value}>
                    <Card
                      hoverable
                      onClick={() => handleAlgorithmChange(algo.value)}
                      style={{
                        border: selectedAlgorithm === algo.value ? '2px solid #1890ff' : undefined,
                        cursor: 'pointer',
                      }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} align="center">
                        <div style={{ fontSize: 48 }}>{algo.icon}</div>
                        <Title level={5}>{algo.label}</Title>
                        <Text type="secondary">{algo.description}</Text>
                        {selectedAlgorithm === algo.value && (
                          <Tag color="blue">已选择</Tag>
                        )}
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>

              <Alert
                message="💡 算法选择建议"
                description={
                  <ul>
                    <li><strong>K-Means:</strong> 适合数据分布均匀、簇呈球形的场景，计算效率高</li>
                    <li><strong>DBSCAN:</strong> 适合存在噪声、簇形状不规则的场景</li>
                    <li><strong>层次聚类:</strong> 适合需要理解层次结构、小数据集的场景</li>
                  </ul>
                }
                type="info"
                showIcon
              />

              <Button type="primary" onClick={() => setCurrentStep(1)}>
                下一步：配置参数
              </Button>
            </Space>
          </Card>
        )}

        {/* 步骤 2: 配置参数 */}
        {currentStep === 1 && (
          <Card title="⚙️ 算法参数配置" size="small">
            <Form form={form} layout="vertical">
              <Form.Item name="algorithm" initialValue={selectedAlgorithm} hidden>
                <Input />
              </Form.Item>

              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* K-Means 参数 */}
                {selectedAlgorithm === 'k-means' && (
                  <>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="簇数量 (K)"
                          name="k"
                          initialValue={PARAMETER_TEMPLATES['k-means'].k.default}
                          rules={[{ required: true }]}
                        >
                          <Slider
                            min={PARAMETER_TEMPLATES['k-means'].k.min}
                            max={PARAMETER_TEMPLATES['k-means'].k.max}
                            step={PARAMETER_TEMPLATES['k-means'].k.step}
                            marks={{
                              [PARAMETER_TEMPLATES['k-means'].k.min]: PARAMETER_TEMPLATES['k-means'].k.min.toString(),
                              [PARAMETER_TEMPLATES['k-means'].k.max]: PARAMETER_TEMPLATES['k-means'].k.max.toString(),
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="最大迭代次数"
                          name="maxIterations"
                          initialValue={PARAMETER_TEMPLATES['k-means'].maxIterations.default}
                          rules={[{ required: true }]}
                        >
                          <InputNumber
                            min={PARAMETER_TEMPLATES['k-means'].maxIterations.min}
                            max={PARAMETER_TEMPLATES['k-means'].maxIterations.max}
                            step={PARAMETER_TEMPLATES['k-means'].maxIterations.step}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item
                      label="初始化方法"
                      name="initMethod"
                      initialValue={PARAMETER_TEMPLATES['k-means'].initMethod.default}
                      rules={[{ required: true }]}
                    >
                      <Select>
                        {PARAMETER_TEMPLATES['k-means'].initMethod.options.map((opt: string) => (
                          <Option key={opt} value={opt}>{opt}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </>
                )}

                {/* DBSCAN 参数 */}
                {selectedAlgorithm === 'dbscan' && (
                  <>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="邻域半径 (ε)"
                          name="eps"
                          initialValue={PARAMETER_TEMPLATES['dbscan'].eps.default}
                          rules={[{ required: true }]}
                        >
                          <Slider
                            min={PARAMETER_TEMPLATES['dbscan'].eps.min}
                            max={PARAMETER_TEMPLATES['dbscan'].eps.max}
                            step={PARAMETER_TEMPLATES['dbscan'].eps.step}
                            marks={{
                              [PARAMETER_TEMPLATES['dbscan'].eps.min]: PARAMETER_TEMPLATES['dbscan'].eps.min.toString(),
                              [PARAMETER_TEMPLATES['dbscan'].eps.max]: PARAMETER_TEMPLATES['dbscan'].eps.max.toString(),
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="最小样本数"
                          name="minSamples"
                          initialValue={PARAMETER_TEMPLATES['dbscan'].minSamples.default}
                          rules={[{ required: true }]}
                        >
                          <InputNumber
                            min={PARAMETER_TEMPLATES['dbscan'].minSamples.min}
                            max={PARAMETER_TEMPLATES['dbscan'].minSamples.max}
                            step={PARAMETER_TEMPLATES['dbscan'].minSamples.step}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item
                      label="距离度量"
                      name="metric"
                      initialValue={PARAMETER_TEMPLATES['dbscan'].metric.default}
                      rules={[{ required: true }]}
                    >
                      <Select>
                        {PARAMETER_TEMPLATES['dbscan'].metric.options.map((opt: string) => (
                          <Option key={opt} value={opt}>{opt}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </>
                )}

                {/* 层次聚类参数 */}
                {selectedAlgorithm === 'hierarchical' && (
                  <>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="簇数量"
                          name="nClusters"
                          initialValue={PARAMETER_TEMPLATES['hierarchical'].nClusters.default}
                          rules={[{ required: true }]}
                        >
                          <Slider
                            min={PARAMETER_TEMPLATES['hierarchical'].nClusters.min}
                            max={PARAMETER_TEMPLATES['hierarchical'].nClusters.max}
                            step={PARAMETER_TEMPLATES['hierarchical'].nClusters.step}
                            marks={{
                              [PARAMETER_TEMPLATES['hierarchical'].nClusters.min]: PARAMETER_TEMPLATES['hierarchical'].nClusters.min.toString(),
                              [PARAMETER_TEMPLATES['hierarchical'].nClusters.max]: PARAMETER_TEMPLATES['hierarchical'].nClusters.max.toString(),
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="连接方式"
                          name="linkage"
                          initialValue={PARAMETER_TEMPLATES['hierarchical'].linkage.default}
                          rules={[{ required: true }]}
                        >
                          <Select>
                            {PARAMETER_TEMPLATES['hierarchical'].linkage.options.map((opt: string) => (
                              <Option key={opt} value={opt}>{opt}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item
                      label="距离度量"
                      name="metric"
                      initialValue={PARAMETER_TEMPLATES['hierarchical'].metric.default}
                      rules={[{ required: true }]}
                    >
                      <Select>
                        {PARAMETER_TEMPLATES['hierarchical'].metric.options.map((opt: string) => (
                          <Option key={opt} value={opt}>{opt}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </>
                )}
              </Space>

              <Space style={{ marginTop: 16 }}>
                <Button onClick={() => setCurrentStep(0)}>上一步</Button>
                <Button type="primary" onClick={() => setCurrentStep(2)}>
                  下一步：特征选择
                </Button>
              </Space>
            </Form>
          </Card>
        )}

        {/* 步骤 3: 特征选择 */}
        {currentStep === 2 && (
          <Card title="📊 特征字段选择" size="small">
            <Alert
              message="💡 特征选择建议"
              description="选择数值型特征进行聚类。分类特征需要先进行编码处理。建议选择 3-8 个相关性较低的特征。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form form={form} layout="vertical">
              <Form.Item
                label="可用特征"
                name="featureFields"
                rules={[{ required: true, message: '请至少选择一个特征字段' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="选择用于聚类的特征字段"
                  allowClear
                  maxTagCount="responsive"
                >
                  <Option value="totalAssets">总资产</Option>
                  <Option value="annualConsumption">年消费</Option>
                  <Option value="rfmScore">RFM 得分</Option>
                  <Option value="recency">最近购买时间</Option>
                  <Option value="frequency">购买频率</Option>
                  <Option value="monetary">消费金额</Option>
                  <Option value="age">年龄</Option>
                  <Option value="riskLevel">风险等级</Option>
                </Select>
              </Form.Item>
            </Form>

            <Space style={{ marginTop: 16 }}>
              <Button onClick={() => setCurrentStep(1)}>上一步</Button>
              <Button type="primary" onClick={() => setCurrentStep(3)}>
                下一步：预览保存
              </Button>
            </Space>
          </Card>
        )}

        {/* 步骤 4: 预览保存 */}
        {currentStep === 3 && (
          <Card title="👁️ 预览与保存" size="small">
            <Descriptions column={1} bordered>
              <Descriptions.Item label="配置名称">
                {form.getFieldValue('configName') || '未命名配置'}
              </Descriptions.Item>
              <Descriptions.Item label="算法类型">
                <Tag color={ALGORITHM_OPTIONS.find(a => a.value === selectedAlgorithm)?.color}>
                  {ALGORITHM_OPTIONS.find(a => a.value === selectedAlgorithm)?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="特征字段">
                {(form.getFieldValue('featureFields') || []).map((f: string) => (
                  <Tag key={f}>{f}</Tag>
                ))}
              </Descriptions.Item>
              <Descriptions.Item label="算法参数">
                <pre style={{ margin: 0, fontSize: 12 }}>
                  {JSON.stringify(form.getFieldsValue(), null, 2)}
                </pre>
              </Descriptions.Item>
            </Descriptions>

            <Space style={{ marginTop: 16 }}>
              <Button onClick={() => setCurrentStep(2)}>上一步</Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
              >
                保存配置
              </Button>
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  );
};

export default VisualConfigBuilder;
