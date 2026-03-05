-- Migration: Add scheduled upgrade fields to organization_subscriptions
-- Date: 2026-03-05
-- Description: Supports deferred plan upgrades — current plan stays active until billing cycle end,
--              new plan activates automatically after that.

ALTER TABLE organization_subscriptions
  ADD COLUMN IF NOT EXISTS scheduled_plan_id VARCHAR REFERENCES subscription_plans(id),
  ADD COLUMN IF NOT EXISTS scheduled_payment_id VARCHAR,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;

-- Index to efficiently find subscriptions with pending upgrades at cycle boundaries
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_scheduled
  ON organization_subscriptions(scheduled_plan_id)
  WHERE scheduled_plan_id IS NOT NULL;
