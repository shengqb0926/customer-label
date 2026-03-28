# 客户标签智能推荐系统 - 代码风格指南

本规范基于项目实际开发中积累的最佳实践，所有团队成员应严格遵守。

---

## 📋 目录

1. [项目结构规范](#项目结构规范)
2. [TypeScript 编码规范](#typescript-编码规范)
3. [NestJS 后端规范](#nestjs-后端规范)
4. [React 前端规范](#react-前端规范)
5. [命名规范](#命名规范)
6. [注释规范](#注释规范)
7. [Git 提交规范](#git-提交规范)
8. [API 设计规范](#api-设计规范)

---

## 📁 项目结构规范

### 后端目录结构

```
src/
├── common/                 # 公共模块
│   ├── decorators/        # 自定义装饰器
│   ├── filters/           # 异常过滤器
│   ├── guards/            # 权限守卫
│   ├── interceptors/      # 拦截器
│   └── pipes/             # 管道
├── config/                # 配置文件
├── database/              # 数据库相关
│   ├── migrations/        # TypeORM 迁移文件
│   └── seeds/            # 种子数据
├── infrastructure/        # 基础设施
│   ├── database/         # 数据库服务
│   ├── redis/           # Redis 缓存
│   ├── websocket/       # WebSocket
│   └── lock/            # 分布式锁
├── modules/              # 业务模块（按领域划分）
│   ├── auth/            # 认证模块
│   ├── user/            # 用户模块
│   ├── recommendation/  # 推荐模块
│   ├── scoring/         # 评分模块
│   └── feedback/        # 反馈模块
├── app.module.ts        # 根模块
└── main.ts              # 入口文件
```

### 前端目录结构

```
frontend/
├── public/              # 静态资源
├── src/
│   ├── assets/         # 图片、字体等资源
│   ├── components/     # 通用组件
│   ├── layouts/        # 布局组件
│   ├── pages/          # 页面组件（按功能划分）
│   │   ├── Login/
│   │   ├── Dashboard/
│   │   ├── UserManagement/
│   │   └── ...
│   ├── services/       # API 服务层
│   ├── stores/         # 状态管理（Zustand）
│   ├── types/          # TypeScript 类型定义
│   ├── utils/          # 工具函数
│   ├── App.tsx         # 根组件
│   └── main.tsx        # 入口文件
```

---

## 💻 TypeScript 编码规范

### 1. 类型定义优先使用 interface

```typescript
// ✅ 推荐：使用 interface 定义对象类型
interface User {
  id: number;
  username: string;
  email: string;
}

// ✅ 推荐：使用 type 定义联合类型或复杂类型
type UserRole = 'admin' | 'user' | 'analyst';

type ApiResponse<T> = {
  data: T;
  message: string;
  statusCode: number;
};
```

### 2. 避免使用 any 类型

```typescript
// ❌ 不推荐
function processData(data: any) {
  return data.value;
}

// ✅ 推荐
interface ProcessableData {
  value: unknown;
}

function processData(data: ProcessableData): unknown {
  return data.value;
}
```

### 3. 枚举类型使用大写字母

``typescript
// ✅ 推荐
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  ANALYST = 'analyst',
}

// ❌ 不推荐
export enum UserRole {
  Admin = 'admin',
  User = 'user',
}
```

### 4. 使用可选链和空值合并运算符

``typescript
// ✅ 推荐
const userName = user?.profile?.name ?? '匿名用户';

// ❌ 不推荐
const userName = user && user.profile && user.profile.name ? user.profile.name : '匿名用户';
```

---

## 🏗️ NestJS 后端规范

### 1. Module 结构规范

每个业务模块应包含：

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

### 2. Controller 规范

#### 2.1 必须使用 Swagger 装饰器

```typescript
@ApiTags('用户管理')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: '获取用户列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiResponse({ status: 200, description: '返回用户列表' })
  async getUsers(@Query() query: GetUsersDto) {
    return await this.service.getUsers(query);
  }
}
```

#### 2.2 HTTP 方法选择

- `GET` - 查询操作（幂等）
- `POST` - 创建操作
- `PUT` - 全量更新
- `PATCH` - 部分更新
- `DELETE` - 删除操作

#### 2.3 统一返回格式

``typescript
// ✅ 推荐：直接返回数据对象
async getUser(id: number): Promise<User> {
  return await this.service.findOne(id);
}

// 让 interceptor 统一处理响应格式
```

### 3. Service 规范

#### 3.1 使用 InjectRepository 注入

```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}
}
```

#### 3.2 业务逻辑封装

```typescript
async createUser(dto: CreateUserDto): Promise<User> {
  // 1. 验证数据是否存在
  const exists = await this.repository.findOne({
    where: { username: dto.username },
  });
  
  if (exists) {
    throw new ConflictException('用户名已存在');
  }
  
  // 2. 密码加密
  const hashedPassword = await hash(dto.password, 10);
  
  // 3. 创建并保存
  const user = this.repository.create({
    ...dto,
    password: hashedPassword,
  });
  
  return await this.repository.save(user);
}
```

### 4. Entity 规范

#### 4.1 明确指定列名

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'full_name', type: 'varchar', length: 50, nullable: true })
  fullName: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
```

#### 4.2 添加业务方法

```typescript
@Entity('users')
export class User {
  // ... columns

  hasRole(role: UserRole): boolean {
    return this.roles.includes(role);
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }
}
```

### 5. DTO 规范

```typescript
export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}
```

---

### 6. 规则引擎代码规范（新增）⭐

#### 6.1 分层架构规范

规则引擎采用严格的三层架构，各层职责清晰：

```typescript
// ✅ 推荐：清晰的职责分层
// 第一层：Parser（解析层）- 负责语法解析和验证
class RuleParser {
  parse(expression: RuleExpression): ParsedExpression {
    // 1. 验证运算符有效性
    // 2. 解析条件
    // 3. 返回结构化数据
  }
  
  validate(expression: RuleExpression): boolean {
    // 纯验证逻辑，不修改数据
  }
}

// 第二层：Evaluator（评估层）- 负责执行评估
class RuleEvaluator {
  constructor(private parser: RuleParser) {}
  
  evaluateExpression(expr: RuleExpression, data: any): EvaluationResult {
    // 1. 使用 Parser 解析
    // 2. 递归评估条件
    // 3. 计算置信度
  }
  
  private evaluateCondition(condition: Condition, data: any): boolean {
    // 单个条件的评估逻辑
  }
}

// 第三层：Engine（引擎层）- 负责编排和推荐生成
@Injectable()
class RuleEngine {
  constructor(
    @InjectRepository(RecommendationRule)
    private ruleRepository: Repository<RecommendationRule>,
    private evaluator: RuleEvaluator,
  ) {}
  
  async recommend(customer: CustomerData): Promise<TagRecommendation[]> {
    // 1. 加载活跃规则
    // 2. 批量评估
    // 3. 去重排序
    // 4. 生成推荐
  }
}
```

#### 6.2 表达式类型定义规范

``typescript
// ✅ 推荐：使用联合类型确保类型安全
type LogicalOperator = 'AND' | 'OR' | 'NOT';
type ComparisonOperator = '>' | '<' | '>=' | '<=' | '==' | '!=';
type ArrayOperator = 'in' | 'includes';
type StringOperator = 'startsWith' | 'contains' | 'endsWith';
type RangeOperator = 'between';

type Operator = LogicalOperator | ComparisonOperator | ArrayOperator | StringOperator | RangeOperator;

interface BaseCondition {
  field: string;
  operator: ComparisonOperator | ArrayOperator | StringOperator | RangeOperator;
  value: any;
}

interface NestedExpression {
  operator: LogicalOperator;
  conditions: (BaseCondition | NestedExpression)[];
}

type RuleExpression = BaseCondition | NestedExpression;
```

#### 6.3 错误处理规范

``typescript
// ✅ 推荐：抛出明确的错误信息
parse(expression: any): ParsedExpression {
  if (!expression.operator) {
    throw new Error('规则表达式必须包含 operator 字段');
  }
  
  if (!['AND', 'OR', 'NOT'].includes(expression.operator)) {
    throw new Error(`无效的运算符：${expression.operator}，支持的运算符：AND, OR, NOT`);
  }
  
  if (!Array.isArray(expression.conditions)) {
    throw new Error('规则表达式必须包含 conditions 数组');
  }
  
  // 验证每个条件
  for (const condition of expression.conditions) {
    if (!condition.field) {
      throw new Error(`条件必须包含 field 字段：${JSON.stringify(condition)}`);
    }
    if (condition.value === undefined) {
      throw new Error(`条件必须包含 value 字段：${JSON.stringify(condition)}`);
    }
  }
}
```

#### 6.4 置信度计算规范

``typescript
// ✅ 推荐：根据逻辑运算符采用不同的置信度策略
evaluateExpression(expr: RuleExpression, data: any): EvaluationResult {
  if ('field' in expr) {
    // 基础条件
    const matched = this.evaluateCondition(expr, data);
    return {
      matched,
      confidence: matched ? 1 : 0,
      matchedConditions: matched ? 1 : 0,
      totalConditions: 1,
    };
  }
  
  // 嵌套表达式
  const results = expr.conditions.map(cond => this.evaluateExpression(cond, data));
  const matchedCount = results.filter(r => r.matched).length;
  const totalCount = results.length;
  
  let confidence: number;
  let matched: boolean;
  
  switch (expr.operator) {
    case 'AND':
      // AND: 所有条件都匹配才为 true，置信度 = 匹配数/总数
      matched = matchedCount === totalCount;
      confidence = matchedCount / totalCount;
      break;
      
    case 'OR':
      // OR: 任一条件匹配就为 true，置信度 = 匹配数/总数
      matched = matchedCount > 0;
      confidence = matchedCount / totalCount;
      break;
      
    case 'NOT':
      // NOT: 反向逻辑
      matched = matchedCount === 0;
      confidence = matched ? 1 : 0;
      break;
      
    default:
      throw new Error(`不支持的逻辑运算符：${expr.operator}`);
  }
  
  return { matched, confidence, matchedConditions: matchedCount, totalConditions: totalCount };
}
```

#### 6.5 推荐去重和排序规范

``typescript
// ✅ 推荐：使用 Map 高效去重，按置信度排序
deduplicateAndSort(recommendations: Partial<TagRecommendation>[]): Partial<TagRecommendation>[] {
  // 使用 Map 去重（tagName -> recommendation）
  // 相同标签只保留置信度最高的
  const map = new Map<string, Partial<TagRecommendation>>();
  
  for (const rec of recommendations) {
    const existing = map.get(rec.tagName!);
    if (!existing || (rec.confidence! > existing.confidence!)) {
      map.set(rec.tagName!, rec);
    }
  }
  
  // 转换为数组并按置信度降序排序
  return Array.from(map.values())
    .sort((a, b) => b.confidence! - a.confidence!);
}
```

#### 6.6 单元测试规范

``typescript
// ✅ 推荐：完整的测试覆盖，包括正常场景和边界情况
describe('RuleParser', () => {
  let parser: RuleParser;
  
  beforeEach(() => {
    parser = new RuleParser();
  });
  
  describe('parse()', () => {
    it('应正确解析简单条件', () => {
      const expr: RuleExpression = {
        operator: 'AND',
        conditions: [{ field: 'age', operator: '>=', value: 18 }],
      };
      
      const result = parser.parse(expr);
      
      expect(result.operator).toBe('AND');
      expect(result.conditions).toHaveLength(1);
    });
    
    it('应拒绝无效的运算符', () => {
      const invalidExpr = { operator: 'INVALID', conditions: [] };
      
      expect(() => parser.parse(invalidExpr)).toThrow('无效的运算符');
    });
    
    it('应拒绝缺失 field 的条件', () => {
      const invalidExpr = {
        operator: 'AND',
        conditions: [{ operator: '>=', value: 18 }],
      };
      
      expect(() => parser.parse(invalidExpr)).toThrow('必须包含 field 字段');
    });
  });
});
```

#### 6.7 性能优化规范

``typescript
// ✅ 推荐：惰性加载、缓存结果、避免重复计算
@Injectable()
class RuleEngineService {
  private activeRulesCache: RecommendationRule[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 分钟
  
  async getActiveRules(): Promise<RecommendationRule[]> {
    const now = Date.now();
    
    // 检查缓存是否有效
    if (this.activeRulesCache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.activeRulesCache;
    }
    
    // 从数据库加载（按优先级降序）
    this.activeRulesCache = await this.ruleRepository.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
    
    this.cacheTimestamp = now;
    return this.activeRulesCache;
  }
}
```

---


## ⚛️ React 前端规范

### 1. 组件结构规范

#### 1.1 使用函数组件 + Hooks

```typescript
import { useState, useEffect } from 'react';
import type { FC } from 'react';

interface UserListProps {
  initialData?: User[];
}

export const UserList: FC<UserListProps> = ({ initialData = [] }) => {
  const [users, setUsers] = useState<User[]>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  return <div>{/* render */}</div>;
};
```

#### 1.2 组件文件组织

``typescript
// 1. Imports
import { useState } from 'react';
import type { FC } from 'react';

// 2. Types
interface Props {
  // ...
}

// 3. Component
export const MyComponent: FC<Props> = (props) => {
  // ...
};

// 4. Sub-components (可选)
const SubComponent: FC = () => {
  // ...
};
```

### 2. 状态管理规范（Zustand）

#### 2.1 Store 定义

```typescript
import { create } from 'zustand';

interface UserState {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  token: null,
  
  setUser: (user) => {
    localStorage.setItem('user_info', JSON.stringify(user));
    set({ user });
  },
  
  setToken: (token) => {
    localStorage.setItem('access_token', token);
    set({ token });
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    set({ user: null, token: null });
  },
  
  hasRole: (role) => {
    const { user } = get();
    if (!user) return false;
    
    const roles = Array.isArray(role) ? role : [role];
    return roles.some(r => user.roles.includes(r));
  },
}));
```

#### 2.2 使用 Store

```typescript
// ✅ 推荐：在组件中使用
const { user, logout, hasRole } = useUserStore();

// ✅ 推荐：在组件外使用
useUserStore.getState().logout();
```

### 3. API 调用规范

#### 3.1 使用 Axios 实例

``typescript
// services/api.ts
const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
});

// 请求拦截器
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Token invalid');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

#### 3.2 Service 层封装

``typescript
// services/user.ts
import apiClient from './api';
import type { User, ApiResponse } from '@/types';

export const userService = {
  async getUsers(params?: { page?: number; limit?: number }): Promise<User[]> {
    return await apiClient.get('/users', { params });
  },

  async getUserById(id: number): Promise<User> {
    return await apiClient.get(`/users/${id}`);
  },

  async createUser(data: Partial<User>): Promise<User> {
    return await apiClient.post('/users', data);
  },
};
```

### 4. 路由保护规范

``typescript
// components/AuthGuard.tsx
interface AuthGuardProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function AuthGuard({ children, roles }: AuthGuardProps) {
  const { user, hasRole, restoreState } = useUserStore();

  // 尝试从 localStorage 恢复状态
  if (!user) {
    const restored = restoreState();
    if (!restored) {
      return <Navigate to="/login" replace />;
    }
  }

  // 需要特定角色权限
  if (roles && !hasRole(roles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

### 5. 页面组件规范

``typescript
// pages/UserManagement/index.tsx
import { useEffect, useState } from 'react';
import { Table, Button, Space } from 'antd';
import { userService } from '@/services/user';
import type { User } from '@/types';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary">新建用户</Button>
      </Space>
      
      <Table
        dataSource={users}
        loading={loading}
        columns={[
          { title: 'ID', dataIndex: 'id' },
          { title: '用户名', dataIndex: 'username' },
          { title: '邮箱', dataIndex: 'email' },
        ]}
      />
    </div>
  );
}
```

---

## 🏷️ 命名规范

### 1. 文件和目录

- **目录名**: 小写 + 连字符（kebab-case）
  ```
  ✅ user-management/
  ✅ auth/
  ❌ UserManagement/
  ```

- **文件名**: 
  - React 组件：PascalCase
    ```
    ✅ UserList.tsx
    ✅ AuthGuard.tsx
    ```
  - 工具函数：camelCase
    ```
    ✅ auth.ts
    ✅ user.service.ts
    ```
  - 类型定义：PascalCase
    ```
    ✅ user.types.ts
    ```

### 2. 类名和组件名

- 使用 PascalCase
  ```typescript
  ✅ export class UserController
  ✅ export const UserList: FC = () => {}
  ```

### 3. 变量和函数

- 使用 camelCase
  ```typescript
  ✅ const userName = 'admin';
  ✅ function loadUsers() {}
  ✅ const handleSave = () => {};
  ```

### 4. 常量和枚举值

- 使用 UPPER_SNAKE_CASE
  ```typescript
  ✅ const MAX_RETRY_COUNT = 3;
  ✅ enum UserRole { ADMIN = 'admin' }
  ```

### 5. 私有成员

- 使用下划线前缀（可选）
  ```typescript
  class UserService {
    private readonly _cacheKey = 'users';
  }
  ```

---

## 📝 注释规范

### 1. 文件头注释

```
/**
 * 用户管理服务
 * 负责用户相关的业务逻辑处理
 * 
 * @author Your Name
 * @since 2026-03-26
 */
```

### 2. 类和接口注释

```
/**
 * 用户实体类
 * 代表系统中的用户账户
 */
@Entity('users')
export class User {
  /**
   * 用户唯一标识
   * 使用 bigint 自增 ID
   */
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;
}
```

### 3. 函数注释

```
/**
 * 创建新用户
 * 
 * @param dto - 创建用户数据传输对象
 * @returns 创建成功的用户对象
 * @throws ConflictException 当用户名已存在时抛出
 * 
 * @example
 * await userService.createUser({
 *   username: 'newuser',
 *   email: 'user@example.com',
 *   password: 'secure123'
 * });
 */
async createUser(dto: CreateUserDto): Promise<User> {
  // ...
}
```

### 4. 行内注释

```
// ✅ 推荐：解释为什么这样做
// 使用 bcrypt 加密，10 轮是安全性和性能的平衡点
const hashedPassword = await hash(password, 10);

// ❌ 不推荐：解释代码在做什么
// 设置 loading 为 true
setLoading(true);
```

---

## 🔄 Git 提交规范

### 1. Commit Message 格式

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 2. Type 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具配置
- `ci`: CI/CD 配置

### 3. 示例

```
# 新功能
git commit -m "feat(auth): 添加 JWT 认证支持"

# Bug 修复
git commit -m "fix(api): 修复用户列表分页错误"

# 重构
git commit -m "refactor(user): 提取用户验证逻辑到独立服务"

# 完整提交信息
git commit -m "$(cat <<'EOF'
feat(auth): 修复 JWT 认证问题

主要变更：
1. 统一 JWT_SECRET 配置
2. 使用 registerAsync 配置 JwtModule
3. 确保与 .env 文件一致

修复 issue #123
EOF
)"
```

### 4. 分支命名

```
✅ feature/user-management
✅ fix/jwt-auth-error
✅ refactor/api-structure
❌ my-new-feature
❌ test
```

---

## 🔌 API 设计规范

### 1. RESTful 路径规范

```
✅ GET    /api/v1/users           # 获取用户列表
✅ GET    /api/v1/users/:id       # 获取单个用户
✅ POST   /api/v1/users           # 创建用户
✅ PUT    /api/v1/users/:id       # 更新用户
✅ DELETE /api/v1/users/:id       # 删除用户
✅ POST   /api/v1/users/:id/activate   # 激活用户

❌ GET    /api/v1/getUsers
❌ POST   /api/v1/createUser
```

### 2. 查询参数规范

```typescript
// ✅ 推荐：使用统一的查询参数
GET /api/v1/users?page=1&limit=20&username=admin&isActive=true

// 参数命名
- page: 页码（从 1 开始）
- limit: 每页数量
- sortBy: 排序字段
- order: 排序方向（asc/desc）
```

### 3. 响应格式规范

#### 3.1 成功响应

```
// 单个资源
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com"
}

// 资源列表（带分页）
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### 3.2 错误响应

```
{
  "statusCode": 400,
  "message": "用户名已存在",
  "error": "Bad Request",
  "timestamp": "2026-03-27T10:30:00.000Z",
  "path": "/api/v1/users"
}
```

### 4. HTTP 状态码使用

```
200 OK - 成功（GET, PUT）
201 Created - 创建成功（POST）
204 No Content - 删除成功（DELETE）

400 Bad Request - 请求参数错误
401 Unauthorized - 未认证
403 Forbidden - 无权限
404 Not Found - 资源不存在
409 Conflict - 资源冲突（如重复）
500 Internal Server Error - 服务器错误
```

### 5. 版本控制

```
✅ /api/v1/users
✅ /api/v2/users

// 在 URL 中显式声明版本
@Controller('api/v1/users')
```

---

## 🎨 CSS/样式规范

### 1. 使用 Tailwind CSS 优先

```
// ✅ 推荐
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h2 className="text-xl font-bold text-gray-800">标题</h2>
</div>

// ❌ 不推荐（除非必要）
<style jsx>{`
  .container {
    display: flex;
    padding: 1rem;
  }
`}</style>
```

### 2. Ant Design 组件使用

```
import { Button, Table, Form } from 'antd';

// ✅ 推荐：使用 Ant Design 组件库
<Button type="primary">提交</Button>

// 自定义样式通过 className 覆盖
<Button type="primary" className="custom-button">
  提交
</Button>
```

---

## 🧪 测试规范

### 1. 单元测试命名

```
describe('UserService', () => {
  describe('createUser', () => {
    it('应该成功创建用户', async () => {
      // ...
    });

    it('当用户名重复时应抛出异常', async () => {
      // ...
    });
  });
});
```

### 2. 测试文件命名

```
✅ user.service.spec.ts
✅ user.controller.test.ts
❌ test.ts
❌ usertest.ts
```

---

## 📊 性能优化规范

### 1. 前端性能

```
// 列表虚拟化（大数据量）
import { VirtualList } from 'rc-virtual-list';

// 图片懒加载
<img loading="lazy" src={image} />

// 路由懒加载
const Dashboard = lazy(() => import('@/pages/Dashboard'));
```

### 2. 后端性能

```
// 使用缓存
@CacheKey('users:list')
@CacheTTL(300) // 5 分钟
async getUsers() {
  // ...
}

// 数据库索引
@Index(['username', 'email'])
@Entity('users')
export class User {
  // ...
}
```

---

## 🔒 安全规范

### 1. 输入验证

```
// ✅ 后端必须验证
@IsString()
@MinLength(3)
@MaxLength(50)
username: string;

// ✅ 前端也要验证
<Form.Item
  rules={[
    { required: true, message: '请输入用户名' },
    { min: 3, message: '用户名至少 3 个字符' },
  ]}
>
```

### 2. SQL 注入防护

```
// ✅ 使用参数化查询
await this.repository.find({
  where: { username: userInput },
});

// ❌ 禁止拼接 SQL
await this.query(`SELECT * FROM users WHERE username = '${userInput}'`);
```

### 3. XSS 防护

```
// ✅ React 自动转义
<div>{userInput}</div>

// ❌ 避免使用 dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

---

## 📚 参考资源

- [NestJS 官方文档](https://docs.nestjs.com/)
- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [Ant Design 组件库](https://ant.design/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📝 更新日志

| 版本 | 日期 | 更新内容 | 作者 |
|------|------|----------|------|
| 1.0 | 2026-03-27 | 初始版本，整理现有规范 | 开发团队 |

---

**所有团队成员应在开始新任务前阅读并理解本规范。**

如有改进建议，请提交 Issue 或 Pull Request。
