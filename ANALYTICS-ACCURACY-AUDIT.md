# Analytics (My Performance) - Accuracy Audit Report

**Date:** October 13, 2025  
**Audit Type:** Data Accuracy & Calculation Verification  
**Status:** ⚠️ **ISSUES FOUND - CORRECTIONS NEEDED**

---

## Executive Summary

After a comprehensive audit of the Analytics (My Performance) page, **several critical issues** have been identified that affect the accuracy of the displayed metrics. The main issues involve:

1. ❌ **Flow counting logic is INCORRECT**
2. ⚠️ **Pending tasks are not counted**
3. ⚠️ **Average completion time calculation inconsistency**
4. ❌ **Flow status determination is flawed**

---

## Detailed Findings

### 🔴 CRITICAL ISSUE #1: Flow Counting Logic

**Problem:** The current implementation counts flows incorrectly.

**Current Code (INCORRECT):**
```typescript
// Total Flows - OK
const totalFlowsResult = await db
  .selectDistinct({ flowId: tasks.flowId })
  .from(tasks)
  .where(eq(tasks.doerEmail, userEmail));

// Completed Flows - WRONG ❌
const completedFlowsResult = await db
  .select({ flowId: tasks.flowId })
  .from(tasks)
  .where(and(eq(tasks.doerEmail, userEmail), eq(tasks.status, "completed")))
  .groupBy(tasks.flowId);
```

**Issue:**
- A flow is counted as "completed" if **ANY task** in the flow is completed
- This is incorrect! A flow should only be "completed" when **ALL tasks** in the flow are completed
- Same issue for "in progress" and "stopped" flows

**Example Scenario:**
```
Flow A has 3 tasks:
- Task 1: completed
- Task 2: in_progress
- Task 3: pending

Current logic incorrectly counts Flow A as BOTH:
- ✅ Completed flow (because Task 1 is completed)
- ✅ In Progress flow (because Task 2 is in_progress)

Result: Flow is double-counted! ❌
```

**Impact:** 
- Flow counts are inflated and inaccurate
- User sees misleading data about flow completion

---

### 🟡 ISSUE #2: Missing Pending Tasks

**Problem:** Pending tasks are not explicitly counted.

**Current Metrics:**
- ✅ Total Tasks
- ✅ Completed Tasks
- ✅ Overdue Tasks
- ✅ In Progress Tasks
- ✅ Stopped Tasks
- ❌ **Pending Tasks - MISSING**

**Impact:**
The breakdown doesn't show how many tasks are waiting to be started. Users can't see:
```
Total Tasks = Pending + In Progress + Completed + Overdue + Stopped
```

**Current State:**
If a user has 45 total tasks:
- In Progress: 7
- Completed: 35
- Stopped: 3
- Overdue: 2
- **Missing**: ? pending tasks

The math doesn't add up visibly!

---

### 🟡 ISSUE #3: Average Completion Time Inconsistency

**Problem:** Two different calculation methods are used.

**For Task Average:**
```typescript
// Uses: actualCompletionTime - createdAt ✅
avgTime: sql`AVG(EXTRACT(EPOCH FROM (${tasks.actualCompletionTime} - ${tasks.createdAt})) / 86400)`
```

**For Flow Performance by System:**
```typescript
// Uses: actualCompletionTime - plannedTime ❌ (different metric!)
avgTime: sql`AVG(EXTRACT(EPOCH FROM (${tasks.actualCompletionTime} - ${tasks.plannedTime})) / 86400)`
```

**Issue:**
- `actualCompletionTime - createdAt` = **Total time to complete** ✅
- `actualCompletionTime - plannedTime` = **Delay/ahead of schedule** (can be negative!)

**Impact:**
- Flow performance avg time shows DELAY, not actual completion time
- Inconsistent metrics confuse users
- Negative values possible if completed early

---

### 🔴 CRITICAL ISSUE #4: Flow Status Determination

**Problem:** A flow's status is not properly determined.

**Reality Check:**
A flow should be:
- **Completed**: When ALL tasks in flow are completed
- **In Progress**: When at least one task is in_progress (and flow not completed)
- **Stopped**: When flow is marked as stopped (all remaining tasks cancelled)
- **Pending**: When all tasks are pending

**Current Implementation:**
- Groups by flowId and checks if ANY task has that status
- Doesn't check if ALL tasks in flow have same status
- Can result in same flow counted in multiple categories

---

### 🟡 ISSUE #5: Efficiency Calculation May Be Misleading

**Current Formula:**
```typescript
efficiency = (onTimeTasks / completedTasks) * 100
```

**Potential Issue:**
- Only considers **completed** tasks
- Doesn't account for overdue tasks that are still in progress
- A user could have many overdue tasks but still show 100% efficiency if all completed tasks were on time

**More Accurate Formula:**
```typescript
// Include all non-pending tasks in efficiency calculation
efficiency = (onTimeTasks / (completedTasks + overdueTasks)) * 100
```

---

## Recommended Fixes

### Fix #1: Correct Flow Counting Logic

