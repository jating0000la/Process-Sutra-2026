import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertFlowRuleSchema,
  insertTaskSchema,
  insertFormTemplateSchema,
  insertFormResponseSchema,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { calculateTAT, TATConfig } from "./tatCalculator";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Flow Rules API
  app.get("/api/flow-rules", isAuthenticated, async (req, res) => {
    try {
      const { system } = req.query;
      const flowRules = await storage.getFlowRules(system as string);
      res.json(flowRules);
    } catch (error) {
      console.error("Error fetching flow rules:", error);
      res.status(500).json({ message: "Failed to fetch flow rules" });
    }
  });

  app.post("/api/flow-rules", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertFlowRuleSchema.parse(req.body);
      const flowRule = await storage.createFlowRule(validatedData);
      res.status(201).json(flowRule);
    } catch (error) {
      console.error("Error creating flow rule:", error);
      res.status(400).json({ message: "Invalid flow rule data" });
    }
  });

  app.post("/api/flow-rules/bulk", isAuthenticated, async (req, res) => {
    try {
      const { rules } = req.body;
      
      if (!Array.isArray(rules)) {
        return res.status(400).json({ message: "Rules must be an array" });
      }

      const createdRules = [];
      for (const ruleData of rules) {
        try {
          const validatedData = insertFlowRuleSchema.parse(ruleData);
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

  app.put("/api/flow-rules/:id", isAuthenticated, async (req, res) => {
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

  // Tasks API
  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const { status } = req.query;
      const tasks = await storage.getTasks(userEmail, status as string);
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
  app.post("/api/tasks/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.getTaskById(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Mark current task as completed
      const completedTask = await storage.updateTask(id, {
        status: "completed",
        actualTime: new Date(),
      });

      // Find next task in workflow
      const flowRules = await storage.getFlowRules(task.system);
      const nextRule = flowRules.find(
        rule => rule.currentTask === task.taskName && rule.status === "Done"
      );

      if (nextRule) {
        // Get TAT configuration for enhanced calculations
        const tatConfiguration = await storage.getTATConfig();
        const config = tatConfiguration || { officeStartHour: 9, officeEndHour: 18 };
        
        // Create next task using enhanced TAT calculation
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
        });
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
        updateData.actualTime = new Date();
      }
      
      // Update the task
      const updatedTask = await storage.updateTask(id, updateData);
      
      // Check for workflow progression based on new status
      const flowRules = await storage.getFlowRules(task.system);
      
      // Map status values to flow rule status values
      const statusMap: Record<string, string> = {
        "pending": "Pending",
        "in_progress": "In Progress", 
        "completed": "Done",
        "overdue": "Overdue"
      };
      
      const ruleStatus = statusMap[status];
      const nextRule = flowRules.find(
        rule => rule.currentTask === task.taskName && rule.status === ruleStatus
      );
      
      if (nextRule) {
        // Get TAT configuration for enhanced calculations
        const tatConfiguration = await storage.getTATConfig();
        const config = tatConfiguration || { officeStartHour: 9, officeEndHour: 18 };
        
        // Create next task based on current task status using enhanced TAT calculation
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
        });
      }
      
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  app.post("/api/flows/start", isAuthenticated, async (req, res) => {
    try {
      const { system, orderNumber } = req.body;
      
      // Find the starting rule (currentTask is empty)
      const flowRules = await storage.getFlowRules(system);
      const startRule = flowRules.find(rule => rule.currentTask === "");
      
      if (!startRule) {
        return res.status(400).json({ message: "No starting rule found for this system" });
      }

      const flowId = randomUUID();
      // Get TAT configuration for enhanced calculations
      const tatConfiguration = await storage.getTATConfig();
      const config = tatConfiguration || { officeStartHour: 9, officeEndHour: 18 };
      
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
      });

      res.status(201).json({ flowId, task });
    } catch (error) {
      console.error("Error starting flow:", error);
      res.status(500).json({ message: "Failed to start flow" });
    }
  });

  // Form Templates API
  app.get("/api/form-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await storage.getFormTemplates(userId);
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

  app.post("/api/form-templates", isAuthenticated, async (req: any, res) => {
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

  app.put("/api/form-templates/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/form-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFormTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting form template:", error);
      res.status(500).json({ message: "Failed to delete form template" });
    }
  });

  // Form Responses API
  app.get("/api/form-responses", isAuthenticated, async (req, res) => {
    try {
      const { flowId, taskId } = req.query;
      const responses = await storage.getFormResponses(flowId as string, taskId as string);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching form responses:", error);
      res.status(500).json({ message: "Failed to fetch form responses" });
    }
  });

  app.post("/api/form-responses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertFormResponseSchema.parse({
        ...req.body,
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

  // Analytics API
  app.get("/api/analytics/metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getTaskMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get("/api/analytics/flow-performance", isAuthenticated, async (req, res) => {
    try {
      const performance = await storage.getFlowPerformance();
      res.json(performance);
    } catch (error) {
      console.error("Error fetching flow performance:", error);
      res.status(500).json({ message: "Failed to fetch flow performance" });
    }
  });

  // TAT Configuration API
  app.get("/api/tat-config", isAuthenticated, async (req, res) => {
    try {
      const config = await storage.getTATConfig();
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

  app.post("/api/tat-config", isAuthenticated, async (req, res) => {
    try {
      const { officeStartHour, officeEndHour, timezone, skipWeekends } = req.body;
      const config = await storage.upsertTATConfig({
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

  const httpServer = createServer(app);
  return httpServer;
}
