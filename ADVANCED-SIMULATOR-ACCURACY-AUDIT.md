# Advanced Simulator - Accuracy Audit Report

**Date:** October 13, 2025  
**Audit Type:** Simulation Logic & Calculation Verification  
**Status:** ⚠️ **ISSUES FOUND - CORRECTIONS NEEDED**

---

## Executive Summary

After a comprehensive audit of the Advanced Simulator, **several accuracy issues and potential problems** have been identified that affect the reliability and correctness of simulation results. The issues range from metric calculations to time tracking and resource management.

### Critical Findings
1. ⚠️ **Throughput calculation may be incorrect**
2. ⚠️ **Performance percentage calculation is backwards**
3. ⚠️ **Working hours time tracking inconsistency**
4. ⚠️ **On-time calculation uses wrong thresholds**
5. 🟡 **Bottleneck detection may be inaccurate**
6. 🟡 **Fast mode bypasses too much realism**

---

## Detailed Findings

### 🔴 CRITICAL ISSUE #1: Throughput Calculation Denominator

**Location:** Lines 253-254 in `advanced-simulator.tsx`

**Problem:** Throughput denominator uses `elapsedProcessingWindowMinutes` which only counts minutes when processing was allowed.

**Current Code:**
```typescript
const denomMinutes = Math.max(1, elapsedProcessingWindowMinutes);
const totalHours = Math.max(1 / 60, denomMinutes / 60);
const throughputPerHour = Math.round((completed / totalHours) * 100) / 100;
```

**Issue:**
- `elapsedProcessingWindowMinutes` only accumulates when `fastMode` is true OR during working hours
- This means throughput is calculated as "tasks per hour of ACTIVE time" not "tasks per actual elapsed time"
- If simulation runs for 10 hours but only 5 hours are working hours, throughput shows as if only 5 hours passed

**Example Scenario:**
```
Simulation runs from 9 AM to 7 PM (10 hours actual time)
Working hours: 9 AM to 6 PM (9 hours working time)
Processing window minutes: 540 minutes (9 hours)
Completed tasks: 18

Current calculation:
throughput = 18 / 9 = 2 tasks/hour ✅ (correct if intent is "per working hour")

But users might expect:
throughput = 18 / 10 = 1.8 tasks/hour (per elapsed wall-clock hour)
```

**Impact:** 
- Throughput metric is INFLATED if working hours < 24/7
- Misleading for capacity planning
- Inconsistent with real-world "tasks completed today" metric

**Severity:** ⚠️ HIGH - Metric is core performance indicator

---

### 🔴 CRITICAL ISSUE #2: Performance Percentage Calculation is Backwards

**Location:** Lines 288-295 in `advanced-simulator.tsx`

**Problem:** Performance percentage formula is inverted.

**Current Code:**
```typescript
const totalPlannedMin = completedTasks.reduce((s, t) => s + (t.plannedMinutes || 0), 0);
let totalProcCompletedMin = 0;
for (const t of completedTasks) {
  if (t.startedAt && t.completedAt) {
    totalProcCompletedMin += Math.max(0, (t.completedAt.getTime() - t.startedAt.getTime()) / 60000);
  } else {
    totalProcCompletedMin += t.processMinutes;
  }
}
const performancePct = totalPlannedMin > 0 ? Math.min(100, Math.round((totalPlannedMin / Math.max(1, totalProcCompletedMin)) * 10000) / 100) : 0;
```

**Issue:**
- Formula: `performancePct = plannedMin / actualMin × 100`
- This means: If planned is 100 min and actual is 150 min, performance = 100/150 = 66.7% ✅ **CORRECT**
- But if planned is 100 min and actual is 80 min (faster!), performance = 100/80 = 125% ⚠️ **OVER 100%**

**The `Math.min(100, ...)` caps it at 100%, which HIDES when work is done faster than planned!**

**Correct Interpretation:**
```
Performance = Planned / Actual

- If Actual = Planned → Performance = 100% ✅
- If Actual > Planned → Performance < 100% (slower than planned) ✅
- If Actual < Planned → Performance > 100% (faster than planned) ✅

But capping at 100% means you can't see efficiency gains!
```

