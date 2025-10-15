-- Migration: Add weekendDays column to tat_config table
-- This allows organizations to customize which days are considered weekends
-- Examples: "0,6" for Sunday+Saturday, "0" for Sunday only, "5" for Friday only

-- Add weekendDays column to tat_config table
ALTER TABLE "tat_config" 
ADD COLUMN IF NOT EXISTS "weekend_days" VARCHAR DEFAULT '0,6';

-- Update comment for clarity
COMMENT ON COLUMN "tat_config"."weekend_days" IS 'Comma-separated list of weekend day numbers (0=Sunday, 1=Monday, ..., 6=Saturday). Examples: "0,6" for Sun+Sat, "0" for Sun only, "5,6" for Fri+Sat';

-- Update existing rows to have default weekend configuration if NULL
UPDATE "tat_config" 
SET "weekend_days" = '0,6' 
WHERE "weekend_days" IS NULL;

-- Add index for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS "idx_tat_config_weekend_days" ON "tat_config"("weekend_days");
