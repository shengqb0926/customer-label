# 🛠️ 开发环境配置指南

## 📌 端口配置

本项目使用固定的端口配置，确保前后端通信稳定:

| 服务 | 端口 | 说明 |
|------|------|------|
| **后端 API** | `3000` | NestJS 服务器 |
| **前端应用** | `5176` | Vite 开发服务器 |
| **PostgreSQL** | `5432` | 数据库 (默认) |
| **Redis** | `6379` | 缓存服务 (默认) |

## 🚀 快速启动

### 方式一：一键启动前后端 (推荐)

```bash
npm run dev:all
```

这个命令会:
1. 自动清理被占用的端口 (3000 和 5176)
2. 同时启动后端和前端服务
3. 在同一个终端窗口显示两个服务的日志

### 方式二：分别启动

#### 1. 启动后端
```bash
# 终端 1
npm run dev:backend
# 或
npm run dev
```

#### 2. 启动前端
```bash
# 终端 2
npm run dev:frontend
# 或
cd frontend && npm run dev
```

### 方式三：手动清理端口后启动

如果遇到端口占用问题:

```bash
# 1. 清理端口
npm run clean:ports

# 2. 启动后端
npm run dev

# 3. 新终端启动前端
cd frontend && npm run dev
```

## 🔧 端口清理脚本

### 使用方法

```bash
# PowerShell 执行
.\scripts\cleanup-ports.ps1

# 或通过 npm
npm run clean:ports
```

### 功能说明

- 自动检测端口 3000 和 5176 是否被占用
- 显示占用进程的详细信息 (PID 和名称)
- 强制终止占用进程并释放端口
- 等待 500ms 确保端口完全释放

## 📝 配置文件位置

### 后端配置

- **主配置文件**: `src/main.ts`
- **端口设置**: 
  ```typescript
  await app.listen(3000);
  ```

### 前端配置

- **Vite 配置**: `frontend/vite.config.ts`
- **端口设置**:
  ```typescript
  server: {
    port: 5176, // 固定端口
    strictPort: false, // 被占用时自动尝试其他端口
  }
  ```

### 代理配置

前端的 `vite.config.ts` 中配置了 API 代理:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
}
```

这意味着:
- 前端请求 `/api/v1/xxx` 会自动代理到 `http://localhost:3000/api/v1/xxx`
- 无需在代码中写完整的后端地址

## 🎯 访问地址

启动成功后，可以通过以下地址访问:

| 服务 | URL | 说明 |
|------|-----|------|
| **前端应用** | http://localhost:5176 | React + Ant Design 界面 |
| **后端 API** | http://localhost:3000/api/v1 | RESTful API |
| **Swagger 文档** | http://localhost:3000/api/docs | API 接口文档 |
| **健康检查** | http://localhost:3000/health | 服务健康状态 |

## 🔍 故障排查

### 端口被占用

**症状**: 启动时报 `EADDRINUSE` 错误

**解决方案**:
```bash
# Windows PowerShell
netstat -ano | findstr :3000  # 查找占用后端端口的 PID
netstat -ano | findstr :5176  # 查找占用前端端口的 PID

# 停止进程
Stop-Process -Id <PID> -Force

# 或使用自动化脚本
npm run clean:ports
```

### 前后端连接失败

**检查清单**:
1. ✅ 确认后端运行在 `http://localhost:3000`
2. ✅ 确认前端运行在 `http://localhost:5176`
3. ✅ 检查浏览器 Console 是否有 CORS 错误
4. ✅ 验证代理配置是否正确

### 编译错误

```bash
# 重新编译后端
npm run build

# 如果还有错误，清理 node_modules
rm -rf node_modules dist
npm install
npm run build
```

## 💡 最佳实践

### 1. 统一使用启动脚本

推荐使用 `npm run dev:all`,可以确保:
- 端口自动清理
- 服务顺序启动
- 日志集中查看

### 2. 定期清理端口

开发过程中如果频繁重启服务，建议先执行:
```bash
npm run clean:ports
```

### 3. 使用环境变量 (可选)

如果需要自定义端口，可以修改配置文件使用环境变量:

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => ({
  server: {
    port: parseInt(process.env.FRONTEND_PORT || '5176'),
  },
}))
```

## 📚 相关文档

- [快速入门指南](./QUICKSTART_FOR_BUSINESS_USERS.md)
- [业务用户指南](./BUSINESS_USER_GUIDE.md)
- [项目初始化指南](../../../PROJECT_ONBOARDING.md)
- [开发检查清单](../../../DEVELOPMENT_CHECKLIST.md)

---

**最后更新**: 2026-03-27  
**维护人员**: 开发团队
