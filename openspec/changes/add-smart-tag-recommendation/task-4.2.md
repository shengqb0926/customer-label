# 任务 4.2：前端展示页面

## 📋 任务概览

- **任务 ID**: task-4.2-frontend-ui
- **父任务**: Phase 4 - API 和前端集成
- **优先级**: P0（最高）
- **预估工时**: 12 小时
- **开始日期**: 2026-03-27
- **目标完成日期**: 2026-03-28
- **状态**: 🔄 进行中
- **依赖关系**: ✅ Task 3.1 规则引擎开发已完成

---

## 🎯 任务目标

实现规则引擎的前端展示页面，让规则管理功能可见可用，提供友好的用户交互界面。

### 核心价值
1. **可视化规则管理**: 无需记忆 API，通过界面操作即可管理规则
2. **实时规则测试**: 提供交互式测试工具，立即验证规则效果
3. **直观的数据展示**: 表格、图表等多种方式展示规则和推荐结果
4. **便捷的操作体验**: 接受/拒绝推荐、批量操作等功能

---

## 📝 需求定义（Given/When/Then）

### 4.2.1 规则列表页面

**Given** 用户需要查看和管理规则  
**When** 用户访问规则列表页面时  
**Then** 应展示以下功能：

#### 页面布局
```typescript
interface RuleListPage {
  // 顶部工具栏
  toolbar: {
    searchBox: boolean;      // 搜索框
    statusFilter: boolean;   // 状态筛选（全部/活跃/停用）
    categoryFilter: boolean; // 分类筛选
    refreshButton: boolean;  // 刷新按钮
    createButton: boolean;   // 新建规则按钮
    batchImportButton: boolean; // 批量导入按钮
    batchExportButton: boolean; // 批量导出按钮
  };
  
  // 数据表格
  table: {
    columns: [
      { key: 'name', title: '规则名称', sortable: true },
      { key: 'priority', title: '优先级', sortable: true },
      { key: 'status', title: '状态', render: 'badge' },
      { key: 'hitCount', title: '命中次数', sortable: true },
      { key: 'tags', title: '推荐标签', render: 'tags' },
      { key: 'updatedAt', title: '更新时间', sortable: true, format: 'datetime' },
      { key: 'actions', title: '操作', render: 'buttons' }
    ];
    features: [
      'pagination',     // 分页
      'sorting',        // 排序
      'rowSelection',   // 行选择
      'expandableRows'  // 可展开查看详情
    ];
  };
}
```

**验收标准**:
- ✅ 表格正确显示规则列表（支持分页）
- ✅ 状态使用不同颜色的 Badge 标识（活跃=绿色，停用=灰色）
- ✅ 标签使用 Tag 组件展示
- ✅ 操作列包含：查看、编辑、激活/停用、删除、测试按钮
- ✅ 支持按规则名称搜索
- ✅ 支持按状态筛选
- ✅ 支持表格列排序

---

### 4.2.2 规则详情与编辑

**Given** 用户需要查看或编辑规则详情  
**When** 用户点击规则的操作按钮时  
**Then** 应弹出模态框展示详情或编辑表单：

#### 规则表单字段
```typescript
interface RuleForm {
  // 基本信息
  basicInfo: {
    name: {
      type: 'input',
      required: true,
      maxLength: 100,
      placeholder: '请输入规则名称'
    };
    description: {
      type: 'textarea',
      required: false,
      maxLength: 500,
      placeholder: '请输入规则描述',
      rows: 3
    };
    priority: {
      type: 'slider',
      required: true,
      min: 1,
      max: 100,
      marks: { 1: '低', 50: '中', 100: '高' }
    };
    isActive: {
      type: 'switch',
      default: true,
      checkedChildren: '活跃',
      unCheckedChildren: '停用'
    };
  };
  
  // 规则表达式（可视化编辑器）
  expression: {
    type: 'visual-editor',
    required: true,
    features: [
      'addCondition',      // 添加条件
      'addLogicalGroup',   // 添加逻辑组（AND/OR）
      'removeCondition',   // 删除条件
      'dragToReorder',     // 拖拽排序
      'preview',           // 预览 JSON
      'validate'           // 验证表达式
    ];
  };
  
  // 推荐标签
  tags: {
    type: 'select-mode',
    mode: 'multiple',
    required: true,
    minCount: 1,
    placeholder: '请选择或输入推荐标签',
    allowCreate: true,     // 允许创建新标签
    suggestions: string[]  // 标签建议列表
  };
}
```

