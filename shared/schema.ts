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
export const organizations = pgTable(
  "organizations", 
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    domain: varchar("domain").unique().notNull(), // email domain like "muxro.com"
    subdomain: varchar("subdomain").unique(), // optional custom subdomain
    logoUrl: varchar("logo_url"),
    primaryColor: varchar("primary_color").default("#0066cc"),
    isActive: boolean("is_active").default(true),
    maxUsers: integer("max_users").default(50), // subscription limits
    planType: varchar("plan_type").default("free"), // free, pro, enterprise
    // Extended organization details
    companyName: varchar("company_name"),
    address: text("address"),
    phone: varchar("phone"),
    gstNumber: varchar("gst_number"),
    industry: varchar("industry"),
    customerType: varchar("customer_type").$type<"B2B" | "B2C" | "B2G">(), // B2B, B2C, B2G
    businessType: varchar("business_type").$type<"Trading" | "Manufacturing" | "Wholesaler" | "Retailer" | "Service Provider">(), // Trading, Manufacturing, Wholesaler, Retailer, Service Provider
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_organizations_domain").on(table.domain),
    index("idx_organizations_inactive").on(table.isActive, table.updatedAt).where(sql`${table.isActive} = false`),
    index("idx_organizations_gst").on(table.gstNumber),
    index("idx_organizations_industry").on(table.industry),
    index("idx_organizations_customer_type").on(table.customerType),
    index("idx_organizations_business_type").on(table.businessType),
  ]
);

// User storage table with organization support
export const users = pgTable(
  "users", 
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email").unique(),
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    profileImageUrl: varchar("profile_image_url"),
    role: varchar("role").default("user"), // user, admin
    isSuperAdmin: boolean("is_super_admin").default(false), // System-level super admin (above organizations)
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
  },
  (table) => [
    index("idx_users_super_admin").on(table.isSuperAdmin).where(sql`${table.isSuperAdmin} = true`),
    index("idx_users_org_email").on(table.organizationId, table.email),
    index("idx_users_org_role_status").on(table.organizationId, table.role, table.status),
    index("idx_users_suspended").on(table.organizationId, table.status, table.updatedAt).where(sql`${table.status} = 'suspended'`),
  ]
);

// User login logs table
export const userLoginLogs = pgTable(
  "user_login_logs", 
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id),
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
  },
  (table) => [
    index("idx_login_logs_user").on(table.userId, table.loginTime),
    index("idx_login_logs_org").on(table.organizationId, table.loginTime),
    index("idx_login_logs_org_status").on(table.organizationId, table.loginStatus, table.loginTime).where(sql`${table.loginStatus} != 'success'`),
  ]
);

// User devices table
export const userDevices = pgTable(
  "user_devices", 
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id),
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
  },
  (table) => [
    index("idx_user_devices_org_user").on(table.organizationId, table.userId),
    index("idx_user_devices_user_trust").on(table.userId, table.isTrusted).where(sql`${table.isTrusted} = false`),
  ]
);

// Password change history table
export const passwordChangeHistory = pgTable(
  "password_change_history", 
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id),
    userId: varchar("user_id").notNull().references(() => users.id),
    changedAt: timestamp("changed_at").defaultNow(),
    changedBy: varchar("changed_by"), // admin or self
    reason: varchar("reason"), // scheduled, forgotten, security, admin_reset
    ipAddress: varchar("ip_address"),
    deviceId: varchar("device_id"),
  },
  (table) => [
    index("idx_password_history_org").on(table.organizationId, table.changedAt),
  ]
);

// Flow Rules - Define workflow progression rules (organization-specific)
export const flowRules = pgTable(
  "flow_rules", 
  {
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
  },
  (table) => [
    index("idx_flow_rules_org_system").on(table.organizationId, table.system),
    index("idx_flow_rules_lookup").on(table.organizationId, table.system, table.currentTask, table.status),
  ]
);

// Tasks - Individual task instances (organization-specific)
export const tasks = pgTable(
  "tasks", 
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id),
    system: varchar("system").notNull(),
    flowId: varchar("flow_id").notNull(), // Unique identifier for flow instance
    orderNumber: varchar("order_number"), // Optional order/case number
    taskName: varchar("task_name").notNull(),
    plannedTime: timestamp("planned_time").notNull(), // When task should be completed (TAT-based)
    actualCompletionTime: timestamp("actual_completion_time"), // When task was actually completed
    doerEmail: varchar("doer_email").notNull(),
    status: varchar("status").default("pending"), // pending, in_progress, completed, overdue, cancelled
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
    // Cancellation tracking
    cancelledBy: varchar("cancelled_by"), // Who cancelled the task
    cancelledAt: timestamp("cancelled_at"), // When task was cancelled
    cancelReason: text("cancel_reason"), // Reason for cancellation
  },
  (table) => [
    index("idx_tasks_org_status").on(table.organizationId, table.status),
    index("idx_tasks_flow_created").on(table.flowId, table.createdAt),
    index("idx_tasks_doer_status").on(table.doerEmail, table.status),
    index("idx_tasks_planned_time").on(table.plannedTime).where(sql`${table.status} = 'pending'`),
    index("idx_tasks_org_created").on(table.organizationId, table.createdAt),
    index("idx_tasks_flow").on(table.flowId),
  ]
);

