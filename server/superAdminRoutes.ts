import { Express } from "express";
import multer from "multer";
import { storage } from "./storage";
import { getQuickFormTemplatesByOrg, getQuickFormResponsesCollection } from "./mongo/quickFormClient";
import { db } from "./db.js";
import {
  organizations, users, tasks, flowRules, auditLogs, userLoginLogs,
  subscriptionPlans, organizationSubscriptions, paymentTransactions, usageLogs,
  invoices,
} from "@shared/schema";
import { eq, desc, sql, and, gte, lte, count } from "drizzle-orm";
import { uploadFileToDrive } from "./services/googleDriveService";
import { getOAuth2Client } from "./services/googleOAuth";
import { ensureValidToken } from "./utils/tokenRefresh";

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

      // Sanitize input fields
      if (typeof orgData.name !== 'string' || orgData.name.length > 200) {
        return res.status(400).json({ message: "Invalid organization name" });
      }
      if (typeof orgData.domain !== 'string' || orgData.domain.length > 100) {
        return res.status(400).json({ message: "Invalid domain" });
      }
      // Strip HTML tags from text fields
      const stripTags = (s: any) => typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim() : s;
      orgData.name = stripTags(orgData.name);
      orgData.domain = stripTags(orgData.domain).toLowerCase();
      if (orgData.companyName) orgData.companyName = stripTags(orgData.companyName);
      if (orgData.ownerEmail) orgData.ownerEmail = stripTags(orgData.ownerEmail).toLowerCase();
      
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
      const rawUpdates = req.body;
      
      // SECURITY: Whitelist allowed fields to prevent injection of sensitive fields
      const ALLOWED_UPDATE_FIELDS = [
        'name', 'domain', 'subdomain', 'companyName', 'logoUrl', 'primaryColor',
        'isActive', 'maxUsers', 'maxFlows', 'maxStorage', 'planType',
        'address', 'phone', 'gstNumber', 'industry', 'customerType', 'businessType',
        'ownerEmail', 'ownerId', 'healthScore', 'healthStatus',
      ];
      const updates: Record<string, any> = {};
      for (const key of ALLOWED_UPDATE_FIELDS) {
        if (key in rawUpdates) {
          updates[key] = rawUpdates[key];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
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
      let str = String(val);
      // CSV injection prevention: prefix cells starting with dangerous chars
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
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

  // ═══════════════════════════════════════════════════════════════════════
  //  SUPER ADMIN — BILLING MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════

  // ── GET all billing info for an organization ─────────────────────────
  app.get("/api/super-admin/organizations/:id/billing", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const organizationId = req.params.id;

      const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
      if (!org) return res.status(404).json({ message: "Organization not found" });

      // Safely query billing tables — they may not exist yet if migrations haven't run
      let subscription = null;
      let plan = null;
      let scheduledPlan = null;
      let subscriptionHistory: any[] = [];
      let payments: any[] = [];
      let allPlans: any[] = [];

      try {
        // Active subscription
        const [sub] = await db
          .select()
          .from(organizationSubscriptions)
          .where(and(
            eq(organizationSubscriptions.organizationId, organizationId),
            eq(organizationSubscriptions.status, "active")
          ))
          .orderBy(desc(organizationSubscriptions.createdAt))
          .limit(1);
        subscription = sub || null;

        // Current plan
        if (subscription) {
          const [p] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, subscription.planId));
          plan = p || null;
        }

        // Scheduled upgrade plan
        if (subscription?.scheduledPlanId) {
          const [sp] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, subscription.scheduledPlanId));
          scheduledPlan = sp || null;
        }

        // All subscriptions history
        subscriptionHistory = await db
          .select()
          .from(organizationSubscriptions)
          .where(eq(organizationSubscriptions.organizationId, organizationId))
          .orderBy(desc(organizationSubscriptions.createdAt))
          .limit(20);
      } catch (subErr: any) {
        // Tables may not exist — log and continue with empty data
        console.warn("[SuperAdmin] Billing tables query failed (tables may not exist):", subErr?.message || subErr);
      }

      try {
        // Payment transactions
        payments = await db
          .select()
          .from(paymentTransactions)
          .where(eq(paymentTransactions.organizationId, organizationId))
          .orderBy(desc(paymentTransactions.createdAt))
          .limit(50);
      } catch (payErr: any) {
        console.warn("[SuperAdmin] Payment transactions query failed:", payErr?.message || payErr);
      }

      try {
        // All plans
        allPlans = await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.isActive, true))
          .orderBy(subscriptionPlans.sortOrder);
      } catch (planErr: any) {
        console.warn("[SuperAdmin] Subscription plans query failed:", planErr?.message || planErr);
      }

      res.json({
        organization: org,
        subscription,
        plan,
        scheduledPlan,
        subscriptionHistory,
        payments,
        allPlans,
      });
    } catch (error: any) {
      console.error("[SuperAdmin] Error fetching billing:", error?.message || error);
      res.status(500).json({ message: "Failed to fetch billing info", detail: error?.message });
    }
  });

  // ── Manually confirm a pending payment (callback failure recovery) ───
  app.post("/api/super-admin/billing/confirm-payment", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const { txnId, payuMihpayid, paymentMode, notes, planName: manualPlanName } = req.body;
      if (!txnId) return res.status(400).json({ message: "Transaction ID is required" });

      const [transaction] = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.txnId, txnId));

      if (!transaction) return res.status(404).json({ message: "Transaction not found" });

      if (transaction.status === "success") {
        return res.status(400).json({ message: "Transaction already confirmed" });
      }

      // Mark transaction as success
      await db
        .update(paymentTransactions)
        .set({
          status: "success",
          payuMihpayid: payuMihpayid || `MANUAL_${Date.now()}`,
          paymentMode: paymentMode || "MANUAL",
          errorMessage: `Manually confirmed by super admin: ${req.currentUser.email}. ${notes || ""}`,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, transaction.id));

      // Now process the subscription activation

      // Determine target plan from productinfo pattern or payment type
      const planNames = ["starter", "growth", "business"];
      let targetPlanName = "";
      // Try to find plan name from the transaction context
      if (transaction.paymentType === "subscription" || transaction.paymentType === "combined") {
        // Look for plan reference via PayU response or any stored data
        const payuResp = transaction.payuResponse as any;
        const productinfo = payuResp?.productinfo || "";
        for (const pn of planNames) {
          if (productinfo.toLowerCase().includes(pn)) {
            targetPlanName = pn;
            break;
          }
        }
        // Fallback: use manually provided planName if productinfo didn't match
        if (!targetPlanName && manualPlanName && planNames.includes(manualPlanName)) {
          targetPlanName = manualPlanName;
        }
      }

      if (targetPlanName) {
        const [plan] = await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.name, targetPlanName));

        if (plan) {
          const now = new Date();

          // Check for existing active subscription
          const [existingSub] = await db
            .select()
            .from(organizationSubscriptions)
            .where(and(
              eq(organizationSubscriptions.organizationId, transaction.organizationId),
              eq(organizationSubscriptions.status, "active")
            ))
            .orderBy(desc(organizationSubscriptions.createdAt))
            .limit(1);

          if (existingSub && new Date(existingSub.billingCycleEnd) > now) {
            // Schedule upgrade (deferred)
            await db
              .update(organizationSubscriptions)
              .set({
                scheduledPlanId: plan.id,
                scheduledPaymentId: transaction.txnId,
                scheduledAt: now,
                updatedAt: now,
              })
              .where(eq(organizationSubscriptions.id, existingSub.id));
          } else {
            // Activate immediately
            if (existingSub) {
              await db.update(organizationSubscriptions)
                .set({ status: "expired", updatedAt: now })
                .where(eq(organizationSubscriptions.id, existingSub.id));
            }

            const billingEnd = new Date(now);
            billingEnd.setMonth(billingEnd.getMonth() + 1);

            const orgUsers = await db.select({ count: count() }).from(users).where(eq(users.organizationId, transaction.organizationId));

            await db.insert(organizationSubscriptions).values({
              organizationId: transaction.organizationId,
              planId: plan.id,
              status: "active",
              billingCycleStart: now,
              billingCycleEnd: billingEnd,
              usedUsers: orgUsers[0]?.count || 0,
              outstandingAmount: 0,
            });

            await db.update(organizations).set({
              planType: targetPlanName,
              maxUsers: plan.maxUsers,
              maxFlows: plan.maxFlows,
              updatedAt: now,
            }).where(eq(organizations.id, transaction.organizationId));
          }
        }
      }

      // Clear outstanding if payment type was outstanding/combined
      if (transaction.paymentType === "outstanding" || transaction.paymentType === "combined") {
        await db.update(organizationSubscriptions)
          .set({ outstandingAmount: 0, updatedAt: new Date() })
          .where(and(
            eq(organizationSubscriptions.organizationId, transaction.organizationId),
            eq(organizationSubscriptions.status, "active")
          ));
      }

      // Audit log
      await storage.createAuditLog({
        actorId: req.currentUser.id,
        actorEmail: req.currentUser.email,
        action: "MANUAL_PAYMENT_CONFIRMATION",
        targetType: "payment",
        targetId: transaction.id,
        newValue: JSON.stringify({ txnId, payuMihpayid, paymentMode, notes, targetPlanName }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId: transaction.organizationId,
      });

      console.log(`[SuperAdmin] Payment manually confirmed: txn=${txnId} by ${req.currentUser.email}`);
      res.json({ message: "Payment confirmed and subscription updated", txnId });
    } catch (error) {
      console.error("[SuperAdmin] Error confirming payment:", error);
      res.status(500).json({ message: "Failed to confirm payment" });
    }
  });

  // ── Force change organization plan (no payment involved) ─────────────
  app.post("/api/super-admin/billing/change-plan", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const { organizationId, planName, reason, immediate } = req.body;
      if (!organizationId || !planName) {
        return res.status(400).json({ message: "Organization ID and plan name are required" });
      }

      const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
      if (!org) return res.status(404).json({ message: "Organization not found" });

      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(and(eq(subscriptionPlans.name, planName), eq(subscriptionPlans.isActive, true)));
      if (!plan) return res.status(404).json({ message: "Plan not found" });

      const now = new Date();

      // Get current active subscription
      const [existingSub] = await db
        .select()
        .from(organizationSubscriptions)
        .where(and(
          eq(organizationSubscriptions.organizationId, organizationId),
          eq(organizationSubscriptions.status, "active")
        ))
        .orderBy(desc(organizationSubscriptions.createdAt))
        .limit(1);

      if (immediate || !existingSub || new Date(existingSub.billingCycleEnd) <= now) {
        // Immediate plan change
        if (existingSub) {
          await db.update(organizationSubscriptions)
            .set({ status: "expired", updatedAt: now })
            .where(eq(organizationSubscriptions.id, existingSub.id));
        }

        const billingEnd = new Date(now);
        billingEnd.setMonth(billingEnd.getMonth() + 1);

        const orgUsers = await db.select({ count: count() }).from(users).where(eq(users.organizationId, organizationId));

        await db.insert(organizationSubscriptions).values({
          organizationId,
          planId: plan.id,
          status: "active",
          billingCycleStart: now,
          billingCycleEnd: billingEnd,
          usedUsers: orgUsers[0]?.count || 0,
          outstandingAmount: 0,
        });

        await db.update(organizations).set({
          planType: planName,
          maxUsers: plan.maxUsers,
          maxFlows: plan.maxFlows,
          updatedAt: now,
        }).where(eq(organizations.id, organizationId));

        console.log(`[SuperAdmin] Plan changed immediately: org=${organizationId} plan=${planName}`);
      } else {
        // Schedule for end of current billing cycle
        await db.update(organizationSubscriptions).set({
          scheduledPlanId: plan.id,
          scheduledPaymentId: null,
          scheduledAt: now,
          updatedAt: now,
        }).where(eq(organizationSubscriptions.id, existingSub.id));

        console.log(`[SuperAdmin] Plan change scheduled: org=${organizationId} plan=${planName} after ${existingSub.billingCycleEnd}`);
      }

      await storage.createAuditLog({
        actorId: req.currentUser.id,
        actorEmail: req.currentUser.email,
        action: "FORCE_PLAN_CHANGE",
        targetType: "organization",
        targetId: organizationId,
        oldValue: JSON.stringify({ planType: org.planType }),
        newValue: JSON.stringify({ planName, immediate, reason }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId,
      });

      res.json({ message: `Plan ${immediate ? "changed immediately" : "scheduled for change"} to ${plan.displayName}` });
    } catch (error) {
      console.error("[SuperAdmin] Error changing plan:", error);
      res.status(500).json({ message: "Failed to change plan" });
    }
  });

  // ── Adjust outstanding amount ─────────────────────────────────────────
  app.post("/api/super-admin/billing/adjust-outstanding", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const { organizationId, amount, reason } = req.body;
      if (!organizationId || amount === undefined) {
        return res.status(400).json({ message: "Organization ID and amount are required" });
      }

      // Validate amount is a finite non-negative number
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount < 0 || parsedAmount > 10000000) {
        return res.status(400).json({ message: "Amount must be a valid number between 0 and 10,000,000" });
      }

      const [subscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(and(
          eq(organizationSubscriptions.organizationId, organizationId),
          eq(organizationSubscriptions.status, "active")
        ))
        .orderBy(desc(organizationSubscriptions.createdAt))
        .limit(1);

      if (!subscription) return res.status(404).json({ message: "No active subscription found" });

      const oldAmount = subscription.outstandingAmount || 0;

      await db.update(organizationSubscriptions).set({
        outstandingAmount: Math.max(0, Math.round(parsedAmount)),
        updatedAt: new Date(),
      }).where(eq(organizationSubscriptions.id, subscription.id));

      await storage.createAuditLog({
        actorId: req.currentUser.id,
        actorEmail: req.currentUser.email,
        action: "ADJUST_OUTSTANDING",
        targetType: "subscription",
        targetId: subscription.id,
        oldValue: JSON.stringify({ outstandingAmount: oldAmount }),
        newValue: JSON.stringify({ outstandingAmount: amount, reason }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId,
      });

      res.json({ message: `Outstanding adjusted from ₹${oldAmount} to ₹${amount}` });
    } catch (error) {
      console.error("[SuperAdmin] Error adjusting outstanding:", error);
      res.status(500).json({ message: "Failed to adjust outstanding" });
    }
  });

  // ── Reset usage counters ──────────────────────────────────────────────
  app.post("/api/super-admin/billing/reset-usage", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const { organizationId, resetFlows, resetSubmissions, resetUsers } = req.body;
      if (!organizationId) return res.status(400).json({ message: "Organization ID is required" });

      const [subscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(and(
          eq(organizationSubscriptions.organizationId, organizationId),
          eq(organizationSubscriptions.status, "active")
        ))
        .orderBy(desc(organizationSubscriptions.createdAt))
        .limit(1);

      if (!subscription) return res.status(404).json({ message: "No active subscription found" });

      const updates: any = { updatedAt: new Date() };
      if (resetFlows) updates.usedFlows = 0;
      if (resetSubmissions) updates.usedFormSubmissions = 0;
      if (resetUsers) {
        const orgUsers = await db.select({ count: count() }).from(users).where(eq(users.organizationId, organizationId));
        updates.usedUsers = orgUsers[0]?.count || 0;
      }

      await db.update(organizationSubscriptions).set(updates).where(eq(organizationSubscriptions.id, subscription.id));

      await storage.createAuditLog({
        actorId: req.currentUser.id,
        actorEmail: req.currentUser.email,
        action: "RESET_USAGE_COUNTERS",
        targetType: "subscription",
        targetId: subscription.id,
        newValue: JSON.stringify({ resetFlows, resetSubmissions, resetUsers }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId,
      });

      res.json({ message: "Usage counters reset successfully" });
    } catch (error) {
      console.error("[SuperAdmin] Error resetting usage:", error);
      res.status(500).json({ message: "Failed to reset usage" });
    }
  });

  // ── Cancel scheduled upgrade ──────────────────────────────────────────
  app.post("/api/super-admin/billing/cancel-scheduled-upgrade", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const { organizationId } = req.body;
      if (!organizationId) return res.status(400).json({ message: "Organization ID is required" });

      const [subscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(and(
          eq(organizationSubscriptions.organizationId, organizationId),
          eq(organizationSubscriptions.status, "active")
        ))
        .orderBy(desc(organizationSubscriptions.createdAt))
        .limit(1);

      if (!subscription || !subscription.scheduledPlanId) {
        return res.status(400).json({ message: "No scheduled upgrade to cancel" });
      }

      await db.update(organizationSubscriptions).set({
        scheduledPlanId: null,
        scheduledPaymentId: null,
        scheduledAt: null,
        updatedAt: new Date(),
      }).where(eq(organizationSubscriptions.id, subscription.id));

      await storage.createAuditLog({
        actorId: req.currentUser.id,
        actorEmail: req.currentUser.email,
        action: "CANCEL_SCHEDULED_UPGRADE",
        targetType: "subscription",
        targetId: subscription.id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId,
      });

      res.json({ message: "Scheduled upgrade cancelled" });
    } catch (error) {
      console.error("[SuperAdmin] Error cancelling scheduled upgrade:", error);
      res.status(500).json({ message: "Failed to cancel scheduled upgrade" });
    }
  });

  // ── Mark payment as failed (manual override) ─────────────────────────
  app.post("/api/super-admin/billing/fail-payment", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const { txnId, reason } = req.body;
      if (!txnId) return res.status(400).json({ message: "Transaction ID is required" });

      const [transaction] = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.txnId, txnId));

      if (!transaction) return res.status(404).json({ message: "Transaction not found" });
      if (transaction.status === "success") {
        return res.status(400).json({ message: "Cannot mark a successful payment as failed" });
      }

      await db.update(paymentTransactions).set({
        status: "failed",
        errorMessage: `Manually marked as failed by super admin: ${req.currentUser.email}. ${reason || ""}`,
        updatedAt: new Date(),
      }).where(eq(paymentTransactions.id, transaction.id));

      await storage.createAuditLog({
        actorId: req.currentUser.id,
        actorEmail: req.currentUser.email,
        action: "MANUAL_PAYMENT_FAILURE",
        targetType: "payment",
        targetId: transaction.id,
        newValue: JSON.stringify({ txnId, reason }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId: transaction.organizationId,
      });

      res.json({ message: "Payment marked as failed" });
    } catch (error) {
      console.error("[SuperAdmin] Error failing payment:", error);
      res.status(500).json({ message: "Failed to update payment" });
    }
  });

  // ── Extend billing cycle ──────────────────────────────────────────────
  app.post("/api/super-admin/billing/extend-cycle", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const { organizationId, extraDays, reason } = req.body;
      if (!organizationId || !extraDays) {
        return res.status(400).json({ message: "Organization ID and extra days are required" });
      }

      // Validate extraDays bounds
      const parsedDays = Number(extraDays);
      if (!Number.isFinite(parsedDays) || parsedDays < 1 || parsedDays > 365) {
        return res.status(400).json({ message: "Extra days must be between 1 and 365" });
      }

      const [subscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(and(
          eq(organizationSubscriptions.organizationId, organizationId),
          eq(organizationSubscriptions.status, "active")
        ))
        .orderBy(desc(organizationSubscriptions.createdAt))
        .limit(1);

      if (!subscription) return res.status(404).json({ message: "No active subscription found" });

      const oldEnd = new Date(subscription.billingCycleEnd);
      const newEnd = new Date(oldEnd);
      newEnd.setDate(newEnd.getDate() + parsedDays);

      await db.update(organizationSubscriptions).set({
        billingCycleEnd: newEnd,
        updatedAt: new Date(),
      }).where(eq(organizationSubscriptions.id, subscription.id));

      // Also extend trial if applicable
      if (subscription.trialEndsAt) {
        const oldTrial = new Date(subscription.trialEndsAt);
        const newTrial = new Date(oldTrial);
        newTrial.setDate(newTrial.getDate() + parsedDays);
        await db.update(organizationSubscriptions).set({
          trialEndsAt: newTrial,
        }).where(eq(organizationSubscriptions.id, subscription.id));
      }

      await storage.createAuditLog({
        actorId: req.currentUser.id,
        actorEmail: req.currentUser.email,
        action: "EXTEND_BILLING_CYCLE",
        targetType: "subscription",
        targetId: subscription.id,
        oldValue: JSON.stringify({ billingCycleEnd: oldEnd }),
        newValue: JSON.stringify({ billingCycleEnd: newEnd, extraDays, reason }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId,
      });

      res.json({ message: `Billing cycle extended by ${extraDays} days (new end: ${newEnd.toISOString().slice(0, 10)})` });
    } catch (error) {
      console.error("[SuperAdmin] Error extending cycle:", error);
      res.status(500).json({ message: "Failed to extend billing cycle" });
    }
  });

  // ── Override payment status (set any status including refunded) ────────
  app.post("/api/super-admin/billing/override-payment-status", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const { txnId, newStatus, reason } = req.body;
      if (!txnId || !newStatus) {
        return res.status(400).json({ message: "Transaction ID and new status are required" });
      }

      const VALID_STATUSES = ["pending", "success", "failed", "refunded", "refund_pending"];
      if (!VALID_STATUSES.includes(newStatus)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
      }

      if (typeof reason !== "string" || reason.trim().length < 3) {
        return res.status(400).json({ message: "A reason of at least 3 characters is required for status override" });
      }

      const [transaction] = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.txnId, txnId));

      if (!transaction) return res.status(404).json({ message: "Transaction not found" });

      const oldStatus = transaction.status;
      if (oldStatus === newStatus) {
        return res.status(400).json({ message: `Transaction is already in '${newStatus}' status` });
      }

      await db.update(paymentTransactions).set({
        status: newStatus,
        errorMessage: `Status overridden from '${oldStatus}' to '${newStatus}' by ${req.currentUser.email}: ${reason.trim()}`,
        updatedAt: new Date(),
      }).where(eq(paymentTransactions.id, transaction.id));

      // If overriding to "success", also activate the subscription
      if (newStatus === "success" && oldStatus !== "success") {
        try {
          const planNames = ["starter", "growth", "business"];
          let targetPlanName = "";
          if (transaction.paymentType === "subscription" || transaction.paymentType === "combined") {
            const payuResp = transaction.payuResponse as any;
            const productinfo = payuResp?.productinfo || "";
            for (const pn of planNames) {
              if (productinfo.toLowerCase().includes(pn)) {
                targetPlanName = pn;
                break;
              }
            }
          }

          if (targetPlanName) {
            const [plan] = await db
              .select()
              .from(subscriptionPlans)
              .where(eq(subscriptionPlans.name, targetPlanName));

            if (plan) {
              const now = new Date();
              const [existingSub] = await db
                .select()
                .from(organizationSubscriptions)
                .where(and(
                  eq(organizationSubscriptions.organizationId, transaction.organizationId),
                  eq(organizationSubscriptions.status, "active")
                ))
                .orderBy(desc(organizationSubscriptions.createdAt))
                .limit(1);

              if (existingSub && new Date(existingSub.billingCycleEnd) > now) {
                await db.update(organizationSubscriptions).set({
                  scheduledPlanId: plan.id,
                  scheduledPaymentId: transaction.txnId,
                  scheduledAt: now,
                  updatedAt: now,
                }).where(eq(organizationSubscriptions.id, existingSub.id));
                console.log(`[SuperAdmin] Override→success: scheduled upgrade for org=${transaction.organizationId} plan=${targetPlanName}`);
              } else {
                if (existingSub) {
                  await db.update(organizationSubscriptions)
                    .set({ status: "expired", updatedAt: now })
                    .where(eq(organizationSubscriptions.id, existingSub.id));
                }
                const billingEnd = new Date(now);
                billingEnd.setMonth(billingEnd.getMonth() + 1);
                const orgUsers = await db.select({ count: count() }).from(users).where(eq(users.organizationId, transaction.organizationId));
                await db.insert(organizationSubscriptions).values({
                  organizationId: transaction.organizationId,
                  planId: plan.id,
                  status: "active",
                  billingCycleStart: now,
                  billingCycleEnd: billingEnd,
                  usedUsers: orgUsers[0]?.count || 0,
                  outstandingAmount: 0,
                });
                await db.update(organizations).set({
                  planType: targetPlanName,
                  maxUsers: plan.maxUsers,
                  maxFlows: plan.maxFlows,
                  updatedAt: now,
                }).where(eq(organizations.id, transaction.organizationId));
                console.log(`[SuperAdmin] Override→success: activated plan=${targetPlanName} for org=${transaction.organizationId}`);
              }
            }
          }

          // Clear outstanding if payment was for outstanding/combined
          if (transaction.paymentType === "outstanding" || transaction.paymentType === "combined") {
            await db.update(organizationSubscriptions)
              .set({ outstandingAmount: 0, updatedAt: new Date() })
              .where(and(
                eq(organizationSubscriptions.organizationId, transaction.organizationId),
                eq(organizationSubscriptions.status, "active")
              ));
          }
        } catch (activationErr: any) {
          console.error(`[SuperAdmin] Override→success subscription activation error:`, activationErr?.message);
          // Status was already updated; log the activation failure but don't fail the request
        }
      }

      await storage.createAuditLog({
        actorId: req.currentUser.id,
        actorEmail: req.currentUser.email,
        action: "OVERRIDE_PAYMENT_STATUS",
        targetType: "payment",
        targetId: transaction.id,
        oldValue: JSON.stringify({ status: oldStatus, txnId }),
        newValue: JSON.stringify({ status: newStatus, reason: reason.trim(), amount: transaction.amount }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId: transaction.organizationId,
      });

      console.log(`[SuperAdmin] Payment status overridden: txn=${txnId} ${oldStatus}→${newStatus} by ${req.currentUser.email}`);
      res.json({ message: `Payment status changed from '${oldStatus}' to '${newStatus}'`, txnId, oldStatus, newStatus });
    } catch (error) {
      console.error("[SuperAdmin] Error overriding payment status:", error);
      res.status(500).json({ message: "Failed to override payment status" });
    }
  });

  // ── Create manual payment record (offline / bank transfer) ────────────
  app.post("/api/super-admin/billing/create-manual-payment", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const { organizationId, amount, paymentType, paymentMode, reference, notes } = req.body;

      if (!organizationId || !amount || !paymentType) {
        return res.status(400).json({ message: "Organization ID, amount, and payment type are required" });
      }

      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 10000000) {
        return res.status(400).json({ message: "Amount must be between 1 and 10,000,000" });
      }

      const VALID_TYPES = ["subscription", "outstanding", "combined"];
      if (!VALID_TYPES.includes(paymentType)) {
        return res.status(400).json({ message: `Payment type must be one of: ${VALID_TYPES.join(", ")}` });
      }

      const VALID_MODES = ["BANK_TRANSFER", "CASH", "CHEQUE", "UPI", "MANUAL", "OTHER"];
      const sanitizedMode = VALID_MODES.includes(paymentMode) ? paymentMode : "MANUAL";

      // Verify org exists
      const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
      if (!org) return res.status(404).json({ message: "Organization not found" });

      // Get active subscription
      const [subscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(and(
          eq(organizationSubscriptions.organizationId, organizationId),
          eq(organizationSubscriptions.status, "active")
        ))
        .orderBy(desc(organizationSubscriptions.createdAt))
        .limit(1);

      // Generate a unique manual txn ID
      const txnId = `MANUAL_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const sanitizedRef = typeof reference === "string" ? reference.trim().slice(0, 200) : "";
      const sanitizedNotes = typeof notes === "string" ? notes.trim().slice(0, 500) : "";

      // Create the payment record as already-successful
      const [newPayment] = await db.insert(paymentTransactions).values({
        organizationId,
        subscriptionId: subscription?.id || null,
        txnId,
        payuMihpayid: sanitizedRef || `MANUAL_${Date.now()}`,
        amount: Math.round(parsedAmount),
        planAmount: paymentType === "subscription" || paymentType === "combined" ? Math.round(parsedAmount) : 0,
        outstandingAmount: paymentType === "outstanding" || paymentType === "combined" ? Math.round(parsedAmount) : 0,
        status: "success",
        paymentMode: sanitizedMode,
        paymentType,
        payuResponse: { manual: true, reference: sanitizedRef, notes: sanitizedNotes, createdBy: req.currentUser.email },
        errorMessage: `Manual payment recorded by ${req.currentUser.email}. Ref: ${sanitizedRef}`,
        initiatedBy: req.currentUser.id,
      }).returning();

      // If paying outstanding, clear it from subscription
      if (subscription && (paymentType === "outstanding" || paymentType === "combined")) {
        const currentOutstanding = subscription.outstandingAmount || 0;
        const newOutstanding = Math.max(0, currentOutstanding - Math.round(parsedAmount));
        await db.update(organizationSubscriptions).set({
          outstandingAmount: newOutstanding,
          updatedAt: new Date(),
        }).where(eq(organizationSubscriptions.id, subscription.id));
      }

      await storage.createAuditLog({
        actorId: req.currentUser.id,
        actorEmail: req.currentUser.email,
        action: "CREATE_MANUAL_PAYMENT",
        targetType: "payment",
        targetId: newPayment.id,
        newValue: JSON.stringify({ txnId, amount: Math.round(parsedAmount), paymentType, paymentMode: sanitizedMode, reference: sanitizedRef, notes: sanitizedNotes }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId,
      });

      console.log(`[SuperAdmin] Manual payment created: txn=${txnId} amount=₹${parsedAmount} org=${organizationId} by ${req.currentUser.email}`);
      res.json({ message: `Manual payment of ₹${Math.round(parsedAmount).toLocaleString()} recorded`, txnId, paymentId: newPayment.id });
    } catch (error) {
      console.error("[SuperAdmin] Error creating manual payment:", error);
      res.status(500).json({ message: "Failed to create manual payment" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  SUPER ADMIN — INVOICE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Create invoice for an organization ────────────────────────────────
  app.post("/api/super-admin/billing/invoices", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const { organizationId, billingPeriodStart, billingPeriodEnd, planAmount, extraUsageAmount, totalAmount, notes, fileUrl } = req.body;

      if (!organizationId || !billingPeriodStart || !billingPeriodEnd || !totalAmount) {
        return res.status(400).json({ message: "Organization ID, billing period, and total amount are required" });
      }

      const parsedTotal = Number(totalAmount);
      if (!Number.isFinite(parsedTotal) || parsedTotal <= 0 || parsedTotal > 10000000) {
        return res.status(400).json({ message: "Total amount must be between 1 and 10,000,000" });
      }

      // Validate dates
      const parsedStart = new Date(billingPeriodStart);
      const parsedEnd = new Date(billingPeriodEnd);
      if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
        return res.status(400).json({ message: "Invalid billing period dates" });
      }
      if (parsedEnd <= parsedStart) {
        return res.status(400).json({ message: "Billing period end must be after start" });
      }

      // Validate sub-amounts are non-negative
      const parsedPlanAmount = Number(planAmount) || 0;
      const parsedExtraAmount = Number(extraUsageAmount) || 0;
      if (parsedPlanAmount < 0 || parsedExtraAmount < 0) {
        return res.status(400).json({ message: "Plan amount and extra usage amount must not be negative" });
      }

      // Verify org exists
      const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
      if (!org) return res.status(404).json({ message: "Organization not found" });

      // Get active subscription
      const [subscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(and(
          eq(organizationSubscriptions.organizationId, organizationId),
          eq(organizationSubscriptions.status, "active")
        ))
        .orderBy(desc(organizationSubscriptions.createdAt))
        .limit(1);

      // Generate invoice number: INV-YYYYMMDD-XXXXX
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

      const sanitizedNotes = typeof notes === "string" ? notes.trim().slice(0, 1000) : null;
      // Validate fileUrl: only allow https URLs
      let sanitizedFileUrl: string | null = null;
      if (typeof fileUrl === "string" && fileUrl.trim()) {
        const trimmedUrl = fileUrl.trim().slice(0, 2000);
        if (/^https:\/\//i.test(trimmedUrl)) {
          sanitizedFileUrl = trimmedUrl;
        } else {
          return res.status(400).json({ message: "File URL must be a valid HTTPS URL" });
        }
      }

      let newInvoice;
      try {
        [newInvoice] = await db.insert(invoices).values({
          organizationId,
          subscriptionId: subscription?.id || null,
          invoiceNumber,
          billingPeriodStart: parsedStart,
          billingPeriodEnd: parsedEnd,
          planAmount: parsedPlanAmount,
          extraUsageAmount: parsedExtraAmount,
          totalAmount: Math.round(parsedTotal),
        status: "pending",
        notes: sanitizedNotes,
        fileUrl: sanitizedFileUrl,
        createdBy: req.currentUser.id,
      }).returning();
      } catch (dbErr: any) {
        // Handle unique constraint violation (invoice number collision)
        if (dbErr?.code === "23505" || dbErr?.message?.includes("unique")) {
          return res.status(409).json({ message: "Invoice number collision. Please try again." });
        }
        throw dbErr;
      }

      await storage.createAuditLog({
        actorId: req.currentUser.id,
        actorEmail: req.currentUser.email,
        action: "CREATE_INVOICE",
        targetType: "invoice",
        targetId: newInvoice.id,
        newValue: JSON.stringify({ invoiceNumber, totalAmount: Math.round(parsedTotal), organizationId }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId,
      });

      console.log(`[SuperAdmin] Invoice created: ${invoiceNumber} amount=₹${parsedTotal} org=${organizationId}`);
      res.json(newInvoice);
    } catch (error) {
      console.error("[SuperAdmin] Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // ── Get all invoices (with optional org filter) ───────────────────────
  app.get("/api/super-admin/billing/invoices", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const { organizationId, status } = req.query;
      const conditions = [];

      if (organizationId && typeof organizationId === "string") {
        conditions.push(eq(invoices.organizationId, organizationId));
      }
      if (status && typeof status === "string" && ["pending", "paid", "overdue"].includes(status)) {
        conditions.push(eq(invoices.status, status));
      }

      const allInvoices = await db
        .select({
          invoice: invoices,
          orgName: organizations.name,
        })
        .from(invoices)
        .leftJoin(organizations, eq(invoices.organizationId, organizations.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(invoices.createdAt));

      res.json(allInvoices.map(r => ({ ...r.invoice, organizationName: r.orgName })));
    } catch (error) {
      console.error("[SuperAdmin] Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // ── Update invoice status (mark as paid / overdue) ────────────────────
  app.patch("/api/super-admin/billing/invoices/:invoiceId", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const { invoiceId } = req.params;
      const { status, paymentMethod, notes, fileUrl } = req.body;

      const VALID_STATUSES = ["pending", "paid", "overdue"];
      if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
      }

      const [existing] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
      if (!existing) return res.status(404).json({ message: "Invoice not found" });

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (status) updates.status = status;
      if (paymentMethod) updates.paymentMethod = typeof paymentMethod === "string" ? paymentMethod.trim().slice(0, 50) : existing.paymentMethod;
      if (notes !== undefined) updates.notes = typeof notes === "string" ? notes.trim().slice(0, 1000) : existing.notes;
      if (fileUrl !== undefined) {
        if (typeof fileUrl === "string" && fileUrl.trim()) {
          if (!/^https:\/\//i.test(fileUrl.trim())) {
            return res.status(400).json({ message: "File URL must be a valid HTTPS URL" });
          }
          updates.fileUrl = fileUrl.trim().slice(0, 2000);
        } else {
          updates.fileUrl = null;
        }
      }

      if (status === "paid") {
        updates.paymentVerifiedBy = req.currentUser.id;
        updates.paymentVerifiedAt = new Date();
      }

      const [updated] = await db.update(invoices).set(updates).where(eq(invoices.id, invoiceId)).returning();

      await storage.createAuditLog({
        actorId: req.currentUser.id,
        actorEmail: req.currentUser.email,
        action: "UPDATE_INVOICE",
        targetType: "invoice",
        targetId: invoiceId,
        oldValue: JSON.stringify({ status: existing.status }),
        newValue: JSON.stringify({ status: updated.status, paymentMethod: updated.paymentMethod }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId: existing.organizationId,
      });

      console.log(`[SuperAdmin] Invoice updated: ${existing.invoiceNumber} status=${updated.status}`);
      res.json(updated);
    } catch (error) {
      console.error("[SuperAdmin] Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // ── Upload invoice with file → Google Drive ──────────────────────────
  const invoiceUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  app.post("/api/super-admin/billing/invoices/upload", isAuthenticated, requireSuperAdmin, superAdminLimiter, invoiceUpload.single("file"), async (req: any, res) => {
    try {
      const { organizationId, billingPeriodStart, billingPeriodEnd, planAmount, extraUsageAmount, totalAmount, notes } = req.body;

      if (!organizationId || !billingPeriodStart || !billingPeriodEnd || !totalAmount) {
        return res.status(400).json({ message: "Organization ID, billing period, and total amount are required" });
      }
      const parsedTotal = Number(totalAmount);
      if (!Number.isFinite(parsedTotal) || parsedTotal <= 0 || parsedTotal > 10000000) {
        return res.status(400).json({ message: "Total amount must be between 1 and 10,000,000" });
      }
      const parsedStart = new Date(billingPeriodStart);
      const parsedEnd = new Date(billingPeriodEnd);
      if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
        return res.status(400).json({ message: "Invalid billing period dates" });
      }
      if (parsedEnd <= parsedStart) {
        return res.status(400).json({ message: "Billing period end must be after start" });
      }
      const parsedPlanAmount = Number(planAmount) || 0;
      const parsedExtraAmount = Number(extraUsageAmount) || 0;
      if (parsedPlanAmount < 0 || parsedExtraAmount < 0) {
        return res.status(400).json({ message: "Plan amount and extra usage amount must not be negative" });
      }

      // Verify org exists
      const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
      if (!org) return res.status(404).json({ message: "Organization not found" });

      // Upload file to super admin's Google Drive if provided
      let fileUrl: string | null = null;
      if (req.file) {
        const ALLOWED_INVOICE_TYPES = [
          "application/pdf",
          "image/jpeg", "image/jpg", "image/png",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];
        if (!ALLOWED_INVOICE_TYPES.includes(req.file.mimetype)) {
          return res.status(400).json({ message: "Only PDF, images, and Office documents are allowed for invoices" });
        }

        // Get super admin's Google Drive tokens
        const adminUser = await ensureValidToken(req.currentUser.id);
        if (!adminUser || !adminUser.googleDriveEnabled || !adminUser.googleAccessToken) {
          return res.status(400).json({ message: "Super Admin Google Drive is not connected. Please enable Google Drive in your settings first." });
        }

        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({
          access_token: adminUser.googleAccessToken,
          refresh_token: adminUser.googleRefreshToken,
          expiry_date: adminUser.googleTokenExpiry?.getTime(),
        });

        const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 255);
        const driveFile = await uploadFileToDrive(
          oauth2Client,
          req.file.buffer,
          `Invoice_${organizationId}_${sanitizedName}`,
          req.file.mimetype,
          { orgId: organizationId, formId: "invoice", fieldId: "invoice-file" }
        );
        fileUrl = driveFile.webViewLink || null;
      }

      // Get active subscription
      const [subscription] = await db
        .select()
        .from(organizationSubscriptions)
        .where(and(
          eq(organizationSubscriptions.organizationId, organizationId),
          eq(organizationSubscriptions.status, "active")
        ))
        .orderBy(desc(organizationSubscriptions.createdAt))
        .limit(1);

      // Generate invoice number
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

      const sanitizedNotes = typeof notes === "string" ? notes.trim().slice(0, 1000) : null;

      let newInvoice;
      try {
        [newInvoice] = await db.insert(invoices).values({
          organizationId,
          subscriptionId: subscription?.id || null,
          invoiceNumber,
          billingPeriodStart: parsedStart,
          billingPeriodEnd: parsedEnd,
          planAmount: parsedPlanAmount,
          extraUsageAmount: parsedExtraAmount,
          totalAmount: Math.round(parsedTotal),
          status: "pending",
          notes: sanitizedNotes,
          fileUrl,
          createdBy: req.currentUser.id,
        }).returning();
      } catch (dbErr: any) {
        if (dbErr?.code === "23505" || dbErr?.message?.includes("unique")) {
          return res.status(409).json({ message: "Invoice number collision. Please try again." });
        }
        throw dbErr;
      }

      await storage.createAuditLog({
        actorId: req.currentUser.id,
        actorEmail: req.currentUser.email,
        action: "CREATE_INVOICE",
        targetType: "invoice",
        targetId: newInvoice.id,
        newValue: JSON.stringify({ invoiceNumber, totalAmount: Math.round(parsedTotal), organizationId, hasFile: !!fileUrl }),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        organizationId,
      });

      console.log(`[SuperAdmin] Invoice uploaded: ${invoiceNumber} amount=₹${parsedTotal} org=${organizationId} file=${!!fileUrl}`);
      res.json(newInvoice);
    } catch (error: any) {
      console.error("[SuperAdmin] Error uploading invoice:", error);
      if (error.message?.includes("invalid_grant") || error.code === 401) {
        return res.status(401).json({ message: "Google Drive authorization expired. Please re-authorize in settings." });
      }
      res.status(500).json({ message: "Failed to upload invoice" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  SUPER ADMIN — USAGE MONITORING & EXPORT
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Get usage monitoring data (with filters) ──────────────────────────
  app.get("/api/super-admin/billing/usage-monitoring", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const { organizationId, actionType, startDate, endDate, page, limit: pageLimit } = req.query;
      const conditions = [];

      if (organizationId && typeof organizationId === "string") {
        conditions.push(eq(usageLogs.organizationId, organizationId));
      }
      if (actionType && typeof actionType === "string" && ["flow_execution", "form_submission", "user_added"].includes(actionType)) {
        conditions.push(eq(usageLogs.actionType, actionType));
      }
      if (startDate && typeof startDate === "string") {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          conditions.push(gte(usageLogs.createdAt, start));
        }
      }
      if (endDate && typeof endDate === "string") {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          conditions.push(lte(usageLogs.createdAt, end));
        }
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(pageLimit) || 50));
      const offset = (pageNum - 1) * limitNum;

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [logs, totalResult] = await Promise.all([
        db
          .select({
            log: usageLogs,
            orgName: organizations.name,
          })
          .from(usageLogs)
          .leftJoin(organizations, eq(usageLogs.organizationId, organizations.id))
          .where(whereClause)
          .orderBy(desc(usageLogs.createdAt))
          .limit(limitNum)
          .offset(offset),
        db
          .select({ count: count() })
          .from(usageLogs)
          .where(whereClause),
      ]);

      // Aggregate summary
      const summary = await db
        .select({
          actionType: usageLogs.actionType,
          total: count(),
        })
        .from(usageLogs)
        .where(whereClause)
        .groupBy(usageLogs.actionType);

      res.json({
        logs: logs.map(r => ({ ...r.log, organizationName: r.orgName })),
        total: totalResult[0]?.count || 0,
        page: pageNum,
        limit: limitNum,
        summary: summary.reduce((acc, s) => { acc[s.actionType] = s.total; return acc; }, {} as Record<string, number>),
      });
    } catch (error) {
      console.error("[SuperAdmin] Error fetching usage monitoring:", error);
      res.status(500).json({ message: "Failed to fetch usage data" });
    }
  });

  // ── Export usage data as CSV ──────────────────────────────────────────
  app.get("/api/super-admin/billing/usage-export", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const { organizationId, actionType, startDate, endDate } = req.query;
      const conditions = [];

      if (organizationId && typeof organizationId === "string") {
        conditions.push(eq(usageLogs.organizationId, organizationId));
      }
      if (actionType && typeof actionType === "string" && ["flow_execution", "form_submission", "user_added"].includes(actionType)) {
        conditions.push(eq(usageLogs.actionType, actionType));
      }
      if (startDate && typeof startDate === "string") {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          conditions.push(gte(usageLogs.createdAt, start));
        }
      }
      if (endDate && typeof endDate === "string") {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          conditions.push(lte(usageLogs.createdAt, end));
        }
      }

      const logs = await db
        .select({
          log: usageLogs,
          orgName: organizations.name,
        })
        .from(usageLogs)
        .leftJoin(organizations, eq(usageLogs.organizationId, organizations.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(usageLogs.createdAt))
        .limit(10000);

      // Build CSV — escape values to prevent formula injection
      const escapeCSV = (val: string): string => {
        // Prevent CSV injection: prefix formula-triggering chars with a single-quote
        if (/^[=+\-@\t\r]/.test(val)) val = "'" + val;
        // Wrap in quotes if contains comma, quote, or newline
        if (/[",\n\r]/.test(val)) return '"' + val.replace(/"/g, '""') + '"';
        return val;
      };
      const headers = ["Date", "Organization", "Organization ID", "Action Type", "Action ID", "Within Limit"];
      const rows = logs.map(r => [
        escapeCSV(r.log.createdAt ? new Date(r.log.createdAt).toISOString() : ""),
        escapeCSV((r.orgName || "").replace(/,/g, " ")),
        escapeCSV(r.log.organizationId),
        escapeCSV(r.log.actionType),
        escapeCSV(r.log.actionId || ""),
        r.log.isWithinLimit ? "Yes" : "No",
      ]);

      const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=usage-export-${new Date().toISOString().slice(0, 10)}.csv`);
      res.send(csvContent);
    } catch (error) {
      console.error("[SuperAdmin] Error exporting usage:", error);
      res.status(500).json({ message: "Failed to export usage data" });
    }
  });
}
