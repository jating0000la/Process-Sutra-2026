// MySQL Schema Conversion for Hostinger
// This file helps convert PostgreSQL schema to MySQL for Hostinger hosting

import { mysqlTable, varchar, text, timestamp, boolean, int, json } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Session storage table (converted to MySQL)
export const sessions = mysqlTable("sessions", {
  sid: varchar("sid", { length: 128 }).primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { mode: 'date' }).notNull(),
});

// Organizations table (MySQL version)
export const organizations = mysqlTable("organizations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Users table (MySQL version)
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  firebaseUid: varchar("firebase_uid", { length: 128 }).unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }),
  photoURL: varchar("photo_url", { length: 500 }),
  organizationId: varchar("organization_id", { length: 36 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  passwordChangedAt: timestamp("password_changed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Flows table (MySQL version)
export const flows = mysqlTable("flows", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  organizationId: varchar("organization_id", { length: 36 }).notNull(),
  createdBy: varchar("created_by", { length: 36 }).notNull(),
  flowData: json("flow_data"),
  isActive: boolean("is_active").default(true),
  version: int("version").default(1),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Form submissions table (MySQL version)
export const formSubmissions = mysqlTable("form_submissions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  flowId: varchar("flow_id", { length: 36 }).notNull(),
  organizationId: varchar("organization_id", { length: 36 }).notNull(),
  submissionData: json("submission_data").notNull(),
  submittedBy: varchar("submitted_by", { length: 36 }),
  status: varchar("status", { length: 50 }).default("pending"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 500 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Password change history (MySQL version)
export const passwordChangeHistory = mysqlTable("password_change_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  changedAt: timestamp("changed_at").default(sql`CURRENT_TIMESTAMP`),
  reason: varchar("reason", { length: 255 }),
});

// Notifications table (MySQL version)
export const notifications = mysqlTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(),
  organizationId: varchar("organization_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).default("info"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  readAt: timestamp("read_at"),
});

// API Keys table (MySQL version)  
export const apiKeys = mysqlTable("api_keys", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  organizationId: varchar("organization_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  secret: varchar("secret", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  permissions: json("permissions"),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Webhooks table (MySQL version)
export const webhooks = mysqlTable("webhooks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  organizationId: varchar("organization_id", { length: 36 }).notNull(),
  flowId: varchar("flow_id", { length: 36 }),
  url: varchar("url", { length: 500 }).notNull(),
  method: varchar("method", { length: 10 }).default("POST"),
  headers: json("headers"),
  isActive: boolean("is_active").default(true),
  events: json("events"),
  secret: varchar("secret", { length: 255 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Zod schemas for validation (MySQL compatible)
export const insertOrganizationSchema = createInsertSchema(organizations);
export const insertUserSchema = createInsertSchema(users);
export const insertFlowSchema = createInsertSchema(flows);
export const insertFormSubmissionSchema = createInsertSchema(formSubmissions);
export const insertPasswordChangeHistorySchema = createInsertSchema(passwordChangeHistory);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertApiKeySchema = createInsertSchema(apiKeys);
export const insertWebhookSchema = createInsertSchema(webhooks);

// Type exports
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Flow = typeof flows.$inferSelect;
export type InsertFlow = z.infer<typeof insertFlowSchema>;
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;
export type PasswordChangeHistory = typeof passwordChangeHistory.$inferSelect;
export type InsertPasswordChangeHistory = z.infer<typeof insertPasswordChangeHistorySchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;