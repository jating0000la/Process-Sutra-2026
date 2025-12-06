-- Add API Keys table for secure integration authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash VARCHAR NOT NULL UNIQUE,
  key_prefix VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  scopes JSONB DEFAULT '["flow:start"]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- Add comment
COMMENT ON TABLE api_keys IS 'Secure API keys for external integrations with hashed storage';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key for secure validation';
COMMENT ON COLUMN api_keys.key_prefix IS 'First portion of key for display purposes (e.g., sk_live_abc123...)';
COMMENT ON COLUMN api_keys.scopes IS 'Array of permissions granted to this API key';
