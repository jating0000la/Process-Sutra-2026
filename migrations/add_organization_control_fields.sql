-- Add new organization management fields to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS pricing_tier VARCHAR DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS monthly_price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS max_flows INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_storage INTEGER DEFAULT 5000,
ADD COLUMN IF NOT EXISTS usage_based_billing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_per_flow INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_per_user INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_per_gb INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS health_status VARCHAR DEFAULT 'healthy',
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS owner_id VARCHAR,
ADD COLUMN IF NOT EXISTS owner_email VARCHAR;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_organizations_health_score ON organizations(health_score);
CREATE INDEX IF NOT EXISTS idx_organizations_pricing_tier ON organizations(pricing_tier);
CREATE INDEX IF NOT EXISTS idx_organizations_suspended ON organizations(is_suspended) WHERE is_suspended = true;
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);

-- Update existing organizations with default health metrics
UPDATE organizations 
SET 
  health_score = 100,
  health_status = 'healthy',
  pricing_tier = COALESCE(pricing_tier, 'starter'),
  max_flows = COALESCE(max_flows, 100),
  max_storage = COALESCE(max_storage, 5000)
WHERE health_score IS NULL OR max_flows IS NULL OR max_storage IS NULL;
