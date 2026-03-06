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
    // Super Admin control fields
    maxFlows: integer("max_flows").default(100),
    maxStorage: integer("max_storage").default(5000), // in MB
    healthScore: integer("health_score").default(100),
    healthStatus: varchar("health_status").default("healthy"), // healthy, warning, critical
    geminiApiKey: text("gemini_api_key"), // Google AI Studio Gemini API key
    openaiApiKey: text("openai_api_key"), // OpenAI API key
    isSuspended: boolean("is_suspended").default(false),
    suspendedAt: timestamp("suspended_at"),
    suspensionReason: text("suspension_reason"),
    ownerId: varchar("owner_id"),
    ownerEmail: varchar("owner_email"),
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
    index("idx_organizations_health_score").on(table.healthScore),
    index("idx_organizations_suspended").on(table.isSuspended).where(sql`${table.isSuspended} = true`),
    index("idx_organizations_owner").on(table.ownerId),
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
    // Google OAuth tokens for Drive access
    googleAccessToken: text("google_access_token"),
    googleRefreshToken: text("google_refresh_token"),
    googleTokenExpiry: timestamp("google_token_expiry"),
    googleDriveEnabled: boolean("google_drive_enabled").default(false),
    ndaAcceptedAt: timestamp("nda_accepted_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_users_super_admin").on(table.isSuperAdmin).where(sql`${table.isSuperAdmin} = true`),
    index("idx_users_org_email").on(table.organizationId, table.email),
    index("idx_users_org_role_status").on(table.organizationId, table.role, table.status),
    index("idx_users_suspended").on(table.organizationId, table.status, table.updatedAt).where(sql`${table.status} = 'suspended'`),
    index("idx_users_google_drive").on(table.googleDriveEnabled).where(sql`${table.googleDriveEnabled} = true`),
    // HIGH PRIORITY INDEX
    index("idx_users_org_created").on(table.organizationId, table.createdAt.desc()),
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
    // LOW PRIORITY INDEX
    index("idx_password_history_user").on(table.userId, table.changedAt.desc()),
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
    mergeCondition: varchar("merge_condition").default("all"), // "all" = all parallel steps complete, "any" = any parallel step complete
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
    // CRITICAL PERFORMANCE INDEXES
    index("idx_tasks_org_system_created").on(table.organizationId, table.system, table.createdAt.desc()),
    index("idx_tasks_overdue").on(table.status, table.plannedTime).where(sql`${table.status} IN ('pending', 'in_progress')`),
    index("idx_tasks_doer_dashboard").on(table.doerEmail, table.status, table.plannedTime.desc()),
  ]
);

// Form data is now stored in MongoDB Quick Forms (see server/mongo/quickFormClient.ts)

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  flowRules: many(flowRules),
  tasks: many(tasks),
  notifications: many(notifications),
  webhooks: many(webhooks),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  loginLogs: many(userLoginLogs),
  devices: many(userDevices),
  passwordHistory: many(passwordChangeHistory),
  notifications: many(notifications),
}));

export const flowRulesRelations = relations(flowRules, ({ one }) => ({
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
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
}).extend({
  system: z.string()
    .min(1, "System is required")
    .max(100, "System name too long")
    .refine(val => !/<[^>]*>/g.test(val), "HTML tags not allowed in system name"),
  
  currentTask: z.string()
    .max(200, "Task name too long")
    .refine(val => !/<[^>]*>/g.test(val), "HTML tags not allowed in task name"),
  
  status: z.string()
    .max(100, "Status too long")
    .refine(val => !/<[^>]*>/g.test(val), "HTML tags not allowed in status"),
  
  nextTask: z.string()
    .min(1, "Next task is required")
    .max(200, "Task name too long")
    .refine(val => !/<[^>]*>/g.test(val), "HTML tags not allowed in task name"),
  
  doer: z.string()
    .min(1, "Doer is required")
    .max(100, "Doer name too long")
    .refine(val => !/<[^>]*>/g.test(val), "HTML tags not allowed in doer name"),
  
  email: z.string()
    .email("Valid email is required")
    .max(254, "Email too long")
    .toLowerCase()
    .refine(val => !val.includes('%0A') && !val.includes('%0D'), "Invalid email format")
    .refine(val => !val.includes('<') && !val.includes('>'), "Invalid characters in email"),
  
  formId: z.string()
    .max(100, "Form ID too long")
    .refine(val => !val || !/<[^>]*>/g.test(val), "HTML tags not allowed in form ID")
    .optional(),
  
  transferToEmails: z.string()
    .max(500, "Transfer emails too long")
    .refine(val => !val || !/<[^>]*>/g.test(val), "HTML tags not allowed in emails")
    .optional(),
  
  mergeCondition: z.enum(["all", "any"])
    .default("all")
    .optional(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
    // LOW PRIORITY INDEX
    index("idx_audit_logs_actor_time").on(table.actorId, table.createdAt.desc()),
  ]
);

// Audit log validation schema
export const insertAuditLogSchema = z.object({
  actorId: z.string(),
  actorEmail: z.string().email(),
  action: z.string(),
  targetType: z.enum(["organization", "user", "system", "payment", "subscription"]).optional(),
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

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [webhooks.organizationId],
    references: [organizations.id],
  }),
  deliveryLogs: many(webhookDeliveryLog),
}));

