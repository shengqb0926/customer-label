# Bug 追踪清单 (Bug Tracking)

**项目名称**: 客户标签推荐系统  
**版本**: v1.0  
**最后更新**: [日期]  
**测试负责人**: [待填写]

---

## 📊 一、Bug 统计总览

### 1.1 按严重程度分布

| 级别 | 新增 | 已修复 | 待修复 | 延期 | 修复率 |
|------|------|--------|--------|------|--------|
| **P0 致命** | - | - | - | - | -% |
| **P1 严重** | - | - | - | - | -% |
| **P2 一般** | - | - | - | - | -% |
| **P3 轻微** | - | - | - | - | -% |
| **总计** | **-** | **-** | **-** | **-** | **-** |

### 1.2 按模块分布

| 模块 | P0 | P1 | P2 | P3 | 总计 | 待修复 |
|------|----|----|----|----|------|--------|
| **CustomerModule** | - | - | - | - | - | - |
| **RecommendationModule** | - | - | - | - | - | - |
| **CacheModule** | - | - | - | - | - | - |
| **Frontend** | - | - | - | - | - | - |
| **总计** | **-** | **-** | **-** | **-** | **-** | **-** |

### 1.3 Bug 趋势图

```
Week 1: ░░░░░ 0
Week 2: ░░░░░ 0
Week 3: ░░░░░ 0
Week 4: ░░░░░ 0
```

---

## 🐛 二、Bug 详细清单

### P0 致命 Bug（阻塞发布）

#### BUG-001: [标题]

**基本信息**:
- **发现版本**: v1.0.0
- **发现日期**: [日期]
- **发现环境**: 生产环境/测试环境
- **报告人**: [姓名]
- **处理人**: [姓名]
- **当前状态**: ⏳ Open / ✅ Fixed / ❌ Won't Fix

**Bug 描述**:
```
【现象】
[详细描述 Bug 表现]

【复现步骤】
1. [步骤 1]
2. [步骤 2]
3. [步骤 3]

【预期结果】
[应该发生什么]

【实际结果】
[实际发生了什么]

【影响范围】
[影响的功能和用户]
```

**技术信息**:
```
错误日志:
Error: TypeError: Cannot read property 'id' of undefined
    at RecommendationService.generateForCustomer (recommendation.service.ts:123)

堆栈跟踪:
at RecommendationService.generateForCustomer (/src/modules/recommendation/recommendation.service.ts:123:15)
at RecommendationController.generateRecommendations (/src/modules/recommendation/recommendation.controller.ts:98:12)

环境信息:
- OS: Windows 11
- Node.js: v18.17.0
- Database: PostgreSQL 14.8
- Redis: 6.2.12
```

**根本原因分析**:
```
[深入分析 Bug 产生的根本原因]
```

**解决方案**:
```typescript
// 修复代码示例
async generateForCustomer(customerId: number) {
  const customer = await this.customerRepository.findOne({ where: { id: customerId } });
  
  // ✅ 添加空值检查
  if (!customer) {
    throw new NotFoundException(`Customer ${customerId} not found`);
  }
  
  // ... 继续执行
}
```

**验证结果**:
- [ ] 已修复并本地测试通过
- [ ] 已添加回归测试用例
- [ ] 已部署到测试环境验证
- [ ] 已上线生产环境

**经验教训**:
```
[记录避免同类问题的方法]
```

---

### P1 严重 Bug（影响核心功能）

#### BUG-002: 置信度溢出数据库

**基本信息**:
- **发现版本**: v1.0.0
- **发现日期**: 2026-03-28
- **发现环境**: 测试环境
- **报告人**: AI Assistant
- **处理人**: [待填写]
- **当前状态**: ✅ Fixed

**Bug 描述**:
```
【现象】
对同一客户多次触发推荐引擎后，融合引擎计算的置信度超过 1.0，导致数据库写入失败。

【复现步骤】
1. 对客户 ID=123 触发规则引擎
2. 对同一客户触发聚类引擎
3. 对同一客户触发关联引擎
4. 查看 tag_recommendations 表

【预期结果】
置信度应在 0-1 之间

【实际结果】
置信度 = 1.05（多来源加成后未设上限）

【影响范围】
所有多引擎联合推荐的场景
```

