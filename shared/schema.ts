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

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user"), // user, admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Flow Rules - Define workflow progression rules
export const flowRules = pgTable("flow_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Tasks - Individual task instances
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Form Templates - Define form structure
export const formTemplates = pgTable("form_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull().unique(), // Short identifier like "f001"
  title: varchar("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull(), // Array of question objects
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Form Responses - Store submitted form data
export const formResponses = pgTable("form_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
export const usersRelations = relations(users, ({ many }) => ({
  createdForms: many(formTemplates),
  submittedResponses: many(formResponses),
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

// Insert schemas
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
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertFlowRule = z.infer<typeof insertFlowRuleSchema>;
export type FlowRule = typeof flowRules.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertFormResponse = z.infer<typeof insertFormResponseSchema>;
export type FormResponse = typeof formResponses.$inferSelect;