// Webhook Delivery Log - Track all webhook delivery attempts
export const webhookDeliveryLog = pgTable(
  "webhook_delivery_log",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    webhookId: varchar("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    event: varchar("event").notNull(),
    payloadId: varchar("payload_id").notNull(),
    targetUrl: text("target_url").notNull(),
    httpStatus: integer("http_status"),
    responseBody: text("response_body"),
    errorMessage: text("error_message"),
    latencyMs: integer("latency_ms"),
    attemptNumber: integer("attempt_number").default(1),
    deliveredAt: timestamp("delivered_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_webhook_delivery_log_webhook").on(table.webhookId, table.deliveredAt),
    index("idx_webhook_delivery_log_org").on(table.organizationId, table.deliveredAt),
    index("idx_webhook_delivery_log_status").on(table.httpStatus, table.deliveredAt),
    // MEDIUM PRIORITY INDEX
    index("idx_webhook_delivery_failures").on(table.webhookId, table.httpStatus, table.deliveredAt.desc()).where(sql`${table.httpStatus} >= 400 OR ${table.httpStatus} IS NULL`),
  ]
);

// Webhook Retry Queue - Manage failed webhook retries
export const webhookRetryQueue = pgTable(
  "webhook_retry_queue",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    webhookId: varchar("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    event: varchar("event").notNull(),
    payload: jsonb("payload").notNull(),
    targetUrl: text("target_url").notNull(),
    secret: varchar("secret").notNull(),
    attemptNumber: integer("attempt_number").default(1),
    maxRetries: integer("max_retries").default(3),
    nextRetryAt: timestamp("next_retry_at").notNull(),
    status: varchar("status").default("pending"), // pending, success, failed
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_webhook_retry_queue_next_retry").on(table.nextRetryAt, table.status).where(sql`${table.status} = 'pending'`),
    index("idx_webhook_retry_queue_webhook").on(table.webhookId),
    index("idx_webhook_retry_queue_org").on(table.organizationId, table.status),
  ]
);

export const webhookDeliveryLogRelations = relations(webhookDeliveryLog, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookDeliveryLog.webhookId],
    references: [webhooks.id],
  }),
  organization: one(organizations, {
    fields: [webhookDeliveryLog.organizationId],
    references: [organizations.id],
  }),
}));

export const webhookRetryQueueRelations = relations(webhookRetryQueue, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookRetryQueue.webhookId],
    references: [webhooks.id],
  }),
  organization: one(organizations, {
    fields: [webhookRetryQueue.organizationId],
    references: [organizations.id],
  }),
}));

export const insertWebhookDeliveryLogSchema = createInsertSchema(webhookDeliveryLog).omit({
  id: true,
  deliveredAt: true,
  createdAt: true,
});

