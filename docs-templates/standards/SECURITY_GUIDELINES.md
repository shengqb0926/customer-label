# 安全规范 (Security Guidelines)

**版本**: v1.0  
**生效日期**: 2026-03-30  
**适用范围**: customer-label 项目全体开发人员

---

## 🔐 一、认证与授权

### 1.1 JWT Token 管理

```typescript
// ✅ 正确配置
const jwtConfig = {
  secret: process.env.JWT_SECRET,  // 环境变量存储
  expiresIn: '2h',                  // 短期 Token
  refreshExpiresIn: '7d',           // Refresh Token
};

// ✅ Token 存储（HttpOnly Cookie）
@Post('login')
async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
  const tokens = await this.authService.login(dto);
  
  res.cookie('access_token', tokens.access_token, {
    httpOnly: true,      // 禁止 JavaScript 访问
    secure: true,        // HTTPS only
    sameSite: 'strict',  // CSRF 防护
    maxAge: 2 * 60 * 60 * 1000,  // 2 小时
  });
  
  return { success: true };
}

// ❌ 错误做法（存储在 localStorage）
localStorage.setItem('token', token);  // XSS 攻击风险
```

### 1.2 RBAC 权限控制

```typescript
// ✅ 使用装饰器进行权限校验
@UseGuards(JwtAuthGuard, RolesGuard)
@RolesAllowed('ADMIN')
@Delete(':id')
async remove(@Param('id') id: number): Promise<void> {
  return this.customerService.remove(id);
}

// ✅ 资源所有权验证
async updateCustomer(
  customerId: number,
  userId: number,
  dto: UpdateCustomerDto
): Promise<Customer> {
  const customer = await this.findOne(customerId);
  
  if (customer.userId !== userId) {
    throw new ForbiddenException('无权修改此客户');
  }
  
  return this.repository.save({ ...customer, ...dto });
}
```

---

## 🛡️ 二、输入验证

### 2.1 使用 class-validator

```typescript
export class CreateCustomerDto {
  @IsString()
  @MaxLength(100, { message: '姓名不能超过 100 个字符' })
  @Matches(/^[\u4e00-\u9fa5a-zA-Z\s]+$/, {
    message: '姓名只能包含中文、英文和空格',
  })
  name: string;

  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(255)
  email: string;

  @IsNumber()
  @Min(0, { message: '资产不能为负数' })
  @Max(1000000000, { message: '资产数额过大' })
  totalAssets: number;

  @IsEnum(CustomerLevel, { message: '无效的客户等级' })
  level?: CustomerLevel;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  city?: string;
}
```

### 2.2 SQL 注入防护

```typescript
// ✅ 使用参数化查询
async findByName(name: string): Promise<Customer[]> {
  return this.repository.find({
    where: { name },  // TypeORM 自动参数化
  });
}

// ✅ QueryBuilder 参数化
async searchCustomers(keyword: string): Promise<Customer[]> {
  return this.repository
    .createQueryBuilder('customer')
    .where('customer.name LIKE :keyword', { keyword: `%${keyword}%` })
    .getMany();
}

// ❌ 禁止字符串拼接
async dangerousFind(name: string): Promise<Customer> {
  return this.repository.query(
    `SELECT * FROM customers WHERE name = '${name}'`  // SQL 注入风险！
  );
}
```

### 2.3 XSS 防护

```typescript
// ✅ 前端输出转义
import DOMPurify from 'dompurify';

function renderCustomerName(name: string): string {
  return DOMPurify.sanitize(name);  // 防止 XSS
}

// ✅ React 自动转义（无需额外处理）
<div>{customer.name}</div>  // React 自动转义 HTML

// ❌ 危险做法（ dangerouslySetInnerHTML）
<div dangerouslySetInnerHTML={{ __html: customer.name }} />  // XSS 风险
```

---

## 🔒 三、数据加密

### 3.1 密码加密存储

```typescript
import * as bcrypt from 'bcrypt';

// ✅ 密码哈希
async hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(password, salt);
}

async comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ❌ 明文存储密码（绝对禁止）
user.password = password;  // 严重安全问题！
```

### 3.2 敏感数据脱敏

