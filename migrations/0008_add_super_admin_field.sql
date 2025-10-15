-- Add super admin field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Create index for super admin queries
CREATE INDEX IF NOT EXISTS idx_users_super_admin ON users(is_super_admin) WHERE is_super_admin = true;

-- Comment explaining the field
COMMENT ON COLUMN users.is_super_admin IS 'System-level super administrator with cross-organization access. This is above organization admins.';