export const insertWebhookRetryQueueSchema = createInsertSchema(webhookRetryQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type WebhookDeliveryLog = typeof webhookDeliveryLog.$inferSelect;
export type InsertWebhookDeliveryLog = z.infer<typeof insertWebhookDeliveryLogSchema>;
export type WebhookRetryQueue = typeof webhookRetryQueue.$inferSelect;
export type InsertWebhookRetryQueue = z.infer<typeof insertWebhookRetryQueueSchema>;

// API Keys table for integration authentication
export const apiKeys = pgTable(
  "api_keys",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    keyHash: varchar("key_hash").notNull().unique(), // Store hash for security
    keyPrefix: varchar("key_prefix").notNull(), // First 8 chars for display (e.g., "sk_live_")
    name: varchar("name").notNull(), // User-friendly name
    description: text("description"),
    createdBy: varchar("created_by").notNull().references(() => users.id),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"), // Optional expiration
    isActive: boolean("is_active").default(true),
    scopes: jsonb("scopes").default(['flow:start']), // Permissions array
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_api_keys_org").on(table.organizationId),
    index("idx_api_keys_active").on(table.isActive).where(sql`${table.isActive} = true`),
    index("idx_api_keys_hash").on(table.keyHash),
  ]
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiKeys.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [apiKeys.createdBy],
    references: [users.id],
  }),
}));

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

// ============================================
// BILLING & SUBSCRIPTION TABLES
// ============================================

// Subscription Plans - defines available plans
export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(), // free_trial, starter, growth, business
    displayName: varchar("display_name").notNull(), // "Free Trial", "Starter Plan", etc.
    priceMonthly: integer("price_monthly").notNull().default(0), // in INR (paise would be too granular)
    maxUsers: integer("max_users").notNull().default(3),
    maxFlows: integer("max_flows").notNull().default(10),
    maxFormSubmissions: integer("max_form_submissions").notNull().default(25),
    extraFlowCost: integer("extra_flow_cost").default(5), // ₹5 per extra flow
    extraSubmissionCost: integer("extra_submission_cost").default(2), // ₹2 per extra submission
    extraUserCost: integer("extra_user_cost").default(100), // ₹100 per extra user
    trialDurationDays: integer("trial_duration_days"), // null for paid plans, 14 or 30 for free
    isActive: boolean("is_active").default(true),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_subscription_plans_name").on(table.name),
    index("idx_subscription_plans_active").on(table.isActive),
  ]
);

// Organization Subscriptions - tracks which plan each org is on
export const organizationSubscriptions = pgTable(
  "organization_subscriptions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
    status: varchar("status").notNull().default("active"), // active, expired, cancelled, suspended, pending_payment
    billingCycleStart: timestamp("billing_cycle_start").notNull(),
    billingCycleEnd: timestamp("billing_cycle_end").notNull(),
    trialEndsAt: timestamp("trial_ends_at"), // set for free trial
    // Usage counters for current billing cycle
    usedFlows: integer("used_flows").default(0),
    usedFormSubmissions: integer("used_form_submissions").default(0),
    usedUsers: integer("used_users").default(0),
    // Outstanding balance from extra usage
    outstandingAmount: integer("outstanding_amount").default(0), // in INR
    // Scheduled upgrade: new plan starts after current billing cycle ends
    scheduledPlanId: varchar("scheduled_plan_id").references(() => subscriptionPlans.id),
    scheduledPaymentId: varchar("scheduled_payment_id"), // txn ID of the upgrade payment
    scheduledAt: timestamp("scheduled_at"), // when the upgrade was requested
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_org_subscriptions_org").on(table.organizationId),
    index("idx_org_subscriptions_status").on(table.status),
    index("idx_org_subscriptions_billing_end").on(table.billingCycleEnd),
    index("idx_org_subscriptions_trial").on(table.trialEndsAt).where(sql`${table.trialEndsAt} IS NOT NULL`),
  ]
);

// Payment Transactions - tracks all payments via PayU
export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    subscriptionId: varchar("subscription_id").references(() => organizationSubscriptions.id),
    // PayU fields
    payuTxnId: varchar("payu_txn_id").unique(), // PayU transaction ID
    payuMihpayid: varchar("payu_mihpayid"), // PayU's internal ID
    txnId: varchar("txn_id").notNull().unique(), // Our internal transaction ID
    amount: integer("amount").notNull(), // in INR
    // Breakdown
    planAmount: integer("plan_amount").default(0), // Plan subscription fee
    outstandingAmount: integer("outstanding_amount_paid").default(0), // Outstanding amount being paid
    extraUsageAmount: integer("extra_usage_amount").default(0), // Extra usage charges
    // Status
    status: varchar("status").notNull().default("pending"), // pending, success, failed, refunded
    paymentMode: varchar("payment_mode"), // CC, DC, NB, UPI, WALLET
    // PayU callback data
    payuResponse: jsonb("payu_response"), // Full PayU callback response
    errorMessage: text("error_message"),
    // Payment purpose
    paymentType: varchar("payment_type").notNull().default("subscription"), // subscription, outstanding, combined
    // Metadata
    initiatedBy: varchar("initiated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_payment_txn_org").on(table.organizationId),
    index("idx_payment_txn_status").on(table.status),
    index("idx_payment_txn_payu").on(table.payuTxnId),
    index("idx_payment_txn_id").on(table.txnId),
    index("idx_payment_txn_sub").on(table.subscriptionId),
  ]
);

