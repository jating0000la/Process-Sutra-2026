import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Organizations table for multi-tenant support
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  domain: varchar("domain").unique().notNull(), // email domain like "muxro.com"
  subdomain: varchar("subdomain").unique(), // optional custom subdomain
  logoUrl: varchar("logo_url"),
  primaryColor: varchar("primary_color").default("#0066cc"),
  isActive: boolean("is_active").default(true),
  maxUsers: integer("max_users").default(50), // subscription limits
  planType: varchar("plan_type").default("free"), // free, pro, enterprise
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User storage table with organization support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"), // user, admin
  organizationId: varchar("organization_id").references(() => organizations.id),
  // Extended user details
  username: varchar("username").unique(),
  phoneNumber: varchar("phone_number"),
  department: varchar("department"),
  designation: varchar("designation"),
  employeeId: varchar("employee_id"),
  dateOfBirth: timestamp("date_of_birth"),
  address: text("address"),
  emergencyContact: varchar("emergency_contact"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  status: varchar("status").default("active"), // active, inactive, suspended
  lastLoginAt: timestamp("last_login_at"),
  passwordChangedAt: timestamp("password_changed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User login logs table
export const userLoginLogs = pgTable("user_login_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  deviceId: varchar("device_id").notNull(),
  deviceName: varchar("device_name"),
  deviceType: varchar("device_type"), // desktop, mobile, tablet
  browserName: varchar("browser_name"),
  browserVersion: varchar("browser_version"),
  operatingSystem: varchar("operating_system"),
  ipAddress: varchar("ip_address"),
  location: jsonb("location"), // {country, region, city, lat, lng}
  userAgent: text("user_agent"),
  loginTime: timestamp("login_time").defaultNow(),
  logoutTime: timestamp("logout_time"),
  sessionDuration: integer("session_duration"), // in minutes
  loginStatus: varchar("login_status").default("success"), // success, failed, suspicious
  failureReason: varchar("failure_reason"),
});

// User devices table
export const userDevices = pgTable("user_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  deviceId: varchar("device_id").notNull(),
  deviceName: varchar("device_name"),
  deviceType: varchar("device_type"),
  browserName: varchar("browser_name"),
  operatingSystem: varchar("operating_system"),
  isTrusted: boolean("is_trusted").default(false),
  firstSeenAt: timestamp("first_seen_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Password change history table
export const passwordChangeHistory = pgTable("password_change_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  changedAt: timestamp("changed_at").defaultNow(),
  changedBy: varchar("changed_by"), // admin or self
  reason: varchar("reason"), // scheduled, forgotten, security, admin_reset
  ipAddress: varchar("ip_address"),
  deviceId: varchar("device_id"),
});

// Flow Rules - Define workflow progression rules (organization-specific)
export const flowRules = pgTable("flow_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  system: varchar("system").notNull(), // e.g., "CRM Onboarding"
  currentTask: varchar("current_task").default(""), // Empty for start rule
  status: varchar("status").default(""), // Task completion status
  nextTask: varchar("next_task").notNull(), // Next task in flow
  tat: integer("tat").notNull(), // Turn around time
  tatType: varchar("tat_type").notNull().default("daytat"), // daytat, hourtat, beforetat, specifytat
  doer: varchar("doer").notNull(), // Role who performs this task
  email: varchar("email").notNull(), // Email of assignee
  formId: varchar("form_id"), // Associated form template
  transferable: boolean("transferable").default(false), // Can task be transferred to others
  transferToEmails: text("transfer_to_emails"), // Comma-separated list of emails for transfer options
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks - Individual task instances (organization-specific)
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  system: varchar("system").notNull(),
  flowId: varchar("flow_id").notNull(), // Unique identifier for flow instance
  orderNumber: varchar("order_number"), // Optional order/case number
  taskName: varchar("task_name").notNull(),
  plannedTime: timestamp("planned_time").notNull(), // When task should be completed (TAT-based)
  actualCompletionTime: timestamp("actual_completion_time"), // When task was actually completed
  doerEmail: varchar("doer_email").notNull(),
  status: varchar("status").default("pending"), // pending, in_progress, completed, overdue
  formId: varchar("form_id"), // Associated form template
  createdAt: timestamp("created_at").defaultNow(), // When task was created
  updatedAt: timestamp("updated_at").defaultNow(),
  // Flow context information - WHO, WHAT, WHEN, HOW
  flowInitiatedBy: varchar("flow_initiated_by"), // WHO started the flow
  flowInitiatedAt: timestamp("flow_initiated_at"), // WHEN the flow was started
  flowDescription: text("flow_description"), // WHAT/HOW - description of the flow purpose
  flowInitialFormData: jsonb("flow_initial_form_data"), // First form data visible to all tasks in flow
  // Transfer tracking
  originalAssignee: varchar("original_assignee"), // Original person assigned to task
  transferredBy: varchar("transferred_by"), // Who transferred the task
  transferredAt: timestamp("transferred_at"), // When task was transferred
  transferReason: text("transfer_reason"), // Reason for transfer
});

// Form Templates - Define form structure (organization-specific)
export const formTemplates = pgTable("form_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  formId: varchar("form_id").notNull(), // Short identifier like "f001"
  title: varchar("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull(), // Array of question objects
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Form Responses - Store submitted form data (organization-specific)
export const formResponses = pgTable("form_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  responseId: varchar("response_id").notNull(), // Unique response identifier
  flowId: varchar("flow_id").notNull(),
  taskId: varchar("task_id").notNull(),
  taskName: varchar("task_name").notNull(),
  formId: varchar("form_id").notNull(),
  submittedBy: varchar("submitted_by").notNull(),
  formData: jsonb("form_data").notNull(), // Form field responses
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  flowRules: many(flowRules),
  tasks: many(tasks),
  formTemplates: many(formTemplates),
  formResponses: many(formResponses),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  createdForms: many(formTemplates),
  submittedResponses: many(formResponses),
  loginLogs: many(userLoginLogs),
  devices: many(userDevices),
  passwordHistory: many(passwordChangeHistory),
}));

export const flowRulesRelations = relations(flowRules, ({ one }) => ({
  formTemplate: one(formTemplates, {
    fields: [flowRules.formId],
    references: [formTemplates.formId],
  }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  formTemplate: one(formTemplates, {
    fields: [tasks.formId],
    references: [formTemplates.formId],
  }),
  responses: many(formResponses),
}));

export const formTemplatesRelations = relations(formTemplates, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [formTemplates.createdBy],
    references: [users.id],
  }),
  responses: many(formResponses),
}));

