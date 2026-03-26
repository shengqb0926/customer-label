-- 客户标签智能推荐系统 - 数据库迁移脚本
-- 执行方式：psql -U postgres -d customer_label -f run-migrations.sql

-- 启用事务
BEGIN;

-- 1. 创建标签推荐结果表
CREATE TABLE IF NOT EXISTS "tag_recommendations" (
  "id" BIGSERIAL PRIMARY KEY,
  "customer_id" INTEGER NOT NULL,
  "tag_name" VARCHAR(100) NOT NULL,
  "tag_category" VARCHAR(50),
  "confidence" DECIMAL(5,4) NOT NULL,
  "source" VARCHAR(20) NOT NULL,
  "reason" TEXT,
  "score_overall" DECIMAL(5,4),
  "is_accepted" BOOLEAN DEFAULT FALSE,
  "accepted_at" TIMESTAMP,
  "accepted_by" INTEGER,
  "modified_tag_name" VARCHAR(100),
  "feedback_reason" VARCHAR(500),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "chk_confidence" CHECK ("confidence" >= 0 AND "confidence" <= 1)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_rec_customer" ON "tag_recommendations"("customer_id");
CREATE INDEX IF NOT EXISTS "idx_rec_source" ON "tag_recommendations"("source");
CREATE INDEX IF NOT EXISTS "idx_rec_accepted" ON "tag_recommendations"("is_accepted");
CREATE INDEX IF NOT EXISTS "idx_rec_created" ON "tag_recommendations"("created_at");

-- 2. 创建标签评分表
CREATE TABLE IF NOT EXISTS "tag_scores" (
  "id" BIGSERIAL PRIMARY KEY,
  "tag_id" INTEGER NOT NULL UNIQUE,
  "tag_name" VARCHAR(100) NOT NULL,
  "coverage_score" DECIMAL(5,4),
  "coverage_value" DECIMAL(10,6),
  "discrimination_score" DECIMAL(5,4),
  "discrimination_iv" DECIMAL(10,6),
  "stability_score" DECIMAL(5,4),
  "stability_psi" DECIMAL(10,6),
  "business_value_score" DECIMAL(5,4),
  "business_value_roi" DECIMAL(10,6),
  "overall_score" DECIMAL(5,4),
  "recommendation" VARCHAR(20),
  "insights" TEXT[],
  "last_calculated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "chk_scores" CHECK (
    "coverage_score" >= 0 AND "coverage_score" <= 100 AND
    "discrimination_score" >= 0 AND "discrimination_score" <= 100 AND
    "stability_score" >= 0 AND "stability_score" <= 100 AND
    "business_value_score" >= 0 AND "business_value_score" <= 100 AND
    "overall_score" >= 0 AND "overall_score" <= 100
  )
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_scores_overall" ON "tag_scores"("overall_score" DESC);
CREATE INDEX IF NOT EXISTS "idx_scores_updated" ON "tag_scores"("last_calculated_at" DESC);

-- 3. 创建推荐规则表
CREATE TABLE IF NOT EXISTS "recommendation_rules" (
  "id" BIGSERIAL PRIMARY KEY,
  "rule_name" VARCHAR(100) NOT NULL UNIQUE,
  "rule_expression" TEXT NOT NULL,
  "priority" INTEGER DEFAULT 0,
  "tag_template" JSONB NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE,
  "hit_count" BIGINT DEFAULT 0,
  "acceptance_rate" DECIMAL(5,4),
  "last_hit_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "created_by" INTEGER,
  "updated_by" INTEGER
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_rules_active" ON "recommendation_rules"("is_active") WHERE "is_active" = TRUE;
CREATE INDEX IF NOT EXISTS "idx_rules_priority" ON "recommendation_rules"("priority" DESC);

-- 4. 创建聚类配置表
CREATE TABLE IF NOT EXISTS "clustering_configs" (
  "id" BIGSERIAL PRIMARY KEY,
  "config_name" VARCHAR(100) NOT NULL,
  "algorithm" VARCHAR(50) NOT NULL,
  "parameters" JSONB NOT NULL,
  "feature_weights" JSONB,
  "is_active" BOOLEAN DEFAULT TRUE,
  "last_run_at" TIMESTAMP,
  "last_cluster_count" INTEGER,
  "avg_silhouette_score" DECIMAL(5,4),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 创建反馈统计表
CREATE TABLE IF NOT EXISTS "feedback_statistics" (
  "id" BIGSERIAL PRIMARY KEY,
  "date" DATE NOT NULL UNIQUE,
  "total_recommendations" BIGINT DEFAULT 0,
  "accepted_count" BIGINT DEFAULT 0,
  "rejected_count" BIGINT DEFAULT 0,
  "ignored_count" BIGINT DEFAULT 0,
  "modified_count" BIGINT DEFAULT 0,
  "avg_confidence" DECIMAL(5,4),
  "acceptance_rate" DECIMAL(5,4),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_feedback_date" ON "feedback_statistics"("date" DESC);

-- 提交事务
COMMIT;

-- 验证创建的表
SELECT 
  '✅ 已创建的表:' AS info;
  
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