// Usage Logs - detailed log of every billable action
export const usageLogs = pgTable(
  "usage_logs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    subscriptionId: varchar("subscription_id").references(() => organizationSubscriptions.id),
    actionType: varchar("action_type").notNull(), // flow_execution, form_submission, user_added
    actionId: varchar("action_id"), // ID of the flow/form/user
    isWithinLimit: boolean("is_within_limit").default(true), // whether this counted against plan limit or overage
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_usage_logs_org").on(table.organizationId, table.createdAt),
    index("idx_usage_logs_sub").on(table.subscriptionId, table.actionType),
    index("idx_usage_logs_type").on(table.actionType, table.createdAt),
  ]
);

// Relations for billing tables
export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(organizationSubscriptions),
}));

export const organizationSubscriptionsRelations = relations(organizationSubscriptions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [organizationSubscriptions.organizationId],
    references: [organizations.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [organizationSubscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  payments: many(paymentTransactions),
  usageLogs: many(usageLogs),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  organization: one(organizations, {
    fields: [paymentTransactions.organizationId],
    references: [organizations.id],
  }),
  subscription: one(organizationSubscriptions, {
    fields: [paymentTransactions.subscriptionId],
    references: [organizationSubscriptions.id],
  }),
  initiator: one(users, {
    fields: [paymentTransactions.initiatedBy],
    references: [users.id],
  }),
}));

export const usageLogsRelations = relations(usageLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [usageLogs.organizationId],
    references: [organizations.id],
  }),
  subscription: one(organizationSubscriptions, {
    fields: [usageLogs.subscriptionId],
    references: [organizationSubscriptions.id],
  }),
}));

// Insert schemas for billing
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationSubscriptionSchema = createInsertSchema(organizationSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUsageLogSchema = createInsertSchema(usageLogs).omit({
  id: true,
  createdAt: true,
});

// Types for billing
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type OrganizationSubscription = typeof organizationSubscriptions.$inferSelect;
export type InsertOrganizationSubscription = z.infer<typeof insertOrganizationSubscriptionSchema>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type UsageLog = typeof usageLogs.$inferSelect;
export type InsertUsageLog = z.infer<typeof insertUsageLogSchema>;

// ============================================
// PUBLIC FLOW TEMPLATES
// ============================================

export const publicFlowTemplates = pgTable(
  "public_flow_templates",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    description: text("description"),
    category: varchar("category").default("General"),
    tags: jsonb("tags").$type<string[]>().default([]),
    // Flow rules snapshot (stripped of user details)
    flowRules: jsonb("flow_rules").$type<{
      currentTask: string;
      status: string;
      nextTask: string;
      tat: number;
      tatType: string;
      doer: string; // role name only, no email
      formId?: string;
      transferable?: boolean;
      mergeCondition?: string;
    }[]>().notNull(),
    // Connected form templates snapshot (from MongoDB)
    formTemplates: jsonb("form_templates").$type<{
      formId: string;
      title: string;
      description?: string;
      fields: any[];
    }[]>().default([]),
    // Publishing metadata (NO user-identifying info)
    publishedByOrg: varchar("published_by_org"), // org name only, no ID
    useCount: integer("use_count").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_public_flow_templates_category").on(table.category),
    index("idx_public_flow_templates_active").on(table.isActive).where(sql`${table.isActive} = true`),
    index("idx_public_flow_templates_use_count").on(table.useCount.desc()),
    index("idx_public_flow_templates_created").on(table.createdAt.desc()),
  ]
);

export const insertPublicFlowTemplateSchema = createInsertSchema(publicFlowTemplates).omit({
  id: true,
  useCount: true,
  createdAt: true,
  updatedAt: true,
});

export type PublicFlowTemplate = typeof publicFlowTemplates.$inferSelect;
export type InsertPublicFlowTemplate = z.infer<typeof insertPublicFlowTemplateSchema>;
