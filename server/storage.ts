import {
  users,
  flowRules,
  tasks,
  formTemplates,
  formResponses,
  tatConfig,
  type User,
  type UpsertUser,
  type FlowRule,
  type InsertFlowRule,
  type Task,
  type InsertTask,
  type FormTemplate,
  type InsertFormTemplate,
  type FormResponse,
  type InsertFormResponse,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Flow Rules operations
  getFlowRules(system?: string): Promise<FlowRule[]>;
  createFlowRule(flowRule: InsertFlowRule): Promise<FlowRule>;
  updateFlowRule(id: string, flowRule: Partial<InsertFlowRule>): Promise<FlowRule>;
  deleteFlowRule(id: string): Promise<void>;

  // Task operations
  getTasks(userId?: string, status?: string): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  getTasksByFlowId(flowId: string): Promise<Task[]>;

  // Form Template operations
  getFormTemplates(createdBy?: string): Promise<FormTemplate[]>;
  getFormTemplateByFormId(formId: string): Promise<FormTemplate | undefined>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  updateFormTemplate(id: string, template: Partial<InsertFormTemplate>): Promise<FormTemplate>;
  deleteFormTemplate(id: string): Promise<void>;

  // Form Response operations
  getFormResponses(flowId?: string, taskId?: string): Promise<FormResponse[]>;
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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Flow Rules operations
  async getFlowRules(system?: string): Promise<FlowRule[]> {
    if (system) {
      return await db.select().from(flowRules).where(eq(flowRules.system, system));
    }
    return await db.select().from(flowRules).orderBy(asc(flowRules.system));
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
  async getTasks(userId?: string, status?: string): Promise<Task[]> {
    let query = db.select().from(tasks);
    
    if (userId) {
      query = query.where(eq(tasks.doerEmail, userId));
    }
    
    if (status) {
      const existingWhere = userId ? eq(tasks.doerEmail, userId) : undefined;
      const statusWhere = eq(tasks.status, status);
      query = query.where(existingWhere ? and(existingWhere, statusWhere) : statusWhere);
    }
    
    return await query.orderBy(desc(tasks.createdAt));
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

  // Form Template operations
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
  async getFormResponses(flowId?: string, taskId?: string): Promise<FormResponse[]> {
    let query = db.select().from(formResponses);
    
    if (flowId && taskId) {
      query = query.where(and(eq(formResponses.flowId, flowId), eq(formResponses.taskId, taskId)));
    } else if (flowId) {
      query = query.where(eq(formResponses.flowId, flowId));
    } else if (taskId) {
      query = query.where(eq(formResponses.taskId, taskId));
    }
    
    return await query.orderBy(desc(formResponses.timestamp));
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
}

export const storage = new DatabaseStorage();
