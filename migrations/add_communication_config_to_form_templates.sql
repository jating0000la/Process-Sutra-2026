-- Add communication configuration columns to form_templates table
-- This allows admins to configure WhatsApp and Email notifications for form submissions

ALTER TABLE form_templates 
ADD COLUMN IF NOT EXISTS whatsapp_config JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS email_config JSONB DEFAULT NULL;

-- Create indexes for better query performance when filtering by enabled configs
CREATE INDEX IF NOT EXISTS idx_form_templates_whatsapp_enabled 
ON form_templates ((whatsapp_config->>'enabled')) 
WHERE whatsapp_config->>'enabled' = 'true';

CREATE INDEX IF NOT EXISTS idx_form_templates_email_enabled 
ON form_templates ((email_config->>'enabled')) 
WHERE email_config->>'enabled' = 'true';

-- Add comment to document the schema
COMMENT ON COLUMN form_templates.whatsapp_config IS 'WhatsApp notification configuration: {enabled: boolean, phoneNumber: string, messageTemplate: string}';
COMMENT ON COLUMN form_templates.email_config IS 'Email notification configuration: {enabled: boolean, recipientEmail: string, subject: string, bodyTemplate: string}';
