# 角色权限控制文档

## 📋 角色定义

系统定义了三种核心角色，采用基于角色的访问控制（RBAC）模型。

### 1. 管理员（Admin）
**角色标识**: `admin`  
**默认账号**: `admin / admin123`

#### 权限说明
- ✅ 拥有系统所有权限
- ✅ 用户管理（创建、编辑、删除、重置密码）
- ✅ 规则管理（CRUD、激活/停用）
- ✅ 聚类配置管理（CRUD、执行分析）
- ✅ 查看系统监控和统计信息
- ✅ 批量导入/导出功能

---

### 2. 分析师（Analyst）
**角色标识**: `analyst`  
**默认账号**: `analyst / analyst123`

#### 权限说明
- ✅ 规则管理（创建、编辑、查询、激活/停用，**不能删除**）
- ✅ 聚类配置管理（创建、编辑、查询、执行分析，**不能删除**）
- ✅ 查看所有数据和统计信息
- ✅ 导出功能
- ❌ 用户管理
- ❌ 删除操作
- ❌ 系统配置

---

### 3. 普通用户（User）
**角色标识**: `user`  
**默认账号**: `user / user123`

#### 权限说明
- ✅ 查看推荐列表和详情
- ✅ 查看评分结果
- ✅ 提交反馈（接受/拒绝推荐）
- ✅ 查看规则列表（仅已激活的规则）
- ✅ 查看聚类结果
- ❌ 创建/编辑/删除操作
- ❌ 执行分析任务
- ❌ 系统配置

---

## 🔐 权限矩阵

### 用户管理模块

| API | Admin | Analyst | User |
|-----|-------|---------|------|
| POST /users (创建用户) | ✅ | ❌ | ❌ |
| GET /users (用户列表) | ✅ | ✅ | ❌ |
| GET /users/:id (用户详情) | ✅ | ✅ | ⚠️ 仅自己 |
| PUT /users/:id (更新用户) | ✅ | ⚠️ 仅自己 | ⚠️ 仅自己 |
| DELETE /users/:id (删除用户) | ✅ | ❌ | ❌ |
| POST /users/:id/activate | ✅ | ❌ | ❌ |
| POST /users/:id/deactivate | ✅ | ❌ | ❌ |
| POST /users/:id/reset-password | ✅ | ❌ | ❌ |

### 规则管理模块

| API | Admin | Analyst | User |
|-----|-------|---------|------|
| POST /rules (创建规则) | ✅ | ✅ | ❌ |
| GET /rules (规则列表) | ✅ | ✅ | ✅ |
| GET /rules/:id (规则详情) | ✅ | ✅ | ✅ |
| PUT /rules/:id (更新规则) | ✅ | ✅ | ❌ |
| DELETE /rules/:id (删除规则) | ✅ | ❌ | ❌ |
| POST /rules/:id/activate | ✅ | ✅ | ❌ |
| POST /rules/:id/deactivate | ✅ | ✅ | ❌ |
| POST /rules/test (测试表达式) | ✅ | ✅ | ✅ |
| POST /rules/batch/import | ✅ | ❌ | ❌ |
| GET /rules/batch/export | ✅ | ✅ | ✅ |

### 聚类配置模块

| API | Admin | Analyst | User |
|-----|-------|---------|------|
| POST /clustering (创建配置) | ✅ | ✅ | ❌ |
| GET /clustering (配置列表) | ✅ | ✅ | ✅ |
| GET /clustering/:id (配置详情) | ✅ | ✅ | ✅ |
| PUT /clustering/:id (更新配置) | ✅ | ✅ | ❌ |
| DELETE /clustering/:id (删除配置) | ✅ | ❌ | ❌ |
| POST /clustering/:id/activate | ✅ | ✅ | ❌ |
| POST /clustering/:id/deactivate | ✅ | ✅ | ❌ |
| POST /clustering/:id/run (执行分析) | ✅ | ✅ | ❌ |
| GET /clustering/:id/stats (统计信息) | ✅ | ✅ | ✅ |

### 数据库监控模块

| API | Admin | Analyst | User |
|-----|-------|---------|------|
| GET /database/health | ✅ | ✅ | ❌ |
| GET /database/stats | ✅ | ✅ | ❌ |
| GET /database/info | ✅ | ✅ | ❌ |

**图例**: ✅ 允许 | ❌ 禁止 | ⚠️ 限制条件

---

## 🛡️ 实现方式

### 1. 角色装饰器

```typescript
import { Roles } from './common/decorators/roles.decorator';
import { UserRole } from './modules/user/entities/user.entity';

@Roles(UserRole.ADMIN, UserRole.ANALYST)
@Post()
async createRule(@Body() dto: CreateRuleDto) {
  // 仅管理员和分析师可以访问
}
```

### 2. 权限守卫

