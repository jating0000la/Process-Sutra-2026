/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  VOICE OF BUSINESS — Analytics & Performance Report Routes
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 *  Copyright © 2024-2026 Process Sutra. All Rights Reserved.
 *  Patented — "Voice of Business" Performance Report System
 * 
 *  This module is proprietary and confidential. Unauthorized copying,
 *  distribution, modification, or use of this file, via any medium, is
 *  strictly prohibited. The "Voice of Business" report methodology,
 *  business health matrix, bottleneck analysis algorithm, loss cost
 *  computation model, and AI-augmented analysis framework are protected
 *  under applicable intellectual property laws.
 * 
 *  NOTICE: The AI integration in this module ONLY sends pre-computed,
 *  aggregated statistical summaries to external LLM providers. NO raw
 *  task data, personal identifiers, file contents, form responses, or
 *  customer-specific business documents are ever transmitted. The LLM
 *  receives ONLY reporting instructions and numerical KPIs.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Router } from "express";
import { storage } from "./storage.js";
import { db } from "./db.js";
import { eq } from "drizzle-orm";

const router = Router();
export default router;

// ─────────────────────────────────────────────────────────────────────────────
//  Types & Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Copyright watermark embedded in every generated report */
const COPYRIGHT_NOTICE = `© ${new Date().getFullYear()} Process Sutra. All Rights Reserved. "Voice of Business" is a registered trademark and patented technology of Process Sutra. Unauthorized reproduction, distribution, or reverse-engineering of this report format, methodology, or underlying algorithms is strictly prohibited under applicable intellectual property laws.`;

/** Short copyright for footer */
const COPYRIGHT_SHORT = `© ${new Date().getFullYear()} Process Sutra — Patented`;

// ─────────────────────────────────────────────────────────────────────────────
//  AI Data Policy — What the LLM receives
// ─────────────────────────────────────────────────────────────────────────────
//
//  The AI model receives ONLY the following pre-computed, aggregated data:
//
//  ✅ ALLOWED (sent to LLM):
//    - Organization name and industry (for contextual advice)
//    - Aggregate KPI numbers (completion %, on-time %, throughput, cycle time)
//    - Business health status label (e.g., "Growth Ready")
//    - Loss cost total (computed number, not individual task details)
//    - Bottleneck summary: task type names + avg cycle hours (max 5)
//    - System names + aggregate completion rates (max 5)
//    - Top/bottom performer count and on-time rates (max 3 each)
//    - Reporting instructions (what format to respond in)
//
//  ❌ NEVER SENT to LLM:
//    - Individual task IDs, descriptions, or content
//    - Raw task records or database rows
//    - Customer names, phone numbers, addresses
//    - Form submission data or file attachments
//    - API keys, tokens, or credentials
//    - User passwords or session data
//    - Personal email addresses (only count of top/bottom performers)
//    - Google Drive files or OAuth tokens
//    - Any PII (Personally Identifiable Information)
//
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the sanitized AI prompt — ONLY aggregated KPIs, NO raw data.
 * The LLM receives reporting instructions + statistical summary.
 */
