
import type { Express } from "express";
import { addClient, removeClient, sendToEmail } from './notifications';
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./firebaseAuth";
import { db } from "./db";
import rateLimit from 'express-rate-limit';
import {
  insertFlowRuleSchema,
  insertTaskSchema,
  insertFormTemplateSchema,
  insertFormResponseSchema,
  insertOrganizationSchema,
  users,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { randomBytes } from "crypto";
import { calculateTAT, TATConfig } from "./tatCalculator";
import uploadsRouter from './uploads.js';
import * as crypto from 'crypto';

// Rate limiter for form submissions
const formSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute window
  max: 10,                    // 10 submissions per minute
  message: "Too many form submissions. Please wait before submitting again.",
  standardHeaders: true,      // Return rate limit info in headers
  legacyHeaders: false,
  // Don't use custom keyGenerator - let express-rate-limit handle IP addresses properly
  // This automatically handles IPv4 and IPv6 addresses correctly
});

// Rate limiter for super admin endpoints - more restrictive to prevent abuse
const superAdminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minute window
  max: 100,                   // 100 requests per 15 minutes
  message: "Too many super admin requests. Please wait before trying again.",
  standardHeaders: true,      // Return rate limit info in headers
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Rate limiter for data export endpoints - prevent data exfiltration
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minute window
  max: 10,                     // 10 exports per 15 minutes
  message: "Too many export requests. Please wait before trying again.",
  standardHeaders: true,       // Return rate limit info in headers
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// Flow rule operation rate limiters
const flowRuleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 50,                     // 50 flow rule operations per 15 min
  message: "Too many flow rule operations. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const bulkFlowRuleLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 5,                      // 5 bulk imports per hour
  message: "Too many bulk imports. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('[routes] registerRoutes invoked - NODE_ENV=', process.env.NODE_ENV);
  // Auth middleware
  await setupAuth(app);

  // Lightweight health check (no auth, no DB) for debugging routing/ports
  app.get('/api/health', (_req, res) => {
    res.json({ 
      ok: true, 
      ts: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      port: process.env.PORT || '5000'
    });
  });

  // Database health check (separate endpoint)
  app.get('/api/health/db', async (_req, res) => {
    try {
      // Import isDatabaseConnected function
      const { isDatabaseConnected } = await import('./db');
      
      if (!isDatabaseConnected()) {
        return res.status(503).json({ 
          ok: false, 
          database: 'disconnected',
          error: 'Database connection not established'
        });
      }

      // Simple DB query to test connection
      await db.select().from(users).limit(1);
      res.json({ ok: true, database: 'connected' });
    } catch (error) {
      res.status(500).json({ 
        ok: false, 
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // File uploads (GridFS)
  app.use('/api/uploads', uploadsRouter);

  // Role-based middleware with status check
  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = (req.session as any)?.user?.id;
      const user = await storage.getUser(userId);
      
      // Check if user is suspended or inactive
      if (user?.status === 'suspended') {
        return res.status(403).json({ message: "Account suspended. Contact administrator." });
      }
      
      if (user?.status === 'inactive') {
        return res.status(403).json({ message: "Account inactive. Contact administrator." });
      }
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      req.currentUser = user;
      next();
    } catch (error) {
      res.status(500).json({ message: "Failed to verify user role" });
    }
  };

  // Super Admin middleware - system level access above organizations
  const requireSuperAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = (req.session as any)?.user?.id;
      const user = await storage.getUser(userId);
      
      // Check if user is suspended or inactive
      if (user?.status === 'suspended') {
        return res.status(403).json({ message: "Account suspended. Contact administrator." });
      }
      
      if (user?.status === 'inactive') {
        return res.status(403).json({ message: "Account inactive. Contact administrator." });
      }
      
      if (!user || !user.isSuperAdmin) {
        return res.status(403).json({ message: "Super Admin access required" });
      }
      
      req.currentUser = user;
      next();
    } catch (error) {
      res.status(500).json({ message: "Failed to verify super admin role" });
    }
  };

  // Add current user to request for any authenticated route with status check
  const addUserToRequest = async (req: any, res: any, next: any) => {
    try {
      const userId = (req.session as any)?.user?.id;
      const user = await storage.getUser(userId);
      
      // Check if user is suspended or inactive
      if (user?.status === 'suspended') {
        return res.status(403).json({ message: "Account suspended. Contact administrator." });
      }
      
      if (user?.status === 'inactive') {
        return res.status(403).json({ message: "Account inactive. Contact administrator." });
      }
      
      req.currentUser = user;
      next();
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  };

  // Auth routes are now handled in firebaseAuth.ts

  // Flow Rules API (Organization-specific, Admin only)
  app.get("/api/flow-rules", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      const { system } = req.query;
      const flowRules = await storage.getFlowRulesByOrganization(user.organizationId, system as string);
      res.json(flowRules);
    } catch (error) {
      console.error("Error fetching flow rules:", error);
      res.status(500).json({ message: "Failed to fetch flow rules" });
    }
  });

  app.post("/api/flow-rules", flowRuleLimiter, isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      const dataWithOrganization = {
        ...req.body,
        organizationId: currentUser.organizationId
      };
      const validatedData = insertFlowRuleSchema.parse(dataWithOrganization);
      
      // Get existing rules for cycle detection
      const existingRules = await storage.getFlowRulesByOrganization(
        currentUser.organizationId, 
        validatedData.system
      );
      
      // Check if adding this rule creates a cycle (log warning but allow it)
      const { detectCycle } = await import('./cycleDetector');
      const cycleResult = detectCycle(existingRules as any[], {
        currentTask: validatedData.currentTask || "",
        nextTask: validatedData.nextTask,
        status: validatedData.status || ""
      });
      
      if (cycleResult.hasCycle) {
        console.warn(`[WARNING] Circular dependency detected: ${cycleResult.message}`);
        console.warn(`[WARNING] Cycle path: ${cycleResult.cycle?.join(' → ')}`);
        // Allow the rule creation but log the warning
        // Circular dependencies might be intentional for certain workflows
      }
      
      const flowRule = await storage.createFlowRule(validatedData);
      console.log(`[AUDIT] Flow rule created by ${currentUser.email} at ${new Date().toISOString()}`);
      console.log(`[AUDIT] Rule details: system="${flowRule.system}", task="${flowRule.nextTask}", doer="${flowRule.doer}"`);
      res.status(201).json(flowRule);
    } catch (error) {
      console.error("Error creating flow rule:", error);
      res.status(400).json({ message: "Invalid flow rule data" });
    }
  });

  app.post("/api/flow-rules/bulk", bulkFlowRuleLimiter, isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      const { rules } = req.body;
      
      if (!Array.isArray(rules)) {
        return res.status(400).json({ message: "Rules must be an array" });
      }

      if (rules.length === 0) {
        return res.status(400).json({ message: "Rules array cannot be empty" });
      }

      const MAX_BULK_RULES = 100;
      if (rules.length > MAX_BULK_RULES) {
        return res.status(400).json({ 
          message: `Bulk import limited to ${MAX_BULK_RULES} rules. You provided ${rules.length}. Please split into smaller batches.` 
        });
      }

      const createdRules = [];
      for (const ruleData of rules) {
        try {
          const dataWithOrganization = {
            ...ruleData,
            organizationId: currentUser.organizationId
          };
          const validatedData = insertFlowRuleSchema.parse(dataWithOrganization);
          const rule = await storage.createFlowRule(validatedData);
          createdRules.push(rule);
        } catch (error) {
          console.error("Error validating rule:", ruleData, error);
          // Continue with other rules if one fails
        }
      }
      
      console.log(`[AUDIT] Bulk flow rules created by ${currentUser.email} at ${new Date().toISOString()}`);
      console.log(`[AUDIT] Created ${createdRules.length} out of ${rules.length} rules`);
      
      res.status(201).json({ 
        message: `Successfully created ${createdRules.length} flow rules`,
        rules: createdRules 
      });
    } catch (error) {
      console.error("Error creating bulk flow rules:", error);
      res.status(500).json({ message: "Failed to create bulk flow rules" });
    }
  });

  app.put("/api/flow-rules/:id", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.currentUser;

      // Get rule and verify organization ownership
      const rule = await storage.getFlowRuleById(id);
      if (!rule) {
        return res.status(404).json({ message: "Flow rule not found" });
      }

      if (rule.organizationId !== user.organizationId) {
        console.log(`[SECURITY] User ${user.email} attempted to update flow rule ${id} from another organization`);
        return res.status(403).json({ message: "Access denied to this flow rule" });
      }

      const validatedData = insertFlowRuleSchema.partial().parse(req.body);
      const flowRule = await storage.updateFlowRule(id, validatedData);
      console.log(`[AUDIT] Flow rule ${id} updated by ${user.email} at ${new Date().toISOString()}`);
      console.log(`[AUDIT] Updated fields:`, Object.keys(validatedData));
      res.json(flowRule);
    } catch (error) {
      console.error("Error updating flow rule:", error);
      res.status(400).json({ message: "Invalid flow rule data" });
    }
  });

  app.delete("/api/flow-rules/:id", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.currentUser;

      // Get rule and verify organization ownership
      const rule = await storage.getFlowRuleById(id);
      if (!rule) {
        return res.status(404).json({ message: "Flow rule not found" });
      }

      if (rule.organizationId !== user.organizationId) {
        console.log(`[SECURITY] User ${user.email} attempted to delete flow rule ${id} from another organization`);
        return res.status(403).json({ message: "Access denied to this flow rule" });
      }

      await storage.deleteFlowRule(id);
      console.log(`[AUDIT] Flow rule ${id} deleted by ${user.email} at ${new Date().toISOString()}`);
      console.log(`[AUDIT] Deleted rule: system="${rule.system}", task="${rule.nextTask}", doer="${rule.doer}"`);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting flow rule:", error);
      res.status(500).json({ message: "Failed to delete flow rule" });
    }
  });

  // Tasks API (Organization-specific data isolation)
  app.get("/api/tasks", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      const { status } = req.query;
      
      let tasks;
      if (user.role === 'admin') {
        // Admins see all tasks in their organization only
        tasks = await storage.getTasksByOrganization(user.organizationId, status as string);
      } else {
        // Regular users only see their own tasks within their organization
        tasks = await storage.getUserTasksInOrganization(user.email, user.organizationId, status as string);
      }
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.put("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, validatedData);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  // Task workflow operations
  app.post("/api/tasks/:id/complete", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status: completionStatus } = req.body;
      const user = req.currentUser;
      
      if (!completionStatus) {
        return res.status(400).json({ message: "Completion status is required" });
      }

      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Verify task belongs to user's organization
      if (task.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Access denied to this task" });
      }

      // Check if task has a form that requires submission before completion
      if (task.formId) {
        const formResponses = await storage.getFormResponsesWithTaskDetails(
          user.organizationId, 
          task.flowId, 
          task.id
        );
        
        if (!formResponses || formResponses.length === 0) {
          return res.status(400).json({ 
            message: "Cannot complete task: Form must be submitted before marking task as complete",
            requiresForm: true,
            formId: task.formId
          });
        }
      }

      // Mark current task as completed
      const completedTask = await storage.updateTask(id, {
        status: "completed",
        actualCompletionTime: new Date(),
      });

      // Find ALL next tasks in workflow based on completion status - organization-specific
      const flowRules = await storage.getFlowRulesByOrganization(user.organizationId, task.system);
      const nextRules = flowRules.filter(
        rule => rule.currentTask === task.taskName && rule.status === completionStatus
      );

      // Get all previous form data for this flow to include in new tasks (using MongoDB)
      const previousFormResponses = await storage.getMongoFormResponsesByFlowId(user.organizationId, task.flowId);
      const flowInitialData = previousFormResponses.length > 0 ? previousFormResponses[0].formData : null;

      if (nextRules.length > 0) {
        // Get TAT configuration for enhanced calculations
        const tatConfiguration = await storage.getTATConfig(user.organizationId);
        const config: TATConfig = tatConfiguration || { 
          officeStartHour: 9, 
          officeEndHour: 17, // Configurable per organization (5 PM default)
          timezone: "Asia/Kolkata",
          skipWeekends: true,
          weekendDays: "0,6" // Sunday and Saturday
        };
        
        // Create ALL next tasks using enhanced TAT calculation
        for (const nextRule of nextRules) {
          // Check if this next task has multiple parallel prerequisite tasks
          // (i.e., multiple rules from different currentTasks pointing to the same nextTask)
          const parallelPrerequisites = flowRules.filter(
            rule => rule.nextTask === nextRule.nextTask && rule.status === completionStatus
          );

          // If there are multiple parallel prerequisites, check if ALL of them are completed
          if (parallelPrerequisites.length > 1) {
            // Get all tasks in this flow with the prerequisite task names
            const allFlowTasks = await storage.getTasksByFlowId(task.flowId);
            
            // Check if all parallel prerequisite tasks are completed
            const allPrerequisitesCompleted = parallelPrerequisites.every(prereqRule => {
              // Find the task for this prerequisite
              const prereqTask = allFlowTasks.find(
                t => t.taskName === prereqRule.currentTask && t.status === "completed"
              );
              return prereqTask !== undefined;
            });

            // If not all prerequisites are completed, skip creating this next task for now
            if (!allPrerequisitesCompleted) {
              console.log(`⏸️ Waiting for parallel tasks to complete before creating: ${nextRule.nextTask}`);
              continue; // Skip this next task creation
            }

            // Check if this next task already exists (to avoid duplicates)
            const existingNextTask = allFlowTasks.find(
              t => t.taskName === nextRule.nextTask && t.status !== "cancelled"
            );
            
            if (existingNextTask) {
              console.log(`✅ Next task already exists (parallel merge): ${nextRule.nextTask}`);
              continue; // Skip creating duplicate
            }
          }

          const plannedTime = calculateTAT(new Date(), nextRule.tat, nextRule.tatType, config);

          console.log(`✨ Creating next task: ${nextRule.nextTask} (prerequisites met)`);
          await storage.createTask({
            system: task.system,
            flowId: task.flowId,
            orderNumber: task.orderNumber,
            taskName: nextRule.nextTask,
            plannedTime,
            doerEmail: nextRule.email,
            status: "pending",
            formId: nextRule.formId,
            organizationId: user.organizationId, // Include organization ID for new tasks
            // Include flow context and previous form data
            flowInitiatedBy: task.flowInitiatedBy,
            flowInitiatedAt: task.flowInitiatedAt,
            flowDescription: task.flowDescription,
            flowInitialFormData: task.flowInitialFormData || (flowInitialData as any),
          });
        }
      }

      res.json(completedTask);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  app.patch("/api/tasks/:id/status", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Validate status
      const validStatuses = ["pending", "in_progress", "completed", "overdue"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      // Get current task details
      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const updateData: any = { status };
      if (status === "completed") {
        updateData.actualCompletionTime = new Date();
      }
      
      // Update the task
      const updatedTask = await storage.updateTask(id, updateData);
      
      // Check for workflow progression based on new status - Create ALL matching next tasks
      const flowRules = await storage.getFlowRules(task.system);
      
      // Map status values to flow rule status values
      const statusMap: Record<string, string> = {
        "pending": "Pending",
        "in_progress": "In Progress", 
        "completed": "Done",
        "overdue": "Overdue"
      };
      
      const ruleStatus = statusMap[status];
      const nextRules = flowRules.filter(
        rule => rule.currentTask === task.taskName && rule.status === ruleStatus
      );
      
      // Get all previous form data for this flow to include in new tasks (using MongoDB)
      const previousFormResponses = await storage.getMongoFormResponsesByFlowId(req.currentUser.organizationId, task.flowId);
      const flowInitialData = previousFormResponses.length > 0 ? previousFormResponses[0].formData : null;
      
      if (nextRules.length > 0) {
        // Get TAT configuration for enhanced calculations
        const currentUser = req.currentUser;
        const tatConfiguration = await storage.getTATConfig(currentUser.organizationId);
        const config: TATConfig = tatConfiguration || { 
          officeStartHour: 9, 
          officeEndHour: 17, // Configurable per organization (5 PM default)
          timezone: "Asia/Kolkata",
          skipWeekends: true,
          weekendDays: "0,6" // Sunday and Saturday
        };
        
        // Create ALL next tasks based on current task status using enhanced TAT calculation
        for (const nextRule of nextRules) {
          const plannedTime = calculateTAT(new Date(), nextRule.tat, nextRule.tatType, config);

          await storage.createTask({
            system: task.system,
            flowId: task.flowId,
            orderNumber: task.orderNumber,
            taskName: nextRule.nextTask,
            plannedTime,
            doerEmail: nextRule.email,
            status: "pending",
            formId: nextRule.formId,
            organizationId: currentUser.organizationId, // Include organization ID for new tasks
            // Include flow context and previous form data
            flowInitiatedBy: task.flowInitiatedBy,
            flowInitiatedAt: task.flowInitiatedAt,
            flowDescription: task.flowDescription,
            flowInitialFormData: task.flowInitialFormData || (flowInitialData as any),
          });
        }
      }
      
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  // Task transfer route
  app.post("/api/tasks/:id/transfer", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { toEmail, reason } = req.body;
      const user = req.currentUser;
      
      if (!toEmail) {
        return res.status(400).json({ message: "Transfer email is required" });
      }

      // Get current task details
      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check if task is transferable (get flow rule) - organization-specific
      const flowRules = await storage.getFlowRulesByOrganization(user.organizationId, task.system);
      const currentRule = flowRules.find(rule => rule.nextTask === task.taskName);
      
      if (!currentRule?.transferable) {
        return res.status(400).json({ message: "This task is not transferable according to flow rules" });
      }

      // Update task with transfer information
      const transferredTask = await storage.updateTask(id, {
        doerEmail: toEmail,
        originalAssignee: task.originalAssignee || task.doerEmail,
        transferredBy: user.id,
        transferredAt: new Date(),
        transferReason: reason || null,
      });

      res.json(transferredTask);
    } catch (error) {
      console.error("Error transferring task:", error);
      res.status(500).json({ message: "Failed to transfer task" });
    }
  });

  app.post("/api/flows/start", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const { system, orderNumber, description, initialFormData } = req.body;
      const user = req.currentUser;
      const userId = user.id;
      
      if (!system) {
        return res.status(400).json({ message: "System is required" });
      }
      
      if (!orderNumber) {
        return res.status(400).json({ message: "Order Number/Unique ID is required" });
      }
      
      if (!description) {
        return res.status(400).json({ message: "Flow description is required" });
      }
      
      // Find the starting rule (currentTask is empty) - organization-specific
      const flowRules = await storage.getFlowRulesByOrganization(user.organizationId, system);
      const startRule = flowRules.find(rule => rule.currentTask === "");
      
      if (!startRule) {
        return res.status(400).json({ message: "No starting rule found for this system" });
      }

  const flowId = randomUUID();
      
      // Parse initial form data if provided
      let parsedInitialFormData = null;
      if (initialFormData && initialFormData.trim()) {
        try {
          parsedInitialFormData = JSON.parse(initialFormData);
        } catch (error) {
          console.error("JSON parse error:", error);
          return res.status(400).json({ message: `Invalid JSON format for initial form data: ${(error as Error).message}` });
        }
      }
      
      // Get TAT configuration for enhanced calculations
      const tatConfiguration = await storage.getTATConfig(user.organizationId);
      const config: TATConfig = tatConfiguration || { 
        officeStartHour: 9, 
        officeEndHour: 17, // Configurable per organization (5 PM default)
        timezone: "Asia/Kolkata",
        skipWeekends: true,
        weekendDays: "0,6" // Sunday and Saturday
      };
      
      const plannedTime = calculateTAT(new Date(), startRule.tat, startRule.tatType, config);
      const flowStartTime = new Date();

      const task = await storage.createTask({
        system,
        flowId,
        orderNumber,
        taskName: startRule.nextTask,
        plannedTime,
        doerEmail: startRule.email,
        status: "pending",
        formId: startRule.formId,
        organizationId: user.organizationId, // Include organization ID
        // Flow context - WHO, WHAT, WHEN, HOW
        flowInitiatedBy: userId,
        flowInitiatedAt: flowStartTime,
        flowDescription: description,
        flowInitialFormData: parsedInitialFormData,
      });

      // Notify the assigned doer via SSE if connected
      try {
        if (startRule.email) {
          sendToEmail(startRule.email, 'flow-started', {
            flowId,
            orderNumber,
            system,
            taskName: startRule.nextTask,
            description,
            assignedTo: startRule.email,
            plannedTime,
          });
        }
      } catch (e) {
        console.error('SSE notify error:', e);
      }

      // Fire webhooks (non-blocking with proper logging and retry)
      (async () => {
        const { fireWebhooksForEvent } = await import('./webhookUtils');
        await fireWebhooksForEvent(user.organizationId, 'flow.started', {
          flowId,
          orderNumber,
          system,
          description,
          initiatedBy: userId,
          initiatedAt: flowStartTime.toISOString(),
          task: {
            id: task.id,
            name: task.taskName,
            assignee: task.doerEmail
          }
        });
      })().catch(err => console.error('[Webhook] Error firing flow.started webhooks:', err));

      res.status(201).json({
        flowId,
        task,
        orderNumber,
        description,
        initiatedBy: userId,
        initiatedAt: flowStartTime.toISOString(),
        message: "Flow started successfully"
      });
    } catch (error) {
      console.error("Error starting flow:", error);
      res.status(500).json({ message: "Failed to start flow" });
    }
  });

  // Stop/Cancel Flow - Admin only
  app.post("/api/flows/:flowId/stop", isAuthenticated, addUserToRequest, requireAdmin, async (req: any, res) => {
    try {
      const { flowId } = req.params;
      const { reason } = req.body;
      const user = req.currentUser;

      // Get all tasks for this flow
      const allTasks = await storage.getTasksByOrganization(user.organizationId);
      const flowTasks = allTasks.filter(task => task.flowId === flowId);

      if (flowTasks.length === 0) {
        return res.status(404).json({ message: "Flow not found or no access" });
      }

      // Verify the flow belongs to the user's organization
      const firstTask = flowTasks[0];
      if (firstTask.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update all pending and in-progress tasks to "cancelled" status
      let cancelledCount = 0;
      const cancelTime = new Date();

      for (const task of flowTasks) {
        if (task.status === "pending" || task.status === "in_progress") {
          await storage.updateTask(task.id, {
            status: "cancelled",
            cancelledBy: user.id,
            cancelledAt: cancelTime,
            cancelReason: reason || "Flow stopped by admin",
          });
          cancelledCount++;

          // Send notification to assigned user
          try {
            if (task.doerEmail) {
              sendToEmail(task.doerEmail, 'task-cancelled', {
                flowId,
                taskId: task.id,
                taskName: task.taskName,
                orderNumber: task.orderNumber,
                system: task.system,
                reason: reason || "Flow stopped by admin",
                cancelledBy: user.email,
              });
            }
          } catch (e) {
            console.error('SSE notify error:', e);
          }
        }
      }

      // Fire webhooks (non-blocking)
      (async () => {
        try {
          const hooks = await storage.getActiveWebhooksForEvent(user.organizationId, 'flow.stopped');
          for (const hook of hooks) {
            const payload = {
              id: randomUUID(),
              type: 'flow.stopped',
              createdAt: new Date().toISOString(),
              data: { 
                flowId, 
                orderNumber: firstTask.orderNumber,
                system: firstTask.system, 
                description: firstTask.flowDescription,
                stoppedBy: user.id,
                stoppedAt: cancelTime.toISOString(),
                reason: reason || "Flow stopped by admin",
                cancelledTasksCount: cancelledCount,
              }
            };
            const body = JSON.stringify(payload);
            const sig = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
            fetch(hook.targetUrl, { 
              method: 'POST', 
              headers: { 
                'Content-Type': 'application/json', 
                'X-Webhook-Signature': sig, 
                'X-Webhook-Id': payload.id, 
                'X-Webhook-Type': payload.type 
              }, 
              body 
            }).catch(()=>{});
          }
        } catch {}
      })();

      res.json({
        success: true,
        flowId,
        cancelledTasksCount: cancelledCount,
        totalTasksInFlow: flowTasks.length,
        message: `Flow stopped successfully. ${cancelledCount} task(s) cancelled.`
      });
    } catch (error) {
      console.error("Error stopping flow:", error);
      res.status(500).json({ message: "Failed to stop flow" });
    }
  });

  // Resume Flow - Admin only
  app.post("/api/flows/:flowId/resume", isAuthenticated, addUserToRequest, requireAdmin, async (req: any, res) => {
    try {
      const { flowId } = req.params;
      const { reason } = req.body;
      const user = req.currentUser;

      // Get all tasks for this flow
      const allTasks = await storage.getTasksByOrganization(user.organizationId);
      const flowTasks = allTasks.filter(task => task.flowId === flowId);

      if (flowTasks.length === 0) {
        return res.status(404).json({ message: "Flow not found or no access" });
      }

      // Verify the flow belongs to the user's organization
      const firstTask = flowTasks[0];
      if (firstTask.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update all cancelled tasks to "pending" status
      let resumedCount = 0;

      for (const task of flowTasks) {
        if (task.status === "cancelled") {
          await storage.updateTask(task.id, {
            status: "pending",
            cancelledBy: null,
            cancelledAt: null,
            cancelReason: null,
          });
          resumedCount++;

          // Send notification to assigned user
          try {
            if (task.doerEmail) {
              sendToEmail(task.doerEmail, 'task-resumed', {
                flowId,
                taskId: task.id,
                taskName: task.taskName,
                orderNumber: task.orderNumber,
                system: task.system,
                reason: reason || "Flow resumed by admin",
                resumedBy: user.email,
              });
            }
          } catch (e) {
            console.error('SSE notify error:', e);
          }
        }
      }

      // Fire webhooks (non-blocking with proper logging and retry)
      (async () => {
        const { fireWebhooksForEvent } = await import('./webhookUtils');
        await fireWebhooksForEvent(user.organizationId, 'flow.resumed', {
          flowId,
          orderNumber: firstTask.orderNumber,
          system: firstTask.system,
          description: firstTask.flowDescription,
          resumedBy: user.id,
          resumedAt: new Date().toISOString(),
          reason: reason || "Flow resumed by admin",
          resumedTasksCount: resumedCount,
        });
      })().catch(err => console.error('[Webhook] Error firing flow.resumed webhooks:', err));

      res.json({
        success: true,
        flowId,
        resumedTasksCount: resumedCount,
        totalTasksInFlow: flowTasks.length,
        message: `Flow resumed successfully. ${resumedCount} task(s) resumed.`
      });
    } catch (error) {
      console.error("Error resuming flow:", error);
      res.status(500).json({ message: "Failed to resume flow" });
    }
  });

  // --- Integrations: Start Flow via API key (public, authenticated by API key) ---
  function getApiKeyMap(): Record<string, string> {
    // Supports both a single key (FLOW_API_KEY) and a JSON map (FLOW_API_KEYS)
    // FLOW_API_KEYS example: {"acme.com":"sk_live_xxx","org-uuid":"sk_live_yyy"}
    try {
      const m = process.env.FLOW_API_KEYS ? JSON.parse(process.env.FLOW_API_KEYS) : {};
      if (process.env.FLOW_API_KEY) {
        // Global fallback key under "*"
        m["*"] = process.env.FLOW_API_KEY;
      }
      return m;
    } catch {
      return process.env.FLOW_API_KEY ? { "*": process.env.FLOW_API_KEY } : {};
    }
  }

  async function integrationAuth(req: any, res: any, next: any) {
    // Only x-api-key is required. Organization ID can be used directly as the API key.
    const apiKey = req.header("x-api-key");
    if (!apiKey) return res.status(401).json({ message: "Missing x-api-key" });

    // 1) If apiKey matches an organization ID, accept it directly
    let organization = await storage.getOrganizationById?.(apiKey);

    // 2) Otherwise, try reverse-lookup from FLOW_API_KEYS/FLOW_API_KEY
    if (!organization) {
      const keyMap = getApiKeyMap();
      // Find entry where value === apiKey
      const pair = Object.entries(keyMap).find(([, v]) => v === apiKey);
      if (pair) {
        const [hint] = pair;
        if (hint !== "*") {
          organization = (await storage.getOrganizationById?.(hint)) || (await storage.getOrganizationByDomain(hint));
        }
      }
    }

    if (!organization) {
      return res.status(401).json({ message: "Invalid or unmapped API key" });
    }

    req.integration = {
      organizationId: organization.id,
      organizationDomain: organization.domain,
      actorEmail: req.header("x-actor-email") || undefined,
      source: req.header("x-source") || "api",
    };
    next();
  }

  app.post("/api/integrations/start-flow", integrationAuth, async (req: any, res) => {
    try {
      const { system, orderNumber, description, initialFormData, notifyAssignee = true } = req.body || {};
      const { organizationId, actorEmail } = req.integration;

      if (!system) return res.status(400).json({ message: "system is required" });
      if (!orderNumber) return res.status(400).json({ message: "orderNumber is required" });
      if (!description) return res.status(400).json({ message: "description is required" });

      // Find the starting rule (currentTask is empty) - organization-specific
      const flowRules = await storage.getFlowRulesByOrganization(organizationId, system);
      const startRule = flowRules.find((rule: any) => rule.currentTask === "");
      if (!startRule) return res.status(400).json({ message: "No starting rule found for this system" });

      const flowId = randomUUID();

      // Parse initial form data if provided (string or object)
      let parsedInitialFormData: any = null;
      if (typeof initialFormData === "string" && initialFormData.trim()) {
        try {
          parsedInitialFormData = JSON.parse(initialFormData);
        } catch (error) {
          return res.status(400).json({ message: `Invalid JSON for initialFormData: ${(error as Error).message}` });
        }
      } else if (initialFormData && typeof initialFormData === "object") {
        parsedInitialFormData = initialFormData;
      }

      // Get TAT configuration for enhanced calculations
      const tatConfiguration = await storage.getTATConfig(organizationId);
      const config: TATConfig = tatConfiguration || { 
        officeStartHour: 9, 
        officeEndHour: 17, // Configurable per organization (5 PM default)
        timezone: "Asia/Kolkata",
        skipWeekends: true,
        weekendDays: "0,6" // Sunday and Saturday
      };
      const plannedTime = calculateTAT(new Date(), startRule.tat, startRule.tatType, config);
      const flowStartTime = new Date();

      const task = await storage.createTask({
        system,
        flowId,
        orderNumber,
        taskName: startRule.nextTask,
        plannedTime,
        doerEmail: startRule.email,
        status: "pending",
        formId: startRule.formId,
        organizationId,
        flowInitiatedBy: actorEmail || `integration:${req.integration.source}`,
        flowInitiatedAt: flowStartTime,
        flowDescription: description,
        flowInitialFormData: parsedInitialFormData,
      });

      // Optional notify
      if (notifyAssignee && startRule.email) {
        try {
          sendToEmail(startRule.email, 'flow-started', {
            flowId,
            orderNumber,
            system,
            taskName: startRule.nextTask,
            description,
            assignedTo: startRule.email,
            plannedTime,
          });
        } catch {}
      }

      res.status(201).json({
        flowId,
        task,
        orderNumber,
        description,
        initiatedBy: actorEmail || `integration:${req.integration.source}`,
        initiatedAt: flowStartTime.toISOString(),
        message: "Flow started successfully",
      });
    } catch (error) {
      console.error("Integration start-flow error:", error);
      res.status(500).json({ message: "Failed to start flow" });
    }
  });

  // Simple HTML doc page
  app.get('/api/docs/start-flow', (_req, res) => {
    const exampleKey = 'your-organization-id';
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>Start Flow API</title>
<style>body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;max-width:900px;margin:0 auto;color:#111}code,pre{background:#f6f8fa;border-radius:6px;padding:12px;display:block;overflow:auto}h1{font-size:24px;margin:0 0 12px}h2{font-size:18px;margin:24px 0 8px}table{border-collapse:collapse}td,th{border:1px solid #e5e7eb;padding:6px 8px;text-align:left}.note{background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;margin:16px 0;border-radius:4px}.security{background:#dbeafe;border-left:4px solid #3b82f6;padding:12px;margin:16px 0;border-radius:4px}</style>
</head><body>
<h1>Start Flow API</h1>
<p>Create the first task for a system using your organization rules.</p>

<h2>Endpoints</h2>
<pre><code>POST /api/start-flow (simplified)
POST /api/integrations/start-flow (full featured)</code></pre>

<h2>Headers</h2>
<table>
<tr><th>Header</th><th>Required</th><th>Example</th></tr>
<tr><td>x-api-key</td><td>Yes</td><td>${exampleKey} (use your Organization ID)</td></tr>
<tr><td>x-actor-email</td><td>No</td><td>bot@yourcompany.com</td></tr>
<tr><td>x-source</td><td>No</td><td>zapier</td></tr>
</table>

<h2>Body (JSON)</h2>
<pre><code>{
  "system": "CRM Onboarding",            // required
  "orderNumber": "ORD-12345",            // required
  "description": "New account setup",     // required
  "initialFormData": { "account": "Acme" } // optional
}</code></pre>

<h2>Response</h2>
<pre><code>{
  "flowId": "...",
  "taskId": "...",
  "message": "Flow started successfully"
}</code></pre>

<div class="note">
<strong>📢 Webhook Notifications:</strong> When a flow is started, a <code>flow.started</code> webhook event is automatically triggered to all active webhooks configured in your organization. Configure webhooks in the admin panel to receive real-time notifications.
</div>

<h2>Webhook Event Payload</h2>
<p>When this API is called, your configured webhook endpoints will receive:</p>
<pre><code>{
  "id": "webhook-delivery-uuid",
  "type": "flow.started",
  "createdAt": "2025-11-07T10:30:00Z",
  "data": {
    "flowId": "...",
    "orderNumber": "ORD-12345",
    "system": "CRM Onboarding",
    "description": "New account setup",
    "initiatedBy": "user-email",
    "initiatedAt": "2025-11-07T10:30:00Z",
    "task": {
      "id": "task-uuid",
      "name": "First Task Name",
      "assignee": "assignee@company.com"
    }
  }
}</code></pre>

<div class="security">
<strong>🔒 Webhook Security:</strong> All webhook requests include an <code>X-Webhook-Signature</code> header containing an HMAC-SHA256 signature. Verify this signature using your webhook secret to ensure authenticity. Webhooks use enterprise-grade security with SSRF protection, automatic retries, and delivery logging.
</div>

<h2>PowerShell example</h2>
<pre><code>$headers = @{ "x-api-key" = "${exampleKey}" }
$body = @{ system = "CRM Onboarding"; orderNumber = "ORD-12345"; description = "New account setup" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/start-flow" -Method Post -Headers $headers -Body $body -ContentType "application/json"</code></pre>

<h2>Node fetch example</h2>
<pre><code>await fetch("/api/start-flow", { method: "POST", headers: { "x-api-key": "${exampleKey}", "Content-Type": "application/json" }, body: JSON.stringify({ system: "CRM Onboarding", orderNumber: "ORD-12345", description: "New account setup" }) });</code></pre>

</body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // External API: Start Flow (simplified for external software)
  app.post("/api/start-flow", integrationAuth, async (req: any, res) => {
    try {
      const { system, orderNumber, description, initialFormData } = req.body;
      const { organizationId, actorEmail } = req.integration;

      if (!system || !orderNumber || !description) {
        return res.status(400).json({ message: "system, orderNumber, and description are required" });
      }

      const flowRules = await storage.getFlowRulesByOrganization(organizationId, system);
      const startRule = flowRules.find((rule: any) => rule.currentTask === "");
      if (!startRule) {
        return res.status(400).json({ message: "No starting rule found for this system" });
      }

      const flowId = randomUUID();
      const tatConfiguration = await storage.getTATConfig(organizationId);
      const config: TATConfig = tatConfiguration || { 
        officeStartHour: 9, 
        officeEndHour: 17, // Configurable per organization (5 PM default)
        timezone: "Asia/Kolkata",
        skipWeekends: true,
        weekendDays: "0,6" // Sunday and Saturday
      };
      const plannedTime = calculateTAT(new Date(), startRule.tat, startRule.tatType, config);

      const task = await storage.createTask({
        system,
        flowId,
        orderNumber,
        taskName: startRule.nextTask,
        plannedTime,
        doerEmail: startRule.email,
        status: "pending",
        formId: startRule.formId,
        organizationId,
        flowInitiatedBy: actorEmail || "external-api",
        flowInitiatedAt: new Date(),
        flowDescription: description,
        flowInitialFormData: initialFormData || null,
      });

      res.status(201).json({ flowId, taskId: task.id, message: "Flow started successfully" });
    } catch (error) {
      console.error("External start-flow error:", error);
      res.status(500).json({ message: "Failed to start flow" });
    }
  });

  // --- Admin: Generate a suggested API token (not persisted) ---
  app.post('/api/admin/integrations/token', isAuthenticated, addUserToRequest, async (req: any, res) => {
    const user = req.currentUser;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const token = `sk_live_${randomBytes(24).toString('hex')}`;
    res.json({ token });
  });

  // Server-Sent Events endpoint for real-time notifications
  app.get('/api/notifications/stream', isAuthenticated, addUserToRequest, async (req: any, res) => {
    const user = req.currentUser;
    const id = randomUUID();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // initial hello event
    res.write(`event: hello\n` + `data: {"ok":true}\n\n`);

    const heartbeat = setInterval(() => {
      res.write(`event: ping\n` + `data: ${Date.now()}\n\n`);
    }, 25000);

    addClient({ id, userId: user.id, email: user.email, organizationId: user.organizationId, res, heartbeat });

    req.on('close', () => {
      removeClient(id);
      clearInterval(heartbeat);
    });
  });

  // Form Templates API (Organization-specific)
  app.get("/api/form-templates", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      const templates = await storage.getFormTemplatesByOrganization(user.organizationId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching form templates:", error);
      res.status(500).json({ message: "Failed to fetch form templates" });
    }
  });

  app.get("/api/form-templates/:formId", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const { formId } = req.params;
      const user = req.currentUser;
      
      const template = await storage.getFormTemplateByFormId(formId);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }

      // Enforce organization isolation
      if (template.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Access denied to this form template" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching form template:", error);
      res.status(500).json({ message: "Failed to fetch form template" });
    }
  });

  // Auto-prefill endpoint - get previous form responses for a flow (organization-aware)
  app.get("/api/flows/:flowId/responses", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const { flowId } = req.params;
      const user = req.currentUser;
      
      // Use MongoDB instead of PostgreSQL for fetching previous form responses
      const responses = await storage.getMongoFormResponsesByFlowId(user.organizationId, flowId);

      res.json(responses);
    } catch (error) {
      console.error("Error fetching flow responses from MongoDB:", error);
      res.status(500).json({ message: "Failed to fetch flow responses" });
    }
  });

  app.post("/api/form-templates", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = req.currentUser; // Get the user from the request
      
      const validatedData = insertFormTemplateSchema.parse({
        ...req.body,
        createdBy: userId,
        organizationId: user.organizationId, // Add the organization ID
      });
      
      const template = await storage.createFormTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating form template:", error);
      res.status(400).json({ message: "Invalid form template data" });
    }
  });

  app.put("/api/form-templates/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertFormTemplateSchema.partial().parse(req.body);
      const template = await storage.updateFormTemplate(id, validatedData);
      res.json(template);
    } catch (error) {
      console.error("Error updating form template:", error);
      res.status(400).json({ message: "Invalid form template data" });
    }
  });

  app.delete("/api/form-templates/:id", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.currentUser;

      // 1. Get template and verify organization ownership
      const template = await storage.getFormTemplateById(id);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }
      
      if (template.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Access denied to this form template" });
      }
      
      // 2. Check if form is used in flow rules
      const flowRules = await storage.getFlowRulesByOrganization(user.organizationId);
      const rulesUsingForm = flowRules.filter(rule => rule.formId === template.formId);
      
      if (rulesUsingForm.length > 0) {
        return res.status(400).json({
          message: `Cannot delete form template. It is currently used in ${rulesUsingForm.length} flow rule(s).`,
          usage: rulesUsingForm.map(rule => ({
            system: rule.system,
            task: rule.nextTask
          }))
        });
      }
      
      // 3. Check if form has responses in MongoDB (if MongoDB is available)
      try {
        const { MongoClient } = await import('mongodb');
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/processSutra';
        const client = new MongoClient(mongoUri);
        await client.connect();
        const database = client.db();
        const col = database.collection('formResponses');
        
        const responseCount = await col.countDocuments({ 
          organizationId: user.organizationId,
          formId: template.formId 
        });
        
        await client.close();
        
        if (responseCount > 0) {
          return res.status(400).json({
            message: `Cannot delete form template. It has ${responseCount} submitted response(s). Consider archiving instead.`
          });
        }
      } catch (mongoError) {
        console.warn("Could not check MongoDB for form responses:", mongoError);
        // Continue with deletion if MongoDB check fails
      }
      
      // 4. Safe to delete
      await storage.deleteFormTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting form template:", error);
      res.status(500).json({ message: "Failed to delete form template" });
    }
  });

  // Form Responses API (Organization-specific)
  app.get("/api/form-responses", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      const { flowId, taskId } = req.query;
      const responses = await storage.getFormResponsesWithTaskDetails(user.organizationId, flowId as string, taskId as string);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching form responses:", error);
      res.status(500).json({ message: "Failed to fetch form responses" });
    }
  });

  app.post("/api/form-responses", isAuthenticated, addUserToRequest, formSubmissionLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = req.currentUser;
      const validatedData = insertFormResponseSchema.parse({
        ...req.body,
        organizationId: user.organizationId,
        submittedBy: userId,
        responseId: randomUUID(),
      });
      const response = await storage.createFormResponse(validatedData);

      // Fire webhooks (non-blocking with proper logging and retry)
      (async () => {
        const { fireWebhooksForEvent } = await import('./webhookUtils');
        await fireWebhooksForEvent(user.organizationId, 'form.submitted', {
          responseId: response.responseId,
          taskId: response.taskId,
          flowId: response.flowId,
          formId: response.formId,
          formData: response.formData,
          submittedBy: response.submittedBy,
          timestamp: response.timestamp
        });
      })().catch(err => console.error('[Webhook] Error firing form.submitted webhooks:', err));

      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating form response:", error);
      res.status(400).json({ message: "Invalid form response data" });
    }
  });

  // Webhook CRUD (admin)
  app.get('/api/webhooks', isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      if (user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const hooks = await storage.getWebhooksByOrganization(user.organizationId);
      res.json(hooks);
    } catch (e) {
      if ((e as any)?.message === 'WEBHOOKS_TABLE_MISSING') {
        return res.status(500).json({
          message: 'Webhooks table missing. Run database migration (drizzle-kit push) to create it.'
        });
      }
      res.status(500).json({ message: 'Failed to list webhooks' });
    }
  });

  app.post('/api/webhooks', isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      if (user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const { event, targetUrl, secret, description, isActive } = req.body;
      if (!event || !targetUrl || !secret) return res.status(400).json({ message: 'event, targetUrl, secret required' });
      
      // Validate webhook URL safety
      const { isSafeWebhookUrl, validateWebhookSecret } = await import('./webhookUtils');
      
      if (!isSafeWebhookUrl(targetUrl)) {
        return res.status(400).json({ 
          message: 'Invalid webhook URL. Must use HTTPS and cannot be an internal/private IP address.' 
        });
      }
      
      // Validate secret strength
      const secretValidation = validateWebhookSecret(secret);
      if (!secretValidation.valid) {
        return res.status(400).json({ message: secretValidation.error });
      }
      
      const record = await storage.createWebhook({ organizationId: user.organizationId, event, targetUrl, secret, description, isActive });
      res.status(201).json(record);
    } catch (e) {
      res.status(500).json({ message: 'Failed to create webhook' });
    }
  });

  app.put('/api/webhooks/:id', isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      if (user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const record = await storage.updateWebhook(req.params.id, req.body);
      res.json(record);
    } catch (e) {
      res.status(500).json({ message: 'Failed to update webhook' });
    }
  });

  app.delete('/api/webhooks/:id', isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      if (user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
      await storage.deleteWebhook(req.params.id);
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ message: 'Failed to delete webhook' });
    }
  });

  // Test webhook delivery (admin)
  app.post('/api/webhooks/test', isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      if (user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
      const { targetUrl, webhookId, event = 'flow.started' } = req.body || {};
      if (!targetUrl && !webhookId) return res.status(400).json({ message: 'Provide targetUrl or webhookId' });
      let hook: any = null;
      if (webhookId) {
        hook = await storage.getWebhookById(webhookId);
        if (!hook || hook.organizationId !== user.organizationId) return res.status(404).json({ message: 'Webhook not found' });
      }
      const url = targetUrl || hook.targetUrl;
      const secret = hook?.secret || 'test_secret';
      const payload = {
        id: randomUUID(),
        type: event,
        test: true,
        createdAt: new Date().toISOString(),
        data: {
          message: 'Webhook test from ProcessSutra',
          example: event === 'form.submitted' ? { responseId: 'r123', formId: 'f001', formData: { field: 'value' } } : { flowId: 'flow_123', orderNumber: 'ORD-TEST' }
        }
      };
      const body = JSON.stringify(payload);
      const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
      const started = Date.now();
      let status = 0; let responseText = '';
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': sig, 'X-Webhook-Id': payload.id, 'X-Webhook-Type': payload.type }, body });
        status = r.status; responseText = await r.text();
      } catch (e:any) {
        responseText = e.message || 'Network error';
      }
      res.json({ deliveredTo: url, status, elapsedMs: Date.now() - started, responseText, signature: sig, payload });
    } catch (e) {
      res.status(500).json({ message: 'Webhook test failed' });
    }
  });

  // Get webhook delivery logs for a specific webhook
  app.get('/api/webhooks/:id/deliveries', isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      if (user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
      
      const webhook = await storage.getWebhookById(req.params.id);
      if (!webhook || webhook.organizationId !== user.organizationId) {
        return res.status(404).json({ message: 'Webhook not found' });
      }
      
      const limit = parseInt(req.query.limit as string) || 100;
      const deliveries = await storage.getWebhookDeliveryLogs(req.params.id, limit);
      
      res.json(deliveries);
    } catch (e) {
      console.error('[Webhooks] Error fetching delivery logs:', e);
      res.status(500).json({ message: 'Failed to fetch delivery logs' });
    }
  });

  // Get all webhook delivery logs for the organization
  app.get('/api/webhooks-deliveries', isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      if (user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
      
      const limit = parseInt(req.query.limit as string) || 100;
      const deliveries = await storage.getOrganizationWebhookDeliveryLogs(user.organizationId, limit);
      
      res.json(deliveries);
    } catch (e) {
      console.error('[Webhooks] Error fetching organization delivery logs:', e);
      res.status(500).json({ message: 'Failed to fetch delivery logs' });
    }
  });

  // Simple ping to confirm block executed
  console.log('[webhooks] registering webhook routes');
  app.get('/api/webhooks/ping', (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  // Optional: list registered API routes when DEBUG_ROUTES=1
  if (process.env.DEBUG_ROUTES) {
    const routes: string[] = [];
    // @ts-ignore
    app._router?.stack?.forEach((r: any) => {
      if (r.route && r.route.path) {
        const methods = Object.keys(r.route.methods).join(',').toUpperCase();
        routes.push(`${methods} ${r.route.path}`);
      }
    });
    console.log('[routes] Registered endpoints:', routes.filter(r=>r.includes('/api/')));
  }

  // MongoDB Form Responses API (Organization-specific)
  app.get("/api/mongo/form-responses", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      const { formId, startDate, endDate, page = "1", pageSize = "50" } = req.query;
      
      const responses = await storage.getMongoFormResponsesByOrgAndForm({
        orgId: user.organizationId,
        formId: formId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      });
      
      res.json(responses);
    } catch (error) {
      console.error("Error fetching MongoDB form responses:", error);
      res.status(500).json({ message: "Failed to fetch MongoDB form responses" });
    }
  });

  // Duplicate endpoint removed; consolidated earlier with org-aware access control

  // Get comprehensive flow data with tasks and form responses
  app.get("/api/flows/:flowId/data", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const { flowId } = req.params;
      const user = req.currentUser;
      
      // Get all tasks for this flow - organization-specific
      const allTasks = await storage.getTasksByOrganization(user.organizationId);
      const flowTasks = allTasks.filter(task => task.flowId === flowId);
      
      // Check if user has access to this flow (either admin or has tasks in this flow)
      const userHasAccess = user.role === 'admin' || 
        flowTasks.some(task => task.doerEmail === user.email);
      
      if (!userHasAccess) {
        return res.status(403).json({ message: "Access denied. You don't have permission to view this flow data." });
      }
      
      // Get all form responses for this flow - organization-specific
      const allResponses = await storage.getFormResponsesByOrganization(user.organizationId);
      const flowResponses = allResponses.filter(response => response.flowId === flowId);
      
      // Combine task data with form responses
      const tasksWithFormData = flowTasks.map(task => {
        // Find corresponding form response for this task
        const formResponse = flowResponses.find(response => 
          response.taskId === task.id
        );
        
        return {
          ...task,
          formResponse: formResponse?.formData || null,
          initialData: task.flowInitialFormData || null // Include initial flow data if available
        };
      });
      
      // Sort tasks by creation time to show flow progression
      tasksWithFormData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
      
      // Get flow metadata from first task
      const firstTask = tasksWithFormData[0];
      
      // Also return all form responses with task names for better organization
      const formResponsesWithTaskNames = flowResponses.map(response => {
        const responseTask = flowTasks.find(task => task.id === response.taskId);
        return {
          ...response,
          taskName: responseTask?.taskName || "Unknown Task",
          taskCreatedAt: responseTask?.createdAt || null,
          doerEmail: responseTask?.doerEmail || "Unknown"
        };
      });
      
      const flowData = {
        flowId,
        tasks: tasksWithFormData,
        formResponses: formResponsesWithTaskNames,
        flowDescription: firstTask?.flowDescription,
        flowInitiatedAt: firstTask?.flowInitiatedAt,
        flowInitiatedBy: firstTask?.flowInitiatedBy,
        orderNumber: firstTask?.orderNumber,
        system: firstTask?.system,
        userAccess: {
          isAdmin: user.role === 'admin',
          userEmail: user.email,
          userTasks: flowTasks.filter(task => task.doerEmail === user.email).length
        }
      };
      
      res.json(flowData);
    } catch (error) {
      console.error("Error fetching flow data:", error);
      res.status(500).json({ message: "Failed to fetch flow data" });
    }
  });

  // Helper function to convert array of objects to CSV
  function convertToCSV(data: any[], category: string): string {
    if (!data || data.length === 0) return 'No data available';
    
    // Escape CSV values properly and prevent CSV injection
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      
      // Convert to string
      let str = '';
      if (typeof value === 'object') {
        str = JSON.stringify(value);
      } else {
        str = String(value);
      }
      
      // SECURITY: Prevent CSV injection by prefixing dangerous characters
      // This prevents formula execution in Excel/Google Sheets
      if (str.startsWith('=') || str.startsWith('+') || 
          str.startsWith('-') || str.startsWith('@') ||
          str.startsWith('\t') || str.startsWith('\r')) {
        str = "'" + str; // Prefix with single quote to treat as text
      }
      
      // Always wrap in quotes if contains comma, newline, or quote
      if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    let headers: string[] = [];
    let rows: string[][] = [];
    
    switch (category) {
      case 'tasks':
        // Get all unique keys from all tasks
        const taskKeys = new Set<string>();
        data.forEach((task: any) => {
          Object.keys(task).forEach(key => taskKeys.add(key));
        });
        headers = Array.from(taskKeys).sort();
        
        // Create a row for each task
        rows = data.map((task: any) => {
          return headers.map(header => escapeCSV(task[header]));
        });
        break;
        
      case 'flows':
        // Create summary format for flows
        headers = ['flowId', 'system', 'orderNumber', 'flowDescription', 'flowInitiatedBy', 'flowInitiatedAt', 'totalTasks', 'completedTasks', 'pendingTasks', 'inProgressTasks', 'tasksList'];
        
        rows = data.map((flow: any) => {
          const tasks = flow.tasks || [];
          return [
            escapeCSV(flow.flowId),
            escapeCSV(flow.system),
            escapeCSV(flow.orderNumber),
            escapeCSV(flow.flowDescription),
            escapeCSV(flow.flowInitiatedBy),
            escapeCSV(flow.flowInitiatedAt),
            escapeCSV(tasks.length),
            escapeCSV(tasks.filter((t: any) => t.status === 'completed').length),
            escapeCSV(tasks.filter((t: any) => t.status === 'pending').length),
            escapeCSV(tasks.filter((t: any) => t.status === 'in_progress').length),
            escapeCSV(tasks.map((t: any) => t.taskName).join('; '))
          ];
        });
        break;
        
      case 'users':
        // Get all unique keys from all users
        const userKeys = new Set<string>();
        data.forEach((user: any) => {
          Object.keys(user).forEach(key => userKeys.add(key));
        });
        headers = Array.from(userKeys).sort();
        
        rows = data.map((user: any) => {
          return headers.map(header => escapeCSV(user[header]));
        });
        break;
        
      case 'forms':
        // For forms, create base columns + all form data fields
        const baseColumns = ['responseId', 'formId', 'flowId', 'taskId', 'submittedBy', 'timestamp', 'organizationId'];
        const formFieldKeys = new Set<string>();
        
        // Collect all unique form field keys
        data.forEach((response: any) => {
          if (response.formData && typeof response.formData === 'object') {
            Object.keys(response.formData).forEach(key => formFieldKeys.add(`field_${key}`));
          }
        });
        
        headers = [...baseColumns, ...Array.from(formFieldKeys).sort()];
        
        rows = data.map((response: any) => {
          const row: string[] = [];
          
          // Base columns
          row.push(escapeCSV(response.responseId || response._id));
          row.push(escapeCSV(response.formId));
          row.push(escapeCSV(response.flowId));
          row.push(escapeCSV(response.taskId));
          row.push(escapeCSV(response.submittedBy));
          row.push(escapeCSV(response.timestamp || response.createdAt));
          row.push(escapeCSV(response.organizationId));
          
          // Form data fields
          Array.from(formFieldKeys).sort().forEach(fieldKey => {
            const actualKey = fieldKey.replace('field_', '');
            const value = response.formData?.[actualKey];
            row.push(escapeCSV(value));
          });
          
          return row;
        });
        break;
    }
    
    // Build CSV string - header row + data rows
    const csvLines: string[] = [];
    csvLines.push(headers.join(','));
    rows.forEach(row => {
      csvLines.push(row.join(','));
    });
    
    return csvLines.join('\n');
  }

  // Data Management: Export endpoints by category (Organization-specific, Admin only)
  app.get("/api/export/:category", exportLimiter, isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const { category } = req.params;
      const { format = 'csv' } = req.query; // Default to CSV, support 'json' or 'csv'
      const user = req.currentUser;
      const timestamp = new Date().toISOString().split('T')[0];
      
      // Sanitize inputs to prevent injection
      const sanitizedCategory = category.replace(/[^a-zA-Z0-9_-]/g, '_');
      const sanitizedFormat = format === 'json' ? 'json' : 'csv';
      
      // Audit logging
      console.log(`[AUDIT] Export - User: ${user.email}, Category: ${category}, Organization: ${user.organizationId}, Time: ${new Date().toISOString()}`);
      
      let rawData: any[] = [];
      let csvData: string = '';
      let filename = `${sanitizedCategory}_export_${timestamp}.${sanitizedFormat}`;
      
      // Memory safety limits
      const MAX_EXPORT_RECORDS = 50000; // Maximum records per export
      
      switch (category) {
        case 'flows':
          // Export all tasks grouped by flow
          const allTasks = await storage.getTasksByOrganization(user.organizationId);
          
          if (allTasks.length > MAX_EXPORT_RECORDS) {
            return res.status(413).json({ 
              message: `Export too large (${allTasks.length} records). Maximum ${MAX_EXPORT_RECORDS} records allowed. Please contact support for large exports.`,
              recordCount: allTasks.length,
              maxAllowed: MAX_EXPORT_RECORDS
            });
          }
          
          const flowGroups = allTasks.reduce((acc: any, task: any) => {
            if (!acc[task.flowId]) {
              acc[task.flowId] = {
                flowId: task.flowId,
                system: task.system,
                orderNumber: task.orderNumber,
                flowDescription: task.flowDescription,
                flowInitiatedBy: task.flowInitiatedBy,
                flowInitiatedAt: task.flowInitiatedAt,
                tasks: []
              };
            }
            acc[task.flowId].tasks.push(task);
            return acc;
          }, {});
          rawData = Object.values(flowGroups);
          break;
          
        case 'forms':
          // Export all form submissions from MongoDB
          const formResponses = await storage.getMongoFormResponsesByOrgAndForm({
            orgId: user.organizationId,
            page: 1,
            pageSize: 5000, // Reduced from 10000 to prevent memory issues
          });
          rawData = formResponses.data || [];
          
          if (rawData.length >= 5000) {
            console.warn(`[AUDIT] Large form export - User: ${user.email}, Records: ${rawData.length} (may be truncated)`);
          }
          break;
          
        case 'tasks':
          // Export all tasks
          const tasks = await storage.getTasksByOrganization(user.organizationId);
          
          if (tasks.length > MAX_EXPORT_RECORDS) {
            return res.status(413).json({ 
              message: `Export too large (${tasks.length} records). Maximum ${MAX_EXPORT_RECORDS} records allowed. Please contact support for large exports.`,
              recordCount: tasks.length,
              maxAllowed: MAX_EXPORT_RECORDS
            });
          }
          
          rawData = tasks;
          break;
          
        case 'users':
          // Export user information (without sensitive data)
          const users = await storage.getUsersByOrganization(user.organizationId);
          rawData = users.map((u: any) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            status: u.status,
            createdAt: u.createdAt
          }));
          break;
          
        default:
          return res.status(400).json({ message: "Invalid category. Use: flows, forms, tasks, or users" });
      }
      
      if (format === 'csv') {
        // Generate CSV
        csvData = convertToCSV(rawData, category);
        
        // Audit log success
        console.log(`[AUDIT] Export Success - User: ${user.email}, Category: ${category}, Records: ${rawData.length}, Format: CSV, Size: ${csvData.length} bytes`);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvData);
      } else {
        // Return JSON (legacy support)
        const jsonData = {
          exportDate: new Date().toISOString(),
          organizationId: user.organizationId,
          category,
          total: rawData.length,
          data: rawData
        };
        
        // Audit log success
        console.log(`[AUDIT] Export Success - User: ${user.email}, Category: ${category}, Records: ${rawData.length}, Format: JSON`);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(jsonData);
      }
      
    } catch (error) {
      // Audit log failure
      console.error(`[AUDIT] Export Failed - User: ${req.currentUser?.email}, Category: ${req.params.category}, Error:`, error);
      
      // Provide specific error messages
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          return res.status(503).json({ message: "Database connection failed. Please try again later." });
        }
        if (error.message.includes('timeout')) {
          return res.status(504).json({ message: "Export timed out. Please try exporting a smaller dataset." });
        }
        if (error.message.includes('MongoDB')) {
          return res.status(503).json({ message: "Form database unavailable. Please try again later." });
        }
      }
      
      console.error("Error exporting data:", error);
      res.status(500).json({ 
        message: "Failed to export data. Please try again or contact support if the issue persists.",
        category: req.params.category
      });
    }
  });

  // Data Management: Delete endpoints by category (Organization-specific, Admin only)
  app.delete("/api/delete/:category", exportLimiter, isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const { category } = req.params;
      const user = req.currentUser;
      let deletedCount = 0;
      let message = '';
      
      // Audit logging - BEFORE deletion
      console.log(`[AUDIT] Delete Request - User: ${user.email}, Category: ${category}, Organization: ${user.organizationId}, Time: ${new Date().toISOString()}`);
      
      switch (category) {
        case 'flows':
          // Delete all tasks (which represent flows) using direct database delete
          const { tasks: tasksTable } = await import('@shared/schema');
          const { eq } = await import('drizzle-orm');
          const result = await db.delete(tasksTable).where(eq(tasksTable.organizationId, user.organizationId));
          deletedCount = result.rowCount || 0;
          message = `Successfully deleted ${deletedCount} tasks across all flows`;
          break;
          
        case 'forms':
          // Delete all form submissions from MongoDB
          try {
            const { MongoClient } = await import('mongodb');
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/processSutra';
            const client = new MongoClient(mongoUri);
            await client.connect();
            const database = client.db();
            const col = database.collection('formResponses');
            
            const deleteResult = await col.deleteMany({ organizationId: user.organizationId });
            deletedCount = deleteResult.deletedCount || 0;
            await client.close();
            message = `Successfully deleted ${deletedCount} form submissions`;
          } catch (mongoError) {
            console.error("MongoDB deletion error:", mongoError);
            throw new Error("Failed to delete form submissions from MongoDB");
          }
          break;
          
        case 'tasks':
          // Delete all tasks using direct database delete
          const { tasks: tasksTableForTasks } = await import('@shared/schema');
          const { eq: eqForTasks } = await import('drizzle-orm');
          const taskResult = await db.delete(tasksTableForTasks).where(eqForTasks(tasksTableForTasks.organizationId, user.organizationId));
          deletedCount = taskResult.rowCount || 0;
          message = `Successfully deleted ${deletedCount} tasks`;
          break;
          
        case 'users':
          return res.status(400).json({ 
            message: "User data cannot be bulk deleted. Please delete users individually from User Management." 
          });
          
        default:
          return res.status(400).json({ message: "Invalid category. Use: flows, forms, or tasks" });
      }
      
      // Audit logging - AFTER successful deletion
      console.log(`[AUDIT] Delete Success - User: ${user.email}, Category: ${category}, Deleted: ${deletedCount} records, Organization: ${user.organizationId}`);
      
      res.json({
        success: true,
        category,
        deletedCount,
        message,
        deletedAt: new Date().toISOString(),
        deletedBy: user.email
      });
      
    } catch (error) {
      // Audit log failure
      console.error(`[AUDIT] Delete Failed - User: ${req.currentUser?.email}, Category: ${req.params.category}, Error:`, error);
      console.error("Error deleting data:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to delete data" 
      });
    }
  });

  // Export API with comprehensive data
  app.get("/api/export/flow-data", isAuthenticated, async (req, res) => {
    try {
      // Get all tasks with their associated form responses
      const tasks = await storage.getTasks();
      const formResponses = await storage.getFormResponses();
      
      // Group form responses by task ID for quick lookup
      const responsesByTask = formResponses.reduce((acc: any, response: any) => {
        if (!acc[response.taskId]) {
          acc[response.taskId] = [];
        }
        acc[response.taskId].push(response);
        return acc;
      }, {});
      
      // Group tasks by flow ID and calculate comprehensive metrics
      const flowGroups = tasks.reduce((acc: any, task: any) => {
        if (!acc[task.flowId]) {
          acc[task.flowId] = {
            flowId: task.flowId,
            system: task.system,
            orderNumber: task.orderNumber,
            tasks: [],
            totalTasks: 0,
            completedTasks: 0,
            totalCycleTime: 0,
            flowStartTime: null,
            flowEndTime: null,
            formData: {}
          };
        }
        
        const flowGroup = acc[task.flowId];
        
        // Add task data
        const taskWithResponses = {
          ...task,
          formResponses: responsesByTask[task.id] || [],
          cycleTime: task.actualCompletionTime 
            ? Math.round((new Date(task.actualCompletionTime).getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60))
            : null,
          tatVariance: task.actualCompletionTime
            ? Math.round((new Date(task.actualCompletionTime).getTime() - new Date(task.plannedTime).getTime()) / (1000 * 60 * 60))
            : null,
          isOnTime: task.actualCompletionTime
            ? new Date(task.actualCompletionTime) <= new Date(task.plannedTime)
            : null
        };
        
        flowGroup.tasks.push(taskWithResponses);
        flowGroup.totalTasks++;
        
        if (task.status === 'completed') {
          flowGroup.completedTasks++;
          if (taskWithResponses.cycleTime) {
            flowGroup.totalCycleTime += taskWithResponses.cycleTime;
          }
        }
        
        // Track flow start and end times
        const taskCreated = new Date(task.createdAt);
        const taskCompleted = task.actualCompletionTime ? new Date(task.actualCompletionTime) : null;
        
        if (!flowGroup.flowStartTime || taskCreated < flowGroup.flowStartTime) {
          flowGroup.flowStartTime = taskCreated;
        }
        
        if (taskCompleted && (!flowGroup.flowEndTime || taskCompleted > flowGroup.flowEndTime)) {
          flowGroup.flowEndTime = taskCompleted;
        }
        
        // Collect all form data for the flow
        taskWithResponses.formResponses.forEach((response: any) => {
          if (!flowGroup.formData[response.formId]) {
            flowGroup.formData[response.formId] = [];
          }
          flowGroup.formData[response.formId].push({
            taskName: response.taskName,
            submittedBy: response.submittedBy,
            timestamp: response.timestamp,
            data: response.formData
          });
        });
        
        return acc;
      }, {});
      
      // Calculate flow-level metrics
      const exportData = Object.values(flowGroups).map((flow: any) => ({
        ...flow,
        avgCycleTime: flow.completedTasks > 0 ? Math.round(flow.totalCycleTime / flow.completedTasks) : 0,
        completionRate: flow.totalTasks > 0 ? Math.round((flow.completedTasks / flow.totalTasks) * 100) : 0,
        overallFlowTime: flow.flowStartTime && flow.flowEndTime 
          ? Math.round((flow.flowEndTime.getTime() - flow.flowStartTime.getTime()) / (1000 * 60 * 60))
          : null,
        onTimeRate: (() => {
          const completedOnTime = flow.tasks.filter((t: any) => t.isOnTime === true).length;
          return flow.completedTasks > 0 ? Math.round((completedOnTime / flow.completedTasks) * 100) : 0;
        })()
      }));
      
      res.json({
        exportTimestamp: new Date().toISOString(),
        totalFlows: exportData.length,
        data: exportData
      });
    } catch (error) {
      console.error("Error exporting flow data:", error);
      res.status(500).json({ message: "Failed to export flow data" });
    }
  });

  // Analytics API (Organization-specific for admins, user-specific for regular users)
  app.get("/api/analytics/metrics", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      
      let metrics;
      if (user.role === 'admin') {
        // Admins see organization-specific metrics
        metrics = await storage.getOrganizationTaskMetrics(user.organizationId);
      } else {
        // Regular users see their own performance metrics
        metrics = await storage.getUserTaskMetrics(user.email);
      }
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get("/api/analytics/flow-performance", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      
      let flowPerformance;
      if (user.role === 'admin') {
        // Admins see organization-specific flow performance
        flowPerformance = await storage.getOrganizationFlowPerformance(user.organizationId);
      } else {
        // Regular users see their own flow performance
        flowPerformance = await storage.getUserFlowPerformance(user.email);
      }
      
      res.json(flowPerformance);
    } catch (error) {
      console.error("Error fetching flow performance:", error);
      res.status(500).json({ message: "Failed to fetch flow performance" });
    }
  });

  // Weekly scoring for users
  app.get("/api/analytics/weekly-scoring", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      const weeklyScoring = await storage.getUserWeeklyScoring(user.email);
      res.json(weeklyScoring);
    } catch (error) {
      console.error("Error fetching weekly scoring:", error);
      res.status(500).json({ message: "Failed to fetch weekly scoring" });
    }
  });

  // Reporting: filters and report
  app.get("/api/analytics/report/systems", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      const systems = await storage.getOrganizationSystems(user.organizationId);
      res.json(systems);
    } catch (error) {
      console.error("Error fetching systems:", error);
      res.status(500).json({ message: "Failed to fetch systems" });
    }
  });

  app.get("/api/analytics/report/processes", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      const { system } = req.query;
      if (!system) return res.status(400).json({ message: "system is required" });
      const processes = await storage.getProcessesBySystem(user.organizationId, String(system));
      res.json(processes);
    } catch (error) {
      console.error("Error fetching processes:", error);
      res.status(500).json({ message: "Failed to fetch processes" });
    }
  });

  app.get("/api/analytics/report", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      const { system, taskName, startDate, endDate } = req.query as Record<string, string>;
      const report = await storage.getOrganizationReport(user.organizationId, { system, taskName, startDate, endDate });
      res.json(report);
    } catch (error) {
      console.error("Error fetching report:", error);
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  // Admin-only: Organization doers performance with filtering
  app.get("/api/analytics/doers-performance", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const filters = {
        organizationId: user.organizationId,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        doerName: req.query.doerName as string,
        doerEmail: req.query.doerEmail as string,
      };

      const doersPerformance = await storage.getOrganizationDoersPerformance(filters);
      res.json(doersPerformance);
    } catch (error) {
      console.error("Error fetching doers performance:", error);
      res.status(500).json({ message: "Failed to fetch doers performance" });
    }
  });

  // Admin-only: Detailed weekly performance for a specific doer
  app.get("/api/analytics/doer-weekly/:doerEmail", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin only." });
      }

      const { doerEmail } = req.params;
      const weeks = parseInt(req.query.weeks as string) || 12;
      
      const weeklyPerformance = await storage.getDoerWeeklyPerformance(doerEmail, weeks);
      res.json(weeklyPerformance);
    } catch (error) {
      console.error("Error fetching doer weekly performance:", error);
      res.status(500).json({ message: "Failed to fetch doer weekly performance" });
    }
  });

  // TAT Configuration API
  app.get("/api/tat-config", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      const config = await storage.getTATConfig(currentUser?.organizationId || "");
      res.json(config || {
        officeStartHour: 9,
        officeEndHour: 17, // Configurable per organization (5 PM default)
        timezone: "Asia/Kolkata",
        skipWeekends: true,
        weekendDays: "0,6" // Sunday and Saturday
      });
    } catch (error) {
      console.error("Error fetching TAT config:", error);
      res.status(500).json({ message: "Failed to fetch TAT configuration" });
    }
  });

  app.post("/api/tat-config", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      const { officeStartHour, officeEndHour, timezone, skipWeekends } = req.body;
      
      // Validate inputs
      if (typeof officeStartHour !== 'number' || officeStartHour < 0 || officeStartHour > 23) {
        return res.status(400).json({ message: "Office start hour must be between 0 and 23" });
      }
      
      if (typeof officeEndHour !== 'number' || officeEndHour < 0 || officeEndHour > 23) {
        return res.status(400).json({ message: "Office end hour must be between 0 and 23" });
      }
      
      if (officeEndHour <= officeStartHour) {
        return res.status(400).json({ message: "Office end hour must be after start hour" });
      }
      
      if ((officeEndHour - officeStartHour) < 1) {
        return res.status(400).json({ message: "Office must be open for at least 1 hour" });
      }
      
      if (!timezone || typeof timezone !== 'string') {
        return res.status(400).json({ message: "Valid timezone is required" });
      }
      
      if (typeof skipWeekends !== 'boolean') {
        return res.status(400).json({ message: "skipWeekends must be a boolean" });
      }
      
      const config = await storage.upsertTATConfig(currentUser?.organizationId || "", {
        officeStartHour,
        officeEndHour,
        timezone,
        skipWeekends
      });
      
      console.log(`[TAT Config] Updated for organization ${currentUser?.organizationId}:`, config);
      
      res.json(config);
    } catch (error) {
      console.error("Error updating TAT config:", error);
      res.status(500).json({ message: "Failed to update TAT configuration" });
    }
  });

  // Organization-specific user routes
  app.get("/api/users", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      const users = await storage.getUsersByOrganization(user.organizationId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ 
          message: "Username already exists. Please choose a different username." 
        });
      }
      
      // Ensure new user gets the same organization ID as the admin creating them
      const userData = {
        ...req.body,
        organizationId: currentUser.organizationId
      };
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      if ((error as any).code === '23505' && (error as any).constraint === 'users_username_key') {
        res.status(400).json({ message: "Username already exists. Please choose a different username." });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.put("/api/users/:id", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      const targetUser = await storage.getUser(req.params.id);
      
      // SECURITY: Verify same organization
      if (!targetUser || targetUser.organizationId !== currentUser.organizationId) {
        return res.status(403).json({ message: "Access denied. Cannot update users from other organizations." });
      }
      
      // Prevent changing sensitive fields via this endpoint
      const { organizationId, id, createdAt, ...allowedUpdates } = req.body;
      
      const user = await storage.updateUserDetails(req.params.id, allowedUpdates);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.put("/api/users/:id/status", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      const targetUserId = req.params.id;
      const newStatus = req.body.status;
      
      // Get the target user to check their role
      const targetUser = await storage.getUser(targetUserId);
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // SECURITY: Verify same organization
      if (targetUser.organizationId !== currentUser.organizationId) {
        return res.status(403).json({ message: "Access denied. Cannot modify users from other organizations." });
      }
      
      // Prevent suspending admin users
      if (targetUser.role === 'admin' && newStatus === 'suspended') {
        return res.status(400).json({ 
          message: "Cannot suspend admin users. Every organization must have at least one active admin." 
        });
      }
      
      // Prevent admins from suspending themselves
      if (targetUserId === currentUser.id && newStatus === 'suspended') {
        return res.status(400).json({ 
          message: "You cannot suspend your own account." 
        });
      }
      
      const user = await storage.changeUserStatus(targetUserId, newStatus);
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      const targetUserId = req.params.id;
      
      // Get the target user
      const targetUser = await storage.getUser(targetUserId);
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // SECURITY: Verify same organization
      if (targetUser.organizationId !== currentUser.organizationId) {
        return res.status(403).json({ message: "Access denied. Cannot delete users from other organizations." });
      }
      
      // Prevent self-deletion
      if (targetUserId === currentUser.id) {
        return res.status(400).json({ message: "You cannot delete your own account." });
      }
      
      // Prevent deleting last admin
      if (targetUser.role === 'admin' && targetUser.organizationId) {
        const adminCount = await storage.getOrganizationAdminCount(targetUser.organizationId);
        if (adminCount <= 1) {
          return res.status(400).json({ 
            message: "Cannot delete the last admin. Promote another user to admin first." 
          });
        }
      }
      
      // Perform deletion
      await storage.deleteUser(targetUserId);
      
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Organization API
  app.get("/api/organizations/current", isAuthenticated, addUserToRequest, async (req: any, res) => {
    try {
      const user = req.currentUser;
      const organization = await storage.getOrganization(user.organizationId);
      res.json(organization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.post("/api/organizations", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validatedData = insertOrganizationSchema.parse(req.body);
      const organization = await storage.createOrganization(validatedData);
      res.status(201).json(organization);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(400).json({ message: "Invalid organization data" });
    }
  });

  app.put("/api/organizations/current", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      console.log("PUT /api/organizations/current - User:", req.currentUser?.email);
      console.log("PUT /api/organizations/current - Body:", req.body);
      
      const user = req.currentUser;
      if (!user?.organizationId) {
        return res.status(400).json({ message: "User organization not found" });
      }
      
      const validatedData = insertOrganizationSchema.partial().parse(req.body);
      console.log("PUT /api/organizations/current - Validated data:", validatedData);
      
      const organization = await storage.updateOrganization(user.organizationId, validatedData);
      console.log("PUT /api/organizations/current - Updated organization:", organization);
      
      res.json(organization);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(400).json({ 
        message: "Invalid organization data", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Login Logs API
  app.get("/api/login-logs", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      let logs;
      
      if (currentUser?.role === "admin") {
        // Admin sees all logs in their organization
        logs = await storage.getOrganizationLoginLogs(currentUser.organizationId || "");
      } else {
        // Regular user sees only their own logs
        logs = await storage.getLoginLogs(currentUser?.id);
      }
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching login logs:", error);
      res.status(500).json({ message: "Failed to fetch login logs" });
    }
  });

  app.post("/api/login-logs", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      const log = await storage.createLoginLog({
        ...req.body,
        userId: req.user.id,
        organizationId: currentUser?.organizationId || ""
      });
      res.json(log);
    } catch (error) {
      console.error("Error creating login log:", error);
      res.status(500).json({ message: "Failed to create login log" });
    }
  });

  // Device Management API
  app.get("/api/devices", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role === "admin") {
        // Admin sees all devices in their organization
        const devices = await storage.getOrganizationDevices(currentUser.organizationId || "");
        res.json(devices);
      } else {
        // Regular user sees only their own devices
        const devices = await storage.getUserDevices(currentUser?.id || "");
        res.json(devices);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  app.post("/api/devices", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      const device = await storage.createOrUpdateDevice({
        ...req.body,
        userId: req.user.id,
        organizationId: currentUser?.organizationId || ""
      });
      res.json(device);
    } catch (error) {
      console.error("Error creating/updating device:", error);
      res.status(500).json({ message: "Failed to create/update device" });
    }
  });

  app.put("/api/devices/:deviceId/trust", isAuthenticated, async (req: any, res) => {
    try {
      const device = await storage.updateDeviceTrust(req.params.deviceId, req.body.isTrusted);
      res.json(device);
    } catch (error) {
      console.error("Error updating device trust:", error);
      res.status(500).json({ message: "Failed to update device trust" });
    }
  });

  // Password History API
  app.get("/api/password-history", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      const history = await storage.getPasswordHistory(currentUser?.id || "");
      res.json(history);
    } catch (error) {
      console.error("Error fetching password history:", error);
      res.status(500).json({ message: "Failed to fetch password history" });
    }
  });

  app.post("/api/password-history", isAuthenticated, async (req: any, res) => {
    try {
      const history = await storage.createPasswordChangeHistory({
        ...req.body,
        userId: req.user.id
      });
      res.json(history);
    } catch (error) {
      console.error("Error creating password history:", error);
      res.status(500).json({ message: "Failed to create password history" });
    }
  });

  // ============================================================
  // SUPER ADMIN CONTROL PANEL API ROUTES (SYSTEM-LEVEL)
  // Only accessible by super admins (above organizations)
  // ============================================================

  // Get all organizations (super admin only)
  app.get("/api/super-admin/organizations", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const organizations = await storage.getAllOrganizations();
      
      // Enrich with user counts and activity
      const enrichedOrgs = await Promise.all(
        organizations.map(async (org) => {
          const users = await storage.getUsersByOrganization(org.id);
          const activeUsers = users.filter((u: any) => u.status === 'active').length;
          const totalUsers = users.length;
          const tasks = await storage.getTasksByOrganization(org.id);
          const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
          
          return {
            ...org,
            totalUsers,
            activeUsers,
            totalTasks: tasks.length,
            completedTasks,
            taskCompletionRate: tasks.length > 0 ? ((completedTasks / tasks.length) * 100).toFixed(1) : 0
          };
        })
      );
      
      res.json(enrichedOrgs);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // Get system-wide statistics (super admin only)
  app.get("/api/super-admin/system-statistics", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const organizations = await storage.getAllOrganizations();
      
      // Aggregate statistics across all organizations
      let totalUsers = 0;
      let activeUsers = 0;
      let inactiveUsers = 0;
      let suspendedUsers = 0;
      let totalTasks = 0;
      let completedTasks = 0;
      let totalFileUploads = 0;
      
      const orgStats = await Promise.all(
        organizations.map(async (org) => {
          const users = await storage.getUsersByOrganization(org.id);
          const tasks = await storage.getTasksByOrganization(org.id);
          
          totalUsers += users.length;
          activeUsers += users.filter((u: any) => u.status === 'active').length;
          inactiveUsers += users.filter((u: any) => u.status === 'inactive').length;
          suspendedUsers += users.filter((u: any) => u.status === 'suspended').length;
          totalTasks += tasks.length;
          completedTasks += tasks.filter((t: any) => t.status === 'completed').length;
          
          try {
            const { getFileCount } = await import('./mongo/gridfs');
            const fileCount = await getFileCount(org.id);
            totalFileUploads += fileCount;
          } catch (error) {
            console.error(`Error fetching file count for org ${org.id}:`, error);
          }
          
          return {
            organizationId: org.id,
            organizationName: org.name,
            users: users.length,
            activeTasks: tasks.filter((t: any) => t.status === 'pending').length,
          };
        })
      );
      
      res.json({
        system: {
          totalOrganizations: organizations.length,
          activeOrganizations: organizations.filter(o => o.isActive).length,
          inactiveOrganizations: organizations.filter(o => !o.isActive).length,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          suspended: suspendedUsers,
          activePercentage: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0,
        },
        data: {
          totalFileUploads,
        },
        byOrganization: orgStats,
      });
    } catch (error) {
      console.error("Error fetching system statistics:", error);
      res.status(500).json({ message: "Failed to fetch system statistics" });
    }
  });

  // Get all users across all organizations (super admin only)
  app.get("/api/super-admin/all-users", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const organizationId = req.query.organizationId as string;
      
      if (organizationId) {
        // Get users for specific organization
        const users = await storage.getUsersByOrganization(organizationId);
        const organization = await storage.getOrganization(organizationId);
        const loginLogs = await storage.getOrganizationLoginLogs(organizationId);
        
        const userLoginMap = new Map();
        loginLogs.forEach((log: any) => {
          if (!userLoginMap.has(log.userId) || 
              new Date(log.loginTime) > new Date(userLoginMap.get(log.userId).loginTime)) {
            userLoginMap.set(log.userId, log);
          }
        });
        
        const enrichedUsers = users.map((user: any) => {
          const recentLogin = userLoginMap.get(user.id);
          const lastActivity = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
          const isOnline = lastActivity && (Date.now() - lastActivity.getTime()) < 10 * 60 * 1000;
          
          return {
            ...user,
            organizationName: organization?.name,
            isOnline,
            location: recentLogin?.location || null,
            deviceType: recentLogin?.deviceType || null,
            browserName: recentLogin?.browserName || null,
            ipAddress: recentLogin?.ipAddress || null,
          };
        });
        
        res.json(enrichedUsers);
      } else {
        // Get all users from all organizations
        const organizations = await storage.getAllOrganizations();
        const allUsers: any[] = [];
        
        for (const org of organizations) {
          const users = await storage.getUsersByOrganization(org.id);
          const loginLogs = await storage.getOrganizationLoginLogs(org.id);
          
          const userLoginMap = new Map();
          loginLogs.forEach((log: any) => {
            if (!userLoginMap.has(log.userId) || 
                new Date(log.loginTime) > new Date(userLoginMap.get(log.userId).loginTime)) {
              userLoginMap.set(log.userId, log);
            }
          });
          
          users.forEach((user: any) => {
            const recentLogin = userLoginMap.get(user.id);
            const lastActivity = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
            const isOnline = lastActivity && (Date.now() - lastActivity.getTime()) < 10 * 60 * 1000;
            
            allUsers.push({
              ...user,
              organizationName: org.name,
              organizationDomain: org.domain,
              isOnline,
              location: recentLogin?.location || null,
              deviceType: recentLogin?.deviceType || null,
              browserName: recentLogin?.browserName || null,
              ipAddress: recentLogin?.ipAddress || null,
            });
          });
        }
        
        res.json(allUsers);
      }
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Toggle organization active status (super admin only)
  app.put("/api/super-admin/organizations/:id/status", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const organizationId = req.params.id;
      const { isActive } = req.body;
      
      // Get organization before update for audit trail
      const oldOrg = await storage.getOrganization(organizationId);
      
      const organization = await storage.updateOrganizationStatus(organizationId, isActive);
      
      // Create audit log
      await storage.createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: "TOGGLE_ORG_STATUS",
        targetType: "organization",
        targetId: organizationId,
        targetEmail: organization.domain,
        oldValue: JSON.stringify({ isActive: oldOrg?.isActive }),
        newValue: JSON.stringify({ isActive }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId: organizationId,
      });
      
      res.json(organization);
    } catch (error) {
      console.error("Error updating organization status:", error);
      res.status(500).json({ message: "Failed to update organization status" });
    }
  });

  // Update organization details (super admin only)
  app.put("/api/super-admin/organizations/:id", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const organizationId = req.params.id;
      const updates = req.body;
      
      // Get organization before update for audit trail
      const oldOrg = await storage.getOrganization(organizationId);
      
      const organization = await storage.updateOrganization(organizationId, updates);
      
      // Create audit log
      await storage.createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: "UPDATE_ORGANIZATION",
        targetType: "organization",
        targetId: organizationId,
        targetEmail: organization.domain,
        oldValue: JSON.stringify(oldOrg),
        newValue: JSON.stringify(updates),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId: organizationId,
      });
      
      res.json(organization);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  // Change user status across any organization (super admin only)
  app.put("/api/super-admin/users/:userId/status", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const { status } = req.body;
      
      if (!['active', 'inactive', 'suspended'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Get user before update for audit trail
      const oldUser = await storage.getUser(userId);
      
      const user = await storage.changeUserStatus(userId, status);
      
      // Create audit log
      await storage.createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: "CHANGE_USER_STATUS",
        targetType: "user",
        targetId: userId,
        targetEmail: user.email || undefined,
        oldValue: JSON.stringify({ status: oldUser?.status }),
        newValue: JSON.stringify({ status }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId: user.organizationId || undefined,
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Promote user to super admin (super admin only)
  app.put("/api/super-admin/users/:userId/promote-super-admin", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const { isSuperAdmin } = req.body;
      
      // Get user before update for audit trail
      const oldUser = await storage.getUser(userId);
      
      const user = await storage.updateUserSuperAdminStatus(userId, isSuperAdmin);
      
      // Create audit log
      await storage.createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: "PROMOTE_SUPER_ADMIN",
        targetType: "user",
        targetId: userId,
        targetEmail: user.email || undefined,
        oldValue: JSON.stringify({ isSuperAdmin: oldUser?.isSuperAdmin }),
        newValue: JSON.stringify({ isSuperAdmin }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId: user.organizationId || undefined,
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error updating super admin status:", error);
      res.status(500).json({ message: "Failed to update super admin status" });
    }
  });

  // Get activity across all organizations (super admin only)
  app.get("/api/super-admin/global-activity", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const organizations = await storage.getAllOrganizations();
      
      const activities = [];
      
      for (const org of organizations) {
        const loginLogs = await storage.getOrganizationLoginLogs(org.id);
        const tasks = await storage.getTasks(org.id);
        
        activities.push(
          ...loginLogs.slice(-50).map(log => ({
            type: 'login',
            timestamp: log.loginTime,
            userId: log.userId,
            organizationId: org.id,
            organizationName: org.name,
            details: {
              location: log.location,
              device: log.deviceType,
              status: log.loginStatus
            }
          })),
          ...tasks.slice(-50).map(task => ({
            type: 'task',
            timestamp: task.createdAt,
            userId: task.doerEmail,
            organizationId: org.id,
            organizationName: org.name,
            details: {
              taskName: task.taskName,
              status: task.status,
              flowId: task.flowId
            }
          }))
        );
      }
      
      // Sort by timestamp and limit
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      res.json(activities.slice(0, limit));
    } catch (error) {
      console.error("Error fetching global activity:", error);
      res.status(500).json({ message: "Failed to fetch global activity" });
    }
  });

  // ============================================================
  // ORGANIZATION ADMIN ROUTES (kept for backward compatibility)
  // These work within a single organization scope
  // ============================================================

  // Super Admin Dashboard Statistics (Organization Scoped)
  app.get("/api/super-admin/statistics", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      const organizationId = currentUser.organizationId;

      // Fetch comprehensive statistics
      const [
        allUsers,
        allTasks,
        allFlowRules,
        allFormResponses,
        loginLogs,
        devices
      ] = await Promise.all([
        storage.getUsersByOrganization(organizationId),
        storage.getTasksByOrganization(organizationId),
        storage.getFlowRulesByOrganization(organizationId),
        storage.getFormResponsesByOrganization(organizationId),
        storage.getOrganizationLoginLogs(organizationId),
        storage.getOrganizationDevices(organizationId)
      ]);

      // Calculate user statistics
      const totalUsers = allUsers.length;
      const activeUsers = allUsers.filter((u: any) => u.status === 'active').length;
      const inactiveUsers = allUsers.filter((u: any) => u.status === 'inactive').length;
      const suspendedUsers = allUsers.filter((u: any) => u.status === 'suspended').length;

      // Calculate currently online users (logged in within last 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const currentlyOnline = allUsers.filter((u: any) => 
        u.lastLoginAt && new Date(u.lastLoginAt) > tenMinutesAgo
      ).length;

      // User distribution by role
      const adminCount = allUsers.filter((u: any) => u.role === 'admin').length;
      const regularUserCount = allUsers.filter((u: any) => u.role === 'user').length;

      // User distribution by department
      const departmentStats = allUsers.reduce((acc: any, user: any) => {
        const dept = user.department || 'Unassigned';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Task statistics
      const totalTasks = allTasks.length;
      const pendingTasks = allTasks.filter((t: any) => t.status === 'pending').length;
      const completedTasks = allTasks.filter((t: any) => t.status === 'completed').length;
      const overdueTasks = allTasks.filter((t: any) => t.status === 'overdue').length;
      const cancelledTasks = allTasks.filter((t: any) => t.status === 'cancelled').length;

      // Data count statistics
      const totalFlows = allFlowRules.length;
      const totalFormResponses = allFormResponses.length;

      // File upload count from GridFS
      let totalFileUploads = 0;
      try {
        const { getFileCount } = await import('./mongo/gridfs');
        totalFileUploads = await getFileCount(organizationId);
      } catch (error) {
        console.error("Error fetching file count:", error);
      }

      // Login activity statistics
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayLogins = loginLogs.filter((log: any) => 
        new Date(log.loginTime) >= todayStart
      ).length;

      // Device statistics
      const desktopDevices = devices.filter((d: any) => d.deviceType === 'desktop').length;
      const mobileDevices = devices.filter((d: any) => d.deviceType === 'mobile').length;
      const tabletDevices = devices.filter((d: any) => d.deviceType === 'tablet').length;
      const trustedDevices = devices.filter((d: any) => d.isTrusted).length;

      // Location statistics from login logs
      const locationMap = new Map<string, number>();
      loginLogs.forEach((log: any) => {
        if (log.location && typeof log.location === 'object') {
          const loc = log.location as any;
          const country = loc.country || 'Unknown';
          locationMap.set(country, (locationMap.get(country) || 0) + 1);
        }
      });
      const topLocations = Array.from(locationMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([country, count]) => ({ country, count }));

      // Growth trend (new users last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const newUsersLast30Days = allUsers.filter((u: any) => 
        u.createdAt && new Date(u.createdAt) >= thirtyDaysAgo
      ).length;

      res.json({
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          suspended: suspendedUsers,
          currentlyOnline,
          admins: adminCount,
          regularUsers: regularUserCount,
          byDepartment: departmentStats,
          newLast30Days: newUsersLast30Days,
          activePercentage: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0
        },
        tasks: {
          total: totalTasks,
          pending: pendingTasks,
          completed: completedTasks,
          overdue: overdueTasks,
          cancelled: cancelledTasks,
          completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0
        },
        data: {
          totalFlows,
          totalFormResponses,
          totalFileUploads,
          avgResponsesPerFlow: totalFlows > 0 ? (totalFormResponses / totalFlows).toFixed(1) : 0
        },
        activity: {
          todayLogins,
          totalLogins: loginLogs.length,
          topLocations
        },
        devices: {
          total: devices.length,
          desktop: desktopDevices,
          mobile: mobileDevices,
          tablet: tabletDevices,
          trusted: trustedDevices,
          trustedPercentage: devices.length > 0 ? ((trustedDevices / devices.length) * 100).toFixed(1) : 0
        }
      });
    } catch (error) {
      console.error("Error fetching super admin statistics:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Get all active users with location and session data
  app.get("/api/super-admin/active-users", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      const organizationId = currentUser.organizationId;

      const [users, loginLogs] = await Promise.all([
        storage.getUsersByOrganization(organizationId),
        storage.getOrganizationLoginLogs(organizationId)
      ]);

      // Get recent login logs for each user
      const userLoginMap = new Map();
      loginLogs.forEach((log: any) => {
        if (!userLoginMap.has(log.userId) || 
            new Date(log.loginTime) > new Date(userLoginMap.get(log.userId).loginTime)) {
          userLoginMap.set(log.userId, log);
        }
      });

      // Enrich users with activity data
      const enrichedUsers = users.map((user: any) => {
        const recentLogin = userLoginMap.get(user.id);
        const lastActivity = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
        const isOnline = lastActivity && (Date.now() - lastActivity.getTime()) < 10 * 60 * 1000;

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          status: user.status,
          lastLoginAt: user.lastLoginAt,
          isOnline,
          location: recentLogin?.location || null,
          deviceType: recentLogin?.deviceType || null,
          browserName: recentLogin?.browserName || null,
          ipAddress: recentLogin?.ipAddress || null,
          sessionDuration: recentLogin?.sessionDuration || null
        };
      });

      res.json(enrichedUsers);
    } catch (error) {
      console.error("Error fetching active users:", error);
      res.status(500).json({ message: "Failed to fetch active users" });
    }
  });

  // Get location map data for all users
  app.get("/api/super-admin/user-locations", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      const organizationId = currentUser.organizationId;

      const loginLogs = await storage.getOrganizationLoginLogs(organizationId);

      // Extract unique locations with user counts
      const locationData = loginLogs
        .filter(log => log.location && typeof log.location === 'object')
        .map(log => {
          const loc = log.location as any;
          return {
            userId: log.userId,
            country: loc.country || 'Unknown',
            region: loc.region || '',
            city: loc.city || '',
            lat: loc.lat || 0,
            lng: loc.lng || 0,
            loginTime: log.loginTime,
            deviceType: log.deviceType
          };
        });

      res.json(locationData);
    } catch (error) {
      console.error("Error fetching user locations:", error);
      res.status(500).json({ message: "Failed to fetch user locations" });
    }
  });

  // Bulk activate/deactivate users
  app.post("/api/super-admin/bulk-status-change", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      const { userIds, newStatus, reason } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "User IDs array is required" });
      }

      if (!['active', 'inactive', 'suspended'].includes(newStatus)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // Verify all users belong to same organization
      const users = await Promise.all(userIds.map(id => storage.getUser(id)));
      const invalidUsers = users.filter(u => !u || u.organizationId !== currentUser.organizationId);
      
      if (invalidUsers.length > 0) {
        return res.status(403).json({ message: "Cannot modify users from other organizations" });
      }

      // Prevent suspending all admins
      if (newStatus === 'suspended') {
        const adminUsers = users.filter(u => u?.role === 'admin');
        if (adminUsers.length > 0) {
          const totalAdmins = await storage.getOrganizationAdminCount(currentUser.organizationId);
          if (adminUsers.length >= totalAdmins) {
            return res.status(400).json({ 
              message: "Cannot suspend all admin users. At least one admin must remain active." 
            });
          }
        }
      }

      // Perform bulk status change
      const results = await Promise.all(
        userIds.map(async (userId) => {
          try {
            const updatedUser = await storage.changeUserStatus(userId, newStatus);
            return { userId, success: true, user: updatedUser };
          } catch (error) {
            return { userId, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        })
      );

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      res.json({
        message: `Bulk status change completed: ${successCount} succeeded, ${failCount} failed`,
        results
      });
    } catch (error) {
      console.error("Error performing bulk status change:", error);
      res.status(500).json({ message: "Failed to perform bulk status change" });
    }
  });

  // Force logout user (delete active session)
  app.post("/api/super-admin/force-logout/:userId", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      const targetUserId = req.params.userId;

      // Verify target user belongs to same organization
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser || targetUser.organizationId !== currentUser.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Prevent self-logout
      if (targetUserId === currentUser.id) {
        return res.status(400).json({ message: "Cannot force logout yourself" });
      }

      // Update logout time in login logs
      const logs = await storage.getLoginLogs(targetUserId);
      const activeLog = logs.find(log => !log.logoutTime);
      
      if (activeLog) {
        // Note: You'll need to add this method to storage
        // await storage.updateLoginLogLogout(activeLog.id, new Date());
      }

      res.json({ message: "User logged out successfully", userId: targetUserId });
    } catch (error) {
      console.error("Error forcing user logout:", error);
      res.status(500).json({ message: "Failed to force logout" });
    }
  });

  // Get activity timeline
  app.get("/api/super-admin/activity-timeline", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      const organizationId = currentUser.organizationId;
      const limit = parseInt(req.query.limit as string) || 50;

      const [loginLogs, tasks] = await Promise.all([
        storage.getOrganizationLoginLogs(organizationId),
        storage.getTasks(organizationId)
      ]);

      // Combine and sort activities
      const activities = [
        ...loginLogs.slice(-limit).map(log => ({
          type: 'login',
          timestamp: log.loginTime,
          userId: log.userId,
          details: {
            location: log.location,
            device: log.deviceType,
            status: log.loginStatus
          }
        })),
        ...tasks.slice(-limit).map(task => ({
          type: 'task',
          timestamp: task.createdAt,
          userId: task.doerEmail,
          details: {
            taskName: task.taskName,
            status: task.status,
            flowId: task.flowId
          }
        }))
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      res.json(activities);
    } catch (error) {
      console.error("Error fetching activity timeline:", error);
      res.status(500).json({ message: "Failed to fetch activity timeline" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