**Alternative Formula (Industry Standard):**
```typescript
// Schedule Performance Index (SPI) - correct direction
const performancePct = actualMin > 0 ? Math.round((plannedMin / actualMin) * 100) : 0;
// Remove Math.min(100, ...) to allow > 100% for good performance
```

**Or Invert for "On Schedule %" (0-100%):**
```typescript
// If you want 100% = good, 50% = bad:
const performancePct = plannedMin > 0 ? Math.min(100, Math.round((actualMin / plannedMin) * 100)) : 0;
// But this means SLOWER is BETTER percentage (100% = took exactly planned time)
```

**Impact:**
- Performance metric is confusing
- Can't see when team is faster than plan
- Misleading for process improvement tracking

**Severity:** 🔴 CRITICAL - Core metric with backwards interpretation

---

### 🟡 ISSUE #3: Working Hours Time Tracking Inconsistency

**Location:** Lines 180-186 in `advanced-simulator.tsx`

**Problem:** Three different time counters with unclear relationships.

**Current Code:**
```typescript
const [elapsedSimMinutes, setElapsedSimMinutes] = useState(0);
const [elapsedWorkingMinutes, setElapsedWorkingMinutes] = useState(0);
const [elapsedProcessingWindowMinutes, setElapsedProcessingWindowMinutes] = useState(0);
```

**Increment Logic (Lines 717-724):**
```typescript
setElapsedSimMinutes((m) => m + settings.speedMinutesPerTick);
if (canProcessNow(now)) setElapsedWorkingMinutes((m) => m + settings.speedMinutesPerTick);
if (settings.fastMode || canProcessNow(now)) {
  setElapsedProcessingWindowMinutes((m) => m + settings.speedMinutesPerTick);
}
```

**Issue:**
- `elapsedSimMinutes` = total simulation time (clear) ✅
- `elapsedWorkingMinutes` = time during working hours (clear) ✅
- `elapsedProcessingWindowMinutes` = working hours OR fastMode (confusing) ⚠️

**Problem:**
- In fastMode, `elapsedProcessingWindowMinutes` accumulates even outside working hours
- This makes throughput calculation inconsistent with the "working hours" concept
- If fastMode is ON but working hours are DEFINED, which is the "true" elapsed time?

**Example:**
```
Settings:
- fastMode: true
- workStart: 09:00
- workEnd: 18:00
- Simulation runs 24 hours

Result:
- elapsedSimMinutes = 1440 (24 hours) ✅
- elapsedWorkingMinutes = 540 (9 hours) ✅
- elapsedProcessingWindowMinutes = 1440 (24 hours because fastMode) ⚠️

Throughput uses elapsedProcessingWindowMinutes (1440 min) but user might expect:
- "Per actual hour" (1440 min) OR
- "Per working hour" (540 min)
```

**Impact:**
- Confusing metric interpretation
- Fast mode makes throughput incomparable to non-fast mode
- Users can't reliably compare scenarios

**Severity:** 🟡 MEDIUM - Affects metric interpretation

---

### 🔴 ISSUE #4: On-Time Calculation Uses Cycle Time vs Planned Time

**Location:** Lines 220-225 in `advanced-simulator.tsx`

**Problem:** On-time check compares cycle time to planned processing time, but these are different concepts.

**Current Code:**
```typescript
const cycleMin = Math.round(Math.max(0, (t.completedAt.getTime() - t.createdAt.getTime()) / 60000) * 1000) / 1000;
const planned = Math.max(1, t.plannedMinutes);
const buffer = Math.max(0, settings.onTimeBufferPct || 0) / 100;
const threshold = Math.round(planned * (1 + buffer) * 1000) / 1000;
const onTime = cycleMin <= threshold;
```

**Issue:**
- `cycleMin` = Total time from task CREATED to COMPLETED (includes waiting, queuing, processing)
- `planned` = Planned PROCESSING time only (from TAT config)
- Comparing apples to oranges! ❌

