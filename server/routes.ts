import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./firebaseAuth";
import {
  insertFlowRuleSchema,
  insertTaskSchema,
  insertFormTemplateSchema,
  insertFormResponseSchema,
  insertOrganizationSchema,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { calculateTAT, TATConfig } from "./tatCalculator";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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

  app.post("/api/flow-rules", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      const dataWithOrganization = {
        ...req.body,
        organizationId: currentUser.organizationId
      };
      const validatedData = insertFlowRuleSchema.parse(dataWithOrganization);
      const flowRule = await storage.createFlowRule(validatedData);
      res.status(201).json(flowRule);
    } catch (error) {
      console.error("Error creating flow rule:", error);
      res.status(400).json({ message: "Invalid flow rule data" });
    }
  });

  app.post("/api/flow-rules/bulk", isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res) => {
    try {
      const currentUser = req.currentUser;
      const { rules } = req.body;
      
      if (!Array.isArray(rules)) {
        return res.status(400).json({ message: "Rules must be an array" });
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
      
      res.status(201).json({ 
        message: `Successfully created ${createdRules.length} flow rules`,
        rules: createdRules 
      });
    } catch (error) {
      console.error("Error creating bulk flow rules:", error);
      res.status(500).json({ message: "Failed to create bulk flow rules" });
    }
  });

  app.put("/api/flow-rules/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertFlowRuleSchema.partial().parse(req.body);
      const flowRule = await storage.updateFlowRule(id, validatedData);
      res.json(flowRule);
    } catch (error) {
      console.error("Error updating flow rule:", error);
      res.status(400).json({ message: "Invalid flow rule data" });
    }
  });

  app.delete("/api/flow-rules/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFlowRule(id);
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

      // Get all previous form data for this flow to include in new tasks
      const previousFormResponses = await storage.getFormResponsesByFlowId(task.flowId);
      const flowInitialData = previousFormResponses.length > 0 ? previousFormResponses[0].formData : null;

      if (nextRules.length > 0) {
        // Get TAT configuration for enhanced calculations
        const tatConfiguration = await storage.getTATConfig(user.organizationId);
        const config = tatConfiguration || { officeStartHour: 9, officeEndHour: 18 };
        
        // Create ALL next tasks using enhanced TAT calculation
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

  app.patch("/api/tasks/:id/status", isAuthenticated, async (req, res) => {
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
      
      // Get all previous form data for this flow to include in new tasks
      const previousFormResponses = await storage.getFormResponsesByFlowId(task.flowId);
      const flowInitialData = previousFormResponses.length > 0 ? previousFormResponses[0].formData : null;
      
      if (nextRules.length > 0) {
        // Get TAT configuration for enhanced calculations
        const tatConfiguration = await storage.getTATConfig(user.organizationId);
        const config = tatConfiguration || { officeStartHour: 9, officeEndHour: 18 };
        
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
            organizationId: user.organizationId, // Include organization ID for new tasks
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
  app.post("/api/tasks/:id/transfer", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { toEmail, reason } = req.body;
      const userId = (req.user as any)?.claims?.sub;
      
      if (!toEmail) {
        return res.status(400).json({ message: "Transfer email is required" });
      }

      // Get current task details
      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check if task is transferable (get flow rule) - organization-specific
      const user = await storage.getUser((req.user as any)?.claims?.sub);
      const flowRules = await storage.getFlowRulesByOrganization(user?.organizationId!, task.system);
      const currentRule = flowRules.find(rule => rule.nextTask === task.taskName);
      
      if (!currentRule?.transferable) {
        return res.status(400).json({ message: "This task is not transferable according to flow rules" });
      }

      // Update task with transfer information
      const transferredTask = await storage.updateTask(id, {
        doerEmail: toEmail,
        originalAssignee: task.originalAssignee || task.doerEmail,
        transferredBy: userId,
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
      const config = tatConfiguration || { officeStartHour: 9, officeEndHour: 18 };
      
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

  app.get("/api/form-templates/:formId", isAuthenticated, async (req, res) => {
    try {
      const { formId } = req.params;
      const template = await storage.getFormTemplateByFormId(formId);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching form template:", error);
      res.status(500).json({ message: "Failed to fetch form template" });
    }
  });

  // Auto-prefill endpoint - get previous form responses for a flow
  app.get("/api/flows/:flowId/responses", isAuthenticated, async (req, res) => {
    try {
      const { flowId } = req.params;
      const formResponses = await storage.getFormResponsesByFlowId(flowId);
      
      // Return all form responses in chronological order for auto-prefill
      const responses = formResponses.map(response => ({
        id: response.id,
        taskId: response.taskId,
        formData: response.formData,
        submittedAt: response.timestamp ? new Date(response.timestamp).toISOString() : new Date().toISOString(),
      })).sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
      
      res.json(responses);
    } catch (error) {
      console.error("Error fetching flow responses:", error);
      res.status(500).json({ message: "Failed to fetch flow responses" });
    }
  });

  app.post("/api/form-templates", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertFormTemplateSchema.parse({
        ...req.body,
        createdBy: userId,
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

  app.delete("/api/form-templates/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
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
      const responses = await storage.getFormResponsesByOrganization(user.organizationId, flowId as string, taskId as string);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching form responses:", error);
      res.status(500).json({ message: "Failed to fetch form responses" });
    }
  });

  app.post("/api/form-responses", isAuthenticated, addUserToRequest, async (req: any, res) => {
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
      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating form response:", error);
      res.status(400).json({ message: "Invalid form response data" });
    }
  });

  app.get("/api/flows/:flowId/responses", isAuthenticated, async (req, res) => {
    try {
      const { flowId } = req.params;
      const responses = await storage.getFormResponsesByFlowId(flowId);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching flow responses:", error);
      res.status(500).json({ message: "Failed to fetch flow responses" });
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
        officeEndHour: 18,
        timezone: "Asia/Kolkata",
        skipWeekends: true
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
      const config = await storage.upsertTATConfig(currentUser?.organizationId || "", {
        officeStartHour,
        officeEndHour,
        timezone,
        skipWeekends
      });
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
      if (error.code === '23505' && error.constraint === 'users_username_key') {
        res.status(400).json({ message: "Username already exists. Please choose a different username." });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.put("/api/users/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const user = await storage.updateUserDetails(req.params.id, req.body);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.put("/api/users/:id/status", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const user = await storage.changeUserStatus(req.params.id, req.body.status);
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
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

  const httpServer = createServer(app);
  return httpServer;
}
