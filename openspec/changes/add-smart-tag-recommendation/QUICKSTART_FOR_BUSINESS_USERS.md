# 🚀 业务用户登录 - 快速启动指南

## ✅ 准备工作已完成

### 1. 后端服务状态
- **状态**: ✅ 运行中
- **端口**: 3000
- **API 地址**: http://localhost:3000/api/v1
- **Swagger 文档**: http://localhost:3000/api/docs

### 2. 前端服务状态
- **状态**: ✅ 运行中 (需要手动启动)
- **端口**: 5173
- **访问地址**: http://localhost:5173

### 3. 可用账号

#### 管理员账号
```
用户名：admin
密码：admin123
角色：管理员、分析师、普通用户
权限：所有功能权限
```

#### 业务用户账号（新创建）
```
用户名：business_user
密码：Business123
邮箱：business@example.com
姓名：业务用户
角色：分析师、普通用户
权限：规则管理、推荐管理、数据查看
```

---

## 🔥 3 步快速开始

### 步骤 1: 启动前端开发服务器

打开新的终端窗口，执行:

```bash
cd d:/VsCode/customer-label/frontend
npm run dev
```

等待看到输出:
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 步骤 2: 访问前端应用

打开浏览器，访问:
```
http://localhost:5173
```

### 步骤 3: 登录系统

在登录页面输入:
- **用户名**: `business_user`
- **密码**: `Business123`

点击"登录"按钮

---

## 📋 功能使用速查

### 规则管理
```
路径：http://localhost:5173/rules
权限：分析师、管理员
功能：
  ✅ 查看规则列表
  ✅ 创建新规则
  ✅ 编辑规则
  ✅ 测试规则
  ✅ 激活/停用规则
  ✅ 删除规则
  ✅ 批量导入/导出
```

### 规则测试工具
```
路径：http://localhost:5173/rules/test
权限：分析师、管理员
功能：
  ✅ Monaco Editor 代码编辑器
  ✅ 实时规则测试
  ✅ 结果展示（匹配状态、置信度）
```

### 推荐结果管理
```
路径：http://localhost:5173/recommendations
权限：所有登录用户
功能：
  ✅ 查看推荐列表
  ✅ 统计卡片
  ✅ 接受/拒绝推荐
  ✅ 推荐详情
  ✅ 筛选和导出
```

---

## 🎯 示例规则模板

### 高净值客户识别
```json
{
  "name": "高净值客户",
  "description": "总资产超过 100 万的优质客户",
  "expression": {
    "logic": "AND",
    "conditions": [
      {
        "field": "totalAssets",
        "operator": ">=",
        "value": 1000000
      }
    ]
  },
  "tags": ["高净值客户", "VIP 客户"],
  "priority": 80,
  "isActive": true
}
```

### 流失风险预警
```json
{
  "name": "流失风险客户",
  "description": "超过 30 天未登录的客户",
  "expression": {
    "logic": "AND",
    "conditions": [
      {
        "field": "lastLoginDays",
        "operator": ">",
        "value": 30
      }
    ]
  },
  "tags": ["流失风险客户", "需跟进客户"],
  "priority": 70,
  "isActive": true
}
```

### 年轻潜力客户
```json
{
  "name": "年轻潜力客户",
  "description": "年龄小于 30 岁且收入稳定的客户",
  "expression": {
    "logic": "AND",
    "conditions": [
      {
        "field": "age",
        "operator": "<",
        "value": 30
      },
      {
        "field": "monthlyIncome",
        "operator": ">=",
        "value": 10000
      }
    ]
  },
  "tags": ["潜力客户", "年轻客户"],
  "priority": 60,
  "isActive": true
}
```

---

## 🧪 测试规则

### 在线测试步骤

1. 访问规则测试工具：http://localhost:5173/rules/test

