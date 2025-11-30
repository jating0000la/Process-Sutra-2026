-- Add Google OAuth token fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP,
ADD COLUMN IF NOT EXISTS google_drive_enabled BOOLEAN DEFAULT FALSE;

-- Create index for quick lookup of users with Drive access
CREATE INDEX IF NOT EXISTS idx_users_google_drive ON users(google_drive_enabled) WHERE google_drive_enabled = TRUE;
