import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, message, Radio, Button } from 'antd';
import type { Customer, Gender, CustomerLevel, RiskLevel } from '@/services';
import { customerService } from '@/services';

const { Option } = Select;
const { TextArea } = Input;

interface CreateCustomerModalProps {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  open,
  customer,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const isEdit = !!customer;

  useEffect(() => {
    if (customer && open) {
      form.setFieldsValue({
        ...customer,
        gender: customer.gender,
        level: customer.level,
        riskLevel: customer.riskLevel,
      });
    } else if (!customer && open) {
      form.resetFields();
    }
  }, [customer, open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (isEdit && customer) {
        await customerService.update(customer.id, values);
        message.success('更新成功');
      } else {
        await customerService.create(values);
        message.success('创建成功');
      }
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证失败
        return;
      }
      message.error(isEdit ? '更新失败：' + error.message : '创建失败：' + error.message);
    }
  };

  return (
    <Modal
      title="创建客户"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden  // 修复 antd 警告
      width={720}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          gender: 'M',
          level: 'BRONZE',
          riskLevel: 'LOW',
          isActive: true,
          orderCount: 0,
          productCount: 0,
          registerDays: 0,
          lastLoginDays: 0,
        }}
      >
        <Form.Item
          label="客户名称"
          name="name"
          rules={[{ required: true, message: '请输入客户名称' }]}
        >
          <Input placeholder="请输入客户名称" />
        </Form.Item>

        <Form.Item label="邮箱" name="email" rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}>
          <Input placeholder="请输入邮箱" />
        </Form.Item>

        <Form.Item label="手机号" name="phone">
          <Input placeholder="请输入手机号" maxLength={20} />
        </Form.Item>

        <Form.Item label="性别" name="gender">
          <Radio.Group>
            <Radio value="M">男</Radio>
            <Radio value="F">女</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="年龄" name="age">
          <InputNumber min={1} max={150} style={{ width: '100%' }} placeholder="请输入年龄" />
        </Form.Item>

        <Form.Item label="省份" name="province">
          <Input placeholder="请输入省份" />
        </Form.Item>

        <Form.Item label="城市" name="city">
          <Input placeholder="请输入城市" />
        </Form.Item>

        <Form.Item label="详细地址" name="address">
          <TextArea rows={3} placeholder="请输入详细地址" />
        </Form.Item>

        <Form.Item label="总资产" name="totalAssets">
          <InputNumber
            min={0}
            precision={2}
            style={{ width: '100%' }}
            placeholder="请输入总资产"
            formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          />
        </Form.Item>

        <Form.Item label="月收入" name="monthlyIncome">
          <InputNumber
            min={0}
            precision={2}
            style={{ width: '100%' }}
            placeholder="请输入月收入"
            formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          />
        </Form.Item>

        <Form.Item label="年消费" name="annualSpend">
          <InputNumber
            min={0}
            precision={2}
            style={{ width: '100%' }}
            placeholder="请输入年消费"
            formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          />
        </Form.Item>

        <Form.Item label="订单数量" name="orderCount">
          <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入订单数量" />
        </Form.Item>

        <Form.Item label="产品数量" name="productCount">
          <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入产品数量" />
        </Form.Item>

        <Form.Item label="注册天数" name="registerDays">
          <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入注册天数" />
        </Form.Item>

        <Form.Item label="距上次登录天数" name="lastLoginDays">
          <InputNumber min={0} style={{ width: '100%' }} placeholder="请输入距上次登录天数" />
        </Form.Item>

        <Form.Item label="客户等级" name="level">
          <Select>
            <Option value="BRONZE">青铜</Option>
            <Option value="SILVER">白银</Option>
            <Option value="GOLD">黄金</Option>
          </Select>
        </Form.Item>

        <Form.Item label="风险等级" name="riskLevel">
          <Select>
            <Option value="LOW">低</Option>
            <Option value="MEDIUM">中</Option>
            <Option value="HIGH">高</Option>
          </Select>
        </Form.Item>

        <Form.Item label="状态" name="isActive" valuePropName="checked">
          <Radio.Group>
            <Radio value={true}>活跃</Radio>
            <Radio value={false}>不活跃</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="备注" name="remarks">
          <TextArea rows={3} placeholder="请输入备注信息" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateCustomerModal;
