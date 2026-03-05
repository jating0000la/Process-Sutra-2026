-- Migration: Add billing & subscription tables
-- Date: 2026-03-05
-- Description: Adds subscription plans, organization subscriptions, payment transactions, and usage logs

-- ============================================
-- Subscription Plans
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    display_name VARCHAR NOT NULL,
    price_monthly INTEGER NOT NULL DEFAULT 0,
    max_users INTEGER NOT NULL DEFAULT 3,
    max_flows INTEGER NOT NULL DEFAULT 10,
    max_form_submissions INTEGER NOT NULL DEFAULT 25,
    extra_flow_cost INTEGER DEFAULT 5,
    extra_submission_cost INTEGER DEFAULT 2,
    extra_user_cost INTEGER DEFAULT 100,
    trial_duration_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

-- ============================================
-- Organization Subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id VARCHAR NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR NOT NULL DEFAULT 'active',
    billing_cycle_start TIMESTAMP NOT NULL,
    billing_cycle_end TIMESTAMP NOT NULL,
    trial_ends_at TIMESTAMP,
    used_flows INTEGER DEFAULT 0,
    used_form_submissions INTEGER DEFAULT 0,
    used_users INTEGER DEFAULT 0,
    outstanding_amount INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_billing_end ON organization_subscriptions(billing_cycle_end);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_trial ON organization_subscriptions(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- ============================================
-- Payment Transactions
-- ============================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id VARCHAR REFERENCES organization_subscriptions(id),
    payu_txn_id VARCHAR UNIQUE,
    payu_mihpayid VARCHAR,
    txn_id VARCHAR NOT NULL UNIQUE,
    amount INTEGER NOT NULL,
    plan_amount INTEGER DEFAULT 0,
    outstanding_amount_paid INTEGER DEFAULT 0,
    extra_usage_amount INTEGER DEFAULT 0,
    status VARCHAR NOT NULL DEFAULT 'pending',
    payment_mode VARCHAR,
    payu_response JSONB,
    error_message TEXT,
    payment_type VARCHAR NOT NULL DEFAULT 'subscription',
    initiated_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_txn_org ON payment_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_txn_payu ON payment_transactions(payu_txn_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_id ON payment_transactions(txn_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_sub ON payment_transactions(subscription_id);

-- ============================================
-- Usage Logs
-- ============================================
CREATE TABLE IF NOT EXISTS usage_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id VARCHAR REFERENCES organization_subscriptions(id),
    action_type VARCHAR NOT NULL,
    action_id VARCHAR,
    is_within_limit BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_org ON usage_logs(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_sub ON usage_logs(subscription_id, action_type);
CREATE INDEX IF NOT EXISTS idx_usage_logs_type ON usage_logs(action_type, created_at);

-- ============================================
-- Seed Default Plans
-- ============================================
INSERT INTO subscription_plans (name, display_name, price_monthly, max_users, max_flows, max_form_submissions, extra_flow_cost, extra_submission_cost, extra_user_cost, trial_duration_days, sort_order)
VALUES
    ('free_trial', 'Free Trial', 0, 3, 10, 25, 5, 2, 100, 14, 0),
    ('starter', 'Starter Plan', 1999, 10, 200, 500, 5, 2, 100, NULL, 1),
    ('growth', 'Growth Plan', 4999, 25, 800, 2000, 5, 2, 100, NULL, 2),
    ('business', 'Business Plan', 9999, 50, 2500, 5000, 5, 2, 100, NULL, 3)
ON CONFLICT DO NOTHING;
