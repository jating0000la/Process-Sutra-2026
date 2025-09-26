-- Migration: create webhooks table
-- Adjust if a table already exists (run conditionally)
CREATE TABLE IF NOT EXISTS webhooks (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id varchar NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event varchar NOT NULL,
  target_url text NOT NULL,
  secret varchar NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  retry_count integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org_event ON webhooks(organization_id, event) WHERE is_active = true;
