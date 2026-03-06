-- Migration: Add invoices table for manual payment billing model
-- This table tracks invoices uploaded by super admin for organizations

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id VARCHAR REFERENCES organization_subscriptions(id),
  invoice_number VARCHAR NOT NULL UNIQUE,
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,
  plan_amount INTEGER DEFAULT 0,
  extra_usage_amount INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending', -- pending, paid, overdue
  payment_method VARCHAR, -- bank_transfer, upi, cash, cheque, payu
  payment_verified_by VARCHAR REFERENCES users(id),
  payment_verified_at TIMESTAMP,
  file_url TEXT, -- Google Drive or uploaded file URL
  notes TEXT,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at DESC);
