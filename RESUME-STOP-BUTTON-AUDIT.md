# Resume/Stop Button Functionality Audit

**Date:** October 13, 2025  
**Status:** 🔴 CRITICAL ISSUES FOUND  
**File:** `client/src/pages/flow-data.tsx`

---

## 🔍 Issues Identified

### **Issue #1: Status Calculation Not Considering Cancelled Tasks Properly**
**Location:** Lines 207-240 (flow status computation)

**Problem:**
```typescript
// Current logic (INCORRECT):
const flowMap = new Map<string, FlowSummary>();

(tasks || []).forEach((task: any) => {
  if (!flowMap.has(task.flowId)) {
    const status = task.status === 'completed' ? 'completed' : 
                 task.status === 'pending' ? 'in-progress' : 'pending';
    // ❌ Initial status doesn't check for 'cancelled' tasks
    
    flowMap.set(task.flowId, {
      flowId: task.flowId,
      system: task.system,
      orderNumber: task.orderNumber,
      description: task.flowDescription,
      initiatedAt: task.flowInitiatedAt,
      initiatedBy: task.flowInitiatedBy,
      taskCount: 1,
      completedTasks: task.status === 'completed' ? 1 : 0,
      cancelledTasks: task.status === 'cancelled' ? 1 : 0,
      status
    });
  } else {
    const flow = flowMap.get(task.flowId)!;
    flow.taskCount++;
    if (task.status === 'completed') {
      flow.completedTasks++;
    }
    if (task.status === 'cancelled') {
      flow.cancelledTasks++;
    }
    // Update status based on completion and cancellation
    if (flow.cancelledTasks > 0 && flow.completedTasks < flow.taskCount) {
      flow.status = 'stopped';
    } else if (flow.completedTasks === flow.taskCount) {
      flow.status = 'completed';
    } else if (flow.completedTasks > 0) {
      flow.status = 'in-progress';
    }
    // ❌ Status update logic only runs AFTER first task
    // ❌ Doesn't check for pending/in-progress tasks when deciding 'stopped'
  }
});
```

**Why This Causes Issues:**
1. **First task sets wrong status**: When processing first task, if it's cancelled, status is set to 'pending' or 'in-progress' instead of 'stopped'
2. **Incomplete logic**: Status update inside `else` block doesn't properly check all conditions
3. **No refetch trigger**: After stop/resume, the query invalidation may not refresh immediately

**Actual User Impact:**
- After stopping a flow, the Stop button remains visible (should show Resume)
- This is because the flow status is not being recalculated correctly from cancelled tasks

---

### **Issue #2: Query Invalidation Without Waiting**
**Location:** Lines 106-111, 150-155 (mutation onSuccess)

**Problem:**
```typescript
onSuccess: (data) => {
  toast({ title: "Flow Stopped", description: data.message });
  
  // ❌ Invalidates queries but doesn't wait for refetch
  queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
  queryClient.invalidateQueries({ queryKey: ["/api/flows"] });
  
  setIsStopDialogOpen(false);
  setFlowToStop(null);
  setStopReason("");
  setSelectedFlowId(null); // ❌ Closes view before data refreshes
},
```

**Why This Causes Issues:**
1. Dialog closes immediately, but data refresh happens asynchronously
2. User sees old state briefly before React Query refetches
3. No guarantee that UI updates before dialog closes

---

### **Issue #3: Detailed View Button Logic Incomplete**
**Location:** Lines 438-468 (detailed view stop/resume button)

**Problem:**
```typescript
{isAdmin && selectedFlowData && (
  (() => {
    const flowSummary = flowSummaries.find(f => f.flowId === selectedFlowId);
    const hasActiveTasks = selectedFlowData.tasks?.some((t: any) => 
      t.status !== 'completed' && t.status !== 'cancelled');
    const hasCancelledTasks = selectedFlowData.tasks?.some((t: any) => 
      t.status === 'cancelled');
    
    if (flowSummary) {
      // ✅ Shows Resume if stopped AND has cancelled tasks
      if (flowSummary.status === 'stopped' && hasCancelledTasks) {
        return <Button>Resume This Flow</Button>;
      } 
      // ❌ Shows Stop if has active tasks (doesn't check flow status)
      else if (hasActiveTasks) {
        return <Button>Stop This Flow</Button>;
      }
    }
    return null;
  })()
)}
```

**Why This Causes Issues:**
1. Logic relies on `flowSummary.status` which may be stale
2. Doesn't handle case where flow is 'stopped' but `hasActiveTasks` is true
3. Inconsistent with summary card logic

---

### **Issue #4: Summary Card Button Logic**
**Location:** Lines 385-413 (summary card buttons)

**Problem:**
```typescript
{isAdmin && flow.status !== 'completed' && (
  flow.status === 'stopped' ? (
    <Button onClick={() => handleResumeFlow(flow)}>
      Resume Flow
    </Button>
  ) : (
    <Button onClick={() => handleStopFlow(flow)}>
      Stop Flow
    </Button>
  )
)}
```