export const formResponsesRelations = relations(formResponses, ({ one }) => ({
  submittedBy: one(users, {
    fields: [formResponses.submittedBy],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [formResponses.taskId],
    references: [tasks.id],
  }),
  formTemplate: one(formTemplates, {
    fields: [formResponses.formId],
    references: [formTemplates.formId],
  }),
}));

export const userLoginLogsRelations = relations(userLoginLogs, ({ one }) => ({
  user: one(users, {
    fields: [userLoginLogs.userId],
    references: [users.id],
  }),
}));

export const userDevicesRelations = relations(userDevices, ({ one }) => ({
  user: one(users, {
    fields: [userDevices.userId],
    references: [users.id],
  }),
}));

export const passwordChangeHistoryRelations = relations(passwordChangeHistory, ({ one }) => ({
  user: one(users, {
    fields: [passwordChangeHistory.userId],
    references: [users.id],
  }),
}));



// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFlowRuleSchema = createInsertSchema(flowRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormTemplateSchema = createInsertSchema(formTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormResponseSchema = createInsertSchema(formResponses).omit({
  id: true,
  timestamp: true,
});

export const insertUserLoginLogSchema = createInsertSchema(userLoginLogs).omit({
  id: true,
  loginTime: true,
});

export const insertUserDeviceSchema = createInsertSchema(userDevices).omit({
  id: true,
  firstSeenAt: true,
  lastSeenAt: true,
});

export const insertPasswordChangeHistorySchema = createInsertSchema(passwordChangeHistory).omit({
  id: true,
  changedAt: true,
});

// TAT Configuration table
export const tatConfig = pgTable("tat_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeStartHour: integer("office_start_hour").default(9),
  officeEndHour: integer("office_end_hour").default(18),
  timezone: varchar("timezone").default("Asia/Kolkata"),
  skipWeekends: boolean("skip_weekends").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTATConfigSchema = createInsertSchema(tatConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type InsertFlowRule = z.infer<typeof insertFlowRuleSchema>;
export type FlowRule = typeof flowRules.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertFormResponse = z.infer<typeof insertFormResponseSchema>;
export type FormResponse = typeof formResponses.$inferSelect;
export type InsertUserLoginLog = z.infer<typeof insertUserLoginLogSchema>;
export type UserLoginLog = typeof userLoginLogs.$inferSelect;
export type InsertUserDevice = z.infer<typeof insertUserDeviceSchema>;
export type UserDevice = typeof userDevices.$inferSelect;
export type InsertPasswordChangeHistory = z.infer<typeof insertPasswordChangeHistorySchema>;
export type PasswordChangeHistory = typeof passwordChangeHistory.$inferSelect;
