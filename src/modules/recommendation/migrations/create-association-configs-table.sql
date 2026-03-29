-- Create association rules configuration table
CREATE TABLE IF NOT EXISTS association_configs (
  id BIGSERIAL PRIMARY KEY,
  config_name VARCHAR(100) NOT NULL,
  description TEXT,
  algorithm VARCHAR(50) NOT NULL,
  parameters JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  run_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMP,
  avg_quality_score DECIMAL(5,4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_association_configs_algorithm ON association_configs(algorithm);
CREATE INDEX idx_association_configs_is_active ON association_configs(is_active);
CREATE INDEX idx_association_configs_created_at ON association_configs(created_at);