**Status:**
✅ This logic is **CORRECT** - shows Resume for 'stopped', Stop for others  
❌ But the `flow.status` calculation is wrong (Issue #1), so it doesn't work properly

---

## 📊 Root Cause Analysis

```
┌─────────────────────────────────────────────────────────────┐
│                    ROOT CAUSE                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  When Admin clicks "Stop Flow":                            │
│  1. Backend cancels all pending tasks ✅                    │
│  2. Tasks status changes to 'cancelled' ✅                  │
│  3. React Query invalidates cache ✅                        │
│  4. Tasks refetch from API ✅                               │
│  5. Flow summary recalculates from tasks ❌                 │
│     → Status logic FAILS to set 'stopped' correctly        │
│     → flow.status remains 'in-progress' or 'pending'       │
│  6. Button rendering checks flow.status ✅                  │
│     → Since status !== 'stopped', shows "Stop" button      │
│                                                             │
│  Result: Stop button stays visible after stopping! 🔴      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Required Fixes

### **Fix #1: Correct Flow Status Calculation**
Move status calculation logic OUTSIDE the forEach loop and recalculate after all tasks are processed:

```typescript
// ✅ CORRECT APPROACH
(tasks || []).forEach((task: any) => {
  if (!flowMap.has(task.flowId)) {
    flowMap.set(task.flowId, {
      flowId: task.flowId,
      system: task.system,
      orderNumber: task.orderNumber,
      description: task.flowDescription,
      initiatedAt: task.flowInitiatedAt,
      initiatedBy: task.flowInitiatedBy,
      taskCount: 0,
      completedTasks: 0,
      cancelledTasks: 0,
      status: 'pending' // Temporary, will be recalculated
    });
  }
  
  const flow = flowMap.get(task.flowId)!;
  flow.taskCount++;
  if (task.status === 'completed') flow.completedTasks++;
  if (task.status === 'cancelled') flow.cancelledTasks++;
});

// ✅ Recalculate status AFTER processing all tasks
flowMap.forEach((flow) => {
  const hasActiveTasks = flow.taskCount - flow.completedTasks - flow.cancelledTasks > 0;
  const allCompleted = flow.completedTasks === flow.taskCount;
  const hasCancelled = flow.cancelledTasks > 0;
  
  if (allCompleted) {
    flow.status = 'completed';
  } else if (hasCancelled && !hasActiveTasks) {
    flow.status = 'stopped'; // All remaining tasks cancelled
  } else if (hasCancelled || flow.completedTasks > 0) {
    flow.status = 'in-progress'; // Some tasks done, some active
  } else {
    flow.status = 'pending'; // No tasks started yet
  }
});
```

### **Fix #2: Wait for Query Refetch**
Use `await` with query invalidation and refetch:

```typescript
onSuccess: async (data) => {
  toast({ title: "Flow Stopped", description: data.message });
  
  // ✅ Wait for queries to refetch
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/flows"] }),
  ]);
  
  // ✅ Add small delay to ensure UI updates
  setTimeout(() => {
    setIsStopDialogOpen(false);
    setFlowToStop(null);
    setStopReason("");
    setSelectedFlowId(null);
  }, 300);
},
```

### **Fix #3: Simplify Detailed View Button Logic**
Use the same logic as summary card:

```typescript
{isAdmin && selectedFlowData && (() => {
  const flowSummary = flowSummaries.find(f => f.flowId === selectedFlowId);
  
  if (flowSummary && flowSummary.status !== 'completed') {
    if (flowSummary.status === 'stopped') {
      return (
        <Button className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleResumeFlow(flowSummary)}>
          <Play className="h-4 w-4 mr-2" />
          Resume This Flow
        </Button>
      );
    } else {
      return (
        <Button variant="destructive"
                onClick={() => handleStopFlow(flowSummary)}>
          <StopCircle className="h-4 w-4 mr-2" />
          Stop This Flow
        </Button>
      );
    }
  }
  return null;
})()}
```

---

## ✅ Testing Checklist

After fixes:

- [ ] Stop a flow → Stop button disappears
- [ ] Stop a flow → Resume button appears
- [ ] Resume a flow → Resume button disappears  
- [ ] Resume a flow → Stop button appears (if tasks are active)
- [ ] Flow summary card buttons update correctly
- [ ] Detailed view buttons update correctly
- [ ] Status badge shows "Stopped" when flow is stopped
- [ ] Status badge shows "In Progress" when flow is resumed
- [ ] No race conditions or flickering
- [ ] Works with multiple flows on same page

---

## 📝 Summary

**Issues Found:** 4  
**Critical:** 2 (Status calculation, Query invalidation)  
**Medium:** 2 (Button logic inconsistency)  

**Impact:** Users experience confusing UI where Stop button remains after stopping flow

**Priority:** 🔴 HIGH - Affects core workflow management functionality

---

*Audit completed: October 13, 2025*