**验收标准**:
- ✅ 表单字段完整且验证正确
- ✅ 规则名称不能为空且唯一
- ✅ 优先级滑块可拖动且有刻度标记
- ✅ 可视化表达式编辑器可添加/删除条件
- ✅ 支持嵌套逻辑组（AND/OR切换）
- ✅ 标签选择器支持多选和创建新标签
- ✅ 提交前自动验证所有字段
- ✅ 保存成功后刷新列表

---

### 4.2.3 规则测试工具

**Given** 用户需要测试规则是否正常工作  
**When** 用户点击"测试规则"按钮时  
**Then** 应打开测试工具界面：

#### 测试界面布局
```typescript
interface RuleTesterUI {
  // 左侧：规则配置区
  leftPanel: {
    ruleSelector: {
      type: 'select',
      placeholder: '选择已有规则或手动编写',
      options: Rule[]
    };
    expressionEditor: {
      type: 'json-editor',
      language: 'json',
      theme: 'vs-dark',
      minimap: false,
      wordWrap: true
    };
  };
  
  // 右侧：客户数据区
  rightPanel: {
    customerSelector: {
      type: 'select',
      placeholder: '选择测试客户',
      searchable: true
    };
    dataEditor: {
      type: 'json-editor',
      language: 'json',
      theme: 'vs-light',
      placeholder: '或手动输入客户数据'
    };
  };
  
  // 底部：测试结果区
  bottomPanel: {
    testButton: {
      text: '运行测试',
      loading: true,
      shortcut: 'Ctrl+Enter'
    };
    resultDisplay: {
      matched: {
        type: 'alert',
        success: '匹配成功',
        error: '未匹配'
      };
      confidence: {
        type: 'progress',
        showInfo: true,
        format: (val) => `${(val * 100).toFixed(1)}%`
      };
      matchedConditions: {
        type: 'list',
        dataSource: ConditionResult[]
      };
      recommendations: {
        type: 'table',
        columns: ['tagName', 'confidence', 'reason']
      };
      executionTime: {
        type: 'statistic',
        prefix: '执行耗时:',
        suffix: 'ms'
      };
    };
  };
}
```

**验收标准**:
- ✅ 可选择已有规则或手动编写表达式
- ✅ 可选择测试客户自动填充数据
- ✅ 可手动编辑客户数据
- ✅ 点击测试按钮后显示加载状态
- ✅ 测试结果清晰展示匹配状态
- ✅ 置信度使用进度条可视化
- ✅ 显示匹配的条件详情
- ✅ 显示生成的推荐列表
- ✅ 显示执行耗时

---

### 4.2.4 推荐结果展示

**Given** 用户需要查看规则生成的推荐结果  
**When** 用户访问推荐结果页面时  
**Then** 应展示推荐列表和操作功能：

#### 推荐列表页面
```typescript
interface RecommendationListPage {
  // 筛选区
  filters: {
    customerSelect: {
      type: 'select',
      placeholder: '按客户筛选',
      searchable: true
    };
    tagCategoryFilter: {
      type: 'select',
      placeholder: '按标签类型筛选',
      options: TagCategory[]
    };
    dateRangePicker: {
      type: 'range-picker',
      placeholder: ['开始日期', '结束日期']
    };
    statusFilter: {
      type: 'radio-group',
      options: [
        { label: '全部', value: 'all' },
        { label: '待处理', value: 'pending' },
        { label: '已接受', value: 'accepted' },
        { label: '已拒绝', value: 'rejected' }
      ]
    };
  };
  
  // 数据表格
  table: {
    columns: [
      { key: 'customer', title: '客户', render: 'link' },
      { key: 'tagName', title: '推荐标签', render: 'tag' },
      { key: 'tagCategory', title: '标签类型' },
      { key: 'confidence', title: '置信度', render: 'progress' },
      { key: 'source', title: '来源', render: 'icon' },
      { key: 'reason', title: '推荐理由', ellipsis: true },
      { key: 'status', title: '状态', render: 'badge' },
      { key: 'createdAt', title: '推荐时间', format: 'datetime' },
      { key: 'actions', title: '操作', render: 'buttons' }
    ];
    actions: [
      { key: 'accept', text: '接受', icon: 'check' },
      { key: 'reject', text: '拒绝', icon: 'close' },
      { key: 'detail', text: '详情', icon: 'eye' }
    ];
  };
  
  // 统计卡片
  statistics: {
    total: { title: '总推荐数', icon: 'file-text' },
    pending: { title: '待处理', icon: 'clock-circle', color: 'orange' },
    accepted: { title: '已接受', icon: 'check-circle', color: 'green' },
    rejected: { title: '已拒绝', icon: 'close-circle', color: 'red' }
  };
}
```

