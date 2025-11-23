import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader as UIDialogHeader, DialogTitle as UIDialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Activity, BarChart3, Clock, Play, Pause, RotateCcw, AlertTriangle, List, DollarSign, CheckCircle2, TrendingUp, Gauge } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { addMinutes, format, isAfter, isBefore } from "date-fns";

type SimStatus = "created" | "started" | "assigned" | "queued" | "pending" | "completed";

interface SimTask {
  id: string;
  instanceId: string;
  taskName: string;
  assignee?: string;
  status: SimStatus;
  sequence: number; // order within an instance; gate next until previous completes
  plannedMinutes: number; // baseline processing minutes from flow rules
  createdAt: Date;
  startedAt?: Date;
  assignedAt?: Date;
  queuedAt?: Date;
  pendingAt?: Date;
  completedAt?: Date;
  waitMinutes: number; // time before assignment/processing
  processMinutes: number; // active work time
  deferredDueToBusy?: boolean;
}

interface SimLog {
  ts: Date;
  instanceId: string;
  taskName: string;
  event: string;
  details?: string;
}

interface Settings {
  system: string;
  startEvents: number; // number of flow instances to start
  speedMinutesPerTick: number; // simulated minutes per real second tick
  peakStart: string; // HH:mm
  peakEnd: string;   // HH:mm
  peakSpeedPercent: number; // percentage boost during peak
  teamSize: number; // auto-calculated: total number of people (one per task); affects overall speed
  costPerHour: number; // operational cost per hour
  // arrivals
  arrivalMode?: "none" | "period" | "uniform" | "normal" | "trendUp" | "trendDown";
  arrivalPeriodMin?: number; // for period mode
  arrivalUniformMin?: number; // min gap in minutes
  arrivalUniformMax?: number; // max gap in minutes
  arrivalNormalMean?: number; // mean gap
  arrivalNormalStd?: number; // std dev
  arrivalTrendPct?: number; // +/- % per hour trend factor
  // working hours
  workStart?: string; // HH:mm
  workEnd?: string;   // HH:mm
  skipWeekends?: boolean;
  // debug/assist
  fastMode?: boolean; // aggressively advance queue/pending; zero initial waits
  ignoreWorkingHours?: boolean; // allow processing outside working hours
  // reporting
  onTimeBufferPct?: number; // allowed buffer over planned time to still count as on-time
  // realistic completion times
  useRealisticTimes?: boolean; // use realistic completion times instead of max TAT
  avgCompletionPct?: number; // average % of TAT actually used (e.g., 20% means tasks typically complete in 20% of TAT)
  completionVariability?: number; // variability range as % (e.g., 10 means ±10% from average)
}

// Decision weights: for a decision task name, define weight per status
type DecisionWeights = Record<string, Record<string, number>>; // taskName -> { status -> weight% }

// Utility: parse HH:mm to minutes of day
const minutesOfDay = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// Basic RNG helper
const rand = (min: number, max: number) => Math.random() * (max - min) + min;

// Pull available systems regardless of shape
const extractSystems = (flowRules: any): string[] => {
  if (!flowRules) return [];
  let rules: any[] = [];
  if (Array.isArray(flowRules)) rules = flowRules;
  else if (typeof flowRules === "object") rules = flowRules.rules || flowRules.data || flowRules.flowRules || [];
  return Array.from(new Set(rules.map((r) => r.system).filter(Boolean)));
};

const getRulesBySystem = (flowRules: any, system: string): any[] => {
  if (!flowRules) return [];
  let rules: any[] = [];
  if (Array.isArray(flowRules)) rules = flowRules;
  else if (typeof flowRules === "object") rules = flowRules.rules || flowRules.data || flowRules.flowRules || [];
  return rules.filter((r) => r.system === system);
};

