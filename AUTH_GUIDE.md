# 认证授权使用指南

## 🔐 概述

本项目使用 **JWT (JSON Web Token)** 进行身份认证，支持 **RBAC (Role-Based Access Control)** 基于角色的访问控制。

**核心技术栈**:
- ✅ [@nestjs/jwt](file://d:\VsCode\customer-label\node_modules\@nestjs\jwt) - JWT 令牌生成和验证
- ✅ [@nestjs/passport](file://d:\VsCode\customer-label\node_modules\@nestjs\passport) - Passport 认证框架集成
- ✅ [passport-jwt](file://d:\VsCode\customer-label\node_modules\passport-jwt) - JWT 策略实现
- ✅ [passport-local](file://d:\VsCode\customer-label\node_modules\passport-local) - 本地用户名密码策略
- ✅ [bcrypt](file://d:\VsCode\customer-label\node_modules\bcryptjs) - 密码加密（待集成）
- ✅ [class-validator](file://d:\VsCode\customer-label\node_modules\class-validator) - DTO 验证

---

## 🏗️ 架构设计

### 认证流程

```
┌─────────┐      1. 登录请求       ┌─────────┐
│  Client │ ───────────────────→   │  Server │
│         │                        │         │
│         │ ← ───────────────────  │         │
│         │    2. 返回 JWT Token   │         │
└─────────┘                        └─────────┘
     │
     │ 3. 携带 Token 访问 API
     │    Authorization: Bearer <token>
     ↓
┌─────────┐
│  Server │
│ Guards  │ → 4. 验证 Token 有效性
│         │ → 5. 提取用户信息
│         │ → 6. 检查角色权限
└─────────┘
```

### 目录结构

```
src/modules/auth/
├── auth.module.ts              # 认证模块定义
├── auth.service.ts             # 认证服务
├── auth.controller.ts          # 认证控制器
└── strategies/
    ├── jwt.strategy.ts         # JWT 策略
    └── local.strategy.ts       # 本地认证策略

src/common/
├── guards/
│   └── roles.guard.ts          # RBAC 角色守卫
└── decorators/
    └── roles.decorator.ts      # 角色装饰器
```

---

## 🔧 配置说明

### 环境变量

在 `.env` 文件中配置：

```env
# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production-abc123xyz789
JWT_EXPIRES_IN=1h
```

**⚠️ 安全提示**:
- 生产环境必须修改 `JWT_SECRET` 为强随机字符串
- 推荐使用 `crypto.randomBytes(32).toString('hex')` 生成

---

## 📖 使用示例

### 1. 用户登录

**请求**:
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**响应**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "roles": ["admin", "user"]
  }
}
```

### 2. 访问受保护的 API

**请求**:
```http
GET /api/v1/recommendations/stats
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应**:
- ✅ Token 有效：返回数据
- ❌ Token 无效：`401 Unauthorized`

### 3. 刷新 Token

**请求**:
```http
POST /api/v1/auth/refresh
Authorization: Bearer <current_token>
```

**响应**:
```json
{
  "access_token": "new_jwt_token...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "user": { ... }
}
```

### 4. 获取当前用户信息

**请求**:
```http
POST /api/v1/auth/me
Authorization: Bearer <token>
```

**响应**:
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "roles": ["admin", "user"]
  }
}
```

---

## 🛡️ RBAC 角色权限控制

### 使用 @Roles 装饰器

在 Controller 方法上使用 `@Roles()` 装饰器限制访问：

```typescript
import { Roles } from '../common/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('recommendations')
export class RecommendationController {
  
  // 仅管理员可访问
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async deleteRecommendation(@Param('id') id: number) {
    // ...
  }

  // 管理员或高级用户可访问
  @Post('batch-generate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'senior_user')
  async batchGenerate(@Body() body: any) {
    // ...
  }

  // 所有认证用户可访问（无需特定角色）
  @Get('customer/:id')
  @UseGuards(AuthGuard('jwt'))
  async getRecommendations(@Param('id') id: number) {
    // ...
  }
}
```

### 角色层级建议

```typescript
// 推荐的角色定义
const ROLES = {
  ADMIN: 'admin',           // 管理员 - 所有权限
  SENIOR_USER: 'senior_user', // 高级用户 - 部分管理权限
  USER: 'user',             // 普通用户 - 基础权限
  GUEST: 'guest',           // 访客 - 只读权限
};
```

---

## 🔍 测试认证功能

### 使用 cURL 测试

```bash
# 1. 登录获取 Token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 2. 使用 Token 访问 API
curl -X GET http://localhost:3000/api/v1/recommendations/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 3. 刷新 Token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 4. 获取当前用户信息
curl -X POST http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 使用 Postman 测试

1. **创建登录请求**:
   - Method: POST
   - URL: `http://localhost:3000/api/v1/auth/login`
   - Body (JSON): `{"username":"admin","password":"admin123"}`

2. **保存 Token**:
   - 从响应中复制 `access_token`
   - 在 Postman 的 Tests 中添加：
   ```javascript
   pm.environment.set("access_token", pm.response.json().access_token);
   ```

3. **创建受保护请求**:
   - Method: GET
   - URL: `http://localhost:3000/api/v1/recommendations/stats`
   - Headers: `Authorization: Bearer {{access_token}}`

---

## 📝 在 Swagger UI 中使用

1. 访问 Swagger UI: `http://localhost:3000/api/docs`

2. 点击 **"Authorize"** 按钮

3. 输入 JWT Token:
   ```
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. 点击 **"Authorize"** 确认

5. 现在所有需要认证的接口都会自动包含 Token

---

## ⚙️ 高级配置

### 自定义 Token 过期时间

```typescript
// auth.service.ts
async login(user: UserPayload) {
  const payload = { sub: user.id, username: user.username, roles: user.roles };
  
  return {
    access_token: this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    }),
    expires_in: 3600,
    token_type: 'Bearer',
    user,
  };
}
```

### 多 Token 支持（Access + Refresh）

```typescript
async login(user: UserPayload) {
  const accessToken = this.jwtService.sign(payload, {
    expiresIn: '1h',
  });
  
  const refreshToken = this.jwtService.sign(payload, {
    expiresIn: '7d',
  });
  
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
    token_type: 'Bearer',
  };
}
```

### Token 黑名单机制

使用 Redis 实现 Token 黑名单：

```typescript
@Injectable()
export class TokenBlacklistService {
  constructor(private readonly redis: RedisService) {}

