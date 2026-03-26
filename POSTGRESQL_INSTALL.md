# PostgreSQL 安装与配置指南

## 📦 方式一：使用安装包安装（推荐）

### 步骤 1: 下载 PostgreSQL

**下载地址**: https://www.postgresql.org/download/windows/

或使用国内镜像：
- 清华镜像源：https://mirrors.tuna.tsinghua.edu.cn/postgresql/
- 阿里云镜像：https://mirrors.aliyun.com/postgresql/

**推荐版本**: PostgreSQL 15.x 或 16.x

### 步骤 2: 安装 PostgreSQL

1. **运行安装程序**
   - 双击下载的 `.exe` 安装包

2. **选择安装目录**
   ```
   默认：C:\Program Files\PostgreSQL\15
   ```

3. **选择组件**
   - ✅ PostgreSQL Server（必须）
   - ✅ pgAdmin 4（推荐，图形化管理工具）
   - ✅ Command Line Tools（必须）
   - ✅ Stack Builder（可选）

4. **设置数据目录**
   ```
   默认：C:\Program Files\PostgreSQL\15\data
   ```

5. **设置密码** ⚠️ **重要**
   ```
   Password: postgres
   Confirm: postgres
   ```
   > 建议初始密码设为 `postgres`，后续可以修改

6. **设置端口**
   ```
   Port: 5432
   ```

7. **选择语言环境**
   ```
   Locale: Default locale (建议使用 English)
   ```

8. **完成安装**
   - 点击 Finish 完成安装

---

## 🔧 步骤 3: 配置环境变量

PostgreSQL 安装后需要添加到系统 PATH：

### Windows 10/11:

1. 右键"此电脑" → "属性"
2. "高级系统设置" → "环境变量"
3. 在"系统变量"中找到 `Path`，点击"编辑"
4. 添加以下路径：
   ```
   C:\Program Files\PostgreSQL\15\bin
   ```
5. 点击"确定"保存

### 验证配置

打开新的命令行窗口（重要：必须是新开的）：

```bash
psql --version
```

应该看到类似输出：
```
psql (PostgreSQL) 15.x.x
```

---

## 🗄️ 步骤 4: 创建数据库

### 方法 A: 使用 psql 命令行

```bash
# 连接到 PostgreSQL
psql -U postgres

# 输入密码：postgres

# 创建数据库
CREATE DATABASE customer_label;

# 验证数据库是否创建成功
\l

# 退出
\q
```

### 方法 B: 使用 pgAdmin 图形化工具

1. 启动 pgAdmin 4
2. 展开 Servers → PostgreSQL 15
3. 右键 Databases → Create → Database
4. Database 输入：`customer_label`
5. 点击 Save

---

## ✅ 步骤 5: 验证安装

### 测试连接

```bash
# 连接到新数据库
psql -U postgres -d customer_label

# 如果成功连接，会看到：
customer_label=#

# 测试创建表
CREATE TABLE test_table (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100)
);

# 查看表
\dt

# 删除测试表
DROP TABLE test_table;

# 退出
\q
```

---

## 🚀 步骤 6: 执行项目数据库迁移

### 准备工作

1. **进入项目目录**
   ```bash
   cd d:\VsCode\customer-label
   ```

2. **安装项目依赖**
   ```bash
   npm install
   ```

3. **创建环境变量文件**
   
   在项目根目录创建 `.env` 文件：
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_DATABASE=customer_label
   NODE_ENV=development
   ```

### 执行迁移

```bash
# 运行数据库迁移
npm run migration:run
```

如果成功，您应该看到类似输出：
```
query: SELECT * FROM current_schema()
query: CREATE TABLE "tag_recommendations" ...
query: CREATE INDEX "idx_rec_customer" ON "tag_recommendations" ...
...
Migration 1711507200000-CreateTagRecommendationsTable has been migrated successfully.
Migration 1711507260000-CreateTagScoresTable has been migrated successfully.
...
```

### 验证迁移结果

```bash
# 连接到数据库
psql -U postgres -d customer_label

# 查看所有表
\dt

# 应该看到：
# public.tag_recommendations
# public.tag_scores
# public.recommendation_rules
# public.clustering_configs
# public.feedback_statistics

# 查看某个表的结构
\d tag_recommendations

# 退出
\q
```

---

## 🔍 常见问题排查

### 问题 1: psql 命令找不到

**原因**: 环境变量未配置或命令行窗口未重启

**解决方案**:
1. 确认已添加 PostgreSQL 的 bin 目录到 PATH
2. 关闭所有命令行窗口
3. 重新打开命令行窗口
4. 再次执行 `psql --version`

### 问题 2: 无法连接到数据库

**错误**: `FATAL: password authentication failed for user "postgres"`

**解决方案**:
```bash
# 重置 postgres 用户密码
psql -U postgres
ALTER USER postgres WITH PASSWORD 'postgres';
```

### 问题 3: 端口被占用

**错误**: `could not bind to address 0.0.0.0:5432`

**解决方案**:
1. 找到并停止占用 5432 端口的服务
2. 或者修改 PostgreSQL 端口（不推荐）

### 问题 4: 迁移失败

**可能原因**:
- 数据库未创建
- 用户名密码错误
- 数据库未运行

**检查步骤**:
```bash
# 检查 PostgreSQL 服务状态
# Windows: 服务管理器中查看 PostgreSQL 服务

# 重新启动 PostgreSQL 服务
# Windows: net stop postgresql-x64-15 && net start postgresql-x64-15

# 测试连接
psql -U postgres -h localhost -p 5432
```

---

## 📊 安装后的目录结构

典型的 PostgreSQL Windows 安装目录：

```
C:\Program Files\PostgreSQL\15\
├── bin\                    # 可执行文件
│   ├── psql.exe           # 命令行客户端
│   ├── createdb.exe       # 创建数据库工具
│   └── ...
├── data\                   # 数据目录
│   ├── postgresql.conf    # 主配置文件
│   ├── pg_hba.conf        # 访问控制配置
│   └── ...
├── lib\                    # 库文件
├── share\                  # 共享文件
└── docs\                   # 文档
```

---

## 🎯 下一步

安装完成后，继续执行项目的 Task 1.2：

1. ✅ 安装 PostgreSQL
2. ✅ 创建数据库 `customer_label`
3. ✅ 配置 `.env` 文件
4. ⏳ 运行数据库迁移
5. ⏳ 配置 Redis 缓存

---

## 📞 需要帮助？

如果您在安装过程中遇到问题，请告诉我：
- 具体的错误信息
- 您已经尝试过的步骤
- 您的 Windows 版本

我会为您提供针对性的解决方案！

---

**文档版本**: 1.0  
**创建日期**: 2026-03-26  
**参考**: [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
