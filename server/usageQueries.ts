import { db } from "./db";
import { sql, count, countDistinct, avg, and, gte, lte, eq, isNotNull } from "drizzle-orm";
import { tasks, users } from "@shared/schema";
import { getQuickFormResponsesCollection } from "./mongo/quickFormClient";

/**
 * Optimized query to get flow statistics for usage page
 * Uses SQL aggregation instead of fetching all rows
 */
export async function getFlowStats(organizationId: string, thisMonthStart: Date, lastMonthStart: Date, lastMonthEnd: Date) {
  const result = await db.execute(sql`
    SELECT 
      -- Total metrics
      COUNT(DISTINCT ${tasks.flowId}) as total_flows,
      COUNT(*) as total_tasks,
      
      -- This month metrics
      COUNT(DISTINCT ${tasks.flowId}) FILTER (WHERE ${tasks.createdAt} >= ${thisMonthStart}) as month_flows,
      COUNT(*) FILTER (WHERE ${tasks.createdAt} >= ${thisMonthStart}) as month_tasks,
      
      -- Last month metrics
      COUNT(DISTINCT ${tasks.flowId}) FILTER (WHERE ${tasks.createdAt} >= ${lastMonthStart} AND ${tasks.createdAt} <= ${lastMonthEnd}) as last_month_flows,
      
      -- Status metrics
      COUNT(DISTINCT ${tasks.flowId}) FILTER (WHERE ${tasks.status} = 'pending') as active_flows,
      COUNT(DISTINCT ${tasks.flowId}) FILTER (WHERE ${tasks.status} = 'completed') as completed_flows,
      COUNT(DISTINCT ${tasks.flowId}) FILTER (WHERE ${tasks.status} = 'cancelled') as cancelled_flows,
      
      -- Completion metrics
      COUNT(*) FILTER (WHERE ${tasks.status} = 'completed') as completed_tasks,
      AVG(EXTRACT(EPOCH FROM (${tasks.actualCompletionTime} - ${tasks.createdAt}))/86400) 
        FILTER (WHERE ${tasks.status} = 'completed' AND ${tasks.actualCompletionTime} IS NOT NULL) as avg_days,
      
      -- Performance metrics
      COUNT(*) FILTER (
        WHERE ${tasks.status} = 'completed' 
        AND ${tasks.actualCompletionTime} IS NOT NULL 
        AND ${tasks.plannedTime} IS NOT NULL
        AND ${tasks.actualCompletionTime} <= ${tasks.plannedTime}
      ) as on_time_tasks
      
    FROM ${tasks}
    WHERE ${tasks.organizationId} = ${organizationId}
  `);

  return result.rows[0];
}

/**
 * Optimized query to get form statistics (MongoDB)
 */
