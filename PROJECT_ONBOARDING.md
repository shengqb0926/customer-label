# 客户标签智能推荐系统 - 项目快速上手指南

欢迎加入项目！本文档将帮助你在 30 分钟内了解项目并开始开发。

---

## 📋 目录

1. [项目简介](#项目简介)
2. [技术栈](#技术栈)
3. [环境准备](#环境准备)
4. [快速启动](#快速启动)
5. [项目结构](#项目结构)
6. [核心功能](#核心功能)
7. [开发指南](#开发指南)
8. [常见问题](#常见问题)

---

## 🎯 项目简介

### 项目背景

客户标签智能推荐系统是一个基于规则引擎和机器学习的 B2B 营销平台，主要功能包括：

- **客户标签管理**：为客户打标签，建立完整的客户画像
- **智能推荐引擎**：基于规则和算法为客户推荐合适的产品/服务
- **规则管理系统**：灵活配置业务规则，支持动态调整
- **聚类分析**：使用机器学习算法进行客户分群
- **评分系统**：对客户进行多维度评分
- **反馈收集**：持续优化推荐效果

### 核心价值

- 🎯 **精准营销**：通过智能推荐提高营销转化率
- 📊 **数据驱动**：基于数据分析优化业务策略
- 🔧 **灵活配置**：无需代码即可调整推荐规则
- 📈 **持续优化**：通过反馈机制不断改进算法

---

## 🛠️ 技术栈

### 后端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| NestJS | ^10.x | Web 框架 |
| TypeScript | ^5.x | 开发语言 |
| TypeORM | ^0.3.x | ORM 框架 |
| PostgreSQL | 14+ | 主数据库 |
| Redis | 6+ | 缓存/消息队列 |
| JWT | - | 身份认证 |
| Swagger | - | API 文档 |

### 前端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^18.x | UI 框架 |
| Vite | ^5.x | 构建工具 |
| TypeScript | ^5.x | 开发语言 |
| Ant Design | ^5.x | UI 组件库 |
| Zustand | ^5.x | 状态管理 |
| Axios | ^1.x | HTTP 客户端 |
| React Router | ^6.x | 路由管理 |

---

## 📦 环境准备

### 必需软件

```bash
# Node.js (>= 18.x)
node -v

# npm (>= 9.x)
npm -v

# PostgreSQL (>= 14)
psql --version

# Redis (>= 6)
redis-server --version
```

### 可选工具

```bash
# Git
git --version

# Docker (用于容器化部署)
docker --version
```

### 环境配置

1. **克隆项目**
```bash
git clone <repository-url>
cd customer-label
```

2. **安装依赖**
```bash
# 后端依赖
npm install

# 前端依赖
cd frontend
npm install
cd ..
```

3. **配置环境变量**

复制 `.env.example` 到 `.env`：
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# 应用配置
PORT=3000
API_PREFIX=/api/v1
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=customer_label

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production-abc123xyz789
JWT_EXPIRES_IN=1h
```

4. **初始化数据库**
```bash
# 创建数据库
createdb customer_label

# 运行迁移
npm run typeorm migration:run
```

---

## 🚀 快速启动

### 开发模式

#### 1. 启动后端

```bash
# 方式一：热重载模式（推荐）
npm run dev

# 方式二：普通模式
npm run build && npm start
```

后端将在 `http://localhost:3000` 启动

#### 2. 启动前端

```bash
cd frontend
npm run dev
```

前端将在 `http://localhost:5174` 启动（端口可能自动递增）

#### 3. 访问应用

- **前端界面**: http://localhost:5174
- **API 文档**: http://localhost:3000/api/docs
- **健康检查**: http://localhost:3000/api/v1/health

### 默认账号

```
管理员：admin / admin123
分析师：analyst / analyst123
普通用户：user / user123
```

---

## 📁 项目结构

### 完整目录树

```
customer-label/
├── src/                      # 后端源代码
│   ├── common/              # 公共模块
│   │   ├── decorators/     # 装饰器
│   │   ├── filters/        # 异常过滤器
│   │   ├── guards/         # 权限守卫
│   │   └── interceptors/   # 拦截器
│   ├── config/              # 配置文件
│   ├── infrastructure/      # 基础设施
│   │   ├── database/       # 数据库服务
│   │   ├── redis/          # Redis 缓存
│   │   └── websocket/      # WebSocket
│   ├── modules/             # 业务模块
│   │   ├── auth/           # 认证模块
│   │   ├── user/           # 用户模块
│   │   ├── recommendation/ # 推荐模块
│   │   ├── scoring/        # 评分模块
│   │   └── feedback/       # 反馈模块
│   ├── app.module.ts       # 根模块
│   └── main.ts             # 入口文件
├── frontend/                # 前端项目
│   ├── public/             # 静态资源
│   ├── src/
│   │   ├── assets/         # 资源文件
│   │   ├── components/     # 通用组件
│   │   ├── layouts/        # 布局组件
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API 服务
│   │   ├── stores/         # 状态管理
│   │   ├── types/          # 类型定义
│   │   ├── App.tsx         # 根组件
│   │   └── main.tsx        # 入口文件
│   └── package.json
├── CODE_STYLE_GUIDE.md     # 代码规范
├── DEVELOPMENT_CHECKLIST.md # 开发清单
└── package.json
```

---

## 🔑 核心功能

### 1. 认证授权模块

**位置**: `src/modules/auth/`

**关键文件**:
- `auth.controller.ts` - 认证接口
- `auth.service.ts` - 认证逻辑
- `strategies/jwt.strategy.ts` - JWT 验证
- `guards/jwt-auth.guard.ts` - JWT 守卫

**API 端点**:
```typescript
POST /api/v1/auth/login      // 登录
POST /api/v1/auth/refresh    // 刷新 token
POST /api/v1/auth/me         // 获取当前用户
```

**使用示例**:
```typescript
// 前端登录
const login = async (username: string, password: string) => {
  const response = await apiClient.post('/auth/login', {
    username,
    password,
  });
  
  // 保存 token
  localStorage.setItem('access_token', response.access_token);
  localStorage.setItem('user_info', JSON.stringify(response.user));
};
```

---

### 2. 用户管理模块

**位置**: `src/modules/user/`

**关键文件**:
- `user.controller.ts` - 用户接口
- `user.service.ts` - 用户逻辑
- `entities/user.entity.ts` - 用户实体
- `dto/create-user.dto.ts` - 创建用户 DTO

**API 端点**:
```typescript
GET    /api/v1/users            // 获取用户列表
GET    /api/v1/users/:id        // 获取用户详情
POST   /api/v1/users            // 创建用户
PUT    /api/v1/users/:id        // 更新用户
DELETE /api/v1/users/:id        // 删除用户
POST   /api/v1/users/:id/activate   // 激活用户
```

**角色权限**:
```typescript
enum UserRole {
  ADMIN = 'admin',      // 管理员：所有权限
  ANALYST = 'analyst',  // 分析师：查看和分析权限
  USER = 'user',        // 普通用户：基础权限
}
```

---

### 3. 推荐系统模块

**位置**: `src/modules/recommendation/`

**子模块**:
- **推荐结果**: 存储和管理推荐结果
- **规则管理**: 业务规则配置和执行
- **聚类分析**: 客户聚类算法

**核心流程**:
```
1. 读取客户数据
2. 应用业务规则
3. 生成推荐标签
4. 保存推荐结果
5. 收集用户反馈
6. 优化推荐算法
```

---

### 4. 评分系统模块

**位置**: `src/modules/scoring/`

**功能**:
- 客户综合评分
- 标签权重计算
- 评分趋势分析

---

### 5. 反馈系统模块

**位置**: `src/modules/feedback/`

**功能**:
- 推荐接受度统计
- 反馈数据收集
- 效果分析报告

---

## 💻 开发指南

### 添加新的 API 接口

#### 步骤 1: 创建 Controller

```typescript
// src/modules/example/example.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ExampleService } from './example.service';
import { CreateExampleDto } from './dto/create-example.dto';

@ApiTags('示例管理')
@Controller('examples')
export class ExampleController {
  constructor(private readonly service: ExampleService) {}

  @Post()
  @ApiOperation({ summary: '创建示例' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Body() dto: CreateExampleDto) {
    return await this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取示例列表' })
  @ApiResponse({ status: 200, description: '返回示例列表' })
  async findAll() {
    return await this.service.findAll();
  }
}
```

#### 步骤 2: 创建 Service

```typescript
// src/modules/example/example.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Example } from './entities/example.entity';
import { CreateExampleDto } from './dto/create-example.dto';

@Injectable()
export class ExampleService {
  constructor(
    @InjectRepository(Example)
    private readonly repository: Repository<Example>,
  ) {}

  async create(dto: CreateExampleDto): Promise<Example> {
    const example = this.repository.create(dto);
    return await this.repository.save(example);
  }

  async findAll(): Promise<Example[]> {
    return await this.repository.find();
  }

  async findOne(id: number): Promise<Example> {
    const example = await this.repository.findOne({ where: { id } });
    if (!example) {
      throw new NotFoundException('示例不存在');
    }
    return example;
  }
}
```

#### 步骤 3: 创建 Entity

```typescript
// src/modules/example/entities/example.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('examples')
export class Example {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

#### 步骤 4: 注册 Module

```typescript
// src/modules/example/example.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExampleController } from './example.controller';
import { ExampleService } from './example.service';
import { Example } from './entities/example.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Example])],
  controllers: [ExampleController],
  providers: [ExampleService],
  exports: [ExampleService],
})
export class ExampleModule {}
```

#### 步骤 5: 添加到 app.module.ts

```typescript
// src/app.module.ts
import { ExampleModule } from './modules/example/example.module';

@Module({
  imports: [
    // ...其他模块
    ExampleModule,
  ],
})
export class AppModule {}
```

---

### 添加新的前端页面

#### 步骤 1: 创建页面组件

```typescript
// frontend/src/pages/Example/index.tsx
import { useEffect, useState } from 'react';
import { Table, Button, Space, message } from 'antd';
import { exampleService } from '@/services/example';
import type { Example } from '@/types';

export default function ExamplePage() {
  const [data, setData] = useState<Example[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await exampleService.getExamples();
      setData(result);
    } catch (error) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary">新建示例</Button>
      </Space>

      <Table
        dataSource={data}
        loading={loading}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80 },
          { title: '名称', dataIndex: 'name' },
          { title: '描述', dataIndex: 'description' },
        ]}
      />
    </div>
  );
}
```

#### 步骤 2: 创建 Service

```typescript
// frontend/src/services/example.ts
import apiClient from './api';
import type { Example } from '@/types';

export const exampleService = {
  async getExamples(): Promise<Example[]> {
    return await apiClient.get('/examples');
  },

  async createExample(data: Partial<Example>): Promise<Example> {
    return await apiClient.post('/examples', data);
  },
};
```

#### 步骤 3: 添加路由

```typescript
// frontend/src/App.tsx
import ExamplePage from '@/pages/Example';

function App() {
  return (
    <Routes>
      {/* 其他路由 */}
      <Route
        path="/examples"
        element={
          <AuthGuard>
            <ExamplePage />
          </AuthGuard>
        }
      />
    </Routes>
  );
}
```

---

## ❓ 常见问题

### Q1: 登录成功后立即跳转回登录页

**原因**: JWT token 无效或过期

**解决方案**:
1. 检查 `.env` 中的 `JWT_SECRET` 是否一致
2. 清除浏览器 localStorage 重新登录
3. 检查后端日志确认 token 生成逻辑

---

### Q2: API 请求返回 401 Unauthorized

**原因**: 
- Token 未附加到请求头
- Token 已过期
- 路由守卫配置错误

**解决方案**:
```typescript
// 检查 api.ts 中的拦截器
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

### Q3: 数据库迁移失败

**原因**:
- 数据库连接配置错误
- 迁移文件顺序问题
- 表已存在

**解决方案**:
```bash
# 检查数据库连接
psql -h localhost -U postgres -d customer_label

# 重置迁移（开发环境）
npm run typeorm migration:revert

# 重新运行迁移
npm run typeorm migration:run
```

---

### Q4: 前端页面空白无错误

**排查步骤**:
1. 打开浏览器开发者工具
2. 查看 Console 是否有错误
3. 查看 Network 请求是否成功
4. 检查路由配置是否正确
5. 确认组件是否正常渲染

---

### Q5: 热重载不生效

**后端**:
```bash
# 确保使用 dev 模式
npm run dev

# 检查 nest-cli.json 配置
{
  "watchAssets": true,
  "assets": ["**/*.proto"]
}
```

**前端**:
```bash
# Vite 默认支持热重载
# 如不生效，重启开发服务器
npm run dev
```

---

## 📚 进阶阅读

- [代码风格指南](./CODE_STYLE_GUIDE.md) - 详细的编码规范
- [开发检查清单](./DEVELOPMENT_CHECKLIST.md) - 提交前必查
- [API 文档](http://localhost:3000/api/docs) - Swagger 接口文档

---

## 🆘 获取帮助

遇到问题时：

1. **查看日志**: 后端和前端控制台的错误信息
2. **搜索 Issue**: GitHub Issues 中是否有类似问题
3. **查阅文档**: 官方文档和技术规范
4. **询问团队**: 在团队群组中提问

---

## ✅ 检查清单

完成以下任务确认你已成功上手：

- [ ] 环境配置完成
- [ ] 后端服务启动成功
- [ ] 前端服务启动成功
- [ ] 能够成功登录
- [ ] 查看 API 文档正常
- [ ] 理解项目目录结构
- [ ] 知道如何添加新接口
- [ ] 知道如何添加新页面

---

**祝你开发愉快！** 🎉

如有任何问题，请随时查阅文档或联系团队成员。
