-- Create audit_logs table for tracking super admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_email VARCHAR NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50), -- 'organization', 'user', 'system'
  target_id VARCHAR,
  target_email VARCHAR,
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  organization_id VARCHAR REFERENCES organizations(id) ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);

-- Comment explaining the table
COMMENT ON TABLE audit_logs IS 'Audit trail for all super admin actions including organization management, user status changes, and promotions';
COMMENT ON COLUMN audit_logs.action IS 'Action performed: TOGGLE_ORG_STATUS, CHANGE_USER_STATUS, PROMOTE_SUPER_ADMIN, UPDATE_ORGANIZATION, etc.';
COMMENT ON COLUMN audit_logs.target_type IS 'Type of entity affected: organization, user, system';
COMMENT ON COLUMN audit_logs.old_value IS 'Previous value before change (JSON string)';
COMMENT ON COLUMN audit_logs.new_value IS 'New value after change (JSON string)';