**Example:**
```
Task created: 10:00
Queued for 30 min
Started: 10:30
Completed: 11:00 (30 min processing)

cycleMin = 60 minutes (10:00 to 11:00)
plannedMinutes = 30 minutes (TAT config)
threshold = 30 minutes (if buffer = 0)

onTime check: 60 <= 30 → FALSE ❌ (marked as LATE)

But actual processing time (10:30 to 11:00) was exactly 30 min!
The task was on-time from a processing perspective, but late due to queuing.
```

**Correct Approach:**
```typescript
// Option 1: Compare processing time to planned processing time
if (t.startedAt && t.completedAt) {
  const processingMin = (t.completedAt.getTime() - t.startedAt.getTime()) / 60000;
  const onTime = processingMin <= threshold;
}

// Option 2: Compare cycle time to planned CYCLE time (processing + expected wait)
const plannedCycleMin = planned + (expectedQueueMin); // need to define expected queue
const onTime = cycleMin <= plannedCycleMin;

// Option 3: Use TAT deadline (planned time from creation)
const deadlineAt = addMinutes(t.createdAt, planned);
const onTime = t.completedAt <= deadlineAt;
```

**Impact:**
- On-time metrics are **completely inaccurate**
- Tasks marked late even when processing was on-time
- Queue time unfairly penalizes on-time performance
- On-time % chart is misleading

**Severity:** 🔴 CRITICAL - Core accuracy metric is wrong

---

### 🟡 ISSUE #5: Bottleneck Detection Algorithm

**Location:** Lines 300-327 in `advanced-simulator.tsx`

**Problem:** Bottleneck detection uses utilization percentage but doesn't account for queue buildup properly.

**Current Code:**
```typescript
const entries = Object.entries(byTask);
for (const [name, agg] of entries) {
  const cap = Math.max(1, resourceCaps[name] ?? 1);
  const utilPct = Math.min(100, Math.round((agg.activeProcMin / (windowMin * cap)) * 10000) / 100);
  const avgWait = agg.qCount ? agg.queueSum / agg.qCount : 0;
  if (
    utilPct > bottleneckUtilPct ||
    (utilPct === bottleneckUtilPct && avgWait > bottleneckAvgWait)
  ) {
    bottleneckTask = name;
    bottleneckUtilPct = utilPct;
    bottleneckAvgWait = avgWait;
  }
}
```

**Issue:**
- Bottleneck is determined ONLY by max utilization (with avg wait as tiebreaker)
- This misses cases where:
  - Task A: 90% utilization, 5 min avg queue
  - Task B: 80% utilization, 60 min avg queue ⚠️ **Task B is the bottleneck!**

**Better Algorithm:**
```typescript
// Score = weighted combination of utilization and queue time
const score = (utilPct * 0.6) + (avgWait / maxAvgWait * 40); // weighted score
// Or use Theory of Constraints: Bottleneck = task with most queue buildup
```

**Impact:**
- May identify wrong bottleneck
- Optimization recommendations are incorrect
- Users make wrong capacity decisions

**Severity:** 🟡 MEDIUM - Important but has workaround (check queue manually)

---

### 🟡 ISSUE #6: Fast Mode Bypasses Too Much Logic

**Location:** Multiple locations where `fastMode` is checked

**Problem:** Fast mode eliminates:
- Initial wait times (line 594): `waitMinutes: Math.round(settings.fastMode ? 0 : rand(2, 45))`
- Queue time requirements (line 870): `if (settings.fastMode || minutesQueued >= t.waitMinutes)`
- Working hours for processing (line 717, 839): `const allowProcessing = settings.fastMode ? true : canProcessNow(now);`

**Issue:**
- Fast mode produces UNREALISTIC results
- Throughput is artificially inflated
- Queue metrics are meaningless (always near-zero)
- Bottlenecks don't appear
- Users can't use fast mode for accurate capacity planning