export async function getFormStats(organizationId: string, thisMonthStart: Date, lastMonthStart: Date, lastMonthEnd: Date) {
  const col = await getQuickFormResponsesCollection();
  const [total_forms, month_forms, last_month_forms] = await Promise.all([
    col.countDocuments({ orgId: organizationId }),
    col.countDocuments({ orgId: organizationId, createdAt: { $gte: thisMonthStart } }),
    col.countDocuments({ orgId: organizationId, createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
  ]);
  return { total_forms, month_forms, last_month_forms };
}

/**
 * Get form submission counts by form ID (MongoDB)
 */
export async function getFormsByType(organizationId: string) {
  const col = await getQuickFormResponsesCollection();
  const pipeline = [
    { $match: { orgId: organizationId } },
    { $group: { _id: "$formId", count: { $sum: 1 } } },
  ];
  const rows = await col.aggregate(pipeline).toArray();
  const formsByType: Record<string, number> = {};
  rows.forEach((row: any) => {
    formsByType[row._id] = row.count;
  });
  return formsByType;
}

/**
 * Get user statistics
 */
export async function getUserStats(organizationId: string) {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE ${users.status} = 'active') as active_users,
      COUNT(*) FILTER (WHERE ${users.lastLoginAt} IS NOT NULL AND ${users.lastLoginAt} > ${tenMinutesAgo}) as active_today
    FROM ${users}
    WHERE ${users.organizationId} = ${organizationId}
  `);

  return result.rows[0];
}

/**
 * Optimized daily trends query - single query instead of 30 loops
 */
export async function getDailyTrends(organizationId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const taskResult = await db.execute(sql`
    SELECT 
      DATE(${tasks.createdAt}) as date,
      COUNT(DISTINCT ${tasks.flowId}) as flows
    FROM ${tasks}
    WHERE ${tasks.organizationId} = ${organizationId}
      AND ${tasks.createdAt} >= ${thirtyDaysAgo}
    GROUP BY DATE(${tasks.createdAt})
    ORDER BY date
  `);

  const col = await getQuickFormResponsesCollection();
  const formPipeline = [
    { $match: { orgId: organizationId, createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        forms: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];
  const formRows = await col.aggregate(formPipeline).toArray();

  // Merge results by date
  const tasksByDate = new Map();
  (taskResult.rows as any[]).forEach((row: any) => {
    const dateStr = row.date instanceof Date 
      ? row.date.toISOString().split('T')[0]
      : String(row.date).split('T')[0];
    tasksByDate.set(dateStr, Number(row.flows));
  });

  const formsByDate = new Map();
  formRows.forEach((row: any) => {
    formsByDate.set(row._id, row.forms);
  });

  return { tasksByDate, formsByDate };
}

/**
 * Get flows by system distribution
 */
export async function getFlowsBySystem(organizationId: string) {
  const result = await db.execute(sql`
    SELECT 
      ${tasks.system} as system,
      COUNT(DISTINCT ${tasks.flowId}) as flow_count,
      COUNT(*) as task_count
    FROM ${tasks}
    WHERE ${tasks.organizationId} = ${organizationId}
      AND ${tasks.system} IS NOT NULL
    GROUP BY ${tasks.system}
    ORDER BY flow_count DESC
  `);

  const totalTasks = (result.rows as any[]).reduce((sum: number, row: any) => sum + Number(row.task_count), 0);

  return (result.rows as any[]).map((row: any) => ({
    system: row.system,
    count: Number(row.flow_count),
    percentage: totalTasks > 0 ? Math.round((Number(row.task_count) / totalTasks) * 100) : 0
  }));
}

/**
 * Get top forms by submission count (MongoDB)
 */
export async function getTopForms(organizationId: string, limit: number = 10) {
  const col = await getQuickFormResponsesCollection();
  const pipeline = [
    { $match: { orgId: organizationId } },
    { $group: { _id: "$formId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ];
  const rows = await col.aggregate(pipeline).toArray();
  return rows.map((row: any) => ({
    formId: row._id,
    count: row.count,
  }));
}

/**
 * Get storage statistics from Google Drive
 * Note: Files are stored in individual user Google Drive accounts
 * This returns aggregate stats across all users with Drive access in the organization
 */
export async function getStorageStats(organizationId: string) {
  try {
    const { storage } = await import('./storage');
    const { getOAuth2Client } = await import('./services/googleOAuth');
    const { getStorageStats: getDriveStorageStats } = await import('./services/googleDriveService');
    const { refreshTokenIfNeeded } = await import('./utils/tokenRefresh');
    
    // Get all users in organization with Google Drive enabled
    const orgUsers = await storage.getUsersByOrganization(organizationId);
    const driveEnabledUsers = orgUsers.filter((u: any) => u.googleDriveEnabled && u.googleAccessToken);
    
    if (driveEnabledUsers.length === 0) {
      return {
        totalFiles: 0,
        totalBytes: 0,
        filesByType: {}
      };
    }
    
    let totalFiles = 0;
    let totalBytes = 0;
    const filesByType: Record<string, number> = {};
    
    // Aggregate stats from all users with Drive access
    for (const user of driveEnabledUsers) {
      try {
        const oauth2Client = getOAuth2Client();
        
        // Refresh token if needed and update oauth2Client
        const tokenValid = await refreshTokenIfNeeded(user, oauth2Client);
        if (!tokenValid) {
          console.warn(`Skipping user ${user.email} due to invalid token`);
          continue;
        }
        
        const userStats = await getDriveStorageStats(oauth2Client, organizationId);
        totalFiles += userStats.totalFiles;
        totalBytes += userStats.totalBytes;
        
        // Merge file type counts
        Object.entries(userStats.byFileType).forEach(([type, count]) => {
          filesByType[type] = (filesByType[type] || 0) + count;
        });
      } catch (error) {
        console.error(`Error fetching Drive stats for user ${user.email}:`, error);
        // Continue with other users
      }
    }
    
    return {
      totalFiles,
      totalBytes,
      filesByType
    };
  } catch (error) {
    console.error("Error fetching storage stats:", error);
    return {
      totalFiles: 0,
      totalBytes: 0,
      filesByType: {}
    };
  }
}
