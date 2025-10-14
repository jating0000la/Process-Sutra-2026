-- Migration: Add performance indexes to improve query speed
-- This migration adds indexes on frequently queried columns

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_flow_created ON tasks(flow_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_doer_status ON tasks(doer_email, status);
CREATE INDEX IF NOT EXISTS idx_tasks_planned_time ON tasks(planned_time) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_tasks_org_created ON tasks(organization_id, created_at DESC);

-- Flow rules table indexes
CREATE INDEX IF NOT EXISTS idx_flow_rules_org_system ON flow_rules(organization_id, system);
CREATE INDEX IF NOT EXISTS idx_flow_rules_lookup ON flow_rules(organization_id, system, current_task, status);

-- Form responses table indexes (if using PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_form_responses_flow ON form_responses(flow_id, task_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_org_form ON form_responses(organization_id, form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_task ON form_responses(task_id);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id, created_at DESC);

-- User login logs indexes
CREATE INDEX IF NOT EXISTS idx_login_logs_user ON user_login_logs(user_id, login_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_org ON user_login_logs(organization_id, login_time DESC);

-- Form templates indexes
CREATE INDEX IF NOT EXISTS idx_form_templates_org ON form_templates(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_templates_form_id ON form_templates(form_id);

-- Comments for documentation
COMMENT ON INDEX idx_tasks_org_status IS 'Performance: Optimize task filtering by organization and status';
COMMENT ON INDEX idx_tasks_flow_created IS 'Performance: Optimize task ordering within flows';
COMMENT ON INDEX idx_flow_rules_lookup IS 'Performance: Optimize flow rule matching during workflow progression';
COMMENT ON INDEX idx_notifications_user_unread IS 'Performance: Optimize unread notification queries';