**技术信息**:
```
错误日志:
error: numeric field overflow
Detail: A value with precision 6 cannot be stored.

堆栈跟踪:
at Query.run (/node_modules/pg/lib/query.js:115:20)
```

**根本原因分析**:
```
FusionEngine 在计算多来源加成时:
fusedConfidence = weightedAverage * (1 + 0.1 * (sources - 1))

当三个引擎都推荐同一标签且置信度都很高时:
0.95 * 0.4 + 0.9 * 0.35 + 0.85 * 0.25 = 0.905
0.905 * 1.2 = 1.086 > 1.0

缺少最终的上限校验！
```

**解决方案**:
```typescript
// FusionEngineService.fuseSingleTag
private fuseSingleTag(tagName: string, recs: any[]): FusedRecommendation {
  // ... 计算加权平均和多来源加成
  
  // ✅ 添加置信度上限校验
  const finalConfidence = Math.min(fusedConfidence, 0.9999);
  
  return {
    fusedConfidence: Math.round(finalConfidence * 100) / 100,
    allSources,
    // ...
  };
}
```

**验证结果**:
- [x] 已修复并本地测试通过
- [x] 已添加边界值测试用例（TC-EDGE-001）
- [x] 已部署到测试环境验证
- [ ] 已上线生产环境

**经验教训**:
```
所有数值计算类操作都必须进行边界校验：
1. 置信度：0-1 范围检查
2. 概率：不能超过 100%
3. 金额：不能为负数
4. 数量：不能小于 0

在代码审查清单中增加"数值边界检查"项。
```

---

#### BUG-003: 关联规则配置类型错误（批量操作）

**基本信息**:
- **发现版本**: v1.0.0
- **发现日期**: 2026-03-29
- **发现环境**: 开发环境
- **报告人**: AI Assistant
- **处理人**: [待填写]
- **当前状态**: ⏳ Open

**Bug 描述**:
```
【现象】
在关联规则配置页面执行批量接受操作时，前端报错：
"TypeError: Cannot read properties of undefined (reading 'map')"

【复现步骤】
1. 访问 /recommendations 页面
2. 筛选 source=association
3. 勾选多条推荐
4. 点击"批量接受"按钮

【预期结果】
成功接受所有选中的推荐

【实际结果】
前端控制台报错，无后端请求发送

【影响范围】
关联规则的批量操作功能
```

**技术信息**:
```
错误位置: frontend/src/pages/Recommendation/RecommendationList.tsx:256

问题代码:
const handleBatchAccept = () => {
  const selectedIds = selectedRows.map(row => row.id);  // ❌ selectedRows 可能为 undefined
  // ...
};
```

**初步分析**:
```
selectedRows 初始化为 undefined，在未选择任何行时直接调用 .map() 导致崩溃。

应使用可选链或默认值:
const selectedIds = (selectedRows || []).map(row => row.id);
```

**临时规避方案**:
```
确保至少选择一行后再点击批量接受按钮。
```

**计划修复版本**: v1.1.0

---

### P2 一般 Bug（非核心功能）

#### BUG-004: Excel 导出中文乱码

**基本信息**:
- **发现版本**: v1.0.0
- **发现日期**: [日期]
- **当前状态**: ⏳ Open

**Bug 描述**:
```
【现象】
导出的 Excel 文件中，中文姓名字段显示为乱码

【复现步骤】
1. 在客户列表筛选中国客户
2. 点击"导出 Excel"
3. 用 Excel 打开文件

【预期结果】
中文姓名正常显示

【实际结果】
姓名显示为 "å¼ ä¸‰" 类似乱码

【影响范围】
所有包含中文字符的导出
```

**解决方案**:
```typescript
// 添加 BOM 头
const buffer = xlsx.write({
  workbook: { Sheets: { data: worksheet } },
  type: 'buffer',
});

// ✅ 添加 UTF-8 BOM
const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
return Buffer.concat([bom, buffer]);
```

---

### P3 轻微 Bug（UI 瑕疵）

#### BUG-005: Loading 提示消失过快

