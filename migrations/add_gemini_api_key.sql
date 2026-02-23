-- Add Gemini API key column to organizations table
-- This stores the Google AI Studio API key for each organization
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN organizations.gemini_api_key IS 'Google AI Studio Gemini API key for AI Assistant feature';