```typescript
// ✅ 响应中脱敏
transform(customer: Customer): any {
  return {
    id: customer.id,
    name: customer.name,
    email: maskEmail(customer.email),  // zhang***@example.com
    phone: maskPhone(customer.phone),  // 138****1234
    // 不返回敏感字段
    // idCard: undefined,
    // password: undefined,
  };
}

function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  return `${username.substring(0, 3)}***@${domain}`;
}

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}
```

---

## 🚫 四、常见漏洞防护

### 4.1 CSRF 防护

```typescript
// ✅ 启用 CSRF Token
import { csrf } from 'csrf';

const protection = csrf({
  cookie: {
    secure: true,
    sameSite: 'strict',
  },
});

app.use(protection);

// ✅ 前端携带 Token
fetch('/api/customers', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
  },
});
```

### 4.2 文件上传安全

```typescript
// ✅ 限制文件类型和大小
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(
  @UploadedFile() file: Express.Multer.File,
) {
  // 验证文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new BadRequestException('不支持的文件类型');
  }
  
  // 验证文件大小（最大 5MB）
  if (file.size > 5 * 1024 * 1024) {
    throw new BadRequestException('文件大小不能超过 5MB');
  }
  
  // 重命名文件（避免路径遍历攻击）
  const safeFilename = `${Date.now()}-${file.originalname}`;
  
  return { filename: safeFilename };
}
```

### 4.3 速率限制

```typescript
// ✅ 防止暴力破解
@UseGuards(ThrottlerGuard)
@Throttle(5, 60)  // 每分钟最多 5 次
@Post('login')
async login(@Body() dto: LoginDto) {
  return this.authService.login(dto);
}

// ✅ 全局限流配置
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
  ],
})
export class AppModule {}
```

---

## 🔍 五、安全审计

### 5.1 审计日志记录

```typescript
// ✅ 记录关键操作
@Post('login')
async login(@Body() dto: LoginDto, @Req() req: Request) {
  try {
    const result = await this.authService.login(dto);
    
    // 记录成功登录
    this.auditLogger.log('USER_LOGIN', {
      userId: result.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    });
    
    return result;
  } catch (error) {
    // 记录失败尝试
    this.auditLogger.log('LOGIN_FAILED', {
      username: dto.username,
      ip: req.ip,
      reason: error.message,
      timestamp: new Date(),
    });
    throw error;
  }
}
```

### 5.2 敏感操作二次验证

```typescript
// ✅ 删除操作需要二次确认
@Delete(':id')
async remove(
  @Param('id') id: number,
  @Headers('x-otp-code') otpCode: string,
) {
  // 验证 OTP 码
  const isValid = await this.otpService.verify(otpCode);
  if (!isValid) {
    throw new BadRequestException('验证码错误');
  }
  
  return this.customerService.remove(id);
}
```

---

## 📋 六、安全检查清单

### 代码审查检查项

- [ ] 无 SQL 注入风险（使用参数化查询）
- [ ] 无 XSS 风险（输出转义）
- [ ] 敏感数据已加密存储（密码/身份证号）
- [ ] 敏感数据响应脱敏（邮箱/手机号）
- [ ] 使用 HttpOnly Cookie 存储 Token
- [ ] 实现 RBAC 权限控制
- [ ] 输入验证完整（class-validator）
- [ ] 实现速率限制（防暴力破解）
- [ ] 记录审计日志（关键操作）
- [ ] 无硬编码密钥（使用环境变量）

### 自动化安全扫描

```bash
# 依赖漏洞扫描
npm audit
npx snyk test

# 代码静态分析
npm run lint

# 容器镜像扫描
docker scan my-image

# OWASP ZAP 渗透测试
zap-baseline.py -t http://localhost:3000
```

---

## 📚 七、参考资源

### 7.1 安全标准

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [Node.js 安全最佳实践](https://nodejs.org/en/docs/guides/security/)

### 7.2 安全工具

- [Snyk](https://snyk.io/) - 依赖漏洞扫描
- [ESLint Security Plugin](https://github.com/nodesecurity/eslint-plugin-security)
- [OWASP ZAP](https://www.zaproxy.org/) - 渗透测试工具

---

**文档版本**: v1.0  
**编制日期**: 2026-03-30  
**审核人**: [待填写]  
**批准人**: [待填写]

**© 2026 客户标签推荐系统项目组 版权所有**
