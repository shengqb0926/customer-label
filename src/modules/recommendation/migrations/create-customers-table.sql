-- 客户信息表
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    gender VARCHAR(1),
    age INTEGER,
    city VARCHAR(100),
    province VARCHAR(50),
    address TEXT,
    total_assets DECIMAL(12, 2) DEFAULT 0,
    monthly_income DECIMAL(12, 2) DEFAULT 0,
    annual_spend DECIMAL(12, 2) DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    product_count INTEGER DEFAULT 0,
    register_days INTEGER DEFAULT 0,
    last_login_days INTEGER DEFAULT 0,
    level VARCHAR(20) DEFAULT 'BRONZE',
    risk_level VARCHAR(20) DEFAULT 'LOW',
    remarks TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_level ON customers(level);
CREATE INDEX IF NOT EXISTS idx_customers_risk_level ON customers(risk_level);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);

-- 添加注释
COMMENT ON TABLE customers IS '客户信息表';
COMMENT ON COLUMN customers.id IS '客户 ID';
COMMENT ON COLUMN customers.name IS '客户姓名';
COMMENT ON COLUMN customers.email IS '邮箱（唯一）';
COMMENT ON COLUMN customers.phone IS '手机号（唯一）';
COMMENT ON COLUMN customers.gender IS '性别：M/F';
COMMENT ON COLUMN customers.age IS '年龄';
COMMENT ON COLUMN customers.city IS '城市';
COMMENT ON COLUMN customers.province IS '省份';
COMMENT ON COLUMN customers.address IS '详细地址';
COMMENT ON COLUMN customers.total_assets IS '总资产（元）';
COMMENT ON COLUMN customers.monthly_income IS '月收入（元）';
COMMENT ON COLUMN customers.annual_spend IS '年消费（元）';
COMMENT ON COLUMN customers.order_count IS '订单数';
COMMENT ON COLUMN customers.product_count IS '持有产品数';
COMMENT ON COLUMN customers.register_days IS '注册天数';
COMMENT ON COLUMN customers.last_login_days IS '距上次登录天数';
COMMENT ON COLUMN customers.level IS '客户等级：BRONZE/SILVER/GOLD/PLATINUM/DIAMOND';
COMMENT ON COLUMN customers.risk_level IS '风险等级：LOW/MEDIUM/HIGH';
COMMENT ON COLUMN customers.remarks IS '备注';
COMMENT ON COLUMN customers.is_active IS '是否激活';

-- 更新 tag_recommendations 表，添加外键关联（可选）
-- ALTER TABLE tag_recommendations 
-- ADD CONSTRAINT fk_customer 
-- FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

COMMENT ON COLUMN tag_recommendations.customer_id IS '客户 ID（关联 customers 表）';