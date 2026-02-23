-- Migration: Add challans and payment_transactions tables for billing system
-- Run this migration to enable the billing/payment features

CREATE TABLE IF NOT EXISTS challans (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  challan_number VARCHAR NOT NULL UNIQUE,
  organization_id VARCHAR NOT NULL REFERENCES organizations(id),
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,
  flow_count INTEGER DEFAULT 0,
  flow_cost INTEGER DEFAULT 0,
  user_count INTEGER DEFAULT 0,
  user_cost INTEGER DEFAULT 0,
  form_count INTEGER DEFAULT 0,
  form_cost INTEGER DEFAULT 0,
  storage_mb INTEGER DEFAULT 0,
  storage_cost INTEGER DEFAULT 0,
  base_cost INTEGER DEFAULT 0,
  subtotal INTEGER DEFAULT 0,
  tax_percent INTEGER DEFAULT 18,
  tax_amount INTEGER DEFAULT 0,
  total_amount INTEGER DEFAULT 0,
  status VARCHAR DEFAULT 'generated',
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  payment_id VARCHAR,
  generated_by VARCHAR,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challans_org ON challans(organization_id);
CREATE INDEX IF NOT EXISTS idx_challans_org_period ON challans(organization_id, billing_period_start);
CREATE INDEX IF NOT EXISTS idx_challans_status ON challans(status);
CREATE INDEX IF NOT EXISTS idx_challans_number ON challans(challan_number);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id),
  challan_id VARCHAR REFERENCES challans(id),
  payu_txn_id VARCHAR,
  payu_payment_id VARCHAR,
  payu_status VARCHAR,
  payu_mode VARCHAR,
  payu_hash VARCHAR,
  amount INTEGER NOT NULL,
  currency VARCHAR DEFAULT 'INR',
  status VARCHAR DEFAULT 'initiated',
  failure_reason TEXT,
  initiated_by VARCHAR,
  payu_response JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_txn_org ON payment_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_challan ON payment_transactions(challan_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_payu ON payment_transactions(payu_txn_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_status ON payment_transactions(status);
