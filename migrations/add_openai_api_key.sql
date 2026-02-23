-- Add OpenAI API key column to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS openai_api_key TEXT;

COMMENT ON COLUMN organizations.openai_api_key IS 'OpenAI API key for AI Assistant feature';
