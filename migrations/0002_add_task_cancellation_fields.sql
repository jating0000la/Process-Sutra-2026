-- Add cancellation tracking fields to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Add comment
COMMENT ON COLUMN tasks.cancelled_by IS 'User ID who cancelled the task';
COMMENT ON COLUMN tasks.cancelled_at IS 'Timestamp when task was cancelled';
COMMENT ON COLUMN tasks.cancel_reason IS 'Reason for task cancellation';