**Example:**
```
Fast Mode ON:
- No wait times
- No queuing delays
- Processing happens 24/7
- Throughput: 100 tasks/hour ⚠️ (unrealistic)

Fast Mode OFF:
- Realistic delays
- Queue buildup
- Working hours respected
- Throughput: 10 tasks/hour ✅ (realistic)
```

**Impact:**
- Fast mode is only useful for testing flow logic
- Cannot be used for actual performance simulation
- Should be clearly labeled "Debug Mode" not "Fast Mode"

**Severity:** 🟡 MEDIUM - Users might misuse for planning

---

### 🟢 ISSUE #7: Productivity Percentage Calculation

**Location:** Lines 276-282 in `advanced-simulator.tsx`

**Current Code:**
```typescript
const productive = totalProcMin;
const available = totalProcMin + totalWaitMin;
const productivityPct = available > 0 ? Math.min(100, Math.round((productive / available) * 10000) / 100) : 0;
```

**Analysis:** This is actually **CORRECT** ✅

**Formula:** Productivity = Processing Time / (Processing Time + Waiting Time)

This is a valid measure of time utilization.

**Status:** ✅ No fix needed

---

## Summary of Issues by Severity

### 🔴 Critical (Fix Immediately)

1. **Performance % is backwards/capped** - Remove Math.min(100,...) and clarify direction
2. **On-time calculation wrong** - Compare processing time to planned, not cycle to planned
3. **Throughput denominator** - Clarify if "per working hour" or "per elapsed hour"

### 🟡 Medium (Fix Soon)

4. **Time tracking inconsistency** - Clarify what elapsedProcessingWindowMinutes means
5. **Bottleneck detection** - Weight queue time more heavily
6. **Fast mode unrealistic** - Rename to "Debug Mode" and add warning

### 🟢 Low (Monitor)

7. Productivity calculation ✅ (already correct)

---

## Recommended Fixes

### Fix #1: Throughput Calculation

**Add setting to choose denominator:**
```typescript
// In Settings interface:
throughputBasis?: "elapsed" | "working" | "processing"; // default: "working"

// In metrics calculation:
let denomMinutes: number;
switch (settings.throughputBasis || "working") {
  case "elapsed":
    denomMinutes = Math.max(1, elapsedSimMinutes); // actual wall-clock time
    break;
  case "working":
    denomMinutes = Math.max(1, elapsedWorkingMinutes); // working hours only
    break;
  case "processing":
    denomMinutes = Math.max(1, elapsedProcessingWindowMinutes); // processing window (current)
    break;
}
const totalHours = Math.max(1 / 60, denomMinutes / 60);
const throughputPerHour = Math.round((completed / totalHours) * 100) / 100;
```

**Or simply use elapsedSimMinutes for consistency:**
```typescript
const denomMinutes = Math.max(1, elapsedSimMinutes); // Use actual elapsed time
const totalHours = Math.max(1 / 60, denomMinutes / 60);
const throughputPerHour = Math.round((completed / totalHours) * 100) / 100;
```

---

### Fix #2: Performance Percentage

**Remove the cap and clarify:**
```typescript
// Allow > 100% for faster-than-planned performance
const performancePct = totalPlannedMin > 0 
  ? Math.round((totalPlannedMin / Math.max(1, totalProcCompletedMin)) * 10000) / 100
  : 0;

// Add UI tooltip: "100% = on plan, >100% = faster than plan, <100% = slower than plan"
```

**Or invert if you want 100% = perfect:**
```typescript
// Invert so 100% = perfect, lower = worse
const scheduleAdherencePct = totalProcCompletedMin > 0
  ? Math.min(100, Math.round((totalPlannedMin / totalProcCompletedMin) * 10000) / 100)
  : 0;

// Rename to "Schedule Adherence" and tooltip: "100% = on schedule, <100% = behind schedule"
```

---

### Fix #3: On-Time Calculation

