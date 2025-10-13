-- Migration: Add notifications table for persistent notification storage
-- Created: 2024
-- Description: Stores user notifications with read status and timestamps

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Composite index for fetching unread notifications by user
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
