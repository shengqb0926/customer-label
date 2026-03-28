# 🚀 开发环境快速启动指南

## ⚡ 30 秒快速启动

### 推荐方式 (一键启动)

```bash
npm run dev:all
```

**这个命令会**:
1. 🧹 自动清理端口占用
2. 🔧 同时启动后端 (3000) 和前端 (5176)
3. 📊 在同一个窗口显示所有日志

---

## 📌 固定端口配置

| 服务 | 端口 | URL |
|------|------|-----|
| **后端** | `3000` | http://localhost:3000/api/v1 |
| **前端** | `5176` | http://localhost:5176 |
| **Swagger** | `3000` | http://localhost:3000/api/docs |

---

## 🛠️ 常用命令速查

### 启动服务

```bash
# 一键启动全部 (推荐)
npm run dev:all

# 只启动后端
npm run dev:backend

# 只启动前端
npm run dev:frontend
```

### 清理端口

```bash
# 清理被占用的端口
npm run clean:ports

# 手动执行 PowerShell 脚本
.\scripts\cleanup-ports.ps1
```

### 编译和测试

```bash
# 编译后端
npm run build

# 运行测试
npm test
```

---

## 🔍 故障排查

### 端口被占用？

```bash
# 自动清理
npm run clean:ports

# 或手动清理 (Windows)
netstat -ano | findstr :3000
Stop-Process -Id <PID> -Force
```

### 服务启动失败？

```bash
# 1. 清理端口
npm run clean:ports

# 2. 重新编译
npm run build

# 3. 重新启动
npm run dev:all
```

### 前后端连接失败？

检查清单:
- [ ] 后端运行在 `http://localhost:3000`
- [ ] 前端运行在 `http://localhost:5176`
- [ ] 浏览器访问的是 `http://localhost:5176` (不是 5173!)
- [ ] Network 面板无 CORS 错误

---

## 💻 VS Code 集成终端使用

### 方式一：单个终端 (推荐)

```bash
# 直接运行
npm run dev:all
```

### 方式二：拆分终端

**终端 1** - 后端:
```bash
npm run dev:backend
```

**终端 2** - 前端:
```bash
npm run dev:frontend
```

---

## 🎯 登录测试

启动成功后:

1. 访问：http://localhost:5176
2. 登录账号:
   ```
   用户名：business_user
   密码：Business123
   ```
3. 验证功能正常

---

## 📚 完整文档

需要更多详细信息？查看:
- [开发环境配置指南](./DEV_ENV_SETUP.md)
- [端口固定配置报告](./changes/add-smart-tag-recommendation/PORT_CONFIGURATION_COMPLETE.md)
- [业务用户指南](./changes/add-smart-tag-recommendation/BUSINESS_USER_GUIDE.md)

---

**最后更新**: 2026-03-27  
**适用版本**: v1.0.0
