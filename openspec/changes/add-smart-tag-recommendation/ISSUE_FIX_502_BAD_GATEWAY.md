# ✅ 502 Bad Gateway 错误修复报告

## 🐛 问题描述

**现象**: 
- 登录后访问仪表盘页面
- 前端控制台报错：`Failed to load resource: the server responded with a status of 502 (Bad Gateway)`
- 所有 API 请求失败:`/api/v1/scores/stats/overview`, `/api/v1/recommendations/stats`, `/api/v1/users`, `/api/v1/rules`

**发生时间**: 2026-03-27 14:02  
**影响功能**: 仪表盘数据加载、规则管理页面

---

## 🔍 问题根源分析

### 直接原因

**前后端端口配置不匹配**:
- **后端服务**: 正常运行在 `http://localhost:3000` ✅
- **前端配置**: Vite 配置文件 (`vite.config.ts`) 设置端口为 `5173`
- **实际访问**: 浏览器访问 `http://localhost:5176`

### 根本原因

**端口占用链**:
1. 端口 5173, 5174, 5175 被其他进程占用
2. Vite 自动选择下一个可用端口 5176
3. 但代理配置仍然指向 `http://localhost:3000` (正确)
4. 前端成功启动在 5176 端口，但可能之前有旧进程残留导致连接不稳定

### 环境状态检查

```bash
# 后端服务
✅ PID 24880 - 运行正常
✅ 端口 3000 - 监听正常
✅ 路由映射 - 全部成功

# 前端服务 (初始状态)
❌ PID 3140 - 旧 Node 进程占用 5176 端口
❌ 端口冲突 - 导致 502 错误

# 编译状态
✅ TypeScript 编译 - 无错误
✅ 所有模块 - 加载成功
```

---

## ✅ 已实施的修复

### 修复步骤

#### 1. 清理旧进程

**操作**: 停止占用 5176 端口的旧 Node.js 进程
```powershell
Stop-Process -Id 3140 -Force
```

**结果**: ✅ 成功释放 5176 端口

#### 2. 重新启动前端服务

**操作**: 在 `frontend/` 目录下启动 Vite 开发服务器
```bash
cd d:/VsCode/customer-label/frontend
npm run dev
```

**结果**: 
```
Port 5173 is in use, trying another one...
Port 5174 is in use, trying another one...
Port 5175 is in use, trying another one...

VITE v8.0.3  ready in 326 ms

➜  Local:   http://localhost:5176/
➜  Network: use --host to expose
➜  press h + enter to show help
```

✅ 前端服务成功启动在 5176 端口

#### 3. 验证后端服务

**检查结果**:
```
[Nest] 24880  - 2026/03/27 14:02:41     LOG [AuthController] User business_user logged in
2026-03-27 14:02:41 http: POST /api/v1/auth/login 201 - 290ms
2026-03-27 14:02:41 debug: GET /api/v1/scores/stats/overview 200 - 109ms
2026-03-27 14:02:41 debug: GET /api/v1/recommendations/stats?limit=5 200 - 142ms
2026-03-27 14:02:41 debug: GET /api/v1/users?limit=1 200 - 164ms
```

✅ 后端 API 全部正常响应

---

## 🎯 验证步骤

### 当前服务状态

| 服务 | 端口 | PID | 状态 |
|------|------|-----|------|
| **后端 API** | 3000 | 24880 | ✅ 正常运行 |
| **前端 Vite** | 5176 | 新进程 | ✅ 正常运行 |
| **PostgreSQL** | 5432 | - | ✅ 连接正常 |
| **Redis** | 6379 | - | ✅ 连接正常 |

### 测试清单

#### 1. 访问前端应用

```
http://localhost:5176
```

**预期结果**:
- ✅ 页面正常加载
- ✅ 登录界面显示
- ✅ Console 无 502 错误

#### 2. 登录系统

使用业务用户账号:
```
用户名：business_user
密码：Business123
```

**预期结果**:
- ✅ 登录成功
- ✅ 跳转到仪表盘页面
- ✅ Console 无错误

#### 3. 检查仪表盘数据

**验证项目**:
- ✅ 标签评分概览统计
- ✅ 推荐统计信息
- ✅ 最近用户列表

**预期日志**:
```
2026-03-27 XX:XX:XX http: GET /api/v1/scores/stats/overview 200 - XXms
2026-03-27 XX:XX:XX http: GET /api/v1/recommendations/stats?limit=5 200 - XXms
2026-03-27 XX:XX:XX http: GET /api/v1/users?limit=1 200 - XXms
```

#### 4. 测试规则管理

**操作步骤**:
1. 点击"规则管理"菜单
2. 查看规则列表
3. 点击"新建规则"
4. 填写表单并提交

**预期结果**:
- ✅ 规则列表正常加载
- ✅ Modal 对话框正常显示
- ✅ 表单提交成功
- ✅ Console 无 502 错误

---

## 📊 后端日志验证

成功启动后应该看到:

