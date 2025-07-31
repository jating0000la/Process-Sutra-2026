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
  type User,
  type UpsertUser,
  organizations,
  insertOrganizationSchema,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, count, sql } from "drizzle-orm";

export interface IStorage {
  // Organization operations
  getOrganizationByDomain(domain: string): Promise<typeof organizations.$inferSelect | undefined>;
  createOrganization(organization: typeof organizations.$inferInsert): Promise<typeof organizations.$inferSelect>;
  getOrganizationUserCount(organizationId: string): Promise<number>;

  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Flow Rules operations (organization-specific)
  getFlowRules(system?: string): Promise<FlowRule[]>;
  getFlowRulesByOrganization(organizationId: string, system?: string): Promise<FlowRule[]>;
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
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: string, template: Partial<InsertFormTemplate>): Promise<FormTemplate>;
  deleteFormTemplate(id: string): Promise<void>;

  // Form Response operations (organization-specific)
  getFormResponses(flowId?: string, taskId?: string): Promise<FormResponse[]>;
  getFormResponsesByOrganization(organizationId: string, flowId?: string, taskId?: string): Promise<FormResponse[]>;
  createFormResponse(response: InsertFormResponse): Promise<FormResponse>;
  getFormResponsesByFlowId(flowId: string): Promise<FormResponse[]>;

  // TAT Configuration operations
  getTATConfig(): Promise<any>;
  upsertTATConfig(config: any): Promise<any>;

  // Analytics operations
  getTaskMetrics(): Promise<{
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    onTimeRate: number;
  }>;
  getFlowPerformance(): Promise<{
    system: string;
    avgCompletionTime: number;
    onTimeRate: number;
  }[]>;

  // User Management operations
  getAllUsers(): Promise<User[]>;
  updateUserDetails(id: string, details: Partial<User>): Promise<User>;
  changeUserStatus(id: string, status: string): Promise<User>;
  
  // Login Log operations
  createLoginLog(loginLog: InsertUserLoginLog): Promise<UserLoginLog>;
  getLoginLogs(userId?: string): Promise<UserLoginLog[]>;
  updateLoginLog(id: string, data: Partial<UserLoginLog>): Promise<UserLoginLog>;
  
  // Device operations
  createOrUpdateDevice(device: InsertUserDevice): Promise<UserDevice>;
  getUserDevices(userId: string): Promise<UserDevice[]>;
  updateDeviceTrust(deviceId: string, isTrusted: boolean): Promise<UserDevice>;
  
  // Password history operations
  createPasswordChangeHistory(history: InsertPasswordChangeHistory): Promise<PasswordChangeHistory>;
  getPasswordHistory(userId: string): Promise<PasswordChangeHistory[]>;
}

export class DatabaseStorage implements IStorage {
  // Organization operations
  async getOrganizationByDomain(domain: string): Promise<typeof organizations.$inferSelect | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.domain, domain));
    return organization;
  }

  async createOrganization(organizationData: typeof organizations.$inferInsert): Promise<typeof organizations.$inferSelect> {
    const [organization] = await db.insert(organizations).values(organizationData).returning();
    return organization;
  }

  async getOrganizationUserCount(organizationId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.organizationId, organizationId));
    return result[0]?.count || 0;
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // First try to find existing user by email
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
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
          .where(eq(users.email, userData.email))
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
        .where(eq(users.email, userData.email))
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
    
    return await db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));
  }

  async getUserTasksInOrganization(userEmail: string, organizationId: string, status?: string): Promise<Task[]> {
    const conditions = [
      eq(tasks.organizationId, organizationId),
      eq(tasks.doerEmail, userEmail)
    ];
    
    if (status) {
      conditions.push(eq(tasks.status, status));
    }
    
    return await db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));
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
    const [template] = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.formId, formId));
    return template;
  }

  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    const [newTemplate] = await db.insert(formTemplates).values(template).returning();
    return newTemplate;
  }

  async updateFormTemplate(id: string, template: Partial<InsertFormTemplate>): Promise<FormTemplate> {
    const [updatedTemplate] = await db
      .update(formTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(formTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteFormTemplate(id: string): Promise<void> {
    await db.delete(formTemplates).where(eq(formTemplates.id, id));
  }

  // Form Response operations
  async getFormResponsesByOrganization(organizationId: string, flowId?: string, taskId?: string): Promise<FormResponse[]> {
    const conditions = [eq(formResponses.organizationId, organizationId)];
    
    if (flowId) {
      conditions.push(eq(formResponses.flowId, flowId));
    }
    if (taskId) {
      conditions.push(eq(formResponses.taskId, taskId));
    }
    
    return await db.select().from(formResponses).where(and(...conditions)).orderBy(desc(formResponses.timestamp));
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
    const [newResponse] = await db.insert(formResponses).values(response).returning();
    return newResponse;
  }

  async getFormResponsesByFlowId(flowId: string): Promise<FormResponse[]> {
    return await db
      .select()
      .from(formResponses)
      .where(eq(formResponses.flowId, flowId))
      .orderBy(asc(formResponses.timestamp));
  }

  // Analytics operations
  async getTaskMetrics(): Promise<{
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    onTimeRate: number;
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

    const totalTasks = totalResult[0].count;
    const completedTasks = completedResult[0].count;
    const overdueTasks = overdueResult[0].count;
    const onTimeTasks = onTimeResult[0].count;
    const onTimeRate = completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      onTimeRate: Math.round(onTimeRate),
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

  async getTATConfig(): Promise<any> {
    const [config] = await db.select().from(tatConfig).limit(1);
    return config;
  }

  // User-specific analytics methods
  async getUserTaskMetrics(userEmail: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    onTimeRate: number;
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

    const totalTasks = totalResult[0].count;
    const completedTasks = completedResult[0].count;
    const overdueTasks = overdueResult[0].count;
    const onTimeTasks = onTimeResult[0].count;
    const onTimeRate = completedTasks > 0 ? (onTimeTasks / completedTasks) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      onTimeRate: Math.round(onTimeRate),
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
    
    if (filters.startDate) {
      whereConditions = sql`${whereConditions} AND planned_time >= ${filters.startDate}`;
    }
    if (filters.endDate) {
      whereConditions = sql`${whereConditions} AND planned_time <= ${filters.endDate}`;
    }
    if (filters.doerEmail) {
      whereConditions = sql`${whereConditions} AND doer_email ILIKE ${`%${filters.doerEmail}%`}`;
    }
    if (filters.doerName) {
      whereConditions = sql`${whereConditions} AND doer_email ILIKE ${`%${filters.doerName}%`}`;
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

  async upsertTATConfig(configData: any): Promise<any> {
    const existing = await this.getTATConfig();
    
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
        .values(configData)
        .returning();
      return created;
    }
  }

  // User Management operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.firstName));
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        status: userData.status || "active",
        role: userData.role || "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUserDetails(id: string, details: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...details, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
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
}

export const storage = new DatabaseStorage();
