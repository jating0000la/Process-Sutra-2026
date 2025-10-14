-- Migration: Add critical missing indexes (P0-P1 Priority)
-- Date: October 14, 2025
-- Purpose: Fix critical performance bottlenecks and data integrity issues identified in database audit

-- ============================================================================
-- P0: CRITICAL INDEXES
-- ============================================================================

-- Fix tenant lookup performance (used on EVERY request to identify organization)
-- This is CRITICAL as domain lookup happens on every authenticated request
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_domain 
ON organizations(domain);

-- Add unique constraint to prevent duplicate TAT configurations per organization
-- This prevents logic errors where multiple configs could exist for one org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_org_tat_config'
  ) THEN
    ALTER TABLE tat_config ADD CONSTRAINT unique_org_tat_config UNIQUE (organization_id);
  END IF;
END $$;

-- Add index on tatConfig organizationId for fast lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tat_config_org 
ON tat_config(organization_id);

COMMENT ON CONSTRAINT unique_org_tat_config ON tat_config IS 
'Ensures each organization has exactly one TAT configuration';

-- ============================================================================
-- P1: HIGH PRIORITY INDEXES
-- ============================================================================

-- Optimize user lookups within organization (common pattern for authentication and user management)
-- Example query: SELECT * FROM users WHERE organization_id = ? AND email = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_email 
ON users(organization_id, email);

-- Optimize role-based user filtering within organization
-- Example query: SELECT * FROM users WHERE organization_id = ? AND role = ? AND status = 'active'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_role_status 
ON users(organization_id, role, status);

-- Optimize form template lookups by organization and formId
-- Example query: SELECT * FROM form_templates WHERE organization_id = ? AND form_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_templates_org_form 
ON form_templates(organization_id, form_id);

-- Optimize active device queries for security monitoring
-- Example query: SELECT * FROM user_devices WHERE user_id = ? AND is_active = true
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_devices_user_active 
ON user_devices(user_id, is_active);

-- Optimize password change history lookups for audit trails
-- Example query: SELECT * FROM password_change_history WHERE user_id = ? ORDER BY changed_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_password_history_user 
ON password_change_history(user_id, changed_at DESC);

-- ============================================================================
-- ADDITIONAL FILTERING INDEXES
-- ============================================================================

-- Optimize filtering by organization status (for admin dashboards)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_is_active 
ON organizations(is_active) WHERE is_active = true;

-- Optimize flow rule lookups by formId (when finding which rules use a specific form)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flow_rules_form_id 
ON flow_rules(form_id) WHERE form_id IS NOT NULL;

-- Optimize webhook lookups by active status and organization
-- Note: This partially duplicates the index in 0005, but with organization_id first for better org-scoped queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhooks_org_active 
ON webhooks(organization_id, is_active, event) WHERE is_active = true;

-- ============================================================================
-- INDEX COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_organizations_domain IS 
'CRITICAL: Performance: Fast tenant identification by email domain on every authenticated request';

COMMENT ON INDEX idx_users_org_email IS 
'Performance: Optimize user authentication and lookup within organization';

COMMENT ON INDEX idx_users_org_role_status IS 
'Performance: Optimize role-based access control queries';

COMMENT ON INDEX idx_form_templates_org_form IS 
'Performance: Fast form template lookups within organization';

COMMENT ON INDEX idx_user_devices_user_active IS 
'Security: Optimize active device monitoring queries';

COMMENT ON INDEX idx_password_history_user IS 
'Security: Fast password change audit trail retrieval';

COMMENT ON INDEX idx_organizations_is_active IS 
'Performance: Optimize filtering of active organizations';

COMMENT ON INDEX idx_tat_config_org IS 
'Performance: Fast TAT configuration lookup per organization';

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

-- Update statistics for query planner to use new indexes effectively
ANALYZE organizations;
ANALYZE users;
ANALYZE form_templates;
ANALYZE tat_config;
ANALYZE user_devices;
ANALYZE password_change_history;
ANALYZE flow_rules;
ANALYZE webhooks;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify indexes were created)
-- ============================================================================

-- To verify indexes after migration:
-- SELECT schemaname, tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('organizations', 'users', 'form_templates', 'tat_config', 'user_devices', 'password_change_history')
-- ORDER BY tablename, indexname;

-- To check constraint:
-- SELECT conname, contype, conrelid::regclass 
-- FROM pg_constraint 
-- WHERE conname = 'unique_org_tat_config';
