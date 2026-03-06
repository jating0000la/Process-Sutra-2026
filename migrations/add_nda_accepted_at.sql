-- Add NDA acceptance tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS nda_accepted_at TIMESTAMP;
