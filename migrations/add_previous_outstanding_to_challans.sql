-- Add previous outstanding carry-forward fields to challans table
-- previousOutstanding: total amount carried forward from unpaid challans (in paise)
-- cancelledChallanIds: JSON array of challan IDs that were rolled into this challan

ALTER TABLE challans ADD COLUMN IF NOT EXISTS previous_outstanding INTEGER DEFAULT 0;
ALTER TABLE challans ADD COLUMN IF NOT EXISTS cancelled_challan_ids TEXT;
