import {
  users,
  organizations,
  flowRules,
  tasks,
  formTemplates,
  formResponses,
  tatConfig,
  userLoginLogs,
  userDevices,
  passwordChangeHistory,
  insertOrganizationSchema,
  type User,
  type InsertUser,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type FlowRule,
  type InsertFlowRule,
  type Task,
  type InsertTask,
  type FormTemplate,
  type InsertFormTemplate,
  type FormResponse,
  type InsertFormResponse,
  type UserLoginLog,
  type InsertUserLoginLog,
  type UserDevice,
  type InsertUserDevice,
  type PasswordChangeHistory,
  type InsertPasswordChangeHistory,
  auditLogs,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, count, sql, lte } from "drizzle-orm";
import { 
  webhooks, 
  webhookDeliveryLog,
  webhookRetryQueue,
  type InsertWebhook, 
  type Webhook,
  type InsertWebhookDeliveryLog,
  type WebhookDeliveryLog,
  type InsertWebhookRetryQueue,
  type WebhookRetryQueue,
} from "@shared/schema";
import { transformFormDataToReadableNames } from "./formDataTransformer";
import NodeCache from 'node-cache';

// Form template cache - 10 minute TTL to reduce database load
const formTemplateCache = new NodeCache({
  stdTTL: 600,           // 10 minutes cache
  checkperiod: 120,      // Check for expired keys every 2 minutes
  useClones: false       // Better performance
});

