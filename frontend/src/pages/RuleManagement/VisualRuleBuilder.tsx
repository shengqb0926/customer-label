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
  Divider,
  Typography,
  message,
  Steps,
  Collapse,
  Tag,
  Switch,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  SaveOutlined,
  EyeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { Rule, RuleExpression, LogicalOperator } from '@/services/rule';
import { useRuleStore } from '@/stores/ruleStore';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

interface ConditionGroup {
  id: string;
  conditions: Condition[];
  logicalOperator: LogicalOperator;
}

interface Condition {
  field: string;
  operator: string;
  value: any;
}

// 可用的字段列表（基于客户实体）
const AVAILABLE_FIELDS = [
  { label: '客户等级', value: 'level', type: 'select' },
  { label: '城市', value: 'city', type: 'select' },
  { label: '总资产', value: 'totalAssets', type: 'number' },
  { label: '年消费', value: 'annualConsumption', type: 'number' },
  { label: '风险等级', value: 'riskLevel', type: 'select' },
  { label: 'RFM 得分', value: 'rfmScore', type: 'number' },
  { label: '最近购买时间 (天)', value: 'recency', type: 'number' },
  { label: '购买频率 (次/年)', value: 'frequency', type: 'number' },
];

// 操作符选项
const OPERATORS = {
  select: [
    { label: '等于', value: '=' },
    { label: '不等于', value: '!=' },
    { label: '包含于', value: 'IN' },
  ],
  number: [
    { label: '等于', value: '=' },
    { label: '大于', value: '>' },
    { label: '小于', value: '<' },
    { label: '大于等于', value: '>=' },
    { label: '小于等于', value: '<=' },
    { label: '介于', value: 'BETWEEN' },
  ],
};

// 预设标签模板
const TAG_TEMPLATES = [
  { name: '高净值客户', color: 'gold', description: '总资产 > 500 万' },
  { name: '潜力客户', color: 'blue', description: 'RFM 得分 >= 10' },
  { name: '流失风险', color: 'red', description: '最近购买 > 90 天' },
  { name: '活跃客户', color: 'green', description: '最近购买 <= 30 天' },
  { name: '理财偏好', color: 'purple', description: '年消费 > 50 万且总资产 > 200 万' },
];

