import React, { useState } from 'react';
import { Select, Tag, Space, Input, Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { CustomTagProps } from 'rc-select/lib/interface';

interface TagsSelectorProps {
  value?: string[];
  onChange?: (value: string[]) => void;
}

// 预定义标签建议
const TAG_SUGGESTIONS = [
  '高价值客户',
  'VIP 客户',
  '流失风险',
  '需跟进',
  '潜力客户',
  '重点培养',
  '频繁购买者',
  '活跃客户',
  '新客户',
  '沉睡客户',
  '价格敏感',
  '品质导向',
];

const TagsSelector: React.FC<TagsSelectorProps> = ({ value = [], onChange }) => {
  const [tags, setTags] = useState<string[]>(value);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // 处理标签变化
  const handleTagChange = (newTags: string[]) => {
    setTags(newTags);
    onChange?.(newTags);
  };

  // 删除标签
  const handleClose = (removedTag: string) => {
    const newTags = tags.filter((tag) => tag !== removedTag);
    handleTagChange(newTags);
  };

  // 添加标签
  const addTag = () => {
    if (inputValue && !tags.includes(inputValue)) {
      const newTags = [...tags, inputValue];
      handleTagChange(newTags);
      setInputValue('');
      setInputVisible(false);
    }
  };

  // 自定义标签渲染
  const tagRender = (props: CustomTagProps) => {
    const { label, value, closable, onClose } = props;
    const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
    };

    return (
      <Tag
        color="blue"
        onMouseDown={onPreventMouseDown}
        closable={closable}
        onClose={onClose}
        style={{ marginRight: 3 }}
      >
        {label}
      </Tag>
    );
  };

  return (
    <Select
      mode="multiple"
      placeholder="选择或输入标签"
      value={tags}
      onChange={handleTagChange}
      tagRender={tagRender}
      style={{ width: '100%' }}
      popupRender={(menu) => (
        <>
          {menu}
          <div style={{ padding: '8px 16px' }}>
            <Divider style={{ margin: '4px 0' }} />
            {!inputVisible ? (
              <Tag
                color="processing"
                icon={<PlusOutlined />}
                onClick={() => setInputVisible(true)}
                style={{ cursor: 'pointer' }}
              >
                新建标签
              </Tag>
            ) : (
              <Input
                placeholder="请输入标签名称"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPressEnter={addTag}
                onBlur={() => setInputVisible(false)}
                size="small"
                autoFocus
              />
            )}
          </div>
          {TAG_SUGGESTIONS.length > 0 && (
            <div style={{ padding: '8px 16px' }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>常用标签:</div>
              <Space wrap>
                {TAG_SUGGESTIONS.map((tag) => (
                  <Tag
                    key={tag}
                    onClick={() => {
                      if (!tags.includes(tag)) {
                        handleTagChange([...tags, tag]);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {tag}
                  </Tag>
                ))}
              </Space>
            </div>
          )}
        </>
      )}
    />
  );
};

export default TagsSelector;