**验收标准**:
- ✅ 支持多维度筛选（客户、标签类型、日期、状态）
- ✅ 表格正确展示推荐信息
- ✅ 置信度使用进度条可视化
- ✅ 来源使用图标区分（rule/clustering/association）
- ✅ 状态使用不同颜色标识
- ✅ 接受/拒绝操作有二次确认
- ✅ 操作成功后刷新列表
- ✅ 统计卡片实时更新

---

### 4.2.5 推荐详情弹窗

**Given** 用户需要了解推荐详情  
**When** 用户点击"详情"按钮时  
**Then** 应弹出详情弹窗展示完整信息：

#### 详情弹窗内容
```typescript
interface RecommendationDetailModal {
  header: {
    title: string;          // 推荐标签名称
    subtitle: string;       // 客户名称
    statusBadge: JSX.Element;
  };
  
  sections: [
    {
      title: '基本信息',
      content: {
        customer: string,
        tagName: string,
        tagCategory: string,
        source: 'rule' | 'clustering' | 'association',
        createdAt: string
      }
    },
    {
      title: '推荐依据',
      content: {
        confidence: number,
        reason: string,
        matchedRules?: RuleDetail[]
      }
    },
    {
      title: '评分详情',
      content: {
        overallScore?: number,
        subScores?: {
          coverage?: number,
          distinction?: number,
          stability?: number,
          businessValue?: number
        }
      }
    },
    {
      title: '操作历史',
      content: {
        acceptedAt?: string,
        acceptedBy?: string,
        feedbackReason?: string,
        modifiedTagName?: string
      }
    }
  ];
}
```

**验收标准**:
- ✅ 完整展示推荐的所有字段
- ✅ 推荐理由清晰可读
- ✅ 匹配的规则详情可展开查看
- ✅ 评分使用仪表盘或进度条展示
- ✅ 操作历史记录完整

---

## 🎨 UI/UX 设计规范

### 设计风格

遵循 Ant Design 5.x 设计规范：

```typescript
// 主题配置
const theme = {
  token: {
    colorPrimary: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    borderRadius: 6,
    fontSize: 14,
  },
};

// 组件使用规范
- Table: 使用 bordered={false} size="middle"
- Button: 主要操作使用 primary，危险操作使用 danger
- Form: 使用 layout="vertical" 或 "horizontal"
- Modal: 宽度根据内容自适应，最大不超过 800px
- Tag: 不同状态使用不同颜色
```

### 响应式布局

```css
/* 移动端适配 */
@media (max-width: 768px) {
  .rule-list-page {
    .ant-table {
      font-size: 12px;
    }
    .toolbar {
      flex-direction: column;
    }
  }
}

/* 平板适配 */
@media (min-width: 769px) and (max-width: 1024px) {
  .rule-list-page {
    .ant-table {
      font-size: 13px;
    }
  }
}
```

---

## 🔌 技术实现方案

### 技术栈

```json
{
  "react": "^18.x",
  "antd": "^5.x",
  "@ant-design/icons": "^5.x",
  "axios": "^1.x",
  "zustand": "^5.x",
  "react-router-dom": "^6.x",
  "dayjs": "^2.x",
  "@monaco-editor/react": "^4.x"
}
```

### 目录结构

