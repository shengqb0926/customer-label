import React, { useState } from 'react';
import { Card, Button, Space, Select, Input, InputNumber, Popover, Tag, Divider, message } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ApiOutlined,
  FieldStringOutlined,
  NumberOutlined,
} from '@ant-design/icons';
import type { RuleExpression, BaseCondition } from '@/services/rule';

const { Option } = Select;

interface ExpressionEditorProps {
  value?: RuleExpression;
  onChange?: (value: RuleExpression) => void;
}

// 可用的字段列表（可根据实际业务扩展）
const AVAILABLE_FIELDS = [
  { label: '年龄', value: 'age', type: 'number' },
  { label: '城市', value: 'city', type: 'string' },
  { label: '总订单数', value: 'totalOrders', type: 'number' },
  { label: '总金额', value: 'totalAmount', type: 'number' },
  { label: '最近下单日期', value: 'lastOrderDate', type: 'date' },
  { label: '平均订单金额', value: 'avgOrderValue', type: 'number' },
  { label: '近 30 天订单数', value: 'ordersLast30Days', type: 'number' },
  { label: '近 90 天订单数', value: 'ordersLast90Days', type: 'number' },
];

// 运算符映射
const OPERATORS_MAP: Record<string, { label: string; showValue: boolean }> = {
  '>': { label: '大于', showValue: true },
  '<': { label: '小于', showValue: true },
  '>=': { label: '大于等于', showValue: true },
  '<=': { label: '小于等于', showValue: true },
  '==': { label: '等于', showValue: true },
  '!=': { label: '不等于', showValue: true },
  'between': { label: '介于', showValue: true },
  'in': { label: '包含在', showValue: true },
  'includes': { label: '包含', showValue: true },
  'startsWith': { label: '以...开始', showValue: true },
  'contains': { label: '包含', showValue: true },
  'endsWith': { label: '以...结束', showValue: true },
};

const ExpressionEditor: React.FC<ExpressionEditorProps> = ({ value, onChange }) => {
  const [expression, setExpression] = useState<RuleExpression>(
    value || { operator: 'AND', conditions: [] }
  );

  // 添加条件
  const addCondition = () => {
    const newCondition: BaseCondition = {
      field: '',
      operator: '>=',
      value: '',
    };
    const newExpression = {
      ...expression,
      conditions: [...expression.conditions, newCondition],
    };
    setExpression(newExpression);
    onChange?.(newExpression);
  };

  // 删除条件
  const removeCondition = (index: number) => {
    const newConditions = expression.conditions.filter((_, i) => i !== index);
    const newExpression = { ...expression, conditions: newConditions };
    setExpression(newExpression);
    onChange?.(newExpression);
  };

  // 更新条件
  const updateCondition = (index: number, updates: Partial<BaseCondition>) => {
    const newConditions = [...expression.conditions];
    newConditions[index] = { ...newConditions[index], ...updates } as BaseCondition;
    const newExpression = { ...expression, conditions: newConditions };
    setExpression(newExpression);
    onChange?.(newExpression);
  };

  // 切换逻辑运算符
  const toggleOperator = () => {
    const newOperator = expression.operator === 'AND' ? 'OR' : 'AND';
    const newExpression: RuleExpression = { ...expression, operator: newOperator };
    setExpression(newExpression);
    onChange?.(newExpression);
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <ApiOutlined />
          <span>规则表达式</span>
          <Button type="link" onClick={toggleOperator}>
            逻辑：{expression.operator}
          </Button>
        </Space>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={addCondition} size="small">
          添加条件
        </Button>
      }
    >
      {expression.conditions.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
          暂无条件，请点击"添加条件"按钮
        </div>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {expression.conditions.map((condition, index) => (
            <ConditionItem
              key={index}
              condition={condition as BaseCondition}
              onChange={(updates) => updateCondition(index, updates)}
              onDelete={() => removeCondition(index)}
              index={index}
            />
          ))}
        </Space>
      )}
    </Card>
  );
};

// 条件项组件 - 只处理 BaseCondition 类型
interface ConditionItemProps {
  condition: BaseCondition;
  onChange: (updates: Partial<BaseCondition>) => void;
  onDelete: () => void;
}

const ConditionItem: React.FC<ConditionItemProps & { index: number }> = ({
  condition,
  onChange,
  onDelete,
  index,
}) => {
  // 根据字段类型获取可用运算符
  const getFieldOperators = () => {
    const field = AVAILABLE_FIELDS.find(f => f.value === condition.field);
    if (!field) return Object.entries(OPERATORS_MAP);
    
    // 根据字段类型过滤运算符
    if (field.type === 'number') {
      return Object.entries(OPERATORS_MAP).filter(
        ([key]) => ['>', '<', '>=', '<=', '==', '!=', 'between'].includes(key)
      );
    } else if (field.type === 'string') {
      return Object.entries(OPERATORS_MAP).filter(
        ([key]) => ['==', '!=', 'in', 'startsWith', 'contains', 'endsWith'].includes(key)
      );
    }
    return Object.entries(OPERATORS_MAP);
  };

  return (
    <Card
      size="small"
      type="inner"
      extra={
        <Button type="text" danger icon={<DeleteOutlined />} onClick={onDelete} />
      }
    >
      <Space wrap align="start">
        {/* 字段选择 */}
        <Select
          placeholder="选择字段"
          value={condition.field || undefined}
          onChange={(value) => onChange({ field: value })}
          style={{ width: 180 }}
          allowClear
        >
          {AVAILABLE_FIELDS.map((field) => (
            <Option key={field.value} value={field.value}>
              {field.label}
            </Option>
          ))}
        </Select>

        {/* 运算符选择 */}
        <Select
          placeholder="运算符"
          value={condition.operator}
          onChange={(value) => onChange({ operator: value as BaseCondition['operator'] })}
          style={{ width: 120 }}
        >
          {getFieldOperators().map(([key, { label }]) => (
            <Option key={key} value={key}>
              {label}
            </Option>
          ))}
        </Select>

        {/* 值输入 */}
        {(() => {
          const field = AVAILABLE_FIELDS.find(f => f.value === condition.field);
          const operatorConfig = OPERATORS_MAP[condition.operator];
          
          if (!operatorConfig?.showValue) return null;
          
          if (field?.type === 'number') {
            return (
              <InputNumber
                placeholder="输入数值"
                value={condition.value}
                onChange={(value) => onChange({ value })}
                style={{ width: 150 }}
              />
            );
          } else {
            return (
              <Input
                placeholder="输入值"
                value={condition.value}
                onChange={(e) => onChange({ value: e.target.value })}
                style={{ width: 150 }}
              />
            );
          }
        })()}
      </Space>
    </Card>
  );
};

export default ExpressionEditor;