**Compare processing time to planned processing time:**
```typescript
// In onTimeByTask calculation:
for (const t of tasks) {
  if (t.status === "completed" && t.startedAt && t.completedAt) {
    const task = t.taskName;
    if (!map[task]) map[task] = { task, onTime: 0, late: 0, total: 0, onTimePct: 0, latePct: 0 };
    
    // FIXED: Compare processing time to planned
    const processingMin = Math.round(Math.max(0, (t.completedAt.getTime() - t.startedAt.getTime()) / 60000) * 1000) / 1000;
    const planned = Math.max(1, t.plannedMinutes);
    const buffer = Math.max(0, settings.onTimeBufferPct || 0) / 100;
    const threshold = Math.round(planned * (1 + buffer) * 1000) / 1000;
    const onTime = processingMin <= threshold;
    
    if (onTime) map[task].onTime += 1; else map[task].late += 1;
    map[task].total += 1;
  }
}
```

**Or use cycle time but add expected wait to threshold:**
```typescript
// Keep cycle time but adjust threshold to include expected wait
const cycleMin = Math.round(Math.max(0, (t.completedAt.getTime() - t.createdAt.getTime()) / 60000) * 1000) / 1000;
const planned = Math.max(1, t.plannedMinutes);
const expectedWaitMin = 30; // Could be average or configured
const buffer = Math.max(0, settings.onTimeBufferPct || 0) / 100;
const threshold = Math.round((planned + expectedWaitMin) * (1 + buffer) * 1000) / 1000;
const onTime = cycleMin <= threshold;
```

---

### Fix #4: Bottleneck Detection

**Weight queue time more heavily:**
```typescript
let bottleneckTask = "";
let bottleneckScore = 0;

const entries = Object.entries(byTask);
if (entries.length === 0) {
  bottleneckTask = "";
} else {
  // Find max avg wait to normalize
  const maxAvgWait = Math.max(...entries.map(([, agg]) => 
    agg.qCount ? agg.queueSum / agg.qCount : 0
  ), 1);

  for (const [name, agg] of entries) {
    const cap = Math.max(1, resourceCaps[name] ?? 1);
    const utilPct = Math.min(100, Math.round((agg.activeProcMin / (windowMin * cap)) * 10000) / 100);
    const avgWait = agg.qCount ? agg.queueSum / agg.qCount : 0;
    
    // Weighted score: 40% utilization + 60% queue time (queue is more important for bottlenecks)
    const normalizedWait = avgWait / maxAvgWait;
    const score = (utilPct / 100) * 0.4 + normalizedWait * 0.6;
    
    if (score > bottleneckScore) {
      bottleneckTask = name;
      bottleneckScore = score;
      bottleneckUtilPct = utilPct;
      bottleneckAvgWait = avgWait;
    }
  }
}
```

---

### Fix #5: Time Tracking Clarification

**Simplify to two counters:**
```typescript
const [elapsedSimMinutes, setElapsedSimMinutes] = useState(0); // wall-clock time
const [elapsedWorkingMinutes, setElapsedWorkingMinutes] = useState(0); // working hours only

// In tickOnce:
setElapsedSimMinutes((m) => m + settings.speedMinutesPerTick);
if (isWorking(now)) {
  setElapsedWorkingMinutes((m) => m + settings.speedMinutesPerTick);
}

// For throughput: use elapsedSimMinutes (or let user choose)
const denomMinutes = settings.throughputBasis === "working" 
  ? Math.max(1, elapsedWorkingMinutes)
  : Math.max(1, elapsedSimMinutes);
```

---

### Fix #6: Fast Mode Warning

**Add clear UI warning:**
```tsx
{settings.fastMode && (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
    <div className="flex">
      <AlertTriangle className="h-5 w-5 text-yellow-400" />
      <div className="ml-3">
        <p className="text-sm text-yellow-700">
          <strong>Debug Mode:</strong> Fast mode eliminates wait times and working hour restrictions.
          Results are <strong>not realistic</strong> for capacity planning. Use for flow testing only.
        </p>
      </div>
    </div>
  </div>
)}
```

---

## Testing Validation

### Test Case 1: Performance Percentage

