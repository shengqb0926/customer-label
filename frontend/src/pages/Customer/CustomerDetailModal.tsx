import React, { useState, useEffect } from 'react';
import { Modal, Descriptions, Tag, Spin, Alert } from 'antd';
import { customerService, type Customer } from '@/services';

interface CustomerDetailModalProps {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ open, customer, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayCustomer, setDisplayCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (customer && open) {
      setLoading(true);
      // 直接传入 customer，不需要再次获取
      setDisplayCustomer(customer);
      setLoading(false);
    }
  }, [customer, open]);

  if (!customer) return null;

  const levelColorMap: Record<string, string> = {
    BRONZE: 'brown',
    SILVER: 'gray',
    GOLD: 'gold',
  };

  const riskLevelColorMap: Record<string, string> = {
    LOW: 'green',
    MEDIUM: 'orange',
    HIGH: 'red',
  };

  return (
    <Modal
      title={`客户详情 - ${customer.name}`}
      open={open}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnHidden  // 修复 antd 警告
    >
      {loading ? (
        <Spin description="Loading..." />
      ) : error ? (
        <Alert title={error} type="error" />
      ) : (
        <Descriptions bordered column={2} size="middle">
          <Descriptions.Item label="客户 ID">{customer.id}</Descriptions.Item>
          <Descriptions.Item label="客户名称">{customer.name}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{customer.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="手机号">{customer.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="性别">
            {customer.gender === 'M' ? '男' : customer.gender === 'F' ? '女' : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="年龄">{customer.age || '-'}</Descriptions.Item>
          <Descriptions.Item label="省份">{customer.province || '-'}</Descriptions.Item>
          <Descriptions.Item label="城市">{customer.city || '-'}</Descriptions.Item>
          <Descriptions.Item label="详细地址" span={2}>
            {customer.address || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="总资产">
            ¥{(customer.totalAssets || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </Descriptions.Item>
          <Descriptions.Item label="月收入">
            ¥{(customer.monthlyIncome || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </Descriptions.Item>
          <Descriptions.Item label="年消费">
            ¥{(customer.annualSpend || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </Descriptions.Item>
          <Descriptions.Item label="订单数量">{customer.orderCount}</Descriptions.Item>
          <Descriptions.Item label="产品数量">{customer.productCount}</Descriptions.Item>
          <Descriptions.Item label="注册天数">{customer.registerDays} 天</Descriptions.Item>
          <Descriptions.Item label="距上次登录">{customer.lastLoginDays} 天</Descriptions.Item>
          <Descriptions.Item label="客户等级">
            <Tag color={levelColorMap[customer.level]}>{customer.level}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="风险等级">
            <Tag color={riskLevelColorMap[customer.riskLevel]}>{customer.riskLevel}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={customer.isActive ? 'green' : 'red'}>
              {customer.isActive ? '活跃' : '不活跃'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>
            {customer.remarks || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(customer.createdAt).toLocaleString('zh-CN')}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {new Date(customer.updatedAt).toLocaleString('zh-CN')}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  );
};

export default CustomerDetailModal;