```
frontend/src/pages/RuleManagement/
├── index.tsx                    # 路由入口
├── RuleList/
│   ├── index.tsx               # 规则列表主组件
│   ├── RuleTable.tsx           # 规则表格组件
│   ├── RuleFilters.tsx         # 筛选组件
│   └── RuleActions.tsx         # 操作按钮组件
├── RuleForm/
│   ├── index.tsx               # 规则表单组件
│   ├── BasicInfoForm.tsx       # 基本信息表单
│   ├── ExpressionEditor.tsx    # 表达式编辑器
│   └── TagsSelector.tsx        # 标签选择器
├── RuleTester/
│   ├── index.tsx               # 规则测试工具
│   ├── ExpressionPanel.tsx     # 表达式面板
│   ├── DataPanel.tsx           # 数据面板
│   └── ResultPanel.tsx         # 结果面板
└── RecommendationList/
    ├── index.tsx               # 推荐列表主组件
    ├── RecommendationTable.tsx # 推荐表格组件
    ├── RecommendationFilters.tsx # 筛选组件
    └── RecommendationDetail.tsx  # 详情弹窗

frontend/src/services/
└── rule.ts                      # 规则 API 服务

frontend/src/stores/
└── ruleStore.ts                 # 规则状态管理

frontend/src/types/
└── rule.ts                      # 规则类型定义
```

### State 管理（Zustand）

```typescript
import { create } from 'zustand';

interface RuleState {
  rules: Rule[];
  loading: boolean;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  filters: RuleFilters;
  
  // Actions
  fetchRules: (params?: GetRulesParams) => Promise<void>;
  createRule: (data: CreateRuleDto) => Promise<Rule>;
  updateRule: (id: number, data: UpdateRuleDto) => Promise<Rule>;
  deleteRule: (id: number) => Promise<void>;
  testRule: (expression: RuleExpression, data: any) => Promise<TestResult>;
  setFilters: (filters: RuleFilters) => void;
  resetFilters: () => void;
}

export const useRuleStore = create<RuleState>((set, get) => ({
  rules: [],
  loading: false,
  pagination: { current: 1, pageSize: 20, total: 0 },
  filters: {},
  
  fetchRules: async (params) => {
    set({ loading: true });
    try {
      const response = await ruleService.getRules(params);
      set({ 
        rules: response.data, 
        pagination: response.pagination,
        loading: false 
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  
  createRule: async (data) => {
    const rule = await ruleService.createRule(data);
    await get().fetchRules();
    return rule;
  },
  
  // ... 其他 actions
}));
```

### API 服务封装

```typescript
// services/rule.ts
import apiClient from './api';
import type { Rule, CreateRuleDto, UpdateRuleDto, TestRuleDto } from '@/types';

export const ruleService = {
  async getRules(params: { page?: number; limit?: number; isActive?: boolean }) {
    return await apiClient.get('/rules', { params });
  },

  async getRuleById(id: number): Promise<Rule> {
    return await apiClient.get(`/rules/${id}`);
  },

  async createRule(data: CreateRuleDto): Promise<Rule> {
    return await apiClient.post('/rules', data);
  },

  async updateRule(id: number, data: UpdateRuleDto): Promise<Rule> {
    return await apiClient.put(`/rules/${id}`, data);
  },

  async deleteRule(id: number): Promise<void> {
    return await apiClient.delete(`/rules/${id}`);
  },

  async activateRule(id: number): Promise<Rule> {
    return await apiClient.post(`/rules/${id}/activate`);
  },

  async deactivateRule(id: number): Promise<Rule> {
    return await apiClient.post(`/rules/${id}/deactivate`);
  },

  async testRule(data: TestRuleDto): Promise<TestResult> {
    return await apiClient.post('/rules/test', data);
  },

  async exportRules(): Promise<Blob> {
    return await apiClient.get('/rules/batch/export', { responseType: 'blob' });
  },

  async importRules(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    return await apiClient.post('/rules/batch/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
```

---

## 🧪 测试要求

### 单元测试

```typescript
// __tests__/RuleList.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { RuleList } from '../RuleList';

describe('RuleList', () => {
  it('应正确渲染规则列表', async () => {
    render(<RuleList />);
    
    expect(await screen.findByText('规则名称')).toBeInTheDocument();
    expect(await screen.findByText('优先级')).toBeInTheDocument();
    expect(await screen.findByText('状态')).toBeInTheDocument();
  });

  it('应支持搜索功能', async () => {
    render(<RuleList />);
    
    const searchInput = screen.getByPlaceholderText('搜索规则名称');
    fireEvent.change(searchInput, { target: { value: '高价值' } });
    
    expect(await screen.findByText(/高价值客户/i)).toBeInTheDocument();
  });

  it('应支持状态筛选', async () => {
    render(<RuleList />);
    
    const statusFilter = screen.getByTestId('status-filter');
    fireEvent.change(statusFilter, { target: { value: 'active' } });
    
    expect(screen.getAllByText('活跃')).toHaveLength(expect.any(Number));
  });
});
```

