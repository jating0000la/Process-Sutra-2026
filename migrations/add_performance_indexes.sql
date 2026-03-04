-- Performance indexes for 3000+ organizations
-- These composite indexes eliminate sequential scans on high-traffic queries

-- Tasks: most queries filter by org + status or org + doer
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_org_status
  ON tasks (organization_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_org_doer_status
  ON tasks (organization_id, doer_email, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_org_created
  ON tasks (organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_org_flow
  ON tasks (organization_id, flow_id);

-- Users: org-scoped lookups are the most common pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_status
  ON users (organization_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
  ON users (email);

-- Login logs: used for activity feeds and user enrichment
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_login_logs_org_time
  ON user_login_logs (organization_id, login_time DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_login_logs_user_time
  ON user_login_logs (user_id, login_time DESC);

-- Audit logs: filtered by org + time range
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_org_created
  ON audit_logs (organization_id, created_at DESC);

-- Webhook delivery logs: looked up by payload
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_delivery_payload
  ON webhook_delivery_log (payload_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_delivery_webhook
  ON webhook_delivery_log (webhook_id, created_at DESC);

-- Flow rules: org-scoped
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flow_rules_org
  ON flow_rules (organization_id);

-- Password change history: org-scoped
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_password_history_org
  ON password_change_history (organization_id);

-- User devices: org-scoped
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_devices_org
  ON user_devices (organization_id);
