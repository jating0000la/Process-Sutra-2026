-- Migration: Add secondary priority indexes (P2)
-- Date: October 14, 2025
-- Purpose: Additional performance optimizations for audit and monitoring features

-- ============================================================================
-- P2: MEDIUM PRIORITY INDEXES
-- ============================================================================

-- Optimize organization filtering with compound index
-- Example: SELECT * FROM user_devices WHERE organization_id = ? AND user_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_devices_org_user 
ON user_devices(organization_id, user_id);

-- Optimize password history by organization (for admin audit views)
-- Example: SELECT * FROM password_change_history WHERE organization_id = ? ORDER BY changed_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_password_history_org 
ON password_change_history(organization_id, changed_at DESC);

-- Optimize form template lookups for active templates
-- Example: SELECT * FROM form_templates WHERE organization_id = ? ORDER BY updated_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_form_templates_org_updated 
ON form_templates(organization_id, updated_at DESC);

-- Optimize task lookups by flow instance
-- Example: SELECT * FROM tasks WHERE flow_id = ? ORDER BY created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_flow 
ON tasks(flow_id);

-- Optimize login log filtering by status
-- Example: SELECT * FROM user_login_logs WHERE organization_id = ? AND login_status = 'failed'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_login_logs_org_status 
ON user_login_logs(organization_id, login_status, login_time DESC) 
WHERE login_status != 'success';

-- Optimize device filtering by trust status
-- Example: SELECT * FROM user_devices WHERE user_id = ? AND is_trusted = false
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_devices_user_trust 
ON user_devices(user_id, is_trusted) WHERE is_trusted = false;

-- ============================================================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- ============================================================================

-- Index for finding suspended users only (smaller, faster for admin views)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_suspended 
ON users(organization_id, status, updated_at DESC) 
WHERE status = 'suspended';

-- Index for finding inactive organizations (for cleanup/monitoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organizations_inactive 
ON organizations(is_active, updated_at) 
WHERE is_active = false;

-- Index for finding cancelled tasks (for analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_cancelled 
ON tasks(organization_id, cancelled_at DESC) 
WHERE cancelled_by IS NOT NULL;

-- Index for finding transferred tasks (for transfer analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_transferred 
ON tasks(organization_id, transferred_at DESC, original_assignee, doer_email) 
WHERE transferred_by IS NOT NULL;

-- ============================================================================
-- INDEX COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_user_devices_org_user IS 
'Performance: Optimize device queries within organization context';

COMMENT ON INDEX idx_password_history_org IS 
'Performance: Fast organization-wide password audit queries';

COMMENT ON INDEX idx_form_templates_org_updated IS 
'Performance: Optimize recently updated form template queries';

COMMENT ON INDEX idx_tasks_flow IS 
'Performance: Fast task retrieval for specific flow instances';

COMMENT ON INDEX idx_login_logs_org_status IS 
'Security: Optimize failed login monitoring queries';

COMMENT ON INDEX idx_user_devices_user_trust IS 
'Security: Optimize untrusted device detection';

COMMENT ON INDEX idx_users_suspended IS 
'Performance: Partial index for suspended user queries';

COMMENT ON INDEX idx_organizations_inactive IS 
'Performance: Partial index for inactive organization monitoring';

COMMENT ON INDEX idx_tasks_cancelled IS 
'Analytics: Optimize cancelled task reporting';

COMMENT ON INDEX idx_tasks_transferred IS 
'Analytics: Optimize task transfer reporting';

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

ANALYZE user_devices;
ANALYZE password_change_history;
ANALYZE form_templates;
ANALYZE tasks;
ANALYZE user_login_logs;
ANALYZE users;
ANALYZE organizations;

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- Check index usage statistics:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched,
--   pg_size_pretty(pg_relation_size(indexrelid)) as index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- Check for unused indexes (after running for a while):
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   pg_size_pretty(pg_relation_size(indexrelid)) as size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- AND idx_scan = 0
-- AND indexrelid NOT IN (
--   SELECT conindid FROM pg_constraint
-- )
-- ORDER BY pg_relation_size(indexrelid) DESC;