export default function AdvancedSimulator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();

  // Redirect non-admin users
  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin') {
      window.location.href = '/';
      return;
    }
  }, [isLoading, user]);

  const { data: flowRules } = useQuery({ queryKey: ["/api/flow-rules"], enabled: isAuthenticated });
  const { data: tatConfig } = useQuery({ queryKey: ["/api/tat-config"], enabled: isAuthenticated });

  const systems = useMemo(() => extractSystems(flowRules), [flowRules]);

  const [settings, setSettings] = useState<Settings>({
    system: systems[0] || "",
    startEvents: 20,
    speedMinutesPerTick: 15, // each second advances 15 minutes by default
    peakStart: "10:00",
    peakEnd: "16:00",
    peakSpeedPercent: 70,
    teamSize: 1,
    costPerHour: 20,
    arrivalMode: "period",
    arrivalPeriodMin: 60,
    arrivalUniformMin: 30,
    arrivalUniformMax: 120,
    arrivalNormalMean: 60,
    arrivalNormalStd: 15,
    arrivalTrendPct: 0,
    workStart: "09:00",
    workEnd: "18:00",
    skipWeekends: true,
    fastMode: true,
    ignoreWorkingHours: false,
    onTimeBufferPct: 0,
    useRealisticTimes: true,
    avgCompletionPct: 20,
    completionVariability: 10,
  });

  useEffect(() => {
    // update default system once rules load
    if (!settings.system && systems.length) {
      setSettings((s) => ({ ...s, system: systems[0] }));
    }
  }, [systems]);

  const [tasks, setTasks] = useState<SimTask[]>([]);
  const [logs, setLogs] = useState<SimLog[]>([]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [simClock, setSimClock] = useState<Date | null>(null);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<number | null>(null);
  const [decisionWeights, setDecisionWeights] = useState<DecisionWeights>({});
  const [resourceCaps, setResourceCaps] = useState<Record<string, number>>({});
  // instance sequencing: create next task only after previous completes
  type InstanceState = { nextSeq: number; currentTask: string | null; deferredNext?: Array<{ taskName: string; email?: string; plannedMin: number; sequence: number }>; };
  const [instanceState, setInstanceState] = useState<Record<string, InstanceState>>({});
  const instanceStateRef = useRef<Record<string, InstanceState>>({});
  // arrivals scheduling state
  const [remainingToSpawn, setRemainingToSpawn] = useState(0);
  const [nextArrivalAt, setNextArrivalAt] = useState<Date | null>(null);
  const arrivalSeqRef = useRef(0);
  // time series
  type Point = { t: string; created: number; completed: number; queue: number; inProgress: number; util: number };
  const [series, setSeries] = useState<Point[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const utilSnapshot = useMemo(() => {
    const inProg = tasks.filter((x) => x.status === "started").length;
    const capTotal = Object.values(resourceCaps).reduce((a, b) => a + (b || 0), 0) || 1;
    const util = Math.min(100, Math.round((inProg / capTotal) * 10000) / 100);
    const queue = tasks.filter((x) => x.status === "queued" || x.status === "pending").length;
    return { inProg, capTotal, util, queue };
  }, [tasks, resourceCaps]);
  // Elapsed simulated minutes, and working-hours-only minutes
  const [elapsedSimMinutes, setElapsedSimMinutes] = useState(0);
  const [elapsedWorkingMinutes, setElapsedWorkingMinutes] = useState(0);
  // Minutes when processing is allowed (fastMode or within working hours)
  const [elapsedProcessingWindowMinutes, setElapsedProcessingWindowMinutes] = useState(0);
  type DrillRow = { instanceId: string; task: string; cycleMin: number; plannedMin: number; onTime: boolean; createdAt: Date; completedAt: Date };
  const [drill, setDrill] = useState<{ open: boolean; task: string; onTime: boolean | null; rows: DrillRow[] }>({ open: false, task: "", onTime: null, rows: [] });

  // Number of flow instances spawned so far (unique instance IDs)
  const spawnedInstancesCount = useMemo(() => {
    const s = new Set<string>();
    for (const t of tasks) s.add(t.instanceId);
    return s.size;
  }, [tasks]);

  // Task-wise on-time vs late dataset for charting
  const onTimeByTask = useMemo(() => {
    const map: Record<string, { task: string; onTime: number; late: number; total: number; onTimePct: number; latePct: number }> = {};
    for (const t of tasks) {
      if (t.status === "completed" && t.createdAt && t.completedAt) {
        const task = t.taskName;
        if (!map[task]) map[task] = { task, onTime: 0, late: 0, total: 0, onTimePct: 0, latePct: 0 };
        const cycleMin = Math.round(Math.max(0, (t.completedAt.getTime() - t.createdAt.getTime()) / 60000) * 1000) / 1000;
        const planned = Math.max(1, t.plannedMinutes);
        const buffer = Math.max(0, settings.onTimeBufferPct || 0) / 100;
        const threshold = Math.round(planned * (1 + buffer) * 1000) / 1000;
        const onTime = cycleMin <= threshold;
        if (onTime) map[task].onTime += 1; else map[task].late += 1;
        map[task].total += 1;
      }
    }
    const arr = Object.values(map).map((r) => ({
      ...r,
      onTimePct: r.total ? Math.round((r.onTime / r.total) * 100) : 0,
      latePct: r.total ? Math.round((r.late / r.total) * 100) : 0,
    }));
    return arr.sort((a, b) => a.task.localeCompare(b.task));
  }, [tasks, settings.onTimeBufferPct]);

  const handleDrilldown = (taskName: string, wantOnTime: boolean) => {
    const buffer = Math.max(0, settings.onTimeBufferPct || 0) / 100;
    const rows: DrillRow[] = [];
    for (const t of tasks) {
      if (t.taskName !== taskName || !(t.createdAt && t.completedAt) || t.status !== "completed") continue;
      const cycleMin = Math.round(Math.max(0, (t.completedAt.getTime() - t.createdAt.getTime()) / 60000) * 1000) / 1000;
      const plannedMin = Math.max(1, t.plannedMinutes);
      const threshold = Math.round(plannedMin * (1 + buffer) * 1000) / 1000;
      const onTime = cycleMin <= threshold;
      if (onTime === wantOnTime) {
        rows.push({ instanceId: t.instanceId, task: t.taskName, cycleMin, plannedMin, onTime, createdAt: t.createdAt, completedAt: t.completedAt });
      }
    }
    setDrill({ open: true, task: taskName, onTime: wantOnTime, rows });
  };

  // Bottleneck analysis: average processing time per task
  const bottleneckData = useMemo(() => {
    const byTask: Record<string, { task: string; totalTime: number; count: number }> = {};
    
    for (const t of tasks) {
      if (t.status === "completed" && t.startedAt && t.completedAt) {
        const task = t.taskName;
        if (!byTask[task]) {
          byTask[task] = { task, totalTime: 0, count: 0 };
        }
        
        // Processing time (started to completed) - actual work duration
        const processMin = Math.max(0, (t.completedAt.getTime() - t.startedAt.getTime()) / 60000);
        byTask[task].totalTime += processMin;
        byTask[task].count += 1;
      }
    }
    
    const result = Object.values(byTask).map((r) => ({
      task: r.task,
      avgTime: r.count ? Math.round((r.totalTime / r.count) * 100) / 100 : 0,
      count: r.count,
    }));
    
    // Sort by avgTime descending (slowest first)
    return result.sort((a, b) => b.avgTime - a.avgTime);
  }, [tasks]);

  // Derived metrics
  const metrics = useMemo(() => {
    if (!startedAt || !simClock) {
      return {
        totalHours: 0,
        completed: 0,
        throughputPerHour: 0,
        totalWaitMin: 0,
        totalProcMin: 0,
        productivityPct: 0,
        performancePct: 0,
        lossCost: 0,
        bottleneckTask: "",
        bottleneckAvgWait: 0,
        bottleneckUtilPct: 0,
        avgQueueMin: 0,
        avgCycleMin: 0,
        wip: 0,
      };
    }
    const completedTasks = tasks.filter((t) => t.status === "completed");
    const completed = completedTasks.length;

  // Elapsed time for throughput denominator: minutes when processing was allowed (fast mode or within working hours)
  const denomMinutes = Math.max(1, elapsedProcessingWindowMinutes);
    const totalHours = Math.max(1 / 60, denomMinutes / 60);
    const throughputPerHour = Math.round((completed / totalHours) * 100) / 100;

    // Measured waiting time: queue + pending actual durations
    let totalWaitMin = 0;
    let totalProcMin = 0;
    for (const t of tasks) {
      // wait from queuedAt to assigned/started/completed/now (if never started)
      if (t.queuedAt) {
        const end = t.assignedAt || t.startedAt || t.completedAt || simClock;
        totalWaitMin += Math.max(0, (end.getTime() - t.queuedAt.getTime()) / 60000);
      }
      if (t.pendingAt) {
        const end = t.assignedAt || t.startedAt || t.completedAt || simClock;
        totalWaitMin += Math.max(0, (end.getTime() - t.pendingAt.getTime()) / 60000);
      }
      // processing from startedAt to completedAt or now
      if (t.startedAt) {
        const end = t.completedAt || simClock;
        totalProcMin += Math.max(0, (end.getTime() - t.startedAt.getTime()) / 60000);
      } else {
        totalProcMin += t.processMinutes; // fallback to accumulated process minutes
      }
    }

    const productive = totalProcMin;
    const available = totalProcMin + totalWaitMin;
    const productivityPct = available > 0 ? Math.min(100, Math.round((productive / available) * 10000) / 100) : 0;

    // Performance vs planned (completed only): compare sum(planned for completed) to sum(actual processing time for completed)
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

    // Loss cost from waiting
    const wastedHours = totalWaitMin / 60;
    const lossCost = wastedHours * settings.costPerHour;

    // Per-task aggregates for bottleneck detection (utilization & queue)
    const byTask: Record<string, { queueSum: number; qCount: number; activeProcMin: number } > = {};
    for (const t of tasks) {
      const key = t.taskName;
      if (!byTask[key]) byTask[key] = { queueSum: 0, qCount: 0, activeProcMin: 0 };
      if (t.queuedAt) {
        const end = t.assignedAt || t.startedAt || t.completedAt || simClock;
        const q = Math.max(0, (end.getTime() - t.queuedAt.getTime()) / 60000);
        byTask[key].queueSum += q;
        byTask[key].qCount += 1;
      }
      // accumulate actual processing minutes to date
      if (t.startedAt) {
        const end = t.completedAt || simClock;
        byTask[key].activeProcMin += Math.max(0, (end.getTime() - t.startedAt.getTime()) / 60000);
      } else {
        byTask[key].activeProcMin += t.processMinutes;
      }
    }

    // Choose bottleneck: max utilization (active time / (window * capacity)) then tiebreaker by avg queue time
    let bottleneckTask = "";
    let bottleneckAvgWait = 0;
    let bottleneckUtilPct = 0;
    const windowMin = Math.max(1, elapsedProcessingWindowMinutes);
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

    // Average queue time
    let queueSum = 0;
    let queueCount = 0;
    for (const t of tasks) {
      if (t.queuedAt) {
        const end = t.assignedAt || t.startedAt || t.completedAt || simClock;
        const mins = Math.max(0, (end.getTime() - t.queuedAt.getTime()) / 60000);
        queueSum += mins;
        queueCount += 1;
      }
    }
    const avgQueueMin = queueCount ? Math.round((queueSum / queueCount) * 1000) / 1000 : 0;

    // Average cycle time for completed tasks
    let cycleSum = 0;
    let cycleCount = 0;
    for (const t of completedTasks) {
      if (t.createdAt && t.completedAt) {
        const mins = Math.max(0, (t.completedAt.getTime() - t.createdAt.getTime()) / 60000);
        cycleSum += mins;
        cycleCount += 1;
      }
    }
    const avgCycleMin = cycleCount ? Math.round((cycleSum / cycleCount) * 1000) / 1000 : 0;

    const wip = tasks.filter((t) => t.status !== "completed").length;

    return {
      totalHours: Math.round((denomMinutes / 60) * 1000) / 1000,
      completed,
      throughputPerHour,
      totalWaitMin: Math.round(totalWaitMin),
      totalProcMin: Math.round(totalProcMin),
      productivityPct,
      performancePct,
      lossCost: Math.round(lossCost * 100) / 100,
      bottleneckTask,
      bottleneckAvgWait: Math.round(bottleneckAvgWait * 100) / 100,
      bottleneckUtilPct,
      avgQueueMin,
      avgCycleMin,
      wip,
    };
  }, [tasks, startedAt, simClock, settings.costPerHour, settings.ignoreWorkingHours, elapsedSimMinutes, elapsedWorkingMinutes, elapsedProcessingWindowMinutes, resourceCaps]);

  // Helpers
  const isPeak = (d: Date): boolean => {
    const m = d.getHours() * 60 + d.getMinutes();
    const start = minutesOfDay(settings.peakStart);
    const end = minutesOfDay(settings.peakEnd);
    if (start <= end) return m >= start && m <= end;
    // overnight window
    return m >= start || m <= end;
  };

  const effectiveSpeed = (base: number, now: Date): number => {
    let speed = base;
    if (isPeak(now)) {
      // boost speed during peak by percentage
      speed = speed * (1 + (settings.peakSpeedPercent / 100));
    }
    // team efficiency with diminishing returns
    const teamBoost = 1 + (settings.teamSize - 1) * 0.3;
    return Math.max(0.1, speed * teamBoost);
  };

  // Working hours helper
  const isWorking = (d: Date): boolean => {
    const ws = minutesOfDay(settings.workStart || "00:00");
    const we = minutesOfDay(settings.workEnd || "23:59");
    const m = d.getHours() * 60 + d.getMinutes();
    const inWindow = ws <= we ? m >= ws && m <= we : m >= ws || m <= we;
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    if (settings.skipWeekends && weekend) return false;
    return inWindow;
  };

  const canProcessNow = (d: Date): boolean => settings.ignoreWorkingHours ? true : isWorking(d);

  // UI helpers
  const fmtNum = (n: number) => new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(Math.round((n + Number.EPSILON) * 1000) / 1000);
  const fmtCurrency = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
  const badgeClassForStatus = (s: SimStatus): string => {
    switch (s) {
      case "completed": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "started": return "bg-blue-100 text-blue-800 border-blue-200";
      case "assigned": return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "queued": return "bg-amber-100 text-amber-800 border-amber-200";
      case "pending": return "bg-slate-100 text-slate-800 border-slate-200";
      case "created":
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Find the next Date that is within working hours window (respects skipWeekends)
  const nextWorkingTime = (d: Date): Date => {
    if (isWorking(d)) return d;
    const ws = minutesOfDay(settings.workStart || "00:00");
    const we = minutesOfDay(settings.workEnd || "23:59");
    const m = d.getHours() * 60 + d.getMinutes();
    const result = new Date(d);
    const setToWS = () => {
      const h = Math.floor(ws / 60);
      const min = ws % 60;
      result.setHours(h, min, 0, 0);
    };
    if (ws <= we) {
      // daytime window
      if (m < ws) {
        setToWS();
      } else if (m > we) {
        result.setDate(result.getDate() + 1);
        setToWS();
      } else {
        setToWS();
      }
    } else {
      // overnight window (e.g., 22:00 - 06:00). Outside is (we, ws)
      if (m > we && m < ws) {
        setToWS();
      } else {
        setToWS();
      }
    }
    if (settings.skipWeekends) {
      while (result.getDay() === 0 || result.getDay() === 6) {
        result.setDate(result.getDate() + 1);
        setToWS();
      }
    }
    return result;
  };

  // Compute the office start time (workStart) to anchor the simulation start.
  // If current time is before or within today's window, returns today's workStart.
  // If after today's window (or weekend with skip), returns the next working day's workStart.
  const officeStartTime = (d: Date): Date => {
    const ws = minutesOfDay(settings.workStart || "09:00");
    const we = minutesOfDay(settings.workEnd || "18:00");
    const m = d.getHours() * 60 + d.getMinutes();
    const start = new Date(d);
    const setToWS = () => {
      const h = Math.floor(ws / 60);
      const min = ws % 60;
      start.setHours(h, min, 0, 0);
    };
    const isWknd = (dt: Date) => dt.getDay() === 0 || dt.getDay() === 6;
    const advanceToNextWorkday = () => {
      start.setDate(start.getDate() + 1);
      setToWS();
      if (settings.skipWeekends) {
        while (isWknd(start)) {
          start.setDate(start.getDate() + 1);
          setToWS();
        }
      }
    };

    // Set to today's workStart first
    setToWS();
    if (settings.skipWeekends && isWknd(start)) {
      advanceToNextWorkday();
      return start;
    }

    if (ws <= we) {
      // Daytime window
      if (m > we) {
        // after working window: start at next workday's start
        advanceToNextWorkday();
      } else {
        // before or within window: keep today's start
      }
    } else {
      // Overnight window (e.g., 22:00 - 06:00)
      // Anchor at today's workStart (evening). If it's weekend and skip, advanced above.
    }
    return start;
  };

  // Build a linear task list from rules for a system
  const buildTemplate = (): { name: string; email: string; plannedMin: number }[] => {
    const rules = getRulesBySystem(flowRules, settings.system);
    if (!rules.length) return [];

    // Start from the rule with empty currentTask
    const start = rules.find((r) => r.currentTask === "");
    if (!start) return [];

    const template: { name: string; email: string; plannedMin: number }[] = [];
    let cur = start.nextTask as string | undefined;
    let guard = 0;
    while (cur && guard++ < 50) {
      const nextRule = rules.find((r) => r.currentTask === cur && r.status === "Done");
      if (!nextRule) break;
      // convert tat to minutes roughly
      const tat = nextRule.tat || 1;
      const tatType = (nextRule.tatType || "hourtat").toLowerCase();
      let plannedMin = 60; // default 1 hour
      if (tatType === "hourtat") plannedMin = tat * 60;
      else if (tatType === "daytat") plannedMin = tat * 8 * 60;
      else if (tatType === "specifytat") plannedMin = tat * 60; // assume hours
      else if (tatType === "beforetat") plannedMin = Math.max(60, tat * 60);
      template.push({ name: nextRule.nextTask, email: nextRule.email, plannedMin });
      cur = nextRule.nextTask;
    }
    return template;
  };

  // Build graph and decisions for current system
  const graph = useMemo(() => {
    const rules = getRulesBySystem(flowRules, settings.system);
    // consider only true transitional edges
    const edgeRules = rules.filter((r: any) => r && r.nextTask && String(r.nextTask).trim().length > 0);

    const byCurrent: Record<string, any[]> = {};
    for (const r of edgeRules) {
      const key = r.currentTask || "";
      if (!byCurrent[key]) byCurrent[key] = [];
      byCurrent[key].push(r);
    }

    const startRule = edgeRules.find((r: any) => r.currentTask === "");
    const startNode = startRule?.nextTask || "";

    // true decisions: multiple statuses and not simply containing a 'Done' linear continuation
    const decisions: Record<string, { status: string; nextTask: string }[]> = {};
    Object.entries(byCurrent).forEach(([task, arr]) => {
      const valid = (arr as any[]).filter((a) => a.nextTask && String(a.nextTask).trim().length > 0);
      const uniqueStatuses = Array.from(new Set(valid.map((a) => (a.status || "").toString())));
      const hasDone = uniqueStatuses.some((s) => s.toLowerCase() === "done");
      if (task && uniqueStatuses.length > 1 && !hasDone) {
        decisions[task] = valid.map((a: any) => ({ status: a.status, nextTask: a.nextTask }));
      }
    });
    return { byCurrent, startNode, decisions, rules: edgeRules };
  }, [flowRules, settings.system]);

  // Initialize decision weights when system changes
  useEffect(() => {
    const weights: DecisionWeights = {};
    Object.entries(graph.decisions).forEach(([task, options]) => {
      const uniqueStatuses = Array.from(new Set(options.map((o) => (o.status || "").toString())));
      const equal = uniqueStatuses.length ? Math.round(100 / uniqueStatuses.length) : 100;
      weights[task] = {};
      uniqueStatuses.forEach((s) => (weights[task][s] = equal));
    });
    setDecisionWeights(weights);
    // Initialize resource capacities for all unique task names referenced as nextTask
    const uniqueTasks = new Set<string>();
    graph.rules.forEach((r: any) => { if (r.nextTask) uniqueTasks.add(r.nextTask); });
    setResourceCaps((prev) => {
      const next: Record<string, number> = { ...prev };
      uniqueTasks.forEach((t) => { if (next[t] == null) next[t] = 1; });
      // remove capacities not in current system
      Object.keys(next).forEach((k) => { if (!uniqueTasks.has(k)) delete next[k]; });
      return next;
    });
    // Auto-set team size to match number of unique tasks (one person per task)
    const taskCount = uniqueTasks.size;
    if (taskCount > 0) {
      setSettings((s) => ({ ...s, teamSize: taskCount }));
    }
  }, [graph.decisions, graph.rules]);

  // Weighted choice helper
  const chooseByWeights = (weights: Record<string, number>): string | null => {
    const entries = Object.entries(weights).filter(([, w]) => w > 0);
    if (!entries.length) return null;
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [k, w] of entries) {
      if ((r -= w) <= 0) return k;
    }
    return entries[entries.length - 1][0];
  };

  // Convert tat to minutes helper
  const tatToMinutes = (tat: number, tatType: string): number => {
    const t = tat || 1;
    const tt = (tatType || "hourtat").toLowerCase();
    if (tt === "hourtat") return t * 60;
    if (tt === "daytat") return t * 8 * 60;
    if (tt === "specifytat") return t * 60;
    if (tt === "beforetat") return Math.max(60, t * 60);
    return 60;
  };

  // Calculate realistic completion time based on TAT
  const calculateRealisticTime = (baseTatMinutes: number): number => {
    if (!settings.useRealisticTimes) {
      // Use the old behavior: random variation around the base TAT
      return Math.max(5, Math.round(baseTatMinutes * (0.7 + Math.random() * 0.6)));
    }
    
    // Use realistic completion times
    const avgPct = Math.max(1, Math.min(100, settings.avgCompletionPct || 20)) / 100;
    const variability = Math.max(0, Math.min(50, settings.completionVariability || 10)) / 100;
    
    // Calculate base realistic time (e.g., 20% of TAT)
    const baseRealistic = baseTatMinutes * avgPct;
    
    // Add variability (e.g., ±10% of the realistic time)
    const variation = baseRealistic * variability;
    const minTime = Math.max(1, baseRealistic - variation);
    const maxTime = Math.min(baseTatMinutes, baseRealistic + variation); // Cap at max TAT
    
    // Random time within the realistic range
    const realisticTime = minTime + Math.random() * (maxTime - minTime);
    
    return Math.max(5, Math.round(realisticTime));
  };

  // Build one instance path using decision weights and loop guards
  const buildInstancePath = (): { name: string; email: string; plannedMin: number }[] => {
    const path: { name: string; email: string; plannedMin: number }[] = [];
    const visitedCount: Record<string, number> = {};
    let cur = graph.startNode;
    let steps = 0;
    const maxSteps = 200;

    // Ensure we start from the task whose previous/currentTask is blank
    const startRuleRec: any = graph.rules.find((r: any) => r.currentTask === "");
    if (startRuleRec && graph.startNode) {
      path.push({
        name: graph.startNode,
        email: startRuleRec.email,
        plannedMin: tatToMinutes(startRuleRec.tat, startRuleRec.tatType),
      });
    }

    while (cur && steps++ < maxSteps) {
      const options = graph.byCurrent[cur] || [];
      if (!options.length) break; // terminal

      let chosenRule: any | null = null;
      const statuses = Array.from(new Set(options.map((o: any) => (o.status || "").toString())));
      if (statuses.length <= 1) {
        // linear
        chosenRule = options[0];
      } else {
        const weights = decisionWeights[cur] || {};
        const selectedStatus = chooseByWeights(weights) || statuses[0];
        chosenRule = options.find((o: any) => (o.status || "").toString() === selectedStatus) || options[0];
      }

      if (!chosenRule) break;
  const nextName = chosenRule.nextTask;
      const plannedMin = tatToMinutes(chosenRule.tat, chosenRule.tatType);
      path.push({ name: nextName, email: chosenRule.email, plannedMin });

      // loop guard
      visitedCount[cur] = (visitedCount[cur] || 0) + 1;
      if (visitedCount[cur] > 3) break; // prevent infinite cycles

      cur = nextName;
      if (!cur) break;
    }

    return path;
  };

  // Start simulation: create tasks in memory only
  const startSim = () => {
    if (!settings.system) {
      toast({ title: "Select flow", description: "Choose a flow/system to simulate.", variant: "destructive" });
      return;
    }
    // Try graph-based path; if no start or no rules, fallback to linear template
    const rules = getRulesBySystem(flowRules, settings.system);
    if (!rules.length || !graph.startNode) {
      toast({ title: "No flow found", description: "Flow rules missing for selected system.", variant: "destructive" });
      return;
    }

  // Anchor simulation start time to office start time
  const now = officeStartTime(new Date());
    if (!settings.arrivalMode || settings.arrivalMode === "none") {
      // Create only the FIRST task for each instance; the rest are generated on completion
      const startRuleRec: any = graph.rules.find((r: any) => r.currentTask === "");
      if (!startRuleRec || !graph.startNode) {
        toast({ title: "No flow found", description: "Flow rules missing for selected system.", variant: "destructive" });
        return;
      }
      if (!settings.ignoreWorkingHours && !isWorking(now)) {
        // Defer bulk creation until next working time
  setRemainingToSpawn(Math.max(0, settings.startEvents || 0));
        setNextArrivalAt(nextWorkingTime(now));
        setTasks([]);
        setLogs([{ ts: now, instanceId: "-", taskName: graph.startNode, event: `initial creation deferred to ${format(nextWorkingTime(now), "PPpp")}` }]);
      } else {
        const newTasks: SimTask[] = [];
        const newLogs: SimLog[] = [];
        const newInstState: Record<string, InstanceState> = {};
        let taskIdCounter = 1;
        const firstPlanned = tatToMinutes(startRuleRec.tat, startRuleRec.tatType);
        for (let i = 0; i < settings.startEvents; i++) {
          const instanceId = `SIM-${now.getTime()}-${i + 1}`;
          newInstState[instanceId] = { nextSeq: 1, currentTask: graph.startNode, deferredNext: [] };
          const wait = settings.fastMode ? 0 : rand(2, 45);
          const t: SimTask = {
            id: `T-${taskIdCounter++}`,
            instanceId,
            taskName: graph.startNode,
            assignee: startRuleRec.email,
            status: "created",
            sequence: 0,
            plannedMinutes: calculateRealisticTime(firstPlanned),
            createdAt: now,
            waitMinutes: Math.round(wait),
            processMinutes: 0,
          };
          newTasks.push(t);
          newLogs.push({ ts: now, instanceId, taskName: t.taskName, event: "created" });
        }
        instanceStateRef.current = newInstState;
        setInstanceState(newInstState);
        setTasks(newTasks);
        setLogs(newLogs);
      }
    } else {
      // arrivals mode: spawn first instance immediately so UI shows activity, then schedule the rest
      setTasks([]);
      setLogs([]);
      if (settings.ignoreWorkingHours || isWorking(now)) {
        if (spawnedInstancesCount < (settings.startEvents || 0)) {
          spawnOneInstance(now);
        }
        setRemainingToSpawn(Math.max(0, (settings.startEvents || 0) - spawnedInstancesCount - 1));
        setNextArrivalAt(addMinutes(now, Math.max(1, computeNextArrivalGapMinutes(now))));
      } else {
        // defer first arrival to working hours
  setRemainingToSpawn(Math.max(0, settings.startEvents || 0));
        const at = nextWorkingTime(now);
        setNextArrivalAt(at);
        setLogs([{ ts: now, instanceId: "-", taskName: graph.startNode, event: `first arrival deferred to ${format(at, "PPpp")}` }]);
      }
    }
  setStartedAt(now);
  setSimClock(now);
    setRunning(true);

    // arrivals init (handled above for arrival modes and deferrals)
    arrivalSeqRef.current = 0;

    // kick scheduler
    runTicker();
  };

  const stopSim = () => {
    setRunning(false);
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const resetSim = () => {
    stopSim();
    setTasks([]);
    setLogs([]);
    setStartedAt(null);
    setSimClock(null);
    setRemainingToSpawn(0);
    setNextArrivalAt(null);
    setElapsedSimMinutes(0);
    setElapsedWorkingMinutes(0);
    setElapsedProcessingWindowMinutes(0);
  };

  const runTicker = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setSimClock((prev) => {
        if (!prev) return prev;
        const next = addMinutes(prev, settings.speedMinutesPerTick);
        tickOnce(next);
        return next;
      });
    }, 1000);
  };

  const tickOnce = (now: Date) => {
    if (!running) return;
    // accumulate elapsed minutes (sim-wide) and working-hours minutes
    setElapsedSimMinutes((m) => m + settings.speedMinutesPerTick);
    if (canProcessNow(now)) setElapsedWorkingMinutes((m) => m + settings.speedMinutesPerTick);
    // accumulate minutes where processing is allowed (fastMode allows always)
    if (settings.fastMode || canProcessNow(now)) {
      setElapsedProcessingWindowMinutes((m) => m + settings.speedMinutesPerTick);
    }
    // handle arrivals and deferred initial bulk creations first
    if (remainingToSpawn > 0) {
      if (!nextArrivalAt || now >= nextArrivalAt) {
        if (settings.ignoreWorkingHours || isWorking(now)) {
          if (!settings.arrivalMode || settings.arrivalMode === "none") {
            // bulk create all remaining at once during working hours
            const allowance = Math.max(0, (settings.startEvents || 0) - spawnedInstancesCount);
            const countToCreate = Math.min(remainingToSpawn, allowance);
            for (let i = 0; i < countToCreate; i++) spawnOneInstance(now);
            setRemainingToSpawn(0);
            setNextArrivalAt(null);
          } else {
            // spawn one instance per schedule
            if (spawnedInstancesCount < (settings.startEvents || 0)) {
              spawnOneInstance(now);
              setRemainingToSpawn((r) => Math.max(0, r - 1));
            }
            // schedule next arrival time if more remain
            if (remainingToSpawn - 1 > 0) {
              const gapMin = computeNextArrivalGapMinutes(now);
              const next = addMinutes(now, Math.max(1, gapMin));
              setNextArrivalAt(next);
            } else {
              setNextArrivalAt(null);
            }
          }
        } else {
          // off-hours: push next check to next working time
          setNextArrivalAt(nextWorkingTime(now));
        }
      }
    }

    setTasks((prev) => {
      const items = [...prev];
      const newLogs: SimLog[] = [];

      // Resource capacity map per taskName (1 active per task by default)
      const activeByTask: Record<string, number> = {};
      for (const x of items) {
        if (x.status === "started") {
          activeByTask[x.taskName] = (activeByTask[x.taskName] || 0) + 1;
        }
      }

      // Processing gate: honor working hours unless ignored; in Fast mode, always allow for visibility
      const allowProcessing = settings.fastMode ? true : canProcessNow(now);
      // Creation gate: only create tasks during working hours (unless ignoring)
      const creationAllowedNow = settings.ignoreWorkingHours || isWorking(now);

      // Realize any deferred next-step creations when allowed
      if (creationAllowedNow) {
        const instEntries = Object.entries(instanceStateRef.current);
        for (const [instId, st] of instEntries) {
          if (st?.deferredNext && st.deferredNext.length) {
            const spawnedNow: SimTask[] = [];
            for (const def of st.deferredNext) {
              const nt: SimTask = {
                id: `T-${items.length + spawnedNow.length + 1}`,
                instanceId: instId,
                taskName: def.taskName,
                assignee: def.email,
                status: "created",
                sequence: def.sequence,
                plannedMinutes: calculateRealisticTime(def.plannedMin),
                createdAt: now,
                waitMinutes: Math.round(settings.fastMode ? 0 : rand(2, 45)),
                processMinutes: 0,
              };
              spawnedNow.push(nt);
              newLogs.push({ ts: now, instanceId: instId, taskName: def.taskName, event: "created (deferred)" });
            }
            if (spawnedNow.length) {
              items.push(...spawnedNow);
              st.deferredNext = [];
              instanceStateRef.current[instId] = st;
            }
          }
        }
      }

      for (const t of items) {
        // Sequential gating: only allow a task to progress if previous in same instance is completed
        const prevCompleted =
          t.sequence === 0 ||
          items.some(
            (x) =>
              x.instanceId === t.instanceId &&
              x.sequence === t.sequence - 1 &&
              x.status === "completed"
          );

        // progress tasks through lifecycle
        if (t.status === "created") {
          if (!prevCompleted) continue; // wait until previous completes
          t.status = "queued";
          t.queuedAt = now;
          newLogs.push({ ts: now, instanceId: t.instanceId, taskName: t.taskName, event: "queued" });
          continue;
        }

        if (t.status === "queued") {
          if (!prevCompleted) continue; // do not advance until previous completes
          const minutesQueued = t.queuedAt ? (now.getTime() - t.queuedAt.getTime()) / 60000 : 0;
          if (settings.fastMode || minutesQueued >= t.waitMinutes) {
            // capacity check: if resource busy, remain queued
            const cap = resourceCaps[t.taskName] ?? 1; // capacity per task name
            const inUse = activeByTask[t.taskName] || 0;
            if (inUse >= cap) {
              if (!t.deferredDueToBusy) {
                t.deferredDueToBusy = true;
                newLogs.push({ ts: now, instanceId: t.instanceId, taskName: t.taskName, event: "queue-deferred (busy)" });
              }
              // stay queued
              continue;
            }
            if (!settings.fastMode && Math.random() < 0.15) {
              t.status = "pending";
              t.pendingAt = now;
              newLogs.push({ ts: now, instanceId: t.instanceId, taskName: t.taskName, event: "pending" });
            } else {
              t.status = "assigned";
              t.assignedAt = now;
              newLogs.push({ ts: now, instanceId: t.instanceId, taskName: t.taskName, event: "assigned" });
            }
          }
          continue;
        }

        if (t.status === "pending") {
          if (!prevCompleted) continue;
          // pending resolves after a short additional delay
          const minutesPending = t.pendingAt ? (now.getTime() - t.pendingAt.getTime()) / 60000 : 0;
          if (settings.fastMode || minutesPending >= Math.min(30, t.waitMinutes * 0.5)) {
            // capacity check; if busy, push back to queue
            const cap = resourceCaps[t.taskName] ?? 1;
            const inUse = activeByTask[t.taskName] || 0;
            if (inUse >= cap) {
              t.status = "queued";
              t.queuedAt = now;
              t.deferredDueToBusy = true;
              newLogs.push({ ts: now, instanceId: t.instanceId, taskName: t.taskName, event: "re-queued (busy after pending)" });
            } else {
              t.status = "assigned";
              t.assignedAt = now;
              newLogs.push({ ts: now, instanceId: t.instanceId, taskName: t.taskName, event: "assigned (from pending)" });
            }
          }
          continue;
        }

        if (t.status === "assigned") {
          // start immediately
          if (allowProcessing) {
            t.status = "started";
            t.startedAt = now;
            newLogs.push({ ts: now, instanceId: t.instanceId, taskName: t.taskName, event: "started" });
            activeByTask[t.taskName] = (activeByTask[t.taskName] || 0) + 1; // occupy resource
          }
          continue;
        }

        if (t.status === "started") {
          // accumulate processing time at effective speed
          if (allowProcessing) {
            const eff = effectiveSpeed(settings.speedMinutesPerTick, now);
            t.processMinutes += eff;
            if (t.processMinutes >= t.plannedMinutes) {
              t.status = "completed";
              t.completedAt = now;
              newLogs.push({ ts: now, instanceId: t.instanceId, taskName: t.taskName, event: "completed" });
              // free capacity immediately so subsequent tasks in this tick can use it
              if ((activeByTask[t.taskName] || 0) > 0) {
                activeByTask[t.taskName] = Math.max(0, (activeByTask[t.taskName] || 0) - 1);
              }
              // sequentially create next task for this instance
              const curState = instanceStateRef.current[t.instanceId];
              // Only process next task if the completed task is the expected current task for this instance
              if (curState && curState.currentTask && t.taskName === curState.currentTask) {
                const spawned: SimTask[] = [];
                const pushTask = (taskName: string, email: string | undefined, plannedMin: number) => {
                  if (creationAllowedNow) {
                    const nt: SimTask = {
                      id: `T-${items.length + spawned.length + 1}`,
                      instanceId: t.instanceId,
                      taskName,
                      assignee: email,
                      status: "created",
                      sequence: curState.nextSeq++,
                      plannedMinutes: calculateRealisticTime(plannedMin),
                      createdAt: now,
                      waitMinutes: Math.round(settings.fastMode ? 0 : rand(2, 45)),
                      processMinutes: 0,
                    };
                    spawned.push(nt);
                    newLogs.push({ ts: now, instanceId: t.instanceId, taskName, event: "created (next)" });
                  } else {
                    const seq = curState.nextSeq++;
                    const def = { taskName, email, plannedMin, sequence: seq };
                    if (!curState.deferredNext) curState.deferredNext = [];
                    curState.deferredNext.push(def);
                    newLogs.push({ ts: now, instanceId: t.instanceId, taskName, event: "creation deferred (off-hours)" });
                  }
                };
                // move to next: prefer 'Done' for linear; only use weights for true decisions
                const options = graph.byCurrent[t.taskName] || [];
                if (options.length) {
                    let chosen: any = null;
                    const statuses = Array.from(new Set(options.map((o: any) => (o.status || "").toString())));
                    const hasDone = statuses.some((s) => s.toLowerCase() === "done");
                    const hasDecision = !!decisionWeights[t.taskName] && !hasDone && statuses.length > 1;

                    if (hasDecision) {
                      const weights = decisionWeights[t.taskName] || {};
                      const selected = chooseByWeights(weights) || statuses[0];
                      chosen =
                        options.find(
                          (o: any) => (o.status || "").toString() === selected && o.nextTask && String(o.nextTask).trim().length > 0
                        ) || options.find((o: any) => o.nextTask && String(o.nextTask).trim().length > 0) || null;
                    } else if (hasDone) {
                      chosen = options.find(
                        (o: any) => (o.status || "").toString().toLowerCase() === "done" && o.nextTask && String(o.nextTask).trim().length > 0
                      ) || options.find((o: any) => o.nextTask && String(o.nextTask).trim().length > 0) || null;
                    } else {
                      chosen = options.find((o: any) => o.nextTask && String(o.nextTask).trim().length > 0) || null;
                    }

                    if (chosen && chosen.nextTask) {
                      const plannedMin = tatToMinutes(chosen.tat, chosen.tatType);
                      pushTask(chosen.nextTask, chosen.email, plannedMin);
                      newLogs.push({ ts: now, instanceId: t.instanceId, taskName: t.taskName, event: `next: ${chosen.nextTask} (status=${String(chosen.status)})` });
                      curState.currentTask = chosen.nextTask;
                    } else {
                      curState.currentTask = null; // end
                      newLogs.push({ ts: now, instanceId: t.instanceId, taskName: t.taskName, event: "end-of-flow" });
                    }
                  } else {
                    curState.currentTask = null; // end
                    newLogs.push({ ts: now, instanceId: t.instanceId, taskName: t.taskName, event: "end-of-flow (no rules)" });
                  }
                  if (spawned.length) {
                    items.push(...spawned);
                    // In fast mode, attempt immediate promotion of just-spawned tasks in this tick
                    if (settings.fastMode) {
                    for (const s of spawned) {
                      // move created -> queued
                      s.status = "queued";
                      s.queuedAt = now;
                      newLogs.push({ ts: now, instanceId: s.instanceId, taskName: s.taskName, event: "queued (fast)" });
                      // capacity check for assigned/started
                      const cap = resourceCaps[s.taskName] ?? 1;
                      const inUse = activeByTask[s.taskName] || 0;
                      if (inUse < cap) {
                        s.status = "assigned";
                        s.assignedAt = now;
                        newLogs.push({ ts: now, instanceId: s.instanceId, taskName: s.taskName, event: "assigned (fast)" });
                        // start immediately if processing allowed
                        if (settings.fastMode ? true : canProcessNow(now)) {
                          s.status = "started";
                          s.startedAt = now;
                          activeByTask[s.taskName] = (activeByTask[s.taskName] || 0) + 1;
                          newLogs.push({ ts: now, instanceId: s.instanceId, taskName: s.taskName, event: "started (fast)" });
                        }
                      }
                    }
                  }
                }
                instanceStateRef.current = { ...instanceStateRef.current, [t.instanceId]: curState };
                setInstanceState((s) => ({ ...s, [t.instanceId]: curState }));
              }
            }
          }
          continue;
        }
      }

      if (newLogs.length) setLogs((l) => [...newLogs, ...l].slice(0, 500));
      // update series snapshot
      const created = newLogs.filter((l) => l.event === "created").length;
      const completedNow = newLogs.filter((l) => l.event === "completed").length;
      const queueLen = items.filter((x) => x.status === "queued" || x.status === "pending").length;
      const inProg = items.filter((x) => x.status === "started").length;
      const capTotal = Object.values(resourceCaps).reduce((a, b) => a + (b || 0), 0) || 1;
      const util = Math.min(100, Math.round((inProg / capTotal) * 10000) / 100);
      setSeries((s) => [{ t: now.toISOString(), created, completed: completedNow, queue: queueLen, inProgress: inProg, util }, ...s].slice(0, 240));
      return items;
    });
  };

  // Compute next arrival gap based on mode
  const computeNextArrivalGapMinutes = (now: Date): number => {
    const m = settings.arrivalMode;
    if (!m || m === "none") return Infinity;
    if (m === "period") return Math.max(1, settings.arrivalPeriodMin || 60);
    if (m === "uniform") {
      const a = Math.max(1, settings.arrivalUniformMin || 15);
      const b = Math.max(a, settings.arrivalUniformMax || a + 30);
      return rand(a, b);
    }
    if (m === "normal") {
      const mean = Math.max(1, settings.arrivalNormalMean || 60);
      const std = Math.max(1, settings.arrivalNormalStd || 10);
      // Box-Muller
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      const sample = mean + z * std;
      return Math.max(1, sample);
    }
    if (m === "trendUp" || m === "trendDown") {
      // convert trend pct per hour into step factor
      const base = Math.max(5, settings.arrivalPeriodMin || settings.arrivalNormalMean || 60);
      const pct = (settings.arrivalTrendPct || 10) / 100;
      // If trendUp, decrease gap over time; if trendDown, increase gap
      const hours = startedAt ? (now.getTime() - startedAt.getTime()) / 3600000 : 0;
      const factor = m === "trendUp" ? Math.max(0.25, 1 - pct * hours) : 1 + pct * hours;
      return Math.max(1, base * factor + rand(-5, 5));
    }
    return 60;
  };

  // Spawn a single instance using current path rules
  const spawnOneInstance = (now: Date) => {
    const rules = getRulesBySystem(flowRules, settings.system);
    if (!rules.length || !graph.startNode) return;
    if (!settings.ignoreWorkingHours && !isWorking(now)) return; // gate creations to working hours
    // respect hard cap from startEvents
    if (spawnedInstancesCount >= (settings.startEvents || 0)) return;
    const i = ++arrivalSeqRef.current;
    const instanceId = `SIM-${now.getTime()}-A${i}`;
    const startRuleRec: any = graph.rules.find((r: any) => r.currentTask === "");
    if (!startRuleRec) return;
    const baseTat = tatToMinutes(startRuleRec.tat, startRuleRec.tatType);
    const planned = calculateRealisticTime(baseTat);
    const wait = settings.fastMode ? 0 : rand(2, 45);
    const newInst: InstanceState = { nextSeq: 1, currentTask: graph.startNode, deferredNext: [] };
    instanceStateRef.current = { ...instanceStateRef.current, [instanceId]: newInst };
    setInstanceState((s) => ({ ...s, [instanceId]: newInst }));
    const newTask: SimTask = {
      id: `T-${tasks.length + 1}`,
      instanceId,
      taskName: graph.startNode,
      assignee: startRuleRec.email,
      status: "created",
      sequence: 0,
      plannedMinutes: planned,
      createdAt: now,
      waitMinutes: Math.round(wait),
      processMinutes: 0,
    };
    setTasks((prev) => [newTask, ...prev]);
    setLogs((l) => [{ ts: now, instanceId, taskName: graph.startNode, event: "created" }, ...l].slice(0, 500));
  };

  // Pause/resume when running state toggles
  useEffect(() => {
    if (running) runTicker();
    else if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running, settings.speedMinutesPerTick]);

  const handleNumber = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setSettings((s) => ({ ...s, [key]: isNaN(v) ? 0 : v }));
  };

  return (
    <div className="flex h-screen bg-neutral">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header title="Advanced Simulator" description="Business process simulation with cost and performance metrics (client-only)" />

        <div className="p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> Simulation Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Choose Flow</label>
                  <Select value={settings.system} onValueChange={(v) => setSettings((s) => ({ ...s, system: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select system" /></SelectTrigger>
                    <SelectContent>
                      {systems.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Start flow event count</label>
                  <Input className="mt-1" type="number" min={1} value={settings.startEvents} onChange={handleNumber("startEvents")} />
                  <div className="text-xs text-muted-foreground mt-1">
                    {settings.arrivalMode === "none" || !settings.arrivalMode
                      ? "Creates this many initial instances at start (or defers to office start)."
                      : "Spawns this many instances over time using the selected arrival mode."}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Speed (sim minutes per tick)</label>
                  <Input className="mt-1" type="number" min={1} value={settings.speedMinutesPerTick} onChange={handleNumber("speedMinutesPerTick")} />
                </div>

                <div>
                  <label className="text-sm font-medium">Peak start (HH:mm)</label>
                  <Input className="mt-1" type="time" value={settings.peakStart} onChange={(e) => setSettings((s) => ({ ...s, peakStart: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Peak end (HH:mm)</label>
                  <Input className="mt-1" type="time" value={settings.peakEnd} onChange={(e) => setSettings((s) => ({ ...s, peakEnd: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Peak speed (%)</label>
                  <Input className="mt-1" type="number" min={10} max={100} value={settings.peakSpeedPercent} onChange={handleNumber("peakSpeedPercent")} />
                </div>

                <div>
                  <label className="text-sm font-medium">Team size (auto-calculated)</label>
                  <Input className="mt-1" type="number" value={settings.teamSize} disabled />
                  <div className="text-xs text-muted-foreground mt-1">
                    Auto-set to {settings.teamSize} (one person per task). Adjust individual task capacity in Config.
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-2"><DollarSign className="w-4 h-4" /> Avg operation cost per hour</label>
                  <Input className="mt-1" type="number" min={0} step={0.5} value={settings.costPerHour} onChange={handleNumber("costPerHour")} />
                </div>
              </div>

              <Separator className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Arrival mode</label>
                  <Select value={settings.arrivalMode} onValueChange={(v) => setSettings((s) => ({ ...s, arrivalMode: v as any }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (spawn all at start)</SelectItem>
                      <SelectItem value="period">Period (fixed gap)</SelectItem>
                      <SelectItem value="uniform">Uniform (min-max)</SelectItem>
                      <SelectItem value="normal">Normal (mean/std)</SelectItem>
                      <SelectItem value="trendUp">Trend up</SelectItem>
                      <SelectItem value="trendDown">Trend down</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {settings.arrivalMode === "period" && (
                  <div>
                    <label className="text-sm font-medium">Arrival gap (min)</label>
                    <Input className="mt-1" type="number" min={1} value={settings.arrivalPeriodMin}
                      onChange={(e) => setSettings((s) => ({ ...s, arrivalPeriodMin: Number(e.target.value) || 1 }))} />
                  </div>
                )}
                {settings.arrivalMode === "uniform" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Gap min</label>
                      <Input className="mt-1" type="number" min={1} value={settings.arrivalUniformMin}
                        onChange={(e) => setSettings((s) => ({ ...s, arrivalUniformMin: Number(e.target.value) || 1 }))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Gap max</label>
                      <Input className="mt-1" type="number" min={1} value={settings.arrivalUniformMax}
                        onChange={(e) => setSettings((s) => ({ ...s, arrivalUniformMax: Number(e.target.value) || 1 }))} />
                    </div>
                  </div>
                )}
                {settings.arrivalMode === "normal" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Mean gap</label>
                      <Input className="mt-1" type="number" min={1} value={settings.arrivalNormalMean}
                        onChange={(e) => setSettings((s) => ({ ...s, arrivalNormalMean: Number(e.target.value) || 1 }))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Std dev</label>
                      <Input className="mt-1" type="number" min={1} value={settings.arrivalNormalStd}
                        onChange={(e) => setSettings((s) => ({ ...s, arrivalNormalStd: Number(e.target.value) || 1 }))} />
                    </div>
                  </div>
                )}
                {(settings.arrivalMode === "trendUp" || settings.arrivalMode === "trendDown") && (
                  <div>
                    <label className="text-sm font-medium">Trend rate (% per hour)</label>
                    <Input className="mt-1" type="number" step={1} value={settings.arrivalTrendPct}
                      onChange={(e) => setSettings((s) => ({ ...s, arrivalTrendPct: Number(e.target.value) || 0 }))} />
                  </div>
                )}
              </div>

              <Separator className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Working start (HH:mm)</label>
                  <Input className="mt-1" type="time" value={settings.workStart}
                    onChange={(e) => setSettings((s) => ({ ...s, workStart: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Working end (HH:mm)</label>
                  <Input className="mt-1" type="time" value={settings.workEnd}
                    onChange={(e) => setSettings((s) => ({ ...s, workEnd: e.target.value }))} />
                </div>
                <div className="flex items-end gap-2">
                  <label className="text-sm font-medium">Skip weekends</label>
                  <input className="ml-2" type="checkbox" checked={!!settings.skipWeekends}
                    onChange={(e) => setSettings((s) => ({ ...s, skipWeekends: e.target.checked }))} />
                </div>
              </div>

              <Separator className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!settings.fastMode} onChange={(e) => setSettings((s) => ({ ...s, fastMode: e.target.checked }))} />
                  Fast mode (no initial wait, auto-advance)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!settings.ignoreWorkingHours} onChange={(e) => setSettings((s) => ({ ...s, ignoreWorkingHours: e.target.checked }))} />
                  Ignore working hours (process anytime)
                </label>
              </div>

              <Separator className="my-4" />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={!!settings.useRealisticTimes} 
                      onChange={(e) => setSettings((s) => ({ ...s, useRealisticTimes: e.target.checked }))} />
                    Use realistic completion times
                  </label>
                </div>
                <div className="text-xs text-muted-foreground ml-6 mb-3">
                  When enabled, tasks complete faster than max TAT based on real-world patterns. For example, if TAT is 1 hour but tasks typically finish in 10-15 minutes, set average to 20% with some variability.
                </div>
                {settings.useRealisticTimes && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <div>
                      <label className="text-sm font-medium">Average completion % of TAT</label>
                      <Input className="mt-1" type="number" min={1} max={100} 
                        value={settings.avgCompletionPct}
                        onChange={(e) => setSettings((s) => ({ ...s, avgCompletionPct: Math.max(1, Math.min(100, Number(e.target.value) || 20)) }))} />
                      <div className="text-xs text-muted-foreground mt-1">
                        E.g., 20% means tasks finish in ~20% of the max TAT on average
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Variability (±%)</label>
                      <Input className="mt-1" type="number" min={0} max={50} 
                        value={settings.completionVariability}
                        onChange={(e) => setSettings((s) => ({ ...s, completionVariability: Math.max(0, Math.min(50, Number(e.target.value) || 10)) }))} />
                      <div className="text-xs text-muted-foreground mt-1">
                        Random variation around the average (e.g., ±10%)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                {!running ? (
                  <Button onClick={startSim} className="gap-2"><Play className="w-4 h-4" /> Start</Button>
                ) : (
                  <Button variant="secondary" onClick={() => setRunning(false)} className="gap-2"><Pause className="w-4 h-4" /> Pause</Button>
                )}
                <Button variant="outline" onClick={() => setRunning(true)} disabled={running || tasks.length === 0} className="gap-2"><Play className="w-4 h-4" /> Resume</Button>
                <Button variant="destructive" onClick={resetSim} className="gap-2"><RotateCcw className="w-4 h-4" /> Reset</Button>
                <Dialog open={configOpen} onOpenChange={setConfigOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Config</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <UIDialogHeader>
                      <UIDialogTitle>Simulation Configuration</UIDialogTitle>
                    </UIDialogHeader>
                    {/* Decision Weights */}
                    {Object.keys(graph.decisions).length > 0 && (
                      <div className="space-y-4">
                        <div className="text-sm font-semibold">Decision Weights</div>
                        {Object.entries(graph.decisions).map(([task, opts]) => {
                          const statuses = Array.from(new Set(opts.map((o) => (o.status || "").toString())));
                          const sum = statuses.reduce((s, st) => s + (decisionWeights[task]?.[st] || 0), 0);
                          return (
                            <div key={task} className="border rounded-md p-3">
                              <div className="font-medium mb-2">{task}</div>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                {statuses.map((st) => (
                                  <div key={st}>
                                    <label className="text-xs text-muted-foreground">{st || "(blank)"} weight %</label>
                                    <Input
                                      className="mt-1"
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={decisionWeights[task]?.[st] ?? 0}
                                      onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setDecisionWeights((dw) => ({
                                          ...dw,
                                          [task]: { ...(dw[task] || {}), [st]: isNaN(v) ? 0 : v },
                                        }));
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">Sum: {sum}% (used as relative weights; auto-normalized when selecting)</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Resource Capacity per Task */}
                    {Object.keys(resourceCaps).length > 0 && (
                      <div className="space-y-4 mt-6">
                        <div>
                          <div className="text-sm font-semibold">Resource Capacity (People per Task)</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Each task defaults to 1 person. Increase to add more people working on the same task concurrently.
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {Object.keys(resourceCaps).sort().map((task) => (
                            <div key={task} className="border rounded-md p-3">
                              <div className="text-sm font-medium mb-1">{task}</div>
                              <label className="text-xs text-muted-foreground">Number of people</label>
                              <Input
                                className="mt-1"
                                type="number"
                                min={1}
                                max={50}
                                value={resourceCaps[task]}
                                onChange={(e) => {
                                  const v = Math.max(1, Math.floor(Number(e.target.value) || 1));
                                  setResourceCaps((caps) => ({ ...caps, [task]: v }));
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" /> Sim time: {simClock ? format(simClock, "PPpp") : "-"}
                </div>
              </div>
              <div className="text-xs text-muted-foreground pt-2">
                Arrivals and processing follow working hours unless you enable Fast mode or Ignore working hours.
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                {settings.useRealisticTimes 
                  ? `Realistic times enabled: Tasks complete in ~${settings.avgCompletionPct}% of max TAT (±${settings.completionVariability}%) instead of full TAT duration.`
                  : "Using default time model: Tasks complete with random variation around max TAT."}
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                Instances spawned: {spawnedInstancesCount} of {settings.startEvents} | Remaining to spawn: {remainingToSpawn} {nextArrivalAt ? `| Next arrival at: ${format(nextArrivalAt, "pp")}` : ""} {simClock ? (isWorking(simClock) ? "| In working hours" : "| Outside working hours") : ""}
              </div>
            </CardContent>
          </Card>

          {/* Configurable settings moved into Config dialog */}

          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Throughput (tasks/hr)</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-600" /> {fmtNum(metrics.throughputPerHour)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Completed</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> {fmtNum(metrics.completed)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Productivity</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{fmtNum(metrics.productivityPct)}%</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Performance</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{fmtNum(metrics.performancePct)}%</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Loss cost</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{fmtCurrency(metrics.lossCost)}</CardContent>
            </Card>
          </div>

          {/* Capacity Utilization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Gauge className="w-5 h-5" /> Capacity Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm mb-2">
                <div>In progress: {utilSnapshot.inProg}</div>
                <div>Capacity: {utilSnapshot.capTotal}</div>
                <div>Queue: {utilSnapshot.queue}</div>
              </div>
              <Progress value={utilSnapshot.util} />
              <div className="text-xs text-muted-foreground mt-1">{utilSnapshot.util}% utilized</div>
            </CardContent>
          </Card>

          {/* Additional KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Avg queue time (min)</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{fmtNum(metrics.avgQueueMin)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Avg cycle time (min)</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{fmtNum(metrics.avgCycleMin)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">WIP</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold">{fmtNum(metrics.wip)}</CardContent>
            </Card>
          </div>

          {/* Bottleneck */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Bottleneck</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {metrics.bottleneckTask ? (
                <div className="flex items-center gap-4">
                  <div><span className="font-medium">Task:</span> {metrics.bottleneckTask}</div>
                  <div><span className="font-medium">Avg wait:</span> {fmtNum(metrics.bottleneckAvgWait)} min</div>
                  <div><span className="font-medium">Utilization:</span> {fmtNum(metrics.bottleneckUtilPct)}%</div>
                </div>
              ) : (
                <div>No data yet.</div>
              )}
            </CardContent>
          </Card>

          {/* Charts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Time Series</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <label className="text-sm">On-time buffer %</label>
                <Input className="max-w-[120px]" type="number" min={0} max={100} step={1}
                  value={settings.onTimeBufferPct}
                  onChange={(e) => setSettings((s) => ({ ...s, onTimeBufferPct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...series].reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="t" tickFormatter={(v) => new Date(v).toLocaleTimeString()} hide />
                      <YAxis />
                      <Tooltip labelFormatter={(v) => new Date(v as string).toLocaleTimeString()} />
                      <Legend />
                      <Line type="monotone" dataKey="created" stroke="#0ea5e9" dot={false} name="Created" />
                      <Line type="monotone" dataKey="completed" stroke="#22c55e" dot={false} name="Completed" />
                      <Line type="monotone" dataKey="queue" stroke="#f59e0b" dot={false} name="Queue" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...series].reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="t" tickFormatter={(v) => new Date(v).toLocaleTimeString()} hide />
                      <YAxis domain={[0, 100]} />
                      <Tooltip labelFormatter={(v) => new Date(v as string).toLocaleTimeString()} />
                      <Legend />
                      <Line type="monotone" dataKey="util" stroke="#ef4444" dot={false} name="Utilization %" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task-wise On-time Completion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Task-wise On-time vs Late</CardTitle>
            </CardHeader>
            <CardContent>
              {onTimeByTask.length === 0 ? (
                <div className="text-sm text-muted-foreground">No completed tasks yet.</div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={onTimeByTask}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="task" hide={false} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip formatter={(value: any, name: any, props: any) => {
                        const total = props?.payload?.total || 0;
                        const pct = total ? Math.round((Number(value) / total) * 100) : 0;
                        return [`${value} (${pct}%)`, name];
                      }} />
                      <Legend />
                      <Bar dataKey="onTime" stackId="a" fill="#22c55e" name="On Time" cursor="pointer"
                        onClick={(data) => handleDrilldown(String((data as any)?.task), true)}
                      />
                      <Bar dataKey="late" stackId="a" fill="#ef4444" name="Late" cursor="pointer"
                        onClick={(data) => handleDrilldown(String((data as any)?.task), false)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottleneck Analysis - Slowest Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Bottleneck Analysis - Slowest Steps</CardTitle>
            </CardHeader>
            <CardContent>
              {bottleneckData.length === 0 ? (
                <div className="text-sm text-muted-foreground">No completed tasks yet.</div>
              ) : (
                <div>
                  <div className="text-xs text-muted-foreground mb-3">
                    Average processing time per task (from start to completion). Higher times indicate bottlenecks.
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bottleneckData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="task" angle={-20} textAnchor="end" height={80} interval={0} />
                        <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          formatter={(value: any) => `${Number(value).toFixed(2)} min`}
                          labelFormatter={(label) => `Task: ${label}`}
                        />
                        <Bar dataKey="avgTime" fill="#ef4444" name="Avg Processing Time" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 text-xs text-muted-foreground">
                    Slowest step: <span className="font-semibold text-foreground">{bottleneckData[0]?.task}</span> 
                    {bottleneckData[0] && ` (${bottleneckData[0].avgTime.toFixed(2)} min avg processing time, ${bottleneckData[0].count} completed)`}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live tasks view */}
          <Dialog open={drill.open} onOpenChange={(o) => setDrill((d) => ({ ...d, open: o }))}>
            <DialogContent className="max-w-3xl">
              <UIDialogHeader>
                <UIDialogTitle>
                  {drill.onTime ? "On Time" : drill.onTime === false ? "Late" : ""} instances for {drill.task}
                </UIDialogTitle>
              </UIDialogHeader>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Instance</th>
                      <th className="py-2 pr-4">Cycle (min)</th>
                      <th className="py-2 pr-4">Planned (min)</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drill.rows.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4">{r.instanceId}</td>
                        <td className="py-2 pr-4">{r.cycleMin}</td>
                        <td className="py-2 pr-4">{r.plannedMin}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">{format(r.createdAt, "PPpp")}</td>
                        <td className="py-2 pr-4 whitespace-nowrap">{format(r.completedAt, "PPpp")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Tasks (temp, not saved)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Instance</th>
                      <th className="py-2 pr-4">Task</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Wait (min)</th>
                      <th className="py-2 pr-4">Proc (min)</th>
                      <th className="py-2 pr-4">Planned (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.slice(0, 200).map((t) => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pr-4">{t.instanceId}</td>
                        <td className="py-2 pr-4">{t.taskName}</td>
                        <td className="py-2 pr-4">
                          <span className={`px-2 py-1 rounded border text-xs ${badgeClassForStatus(t.status)}`}>{t.status}</span>
                        </td>
                        <td className="py-2 pr-4">{fmtNum(t.waitMinutes)}</td>
                        <td className="py-2 pr-4">{fmtNum(t.processMinutes)}</td>
                        <td className="py-2 pr-4">{fmtNum(t.plannedMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><List className="w-5 h-5" /> Demo Task Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-2">Most recent first (temporary, not saved)</div>
              <div className="h-64 overflow-auto border rounded-md">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left border-b bg-muted/30">
                      <th className="py-1 px-2">Time</th>
                      <th className="py-1 px-2">Instance</th>
                      <th className="py-1 px-2">Task</th>
                      <th className="py-1 px-2">Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 500).map((l, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-1 px-2 whitespace-nowrap">{format(l.ts, "PPpp")}</td>
                        <td className="py-1 px-2">{l.instanceId}</td>
                        <td className="py-1 px-2">{l.taskName}</td>
                        <td className="py-1 px-2">{l.event}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