2. 输入规则表达式:
```json
{
  "logic": "AND",
  "conditions": [
    {
      "field": "totalAssets",
      "operator": ">=",
      "value": 500000
    },
    {
      "field": "age",
      "operator": ">=",
      "value": 25
    }
  ]
}
```

3. 输入客户数据:
```json
{
  "id": 1,
  "totalAssets": 800000,
  "age": 30,
  "monthlyIncome": 25000,
  "lastLoginDays": 5,
  "orderCount": 8
}
```

4. 点击"运行测试"

5. 查看结果:
   - ✅ 匹配成功
   - 置信度：0.9
   - 耗时：< 10ms

---

## 📊 API 端点参考

### 认证相关
```bash
# 登录
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "username": "business_user",
  "password": "Business123"
}

# 响应示例:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "user": {
    "id": "4",
    "username": "business_user",
    "email": "business@example.com",
    "fullName": "业务用户",
    "roles": ["analyst", "user"]
  }
}
```

### 规则管理
```bash
# 获取规则列表
GET http://localhost:3000/api/v1/rules?page=1&limit=20
Authorization: Bearer <token>

# 创建规则
POST http://localhost:3000/api/v1/rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "测试规则",
  "description": "用于测试的规则",
  "expression": {
    "logic": "AND",
    "conditions": [
      {
        "field": "totalAssets",
        "operator": ">=",
        "value": 100000
      }
    ]
  },
  "tags": ["测试标签"],
  "priority": 50,
  "isActive": true
}

# 测试规则
POST http://localhost:3000/api/v1/rules/test
Authorization: Bearer <token>
Content-Type: application/json

{
  "ruleExpression": {
    "logic": "AND",
    "conditions": [
      {
        "field": "totalAssets",
        "operator": ">=",
        "value": 500000
      }
    ]
  },
  "customerData": {
    "id": 1,
    "totalAssets": 800000,
    "age": 30
  }
}
```

---

## ⚠️ 常见问题排查

### 问题 1: 前端无法访问

**现象**: 浏览器显示"无法访问此网站"

**解决方案**:
1. 确认前端开发服务器已启动
2. 检查端口 5173 是否被占用
3. 尝试访问 http://127.0.0.1:5173

### 问题 2: 登录后提示"未授权"

**现象**: 登录后跳转到首页，但无法访问规则管理页面

**解决方案**:
1. 确认账号角色包含 `analyst` 或 `admin`
2. 清除浏览器缓存重新登录
3. 检查 Token 是否过期（有效期 1 小时）

### 问题 3: 规则保存失败

**现象**: 点击保存后提示错误

**解决方案**:
1. 检查必填字段是否完整（名称、表达式、标签）
2. 验证表达式格式是否正确
3. 查看浏览器控制台错误信息
4. 检查后端服务是否正常运行

### 问题 4: 规则测试不匹配

**现象**: 测试结果显示不匹配

**解决方案**:
1. 检查字段名是否拼写正确
2. 验证运算符使用是否正确
3. 确认客户数据满足条件
4. 查看置信度是否 >= 0.6

---

## 📞 获取帮助

### 详细文档

- **完整使用指南**: `openspec/changes/add-smart-tag-recommendation/BUSINESS_USER_GUIDE.md`
- **任务完成报告**: `openspec/changes/add-smart-tag-recommendation/task-4.2-complete.md`
- **联调测试报告**: `openspec/changes/add-smart-tag-recommendation/task-4.2-integration-test.md`

### 技术支持

- 系统问题：联系 IT 部门
- 业务问题：联系业务分析师
- 功能建议：通过系统内反馈功能

---

## 🎉 开始使用

**一切准备就绪！**

1. ✅ 后端服务运行正常
2. ✅ 业务用户账号已创建
3. ✅ 前端页面已开发完成
4. ✅ 所有功能可正常使用

**立即访问**: http://localhost:5173  
**账号**: `business_user` / `Business123`

祝您使用愉快！🚀
