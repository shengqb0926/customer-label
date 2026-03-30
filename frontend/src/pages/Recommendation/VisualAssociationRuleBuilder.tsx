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
  Divider,
  Alert,
  Tag,
  Descriptions,
} from 'antd';
import {
  SaveOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { AssociationConfig } from '@/services/rule';
import { associationConfigService } from '@/services/rule';

const { Title, Text } = Typography;
const { Option } = Select;

interface VisualRuleBuilderProps {
  config?: AssociationConfig;
  onSuccess?: () => void;
}

// 算法选项定义
const ALGORITHM_OPTIONS = [
  {
    value: 'apriori',
    label: 'Apriori',
    description: '经典算法，适合中小数据集',
    color: 'blue',
    icon: '🎯',
  },
  {
    value: 'fpgrowth',
    label: 'FP-Growth',
    description: '高效算法，适合大数据集',
    color: 'green',
    icon: '⚡',
  },
  {
    value: 'eclat',
    label: 'Eclat',
    description: '垂直数据格式，内存友好',
    color: 'purple',
    icon: '💾',
  },
];

// 参数配置模板
const PARAMETER_TEMPLATES: Record<string, any> = {
  'apriori': {
    minSupport: { min: 0.01, max: 1, step: 0.01, default: 0.1, label: '最小支持度' },
    minConfidence: { min: 0.1, max: 1, step: 0.05, default: 0.6, label: '最小置信度' },
    minLift: { min: 1, max: 5, step: 0.1, default: 1.0, label: '最小提升度' },
    maxItems: { min: 2, max: 10, step: 1, default: 5, label: '最大项集大小' },
  },
  'fpgrowth': {
    minSupport: { min: 0.01, max: 1, step: 0.01, default: 0.05, label: '最小支持度' },
    minConfidence: { min: 0.1, max: 1, step: 0.05, default: 0.7, label: '最小置信度' },
    minLift: { min: 1, max: 5, step: 0.1, default: 1.2, label: '最小提升度' },
    maxItems: { min: 2, max: 10, step: 1, default: 6, label: '最大项集大小' },
  },
  'eclat': {
    minSupport: { min: 0.01, max: 1, step: 0.01, default: 0.1, label: '最小支持度' },
    minConfidence: { min: 0.1, max: 1, step: 0.05, default: 0.6, label: '最小置信度' },
    minLift: { min: 1, max: 5, step: 0.1, default: 1.0, label: '最小提升度' },
    maxDepth: { min: 2, max: 10, step: 1, default: 5, label: '最大搜索深度' },
  },
};

const VisualAssociationRuleBuilder: React.FC<VisualRuleBuilderProps> = ({ config, onSuccess }) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(config?.algorithm || 'apriori');
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
        await associationConfigService.updateConfig(config.id, values);
        message.success('配置更新成功！');
      } else {
        // 创建新配置
        await associationConfigService.createConfig(values);
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
    { title: '选择算法', description: '根据数据规模选择合适的关联规则算法', icon: <ThunderboltOutlined /> },
    { title: '配置参数', description: '调整支持度、置信度等关键参数', icon: <SettingOutlined /> },
    { title: '选择项集', description: '选择要分析的商品或项目集合', icon: <LinkOutlined /> },
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
          <Card title="🎯 选择关联规则算法" size="small">
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
                    <li><strong>Apriori:</strong> 经典算法，原理简单，适合中小数据集，需要多次扫描数据库</li>
                    <li><strong>FP-Growth:</strong> 基于 FP 树，只需扫描两次数据库，适合大数据集</li>
                    <li><strong>Eclat:</strong> 使用垂直数据格式，内存占用小，适合稀疏数据</li>
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
                <Alert
                  message="📊 参数说明"
                  description={
                    <ul>
                      <li><strong>最小支持度：</strong> 项集出现的最低频率阈值（越低发现越多规则）</li>
                      <li><strong>最小置信度：</strong> 规则的可信程度（越高规则越可靠）</li>
                      <li><strong>最小提升度：</strong> 规则的相关性强度（>1 表示正相关）</li>
                    </ul>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                {/* Apriori 和 FP-Growth 参数 */}
                {(selectedAlgorithm === 'apriori' || selectedAlgorithm === 'fpgrowth') && (
                  <>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="最小支持度"
                          name="minSupport"
                          initialValue={PARAMETER_TEMPLATES[selectedAlgorithm].minSupport.default}
                          rules={[{ required: true }]}
                        >
                          <Slider
                            min={PARAMETER_TEMPLATES[selectedAlgorithm].minSupport.min}
                            max={PARAMETER_TEMPLATES[selectedAlgorithm].minSupport.max}
                            step={PARAMETER_TEMPLATES[selectedAlgorithm].minSupport.step}
                            marks={{
                              0: '0',
                              0.5: '0.5',
                              1: '1',
                            }}
                            tooltipFormatter={(value) => `${value.toFixed(2)}`}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="最小置信度"
                          name="minConfidence"
                          initialValue={PARAMETER_TEMPLATES[selectedAlgorithm].minConfidence.default}
                          rules={[{ required: true }]}
                        >
                          <Slider
                            min={PARAMETER_TEMPLATES[selectedAlgorithm].minConfidence.min}
                            max={PARAMETER_TEMPLATES[selectedAlgorithm].minConfidence.max}
                            step={PARAMETER_TEMPLATES[selectedAlgorithm].minConfidence.step}
                            marks={{
                              0: '0',
                              0.5: '0.5',
                              1: '1',
                            }}
                            tooltipFormatter={(value) => `${value.toFixed(2)}`}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="最小提升度"
                          name="minLift"
                          initialValue={PARAMETER_TEMPLATES[selectedAlgorithm].minLift.default}
                          rules={[{ required: true }]}
                        >
                          <InputNumber
                            min={PARAMETER_TEMPLATES[selectedAlgorithm].minLift.min}
                            max={PARAMETER_TEMPLATES[selectedAlgorithm].minLift.max}
                            step={PARAMETER_TEMPLATES[selectedAlgorithm].minLift.step}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="最大项集大小"
                          name="maxItems"
                          initialValue={PARAMETER_TEMPLATES[selectedAlgorithm].maxItems.default}
                          rules={[{ required: true }]}
                        >
                          <InputNumber
                            min={PARAMETER_TEMPLATES[selectedAlgorithm].maxItems.min}
                            max={PARAMETER_TEMPLATES[selectedAlgorithm].maxItems.max}
                            step={PARAMETER_TEMPLATES[selectedAlgorithm].maxItems.step}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                )}

                {/* Eclat 参数 */}
                {selectedAlgorithm === 'eclat' && (
                  <>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="最小支持度"
                          name="minSupport"
                          initialValue={PARAMETER_TEMPLATES['eclat'].minSupport.default}
                          rules={[{ required: true }]}
                        >
                          <Slider
                            min={PARAMETER_TEMPLATES['eclat'].minSupport.min}
                            max={PARAMETER_TEMPLATES['eclat'].minSupport.max}
                            step={PARAMETER_TEMPLATES['eclat'].minSupport.step}
                            marks={{
                              0: '0',
                              0.5: '0.5',
                              1: '1',
                            }}
                            tooltipFormatter={(value) => `${value.toFixed(2)}`}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="最小置信度"
                          name="minConfidence"
                          initialValue={PARAMETER_TEMPLATES['eclat'].minConfidence.default}
                          rules={[{ required: true }]}
                        >
                          <Slider
                            min={PARAMETER_TEMPLATES['eclat'].minConfidence.min}
                            max={PARAMETER_TEMPLATES['eclat'].minConfidence.max}
                            step={PARAMETER_TEMPLATES['eclat'].minConfidence.step}
                            marks={{
                              0: '0',
                              0.5: '0.5',
                              1: '1',
                            }}
                            tooltipFormatter={(value) => `${value.toFixed(2)}`}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="最小提升度"
                          name="minLift"
                          initialValue={PARAMETER_TEMPLATES['eclat'].minLift.default}
                          rules={[{ required: true }]}
                        >
                          <InputNumber
                            min={PARAMETER_TEMPLATES['eclat'].minLift.min}
                            max={PARAMETER_TEMPLATES['eclat'].minLift.max}
                            step={PARAMETER_TEMPLATES['eclat'].minLift.step}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="最大搜索深度"
                          name="maxDepth"
                          initialValue={PARAMETER_TEMPLATES['eclat'].maxDepth.default}
                          rules={[{ required: true }]}
                        >
                          <InputNumber
                            min={PARAMETER_TEMPLATES['eclat'].maxDepth.min}
                            max={PARAMETER_TEMPLATES['eclat'].maxDepth.max}
                            step={PARAMETER_TEMPLATES['eclat'].maxDepth.step}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                )}
              </Space>

              <Space style={{ marginTop: 16 }}>
                <Button onClick={() => setCurrentStep(0)}>上一步</Button>
                <Button type="primary" onClick={() => setCurrentStep(2)}>
                  下一步：选择项集
                </Button>
              </Space>
            </Form>
          </Card>
        )}

        {/* 步骤 3: 选择项集 */}
        {currentStep === 2 && (
          <Card title="🛒 商品/项目选择" size="small">
            <Alert
              message="💡 项集选择建议"
              description="选择要分析的商品或项目类别。建议选择相关的商品子集进行分析，避免全量计算导致性能问题。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Form form={form} layout="vertical">
              <Form.Item
                label="可用商品/项目"
                name="itemFields"
                rules={[{ required: true, message: '请至少选择一个商品或项目' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="选择要分析的商品或项目"
                  allowClear
                  maxTagCount="responsive"
                  showSearch
                >
                  <Option value="product_electronics">电子产品</Option>
                  <Option value="product_clothing">服装鞋帽</Option>
                  <Option value="product_books">图书音像</Option>
                  <Option value="product_home">家居用品</Option>
                  <Option value="product_food">食品饮料</Option>
                  <Option value="product_beauty">美妆个护</Option>
                  <Option value="product_sports">运动户外</Option>
                  <Option value="service_consultation">咨询服务</Option>
                  <Option value="service_maintenance">维修服务</Option>
                  <Option value="service_installation">安装服务</Option>
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
              <Descriptions.Item label="商品/项目">
                {(form.getFieldValue('itemFields') || []).map((f: string) => (
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

export default VisualAssociationRuleBuilder;