```typescript
// common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // 没有角色要求，允许访问
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

### 3. JWT Payload

```typescript
// 登录成功后，JWT payload 包含用户角色
{
  sub: 1,
  username: 'admin',
  email: 'admin@example.com',
  roles: ['admin', 'user'],
  iat: 1234567890,
  exp: 1234571490
}
```

---

## 📝 使用示例

### 管理员操作示例

```bash
# 1. 登录获取 token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 返回:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "id": 1,
#     "username": "admin",
#     "roles": ["admin", "user"]
#   }
# }

# 2. 创建新用户
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "roles": ["user"]
  }'

# 3. 创建规则
curl -X POST http://localhost:3000/rules \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{
    "ruleName": "高价值客户规则",
    "ruleExpression": "orderCount >= 10 && totalAmount >= 10000",
    "priority": 80,
    "tagTemplate": {"name": "高价值客户", "category": "客户价值", "baseConfidence": 0.85}
  }'
```

### 分析师操作示例

```bash
# 1. 登录
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"analyst","password":"analyst123"}'

# 2. 创建规则（允许）
curl -X POST http://localhost:3000/rules \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{...}'

# 3. 删除规则（禁止 - 403 Forbidden）
curl -X DELETE http://localhost:3000/rules/1 \
  -H "Authorization: Bearer ..."
# 返回：{"statusCode":403,"message":"权限不足"}

# 4. 执行聚类分析（允许）
curl -X POST http://localhost:3000/clustering/1/run \
  -H "Authorization: Bearer ..."
```

### 普通用户操作示例

```bash
# 1. 登录
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"user123"}'

# 2. 查看规则列表（允许）
curl -X GET http://localhost:3000/rules \
  -H "Authorization: Bearer ..."

# 3. 创建规则（禁止 - 403 Forbidden）
curl -X POST http://localhost:3000/rules \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{...}'
# 返回：{"statusCode":403,"message":"权限不足"}

# 4. 提交反馈（允许）
curl -X POST http://localhost:3000/feedback \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{
    "recommendationId": 123,
    "isAccepted": true
  }'
```

---

## 🔄 角色扩展

### 添加新角色

1. **在 UserRole 枚举中添加新角色**

```typescript
// src/modules/user/entities/user.entity.ts
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  ANALYST = 'analyst',
  VIEWER = 'viewer',  // 新增：只读用户
}
```

2. **在控制器中使用新角色**

```typescript
@Roles(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
@Get()
async findAll() {
  // 所有角色都可以访问
}
```

3. **创建初始化数据**

```typescript
// 在 seeder 中添加新角色用户
const viewer = userRepository.create({
  username: 'viewer',
  email: 'viewer@example.com',
  password: await bcrypt.hash('viewer123', 10),
  fullName: '只读用户',
  roles: [UserRole.VIEWER],
  isActive: true,
});
```

---

## 🎯 最佳实践

### 1. 最小权限原则
- 默认授予最小必要权限
- 需要更多权限时显式添加角色装饰器

### 2. 角色组合
- 用户可以拥有多个角色
- 例如：`roles: ['admin', 'analyst']`

### 3. 权限验证
- 始终在服务层再次验证权限（不要仅依赖守卫）
- 记录所有权限拒绝的日志

### 4. 审计日志
```typescript
// 记录敏感操作
this.logger.log(
  `User ${user.username} (${user.roles.join(',')}) ` +
  `performed action: ${action} on resource: ${resourceId}`,
);
```

---

## 📊 默认账号汇总

| 角色 | 用户名 | 密码 | 邮箱 |
|------|--------|------|------|
| Admin | admin | admin123 | admin@example.com |
| Analyst | analyst | analyst123 | analyst@example.com |
| User | user | user123 | user@example.com |

⚠️ **重要**: 生产环境必须修改默认密码！

---

## 🔧 配置和初始化

### 1. 运行数据迁移

```bash
# 创建数据库表
npm run migration:generate -- src/database/migrations/CreateUserTable

# 运行迁移
npm run migration:run
```

### 2. 初始化默认用户

在应用启动时自动运行 seeder：

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 初始化默认用户
  const dataSource = app.get(DataSource);
  const seeder = new UserSeeder();
  await seeder.run(dataSource);
  
  await app.listen(3000);
}
```

### 3. 环境变量

```bash
# .env
JWT_SECRET=your-production-secret-key-change-this
```

---

## 🚨 安全建议

1. **密码策略**
   - 最小长度 8 位
   - 包含大小写字母、数字、特殊字符
   - 定期更换密码

2. **Token 安全**
   - 设置合理的过期时间（建议 1-2 小时）
   - 使用 HTTPS 传输
   - 实现 Token 黑名单机制

3. **会话管理**
   - 记录登录 IP 和时间
   - 异常登录检测
   - 支持强制登出

4. **审计日志**
   - 记录所有 CRUD 操作
   - 记录权限拒绝事件
   - 定期审计日志

---

## 📈 后续改进

- [ ] 实现资源级权限（只能管理自己的数据）
- [ ] 添加权限缓存提高性能
- [ ] 实现动态角色配置（从数据库读取）
- [ ] 添加操作审计日志模块
- [ ] 实现细粒度的权限点（permission points）
- [ ] 支持临时授权和权限委托