### 组件测试

```typescript
// __tests__/RuleForm.test.tsx
describe('RuleForm', () => {
  it('应验证必填字段', async () => {
    render(<RuleForm />);
    
    fireEvent.click(screen.getByText('保存'));
    
    expect(await screen.findByText('规则名称不能为空')).toBeInTheDocument();
    expect(await screen.findByText('请选择推荐标签')).toBeInTheDocument();
  });

  it('应正确提交表单数据', async () => {
    const onSubmit = jest.fn();
    render(<RuleForm onSubmit={onSubmit} />);
    
    fireEvent.change(screen.getByLabelText('规则名称'), {
      target: { value: '测试规则' },
    });
    
    fireEvent.click(screen.getByText('保存'));
    
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '测试规则',
      })
    );
  });
});
```

---

## ✅ 验收标准

### 功能验收

- [ ] **规则列表页面**
  - [ ] 正确展示规则列表（表格形式）
  - [ ] 支持分页（每页 20 条）
  - [ ] 支持按名称搜索
  - [ ] 支持按状态筛选
  - [ ] 支持表格列排序
  - [ ] 操作按钮功能完整

- [ ] **规则创建/编辑**
  - [ ] 表单字段完整且验证正确
  - [ ] 可视化表达式编辑器可用
  - [ ] 标签选择器支持多选和创建
  - [ ] 保存成功后刷新列表

- [ ] **规则测试工具**
  - [ ] 可选择规则或手动编写
  - [ ] 可输入客户数据
  - [ ] 测试结果展示完整
  - [ ] 置信度可视化

- [ ] **推荐结果展示**
  - [ ] 支持多维度筛选
  - [ ] 推荐列表正确展示
  - [ ] 接受/拒绝操作可用
  - [ ] 详情弹窗信息完整

### UI/UX 验收

- [ ] 遵循 Ant Design 设计规范
- [ ] 响应式布局正常
- [ ] 加载状态有友好提示
- [ ] 错误信息清晰易懂
- [ ] 操作反馈及时

### 性能验收

- [ ] 列表加载时间 < 1s
- [ ] 表格滚动流畅（60fps）
- [ ] 大数据量使用虚拟滚动
- [ ] 图片懒加载

### 兼容性验收

- [ ] Chrome 最新版
- [ ] Firefox 最新版
- [ ] Safari 最新版
- [ ] Edge 最新版

---

## 📦 交付成果

### 代码文件

- [ ] `pages/RuleManagement/RuleList/index.tsx`
- [ ] `pages/RuleManagement/RuleForm/index.tsx`
- [ ] `pages/RuleManagement/RuleTester/index.tsx`
- [ ] `pages/Recommendation/RecommendationList/index.tsx`
- [ ] `services/rule.ts`
- [ ] `stores/ruleStore.ts`
- [ ] `types/rule.ts`
- [ ] 相关组件和样式文件

### 文档

- [ ] `task-4.2.md` - 任务计划
- [ ] `task-4.2-complete.md` - 完成报告
- [ ] `TASK_4.2_SUMMARY.md` - 总结报告

### 测试

- [ ] 组件单元测试
- [ ] 服务层测试
- [ ] E2E 测试（可选）

---

## 🚀 下一步行动

1. ✅ 创建任务计划文档（本文档）
2. ⏳ 实现基础组件和页面
3. ⏳ 实现 API 服务和状态管理
4. ⏳ 实现规则列表页面
5. ⏳ 实现规则表单页面
6. ⏳ 实现规则测试工具
7. ⏳ 实现推荐结果页面
8. ⏳ 编写单元测试
9. ⏳ 前后端联调
10. ⏳ 创建完成报告

---

*创建时间：2026-03-27*  
*版本：v1.0*  
*作者：AI Assistant*