```typescript
// Get all flows for this user with their task statuses
const flowStatusQuery = await db
  .select({
    flowId: tasks.flowId,
    statuses: sql<string[]>`ARRAY_AGG(DISTINCT ${tasks.status})`
  })
  .from(tasks)
  .where(eq(tasks.doerEmail, userEmail))
  .groupBy(tasks.flowId);

// Determine flow status based on ALL tasks in the flow
let completedFlows = 0;
let inProgressFlows = 0;
let stoppedFlows = 0;
let pendingFlows = 0;

for (const flow of flowStatusQuery) {
  const statuses = flow.statuses;
  
  // Flow is completed only if ALL tasks are completed
  if (statuses.length === 1 && statuses[0] === 'completed') {
    completedFlows++;
  }
  // Flow is stopped if it contains cancelled tasks
  else if (statuses.includes('cancelled')) {
    stoppedFlows++;
  }
  // Flow is in progress if it has in_progress or completed tasks
  else if (statuses.includes('in_progress') || statuses.includes('completed')) {
    inProgressFlows++;
  }
  // Flow is pending if all tasks are pending
  else if (statuses.length === 1 && statuses[0] === 'pending') {
    pendingFlows++;
  }
}

return {
  totalFlows: flowStatusQuery.length,
  completedFlows,
  inProgressFlows,
  stoppedFlows,
  pendingFlows, // NEW
  // ... other metrics
};
```

### Fix #2: Add Pending Tasks Count

```typescript
const pendingResult = await db
  .select({ count: count() })
  .from(tasks)
  .where(and(eq(tasks.doerEmail, userEmail), eq(tasks.status, "pending")));

const pendingTasks = pendingResult[0].count;

return {
  // ... existing metrics
  pendingTasks, // ADD THIS
};
```

### Fix #3: Fix Average Completion Time Consistency

**Update getUserFlowPerformance:**
```typescript
// Change from plannedTime to createdAt for consistency
avgTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${tasks.actualCompletionTime} - ${tasks.createdAt})) / 86400)`
```

OR add both metrics:
```typescript
avgCompletionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${tasks.actualCompletionTime} - ${tasks.createdAt})) / 86400)`,
avgDelay: sql<number>`AVG(EXTRACT(EPOCH FROM (${tasks.actualCompletionTime} - ${tasks.plannedTime})) / 86400)`,
```

### Fix #4: Clarify Efficiency Calculation

**Option A: Keep current (only completed tasks)**
```typescript
// Efficiency = On-time completion rate (of completed work)
efficiency = (onTimeTasks / completedTasks) * 100
// Good for: "Of the work I finished, how much was on time?"
```

**Option B: Include overdue tasks**
```typescript
// Efficiency = On-time rate (of all resolved work)
const resolvedTasks = completedTasks + overdueTasks;
efficiency = resolvedTasks > 0 ? (onTimeTasks / resolvedTasks) * 100 : 0;
// Good for: "Of all work finished (on time or late), what % was on time?"
```

**Recommendation:** Keep Option A but add clear description in UI.

---

## Testing Scenarios

### Test Case 1: Flow Status Accuracy

**Setup:**
```
User has 2 flows:

Flow A (3 tasks):
- Task 1: completed
- Task 2: completed  
- Task 3: completed

Flow B (3 tasks):
- Task 1: completed
- Task 2: in_progress
- Task 3: pending
```

**Expected Results:**
- Total Flows: 2
- Completed Flows: 1 (only Flow A)
- In Progress Flows: 1 (Flow B)
- Stopped Flows: 0

**Current (Incorrect) Results:**
- Total Flows: 2 ✅
- Completed Flows: 2 ❌ (counts Flow B because it has completed tasks)
- In Progress Flows: 1 ✅
- Stopped Flows: 0 ✅

### Test Case 2: Task Count Totals

**Setup:**
User has 50 total tasks with statuses:
- Pending: 10
- In Progress: 8
- Completed: 28
- Overdue: 3
- Stopped: 1

**Expected Results:**
```
10 + 8 + 28 + 3 + 1 = 50 ✅
```

**Current Results:**
```
? + 8 + 28 + 3 + 1 = ? ❌ (pending not shown)
```

### Test Case 3: Average Time Consistency

**Setup:**
Task completed in 5 days:
- Created: Day 0
- Planned: Day 3
- Completed: Day 5

**Metrics:**
- Actual completion time: 5 days (Day 5 - Day 0) ✅
- Delay: 2 days (Day 5 - Day 3) ⚠️

**Current Implementation:**
- Task avg time: 5 days ✅
- Flow performance avg: Shows 2 days ❌ (delay, not completion time)

---

## Priority of Fixes

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| 🔴 **P0** | Flow counting logic | HIGH - Incorrect data | MEDIUM |
| 🟡 **P1** | Add pending tasks | MEDIUM - Incomplete view | LOW |
| 🟡 **P1** | Avg time consistency | MEDIUM - Confusing metrics | LOW |
| 🟢 **P2** | Efficiency clarification | LOW - Works but unclear | LOW |

---

## Corrected Formulas Summary

