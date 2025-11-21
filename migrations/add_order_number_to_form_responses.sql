-- Migration: Add orderNumber column to form_responses table
-- Date: 2025-11-20
-- Description: Add orderNumber field to form responses to track which order/case each response belongs to

-- Add the orderNumber column to form_responses table
ALTER TABLE form_responses 
ADD COLUMN IF NOT EXISTS order_number VARCHAR;

-- Create index on orderNumber for efficient queries
CREATE INDEX IF NOT EXISTS idx_form_responses_order 
ON form_responses(organization_id, order_number);

-- Backfill orderNumber from tasks table for existing records
UPDATE form_responses fr
SET order_number = t.order_number
FROM tasks t
WHERE fr.task_id = t.id
  AND fr.order_number IS NULL;

-- Add comment to the column
COMMENT ON COLUMN form_responses.order_number IS 'Order/case number from the flow that this form response belongs to';