function buildAIPrompt(report: any): { prompt: string; systemPrompt: string } {
  // Anonymize doer data — only send counts, not emails
  const topCount = (report.topPerformers || []).length;
  const bottomCount = (report.needsAttention || []).length;
  const topAvgRate = topCount > 0
    ? Math.round((report.topPerformers || []).reduce((a: number, d: any) => a + (d.onTimeRate || 0), 0) / topCount)
    : 0;
  const bottomAvgRate = bottomCount > 0
    ? Math.round((report.needsAttention || []).reduce((a: number, d: any) => a + (d.onTimeRate || 0), 0) / bottomCount)
    : 0;

  // Only include system names + aggregate rates (no task-level data)
  const systemSummary = (report.systemBreakdown || []).slice(0, 5).map((s: any) =>
    `- ${s.system}: ${s.totalTasks} tasks, ${s.completionRate}% completion, ${s.overdue} overdue`
  ).join('\n');

  // Only include bottleneck task *type* names + aggregate metrics
  const bottleneckSummary = (report.bottlenecks || []).slice(0, 5).map((b: any, i: number) =>
    `${i + 1}. "${b.taskName}" — avg cycle ${b.avgCycleHours}hrs, ${b.overdueCount} overdue, ${b.completionRate}% completion`
  ).join('\n');

  const sanitizedSummary = `
ORGANIZATION: ${report.organization.name}
INDUSTRY: ${report.organization.industry || 'Not specified'}

KEY PERFORMANCE INDICATORS (aggregated):
- Total Tasks: ${report.summary.totalTasks}
- Completion Rate: ${report.summary.completionRate}%
- On-Time Rate: ${report.summary.onTimeRate}%
- Throughput: ${report.summary.throughputPerDay} tasks/day
- Avg Cycle Time: ${report.summary.avgCycleTimeHours} hours
- Productivity: ${report.summary.productivity}%
- Performance: ${report.summary.performance}%
- Business Status: ${report.summary.businessStatus}

LOSS METRICS (aggregated):
- Total Delay Hours: ${report.lossCost.totalWaitHours}
- Estimated Loss Cost: ₹${report.lossCost.totalLossCost.toLocaleString()}

BOTTLENECK TASK TYPES (top 5 by avg cycle time):
${bottleneckSummary || '(no bottleneck data)'}

WORKFLOW SYSTEMS (aggregated stats):
${systemSummary || '(no system data)'}

TEAM SUMMARY (anonymized):
- Top ${topCount} performers avg on-time rate: ${topAvgRate}%
- Bottom ${bottomCount} performers avg on-time rate: ${bottomAvgRate}%
- Total team members: ${(report.doerPerformance || []).length}
`;

  const prompt = `You are a senior business operations consultant. Based ONLY on the following aggregated performance metrics (no raw data is provided), write a concise, actionable analysis report.

IMPORTANT: You are receiving ONLY pre-computed statistical summaries. Do NOT request or reference any individual task records, personal data, or raw database information. Your analysis should be based entirely on the aggregate KPIs below.

${sanitizedSummary}

Provide your analysis in this EXACT format (use markdown):

## Executive Summary
(2-3 sentences overview of operational health based on the KPIs above)

## Key Findings
1. (Finding based on the aggregate data)
2. (Finding based on the aggregate data)
3. (Finding based on the aggregate data)

## Critical Bottlenecks & Root Causes
(Based on the bottleneck task types and cycle times listed above)

## Key Improvement Areas
1. **[Area]**: (Specific, actionable recommendation)
2. **[Area]**: (Specific, actionable recommendation)
3. **[Area]**: (Specific, actionable recommendation)

## Cost Optimization Opportunities
(How to reduce the ₹${report.lossCost.totalLossCost.toLocaleString()} estimated loss)

## 30-60-90 Day Action Plan
- **30 Days**: (Quick wins)
- **60 Days**: (Process improvements)
- **90 Days**: (Strategic changes)

Keep analysis practical, data-driven, and business-focused. Use ONLY the aggregate numbers provided above. Do NOT hallucinate specific task details or individual employee data.`;

  const systemPrompt = 'You are a senior operations consultant providing data-driven business analysis. You receive ONLY aggregated KPIs — never raw task data or personal information. Be specific with the numbers provided, give actionable advice, and never reference individual employees by name or email.';

  return { prompt, systemPrompt };
}

/**
 * Call Gemini API with sanitized prompt
 */
