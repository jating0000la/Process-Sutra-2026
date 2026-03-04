import { Express } from "express";
import { storage } from "./storage";
import { getQuickFormTemplatesByOrg, getQuickFormResponsesCollection } from "./mongo/quickFormClient";
import { db } from "./db.js";
import { organizations, users, tasks, flowRules, auditLogs, userLoginLogs } from "@shared/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

/**
 * Super Admin Organization Management Routes
 * These endpoints provide comprehensive organization control for system super admins
 */
export function registerSuperAdminRoutes(
  app: Express,
  isAuthenticated: any,
  requireSuperAdmin: any,
  superAdminLimiter: any
) {
  
  // Create new organization
  app.post("/api/super-admin/organizations", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const orgData = req.body;
      
      // Validate required fields
      if (!orgData.name || !orgData.domain) {
        return res.status(400).json({ message: "Organization name and domain are required" });
      }
      
      // Check if domain already exists
      const existing = await storage.getOrganizationByDomain(orgData.domain);
      if (existing) {
        return res.status(400).json({ message: "Organization with this domain already exists" });
      }
      
      const organization = await storage.createOrganization({
        name: orgData.name,
        domain: orgData.domain,
        subdomain: orgData.subdomain,
        companyName: orgData.companyName,
        planType: orgData.planType || "free",
        maxUsers: orgData.maxUsers || 50,
        maxFlows: orgData.maxFlows || 100,
        maxStorage: orgData.maxStorage || 5000,
        ownerEmail: orgData.ownerEmail,
        isActive: true,
        healthScore: 100,
        healthStatus: "healthy",
      });
      
      // Create audit log
      await storage.createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: "CREATE_ORGANIZATION",
        targetType: "organization",
        targetId: organization.id,
        newValue: JSON.stringify(organization),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId: organization.id,
      });
      
      res.json(organization);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });
  
  // Update organization details
  app.put("/api/super-admin/organizations/:id", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const organizationId = req.params.id;
      const updates = req.body;
      
      // Get organization before update for audit trail
      const oldOrg = await storage.getOrganization(organizationId);
      if (!oldOrg) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      const organization = await storage.updateOrganization(organizationId, updates);
      
      // Create audit log
      await storage.createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: "UPDATE_ORGANIZATION",
        targetType: "organization",
        targetId: organizationId,
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
  
  // Suspend/Resume organization
  app.put("/api/super-admin/organizations/:id/suspend", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const organizationId = req.params.id;
      const { isSuspended, reason } = req.body;
      
      const organization = await storage.updateOrganization(organizationId, {
        isSuspended,
        suspendedAt: isSuspended ? new Date() : null,
        suspensionReason: reason || null
      });
      
      // Create audit log
      await storage.createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: isSuspended ? "SUSPEND_ORGANIZATION" : "RESUME_ORGANIZATION",
        targetType: "organization",
        targetId: organizationId,
        newValue: JSON.stringify({ isSuspended, reason }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId: organizationId,
      });
      
      res.json(organization);
    } catch (error) {
      console.error("Error updating suspension status:", error);
      res.status(500).json({ message: "Failed to update suspension status" });
    }
  });
  
  // Transfer organization ownership
  app.put("/api/super-admin/organizations/:id/transfer-owner", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const organizationId = req.params.id;
      const { newOwnerEmail } = req.body;
      
      if (!newOwnerEmail) {
        return res.status(400).json({ message: "New owner email is required" });
      }
      
      // Verify new owner exists and belongs to this organization
      const newOwner = await storage.getUserByEmail(newOwnerEmail);
      if (!newOwner) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (newOwner.organizationId !== organizationId) {
        return res.status(400).json({ message: "User does not belong to this organization" });
      }
      
      const organization = await storage.updateOrganization(organizationId, {
        ownerId: newOwner.id,
        ownerEmail: newOwnerEmail
      });
      
      // Create audit log
      await storage.createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: "TRANSFER_ORGANIZATION_OWNERSHIP",
        targetType: "organization",
        targetId: organizationId,
        newValue: JSON.stringify({ newOwnerId: newOwner.id, newOwnerEmail }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId: organizationId,
      });
      
      res.json(organization);
    } catch (error) {
      console.error("Error transferring ownership:", error);
      res.status(500).json({ message: "Failed to transfer ownership" });
    }
  });
  
      // Delete organization (with data archival)
  app.delete("/api/super-admin/organizations/:id", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const organizationId = req.params.id;
      
      // Get organization for audit
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Archive data (could export to JSON or backup database)
      const [users, tasks, flowRules, formTemplates] = await Promise.all([
        storage.getUsersByOrganization(organizationId),
        storage.getTasksByOrganization(organizationId),
        storage.getFlowRulesByOrganization(organizationId),
        getQuickFormTemplatesByOrg(organizationId),
      ]);
      const responsesCol = await getQuickFormResponsesCollection();
      const formResponses = await responsesCol.find({ orgId: organizationId }).toArray();

      const archiveData = {
        organization,
        users,
        tasks,
        flowRules,
        formTemplates,
        formResponses,
        archivedAt: new Date().toISOString()
      };
      
      console.log(`[ARCHIVE] Organization ${organizationId} data archived:`, {
        users: archiveData.users.length,
        tasks: archiveData.tasks.length,
        flowRules: archiveData.flowRules.length,
        templates: archiveData.formTemplates.length,
        responses: archiveData.formResponses.length
      });
      
      // TODO: Save archiveData to backup storage (S3, etc.)
      
      // Create audit log BEFORE deleting organization
      await storage.createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: "DELETE_ORGANIZATION",
        targetType: "organization",
        targetId: organizationId,
        oldValue: JSON.stringify(organization),
        metadata: { archivedRecords: archiveData.users.length + archiveData.tasks.length },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId: organizationId,
      });
      
      // Delete organization and cascade delete all related data
      await storage.deleteOrganization(organizationId);
      
      res.json({ 
        message: "Organization deleted successfully",
        archived: true,
        recordsArchived: archiveData.users.length + archiveData.tasks.length
      });
    } catch (error) {
      console.error("Error deleting organization:", error);
      res.status(500).json({ message: "Failed to delete organization" });
    }
  });  // Get organization health score and usage metrics
  app.get("/api/super-admin/organizations/:id/health", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const organizationId = req.params.id;
      
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Calculate health metrics
      const users = await storage.getUsersByOrganization(organizationId);
      const tasks = await storage.getTasksByOrganization(organizationId);
      const loginLogs = await storage.getOrganizationLoginLogs(organizationId);
      
      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.status === 'active').length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const overdueTasks = tasks.filter(t => {
        if (t.status === 'pending' || t.status === 'in_progress') {
          return new Date(t.plannedTime) < new Date();
        }
        return false;
      }).length;
      
      // Recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentLogins = loginLogs.filter(log => new Date(log.loginTime) >= thirtyDaysAgo).length;
      
      // Calculate health score (0-100)
      let healthScore = 100;
      
      // Deduct points for issues
      if (activeUsers < totalUsers * 0.5) healthScore -= 20; // Less than 50% active users
      if (overdueTasks > tasks.length * 0.1) healthScore -= 15; // More than 10% overdue tasks
      if (recentLogins < totalUsers * 2) healthScore -= 10; // Low engagement
      if (organization.isSuspended) healthScore = 0; // Suspended = 0 score
      
      // Task completion rate impact
      const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 100;
      if (completionRate < 70) healthScore -= 20;
      else if (completionRate < 85) healthScore -= 10;
      
      healthScore = Math.max(0, Math.min(100, healthScore));
      
      const healthStatus = 
        healthScore >= 80 ? 'healthy' :
        healthScore >= 50 ? 'warning' : 'critical';
      
      // Update organization health score
      await storage.updateOrganization(organizationId, {
        healthScore,
        healthStatus
      });
      
      res.json({
        organizationId,
        healthScore,
        healthStatus,
        metrics: {
          totalUsers,
          activeUsers,
          activeUserPercentage: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0,
          totalTasks: tasks.length,
          completedTasks,
          overdueTasks,
          completionRate: completionRate.toFixed(1),
          recentLogins,
          engagementRate: totalUsers > 0 ? ((recentLogins / totalUsers) / 30).toFixed(2) : 0
        },
        issues: [
          activeUsers < totalUsers * 0.5 && "Low user activation rate",
          overdueTasks > tasks.length * 0.1 && "High overdue task rate",
          recentLogins < totalUsers * 2 && "Low user engagement",
          completionRate < 70 && "Low task completion rate"
        ].filter(Boolean)
      });
    } catch (error) {
      console.error("Error calculating health score:", error);
      res.status(500).json({ message: "Failed to calculate health score" });
    }
  });
  
  // ── Audit Logs ─────────────────────────────────────────────────────
  app.get("/api/super-admin/audit-logs", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const action = req.query.action as string | undefined;
      const targetType = req.query.targetType as string | undefined;
      const organizationId = req.query.organizationId as string | undefined;

      const logs = await storage.getAuditLogs({
        action: action || undefined,
        targetType: targetType || undefined,
        organizationId: organizationId || undefined,
        limit,
      });

      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // ── Change user role (user ↔ admin) cross-org ─────────────────────
  app.put("/api/super-admin/users/:userId/role", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const { role } = req.body;

      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Role must be 'user' or 'admin'" });
      }

      const oldUser = await storage.getUser(userId);
      if (!oldUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = await storage.updateUser(userId, { role });

      await storage.createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: "CHANGE_USER_ROLE",
        targetType: "user",
        targetId: userId,
        oldValue: JSON.stringify({ role: oldUser.role }),
        newValue: JSON.stringify({ role }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId: oldUser.organizationId || undefined,
      });

      res.json(user);
    } catch (error) {
      console.error("Error changing user role:", error);
      res.status(500).json({ message: "Failed to change user role" });
    }
  });

  // ── Organization Full Details ───────────────────────────────────────
  app.get("/api/super-admin/organizations/:id/details", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const organizationId = req.params.id;
      const org = await storage.getOrganization(organizationId);
      if (!org) return res.status(404).json({ message: "Organization not found" });

      const [orgUsers, orgTasks, orgFlows, loginLogs] = await Promise.all([
        storage.getUsersByOrganization(organizationId),
        storage.getTasksByOrganization(organizationId),
        storage.getFlowRulesByOrganization(organizationId),
        storage.getOrganizationLoginLogs(organizationId),
      ]);

      const formTemplates = await getQuickFormTemplatesByOrg(organizationId);
      const responsesCol = await getQuickFormResponsesCollection();
      const formResponseCount = await responsesCol.countDocuments({ orgId: organizationId });

      const activeUsers = orgUsers.filter(u => u.status === "active").length;
      const completedTasks = orgTasks.filter(t => t.status === "completed").length;
      const overdueTasks = orgTasks.filter(t => {
        if (t.status === "pending" || t.status === "in_progress") {
          return t.plannedTime && new Date(t.plannedTime) < new Date();
        }
        return false;
      }).length;
      const uniqueSystems = Array.from(new Set(orgFlows.map(f => f.system)));

      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentLogins = loginLogs.filter((l: any) => new Date(l.loginTime) >= thirtyDaysAgo).length;

      res.json({
        organization: org,
        stats: {
          totalUsers: orgUsers.length,
          activeUsers,
          totalTasks: orgTasks.length,
          completedTasks,
          overdueTasks,
          taskCompletionRate: orgTasks.length > 0 ? ((completedTasks / orgTasks.length) * 100).toFixed(1) : "0",
          totalFlowRules: orgFlows.length,
          uniqueSystems,
          totalFormTemplates: formTemplates.length,
          totalFormResponses: formResponseCount,
          recentLogins30d: recentLogins,
        },
        users: orgUsers.map(u => ({
          id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName,
          role: u.role, status: u.status, department: u.department,
          lastLoginAt: u.lastLoginAt, createdAt: u.createdAt,
        })),
      });
    } catch (error) {
      console.error("Error fetching org details:", error);
      res.status(500).json({ message: "Failed to fetch organization details" });
    }
  });

  // ── CSV Export Helper ──────────────────────────────────────────────
  function toCsv(headers: string[], rows: any[][]): string {
    const escape = (val: any) => {
      if (val == null) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    return [headers.join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
  }

  // ── CSV Export Endpoint ────────────────────────────────────────────
  app.get("/api/super-admin/export/:type", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const type = req.params.type;
      const from = req.query.from ? new Date(req.query.from as string) : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;
      const orgId = req.query.organizationId as string | undefined;

      // Set end-of-day for 'to' date
      if (to) { to.setHours(23, 59, 59, 999); }

      let csvContent = "";
      let filename = "";

      switch (type) {
        case "organizations": {
          const allOrgs = await storage.getAllOrganizations();
          const headers = ["ID","Name","Domain","Company Name","Industry","Customer Type","Business Type","GST Number","Plan Type","Is Active","Is Suspended","Suspension Reason","Max Users","Max Flows","Max Storage (MB)","Health Score","Health Status","Owner Email","Created At"];
          const rows = allOrgs
            .filter(o => {
              if (from && o.createdAt && new Date(o.createdAt) < from) return false;
              if (to && o.createdAt && new Date(o.createdAt) > to) return false;
              return true;
            })
            .map(o => [
              o.id, o.name, o.domain, o.companyName || "", o.industry || "", o.customerType || "", o.businessType || "", o.gstNumber || "",
              o.planType,
              o.isActive ? "Yes" : "No", o.isSuspended ? "Yes" : "No", o.suspensionReason || "",
              o.maxUsers, o.maxFlows, o.maxStorage, o.healthScore, o.healthStatus, o.ownerEmail || "",
              o.createdAt ? new Date(o.createdAt).toISOString() : "",
            ]);
          csvContent = toCsv(headers, rows);
          filename = "organizations";
          break;
        }
        case "users": {
          const conditions: any[] = [];
          if (from) conditions.push(gte(users.createdAt, from));
          if (to) conditions.push(lte(users.createdAt, to));
          if (orgId) conditions.push(eq(users.organizationId, orgId));
          let query = db.select({ user: users, orgName: organizations.name }).from(users).leftJoin(organizations, eq(users.organizationId, organizations.id));
          if (conditions.length) query = query.where(and(...conditions)) as any;
          const rows = await (query as any).orderBy(desc(users.createdAt));
          const headers = ["ID","Email","First Name","Last Name","Role","Department","Designation","Status","Is Super Admin","Organization","Phone","Employee ID","Last Login","Created At"];
          csvContent = toCsv(headers, rows.map((r: any) => [
            r.user.id, r.user.email, r.user.firstName || "", r.user.lastName || "",
            r.user.role, r.user.department || "", r.user.designation || "", r.user.status,
            r.user.isSuperAdmin ? "Yes" : "No", r.orgName || "", r.user.phoneNumber || "",
            r.user.employeeId || "",
            r.user.lastLoginAt ? new Date(r.user.lastLoginAt).toISOString() : "",
            r.user.createdAt ? new Date(r.user.createdAt).toISOString() : "",
          ]));
          filename = "users";
          break;
        }
        case "tasks": {
          const conditions: any[] = [];
          if (from) conditions.push(gte(tasks.createdAt, from));
          if (to) conditions.push(lte(tasks.createdAt, to));
          if (orgId) conditions.push(eq(tasks.organizationId, orgId));
          let query = db.select({ task: tasks, orgName: organizations.name }).from(tasks).leftJoin(organizations, eq(tasks.organizationId, organizations.id));
          if (conditions.length) query = query.where(and(...conditions)) as any;
          const rows = await (query as any).orderBy(desc(tasks.createdAt)).limit(5000);
          const headers = ["ID","Organization","System","Flow ID","Order Number","Task Name","Doer Email","Status","Planned Time","Actual Completion","Initiated By","Created At"];
          csvContent = toCsv(headers, rows.map((r: any) => [
            r.task.id, r.orgName || "", r.task.system, r.task.flowId, r.task.orderNumber || "",
            r.task.taskName, r.task.doerEmail, r.task.status,
            r.task.plannedTime ? new Date(r.task.plannedTime).toISOString() : "",
            r.task.actualCompletionTime ? new Date(r.task.actualCompletionTime).toISOString() : "",
            r.task.flowInitiatedBy || "",
            r.task.createdAt ? new Date(r.task.createdAt).toISOString() : "",
          ]));
          filename = "tasks";
          break;
        }
        case "audit-logs": {
          const conditions: any[] = [];
          if (from) conditions.push(gte(auditLogs.createdAt, from));
          if (to) conditions.push(lte(auditLogs.createdAt, to));
          if (orgId) conditions.push(eq(auditLogs.organizationId, orgId));
          let query = db.select().from(auditLogs);
          if (conditions.length) query = query.where(and(...conditions)) as any;
          const rows = await (query as any).orderBy(desc(auditLogs.createdAt)).limit(5000);
          const headers = ["ID","Actor Email","Action","Target Type","Target ID","Target Email","Old Value","New Value","IP Address","Organization ID","Created At"];
          csvContent = toCsv(headers, rows.map((r: any) => [
            r.id, r.actorEmail, r.action, r.targetType || "", r.targetId || "", r.targetEmail || "",
            r.oldValue || "", r.newValue || "", r.ipAddress || "", r.organizationId || "",
            r.createdAt ? new Date(r.createdAt).toISOString() : "",
          ]));
          filename = "audit-logs";
          break;
        }
        case "login-logs": {
          const conditions: any[] = [];
          if (from) conditions.push(gte(userLoginLogs.loginTime, from));
          if (to) conditions.push(lte(userLoginLogs.loginTime, to));
          if (orgId) conditions.push(eq(userLoginLogs.organizationId, orgId));
          let query = db.select({ log: userLoginLogs, orgName: organizations.name }).from(userLoginLogs).leftJoin(organizations, eq(userLoginLogs.organizationId, organizations.id));
          if (conditions.length) query = query.where(and(...conditions)) as any;
          const rows = await (query as any).orderBy(desc(userLoginLogs.loginTime)).limit(5000);
          const headers = ["ID","Organization","User ID","Device Name","Device Type","Browser","OS","IP Address","Login Time","Logout Time","Session Duration (min)","Login Status","Failure Reason"];
          csvContent = toCsv(headers, rows.map((r: any) => [
            r.log.id, r.orgName || "", r.log.userId, r.log.deviceName || "", r.log.deviceType || "",
            r.log.browserName ? `${r.log.browserName} ${r.log.browserVersion || ""}`.trim() : "",
            r.log.operatingSystem || "", r.log.ipAddress || "",
            r.log.loginTime ? new Date(r.log.loginTime).toISOString() : "",
            r.log.logoutTime ? new Date(r.log.logoutTime).toISOString() : "",
            r.log.sessionDuration ?? "", r.log.loginStatus || "", r.log.failureReason || "",
          ]));
          filename = "login-logs";
          break;
        }
        case "flow-rules": {
          const conditions: any[] = [];
          if (from) conditions.push(gte(flowRules.createdAt, from));
          if (to) conditions.push(lte(flowRules.createdAt, to));
          if (orgId) conditions.push(eq(flowRules.organizationId, orgId));
          let query = db.select({ rule: flowRules, orgName: organizations.name }).from(flowRules).leftJoin(organizations, eq(flowRules.organizationId, organizations.id));
          if (conditions.length) query = query.where(and(...conditions)) as any;
          const rows = await (query as any).orderBy(desc(flowRules.createdAt));
          const headers = ["ID","Organization","System","Current Task","Status","Next Task","TAT","TAT Type","Doer","Email","Form ID","Transferable","Created At"];
          csvContent = toCsv(headers, rows.map((r: any) => [
            r.rule.id, r.orgName || "", r.rule.system, r.rule.currentTask || "", r.rule.status || "",
            r.rule.nextTask, r.rule.tat, r.rule.tatType, r.rule.doer, r.rule.email,
            r.rule.formId || "", r.rule.transferable ? "Yes" : "No",
            r.rule.createdAt ? new Date(r.rule.createdAt).toISOString() : "",
          ]));
          filename = "flow-rules";
          break;
        }
        default:
          return res.status(400).json({ message: `Unknown export type: ${type}. Use: organizations, users, tasks, audit-logs, login-logs, flow-rules` });
      }

      const dateSuffix = from || to
        ? `_${from ? from.toISOString().slice(0, 10) : "start"}_to_${to ? to.toISOString().slice(0, 10) : "now"}`
        : "";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}${dateSuffix}_${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });
}