**基本信息**:
- **发现版本**: v1.0.0
- **当前状态**: ⏳ Open

**Bug 描述**:
```
【现象】
推荐引擎执行完成后，Loading 提示立即消失，用户来不及看清就显示了成功消息

【影响范围】
用户体验

【建议修复】
设置最小 Loading 时间（如 500ms），确保用户感知到操作完成。
```

---

## 🔄 三、Bug 生命周期

### 3.1 状态流转图

```
New → Open → In Progress → Fixed → Verified → Closed
         ↓          ↓           ↓
      Won't Fix  Deferred   Reopened
```

### 3.2 平均修复时间 (MTTR)

| 级别 | 目标 SLA | 实际 MTTR | 达标率 |
|------|---------|----------|--------|
| **P0** | 1 小时 | -小时 | -% |
| **P1** | 4 小时 | -小时 | -% |
| **P2** | 24 小时 | -小时 | -% |
| **P3** | 1 周 | -天 | -% |

---

## 📋 四、Bug 分级标准

### P0 致命 Bug

**定义**: 系统崩溃、数据丢失、核心功能完全不可用

**示例**:
- 数据库连接失败导致服务不可用
- 内存溢出导致进程崩溃
- 数据损坏或丢失

**响应 SLA**: 15 分钟响应，1 小时修复

---

### P1 严重 Bug

**定义**: 核心功能失效、主要业务流程中断

**示例**:
- 推荐引擎无法执行
- 支付流程失败
- 认证授权失效

**响应 SLA**: 30 分钟响应，4 小时修复

---

### P2 一般 Bug

**定义**: 非核心功能异常、次要流程问题

**示例**:
- 导出 Excel 格式错误
- 筛选条件不生效
- 部分 UI 显示异常

**响应 SLA**: 2 小时响应，24 小时修复

---

### P3 轻微 Bug

**定义**: UI 瑕疵、体验问题、文案错误

**示例**:
- 按钮颜色不一致
- 错别字
- 提示信息不够友好

**响应 SLA**: 1 天响应，1 周修复

---

## 📊 五、质量趋势分析

### 5.1 Bug 引入率 vs 修复率

```
Week 1: 引入░░░░░ 5  修复░░░░░ 3
Week 2: 引入░░░░░ 8  修复░░░░░ 6
Week 3: 引入░░░░░ 3  修复░░░░░ 10
Week 4: 引入░░░░░ 2  修复░░░░░ 8
```

### 5.2 Bug 密度（每千行代码）

| 模块 | 代码行数 | Bug 数 | 密度 |
|------|---------|--------|------|
| CustomerModule | 2500 | - | -/KLOC |
| RecommendationModule | 3200 | - | -/KLOC |
| CacheModule | 800 | - | -/KLOC |
| **总计** | **6500** | **-** | **-/KLOC** |

---

## 🎯 六、改进措施

### 6.1 预防措施

**代码审查加强**:
- [ ] 增加数值边界检查项
- [ ] 强制空值校验
- [ ] 异常处理覆盖

**自动化测试**:
- [ ] 补充边界值测试用例
- [ ] 增加异常场景测试
- [ ] 建立回归测试集

**工具辅助**:
- [ ] ESLint 规则增加边界检查
- [ ] TypeScript 严格模式
- [ ] 静态分析工具集成

---

### 6.2 流程改进

**Bug 预防 Checklist**:
```markdown
在提交代码前自检:
- [ ] 数值计算有边界校验
- [ ] 对象属性有空值检查
- [ ] 数组操作有长度验证
- [ ] 异步操作有错误捕获
- [ ] 外部输入有验证过滤
```

**经验教训库**:
- 定期复盘典型 Bug
- 建立陷阱知识库
- 新人培训案例

---

## 📚 七、参考资料

- [缺陷管理流程](../standards/TESTING_GUIDELINES.md#六缺陷管理)
- [Bug 分级标准](../standards/TESTING_GUIDELINES.md#61-bug-分级标准)
- [测试用例集](./TEST_CASES.md)

---

**文档版本**: v1.0  
**维护人**: [待填写]  
**最后更新**: [日期]

**© 2026 客户标签推荐系统项目组 版权所有**