export interface IStorage {
  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationByDomain(domain: string): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  getOrganizationUserCount(organizationId: string): Promise<number>;
  getAllOrganizations(): Promise<Organization[]>;
  updateOrganizationStatus(id: string, isActive: boolean): Promise<Organization>;
  updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization>;
  updateUserSuperAdminStatus(userId: string, isSuperAdmin: boolean): Promise<User>;

  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { actorId?: string; action?: string; targetType?: string; limit?: number }): Promise<AuditLog[]>;

  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<InsertUser, 'id'>): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsersByOrganization(organizationId: string): Promise<User[]>;

  // Flow Rules operations (organization-specific)
  getFlowRules(system?: string): Promise<FlowRule[]>;
  getFlowRulesByOrganization(organizationId: string, system?: string): Promise<FlowRule[]>;
  getFlowRuleById(id: string): Promise<FlowRule | undefined>;
  createFlowRule(flowRule: InsertFlowRule): Promise<FlowRule>;
  updateFlowRule(id: string, flowRule: Partial<InsertFlowRule>): Promise<FlowRule>;
  deleteFlowRule(id: string): Promise<void>;

  // Task operations (organization-specific)
  getTasks(userId?: string, status?: string): Promise<Task[]>;
  getTasksByOrganization(organizationId: string, status?: string): Promise<Task[]>;
  getUserTasksInOrganization(userEmail: string, organizationId: string, status?: string): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  getTasksByFlowId(flowId: string): Promise<Task[]>;

  // Form Template operations (organization-specific)
  getFormTemplates(createdBy?: string): Promise<FormTemplate[]>;
  getFormTemplatesByOrganization(organizationId: string): Promise<FormTemplate[]>;
  getAllFormTemplates(): Promise<FormTemplate[]>;
  getFormTemplateByFormId(formId: string): Promise<FormTemplate | undefined>;
  getFormTemplateById(id: string): Promise<FormTemplate | undefined>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: string, template: Partial<InsertFormTemplate>): Promise<FormTemplate>;
  deleteFormTemplate(id: string): Promise<void>;

  // Form Response operations (organization-specific)
  getFormResponses(flowId?: string, taskId?: string): Promise<FormResponse[]>;
  getFormResponsesByOrganization(organizationId: string, flowId?: string, taskId?: string): Promise<FormResponse[]>;
  createFormResponse(response: InsertFormResponse): Promise<FormResponse>;
  getFormResponsesByFlowId(flowId: string): Promise<FormResponse[]>;
  getFormResponsesWithTaskDetails(organizationId: string, flowId?: string, taskId?: string): Promise<any[]>;

  // MongoDB Form Response operations
  getMongoFormResponsesByOrgAndForm(params: {
    orgId: string;
    formId?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: any[]; total: number; page: number; pageSize: number }>;
  
  // Get previous form responses by flowId and organizationId from MongoDB for auto-prefill
  getMongoFormResponsesByFlowId(organizationId: string, flowId: string): Promise<any[]>;

  // TAT Configuration operations
  getTATConfig(organizationId: string): Promise<any>;
  upsertTATConfig(organizationId: string, config: any): Promise<any>;

  // Analytics operations
  getTaskMetrics(): Promise<{
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    onTimeRate: number;
    avgResolutionTime: number;
  }>;
  getOrganizationTaskMetrics(organizationId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    onTimeRate: number;
    avgResolutionTime: number;
  }>;
  getFlowPerformance(): Promise<{
    system: string;
    avgCompletionTime: number;
    onTimeRate: number;
  }[]>;
  getOrganizationFlowPerformance(organizationId: string): Promise<{
    system: string;
    avgCompletionTime: number;
    onTimeRate: number;
  }[]>;

  // Reporting filters and data
  getOrganizationSystems(organizationId: string): Promise<string[]>;
  getProcessesBySystem(organizationId: string, system: string): Promise<string[]>;
  getOrganizationReport(
    organizationId: string,
    filters: { system?: string; taskName?: string; startDate?: string; endDate?: string }
  ): Promise<{
    metrics: {
      totalTasks: number;
      completedTasks: number;
      overdueTasks: number;
      completionRate: number;
      onTimeRate: number;
      avgCompletionDays: number;
    };
    timeseries: Array<{ date: string; created: number; completed: number; overdue: number }>;
  }>;

  // User Management operations
  getAllUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUserDetails(id: string, details: Partial<User>): Promise<User>;
  changeUserStatus(id: string, status: string): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getOrganizationAdminCount(organizationId: string): Promise<number>;
  
  // Login Log operations
  createLoginLog(loginLog: InsertUserLoginLog): Promise<UserLoginLog>;
  getLoginLogs(userId?: string): Promise<UserLoginLog[]>;
  getOrganizationLoginLogs(organizationId: string): Promise<UserLoginLog[]>;
  updateLoginLog(id: string, data: Partial<UserLoginLog>): Promise<UserLoginLog>;
  
  // Device operations
  createOrUpdateDevice(device: InsertUserDevice): Promise<UserDevice>;
  getUserDevices(userId: string): Promise<UserDevice[]>;
  getOrganizationDevices(organizationId: string): Promise<UserDevice[]>;
  updateDeviceTrust(deviceId: string, isTrusted: boolean): Promise<UserDevice>;
  
  // Password history operations
  createPasswordChangeHistory(history: InsertPasswordChangeHistory): Promise<PasswordChangeHistory>;
  getPasswordHistory(userId: string): Promise<PasswordChangeHistory[]>;

  // Webhook operations
  createWebhook(webhook: InsertWebhook): Promise<Webhook>;
  getWebhooksByOrganization(organizationId: string): Promise<Webhook[]>;
  getActiveWebhooksForEvent(organizationId: string, event: string): Promise<Webhook[]>;
  updateWebhook(id: string, data: Partial<InsertWebhook>): Promise<Webhook>;
  deleteWebhook(id: string): Promise<void>;
  getWebhookById(id: string): Promise<Webhook | undefined>;
  
  // Webhook Delivery Log operations
  createWebhookDeliveryLog(log: InsertWebhookDeliveryLog): Promise<WebhookDeliveryLog>;
  getWebhookDeliveryLogs(webhookId: string, limit?: number): Promise<WebhookDeliveryLog[]>;
  getOrganizationWebhookDeliveryLogs(organizationId: string, limit?: number): Promise<WebhookDeliveryLog[]>;
  
  // Webhook Retry Queue operations
  createWebhookRetryQueueItem(item: InsertWebhookRetryQueue): Promise<WebhookRetryQueue>;
  getPendingRetries(limit?: number): Promise<WebhookRetryQueue[]>;
  updateRetryQueueItem(id: string, data: Partial<InsertWebhookRetryQueue>): Promise<WebhookRetryQueue>;
  deleteRetryQueueItem(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Helper function to sanitize input for ILIKE queries to prevent SQL injection
  private sanitizeForLike(input: string): string {
    // Escape special LIKE wildcards and backslashes
    return input.replace(/[%_\\]/g, '\\$&');
  }

  // Helper function to validate and parse date strings
  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  // Organization operations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
    return organization;
  }

  async getOrganizationByDomain(domain: string): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.domain, domain));
    return organization;
  }

  async getOrganizationById(id: string): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
    return organization;
  }

  async createOrganization(organizationData: InsertOrganization): Promise<Organization> {
    const [organization] = await db.insert(organizations).values(organizationData as any).returning();
    return organization;
  }

  async getOrganizationUserCount(organizationId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.organizationId, organizationId));
    return result[0]?.count || 0;
  }

  async getAllOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).orderBy(desc(organizations.createdAt));
  }

  async updateOrganizationStatus(id: string, isActive: boolean): Promise<Organization> {
    const [organization] = await db
      .update(organizations)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .returning();
    return organization;
  }

  async updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization> {
    const [organization] = await db
      .update(organizations)
      .set({
        ...updates,
        updatedAt: new Date(),
      } as any)
      .where(eq(organizations.id, id))
      .returning();
    return organization;
  }

  async updateUserSuperAdminStatus(userId: string, isSuperAdmin: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        isSuperAdmin,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Omit<InsertUser, 'id'>): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const email = userData.email;
      if (!email) {
        throw new Error("upsertUser requires a valid email");
      }
      // First try to find existing user by email
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (existingUser.length > 0) {
        // Update existing user - EXCLUDE id from update to prevent constraint violations
        const updateData = { ...userData };
        delete updateData.id; // Don't update the ID
        
        const [user] = await db
          .update(users)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(users.email, email))
          .returning();
        return user;
      } else {
        // Insert new user
        const [user] = await db.insert(users).values(userData).returning();
        return user;
      }
    } catch (error) {
      console.error("Error in upsertUser:", error);
      // If there's still a conflict, try to find and return the existing user
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, (userData as any).email as string))
        .limit(1);
      
      if (existingUser) {
        return existingUser;
      }
      throw error;
    }
  }

  // Flow Rules operations
  async getFlowRules(system?: string): Promise<FlowRule[]> {
    if (system) {
      return await db.select().from(flowRules).where(eq(flowRules.system, system));
    }
    return await db.select().from(flowRules).orderBy(asc(flowRules.system));
  }

  async getFlowRulesByOrganization(organizationId: string, system?: string): Promise<FlowRule[]> {
    if (system) {
      return await db.select().from(flowRules).where(
        and(eq(flowRules.organizationId, organizationId), eq(flowRules.system, system))
      );
    }
    return await db.select().from(flowRules).where(eq(flowRules.organizationId, organizationId)).orderBy(asc(flowRules.system));
  }

  async getFlowRuleById(id: string): Promise<FlowRule | undefined> {
    const [rule] = await db.select().from(flowRules).where(eq(flowRules.id, id));
    return rule;
  }

  async createFlowRule(flowRule: InsertFlowRule): Promise<FlowRule> {
    const [rule] = await db.insert(flowRules).values(flowRule).returning();
    return rule;
  }

  async updateFlowRule(id: string, flowRule: Partial<InsertFlowRule>): Promise<FlowRule> {
    const [rule] = await db
      .update(flowRules)
      .set({ ...flowRule, updatedAt: new Date() })
      .where(eq(flowRules.id, id))
      .returning();
    return rule;
  }

  async deleteFlowRule(id: string): Promise<void> {
    await db.delete(flowRules).where(eq(flowRules.id, id));
  }

  // Task operations
  async getTasksByOrganization(organizationId: string, status?: string): Promise<Task[]> {
    const conditions = [eq(tasks.organizationId, organizationId)];
    
    if (status) {
      conditions.push(eq(tasks.status, status));
    }
    
    const allTasks = await db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));
    
    // For each task, get the first form data from its flow (same enrichment as getTasks)
    const enrichedTasks = await Promise.all(
      allTasks.map(async (task) => {
        try {
          // Get all tasks in this flow
          const flowTasks = await db
            .select()
            .from(tasks)
            .where(eq(tasks.flowId, task.flowId))
            .orderBy(asc(tasks.createdAt));

          // Get the first task
          const firstTask = flowTasks[0];
          
          if (firstTask) {
            // Get form response for the first task
            const firstFormResponse = await db
              .select()
              .from(formResponses)
              .where(eq(formResponses.taskId, firstTask.id))
              .limit(1);

            if (firstFormResponse.length > 0) {
              return {
                ...task,
                flowInitialFormData: firstFormResponse[0].formData
              };
            }
          }
          
          return task;
        } catch (error) {
          console.error(`Error enriching task ${task.id} with flow data:`, error);
          return task;
        }
      })
    );
    
    return enrichedTasks;
  }

  async getUserTasksInOrganization(userEmail: string, organizationId: string, status?: string): Promise<Task[]> {
    const conditions = [
      eq(tasks.organizationId, organizationId),
      eq(tasks.doerEmail, userEmail)
    ];
    
    if (status) {
      conditions.push(eq(tasks.status, status));
    }
    
    const allTasks = await db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));
    
    // For each task, get the first form data from its flow (same enrichment as getTasks)
    const enrichedTasks = await Promise.all(
      allTasks.map(async (task) => {
        try {
          // Get all tasks in this flow
          const flowTasks = await db
            .select()
            .from(tasks)
            .where(eq(tasks.flowId, task.flowId))
            .orderBy(asc(tasks.createdAt));

          // Get the first task
          const firstTask = flowTasks[0];
          
          if (firstTask) {
            // Get form response for the first task
            const firstFormResponse = await db
              .select()
              .from(formResponses)
              .where(eq(formResponses.taskId, firstTask.id))
              .limit(1);

            if (firstFormResponse.length > 0) {
              return {
                ...task,
                flowInitialFormData: firstFormResponse[0].formData
              };
            }
          }
          
          return task;
        } catch (error) {
          console.error(`Error enriching task ${task.id} with flow data:`, error);
          return task;
        }
      })
    );
    
    return enrichedTasks;
  }

  async getTasks(userId?: string, status?: string): Promise<Task[]> {
    let whereConditions = [];
    
    if (userId) {
      whereConditions.push(eq(tasks.doerEmail, userId));
    }
    
    if (status) {
      whereConditions.push(eq(tasks.status, status));
    }
    
    const whereClause = whereConditions.length > 0 
      ? whereConditions.length === 1 
        ? whereConditions[0] 
        : and(...whereConditions)
      : undefined;
    
    const allTasks = whereClause 
      ? await db.select().from(tasks).where(whereClause).orderBy(desc(tasks.createdAt))
      : await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    
    // For each task, get the first form data from its flow
    const enrichedTasks = await Promise.all(
      allTasks.map(async (task) => {
        try {
          // Get all tasks in this flow
          const flowTasks = await db
            .select()
            .from(tasks)
            .where(eq(tasks.flowId, task.flowId))
            .orderBy(asc(tasks.createdAt));

          // Get the first task
          const firstTask = flowTasks[0];
          
          if (firstTask) {
            // Get form response for the first task
            const firstFormResponse = await db
              .select()
              .from(formResponses)
              .where(eq(formResponses.taskId, firstTask.id))
              .limit(1);

            if (firstFormResponse.length > 0) {
              return {
                ...task,
                flowInitialFormData: firstFormResponse[0].formData
              };
            }
          }
          
          return task;
        } catch (error) {
          console.error(`Error enriching task ${task.id} with flow data:`, error);
          return task;
        }
      })
    );
    
    return enrichedTasks;
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async getTasksByFlowId(flowId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.flowId, flowId))
      .orderBy(asc(tasks.createdAt));
  }

  async getAllTasks(status?: string): Promise<Task[]> {
    if (status) {
      return await db
        .select()
        .from(tasks)
        .where(eq(tasks.status, status))
        .orderBy(desc(tasks.createdAt));
    }
    
    return await db
      .select()
      .from(tasks)
      .orderBy(desc(tasks.createdAt));
  }

  // Form Template operations
  async getFormTemplatesByOrganization(organizationId: string): Promise<FormTemplate[]> {
    return await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.organizationId, organizationId))
      .orderBy(desc(formTemplates.createdAt));
  }

  async getFormTemplates(createdBy?: string): Promise<FormTemplate[]> {
    if (createdBy) {
      return await db
        .select()
        .from(formTemplates)
        .where(eq(formTemplates.createdBy, createdBy))
        .orderBy(desc(formTemplates.createdAt));
    }
    return await db.select().from(formTemplates).orderBy(desc(formTemplates.createdAt));
  }

  async getAllFormTemplates(): Promise<FormTemplate[]> {
    return await db.select().from(formTemplates).orderBy(desc(formTemplates.createdAt));
  }

  async getFormTemplateByFormId(formId: string): Promise<FormTemplate | undefined> {
    // Check cache first
    const cacheKey = `template:formId:${formId}`;
    const cached = formTemplateCache.get<FormTemplate>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const [template] = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.formId, formId));
    
    // Cache if found
    if (template) {
      formTemplateCache.set(cacheKey, template);
    }
    
    return template;
  }

  async getFormTemplateById(id: string): Promise<FormTemplate | undefined> {
    // Check cache first
    const cacheKey = `template:id:${id}`;
    const cached = formTemplateCache.get<FormTemplate>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const [template] = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.id, id));
    
    // Cache if found
    if (template) {
      formTemplateCache.set(cacheKey, template);
      // Also cache by formId for cross-key access
      if (template.formId) {
        formTemplateCache.set(`template:formId:${template.formId}`, template);
      }
    }
    
    return template;
  }

  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    const [newTemplate] = await db.insert(formTemplates).values(template).returning();
    
    // Cache the new template
    if (newTemplate.id) {
      formTemplateCache.set(`template:id:${newTemplate.id}`, newTemplate);
    }
    if (newTemplate.formId) {
      formTemplateCache.set(`template:formId:${newTemplate.formId}`, newTemplate);
    }
    
    return newTemplate;
  }

  async updateFormTemplate(id: string, template: Partial<InsertFormTemplate>): Promise<FormTemplate> {
    const [updatedTemplate] = await db
      .update(formTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(formTemplates.id, id))
      .returning();
    
    // Invalidate and update cache
    if (updatedTemplate) {
      formTemplateCache.del(`template:id:${id}`);
      if (updatedTemplate.formId) {
        formTemplateCache.del(`template:formId:${updatedTemplate.formId}`);
      }
      // Set fresh cache
      formTemplateCache.set(`template:id:${updatedTemplate.id}`, updatedTemplate);
      if (updatedTemplate.formId) {
        formTemplateCache.set(`template:formId:${updatedTemplate.formId}`, updatedTemplate);
      }
    }
    
    return updatedTemplate;
  }

  async deleteFormTemplate(id: string): Promise<void> {
    // Get template before deletion to invalidate all cache keys
    const template = await this.getFormTemplateById(id);
    
    await db.delete(formTemplates).where(eq(formTemplates.id, id));
    
    // Invalidate cache
    formTemplateCache.del(`template:id:${id}`);
    if (template?.formId) {
      formTemplateCache.del(`template:formId:${template.formId}`);
    }
  }

  // Form Response operations
  async getFormResponsesByOrganization(organizationId: string, flowId?: string, taskId?: string): Promise<FormResponse[]> {
    // ✅ Use MongoDB instead of PostgreSQL
    try {
      const { getFormResponsesCollection } = await import('./mongo/client.js');
      const col = await getFormResponsesCollection();
      
      const filter: any = { orgId: organizationId };
      if (flowId) filter.flowId = flowId;
      if (taskId) filter.taskId = taskId;
      
      const data = await col
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();
      
      return data.map(doc => ({
        id: doc._id.toString(),
        organizationId: doc.orgId,
        responseId: doc._id.toString(),
        flowId: doc.flowId,
        taskId: doc.taskId,
        taskName: doc.taskName,
        formId: doc.formId,
        submittedBy: doc.submittedBy,
        formData: doc.formData as any,
        timestamp: doc.createdAt,
      })) as FormResponse[];
    } catch (error) {
      console.error('Error fetching form responses from MongoDB:', error);
      return [];
    }
  }

  async getFormResponses(flowId?: string, taskId?: string): Promise<FormResponse[]> {
    if (flowId && taskId) {
      return await db.select().from(formResponses).where(and(eq(formResponses.flowId, flowId), eq(formResponses.taskId, taskId))).orderBy(desc(formResponses.timestamp));
    } else if (flowId) {
      return await db.select().from(formResponses).where(eq(formResponses.flowId, flowId)).orderBy(desc(formResponses.timestamp));
    } else if (taskId) {
      return await db.select().from(formResponses).where(eq(formResponses.taskId, taskId)).orderBy(desc(formResponses.timestamp));
    }
    
    return await db.select().from(formResponses).orderBy(desc(formResponses.timestamp));
  }

  async createFormResponse(response: InsertFormResponse): Promise<FormResponse> {
    // Transform form data to canonical format with readable field names
    const transformedFormData = await this.transformFormDataForStorage(
      response.formData,
      response.formId,
      response.organizationId
    );

    const responseWithTransformedData = {
      ...response,
      formData: transformedFormData
    };

    const [newResponse] = await db.insert(formResponses).values(responseWithTransformedData).returning();

    // Also store in MongoDB with retry logic for consistency
    await this.storeFormResponseInMongo(newResponse);

    return newResponse;
  }

  /**
   * Transform form data to canonical format using the centralized transformer
   * Replaces the old enrichFormDataWithColumnHeaders method
   */
  private async transformFormDataForStorage(
    formData: any,
    formId: string,
    organizationId: string
  ): Promise<any> {
    try {
      // Get the form template
      const [template] = await db
        .select()
        .from(formTemplates)
        .where(
          and(
            eq(formTemplates.formId, formId),
            eq(formTemplates.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!template || !template.questions) {
        console.warn(`Form template not found for formId: ${formId}`);
        return formData; // Return original if template not found
      }

      // Parse questions if needed
      const questions = typeof template.questions === 'string'
        ? JSON.parse(template.questions)
        : template.questions;

      // Use centralized transformer
      const result = transformFormDataToReadableNames(formData, questions);
      return result.transformed;
    } catch (error) {
      console.error('Error transforming form data:', error);
      return formData; // Return original on error
    }
  }

  /**
   * Store form response in MongoDB with retry logic
   * Ensures data consistency between PostgreSQL and MongoDB
   */
  private async storeFormResponseInMongo(
    response: FormResponse,
    retries: number = 3
  ): Promise<void> {
    let lastError: any;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { getFormResponsesCollection } = await import('./mongo/client.js');
        
        // Fetch related task details to enrich the document
        const [taskDetails] = await db
          .select({
            orderNumber: tasks.orderNumber,
            system: tasks.system,
            flowDescription: tasks.flowDescription,
            flowInitiatedBy: tasks.flowInitiatedBy,
            flowInitiatedAt: tasks.flowInitiatedAt,
          })
          .from(tasks)
          .where(eq(tasks.id, response.taskId))
          .limit(1);

        const col = await getFormResponsesCollection();
        await col.insertOne({
          orgId: (response as any).organizationId,
          flowId: response.flowId,
          taskId: response.taskId,
          taskName: response.taskName,
          formId: response.formId,
          submittedBy: response.submittedBy,
          orderNumber: (taskDetails?.orderNumber ?? undefined) as any,
          system: taskDetails?.system ?? undefined,
          flowDescription: taskDetails?.flowDescription ?? undefined,
          flowInitiatedBy: taskDetails?.flowInitiatedBy ?? undefined,
          flowInitiatedAt: (taskDetails?.flowInitiatedAt ?? undefined) as any,
          formData: (response as any).formData,
          createdAt: new Date((response as any).timestamp),
        });
        
        // Success - exit retry loop
        return;
      } catch (e) {
        lastError = e;
        console.error(`MongoDB insert attempt ${attempt + 1}/${retries} failed:`, e);
        
        // Wait before retrying (exponential backoff)
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    // All retries failed - log critical error
    console.error('CRITICAL: MongoDB form response insert failed after all retries:', {
      responseId: response.responseId,
      flowId: response.flowId,
      taskId: response.taskId,
      error: lastError
    });
    
    // Consider: Queue for later sync, send alert, etc.
    // For now, we don't throw to avoid blocking the main flow
  }

  async getFormResponsesByFlowId(flowId: string): Promise<FormResponse[]> {
 // ✅ Use MongoDB instead of PostgreSQL
    try {
      const { getFormResponsesCollection } = await import('./mongo/client.js');
      const col = await getFormResponsesCollection();
      
      const data = await col
        .find({ flowId })
        .sort({ createdAt: 1 })
        .toArray();
      
      return data.map(doc => ({
        id: doc._id.toString(),
        organizationId: doc.orgId,
        responseId: doc._id.toString(),
        flowId: doc.flowId,
        taskId: doc.taskId,
        taskName: doc.taskName,
        formId: doc.formId,
        submittedBy: doc.submittedBy,
        formData: doc.formData as any,
        timestamp: doc.createdAt,
      })) as FormResponse[];
    } catch (error) {
      console.error('Error fetching form responses by flowId from MongoDB:', error);
      return [];
    }
  }

  // Get form responses with task details including order number (organization-specific)
  async getFormResponsesWithTaskDetails(organizationId: string, flowId?: string, taskId?: string): Promise<any[]> {
    const conditions = [eq(formResponses.organizationId, organizationId)];
    
    if (flowId) {
      conditions.push(eq(formResponses.flowId, flowId));
    }
    if (taskId) {
      conditions.push(eq(formResponses.taskId, taskId));
    }
    
    return await db
      .select({
        // Form response fields
        id: formResponses.id,
        responseId: formResponses.responseId,
        flowId: formResponses.flowId,
        taskId: formResponses.taskId,
        taskName: formResponses.taskName,
        formId: formResponses.formId,
        submittedBy: formResponses.submittedBy,
        formData: formResponses.formData,
        timestamp: formResponses.timestamp,
        // Task details
        orderNumber: tasks.orderNumber,
        system: tasks.system,
        flowDescription: tasks.flowDescription,
        flowInitiatedBy: tasks.flowInitiatedBy,
        flowInitiatedAt: tasks.flowInitiatedAt,
      })
      .from(formResponses)
      .leftJoin(tasks, eq(formResponses.taskId, tasks.id))
      .where(and(...conditions))
      .orderBy(desc(formResponses.timestamp));
  }

  // MongoDB Form Response operations
  async getMongoFormResponsesByOrgAndForm(params: {
    orgId: string;
    formId?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const { orgId, formId, startDate, endDate, page = 1, pageSize = 50 } = params;
    
    try {
      const { getFormResponsesCollection } = await import('./mongo/client.js');
      const col = await getFormResponsesCollection();

      const filter: any = { orgId };
      if (formId) filter.formId = formId;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const total = await col.countDocuments(filter);
      const data = await col
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();

      return { data, total, page, pageSize };
    } catch (error) {
      console.error('Error fetching MongoDB form responses:', error);
      return { data: [], total: 0, page, pageSize };
    }
  }

  // Get previous form responses by flowId and organizationId from MongoDB for auto-prefill
  async getMongoFormResponsesByFlowId(organizationId: string, flowId: string): Promise<any[]> {
    try {
      const { getFormResponsesCollection } = await import('./mongo/client.js');
      const col = await getFormResponsesCollection();

      const filter = { 
        orgId: organizationId,
        flowId: flowId
      };

      // Get form responses ordered by creation date (oldest first for consistent auto-prefill)
      const data = await col
        .find(filter)
        .sort({ createdAt: 1 })
        .toArray();

      // Transform MongoDB documents to match the expected format
      return data.map((doc) => ({
        id: doc._id?.toString(),
        taskId: doc.taskId,
        formData: doc.formData,
        submittedAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
        taskName: doc.taskName,
        formId: doc.formId,
        submittedBy: doc.submittedBy,
        orderNumber: doc.orderNumber,
        system: doc.system,
        flowDescription: doc.flowDescription,
        flowInitiatedBy: doc.flowInitiatedBy,
        flowInitiatedAt: doc.flowInitiatedAt
      }));
    } catch (error) {
      console.error('Error fetching MongoDB form responses by flowId:', error);
      return [];
    }
  }

  // Analytics operations
  async getTaskMetrics(): Promise<{
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    onTimeRate: number;
    avgResolutionTime: number;
  }> {
    const totalResult = await db.select({ count: count() }).from(tasks);
    const completedResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.status, "completed"));
    const overdueResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.status, "overdue"));
    
    const onTimeResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.status, "completed"),
          sql`${tasks.actualCompletionTime} <= ${tasks.plannedTime}`
        )
      );

    const avgResolutionResult = await db
      .select({
        avgTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${tasks.actualCompletionTime} - ${tasks.plannedTime})) / 86400)`
      })
      .from(tasks)
      .where(eq(tasks.status, "completed"));

    const totalTasks = totalResult[0].count;
    const completedTasks = completedResult[0].count;
    const overdueTasks = overdueResult[0].count;
    const onTimeTasks = onTimeResult[0].count;
    const onTimeRate = completedTasks > 0 ? Math.min(100, (onTimeTasks / completedTasks) * 100) : 0;
    const avgResolutionTime = avgResolutionResult[0]?.avgTime || 0;

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
    };
  }

  async getOrganizationTaskMetrics(organizationId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    onTimeRate: number;
    avgResolutionTime: number;
  }> {
    const totalResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.organizationId, organizationId));
    
    const completedResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.organizationId, organizationId), eq(tasks.status, "completed")));
    
    const overdueResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.organizationId, organizationId), eq(tasks.status, "overdue")));
    
    const onTimeResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.organizationId, organizationId),
          eq(tasks.status, "completed"),
          sql`${tasks.actualCompletionTime} <= ${tasks.plannedTime}`
        )
      );

    const avgResolutionResult = await db
      .select({
        avgTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${tasks.actualCompletionTime} - ${tasks.plannedTime})) / 86400)`
      })
      .from(tasks)
      .where(and(eq(tasks.organizationId, organizationId), eq(tasks.status, "completed")));

    const totalTasks = totalResult[0].count;
    const completedTasks = completedResult[0].count;
    const overdueTasks = overdueResult[0].count;
    const onTimeTasks = onTimeResult[0].count;
    const onTimeRate = completedTasks > 0 ? Math.min(100, (onTimeTasks / completedTasks) * 100) : 0;
    const avgResolutionTime = avgResolutionResult[0]?.avgTime || 0;

  return {
      totalTasks,
      completedTasks,
      overdueTasks,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
    };
  }

  async getFlowPerformance(): Promise<{
    system: string;
    avgCompletionTime: number;
    onTimeRate: number;
  }[]> {
    const results = await db
      .select({
        system: tasks.system,
        avgTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${tasks.actualCompletionTime} - ${tasks.plannedTime})) / 86400)`,
        totalCompleted: count(),
        onTimeCount: sql<number>`COUNT(CASE WHEN ${tasks.actualCompletionTime} <= ${tasks.plannedTime} THEN 1 END)`,
      })
      .from(tasks)
      .where(eq(tasks.status, "completed"))
      .groupBy(tasks.system);

    return results.map(result => ({
      system: result.system,
      avgCompletionTime: Math.round(result.avgTime * 10) / 10,
      onTimeRate: Math.round((result.onTimeCount / result.totalCompleted) * 100),
    }));
  }

  async getOrganizationFlowPerformance(organizationId: string): Promise<{
    system: string;
    avgCompletionTime: number;
    onTimeRate: number;
  }[]> {
    const results = await db
      .select({
        system: tasks.system,
        avgTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${tasks.actualCompletionTime} - ${tasks.plannedTime})) / 86400)`,
        totalCompleted: count(),
        onTimeCount: sql<number>`COUNT(CASE WHEN ${tasks.actualCompletionTime} <= ${tasks.plannedTime} THEN 1 END)`,
      })
      .from(tasks)
      .where(and(eq(tasks.organizationId, organizationId), eq(tasks.status, "completed")))
      .groupBy(tasks.system);

    return results.map(result => ({
      system: result.system,
      avgCompletionTime: Math.round(result.avgTime * 10) / 10,
      onTimeRate: Math.round((result.onTimeCount / result.totalCompleted) * 100),
    }));
  }

  async getTATConfig(organizationId: string): Promise<any> {
    const [config] = await db.select().from(tatConfig).where(eq(tatConfig.organizationId, organizationId)).limit(1);
    return config;
  }

  // User-specific analytics methods
  async getUserTaskMetrics(userEmail: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    onTimeRate: number;
    avgResolutionTime: number;
  }> {
    const totalResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.doerEmail, userEmail));
    
    const completedResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.doerEmail, userEmail), eq(tasks.status, "completed")));
    
    const overdueResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.doerEmail, userEmail), eq(tasks.status, "overdue")));
    
    const onTimeResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.doerEmail, userEmail),
          eq(tasks.status, "completed"),
          sql`${tasks.actualCompletionTime} <= ${tasks.plannedTime}`
        )
      );

    const avgResolutionResult = await db
      .select({
        avgTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${tasks.actualCompletionTime} - ${tasks.plannedTime})) / 86400)`
      })
      .from(tasks)
      .where(and(eq(tasks.doerEmail, userEmail), eq(tasks.status, "completed")));

    const totalTasks = totalResult[0].count;
    const completedTasks = completedResult[0].count;
    const overdueTasks = overdueResult[0].count;
    const onTimeTasks = onTimeResult[0].count;
    const onTimeRate = completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;
    const avgResolutionTime = avgResolutionResult[0]?.avgTime || 0;

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      onTimeRate: Math.round(onTimeRate),
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
    };
  }

  async getUserFlowPerformance(userEmail: string): Promise<{
    system: string;
    avgCompletionTime: number;
    onTimeRate: number;
  }[]> {
    const results = await db
      .select({
        system: tasks.system,
        avgTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${tasks.actualCompletionTime} - ${tasks.plannedTime})) / 86400)`,
        totalCompleted: count(),
        onTimeCount: sql<number>`COUNT(CASE WHEN ${tasks.actualCompletionTime} <= ${tasks.plannedTime} THEN 1 END)`,
      })
      .from(tasks)
      .where(and(eq(tasks.doerEmail, userEmail), eq(tasks.status, "completed")))
      .groupBy(tasks.system);

    return results.map(result => ({
      system: result.system,
      avgCompletionTime: Math.round(result.avgTime * 10) / 10,
      onTimeRate: Math.round((result.onTimeCount / result.totalCompleted) * 100),
    }));
  }

  // Reporting filters and data
  async getOrganizationSystems(organizationId: string): Promise<string[]> {
    const results = await db
      .select({ system: tasks.system })
      .from(tasks)
      .where(eq(tasks.organizationId, organizationId))
      .groupBy(tasks.system);
    return results.map((r) => r.system).filter(Boolean);
  }

  async getProcessesBySystem(organizationId: string, system: string): Promise<string[]> {
    const results = await db
      .select({ taskName: tasks.taskName })
      .from(tasks)
      .where(and(eq(tasks.organizationId, organizationId), eq(tasks.system, system)))
      .groupBy(tasks.taskName);
    return results.map((r) => r.taskName).filter(Boolean);
  }

  async getOrganizationReport(
    organizationId: string,
    filters: { system?: string; taskName?: string; startDate?: string; endDate?: string }
  ): Promise<{
    metrics: {
      totalTasks: number;
      completedTasks: number;
      overdueTasks: number;
      completionRate: number;
      onTimeRate: number;
      avgCompletionDays: number;
    };
    timeseries: Array<{ date: string; created: number; completed: number; overdue: number }>;
  }> {
    const conds: any[] = [eq(tasks.organizationId, organizationId)];
    if (filters.system) conds.push(eq(tasks.system, filters.system));
    if (filters.taskName) conds.push(eq(tasks.taskName, filters.taskName));
    
    // Validate and parse dates before using in query
    if (filters.startDate) {
      const startDate = this.parseDate(filters.startDate);
      if (startDate) {
        conds.push(sql`${tasks.plannedTime} >= ${startDate}`);
      }
    }
    if (filters.endDate) {
      const endDate = this.parseDate(filters.endDate);
      if (endDate) {
        conds.push(sql`${tasks.plannedTime} <= ${endDate}`);
      }
    }

    const whereExpr = and(...conds);

    // Metrics
    const [totalResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(whereExpr);

    const [completedResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(whereExpr, eq(tasks.status, "completed")));

    const [overdueResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(whereExpr, eq(tasks.status, "overdue")));

    const [onTimeResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          whereExpr,
          eq(tasks.status, "completed"),
          sql`${tasks.actualCompletionTime} <= ${tasks.plannedTime}`
        )
      );

    const [avgCompletionResult] = await db
      .select({
        avgDays: sql<number>`AVG(EXTRACT(EPOCH FROM (${tasks.actualCompletionTime} - ${tasks.plannedTime})) / 86400)`,
      })
      .from(tasks)
      .where(and(whereExpr, eq(tasks.status, "completed")));

    const totalTasks = Number(totalResult?.count || 0);
    const completedTasks = Number(completedResult?.count || 0);
    const overdueTasks = Number(overdueResult?.count || 0);
    const onTimeTasks = Number(onTimeResult?.count || 0);
    const onTimeRate = completedTasks > 0 ? Math.round((onTimeTasks / completedTasks) * 100) : 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const avgCompletionDays = Math.round(((avgCompletionResult?.avgDays as any) || 0) * 10) / 10;

    // Timeseries grouped by day (planned_time)
    const ts = await db.execute(sql`
      SELECT 
        DATE_TRUNC('day', ${tasks.plannedTime}) as day,
        COUNT(*) as created,
        COUNT(CASE WHEN ${tasks.status} = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN ${tasks.status} = 'overdue' THEN 1 END) as overdue
      FROM ${tasks}
      WHERE ${whereExpr}
      GROUP BY DATE_TRUNC('day', ${tasks.plannedTime})
      ORDER BY day ASC
    `);

    const timeseries = (ts.rows as any[]).map((r) => ({
      date: r.day,
      created: Number(r.created || 0),
      completed: Number(r.completed || 0),
      overdue: Number(r.overdue || 0),
    }));

    return {
      metrics: {
        totalTasks,
        completedTasks,
        overdueTasks,
        completionRate,
        onTimeRate,
        avgCompletionDays,
      },
      timeseries,
    };
  }

  // Weekly scoring for users
  async getUserWeeklyScoring(userEmail: string): Promise<{
    weekStart: string;
    weekEnd: string;
    totalTasks: number;
    completedTasks: number;
    onTimeRate: number;
    avgCompletionDays: number;
  }[]> {
    const results = await db.execute(sql`
      WITH weekly_data AS (
        SELECT 
          DATE_TRUNC('week', planned_time) as week_start,
          DATE_TRUNC('week', planned_time) + INTERVAL '6 days' as week_end,
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN status = 'completed' AND actual_completion_time <= planned_time THEN 1 END) as on_time_tasks,
          AVG(CASE WHEN status = 'completed' THEN EXTRACT(EPOCH FROM (actual_completion_time - planned_time)) / 86400 END) as avg_completion_days
        FROM tasks 
        WHERE doer_email = ${userEmail}
          AND planned_time >= NOW() - INTERVAL '12 weeks'
        GROUP BY DATE_TRUNC('week', planned_time)
        ORDER BY week_start DESC
      )
      SELECT 
        week_start,
        week_end,
        total_tasks,
        completed_tasks,
        CASE 
          WHEN completed_tasks > 0 THEN ROUND((on_time_tasks * 100.0) / completed_tasks, 2)
          ELSE 0 
        END as on_time_rate,
        COALESCE(ROUND(avg_completion_days, 2), 0) as avg_completion_days
      FROM weekly_data
    `);

    return (results.rows as any[]).map((row) => ({
      weekStart: row.week_start,
      weekEnd: row.week_end,
      totalTasks: Number(row.total_tasks),
      completedTasks: Number(row.completed_tasks),
      onTimeRate: Number(row.on_time_rate),
      avgCompletionDays: Number(row.avg_completion_days),
    }));
  }

  // Admin view: All doers' performance with filtering
  async getAllDoersPerformance(filters: {
    startDate?: string;
    endDate?: string;
    doerName?: string;
    doerEmail?: string;
  } = {}): Promise<{
    doerEmail: string;
    doerName: string;
    totalTasks: number;
    completedTasks: number;
    onTimeRate: number;
    avgCompletionDays: number;
    lastTaskDate: string | null;
  }[]> {
    let whereConditions = sql`1=1`;
    
    // Validate and sanitize date inputs
    if (filters.startDate) {
      const startDate = this.parseDate(filters.startDate);
      if (startDate) {
        whereConditions = sql`${whereConditions} AND planned_time >= ${startDate}`;
      }
    }
    if (filters.endDate) {
      const endDate = this.parseDate(filters.endDate);
      if (endDate) {
        whereConditions = sql`${whereConditions} AND planned_time <= ${endDate}`;
      }
    }
    
    // Sanitize ILIKE patterns to prevent SQL injection
    if (filters.doerEmail) {
      const sanitizedEmail = this.sanitizeForLike(filters.doerEmail);
      whereConditions = sql`${whereConditions} AND doer_email ILIKE ${'%' + sanitizedEmail + '%'}`;
    }
    if (filters.doerName) {
      const sanitizedName = this.sanitizeForLike(filters.doerName);
      whereConditions = sql`${whereConditions} AND doer_email ILIKE ${'%' + sanitizedName + '%'}`;
    }

    const results = await db.execute(sql`
      SELECT 
        doer_email,
        doer_email as doer_name,
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'completed' AND actual_completion_time <= planned_time THEN 1 END) as on_time_tasks,
        AVG(CASE WHEN status = 'completed' THEN EXTRACT(EPOCH FROM (actual_completion_time - planned_time)) / 86400 END) as avg_completion_days,
        MAX(planned_time) as last_task_date
      FROM tasks 
      WHERE ${whereConditions}
      GROUP BY doer_email
      ORDER BY doer_email
    `);

    return (results.rows as any[]).map((row) => ({
      doerEmail: row.doer_email,
      doerName: row.doer_name,
      totalTasks: Number(row.total_tasks),
      completedTasks: Number(row.completed_tasks),
      onTimeRate: row.completed_tasks > 0 ? Math.round((Number(row.on_time_tasks) / Number(row.completed_tasks)) * 100) : 0,
      avgCompletionDays: Number(row.avg_completion_days) || 0,
      lastTaskDate: row.last_task_date,
    }));
  }

  async getOrganizationDoersPerformance(filters: {
    organizationId: string;
    startDate?: string;
    endDate?: string;
    doerName?: string;
    doerEmail?: string;
  }): Promise<{
    doerEmail: string;
    doerName: string;
    totalTasks: number;
    completedTasks: number;
    onTimeRate: number;
    avgCompletionDays: number;
    lastTaskDate: string | null;
  }[]> {
    let whereConditions = sql`organization_id = ${filters.organizationId}`;
    
    // Validate and sanitize date inputs
    if (filters.startDate) {
      const startDate = this.parseDate(filters.startDate);
      if (startDate) {
        whereConditions = sql`${whereConditions} AND planned_time >= ${startDate}`;
      }
    }
    if (filters.endDate) {
      const endDate = this.parseDate(filters.endDate);
      if (endDate) {
        whereConditions = sql`${whereConditions} AND planned_time <= ${endDate}`;
      }
    }
    
    // Sanitize ILIKE patterns to prevent SQL injection
    if (filters.doerEmail) {
      const sanitizedEmail = this.sanitizeForLike(filters.doerEmail);
      whereConditions = sql`${whereConditions} AND doer_email ILIKE ${'%' + sanitizedEmail + '%'}`;
    }
    if (filters.doerName) {
      const sanitizedName = this.sanitizeForLike(filters.doerName);
      whereConditions = sql`${whereConditions} AND doer_email ILIKE ${'%' + sanitizedName + '%'}`;
    }

    const results = await db.execute(sql`
      SELECT 
        doer_email,
        doer_email as doer_name,
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'completed' AND actual_completion_time <= planned_time THEN 1 END) as on_time_tasks,
        AVG(CASE WHEN status = 'completed' THEN EXTRACT(EPOCH FROM (actual_completion_time - planned_time)) / 86400 END) as avg_completion_days,
        MAX(planned_time) as last_task_date
      FROM tasks 
      WHERE ${whereConditions}
      GROUP BY doer_email
      ORDER BY doer_email
    `);

    return (results.rows as any[]).map((row) => ({
      doerEmail: row.doer_email,
      doerName: row.doer_name,
      totalTasks: Number(row.total_tasks),
      completedTasks: Number(row.completed_tasks),
      onTimeRate: row.completed_tasks > 0 ? Math.round((Number(row.on_time_tasks) / Number(row.completed_tasks)) * 100) : 0,
      avgCompletionDays: Number(row.avg_completion_days) || 0,
      lastTaskDate: row.last_task_date,
    }));
  }

  // Admin view: Detailed weekly performance for a specific doer
  async getDoerWeeklyPerformance(doerEmail: string, weeks: number = 12): Promise<{
    weekStart: string;
    weekEnd: string;
    totalTasks: number;
    completedTasks: number;
    onTimeRate: number;
    avgCompletionDays: number;
  }[]> {
    const results = await db.execute(sql`
      WITH weekly_data AS (
        SELECT 
          DATE_TRUNC('week', planned_time) as week_start,
          DATE_TRUNC('week', planned_time) + INTERVAL '6 days' as week_end,
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN status = 'completed' AND actual_completion_time <= planned_time THEN 1 END) as on_time_tasks,
          AVG(CASE WHEN status = 'completed' THEN EXTRACT(EPOCH FROM (actual_completion_time - planned_time)) / 86400 END) as avg_completion_days
        FROM tasks 
        WHERE doer_email = ${doerEmail}
          AND planned_time >= NOW() - INTERVAL '${weeks} weeks'
        GROUP BY DATE_TRUNC('week', planned_time)
        ORDER BY week_start DESC
      )
      SELECT 
        week_start,
        week_end,
        total_tasks,
        completed_tasks,
        CASE 
          WHEN completed_tasks > 0 THEN ROUND((on_time_tasks * 100.0) / completed_tasks, 2)
          ELSE 0 
        END as on_time_rate,
        COALESCE(ROUND(avg_completion_days, 2), 0) as avg_completion_days
      FROM weekly_data
    `);

    return (results.rows as any[]).map((row) => ({
      weekStart: row.week_start,
      weekEnd: row.week_end,
      totalTasks: Number(row.total_tasks),
      completedTasks: Number(row.completed_tasks),
      onTimeRate: Number(row.on_time_rate),
      avgCompletionDays: Number(row.avg_completion_days),
    }));
  }

  async upsertTATConfig(organizationId: string, configData: any): Promise<any> {
    const existing = await this.getTATConfig(organizationId);
    
    if (existing) {
      const [updated] = await db
        .update(tatConfig)
        .set({
          ...configData,
          updatedAt: new Date(),
        })
        .where(eq(tatConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(tatConfig)
        .values({
          ...configData,
          organizationId,
        })
        .returning();
      return created;
    }
  }

  // User Management operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.firstName));
  }

  // Organization-specific user methods
  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  async updateUserDetails(id: string, details: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...details, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async changeUserStatus(id: string, status: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getOrganizationAdminCount(organizationId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.role, 'admin'),
          eq(users.status, 'active')
        )
      );
    return result[0]?.count || 0;
  }

  // Webhook operations
  async createWebhook(webhookData: InsertWebhook): Promise<Webhook> {
    try {
      console.log('[webhooks][createWebhook] inserting', {
        organizationId: webhookData.organizationId,
        event: (webhookData as any).event,
        targetUrl: (webhookData as any).targetUrl,
      });
      const [record] = await db.insert(webhooks).values(webhookData).returning();
      console.log('[webhooks][createWebhook] inserted id', record?.id);
      return record;
    } catch (err:any) {
      console.error('[webhooks][createWebhook] failed:', err?.message, err);
      throw err;
    }
  }

  async getWebhooksByOrganization(organizationId: string): Promise<Webhook[]> {
    try {
      const rows = await db
        .select()
        .from(webhooks)
        .where(eq(webhooks.organizationId, organizationId))
        .orderBy(desc(webhooks.createdAt));
      console.log('[webhooks][list] org', organizationId, 'count', rows.length);
      return rows;
    } catch (err:any) {
      console.error('[webhooks][list] failed for org', organizationId, err?.message);
      if (err?.message?.includes('relation') && err?.message?.includes('webhooks')) {
        const friendly = new Error('WEBHOOKS_TABLE_MISSING');
        (friendly as any).original = err;
        throw friendly;
      }
      throw err;
    }
  }

  async getActiveWebhooksForEvent(organizationId: string, event: string): Promise<Webhook[]> {
    return await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.organizationId, organizationId), eq(webhooks.event, event), eq(webhooks.isActive, true)));
  }

  async updateWebhook(id: string, data: Partial<InsertWebhook>): Promise<Webhook> {
    const [record] = await db
      .update(webhooks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(webhooks.id, id))
      .returning();
    return record;
  }

  async deleteWebhook(id: string): Promise<void> {
    await db.delete(webhooks).where(eq(webhooks.id, id));
  }

  async getWebhookById(id: string): Promise<Webhook | undefined> {
    const [hook] = await db.select().from(webhooks).where(eq(webhooks.id, id));
    return hook;
  }

  // Login Log operations
  async createLoginLog(loginLog: InsertUserLoginLog): Promise<UserLoginLog> {
    const [log] = await db.insert(userLoginLogs).values(loginLog).returning();
    return log;
  }

  async getLoginLogs(userId?: string): Promise<UserLoginLog[]> {
    if (userId) {
      return await db.select().from(userLoginLogs).where(eq(userLoginLogs.userId, userId)).orderBy(desc(userLoginLogs.loginTime));
    }
    
    return await db.select().from(userLoginLogs).orderBy(desc(userLoginLogs.loginTime));
  }

  async updateLoginLog(id: string, data: Partial<UserLoginLog>): Promise<UserLoginLog> {
    const [log] = await db
      .update(userLoginLogs)
      .set(data)
      .where(eq(userLoginLogs.id, id))
      .returning();
    return log;
  }

  async getOrganizationLoginLogs(organizationId: string): Promise<any[]> {
    const logs = await db
      .select({
        id: userLoginLogs.id,
        userId: userLoginLogs.userId,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        deviceId: userLoginLogs.deviceId,
        deviceName: userLoginLogs.deviceName,
        deviceType: userLoginLogs.deviceType,
        browserName: userLoginLogs.browserName,
        browserVersion: userLoginLogs.browserVersion,
        operatingSystem: userLoginLogs.operatingSystem,
        ipAddress: userLoginLogs.ipAddress,
        location: userLoginLogs.location,
        userAgent: userLoginLogs.userAgent,
        loginTime: userLoginLogs.loginTime,
        logoutTime: userLoginLogs.logoutTime,
        sessionDuration: userLoginLogs.sessionDuration,
        loginStatus: userLoginLogs.loginStatus,
        failureReason: userLoginLogs.failureReason,
      })
      .from(userLoginLogs)
      .leftJoin(users, eq(userLoginLogs.userId, users.id))
      .where(eq(userLoginLogs.organizationId, organizationId))
      .orderBy(desc(userLoginLogs.loginTime));
    
    return logs;
  }

  async getOrganizationDevices(organizationId: string): Promise<UserDevice[]> {
    return await db
      .select()
      .from(userDevices)
      .where(eq(userDevices.organizationId, organizationId))
      .orderBy(desc(userDevices.lastSeenAt));
  }

  // Device operations
  async createOrUpdateDevice(device: InsertUserDevice): Promise<UserDevice> {
    // Check if device already exists
    const existingDevice = await db
      .select()
      .from(userDevices)
      .where(and(eq(userDevices.userId, device.userId), eq(userDevices.deviceId, device.deviceId)))
      .limit(1);

    if (existingDevice.length > 0) {
      // Update existing device
      const [updatedDevice] = await db
        .update(userDevices)
        .set({ ...device, lastSeenAt: new Date() })
        .where(eq(userDevices.id, existingDevice[0].id))
        .returning();
      return updatedDevice;
    } else {
      // Create new device
      const [newDevice] = await db.insert(userDevices).values(device).returning();
      return newDevice;
    }
  }

  async getUserDevices(userId: string): Promise<UserDevice[]> {
    return await db
      .select()
      .from(userDevices)
      .where(eq(userDevices.userId, userId))
      .orderBy(desc(userDevices.lastSeenAt));
  }

  async updateDeviceTrust(deviceId: string, isTrusted: boolean): Promise<UserDevice> {
    const [device] = await db
      .update(userDevices)
      .set({ isTrusted })
      .where(eq(userDevices.deviceId, deviceId))
      .returning();
    return device;
  }

  // Password history operations
  async createPasswordChangeHistory(history: InsertPasswordChangeHistory): Promise<PasswordChangeHistory> {
    const [record] = await db.insert(passwordChangeHistory).values(history).returning();
    return record;
  }

  async getPasswordHistory(userId: string): Promise<PasswordChangeHistory[]> {
    return await db
      .select()
      .from(passwordChangeHistory)
      .where(eq(passwordChangeHistory.userId, userId))
      .orderBy(desc(passwordChangeHistory.changedAt));
  }

  // Audit log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [record] = await db.insert(auditLogs).values(log).returning();
    return record;
  }

  async getAuditLogs(filters?: {
    actorId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    organizationId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);

    const conditions = [];
    if (filters?.actorId) {
      conditions.push(eq(auditLogs.actorId, filters.actorId));
    }
    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters?.targetType) {
      conditions.push(eq(auditLogs.targetType, filters.targetType));
    }
    if (filters?.targetId) {
      conditions.push(eq(auditLogs.targetId, filters.targetId));
    }
    if (filters?.organizationId) {
      conditions.push(eq(auditLogs.organizationId, filters.organizationId));
    }
    if (filters?.startDate) {
      conditions.push(sql`${auditLogs.createdAt} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${auditLogs.createdAt} <= ${filters.endDate}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(auditLogs.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    } else {
      query = query.limit(100) as any; // Default limit
    }

    return await query;
  }

  // Webhook Delivery Log operations
  async createWebhookDeliveryLog(log: InsertWebhookDeliveryLog): Promise<WebhookDeliveryLog> {
    const [record] = await db.insert(webhookDeliveryLog).values(log).returning();
    return record;
  }

  async getWebhookDeliveryLogs(webhookId: string, limit: number = 100): Promise<WebhookDeliveryLog[]> {
    return await db
      .select()
      .from(webhookDeliveryLog)
      .where(eq(webhookDeliveryLog.webhookId, webhookId))
      .orderBy(desc(webhookDeliveryLog.deliveredAt))
      .limit(limit);
  }

  async getOrganizationWebhookDeliveryLogs(organizationId: string, limit: number = 100): Promise<WebhookDeliveryLog[]> {
    return await db
      .select()
      .from(webhookDeliveryLog)
      .where(eq(webhookDeliveryLog.organizationId, organizationId))
      .orderBy(desc(webhookDeliveryLog.deliveredAt))
      .limit(limit);
  }

  // Webhook Retry Queue operations
  async createWebhookRetryQueueItem(item: InsertWebhookRetryQueue): Promise<WebhookRetryQueue> {
    const [record] = await db.insert(webhookRetryQueue).values(item).returning();
    return record;
  }

  async getPendingRetries(limit: number = 100): Promise<WebhookRetryQueue[]> {
    return await db
      .select()
      .from(webhookRetryQueue)
      .where(
        and(
          eq(webhookRetryQueue.status, 'pending'),
          lte(webhookRetryQueue.nextRetryAt, new Date()),
          sql`${webhookRetryQueue.attemptNumber} <= ${webhookRetryQueue.maxRetries}`
        )
      )
      .orderBy(asc(webhookRetryQueue.nextRetryAt))
      .limit(limit);
  }

  async updateRetryQueueItem(id: string, data: Partial<InsertWebhookRetryQueue>): Promise<WebhookRetryQueue> {
    const [record] = await db
      .update(webhookRetryQueue)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(webhookRetryQueue.id, id))
      .returning();
    return record;
  }

  async deleteRetryQueueItem(id: string): Promise<void> {
    await db.delete(webhookRetryQueue).where(eq(webhookRetryQueue.id, id));
  }
}

export const storage = new DatabaseStorage();