// Form Templates - Define form structure (organization-specific)
export const formTemplates = pgTable(
  "form_templates", 
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id),
    formId: varchar("form_id").notNull(), // Short identifier like "f001"
    title: varchar("title").notNull(),
    description: text("description"),
    questions: jsonb("questions").notNull(), // Array of question objects
    createdBy: varchar("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_form_templates_org").on(table.organizationId, table.createdAt),
    index("idx_form_templates_form_id").on(table.formId),
    index("idx_form_templates_org_form").on(table.organizationId, table.formId),
    index("idx_form_templates_org_updated").on(table.organizationId, table.updatedAt),
  ]
);

// Form Responses - Store submitted form data (organization-specific)
export const formResponses = pgTable(
  "form_responses", 
  {
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
  },
  (table) => [
    index("idx_form_responses_flow").on(table.flowId, table.taskId),
    index("idx_form_responses_org_form").on(table.organizationId, table.formId),
    index("idx_form_responses_task").on(table.taskId),
  ]
);

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  flowRules: many(flowRules),
  tasks: many(tasks),
  formTemplates: many(formTemplates),
  formResponses: many(formResponses),
  notifications: many(notifications),
  webhooks: many(webhooks),
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
  notifications: many(notifications),
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
export const tatConfig = pgTable(
  "tat_config", 
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id).unique(),
    officeStartHour: integer("office_start_hour").default(9), // Customizable: organization-specific
    officeEndHour: integer("office_end_hour").default(17), // Customizable: organization-specific (5 PM default)
    timezone: varchar("timezone").default("Asia/Kolkata"),
    skipWeekends: boolean("skip_weekends").default(true),
    // Weekend configuration: comma-separated list of days (0=Sunday, 1=Monday, ..., 6=Saturday)
    // Examples: "0,6" for Sunday+Saturday, "0" for Sunday only, "5" for Friday only, "" for no weekends
    weekendDays: varchar("weekend_days").default("0,6"), // Default: Sunday and Saturday
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_tat_config_org").on(table.organizationId),
  ]
);

export const insertTATConfigSchema = createInsertSchema(tatConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Webhook configurations
export const webhooks = pgTable(
  "webhooks", 
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id),
    event: varchar("event").notNull(), // e.g. form.submitted, flow.started, task.completed
    targetUrl: text("target_url").notNull(),
    secret: varchar("secret").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true),
    retryCount: integer("retry_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_webhooks_org_event").on(table.organizationId, table.event),
  ]
);

// Notifications - Persistent notification storage
export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    type: varchar("type", { length: 50 }).default("info"), // info, success, warning, error
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    readAt: timestamp("read_at"),
  },
  (table) => [
    index("idx_notifications_user_id").on(table.userId),
    index("idx_notifications_organization_id").on(table.organizationId),
    index("idx_notifications_created_at").on(table.createdAt),
    index("idx_notifications_is_read").on(table.isRead),
    index("idx_notifications_user_unread").on(table.userId, table.isRead, table.createdAt),
    index("idx_notifications_org").on(table.organizationId, table.createdAt),
  ]
);

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  retryCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
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
export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Audit Logs Table - Track super admin actions
export const auditLogs = pgTable(
  "audit_logs", 
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    actorId: varchar("actor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    actorEmail: varchar("actor_email").notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    targetType: varchar("target_type", { length: 50 }), // 'organization', 'user', 'system'
    targetId: varchar("target_id"),
    targetEmail: varchar("target_email"),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at").defaultNow(),
    organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  },
  (table) => [
    index("idx_audit_logs_actor_id").on(table.actorId),
    index("idx_audit_logs_action").on(table.action),
    index("idx_audit_logs_created_at").on(table.createdAt),
    index("idx_audit_logs_target_type").on(table.targetType),
    index("idx_audit_logs_target_id").on(table.targetId),
  ]
);

// Audit log validation schema
export const insertAuditLogSchema = z.object({
  actorId: z.string(),
  actorEmail: z.string().email(),
  action: z.string(),
  targetType: z.enum(["organization", "user", "system"]).optional(),
  targetId: z.string().optional(),
  targetEmail: z.string().optional(),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  organizationId: z.string().optional(),
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Additional relations for webhooks and notifications
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [notifications.organizationId],
    references: [organizations.id],
  }),
}));

export const webhooksRelations = relations(webhooks, ({ one }) => ({
  organization: one(organizations, {
    fields: [webhooks.organizationId],
    references: [organizations.id],
  }),
}));