### Task Metrics ✅
```typescript
totalTasks = COUNT(*) WHERE doerEmail = user
completedTasks = COUNT(*) WHERE doerEmail = user AND status = 'completed'
inProgressTasks = COUNT(*) WHERE doerEmail = user AND status = 'in_progress'
pendingTasks = COUNT(*) WHERE doerEmail = user AND status = 'pending' // ADD
overdueTasks = COUNT(*) WHERE doerEmail = user AND status = 'overdue'
stoppedTasks = COUNT(*) WHERE doerEmail = user AND status = 'cancelled'

// Validation: totalTasks = pending + inProgress + completed + overdue + stopped
```

### Flow Metrics ❌ → ✅
```typescript
// WRONG (current):
completedFlows = COUNT(DISTINCT flowId) WHERE ANY task status = 'completed'

// CORRECT (needed):
completedFlows = COUNT(flowId) WHERE ALL tasks status = 'completed'
inProgressFlows = COUNT(flowId) WHERE has 'in_progress' AND not all 'completed'
stoppedFlows = COUNT(flowId) WHERE has 'cancelled'
pendingFlows = COUNT(flowId) WHERE ALL tasks status = 'pending' // ADD
```

### Performance Metrics ⚠️
```typescript
// Efficiency (keep current, but clarify in UI):
efficiency = (onTimeTasks / completedTasks) × 100
// Description: "Of completed work, % finished on time"

// Productivity (correct):
productivity = (completedTasks / totalTasks) × 100
// Description: "% of total work completed"

// Average Times (fix consistency):
avgTaskTime = AVG(actualCompletionTime - createdAt) // Use this everywhere
avgFlowTime = AVG(actualCompletionTime - flowInitiatedAt) // Keep this
```

---

## Validation Queries

### Query to Validate Task Counts
```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as stopped
FROM tasks
WHERE doer_email = 'user@example.com';

-- Validate: total = pending + in_progress + completed + overdue + stopped
```

### Query to Validate Flow Counts
```sql
WITH flow_statuses AS (
  SELECT 
    flow_id,
    ARRAY_AGG(DISTINCT status) as statuses,
    COUNT(*) as task_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
  FROM tasks
  WHERE doer_email = 'user@example.com'
  GROUP BY flow_id
)
SELECT
  COUNT(*) as total_flows,
  COUNT(CASE WHEN completed_count = task_count THEN 1 END) as completed_flows,
  COUNT(CASE WHEN 'in_progress' = ANY(statuses) AND completed_count < task_count THEN 1 END) as in_progress_flows,
  COUNT(CASE WHEN 'cancelled' = ANY(statuses) THEN 1 END) as stopped_flows,
  COUNT(CASE WHEN statuses = ARRAY['pending'] THEN 1 END) as pending_flows
FROM flow_statuses;
```

---

## Impact Assessment

### Before Fixes
- ❌ Flow counts are **incorrect and inflated**
- ❌ Task breakdown is **incomplete** (missing pending)
- ⚠️ Average times show **different metrics** (confusing)
- ⚠️ User cannot validate totals (numbers don't add up)

### After Fixes
- ✅ Flow counts are **accurate** (one status per flow)
- ✅ Task breakdown is **complete** (all statuses shown)
- ✅ Average times are **consistent** (same calculation method)
- ✅ User can **validate totals** (pending + in_progress + ... = total)

---

## Recommendations

### Immediate Actions Required (P0)

1. **Fix Flow Counting Logic**
   - Implement proper flow status determination
   - Ensure each flow has ONE status only
   - Add pending flows category

2. **Add Pending Tasks Count**
   - Simple query addition
   - Makes task breakdown complete
   - Allows users to validate totals

3. **Fix Average Time Consistency**
   - Use `actualCompletionTime - createdAt` everywhere
   - Or clearly label which metric is shown

### UI Improvements (P1)

1. **Add Validation Text**
   ```
   Total Tasks: 50
   = Pending (10) + In Progress (8) + Completed (28) + Overdue (3) + Stopped (1)
   ```

2. **Add Metric Descriptions**
   - Efficiency: "Of completed work, % finished on time"
   - Productivity: "% of total work completed"
   - Avg Task Time: "Average days from task creation to completion"

3. **Add Flow Breakdown Chart**
   - Show pending flows in pie chart
   - Currently missing from flow distribution

---

## Conclusion

**Audit Status:** ⚠️ **ACCURACY ISSUES FOUND**

**Critical Issues:** 2
- Flow counting logic (P0)
- Average time inconsistency (P1)

**Medium Issues:** 2
- Missing pending tasks (P1)
- Missing pending flows (P1)

**Minor Issues:** 1
- Efficiency calculation clarity (P2)

**Recommendation:** Implement P0 and P1 fixes before releasing to production. The current implementation shows incorrect flow counts which undermines user trust in the analytics.

**Estimated Fix Time:** 2-3 hours for all P0 and P1 fixes.

---

**Next Steps:**
1. Review this audit with development team
2. Prioritize fixes (P0 → P1 → P2)
3. Implement corrected queries
4. Add validation tests
5. Verify accuracy with real data
6. Update documentation

