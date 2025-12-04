import { Express } from "express";
import { storage } from "./storage";

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
        pricingTier: orgData.pricingTier || "starter",
        monthlyPrice: orgData.monthlyPrice || 0
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
      
      // Clear usage cache when pricing/quota settings change
      const pricingFields = ['pricingTier', 'monthlyPrice', 'usageBasedBilling', 'pricePerFlow', 'pricePerUser', 'pricePerGb', 'maxUsers', 'maxFlows', 'maxStorage'];
      const hasPricingChanges = pricingFields.some(field => updates[field] !== undefined);
      
      if (hasPricingChanges) {
        const { usageCache, getUsageSummaryCacheKey } = await import('./usageCache');
        // Clear cache for all date ranges
        ['week', 'month', 'quarter', 'year'].forEach(range => {
          const cacheKey = getUsageSummaryCacheKey(organizationId, range);
          usageCache.del(cacheKey);
        });
        console.log(`[CACHE] Cleared usage cache for organization ${organizationId} due to pricing changes`);
      }
      
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
      const archiveData = {
        organization,
        users: await storage.getUsersByOrganization(organizationId),
        tasks: await storage.getTasksByOrganization(organizationId),
        flowRules: await storage.getFlowRulesByOrganization(organizationId),
        formTemplates: await storage.getFormTemplatesByOrganization(organizationId),
        formResponses: await storage.getFormResponsesByOrganization(organizationId),
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
  
  // Get system-wide billing and usage statistics
  app.get("/api/super-admin/billing-summary", isAuthenticated, requireSuperAdmin, superAdminLimiter, async (req: any, res) => {
    try {
      const organizations = await storage.getAllOrganizations();
      
      let totalRevenue = 0;
      let monthlyRecurring = 0;
      
      const orgBilling = await Promise.all(
        organizations.map(async (org) => {
          const users = await storage.getUsersByOrganization(org.id);
          const tasks = await storage.getTasksByOrganization(org.id);
          const responses = await storage.getFormResponsesByOrganization(org.id);
          
          // Calculate current usage
          const currentUsers = users.length;
          const currentFlows = new Set(tasks.map(t => t.flowId)).size;
          const currentStorage = responses.length * 0.5; // Rough estimate in MB
          
          // Calculate overage charges
          const baseFee = org.monthlyPrice || 0;
          let overageCost = 0;
          
          if (org.usageBasedBilling) {
            const flowsOverage = Math.max(0, currentFlows - (org.maxFlows || 0));
            const usersOverage = Math.max(0, currentUsers - (org.maxUsers || 0));
            const storageOverageGB = Math.max(0, (currentStorage - (org.maxStorage || 0)) / 1024);
            
            overageCost = 
              (flowsOverage * (org.pricePerFlow || 0)) +
              (usersOverage * (org.pricePerUser || 0)) +
              (storageOverageGB * (org.pricePerGb || 0));
          }
          
          const totalBill = baseFee + overageCost;
          monthlyRecurring += baseFee;
          totalRevenue += totalBill;
          
          return {
            organizationId: org.id,
            organizationName: org.name,
            baseFee,
            overageCost,
            totalBill,
            currentUsers,
            currentFlows,
            currentStorage: Math.round(currentStorage)
          };
        })
      );
      
      res.json({
        totalRevenue,
        monthlyRecurring,
        averageRevenuePerOrg: organizations.length > 0 ? totalRevenue / organizations.length : 0,
        totalOrganizations: organizations.length,
        organizations: orgBilling.sort((a, b) => b.totalBill - a.totalBill)
      });
    } catch (error) {
      console.error("Error calculating billing summary:", error);
      res.status(500).json({ message: "Failed to calculate billing summary" });
    }
  });
}
