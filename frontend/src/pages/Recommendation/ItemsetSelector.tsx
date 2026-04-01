import React, { useState } from 'react';
import {
  Card,
  Tree,
  Button,
  Space,
  Typography,
  message,
  Transfer,
  Tag,
  Alert,
  Input,
} from 'antd';
import type { DataNode, TransferItem } from 'antd';
import {
  LinkOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface ItemsetSelectorProps {
  selectedItems?: string[];
  onChange?: (items: string[]) => void;
}

// 预定义的商品分类
const ITEM_CATEGORIES: DataNode[] = [
  {
    title: '电子产品',
    key: 'electronics',
    children: [
      { title: '手机', key: 'product_phone' },
      { title: '笔记本电脑', key: 'product_laptop' },
      { title: '平板电脑', key: 'product_tablet' },
      { title: '智能手表', key: 'product_watch' },
      { title: '耳机音响', key: 'product_audio' },
    ],
  },
  {
    title: '服装鞋帽',
    key: 'clothing',
    children: [
      { title: '男装', key: 'product_menswear' },
      { title: '女装', key: 'product_womenswear' },
      { title: '运动鞋', key: 'product_sneakers' },
      { title: '休闲鞋', key: 'product_casual_shoes' },
      { title: '箱包', key: 'product_bags' },
    ],
  },
  {
    title: '图书音像',
    key: 'books',
    children: [
      { title: '文学小说', key: 'book_fiction' },
      { title: '经济管理', key: 'book_business' },
      { title: '科技计算机', key: 'book_tech' },
      { title: '音像制品', key: 'book_media' },
    ],
  },
  {
    title: '家居用品',
    key: 'home',
    children: [
      { title: '家具', key: 'home_furniture' },
      { title: '家纺', key: 'home_textiles' },
      { title: '厨具', key: 'home_kitchen' },
      { title: '装饰品', key: 'home_decor' },
    ],
  },
  {
    title: '食品饮料',
    key: 'food',
    children: [
      { title: '零食', key: 'food_snacks' },
      { title: '饮料', key: 'food_beverages' },
      { title: '生鲜水果', key: 'food_fresh' },
      { title: '粮油调味', key: 'food_grains' },
    ],
  },
  {
    title: '美妆个护',
    key: 'beauty',
    children: [
      { title: '护肤品', key: 'beauty_skincare' },
      { title: '彩妆', key: 'beauty_makeup' },
      { title: '洗发水', key: 'beauty_shampoo' },
      { title: '香水', key: 'beauty_perfume' },
    ],
  },
  {
    title: '运动户外',
    key: 'sports',
    children: [
      { title: '健身器材', key: 'sports_equipment' },
      { title: '户外装备', key: 'sports_outdoor' },
      { title: '运动服饰', key: 'sports_clothing' },
    ],
  },
  {
    title: '服务类',
    key: 'service',
    children: [
      { title: '咨询服务', key: 'service_consultation' },
      { title: '维修服务', key: 'service_maintenance' },
      { title: '安装服务', key: 'service_installation' },
      { title: '培训服务', key: 'service_training' },
    ],
  },
];

// 扁平化商品列表用于 Transfer
const flattenItems = (nodes: DataNode[]): TransferItem[] => {
  let result: TransferItem[] = [];
  nodes.forEach(node => {
    if (node.children) {
      result = [...result, ...flattenItems(node.children)];
    } else {
      result.push({
        key: node.key as string,
        title: node.title as string,
      });
    }
  });
  return result;
};

const ItemsetSelector: React.FC<ItemsetSelectorProps> = ({ selectedItems = [], onChange }) => {
  const [targetKeys, setTargetKeys] = useState<string[]>(selectedItems);
  const [searchText, setSearchText] = useState('');

  // Transfer 数据转换
  const transferData = flattenItems(ITEM_CATEGORIES);

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

  // 过滤搜索
  const filteredTransferData = searchText
    ? transferData.filter(item =>
        (item.title as string).toLowerCase().includes(searchText.toLowerCase())
      )
    : transferData;

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Title level={4}>
            <LinkOutlined /> 商品/项目选择器
          </Title>
          <Text type="secondary">
            从左侧选择要分析的商品或项目，添加到右侧已选区域
          </Text>
        </div>

        <Alert
          message="💡 项集选择建议"
          description={
            <ul>
              <li>选择 <strong>5-15 个</strong> 相关商品进行分析效果最佳</li>
              <li>优先选择同一类别或互补类别的商品</li>
              <li>避免选择销量过低的商品（支持度不足）</li>
              <li>可以按场景组合选择（如"手机 + 耳机 + 保护壳"）</li>
            </ul>
          }
          type="info"
          showIcon
        />

        {/* 搜索框 */}
        <Input
          placeholder="🔍 搜索商品/项目"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        {/* 方式 1: 穿梭框选择 */}
        <Card title="🔄 穿梭框选择" size="small">
          <Transfer
            dataSource={filteredTransferData}
            titles={['可用商品', '已选商品']}
            targetKeys={targetKeys}
            onChange={handleTransferChange}
            render={renderTransferItem}
            listStyle={{ width: 300, height: 400 }}
            operations={['添加', '移除']}
            showSearch={false}
          />
        </Card>

        {/* 方式 2: 树形结构浏览 */}
        <Card title="🌳 商品分类浏览" size="small" extra={
          <Button
            type="primary"
            icon={<SwapOutlined />}
            onClick={() => {
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
            treeData={ITEM_CATEGORIES}
            onCheck={(checkedKeys) => {
              console.log('选中的商品:', checkedKeys);
            }}
          />
        </Card>

        {/* 已选商品汇总 */}
        {targetKeys.length > 0 && (
          <Card title="✅ 已选商品汇总" size="small">
            <Space wrap>
              {targetKeys.map(key => {
                const item = transferData.find(i => i.key === key);
                return (
                  <Tag key={key} color="green" icon={<CheckCircleOutlined />}>
                    {item?.title} ({key})
                  </Tag>
                );
              })}
            </Space>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                共选择 <strong>{targetKeys.length}</strong> 个商品/项目
              </Text>
            </div>
          </Card>
        )}
      </Space>
    </Card>
  );
};

export default ItemsetSelector;
