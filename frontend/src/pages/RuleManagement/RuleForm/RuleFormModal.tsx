import React from 'react';
import { Modal, Form, Input, Slider, Switch, Button, Space, message } from 'antd';
import type { Rule, CreateRuleDto, UpdateRuleDto } from '@/services/rule';
import ExpressionEditor from './ExpressionEditor';
import TagsSelector from './TagsSelector';

const { TextArea } = Input;

interface RuleFormModalProps {
  visible: boolean;
  rule: Rule | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const RuleFormModal: React.FC<RuleFormModalProps> = ({
  visible,
  rule,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();

  // 初始化表单数据
  React.useEffect(() => {
    if (rule) {
      // 后端返回的 ruleExpression 可能是字符串，需要解析
      const parsedExpression = typeof rule.ruleExpression === 'string' 
        ? JSON.parse(rule.ruleExpression) 
        : rule.ruleExpression;
      
      form.setFieldsValue({
        name: rule.ruleName,
        description: rule.description,
        expression: parsedExpression,
        priority: rule.priority,
        tags: rule.tagTemplate,
        isActive: rule.isActive,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        priority: 50,
        isActive: true,
      });
    }
  }, [rule]);

  // 处理提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
    } catch (error: any) {
      if (error.fields) {
        message.error('请完善表单信息');
      } else {
        message.error(error.message || '操作失败');
      }
    }
  };

  return (
    <Modal
      title={rule ? '编辑规则' : '新建规则'}
      open={visible}
      onCancel={onCancel}
      width={800}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          保存
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          priority: 50,
          isActive: true,
        }}
      >
        <Form.Item
          label="规则名称"
          name="name"
          rules={[
            { required: true, message: '请输入规则名称' },
            { max: 100, message: '规则名称不能超过 100 个字符' },
          ]}
        >
          <Input placeholder="请输入规则名称" />
        </Form.Item>

        <Form.Item
          label="规则描述"
          name="description"
          rules={[{ max: 500, message: '描述不能超过 500 个字符' }]}
        >
          <TextArea
            rows={3}
            placeholder="请输入规则描述"
            showCount
            maxLength={500}
          />
        </Form.Item>

        <Form.Item
          label="规则表达式"
          name="expression"
          rules={[{ required: true, message: '请配置规则表达式' }]}
        >
          <ExpressionEditor />
        </Form.Item>

        <Form.Item
          label="推荐标签"
          name="tags"
          rules={[
            { required: true, message: '请选择推荐标签' },
            { min: 1, type: 'array', message: '至少选择一个标签' },
          ]}
        >
          <TagsSelector />
        </Form.Item>

        <Form.Item
          label="优先级"
          name="priority"
          rules={[{ required: true, message: '请设置优先级' }]}
        >
          <Slider
            min={1}
            max={100}
            marks={{
              1: '低',
              25: '中低',
              50: '中',
              75: '中高',
              100: '高',
            }}
          />
        </Form.Item>

        <Form.Item
          label="状态"
          name="isActive"
          valuePropName="checked"
        >
          <Switch
            checkedChildren="活跃"
            unCheckedChildren="停用"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RuleFormModal;