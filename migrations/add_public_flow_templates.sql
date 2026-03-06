-- Public Flow Templates table
-- Stores published flow templates that any user can browse and import
-- User details (emails, org IDs) are NOT stored to protect privacy

CREATE TABLE IF NOT EXISTS public_flow_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR DEFAULT 'General',
  tags JSONB DEFAULT '[]'::jsonb,
  flow_rules JSONB NOT NULL,
  form_templates JSONB DEFAULT '[]'::jsonb,
  published_by_org VARCHAR,
  use_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_flow_templates_category ON public_flow_templates (category);
CREATE INDEX IF NOT EXISTS idx_public_flow_templates_active ON public_flow_templates (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_public_flow_templates_use_count ON public_flow_templates (use_count DESC);
CREATE INDEX IF NOT EXISTS idx_public_flow_templates_created ON public_flow_templates (created_at DESC);