async function callGeminiForReport(apiKey: string, prompt: string, systemPrompt: string): Promise<string | null> {
  try {
    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, topP: 0.95, topK: 40, maxOutputTokens: 8192 },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Call OpenAI API with sanitized prompt
 */
async function callOpenAIForReport(apiKey: string, prompt: string, systemPrompt: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data?.choices?.[0]?.message?.content || null;
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Performance Report Route — needs middleware injected from parent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register analytics report routes on the Express app.
 * Middleware (auth, rate limiter) must be passed from the main routes file
 * to avoid circular dependencies.
 */
export function registerAnalyticsRoutes(
  app: any,
  middlewares: {
    analyticsLimiter: any;
    isAuthenticated: any;
    requireAdmin: any;
    addUserToRequest: any;
  }
) {
  const { analyticsLimiter, isAuthenticated, requireAdmin, addUserToRequest } = middlewares;

  // ─── Voice of Business — Performance Report Generation (Admin-only) ──
  // Copyright © Process Sutra. Patented.
  // Generates a comprehensive performance report with bottleneck analysis,
  // throughput, productivity, loss cost, trend analysis, SLA scoring,
  // risk matrix, efficiency index, and optional AI-powered insights.
  app.get("/api/analytics/performance-report", analyticsLimiter, isAuthenticated, requireAdmin, addUserToRequest, async (req: any, res: any) => {
    try {
      const user = req.currentUser;
      const orgId = user.organizationId;
      const costPerHour = parseFloat(req.query.costPerHour as string) || 500;
      const includeAI = req.query.includeAI === 'true';

      // 1. Fetch all data in parallel
      const [
        orgMetrics,
        flowPerf,
        allFlowRules,
        tatConfigData,
        orgData
      ] = await Promise.all([
        storage.getOrganizationTaskMetrics(orgId),
        storage.getOrganizationFlowPerformance(orgId),
        storage.getFlowRulesByOrganization(orgId),
        storage.getTATConfig(orgId),
        storage.getOrganization(orgId),
      ]);

      // 2. Fetch all tasks for detailed analysis
      const allTasks = await storage.getTasksByOrganization(orgId);

      // 3. Compute advanced metrics
      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(t => t.status === 'completed');
      const pendingTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
      const overdueTasks = allTasks.filter(t => t.status === 'overdue');
      const cancelledTasks = allTasks.filter(t => t.status === 'cancelled');
      const inProgressTasks = allTasks.filter(t => t.status === 'in_progress');

      // Completion rate & on-time rate
      const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
      const onTimeTasks = completedTasks.filter(t => t.actualCompletionTime && t.plannedTime && new Date(t.actualCompletionTime) <= new Date(t.plannedTime));
      const onTimeRate = completedTasks.length > 0 ? Math.round((onTimeTasks.length / completedTasks.length) * 100) : 0;

      // Time span of data
      const taskDates = allTasks.map(t => new Date(t.createdAt!).getTime()).filter(d => !isNaN(d));
      const dataSpanMs = taskDates.length > 1 ? Math.max(...taskDates) - Math.min(...taskDates) : 0;
      const dataSpanHours = Math.max(dataSpanMs / (1000 * 60 * 60), 1);
      const dataSpanDays = Math.max(dataSpanHours / 24, 1);

      // Throughput
      const throughputPerHour = Math.round((completedTasks.length / dataSpanHours) * 100) / 100;
      const throughputPerDay = Math.round((completedTasks.length / dataSpanDays) * 100) / 100;

      // Average cycle time (creation → completion) in hours
      const cycleTimes = completedTasks
        .filter(t => t.actualCompletionTime && t.createdAt)
        .map(t => (new Date(t.actualCompletionTime!).getTime() - new Date(t.createdAt!).getTime()) / (1000 * 60 * 60));
      const avgCycleTimeHours = cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0;
      const medianCycleTimeHours = cycleTimes.length > 0 ? (() => {
        const sorted = [...cycleTimes].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      })() : 0;

      // P90 cycle time (90th percentile)
      const p90CycleTimeHours = cycleTimes.length > 0 ? (() => {
        const sorted = [...cycleTimes].sort((a, b) => a - b);
        const idx = Math.ceil(sorted.length * 0.9) - 1;
        return sorted[Math.min(idx, sorted.length - 1)];
      })() : 0;

      // Average flow completion time (from flowPerf data)
      const avgFlowCompletionDays = (flowPerf && flowPerf.length > 0)
        ? Math.round((flowPerf.reduce((sum: number, f: any) => sum + (f.avgCompletionTime || 0), 0) / flowPerf.length) * 10) / 10
        : 0;

      // ═══ TREND ANALYSIS — Current half vs previous half ═══
      const midpointTs = taskDates.length > 1
        ? Math.min(...taskDates) + (dataSpanMs / 2)
        : Date.now() - 15 * 24 * 60 * 60 * 1000;
      const currentPeriodTasks = allTasks.filter(t => new Date(t.createdAt!).getTime() >= midpointTs);
      const previousPeriodTasks = allTasks.filter(t => new Date(t.createdAt!).getTime() < midpointTs);

      const currentCompleted = currentPeriodTasks.filter(t => t.status === 'completed');
      const prevCompleted = previousPeriodTasks.filter(t => t.status === 'completed');
      const currentCompletionRate = currentPeriodTasks.length > 0 ? Math.round((currentCompleted.length / currentPeriodTasks.length) * 100) : 0;
      const prevCompletionRate = previousPeriodTasks.length > 0 ? Math.round((prevCompleted.length / previousPeriodTasks.length) * 100) : 0;

      const currentOnTime = currentCompleted.filter(t => t.actualCompletionTime && t.plannedTime && new Date(t.actualCompletionTime) <= new Date(t.plannedTime));
      const prevOnTime = prevCompleted.filter(t => t.actualCompletionTime && t.plannedTime && new Date(t.actualCompletionTime) <= new Date(t.plannedTime));
      const currentOnTimeRate = currentCompleted.length > 0 ? Math.round((currentOnTime.length / currentCompleted.length) * 100) : 0;
      const prevOnTimeRate = prevCompleted.length > 0 ? Math.round((prevOnTime.length / prevCompleted.length) * 100) : 0;

      const trendAnalysis = {
        currentPeriod: { tasks: currentPeriodTasks.length, completed: currentCompleted.length, completionRate: currentCompletionRate, onTimeRate: currentOnTimeRate },
        previousPeriod: { tasks: previousPeriodTasks.length, completed: prevCompleted.length, completionRate: prevCompletionRate, onTimeRate: prevOnTimeRate },
        completionRateDelta: currentCompletionRate - prevCompletionRate,
        onTimeRateDelta: currentOnTimeRate - prevOnTimeRate,
        volumeDelta: currentPeriodTasks.length - previousPeriodTasks.length,
        isImproving: (currentCompletionRate - prevCompletionRate) + (currentOnTimeRate - prevOnTimeRate) > 0,
      };

      // ═══ WEEKLY TREND DATA (last 8 weeks) ═══
      const weeklyTrend: Array<{ weekLabel: string; tasks: number; completed: number; overdue: number; onTimeRate: number }> = [];
      const now = new Date();
      for (let w = 7; w >= 0; w--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (w * 7 + 6));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const weekTasks = allTasks.filter(t => {
          const d = new Date(t.createdAt!).getTime();
          return d >= weekStart.getTime() && d <= weekEnd.getTime();
        });
        const weekCompleted = weekTasks.filter(t => t.status === 'completed');
        const weekOnTime = weekCompleted.filter(t => t.actualCompletionTime && t.plannedTime && new Date(t.actualCompletionTime) <= new Date(t.plannedTime));
        const weekOverdue = weekTasks.filter(t => t.status === 'overdue');
        weeklyTrend.push({
          weekLabel: `W${8 - w}`,
          tasks: weekTasks.length,
          completed: weekCompleted.length,
          overdue: weekOverdue.length,
          onTimeRate: weekCompleted.length > 0 ? Math.round((weekOnTime.length / weekCompleted.length) * 100) : 0,
        });
      }

      // ═══ SLA SCORING (Composite Business Health Score 0–100) ═══
      const slaCompletionScore = Math.min(completionRate, 100) * 0.30;
      const slaOnTimeScore = Math.min(onTimeRate, 100) * 0.30;
      const slaBottleneckPenalty = overdueTasks.length > 0 ? Math.min(20, (overdueTasks.length / Math.max(totalTasks, 1)) * 100) : 0;
      const slaEfficiencyBonus = throughputPerDay >= 1 ? Math.min(20, throughputPerDay * 4) : throughputPerDay * 10;
      const slaTrendBonus = trendAnalysis.isImproving ? 5 : -5;
      const compositeHealthScore = Math.max(0, Math.min(100, Math.round(
        slaCompletionScore + slaOnTimeScore + slaEfficiencyBonus - slaBottleneckPenalty + slaTrendBonus + 10
      )));

      const getHealthGrade = (score: number) => {
        if (score >= 90) return { grade: 'A+', label: 'World-Class Operations', color: '#059669' };
        if (score >= 80) return { grade: 'A', label: 'Excellent Operations', color: '#10B981' };
        if (score >= 70) return { grade: 'B+', label: 'Strong Performance', color: '#3B82F6' };
        if (score >= 60) return { grade: 'B', label: 'Good — Room for Growth', color: '#6366F1' };
        if (score >= 50) return { grade: 'C+', label: 'Average — Action Needed', color: '#D97706' };
        if (score >= 40) return { grade: 'C', label: 'Below Average', color: '#EA580C' };
        if (score >= 30) return { grade: 'D', label: 'Poor — Urgent Fix Required', color: '#DC2626' };
        return { grade: 'F', label: 'Critical — Immediate Intervention', color: '#991B1B' };
      };

      const healthGrade = getHealthGrade(compositeHealthScore);

      // ═══ DOER PERFORMANCE — Computed from allTasks for accuracy ═══
      const doerGroups: Record<string, { total: number; completed: number; pending: number; overdue: number; inProgress: number; onTime: number; totalTurnHrs: number; completedCount: number }> = {};
      allTasks.forEach(t => {
        const email = (t.doerEmail || '').trim();
        if (!email) return;
        if (!doerGroups[email]) doerGroups[email] = { total: 0, completed: 0, pending: 0, overdue: 0, inProgress: 0, onTime: 0, totalTurnHrs: 0, completedCount: 0 };
        const g = doerGroups[email];
        g.total++;
        if (t.status === 'completed') {
          g.completed++;
          if (t.actualCompletionTime && t.plannedTime && new Date(t.actualCompletionTime) <= new Date(t.plannedTime)) g.onTime++;
          if (t.actualCompletionTime && t.createdAt) {
            g.totalTurnHrs += (new Date(t.actualCompletionTime).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
            g.completedCount++;
          }
        } else if (t.status === 'overdue') {
          g.overdue++;
        } else if (t.status === 'in_progress') {
          g.inProgress++;
        } else if (t.status === 'pending') {
          g.pending++;
        }
      });

      const doersPerf = Object.entries(doerGroups).map(([email, g]) => ({
        doerEmail: email,
        doerName: email,
        totalTasks: g.total,
        completedTasks: g.completed,
        pendingTasks: g.pending + g.inProgress,
        overdueTasks: g.overdue,
        onTimeTasks: g.onTime,
        // On-time rate of TOTAL tasks (not just completed) — gives real picture
        onTimeRate: g.total > 0 ? Math.round((g.onTime / g.total) * 100) : 0,
        // Completion rate
        completionRate: g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0,
        // Avg turnaround time (creation → completion) in days
        avgCompletionDays: g.completedCount > 0 ? Math.round((g.totalTurnHrs / g.completedCount / 24) * 10) / 10 : 0,
      })).sort((a, b) => b.totalTasks - a.totalTasks);

      // ═══ RISK MATRIX ═══
      const riskItems: Array<{ risk: string; severity: string; impact: string; mitigation: string; color: string }> = [];
      if (overdueTasks.length > totalTasks * 0.2) riskItems.push({ risk: 'High Overdue Rate', severity: 'Critical', impact: `${overdueTasks.length} tasks overdue (${Math.round((overdueTasks.length / Math.max(totalTasks, 1)) * 100)}%)`, mitigation: 'Immediate task prioritization, escalation to managers, consider deadline extensions', color: '#DC2626' });
      if (onTimeRate < 50) riskItems.push({ risk: 'SLA Breach Risk', severity: 'High', impact: `Only ${onTimeRate}% tasks delivered on time`, mitigation: 'Review TAT targets, redistribute workload, add buffer time to estimates', color: '#EA580C' });
      if (completionRate < 60) riskItems.push({ risk: 'Low Throughput', severity: 'High', impact: `Only ${completionRate}% tasks completed`, mitigation: 'Identify blockers, streamline approval processes, automate repetitive steps', color: '#EA580C' });
      if (trendAnalysis.completionRateDelta < -10) riskItems.push({ risk: 'Declining Performance', severity: 'Medium', impact: `Completion rate dropped ${Math.abs(trendAnalysis.completionRateDelta)}% vs prior period`, mitigation: 'Root cause analysis, team check-ins, process audit', color: '#D97706' });
      const highCycleBottlenecks = Object.entries((() => {
        const groups: Record<string, { count: number; totalCycleHrs: number }> = {};
        allTasks.forEach(t => {
          if (!groups[t.taskName]) groups[t.taskName] = { count: 0, totalCycleHrs: 0 };
          groups[t.taskName].count++;
          if (t.status === 'completed' && t.actualCompletionTime && t.createdAt) {
            groups[t.taskName].totalCycleHrs += (new Date(t.actualCompletionTime).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
          }
        });
        return groups;
      })()).filter(([_, g]) => g.count > 2 && (g.totalCycleHrs / Math.max(g.count, 1)) > 48);
      if (highCycleBottlenecks.length > 0) riskItems.push({ risk: 'Process Bottlenecks', severity: 'Medium', impact: `${highCycleBottlenecks.length} task types with >48hr avg cycle time`, mitigation: 'Review and optimize slow processes, consider automation or parallel execution', color: '#D97706' });
      if (doersPerf.some(d => d.onTimeRate < 30)) riskItems.push({ risk: 'Team Capability Gap', severity: 'Medium', impact: 'One or more team members with <30% on-time rate', mitigation: 'Targeted training, mentoring, or workload redistribution', color: '#D97706' });
      if (cancelledTasks.length > totalTasks * 0.1) riskItems.push({ risk: 'High Cancellation Rate', severity: 'Low', impact: `${cancelledTasks.length} tasks cancelled (${Math.round((cancelledTasks.length / Math.max(totalTasks, 1)) * 100)}%)`, mitigation: 'Review task creation process, improve requirement clarity', color: '#6366F1' });
      if (riskItems.length === 0) riskItems.push({ risk: 'No Critical Risks Detected', severity: 'Info', impact: 'Operations are running within acceptable thresholds', mitigation: 'Continue monitoring, focus on continuous improvement', color: '#059669' });

      // ═══ CAPACITY UTILIZATION ═══
      const totalTeamMembers = new Set(allTasks.filter(t => (t.doerEmail || '').trim()).map(t => t.doerEmail)).size;
      const tasksPerPerson = totalTeamMembers > 0 ? Math.round((totalTasks / totalTeamMembers) * 10) / 10 : 0;
      const completedPerPerson = totalTeamMembers > 0 ? Math.round((completedTasks.length / totalTeamMembers) * 10) / 10 : 0;
      const overallUtilization = totalTeamMembers > 0 ? Math.min(100, Math.round(((completedTasks.length + inProgressTasks.length) / Math.max(totalTasks, 1)) * 100)) : 0;

      // ═══ PROCESS MATURITY (0–5 scale, like CMMI) ═══
      let maturityScore = 1.0;
      if (totalTasks >= 20) maturityScore += 0.5;
      if (completionRate >= 60) maturityScore += 0.5;
      if (completionRate >= 80) maturityScore += 0.5;
      if (onTimeRate >= 60) maturityScore += 0.5;
      if (onTimeRate >= 80) maturityScore += 0.5;
      if (allFlowRules.length >= 5) maturityScore += 0.3;
      if (totalTeamMembers >= 3) maturityScore += 0.2;
      if (trendAnalysis.isImproving) maturityScore += 0.3;
      if (overdueTasks.length === 0) maturityScore += 0.7;
      maturityScore = Math.min(5, Math.round(maturityScore * 10) / 10);

      const maturityLabel = maturityScore >= 4.5 ? 'Optimizing' : maturityScore >= 3.5 ? 'Quantitatively Managed' : maturityScore >= 2.5 ? 'Defined' : maturityScore >= 1.5 ? 'Managed' : 'Initial';

      // 4. Bottleneck analysis — group by taskName, find slowest
      const taskNameGroups: Record<string, { count: number; totalCycleHrs: number; overdueCount: number; pendingCount: number }> = {};
      allTasks.forEach(t => {
        if (!taskNameGroups[t.taskName]) {
          taskNameGroups[t.taskName] = { count: 0, totalCycleHrs: 0, overdueCount: 0, pendingCount: 0 };
        }
        const g = taskNameGroups[t.taskName];
        g.count++;
        if (t.status === 'overdue') g.overdueCount++;
        if (t.status === 'pending' || t.status === 'in_progress') g.pendingCount++;
        if (t.status === 'completed' && t.actualCompletionTime && t.createdAt) {
          g.totalCycleHrs += (new Date(t.actualCompletionTime).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        }
      });

      const bottlenecks = Object.entries(taskNameGroups)
        .map(([taskName, g]) => {
          const completedInGroup = allTasks.filter(t => t.taskName === taskName && t.status === 'completed').length;
          return {
            taskName,
            totalInstances: g.count,
            avgCycleHours: completedInGroup > 0 ? Math.round((g.totalCycleHrs / completedInGroup) * 10) / 10 : 0,
            overdueCount: g.overdueCount,
            pendingCount: g.pendingCount,
            completionRate: g.count > 0 ? Math.round((completedInGroup / g.count) * 100) : 0,
          };
        })
        .sort((a, b) => b.avgCycleHours - a.avgCycleHours);

      // 5. Per-system breakdown
      const systemGroups: Record<string, { total: number; completed: number; overdue: number; pending: number; totalCycleHrs: number }> = {};
      allTasks.forEach(t => {
        if (!systemGroups[t.system]) {
          systemGroups[t.system] = { total: 0, completed: 0, overdue: 0, pending: 0, totalCycleHrs: 0 };
        }
        const g = systemGroups[t.system];
        g.total++;
        if (t.status === 'completed') g.completed++;
        if (t.status === 'overdue') g.overdue++;
        if (t.status === 'pending' || t.status === 'in_progress') g.pending++;
        if (t.status === 'completed' && t.actualCompletionTime && t.createdAt) {
          g.totalCycleHrs += (new Date(t.actualCompletionTime).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        }
      });

      const systemBreakdown = Object.entries(systemGroups).map(([system, g]) => ({
        system,
        totalTasks: g.total,
        completed: g.completed,
        overdue: g.overdue,
        pending: g.pending,
        completionRate: g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0,
        avgCycleHours: g.completed > 0 ? Math.round((g.totalCycleHrs / g.completed) * 10) / 10 : 0,
        slaScore: g.total > 0 ? Math.round(((g.completed - g.overdue) / g.total) * 100) : 0,
      }));

      // 6. Loss cost calculation
      let totalWaitHours = 0;
      allTasks.forEach(t => {
        if (t.status === 'overdue' && t.plannedTime) {
          const now = new Date();
          const overdueHrs = (now.getTime() - new Date(t.plannedTime).getTime()) / (1000 * 60 * 60);
          if (overdueHrs > 0) totalWaitHours += overdueHrs;
        }
        if (t.status === 'completed' && t.actualCompletionTime && t.plannedTime) {
          const lateHrs = (new Date(t.actualCompletionTime).getTime() - new Date(t.plannedTime).getTime()) / (1000 * 60 * 60);
          if (lateHrs > 0) totalWaitHours += lateHrs;
        }
      });
      const lossCost = Math.round(totalWaitHours * costPerHour);

      // Monthly loss projection
      const lossCostPerDay = dataSpanDays > 0 ? lossCost / dataSpanDays : 0;
      const projectedMonthlyLoss = Math.round(lossCostPerDay * 30);
      const projectedAnnualLoss = Math.round(lossCostPerDay * 365);

      // 7. Productivity & Performance
      const activeTasks = totalTasks - cancelledTasks.length;
      const productivity = activeTasks > 0 ? Math.round((completedTasks.length / activeTasks) * 100) : 0;
      const performance = onTimeRate;

      // ═══ EFFICIENCY INDEX (weighted composite 0-100) ═══
      const efficiencyIndex = Math.round(
        (completionRate * 0.25) +
        (onTimeRate * 0.25) +
        (productivity * 0.20) +
        (Math.min(100, throughputPerDay * 20) * 0.15) +
        ((100 - Math.min(100, (overdueTasks.length / Math.max(totalTasks, 1)) * 100)) * 0.15)
      );

      // 8. Doer rankings (use computed doersPerf with real on-time rates)
      const topPerformers = [...doersPerf]
        .filter(d => d.completedTasks > 0)
        .sort((a, b) => b.onTimeRate - a.onTimeRate || b.completedTasks - a.completedTasks)
        .slice(0, 5);
      const needsAttention = [...doersPerf]
        .filter(d => d.totalTasks > 0)
        .sort((a, b) => a.onTimeRate - b.onTimeRate || a.completionRate - b.completionRate)
        .slice(0, 5);

      // ═══ DOER HEAT MAP (performance distribution based on on-time rate) ═══
      const performanceDistribution = {
        excellent: doersPerf.filter(d => d.onTimeRate >= 80).length,
        good: doersPerf.filter(d => d.onTimeRate >= 60 && d.onTimeRate < 80).length,
        average: doersPerf.filter(d => d.onTimeRate >= 40 && d.onTimeRate < 60).length,
        poor: doersPerf.filter(d => d.onTimeRate < 40).length,
        total: doersPerf.length,
      };

      // 9. Business health status (Patented — Process Sutra)
      let businessStatus = '';
      let businessEmoji = '';
      let actionPlan = '';
      if (completionRate >= 80 && onTimeRate >= 80) {
        businessStatus = 'Growth Ready'; businessEmoji = '🚀';
        actionPlan = 'Pursue aggressive growth, acquire new business, increase marketing spend, invest in automation.';
      } else if (completionRate >= 80 && onTimeRate < 70) {
        businessStatus = 'Overloaded System'; businessEmoji = '⚠️';
        actionPlan = 'Hire additional staff, rebalance workload across team, review and adjust TAT targets.';
      } else if (completionRate >= 50 && onTimeRate >= 80) {
        businessStatus = 'Underutilized Capacity'; businessEmoji = '📉';
        actionPlan = 'Bring in more work, boost sales pipeline, audit task flow for bottlenecks.';
      } else if (completionRate >= 50 && onTimeRate >= 50) {
        businessStatus = 'Stable but Slow'; businessEmoji = '😐';
        actionPlan = 'Improve SOPs, increase monitoring frequency, provide micro-training to team.';
      } else if (completionRate < 50 && onTimeRate >= 80) {
        businessStatus = 'Misaligned Execution'; businessEmoji = '🧭';
        actionPlan = 'Redefine KPIs, switch to output-based tracking, realign team priorities.';
      } else {
        businessStatus = 'Critical Condition'; businessEmoji = '🔥';
        actionPlan = 'Immediate system audit, assign clear accountability, enforce strict follow-ups, consider restructuring.';
      }

      // Build report object
      const report = {
        generatedAt: new Date().toISOString(),
        reportVersion: '3.0',
        copyright: COPYRIGHT_NOTICE,
        copyrightShort: COPYRIGHT_SHORT,
        organization: {
          name: orgData?.companyName || orgData?.name || 'Organization',
          domain: orgData?.domain || '',
          industry: orgData?.industry || '',
          businessType: orgData?.businessType || '',
          customerType: orgData?.customerType || '',
        },
        tatConfig: {
          officeHours: `${tatConfigData?.officeStartHour || 9}:00 - ${tatConfigData?.officeEndHour || 17}:00`,
          timezone: tatConfigData?.timezone || 'Asia/Kolkata',
          skipWeekends: tatConfigData?.skipWeekends ?? true,
        },
        summary: {
          totalTasks,
          completedTasks: completedTasks.length,
          pendingTasks: pendingTasks.length,
          overdueTasks: overdueTasks.length,
          inProgressTasks: inProgressTasks.length,
          cancelledTasks: cancelledTasks.length,
          completionRate,
          onTimeRate,
          productivity,
          performance,
          throughputPerHour,
          throughputPerDay,
          avgCycleTimeHours: Math.round(avgCycleTimeHours * 10) / 10,
          avgCycleTimeDays: Math.round((avgCycleTimeHours / 24) * 10) / 10,
          medianCycleTimeHours: Math.round(medianCycleTimeHours * 10) / 10,
          p90CycleTimeHours: Math.round(p90CycleTimeHours * 10) / 10,
          avgFlowCompletionDays,
          dataSpanDays: Math.round(dataSpanDays),
          businessStatus,
          businessEmoji,
          actionPlan,
          efficiencyIndex,
        },
        // ═══ NEW: Health Score & Grade ═══
        healthScore: {
          composite: compositeHealthScore,
          grade: healthGrade.grade,
          label: healthGrade.label,
          color: healthGrade.color,
          breakdown: {
            completionComponent: Math.round(slaCompletionScore * 10) / 10,
            onTimeComponent: Math.round(slaOnTimeScore * 10) / 10,
            efficiencyBonus: Math.round(slaEfficiencyBonus * 10) / 10,
            bottleneckPenalty: Math.round(slaBottleneckPenalty * 10) / 10,
            trendBonus: slaTrendBonus,
          },
        },
        // ═══ NEW: Trend Analysis ═══
        trendAnalysis,
        weeklyTrend,
        // ═══ NEW: Risk Matrix ═══
        riskMatrix: riskItems,
        // ═══ NEW: Capacity ═══
        capacity: {
          totalTeamMembers,
          tasksPerPerson,
          completedPerPerson,
          overallUtilization,
        },
        // ═══ NEW: Process Maturity ═══
        processMaturity: {
          score: maturityScore,
          label: maturityLabel,
          maxScore: 5,
        },
        // ═══ NEW: Performance Distribution ═══
        performanceDistribution,
        lossCost: {
          totalWaitHours: Math.round(totalWaitHours * 10) / 10,
          costPerHour,
          totalLossCost: lossCost,
          projectedMonthlyLoss,
          projectedAnnualLoss,
          currency: 'INR',
        },
        bottlenecks: bottlenecks.slice(0, 10),
        systemBreakdown,
        flowPerformance: flowPerf,
        doerPerformance: doersPerf,
        topPerformers,
        needsAttention,
        totalFlowRules: allFlowRules.length,
        totalSystems: Array.from(new Set(allFlowRules.map(r => r.system))).length,
        idealComparison: {
          actual: {
            completionRate,
            onTimeRate,
            productivity,
            performance,
            throughputPerDay,
            avgCycleTimeDays: Math.round((avgCycleTimeHours / 24) * 10) / 10,
            lossCost,
            completedTasks: completedTasks.length,
            overdueTasks: overdueTasks.length,
          },
          ideal: {
            completionRate: 100,
            onTimeRate: 100,
            productivity: 100,
            performance: 100,
            throughputPerDay: activeTasks > 0 ? Math.round((activeTasks / dataSpanDays) * 100) / 100 : 0,
            avgCycleTimeDays: 0,
            lossCost: 0,
            completedTasks: activeTasks,
            overdueTasks: 0,
          },
          gap: {
            completionRate: 100 - completionRate,
            onTimeRate: 100 - onTimeRate,
            productivity: 100 - productivity,
            performance: 100 - performance,
            throughputPerDayGap: Math.round(((activeTasks > 0 ? activeTasks / dataSpanDays : 0) - throughputPerDay) * 100) / 100,
            additionalTasksNeeded: activeTasks - completedTasks.length,
            lossCostRecoverable: lossCost,
            overdueToResolve: overdueTasks.length,
          },
        },
        aiAnalysis: null as string | null,
      };

      // 10. Optional AI-powered analysis (sanitized — only aggregated KPIs sent)
      if (includeAI) {
        try {
          const { organizations: orgsTable } = await import("@shared/schema");
          const [org] = await db
            .select({ geminiApiKey: orgsTable.geminiApiKey, openaiApiKey: orgsTable.openaiApiKey })
            .from(orgsTable)
            .where(eq(orgsTable.id, orgId))
            .limit(1);

          const apiKey = org?.geminiApiKey || org?.openaiApiKey;
          const provider = org?.geminiApiKey ? 'gemini' : 'openai';

          if (apiKey) {
            // Build sanitized prompt — NO raw data, only aggregated KPIs
            const { prompt, systemPrompt } = buildAIPrompt(report);

            if (provider === 'gemini') {
              report.aiAnalysis = await callGeminiForReport(apiKey, prompt, systemPrompt);
            } else {
              report.aiAnalysis = await callOpenAIForReport(apiKey, prompt, systemPrompt);
            }
          }
          // If no API key configured, report continues without AI — all other sections work perfectly
        } catch (aiError) {
          console.error("[Voice of Business] AI analysis failed (report continues without AI):", aiError);
          // Report is fully functional without AI — all charts, metrics, tables still generated
        }
      }

      res.json(report);
    } catch (error) {
      console.error("Error generating performance report:", error);
      res.status(500).json({ message: "Failed to generate performance report" });
    }
  });
}