  async blacklist(token: string, expiresAt: Date): Promise<void> {
    const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      await this.redis.set(`blacklist:${token}`, '1', ttl);
    }
  }

  async isBlacklisted(token: string): Promise<boolean> {
    return await this.redis.exists(`blacklist:${token}`) === 1;
  }
}
```

---

## 🔒 安全最佳实践

### 1. 强密码策略

```typescript
// 密码强度验证
function validatePassword(password: string): boolean {
  // 至少 8 位，包含大小写字母、数字和特殊字符
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
}
```

### 2. 密码加密存储

```typescript
// 使用 bcrypt 加密密码
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

// 验证密码
const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
```

### 3. 防止暴力破解

```typescript
// 实现登录失败次数限制
@Injectable()
export class LoginThrottleGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    
    const attempts = await this.redis.get(`login_attempts:${ip}`);
    
    if (attempts && parseInt(attempts) >= 5) {
      throw new TooManyRequestsException('Too many login attempts');
    }
    
    return true;
  }
}
```

### 4. HTTPS 传输

**生产环境必须使用 HTTPS**:
```typescript
// main.ts
const httpsOptions = {
  key: fs.readFileSync('./secrets/private.key'),
  cert: fs.readFileSync('./secrets/public.crt'),
};

await NestFactory.create(AppModule, { httpsOptions });
```

---

## 🐛 故障排查

### 问题 1: Token 验证失败

**错误**: `UnauthorizedException: Invalid token`

**解决方案**:
1. 检查 Token 格式是否正确（`Bearer <token>`）
2. 检查 Token 是否过期
3. 检查 `JWT_SECRET` 是否一致

### 问题 2: 角色权限不生效

**错误**: 用户有角色但仍被拒绝访问

**解决方案**:
1. 确认 `RolesGuard` 已正确注入
2. 检查 `@Roles()` 装饰器参数是否正确
3. 确认用户对象中包含 `roles` 字段

### 问题 3: CORS 错误

**错误**: `No 'Access-Control-Allow-Origin' header`

**解决方案**:
```typescript
// main.ts
app.enableCors({
  origin: 'https://yourdomain.com', // 指定域名
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // 允许携带 Cookie
});
```

---

## 📚 相关资源

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS Authorization](https://docs.nestjs.com/security/authorization)
- [JWT.io](https://jwt.io/) - JWT 在线解码工具
- [Passport.js](http://www.passportjs.org/) - Passport 官方文档

---

**文档版本**: 1.0  
**创建日期**: 2026-03-26  
**最后更新**: 2026-03-26