**Setup:**
```
10 tasks completed:
- 5 tasks: planned 60 min, actual 60 min
- 3 tasks: planned 60 min, actual 90 min (slower)
- 2 tasks: planned 60 min, actual 40 min (faster)

Total planned: 600 min
Total actual: (5*60) + (3*90) + (2*40) = 300 + 270 + 80 = 650 min
```

**Current (WRONG):**
```
performancePct = 600 / 650 * 100 = 92.3%
Capped at Math.min(100, 92.3) = 92.3% ✅ (seems ok)

But if faster:
Total actual: 500 min
performancePct = 600 / 500 * 100 = 120%
Capped at Math.min(100, 120) = 100% ❌ (hides 20% efficiency gain!)
```

**Fixed (CORRECT):**
```
performancePct = 600 / 650 * 100 = 92.3% ✅ (slower than plan)
performancePct = 600 / 500 * 100 = 120% ✅ (faster than plan, visible!)
```

---

### Test Case 2: On-Time Accuracy

**Setup:**
```
Task:
- Created: 10:00
- Queued: 10:00-10:30 (30 min wait)
- Started: 10:30
- Completed: 11:00 (30 min processing)
- Planned: 30 min

Cycle time: 60 min (10:00 to 11:00)
Processing time: 30 min (10:30 to 11:00)
```

**Current (WRONG):**
```
onTime = cycleMin (60) <= planned (30) → FALSE ❌
Task marked LATE even though processing was exactly on time!
```

**Fixed (CORRECT):**
```
onTime = processingMin (30) <= planned (30) → TRUE ✅
Task correctly marked ON-TIME
```

---

### Test Case 3: Throughput Basis

**Setup:**
```
Simulation: 9 AM to 7 PM (10 hours)
Working hours: 9 AM to 6 PM (9 hours)
Completed tasks: 18
```

**Current (Unclear):**
```
Uses elapsedProcessingWindowMinutes (depends on fastMode)
If fastMode: 600 min → throughput = 18/10 = 1.8 per hour
If not fastMode: 540 min → throughput = 18/9 = 2.0 per hour
```

**Fixed (Clear):**
```
Option 1: Use elapsedSimMinutes (wall-clock)
throughput = 18 / 10 = 1.8 tasks per actual hour ✅

Option 2: Use elapsedWorkingMinutes
throughput = 18 / 9 = 2.0 tasks per working hour ✅

Both are valid, but should be clearly labeled in UI!
```

---

## Priority Summary

| Priority | Issue | Impact | Fix Effort |
|----------|-------|--------|------------|
| 🔴 **P0** | On-time calculation | HIGH - Core metric wrong | LOW - 10 lines |
| 🔴 **P0** | Performance % capped | HIGH - Hides efficiency | LOW - Remove Math.min |
| 🔴 **P1** | Throughput denominator | HIGH - Misleading metric | LOW - Use elapsedSimMinutes |
| 🟡 **P1** | Bottleneck detection | MEDIUM - Wrong recommendations | MEDIUM - Reweight algorithm |
| 🟡 **P2** | Time tracking clarity | MEDIUM - Confusing | LOW - Simplify |
| 🟡 **P2** | Fast mode warning | MEDIUM - Misuse risk | LOW - Add UI warning |

---

## Conclusion

**Audit Status:** ⚠️ **ACCURACY ISSUES FOUND**

**Critical Issues:** 3
- On-time calculation (P0)
- Performance percentage (P0)
- Throughput calculation (P1)

**Medium Issues:** 3
- Bottleneck detection (P1)
- Time tracking (P2)
- Fast mode clarity (P2)

**Recommendation:** Fix P0 and P1 issues before using simulator for capacity planning or performance analysis. The current implementation produces **misleading metrics** that could lead to incorrect business decisions.

**Estimated Fix Time:** 2-4 hours for all P0 and P1 fixes.

---

**Next Steps:**
1. Fix on-time calculation (highest impact, easiest fix)
2. Fix performance percentage (remove cap)
3. Clarify/fix throughput denominator
4. Improve bottleneck detection
5. Add fast mode warning
6. Validate with real flow data
7. Update user documentation with metric definitions

