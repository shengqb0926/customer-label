-- Performance Optimization: Add missing indexes to improve query speed
-- Execution time: < 1 minute for small tables

-- tag_recommendations table indexes
CREATE INDEX IF NOT EXISTS idx_recommendations_customer_id ON tag_recommendations(customer_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON tag_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_source ON tag_recommendations(source);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON tag_recommendations(created_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_category ON tag_recommendations(tag_category);

-- customer_tags table indexes
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer_id ON customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag_name ON customer_tags(tag_name);

-- clustering_configs table indexes
CREATE INDEX IF NOT EXISTS idx_clustering_configs_is_active ON clustering_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_clustering_configs_algorithm ON clustering_configs(algorithm);

-- association_configs table indexes (if not exists from previous migration)
CREATE INDEX IF NOT EXISTS idx_association_configs_is_active ON association_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_association_configs_algorithm ON association_configs(algorithm);
CREATE INDEX IF NOT EXISTS idx_association_configs_created_at ON association_configs(created_at);

-- Log completion
SELECT 'Performance indexes created successfully!' AS status;