const VisualRuleBuilder: React.FC = () => {
  const [form] = Form.useForm();
  const { createRule, updateRule } = useRuleStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([
    { id: 'group-1', conditions: [], logicalOperator: 'AND' },
  ]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priority, setPriority] = useState<number>(5);
  const [enabled, setEnabled] = useState<boolean>(true);

  // 添加条件组
  const addConditionGroup = () => {
    const newGroup: ConditionGroup = {
      id: `group-${Date.now()}`,
      conditions: [],
      logicalOperator: 'AND',
    };
    setConditionGroups([...conditionGroups, newGroup]);
  };

  // 删除条件组
  const removeConditionGroup = (groupId: string) => {
    if (conditionGroups.length === 1) {
      message.warning('至少保留一个条件组');
      return;
    }
    setConditionGroups(conditionGroups.filter(g => g.id !== groupId));
  };

  // 添加条件到指定组
  const addCondition = (groupId: string) => {
    const newCondition: Condition = { field: '', operator: '', value: '' };
    setConditionGroups(
      conditionGroups.map(group =>
        group.id === groupId
          ? { ...group, conditions: [...group.conditions, newCondition] }
          : group
      )
    );
  };

  // 更新条件
  const updateCondition = (
    groupId: string,
    conditionIndex: number,
    field: keyof Condition,
    value: any
  ) => {
    const updated = conditionGroups.map(group => {
      if (group.id === groupId) {
        const newConditions = [...group.conditions];
        newConditions[conditionIndex] = { ...newConditions[conditionIndex], [field]: value };
        return { ...group, conditions: newConditions };
      }
      return group;
    });
    setConditionGroups(updated);
  };

  // 删除条件
  const removeCondition = (groupId: string, conditionIndex: number) => {
    setConditionGroups(
      conditionGroups.map(group =>
        group.id === groupId
          ? { ...group, conditions: group.conditions.filter((_, i) => i !== conditionIndex) }
          : group
      )
    );
  };

  // 复制条件组
  const duplicateGroup = (groupId: string) => {
    const groupToCopy = conditionGroups.find(g => g.id === groupId);
    if (groupToCopy) {
      const newGroup: ConditionGroup = {
        ...groupToCopy,
        id: `group-${Date.now()}`,
      };
      setConditionGroups([...conditionGroups, newGroup]);
    }
  };

  // 应用标签模板
  const applyTemplate = (templateName: string) => {
    const template = TAG_TEMPLATES.find(t => t.name === templateName);
    if (template) {
      form.setFieldsValue({
        name: template.name,
        description: template.description,
        tagColor: template.color,
      });
      message.success(`已应用模板：${templateName}`);
    }
  };

  // 构建表达式 AST
  const buildExpression = (): RuleExpression => {
    const groups = conditionGroups.map(group => {
      const conditions = group.conditions
        .filter(c => c.field && c.operator)
        .map(c => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
        }));

      if (conditions.length === 0) return null;

      if (conditions.length === 1) {
        return conditions[0];
      }

      return {
        operator: group.logicalOperator,
        operands: conditions,
      };
    }).filter(Boolean) as RuleExpression[];

    if (groups.length === 0) {
      throw new Error('请至少添加一个有效条件');
    }

    if (groups.length === 1) {
      return groups[0];
    }

    return {
      operator: 'AND',
      operands: groups,
    };
  };

  // 保存规则
  const handleSave = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();

      const expression = buildExpression();

      const ruleData: Partial<Rule> = {
        name: values.name,
        description: values.description,
        tagColor: values.tagColor,
        priority,
        enabled,
        expression,
        tags: selectedTags,
      };

      await createRule(ruleData);
      message.success('规则创建成功！');
      
      // 重置表单
      form.resetFields();
      setConditionGroups([{ id: 'group-1', conditions: [], logicalOperator: 'AND' }]);
      setSelectedTags([]);
      setPriority(5);
      setCurrentStep(0);
    } catch (error: any) {
      message.error(error.message || '保存失败');
    }
  };

  const steps = [
    { title: '基本信息', description: '填写规则名称和描述' },
    { title: '条件配置', description: '使用可视化编辑器构建规则条件' },
    { title: '标签设置', description: '选择推荐标签和优先级' },
    { title: '预览保存', description: '确认规则并保存' },
  ];

  return (
    <div>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 步骤条 */}
          <Steps current={currentStep} items={steps} />

          <Divider />

          {/* 步骤 1: 基本信息 */}
          {currentStep === 0 && (
            <Card title="📋 基本信息" size="small">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Form form={form} layout="vertical">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="规则名称"
                        name="name"
                        rules={[{ required: true, message: '请输入规则名称' }]}
                      >
                        <Input placeholder="例如：高净值客户识别规则" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="标签颜色" name="tagColor" initialValue="gold">
                        <Select>
                          <Select.Option value="gold">金色</Select.Option>
                          <Select.Option value="blue">蓝色</Select.Option>
                          <Select.Option value="green">绿色</Select.Option>
                          <Select.Option value="red">红色</Select.Option>
                          <Select.Option value="purple">紫色</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label="规则描述"
                    name="description"
                    rules={[{ required: true, message: '请输入规则描述' }]}
                  >
                    <TextArea rows={4} placeholder="描述规则的用途和适用场景..." />
                  </Form.Item>

                  <Form.Item label="快速应用模板">
                    <Select
                      placeholder="选择预设模板快速填充"
                      onChange={applyTemplate}
                      allowClear
                    >
                      {TAG_TEMPLATES.map(t => (
                        <Select.Option key={t.name} value={t.name}>
                          {t.name} - {t.description}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Form>

                <Button
                  type="primary"
                  onClick={() => setCurrentStep(1)}
                  icon={<ThunderboltOutlined />}
                >
                  下一步：条件配置
                </Button>
              </Space>
            </Card>
          )}

          {/* 步骤 2: 条件配置 */}
          {currentStep === 1 && (
            <Card
              title="⚙️ 条件配置"
              size="small"
              extra={
                <Button type="dashed" icon={<PlusOutlined />} onClick={addConditionGroup}>
                  添加条件组
                </Button>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {conditionGroups.map((group, groupIndex) => (
                  <Card
                    key={group.id}
                    size="small"
                    title={`条件组 ${groupIndex + 1}`}
                    bordered
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      {/* 组内逻辑操作符 */}
                      <Space>
                        <Text strong>组内关系:</Text>
                        <Select
                          value={group.logicalOperator}
                          onChange={(value) => {
                            const updated = conditionGroups.map(g =>
                              g.id === group.groupId ? { ...g, logicalOperator: value } : g
                            );
                            setConditionGroups(updated);
                          }}
                          style={{ width: 120 }}
                        >
                          <Select.Option value="AND">AND (与)</Select.Option>
                          <Select.Option value="OR">OR (或)</Select.Option>
                        </Select>
                      </Space>

                      {/* 条件列表 */}
                      {group.conditions.map((condition, condIndex) => (
                        <Space key={condIndex} align="baseline">
                          <Select
                            placeholder="选择字段"
                            value={condition.field}
                            onChange={(value) =>
                              updateCondition(group.id, condIndex, 'field', value)
                            }
                            style={{ width: 180 }}
                          >
                            {AVAILABLE_FIELDS.map(f => (
                              <Select.Option key={f.value} value={f.value}>
                                {f.label}
                              </Select.Option>
                            ))}
                          </Select>

                          <Select
                            placeholder="操作符"
                            value={condition.operator}
                            onChange={(value) =>
                              updateCondition(group.id, condIndex, 'operator', value)
                            }
                            style={{ width: 120 }}
                            disabled={!condition.field}
                          >
                            {condition.field && (
                              <>
                                {OPERATORS.select?.map(op => (
                                  <Select.Option key={op.value} value={op.value}>
                                    {op.label}
                                  </Select.Option>
                                ))}
                                {OPERATORS.number?.map(op => (
                                  <Select.Option key={op.value} value={op.value}>
                                    {op.label}
                                  </Select.Option>
                                ))}
                              </>
                            )}
                          </Select>

                          <Input
                            placeholder="值"
                            value={condition.value}
                            onChange={(e) =>
                              updateCondition(group.id, condIndex, 'value', e.target.value)
                            }
                            style={{ width: 200 }}
                            disabled={!condition.operator}
                          />

                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeCondition(group.id, condIndex)}
                          />
                        </Space>
                      ))}

                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => addCondition(group.id)}
                      >
                        添加条件
                      </Button>

                      {/* 组操作 */}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space>
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => duplicateGroup(group.id)}
                        >
                          复制此组
                        </Button>
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeConditionGroup(group.id)}
                          disabled={conditionGroups.length === 1}
                        >
                          删除此组
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                ))}

                <Space>
                  <Button onClick={() => setCurrentStep(0)}>上一步</Button>
                  <Button type="primary" onClick={() => setCurrentStep(2)}>
                    下一步：标签设置
                  </Button>
                </Space>
              </Space>
            </Card>
          )}

          {/* 步骤 3: 标签设置 */}
          {currentStep === 2 && (
            <Card title="🏷️ 标签设置" size="small">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <div>
                  <Text strong>推荐标签:</Text>
                  <Select
                    mode="tags"
                    style={{ width: '100%', marginTop: 8 }}
                    placeholder="输入或选择标签，按回车确认"
                    value={selectedTags}
                    onChange={setSelectedTags}
                  >
                    <Select.Option value="高净值客户">高净值客户</Select.Option>
                    <Select.Option value="潜力客户">潜力客户</Select.Option>
                    <Select.Option value="流失风险">流失风险</Select.Option>
                    <Select.Option value="活跃客户">活跃客户</Select.Option>
                    <Select.Option value="理财偏好">理财偏好</Select.Option>
                  </Select>
                </div>

                <div>
                  <Text strong>优先级 (1-10):</Text>
                  <InputNumber
                    min={1}
                    max={10}
                    value={priority}
                    onChange={(v) => setPriority(v || 5)}
                    style={{ marginLeft: 16 }}
                  />
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    数字越大优先级越高
                  </Text>
                </div>

                <div>
                  <Text strong>启用状态:</Text>
                  <Switch
                    checked={enabled}
                    onChange={setEnabled}
                    style={{ marginLeft: 16 }}
                    checkedChildren="启用"
                    unCheckedChildren="停用"
                  />
                </div>

                <Space>
                  <Button onClick={() => setCurrentStep(1)}>上一步</Button>
                  <Button type="primary" onClick={() => setCurrentStep(3)}>
                    下一步：预览保存
                  </Button>
                </Space>
              </Space>
            </Card>
          )}

          {/* 步骤 4: 预览保存 */}
          {currentStep === 3 && (
            <Card title="👁️ 预览与保存" size="small">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Card title="规则预览" size="small" bordered>
                  <Typography>
                    <Paragraph>
                      <strong>规则名称:</strong> {form.getFieldValue('name')}
                    </Paragraph>
                    <Paragraph>
                      <strong>描述:</strong> {form.getFieldValue('description')}
                    </Paragraph>
                    <Paragraph>
                      <strong>标签:</strong>{' '}
                      {selectedTags.map(tag => (
                        <Tag key={tag} color={form.getFieldValue('tagColor')}>
                          {tag}
                        </Tag>
                      ))}
                    </Paragraph>
                    <Paragraph>
                      <strong>优先级:</strong> {priority}
                    </Paragraph>
                    <Paragraph>
                      <strong>状态:</strong> {enabled ? '✅ 启用' : '❌ 停用'}
                    </Paragraph>
                    <Paragraph>
                      <strong>条件组数量:</strong> {conditionGroups.length}
                    </Paragraph>
                  </Typography>
                </Card>

                <Space>
                  <Button onClick={() => setCurrentStep(2)}>上一步</Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                  >
                    保存规则
                  </Button>
                </Space>
              </Space>
            </Card>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default VisualRuleBuilder;