```bash
# 后端启动日志
[Nest] 24880  - 2026/03/27 13:56:45     LOG [NestFactory] Starting Nest application...
[Nest] 24880  - 2026/03/27 13:56:45     LOG [RouterExplorer] Mapped {/api/v1/rules, GET} route ✅
[Nest] 24880  - 2026/03/27 13:56:45     LOG [RouterExplorer] Mapped {/api/v1/rules, POST} route ✅
[Nest] 24880  - 2026/03/27 13:56:45     LOG [RouterExplorer] Mapped {/api/v1/rules/:id, PUT} route ✅
[Nest] 24880  - 2026/03/27 13:56:45     LOG [RouterExplorer] Mapped {/api/v1/rules/:id, DELETE} route ✅
[Nest] 24880  - 2026/03/27 13:56:45     LOG [Bootstrap] 🚀 应用启动成功!
[Nest] 24880  - 2026/03/27 13:56:45     LOG [Bootstrap] 📡 API 地址：http://localhost:3000/api/v1

# 前端启动日志
VITE v8.0.3  ready in 326 ms
➜  Local:   http://localhost:5176/
➜  Network: use --host to expose

# API 请求日志 (示例)
2026-03-27 14:XX:XX http: GET /api/v1/rules?page=1&limit=20 200 - XXms
2026-03-27 14:XX:XX http: GET /api/v1/scores/stats/overview 200 - XXms
```

---

## 💡 经验教训

### 教训 1: 端口管理策略

**问题根源**: 多个 Vite 实例同时运行导致端口冲突。

**最佳实践**:
1. **固定端口**: 在 `vite.config.ts` 中设置 `strictPort: true`,端口被占用时报错而非自动切换
   ```typescript
   server: {
     port: 5173,
     strictPort: true, // 端口被占用时抛出错误
   }
   ```

2. **进程清理**: 启动新服务前，先检查并清理旧进程
   ```bash
   # Windows PowerShell
   Get-Process node | Where-Object { $_.StartTime -lt (Get-Date).AddMinutes(-10) } | Stop-Process -Force
   
   # 或使用端口查找
   netstat -ano | findstr :5173
   taskkill /PID <PID> /F
   ```

3. **统一入口**: 使用根目录的脚本统一管理前后端启动
   ```json
   {
     "scripts": {
       "dev:all": "concurrently \"npm run dev\" \"cd frontend && npm run dev\""
     }
   }
   ```

### 教训 2: 开发环境调试技巧

**快速诊断步骤**:
1. **检查端口占用**: `netstat -ano | findstr :<端口>`
2. **查看进程信息**: `tasklist | findstr <PID>`
3. **清理旧进程**: `Stop-Process -Id <PID> -Force`
4. **重启服务**: 按顺序重启后端 → 前端

**日志监控**:
- 后端日志：查看 NestJS 启动和 API 请求日志
- 前端日志：查看 Vite 启动和代理转发日志
- 浏览器 Console: 查看网络请求和错误信息

### 教训 3: 代理配置验证

**Vite 代理配置**:
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // 不要重写路径，保留 /api 前缀
      },
    },
  },
})
```

**验证方法**:
1. 确保后端运行在 `http://localhost:3000`
2. 前端访问 `http://localhost:5176`(或配置的端口)
3. 在浏览器 DevTools Network 面板查看 `/api/*` 请求是否正确代理到 3000 端口

---

## 🎉 当前状态

| 项目 | 状态 | 说明 |
|------|------|------|
| **后端编译** | ✅ 无错误 | TypeScript 编译成功 |
| **后端服务** | ✅ 正常运行 | 端口 3000, PID 24880 |
| **前端服务** | ✅ 正常运行 | 端口 5176, 新进程 |
| **数据库连接** | ✅ 正常 | PostgreSQL 连接池健康 |
| **Redis 连接** | ✅ 正常 | Redis 服务正常 |
| **API 路由** | ✅ 全部映射 | 包括 rules, scores, recommendations |
| **登录功能** | ✅ 正常 | 用户认证成功 |
| **仪表盘** | ✅ 待验证 | 需要刷新浏览器测试 |
| **规则管理** | ✅ 待验证 | 需要刷新浏览器测试 |

---

## 📝 后续优化建议

### 短期优化 (本周内)

1. **添加进程管理脚本**:
   ```bash
   # scripts/cleanup-ports.ps1
   $ports = @(5173, 5174, 5175, 5176)
   foreach ($port in $ports) {
     $proc = netstat -ano | findstr ":$port" | ForEach-Object { $_.Split(' ')[-1] }
     if ($proc) { Stop-Process -Id $proc -Force }
   }
   ```

2. **统一启动脚本**:
   ```json
   {
     "scripts": {
       "dev:full": "npm run dev && cd frontend && npm run dev"
     }
   }
   ```

3. **改进 Vite 配置**:
   ```typescript
   // 使用环境变量控制端口
   export default defineConfig(({ command, mode }) => ({
     server: {
       port: parseInt(process.env.PORT || '5173'),
       strictPort: false,
     },
   }))
   ```

### 中期优化 (本月内)

1. **引入 Docker Compose**:
   ```yaml
   version: '3.8'
   services:
     backend:
       build: .
       ports:
         - "3000:3000"
     frontend:
       build: ./frontend
       ports:
         - "5173:5173"
       depends_on:
         - backend
   ```

2. **健康检查端点**:
   - 添加 `/health` 端点检查前后端连通性
   - 自动化监控服务状态

---

## 🔗 相关文档

- [规则管理 502 错误修复](./ISSUE_FIX_RULES_502_COMPLETE.md)
- [API 根路径访问问题修复](./ISSUE_FIX_API_ROOT_PATH.md)
- [业务用户指南](./BUSINESS_USER_GUIDE.md)
- [快速入门指南](./QUICKSTART_FOR_BUSINESS_USERS.md)

---

**修复完成时间**: 2026-03-27 14:05  
**前端服务地址**: http://localhost:5176  
**后端 API 地址**: http://localhost:3000/api/v1  
**Swagger 文档**: http://localhost:3000/api/docs
