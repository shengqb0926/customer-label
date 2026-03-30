import React, { useState } from 'react';
import {
  Card,
  Tree,
  Button,
  Space,
  Typography,
  message,
  Transfer,
  Switch,
  Tag,
  Alert,
} from 'antd';
import type { DataNode, TransferItem } from 'antd';
import {
  BarChartOutlined,
  SwapOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface FeatureSelectorProps {
  selectedFeatures?: string[];
  onChange?: (features: string[]) => void;
}

// 预定义的特征分类
const FEATURE_CATEGORIES: DataNode[] = [
  {
    title: '资产特征',
    key: 'assets',
    children: [
      { title: '总资产', key: 'totalAssets' },
      { title: '流动资产', key: 'liquidAssets' },
      { title: '固定资产', key: 'fixedAssets' },
      { title: '投资资产', key: 'investmentAssets' },
    ],
  },
  {
    title: '消费特征',
    key: 'consumption',
    children: [
      { title: '年消费', key: 'annualConsumption' },
      { title: '月均消费', key: 'monthlyConsumption' },
      { title: '最近消费金额', key: 'lastConsumption' },
      { title: '消费频次', key: 'consumptionFrequency' },
    ],
  },
  {
    title: 'RFM 特征',
    key: 'rfm',
    children: [
      { title: 'RFM 总分', key: 'rfmScore' },
      { title: '最近购买时间', key: 'recency' },
      { title: '购买频率', key: 'frequency' },
      { title: '消费金额', key: 'monetary' },
    ],
  },
  {
    title: '风险特征',
    key: 'risk',
    children: [
      { title: '风险等级', key: 'riskLevel' },
      { title: '风险评分', key: 'riskScore' },
      { title: '违约概率', key: 'defaultProbability' },
    ],
  },
  {
    title: '人口统计特征',
    key: 'demographics',
    children: [
      { title: '年龄', key: 'age' },
      { title: '性别', key: 'gender' },
      { title: '城市等级', key: 'cityTier' },
      { title: '职业类别', key: 'occupation' },
    ],
  },
];

// 扁平化特征列表用于 Transfer
const flattenFeatures = (nodes: DataNode[]): TransferItem[] => {
  let result: TransferItem[] = [];
  nodes.forEach(node => {
    if (node.children) {
      result = [...result, ...flattenFeatures(node.children)];
    } else {
      result.push({
        key: node.key as string,
        title: node.title as string,
      });
    }
  });
  return result;
};

const FeatureSelector: React.FC<FeatureSelectorProps> = ({ selectedFeatures = [], onChange }) => {
  const [targetKeys, setTargetKeys] = useState<string[]>(selectedFeatures);

  // 渲染树节点
  const renderTreeNodes = (data: DataNode[]): React.ReactNode[] => {
    return data.map((node) => {
      if (node.children) {
        return (
          <TreeNode title={node.title} key={node.key}>
            {renderTreeNodes(node.children)}
          </TreeNode>
        );
      }
      return <TreeNode {...node} />;
    });
  };

  // Transfer 数据转换
  const transferData = flattenFeatures(FEATURE_CATEGORIES);

  // 处理 Transfer 变化
  const handleTransferChange = (newTargetKeys: string[]) => {
    setTargetKeys(newTargetKeys);
    onChange?.(newTargetKeys);
  };

  // 自定义 Transfer 渲染
  const renderTransferItem = (item: TransferItem) => {
    return (
      <Space>
        <Text>{item.title}</Text>
        <Tag color="blue">{item.key}</Tag>
      </Space>
    );
  };

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Title level={4}>
            <BarChartOutlined /> 特征字段选择器
          </Title>
          <Text type="secondary">
            从左侧选择要用于聚类的特征字段，添加到右侧已选区域
          </Text>
        </div>

        <Alert
          message="💡 特征选择建议"
          description={
            <ul>
              <li>选择 <strong>3-8 个</strong> 相关性较低的特征</li>
              <li>优先选择数值型特征，避免多重共线性</li>
              <li>分类特征需要先进行编码处理（One-Hot/Label Encoding）</li>
              <li>特征量纲差异大时，建议进行标准化/归一化</li>
            </ul>
          }
          type="info"
          showIcon
        />

        {/* 方式 1: 穿梭框选择 */}
        <Card title="🔄 穿梭框选择" size="small">
          <Transfer
            dataSource={transferData}
            titles={['可用特征', '已选特征']}
            targetKeys={targetKeys}
            onChange={handleTransferChange}
            render={renderTransferItem}
            listStyle={{ width: 300, height: 400 }}
            operations={['添加', '移除']}
            showSearch
            filterOption={(inputValue, option) =>
              (option!.title as string).indexOf(inputValue) > -1
            }
          />
        </Card>

        {/* 方式 2: 树形结构浏览 */}
        <Card title="🌳 特征分类浏览" size="small" extra={
          <Button
            type="primary"
            icon={<SwapOutlined />}
            onClick={() => {
              // 将当前树中选中的节点添加到已选特征
              message.info('树形浏览模式开发中...');
            }}
          >
            批量添加到已选
          </Button>
        }>
          <Tree
            checkable
            selectable={false}
            defaultExpandAll
            treeData={FEATURE_CATEGORIES}
            onCheck={(checkedKeys) => {
              console.log('选中的特征:', checkedKeys);
            }}
          />
        </Card>

        {/* 已选特征汇总 */}
        {targetKeys.length > 0 && (
          <Card title="✅ 已选特征汇总" size="small">
            <Space wrap>
              {targetKeys.map(key => {
                const feature = transferData.find(f => f.key === key);
                return (
                  <Tag key={key} color="green" icon={<CheckCircleOutlined />}>
                    {feature?.title} ({key})
                  </Tag>
                );
              })}
            </Space>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                共选择 <strong>{targetKeys.length}</strong> 个特征
              </Text>
            </div>
          </Card>
        )}
      </Space>
    </Card>
  );
};

export default FeatureSelector;
