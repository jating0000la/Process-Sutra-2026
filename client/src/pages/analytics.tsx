import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MetricCard from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from "recharts";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Target,
  Award,
  Users,
  Calendar,
  Download,
  Activity,
  BarChart3,
  Filter,
  Zap,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { useOrganizationCheck } from "@/hooks/useOrganizationCheck";
import { useGoogleDriveCheck } from "@/hooks/useGoogleDriveCheck";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye, X, FileText, Loader2 } from "lucide-react";

export default function Analytics() {
  const { toast } = useToast();
  const { user, loading, handleTokenExpired, dbUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [, setLocation] = useLocation();
  
  // Check organization details for admin users
  const { isIncomplete } = useOrganizationCheck();
  
  // Check Google Drive connection for admin users
  const { isConnected: isDriveConnected } = useGoogleDriveCheck();
  
  // Selected user for drill-down view
  const [selectedDoer, setSelectedDoer] = useState<{ email: string; name: string } | null>(null);
  
  const [doerFilters, setDoerFilters] = useState({
    startDate: "",
    endDate: "",
    doerName: "",
    doerEmail: "",
    performanceLevel: "", // 'excellent' (>=80), 'good' (60-79), 'needs-improvement' (<60)
  });

  // Performance report generation state
  const [reportGenerating, setReportGenerating] = useState(false);

  // Reporting state
  const [reportFilters, setReportFilters] = useState({
    system: "",
    taskName: "",
    startDate: "",
    endDate: "",
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      handleTokenExpired();
      return;
    }
  }, [user, loading, handleTokenExpired]);

  const { data: metrics, isLoading: metricsLoading } = useQuery<{
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    onTimeRate: number;
    avgResolutionTime: number;
  }>({
    queryKey: ["/api/analytics/metrics"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - analytics data doesn't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
  });

  const { data: flowPerformance, isLoading: flowLoading } = useQuery<Array<{
    system: string;
    avgCompletionTime: number;
    onTimeRate: number;
  }>>({
    queryKey: ["/api/analytics/flow-performance"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Weekly scoring for users
  const { data: weeklyScoring, isLoading: weeklyLoading } = useQuery<any[]>({
    queryKey: ["/api/analytics/weekly-scoring"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Reporting queries
  const { data: systems } = useQuery<string[]>({
    queryKey: ["/api/analytics/report/systems"],
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes - systems list changes rarely
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  const { data: processes, refetch: refetchProcesses } = useQuery<string[]>({
    queryKey: ["/api/analytics/report/processes", reportFilters.system],
    queryFn: async () => {
      if (!reportFilters.system) return [];
      const res = await fetch(`/api/analytics/report/processes?system=${encodeURIComponent(reportFilters.system)}`);
      if (!res.ok) throw new Error("Failed to fetch processes");
      return res.json();
    },
    enabled: !!user && !!reportFilters.system,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  const { data: report, isLoading: reportLoading, refetch: refetchReport } = useQuery<{
    metrics: {
      totalTasks: number;
      completedTasks: number;
      overdueTasks: number;
      completionRate: number;
      onTimeRate: number;
      avgCompletionDays: number;
    };
    timeseries: Array<{ date: string; created: number; completed: number; overdue: number }>;
  }>({
    queryKey: ["/api/analytics/report", reportFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(reportFilters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res = await fetch(`/api/analytics/report?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      return res.json();
    },
    enabled: !!user,
    staleTime: 3 * 60 * 1000, // 3 minutes - reports are more dynamic
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Admin-only: All doers performance with filtering
  const { data: doersPerformance, isLoading: doersLoading } = useQuery({
    queryKey: ["/api/analytics/doers-performance", doerFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(doerFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await fetch(`/api/analytics/doers-performance?${params}`);
      if (!response.ok) throw new Error('Failed to fetch doers performance');
      return response.json();
    },
    enabled: !!user && (user as any)?.role === 'admin',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Admin-only: Individual doer weekly performance (for drill-down)
  const { data: doerWeeklyData, isLoading: doerWeeklyLoading } = useQuery({
    queryKey: ["/api/analytics/doer-weekly", selectedDoer?.email],
    queryFn: async () => {
      if (!selectedDoer?.email) return null;
      const response = await fetch(`/api/analytics/doer-weekly/${encodeURIComponent(selectedDoer.email)}?weeks=12`);
      if (!response.ok) throw new Error('Failed to fetch doer weekly data');
      return response.json();
    },
    enabled: !!selectedDoer?.email && (user as any)?.role === 'admin',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const handleFilterChange = (key: string, value: string) => {
    setDoerFilters(prev => ({ ...prev, [key]: value }));
  };

  // Export analytics data to CSV
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    if (!data || data.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export",
        variant: "destructive"
      });
      return;
    }

    // Create CSV content
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] ?? '';
          // Escape values that contain commas or quotes
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      )
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: `Downloaded ${data.length} records to ${filename}.csv`
    });
  };

  // Export doers performance data
  const exportDoersPerformance = () => {
    if (!doersPerformance) return;
    exportToCSV(
      doersPerformance,
      'doers-performance',
      ['doerEmail', 'doerName', 'totalTasks', 'completedTasks', 'onTimeRate', 'avgCompletionDays', 'lastTaskDate']
    );
  };

  // Generate "Voice of Business" PDF report — direct download, no popup
  const generatePerformanceReport = async () => {
    setReportGenerating(true);
    try {
      const res = await fetch(`/api/analytics/performance-report?costPerHour=500&includeAI=true`);
      if (!res.ok) throw new Error('Failed to generate report');
      const data = await res.json();
      
      // Build HTML, render in hidden container, convert to PDF, download
      const html = buildReportHTML(data);
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '1050px';
      container.innerHTML = html;
      document.body.appendChild(container);

      // Wait for fonts/images to settle
      await new Promise(resolve => setTimeout(resolve, 600));

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 1050,
        windowWidth: 1050,
      });

      document.body.removeChild(container);

      const imgWidth = 210; // A4 mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageHeight = 297;
      let heightLeft = imgHeight;
      let position = 0;
      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const orgName = (data.organization?.name || 'Business').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`Voice_of_Business_${orgName}_${new Date().toISOString().split('T')[0]}.pdf`);

      toast({ title: "Report Downloaded", description: "Voice of Business report saved as PDF" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate report", variant: "destructive" });
    } finally {
      setReportGenerating(false);
    }
  };

  // Build "Voice of Business" report — Premium Operations Intelligence Document
  const buildReportHTML = (r: any) => {
    const genDate = new Date(r.generatedAt).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const genTime = new Date(r.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const s = r.summary;
    const hs = r.healthScore || { composite: 0, grade: 'N/A', label: 'No Data', color: '#94A3B8', breakdown: {} };
    const trend = r.trendAnalysis || { completionRateDelta: 0, onTimeRateDelta: 0, volumeDelta: 0, isImproving: false, currentPeriod: {}, previousPeriod: {} };
    const cap = r.capacity || { totalTeamMembers: 0, tasksPerPerson: 0, completedPerPerson: 0, overallUtilization: 0 };
    const pm = r.processMaturity || { score: 0, label: 'Initial', maxScore: 5 };
    const pd = r.performanceDistribution || { excellent: 0, good: 0, average: 0, poor: 0, total: 0 };

    // ── Premium Color Palette ──
    const C = {
      navy: '#0B1437', darkSlate: '#1E293B', charcoal: '#334155', blue: '#1D4ED8', indigo: '#4338CA',
      teal: '#0D9488', emerald: '#059669', amber: '#D97706', red: '#DC2626', rose: '#E11D48',
      violet: '#7C3AED', slate: '#64748B', lightSlate: '#94A3B8', bg: '#F8FAFC', white: '#FFFFFF',
      gold: '#B8860B', accent: '#2563EB',
    };

    // ── SVG Chart Helpers ──
    const gaugeChart = (value: number, max: number, label: string, color: string, subLabel: string, size = 130) => {
      const radius = 50;
      const circ = Math.PI * radius; // half circle
      const pct = Math.min(value / max, 1);
      const dash = pct * circ;
      return `<div style="text-align:center;">
        <svg width="${size}" height="${size * 0.7}" viewBox="0 0 ${size} ${size * 0.65}">
          <path d="M ${size * 0.1} ${size * 0.55} A ${radius} ${radius} 0 0 1 ${size * 0.9} ${size * 0.55}" fill="none" stroke="#E2E8F0" stroke-width="10" stroke-linecap="round"/>
          <path d="M ${size * 0.1} ${size * 0.55} A ${radius} ${radius} 0 0 1 ${size * 0.9} ${size * 0.55}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${dash} ${circ}" />
          <text x="${size/2}" y="${size * 0.48}" text-anchor="middle" font-size="26" font-weight="800" fill="${color}">${value}</text>
          <text x="${size/2}" y="${size * 0.62}" text-anchor="middle" font-size="8" fill="${C.slate}" font-weight="600" letter-spacing="1">${subLabel}</text>
        </svg>
        <div style="font-size:10px;font-weight:700;color:${C.darkSlate};margin-top:-4px;text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
      </div>`;
    };

    const donutChart = (pct: number, label: string, color: string, size = 110) => {
      const radius = 40;
      const circ = 2 * Math.PI * radius;
      const dash = (pct / 100) * circ;
      return `<div style="text-align:center;">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#E5E7EB" stroke-width="8"/>
          <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="${color}" stroke-width="8" stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${circ * 0.25}" stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})"/>
          <text x="${size/2}" y="${size/2 - 2}" text-anchor="middle" font-size="20" font-weight="800" fill="${color}">${pct}%</text>
          <text x="${size/2}" y="${size/2 + 12}" text-anchor="middle" font-size="8" fill="${C.slate}" font-weight="600" text-transform="uppercase" letter-spacing="0.5">${label}</text>
        </svg>
      </div>`;
    };

    const deltaArrow = (delta: number, suffix = '%') => {
      if (delta === 0) return `<span style="color:${C.slate};font-size:11px;">— 0${suffix}</span>`;
      const color = delta > 0 ? C.emerald : C.red;
      const arrow = delta > 0 ? '&#9650;' : '&#9660;';
      return `<span style="color:${color};font-size:11px;font-weight:700;">${arrow} ${delta > 0 ? '+' : ''}${delta}${suffix}</span>`;
    };

    const miniBar = (pct: number, color: string, height = 6) =>
      `<div style="height:${height}px;background:#E5E7EB;border-radius:${height}px;overflow:hidden;width:100%;"><div style="height:100%;width:${Math.min(pct, 100)}%;background:${color};border-radius:${height}px;"></div></div>`;

    // Sparkline (SVG polyline)
    const sparkline = (values: number[], color: string, w = 120, h = 30) => {
      if (!values.length) return '';
      const max = Math.max(...values, 1);
      const min = Math.min(...values, 0);
      const range = max - min || 1;
      const points = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
      return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    };

    // Area sparkline
    const areaSparkline = (values: number[], color: string, w = 200, h = 50) => {
      if (!values.length) return '';
      const max = Math.max(...values, 1);
      const min = 0;
      const range = max - min || 1;
      const points = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * w},${h - ((v - min) / range) * (h - 6) - 3}`);
      const polyline = points.join(' ');
      const areaPoints = `${points[0]} ${polyline} ${(values.length - 1) / Math.max(values.length - 1, 1) * w},${h} 0,${h}`;
      return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <defs><linearGradient id="ag_${color.replace('#','')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.3"/><stop offset="100%" stop-color="${color}" stop-opacity="0.02"/></linearGradient></defs>
        <polygon points="${areaPoints}" fill="url(#ag_${color.replace('#','')})" />
        <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${values.map((v, i) => {
          const x = (i / Math.max(values.length - 1, 1)) * w;
          const y = h - ((v - min) / range) * (h - 6) - 3;
          return i === values.length - 1 ? `<circle cx="${x}" cy="${y}" r="3" fill="${color}" stroke="${C.white}" stroke-width="1.5"/>` : '';
        }).join('')}
      </svg>`;
    };

    // Horizontal bar chart
    const hBarChart = (items: {label: string; value: number; max: number; color: string; suffix?: string}[]) => {
      if (!items.length) return `<div style="padding:20px;text-align:center;color:${C.lightSlate};">No data available</div>`;
      return items.map(it => {
        const pct = it.max > 0 ? Math.min((it.value / it.max) * 100, 100) : 0;
        return `<div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="font-size:11px;font-weight:600;color:${C.darkSlate};max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${it.label}</span>
            <span style="font-size:11px;font-weight:700;color:${it.color};">${it.value}${it.suffix || ''}</span>
          </div>
          ${miniBar(pct, it.color)}
        </div>`;
      }).join('');
    };

    // Vertical bar chart
    const vBarChart = (items: {label: string; value: number; color: string}[], height = 160) => {
      if (!items.length) return `<div style="padding:20px;text-align:center;color:${C.lightSlate};">No data available</div>`;
      const maxVal = Math.max(...items.map(i => i.value), 1);
      const barW = Math.min(36, Math.floor(480 / items.length) - 10);
      const chartW = items.length * (barW + 14) + 24;
      return `<svg width="100%" height="${height + 30}" viewBox="0 0 ${chartW} ${height + 30}" style="display:block;margin:0 auto;">
        ${items.map((it, i) => {
          const barH = Math.max(4, (it.value / maxVal) * (height - 28));
          const x = 12 + i * (barW + 14);
          const y = height - barH;
          return `<g><rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="${it.color}" opacity="0.85"/>
            <rect x="${x}" y="${y}" width="${barW}" height="${Math.min(6, barH)}" rx="4" fill="${it.color}"/>
            <text x="${x + barW/2}" y="${y - 6}" text-anchor="middle" font-size="10" font-weight="700" fill="${it.color}">${it.value}</text>
            <text x="${x + barW/2}" y="${height + 14}" text-anchor="middle" font-size="7" fill="${C.slate}" font-weight="500">${it.label.length > 10 ? it.label.slice(0,9)+'..' : it.label}</text>
          </g>`;
        }).join('')}
        <line x1="6" y1="${height}" x2="${chartW - 6}" y2="${height}" stroke="#E2E8F0" stroke-width="1"/>
      </svg>`;
    };

    // Pie chart
    const pieChart = (slices: {label: string; value: number; color: string}[], size = 140) => {
      const total = slices.reduce((a, sl) => a + sl.value, 0);
      if (total === 0) return `<div style="padding:20px;text-align:center;color:${C.lightSlate};">No data</div>`;
      let cumulativeAngle = 0;
      const cx = size / 2, cy = size / 2, rad = size / 2 - 12;
      const paths = slices.filter(sl => sl.value > 0).map(sl => {
        const angle = (sl.value / total) * 360;
        const startAngle = cumulativeAngle;
        cumulativeAngle += angle;
        const endAngle = cumulativeAngle;
        const startRad = (startAngle - 90) * Math.PI / 180;
        const endRad = (endAngle - 90) * Math.PI / 180;
        const x1 = cx + rad * Math.cos(startRad), y1 = cy + rad * Math.sin(startRad);
        const x2 = cx + rad * Math.cos(endRad), y2 = cy + rad * Math.sin(endRad);
        const largeArc = angle > 180 ? 1 : 0;
        return `<path d="M${cx},${cy} L${x1},${y1} A${rad},${rad} 0 ${largeArc},1 ${x2},${y2} Z" fill="${sl.color}"/>`;
      }).join('');
      const legend = slices.filter(sl => sl.value > 0).map(sl => `<div style="display:flex;align-items:center;gap:6px;margin:3px 0;"><div style="width:10px;height:10px;border-radius:2px;background:${sl.color};flex-shrink:0;"></div><span style="font-size:11px;color:${C.charcoal};">${sl.label}: <strong>${sl.value}</strong> <span style="color:${C.lightSlate};">(${Math.round((sl.value/total)*100)}%)</span></span></div>`).join('');
      return `<div style="display:flex;align-items:center;gap:24px;justify-content:center;flex-wrap:wrap;">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>
        <div>${legend}</div>
      </div>`;
    };

    // ── Section header helper ──
    const sectionHeader = (num: number, title: string, accentColor: string) =>
      `<div style="display:flex;align-items:center;gap:10px;margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid ${accentColor}20;">
        <div style="width:28px;height:28px;border-radius:6px;background:${accentColor};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:white;flex-shrink:0;">${num}</div>
        <h2 style="font-size:17px;font-weight:700;color:${C.navy};margin:0;letter-spacing:-0.3px;">${title}</h2>
      </div>`;

    // ── Metric card helper ──
    const metricCard = (value: string | number, label: string, color: string, bg: string, icon?: string) =>
      `<div style="padding:16px;background:${bg};border:1px solid ${color}20;border-radius:8px;text-align:center;min-width:0;">
        ${icon ? `<div style="font-size:18px;margin-bottom:4px;">${icon}</div>` : ''}
        <div style="font-size:24px;font-weight:800;color:${color};line-height:1.1;">${value}</div>
        <div style="font-size:9px;color:${C.slate};text-transform:uppercase;letter-spacing:0.8px;margin-top:4px;font-weight:600;">${label}</div>
      </div>`;

    // ── Data for charts ──
    const bottleneckItems = (r.bottlenecks || []).slice(0, 8).map((b: any) => ({
      label: b.taskName, value: b.avgCycleHours,
      color: b.avgCycleHours > 48 ? C.red : b.avgCycleHours > 24 ? C.amber : C.emerald
    }));

    const systemChartItems = (r.systemBreakdown || []).slice(0, 8).map((sys: any, i: number) => ({
      label: sys.system, value: sys.totalTasks,
      color: [C.blue, C.violet, C.emerald, C.amber, C.red, C.teal, C.indigo, C.rose][i % 8]
    }));

    const flowCompletionItems = (r.flowPerformance || []).slice(0, 8).map((f: any, i: number) => ({
      label: f.system, value: Math.abs(f.avgCompletionTime) || 0,
      color: [C.teal, C.blue, C.violet, C.amber, C.emerald, C.red, C.indigo, C.rose][i % 8]
    }));

    const doerChartItems = (r.doerPerformance || []).slice(0, 10).map((d: any) => ({
      label: (d.doerEmail || '').split('@')[0],
      value: d.onTimeRate || 0,
      color: (d.onTimeRate || 0) >= 80 ? C.emerald : (d.onTimeRate || 0) >= 50 ? C.amber : C.red
    }));

    const weeklyTrendData = (r.weeklyTrend || []).map((w: any) => w.completed);
    const weeklyOnTimeData = (r.weeklyTrend || []).map((w: any) => w.onTimeRate);

    // ── Table builders ──
    const thStyle = (align = 'left') => `padding:10px 12px;text-align:${align};color:${C.slate};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;font-size:9px;border-bottom:2px solid #E2E8F0;`;
    const tdStyle = (align = 'left') => `padding:9px 12px;text-align:${align};border-bottom:1px solid #F1F5F9;font-size:12px;`;

    const systemRows = (r.systemBreakdown || []).map((sys: any) => `
      <tr>
        <td style="${tdStyle()}font-weight:600;color:${C.darkSlate};">${sys.system}</td>
        <td style="${tdStyle('center')}">${sys.totalTasks}</td>
        <td style="${tdStyle('center')}color:${C.emerald};font-weight:600;">${sys.completed}</td>
        <td style="${tdStyle('center')}">${sys.pending || 0}</td>
        <td style="${tdStyle('center')}color:${sys.overdue > 0 ? C.red : C.slate};font-weight:600;">${sys.overdue}</td>
        <td style="${tdStyle('center')}font-weight:700;color:${sys.completionRate >= 80 ? C.emerald : sys.completionRate >= 50 ? C.amber : C.red};">${sys.completionRate}%</td>
        <td style="${tdStyle('center')}font-weight:600;color:${C.teal};">${sys.avgCycleHours}h</td>
      </tr>`).join('');

    const doerRows = (r.doerPerformance || []).slice(0, 15).map((d: any, i: number) => `
      <tr style="background:${i % 2 === 0 ? C.white : C.bg};">
        <td style="${tdStyle()}font-weight:600;color:${C.darkSlate};">${d.doerEmail}</td>
        <td style="${tdStyle('center')}">${d.totalTasks}</td>
        <td style="${tdStyle('center')}color:${C.emerald};font-weight:600;">${d.completedTasks}</td>
        <td style="${tdStyle('center')}"><div style="display:flex;align-items:center;gap:6px;justify-content:center;">
          <span style="font-weight:700;color:${(d.onTimeRate||0) >= 80 ? C.emerald : (d.onTimeRate||0) >= 50 ? C.amber : C.red};">${d.onTimeRate}%</span>
          <div style="width:40px;">${miniBar(d.onTimeRate || 0, (d.onTimeRate||0) >= 80 ? C.emerald : (d.onTimeRate||0) >= 50 ? C.amber : C.red, 4)}</div>
        </div></td>
        <td style="${tdStyle('center')}color:${C.teal};">${d.avgCompletionDays?.toFixed(1) || '-'}d</td>
      </tr>`).join('');

    // Format AI analysis
    const formatAI = (text: string) => {
      if (!text) return '';
      return text
        .replace(/### (.*)/g, `<h4 style="color:${C.navy};margin:16px 0 6px;font-size:13px;font-weight:700;">$1</h4>`)
        .replace(/## (.*)/g, `<h3 style="color:${C.navy};margin:20px 0 8px;font-size:14px;font-weight:700;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">$1</h3>`)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.+)/gm, `<div style="margin:3px 0;padding:4px 0 4px 14px;border-left:2px solid ${C.accent}40;font-size:12px;color:${C.charcoal};">$1</div>`)
        .replace(/^(\d+)\. (.+)/gm, `<div style="margin:4px 0;padding:4px 0;font-size:12px;color:${C.charcoal};"><span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${C.accent};color:white;text-align:center;line-height:20px;font-size:10px;font-weight:700;margin-right:8px;">$1</span>$2</div>`)
        .replace(/\n\n/g, '<br/>').replace(/\n/g, '<br/>');
    };

    const copyrightYear = new Date().getFullYear();
    const copyrightLine = `\u00A9 ${copyrightYear} Process Sutra. All rights reserved. Patented.`;
    const copyrightFull = `\u00A9 ${copyrightYear} Process Sutra \u2014 "Voice of Business" Operations Intelligence Report Engine v3.0. All rights reserved. This report format, methodology, scoring matrix, health grading algorithm, risk analysis framework, and process maturity model are proprietary and protected under applicable intellectual property laws. Patented. Unauthorized reproduction, distribution, or reverse-engineering of this report or its underlying algorithms is strictly prohibited.`;

    // ═══════════════════════════════════════════════════════════════
    //  PREMIUM REPORT HTML
    // ═══════════════════════════════════════════════════════════════
    return `<div style="font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${C.darkSlate};background:${C.white};padding:0;max-width:1050px;line-height:1.6;">

  <!-- ╔══ COVER HEADER ══╗ -->
  <div style="background:linear-gradient(135deg,${C.navy} 0%,#1E3A5F 60%,${C.indigo} 100%);padding:36px 44px 32px;border-radius:0 0 12px 12px;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;">
      <div>
        <div style="font-size:10px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:3px;font-weight:500;margin-bottom:8px;">Confidential &bull; Proprietary &bull; Patented</div>
        <h1 style="font-size:32px;font-weight:800;color:white;letter-spacing:-0.5px;margin:0;line-height:1.15;">Voice of Business&trade;</h1>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:6px;">Operations Intelligence Report &mdash; v3.0</div>
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
          <span style="display:inline-block;padding:4px 12px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.15);border-radius:20px;font-size:11px;color:rgba(255,255,255,0.85);font-weight:500;">${r.organization.name}</span>
          ${r.organization.industry ? `<span style="display:inline-block;padding:4px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:20px;font-size:11px;color:rgba(255,255,255,0.65);">${r.organization.industry}</span>` : ''}
          ${r.organization.businessType ? `<span style="display:inline-block;padding:4px 12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:20px;font-size:11px;color:rgba(255,255,255,0.65);">${r.organization.businessType}</span>` : ''}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Report Date</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.9);font-weight:600;">${genDate}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;">${genTime} IST</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:8px;">Analysis: ${s.dataSpanDays} days &bull; ${s.totalTasks} tasks</div>
        <div style="margin-top:10px;padding:6px 14px;background:${hs.color};border-radius:6px;display:inline-block;">
          <span style="font-size:18px;font-weight:900;color:white;">${hs.grade}</span>
          <span style="font-size:10px;color:rgba(255,255,255,0.85);margin-left:6px;">${hs.label}</span>
        </div>
      </div>
    </div>
  </div>

  <div style="padding:32px 44px;">

  <!-- ╔══ 1. EXECUTIVE DASHBOARD ══╗ -->
  <div style="margin-bottom:36px;">
    ${sectionHeader(1, 'Executive Dashboard', C.navy)}
    
    <!-- Health Score + KPI Gauges -->
    <div style="display:flex;gap:16px;align-items:stretch;margin-bottom:20px;">
      <!-- Health Score -->
      <div style="flex:0 0 170px;padding:20px 16px;background:linear-gradient(135deg,${hs.color}08,${hs.color}15);border:1.5px solid ${hs.color}30;border-radius:10px;text-align:center;">
        ${gaugeChart(hs.composite, 100, 'Health Score', hs.color, `/ 100`, 150)}
        <div style="margin-top:6px;padding:4px 10px;background:${hs.color};border-radius:12px;display:inline-block;">
          <span style="font-size:11px;font-weight:700;color:white;">${hs.grade} — ${hs.label}</span>
        </div>
      </div>
      <!-- KPI Donuts -->
      <div style="flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
        <div style="padding:14px 8px;background:${C.bg};border:1px solid #E2E8F0;border-radius:8px;">
          ${donutChart(s.completionRate, 'Completion', s.completionRate >= 80 ? C.emerald : s.completionRate >= 50 ? C.amber : C.red)}
          <div style="text-align:center;margin-top:4px;">${deltaArrow(trend.completionRateDelta)}</div>
        </div>
        <div style="padding:14px 8px;background:${C.bg};border:1px solid #E2E8F0;border-radius:8px;">
          ${donutChart(s.onTimeRate, 'On-Time', s.onTimeRate >= 80 ? C.emerald : s.onTimeRate >= 50 ? C.amber : C.red)}
          <div style="text-align:center;margin-top:4px;">${deltaArrow(trend.onTimeRateDelta)}</div>
        </div>
        <div style="padding:14px 8px;background:${C.bg};border:1px solid #E2E8F0;border-radius:8px;">
          ${donutChart(s.productivity, 'Productivity', s.productivity >= 80 ? C.emerald : s.productivity >= 50 ? C.amber : C.red)}
        </div>
        <div style="padding:14px 8px;background:${C.bg};border:1px solid #E2E8F0;border-radius:8px;">
          ${donutChart(s.efficiencyIndex || 0, 'Efficiency', (s.efficiencyIndex||0) >= 80 ? C.emerald : (s.efficiencyIndex||0) >= 50 ? C.amber : C.red)}
        </div>
      </div>
    </div>

    <!-- Quick Stats Row -->
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;">
      ${metricCard(s.totalTasks, 'Total Tasks', C.blue, '#EFF6FF')}
      ${metricCard(s.completedTasks, 'Completed', C.emerald, '#ECFDF5')}
      ${metricCard(s.overdueTasks, 'Overdue', s.overdueTasks > 0 ? C.red : C.emerald, s.overdueTasks > 0 ? '#FEF2F2' : '#ECFDF5')}
      ${metricCard(s.throughputPerDay, 'Tasks/Day', C.teal, '#F0FDFA')}
      ${metricCard(s.avgCycleTimeDays + 'd', 'Avg Cycle', C.indigo, '#EEF2FF')}
      ${metricCard(s.avgFlowCompletionDays + 'd', 'Avg Flow', C.violet, '#F5F3FF')}
    </div>

    <!-- Business Status Banner -->
    <div style="margin-top:16px;padding:16px 20px;background:linear-gradient(135deg,${C.bg},#EEF2FF);border:1px solid #E2E8F0;border-radius:8px;display:flex;align-items:center;gap:16px;">
      <span style="font-size:32px;">${s.businessEmoji}</span>
      <div style="flex:1;">
        <div style="font-size:18px;font-weight:800;color:${s.completionRate >= 80 && s.onTimeRate >= 80 ? C.emerald : s.completionRate >= 50 ? C.amber : C.red};letter-spacing:-0.3px;">${s.businessStatus}</div>
        <div style="font-size:12px;color:${C.charcoal};margin-top:2px;">${s.actionPlan}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:9px;color:${C.lightSlate};text-transform:uppercase;letter-spacing:0.5px;">Process Maturity</div>
        <div style="font-size:22px;font-weight:800;color:${C.indigo};">${pm.score}<span style="font-size:12px;color:${C.lightSlate};">/${pm.maxScore}</span></div>
        <div style="font-size:10px;color:${C.slate};font-weight:600;">${pm.label}</div>
      </div>
    </div>
  </div>

  <!-- ╔══ 2. EXECUTIVE SUMMARY ══╗ -->
  <div style="margin-bottom:36px;">
    ${sectionHeader(2, 'Executive Summary', C.blue)}
    <div style="font-size:13px;color:${C.charcoal};line-height:1.75;column-count:2;column-gap:32px;">
      <p style="margin:0 0 10px;">
        Over the past <strong>${s.dataSpanDays} days</strong>, <strong>${r.organization.name}</strong> processed <strong>${s.totalTasks} tasks</strong> across <strong>${r.totalSystems} workflow systems</strong> with <strong>${r.totalFlowRules} configured flow rules</strong>.
        Of these, <strong>${s.completedTasks} tasks were completed</strong> achieving a <strong>${s.completionRate}% completion rate</strong> with <strong>${s.onTimeRate}% on-time delivery</strong>.
      </p>
      <p style="margin:0 0 10px;">
        The organization's Operations Health Score stands at <strong style="color:${hs.color};">${hs.composite}/100 (Grade ${hs.grade})</strong>, classified as <strong>${hs.label}</strong>.
        ${trend.isImproving ? `Performance is <strong style="color:${C.emerald};">trending upward</strong> with completion rates improving by ${trend.completionRateDelta}% compared to the prior period.` : `Performance has <strong style="color:${C.red};">declined</strong> from the prior period — completion rate dropped by ${Math.abs(trend.completionRateDelta)}%.`}
      </p>
      <p style="margin:0 0 10px;">
        ${s.overdueTasks > 0 ? `There are currently <strong style="color:${C.red};">${s.overdueTasks} overdue tasks</strong> requiring immediate attention, contributing to an estimated delay loss of <strong>&#8377;${r.lossCost.totalLossCost.toLocaleString('en-IN')}</strong>.` : 'All active tasks are within their deadlines — zero overdue items detected.'}
        The team of <strong>${cap.totalTeamMembers} members</strong> maintains an average throughput of <strong>${s.throughputPerDay} tasks/day</strong> with a median cycle time of <strong>${s.medianCycleTimeHours || s.avgCycleTimeHours}h</strong> (P90: ${s.p90CycleTimeHours || '-'}h).
      </p>
      <p style="margin:0;">
        Process maturity is rated at <strong>${pm.score}/${pm.maxScore}</strong> (${pm.label} level).
        ${r.lossCost.projectedMonthlyLoss > 0 ? `At current delay rates, projected monthly loss is <strong style="color:${C.red};">&#8377;${r.lossCost.projectedMonthlyLoss.toLocaleString('en-IN')}</strong> and annual projected loss is <strong style="color:${C.red};">&#8377;${r.lossCost.projectedAnnualLoss.toLocaleString('en-IN')}</strong>.` : 'No significant delay losses detected.'}
      </p>
    </div>
  </div>

  <!-- ╔══ 3. TREND ANALYSIS ══╗ -->
  <div style="margin-bottom:36px;">
    ${sectionHeader(3, 'Trend Analysis — Period-over-Period', C.teal)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
      <!-- Completion Trend -->
      <div style="padding:18px;background:${C.bg};border:1px solid #E2E8F0;border-radius:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-size:12px;font-weight:700;color:${C.darkSlate};">Weekly Completions</div>
          ${deltaArrow(trend.completionRateDelta)}
        </div>
        ${areaSparkline(weeklyTrendData, C.blue, 400, 60)}
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:${C.lightSlate};">
          ${(r.weeklyTrend || []).map((w: any) => `<span>${w.weekLabel}</span>`).join('')}
        </div>
      </div>
      <!-- On-Time Rate Trend -->
      <div style="padding:18px;background:${C.bg};border:1px solid #E2E8F0;border-radius:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="font-size:12px;font-weight:700;color:${C.darkSlate};">Weekly On-Time Rate</div>
          ${deltaArrow(trend.onTimeRateDelta)}
        </div>
        ${areaSparkline(weeklyOnTimeData, C.emerald, 400, 60)}
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:${C.lightSlate};">
          ${(r.weeklyTrend || []).map((w: any) => `<span>${w.weekLabel}</span>`).join('')}
        </div>
      </div>
    </div>
    <!-- Trend Comparison Cards -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
      <div style="padding:14px;background:${C.bg};border:1px solid #E2E8F0;border-radius:8px;text-align:center;">
        <div style="font-size:9px;color:${C.lightSlate};text-transform:uppercase;letter-spacing:0.5px;">Prior Period Tasks</div>
        <div style="font-size:20px;font-weight:700;color:${C.charcoal};">${trend.previousPeriod?.tasks || 0}</div>
      </div>
      <div style="padding:14px;background:${C.bg};border:1px solid #E2E8F0;border-radius:8px;text-align:center;">
        <div style="font-size:9px;color:${C.lightSlate};text-transform:uppercase;letter-spacing:0.5px;">Current Period Tasks</div>
        <div style="font-size:20px;font-weight:700;color:${C.blue};">${trend.currentPeriod?.tasks || 0}</div>
      </div>
      <div style="padding:14px;background:${C.bg};border:1px solid #E2E8F0;border-radius:8px;text-align:center;">
        <div style="font-size:9px;color:${C.lightSlate};text-transform:uppercase;letter-spacing:0.5px;">Volume Change</div>
        <div style="font-size:20px;font-weight:700;">${deltaArrow(trend.volumeDelta, '')}</div>
      </div>
      <div style="padding:14px;background:${trend.isImproving ? '#ECFDF5' : '#FEF2F2'};border:1px solid ${trend.isImproving ? C.emerald : C.red}20;border-radius:8px;text-align:center;">
        <div style="font-size:9px;color:${C.lightSlate};text-transform:uppercase;letter-spacing:0.5px;">Overall Trend</div>
        <div style="font-size:16px;font-weight:800;color:${trend.isImproving ? C.emerald : C.red};">${trend.isImproving ? '&#9650; Improving' : '&#9660; Declining'}</div>
      </div>
    </div>
  </div>

  <!-- ╔══ 4. RISK MATRIX ══╗ -->
  <div style="margin-bottom:36px;">
    ${sectionHeader(4, 'Risk Assessment Matrix', C.red)}
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="background:#FFF7ED;">
        <th style="${thStyle()}">Risk</th>
        <th style="${thStyle('center')}width:80px;">Severity</th>
        <th style="${thStyle()}">Impact</th>
        <th style="${thStyle()}">Recommended Mitigation</th>
      </tr></thead>
      <tbody>${(r.riskMatrix || []).map((ri: any) => `
        <tr>
          <td style="${tdStyle()}font-weight:700;color:${ri.color};">${ri.risk}</td>
          <td style="${tdStyle('center')}"><span style="display:inline-block;padding:2px 10px;border-radius:12px;background:${ri.color}15;color:${ri.color};font-weight:700;font-size:10px;">${ri.severity}</span></td>
          <td style="${tdStyle()}color:${C.charcoal};">${ri.impact}</td>
          <td style="${tdStyle()}color:${C.slate};font-style:italic;">${ri.mitigation}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- ╔══ 5. TASK DISTRIBUTION & LOSS COST ══╗ -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:36px;">
    <!-- Task Distribution -->
    <div>
      ${sectionHeader(5, 'Task Distribution', C.blue)}
      ${pieChart([
        {label: 'Completed', value: s.completedTasks, color: C.emerald},
        {label: 'In Progress', value: s.inProgressTasks || 0, color: C.blue},
        {label: 'Pending', value: s.pendingTasks - (s.inProgressTasks || 0), color: C.amber},
        {label: 'Overdue', value: s.overdueTasks, color: C.red},
        {label: 'Cancelled', value: s.cancelledTasks || 0, color: C.lightSlate},
      ])}
    </div>
    <!-- Loss Cost -->
    <div>
      ${sectionHeader(6, 'Financial Impact Analysis', C.red)}
      <div style="padding:18px;background:linear-gradient(135deg,#FEF2F2,#FFF7ED);border:1px solid #FECACA;border-radius:8px;margin-bottom:12px;">
        <div style="font-size:10px;color:${C.red};text-transform:uppercase;letter-spacing:1px;font-weight:700;">Estimated Loss from Delays</div>
        <div style="font-size:32px;font-weight:900;color:${C.red};margin:4px 0;">&#8377;${r.lossCost.totalLossCost.toLocaleString('en-IN')}</div>
        <div style="font-size:11px;color:${C.charcoal};">${r.lossCost.totalWaitHours}h total delay &times; &#8377;${r.lossCost.costPerHour}/hr</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="padding:12px;background:${C.bg};border:1px solid #E2E8F0;border-radius:6px;text-align:center;">
          <div style="font-size:18px;font-weight:800;color:${C.amber};">&#8377;${(r.lossCost.projectedMonthlyLoss || 0).toLocaleString('en-IN')}</div>
          <div style="font-size:9px;color:${C.slate};text-transform:uppercase;">Monthly Projection</div>
        </div>
        <div style="padding:12px;background:${C.bg};border:1px solid #E2E8F0;border-radius:6px;text-align:center;">
          <div style="font-size:18px;font-weight:800;color:${C.red};">&#8377;${(r.lossCost.projectedAnnualLoss || 0).toLocaleString('en-IN')}</div>
          <div style="font-size:9px;color:${C.slate};text-transform:uppercase;">Annual Projection</div>
        </div>
      </div>
      <div style="margin-top:10px;font-size:11px;color:${C.slate};padding:8px 10px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:6px;">
        Reducing bottleneck cycle times by 20% could recover approx. <strong>&#8377;${Math.round(r.lossCost.totalLossCost * 0.2).toLocaleString('en-IN')}</strong> in productivity value.
      </div>
    </div>
  </div>

  <!-- ╔══ 7. ACTUAL vs IDEAL ══╗ -->
  <div style="margin-bottom:36px;">
    ${sectionHeader(7, 'Actual vs Ideal Performance (100% Benchmark)', C.indigo)}
    ${(() => {
      const ic = r.idealComparison || { actual: {}, ideal: {}, gap: {} };
      const a = ic.actual || {};
      const g = ic.gap || {};
      const rows = [
        { metric: 'Completion Rate', actual: a.completionRate + '%', ideal: '100%', gap: g.completionRate + '%', gapColor: g.completionRate > 20 ? C.red : g.completionRate > 10 ? C.amber : C.emerald, bar: a.completionRate },
        { metric: 'On-Time Rate', actual: a.onTimeRate + '%', ideal: '100%', gap: g.onTimeRate + '%', gapColor: g.onTimeRate > 20 ? C.red : g.onTimeRate > 10 ? C.amber : C.emerald, bar: a.onTimeRate },
        { metric: 'Productivity', actual: a.productivity + '%', ideal: '100%', gap: g.productivity + '%', gapColor: g.productivity > 20 ? C.red : g.productivity > 10 ? C.amber : C.emerald, bar: a.productivity },
        { metric: 'Performance', actual: a.performance + '%', ideal: '100%', gap: g.performance + '%', gapColor: g.performance > 20 ? C.red : g.performance > 10 ? C.amber : C.emerald, bar: a.performance },
        { metric: 'Throughput / Day', actual: String(a.throughputPerDay), ideal: String(ic.ideal?.throughputPerDay || 0), gap: '+' + (g.throughputPerDayGap || 0) + ' needed', gapColor: C.amber, bar: 0 },
        { metric: 'Overdue Tasks', actual: String(a.overdueTasks), ideal: '0', gap: g.overdueToResolve + ' to resolve', gapColor: g.overdueToResolve > 0 ? C.red : C.emerald, bar: 0 },
        { metric: 'Loss Cost', actual: '\u20B9' + (a.lossCost || 0).toLocaleString('en-IN'), ideal: '\u20B90', gap: '\u20B9' + (g.lossCostRecoverable || 0).toLocaleString('en-IN') + ' recoverable', gapColor: g.lossCostRecoverable > 0 ? C.red : C.emerald, bar: 0 },
      ];
      return '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
        `<thead><tr style="background:linear-gradient(135deg,#EEF2FF,#E0E7FF);">` +
        `<th style="${thStyle()}">Metric</th>` +
        `<th style="${thStyle('center')}">Actual</th>` +
        `<th style="${thStyle('center')}width:120px;">Progress</th>` +
        `<th style="${thStyle('center')}">Ideal</th>` +
        `<th style="${thStyle('center')}">Gap</th>` +
        `</tr></thead><tbody>` +
        rows.map(row =>
          `<tr>` +
          `<td style="${tdStyle()}font-weight:600;color:${C.darkSlate};">${row.metric}</td>` +
          `<td style="${tdStyle('center')}font-weight:700;color:${C.blue};">${row.actual}</td>` +
          `<td style="${tdStyle('center')}">${row.bar > 0 ? miniBar(row.bar, row.gapColor, 6) : ''}</td>` +
          `<td style="${tdStyle('center')}font-weight:700;color:${C.emerald};">${row.ideal}</td>` +
          `<td style="${tdStyle('center')}font-weight:700;color:${row.gapColor};">${row.gap}</td>` +
          `</tr>`
        ).join('') +
        '</tbody></table>';
    })()}
    <div style="margin-top:14px;padding:12px 16px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:6px;">
      <div style="font-size:10px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Recovery Potential at 100% Efficiency</div>
      <div style="font-size:12px;color:#78350F;">If all tasks were completed on time, the organization could recover <strong>&#8377;${(r.idealComparison?.gap?.lossCostRecoverable || 0).toLocaleString('en-IN')}</strong> in loss costs, improve throughput by <strong>${r.idealComparison?.gap?.throughputPerDayGap || 0} tasks/day</strong>, and eliminate <strong>${r.idealComparison?.gap?.overdueToResolve || 0} overdue tasks</strong>.</div>
    </div>
  </div>

  <!-- ╔══ 8. BOTTLENECK ANALYSIS ══╗ -->
  <div style="margin-bottom:36px;">
    ${sectionHeader(8, 'Bottleneck Analysis', C.amber)}
    <p style="font-size:12px;color:${C.charcoal};margin:0 0 12px;">Tasks ranked by average cycle time (hours). High cycle time indicates process bottlenecks requiring review. P90 cycle time across all tasks: <strong>${s.p90CycleTimeHours || '-'}h</strong>.</p>
    ${vBarChart(bottleneckItems.map((b: any) => ({...b, value: b.value})), 160)}
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:12px;">
      <thead><tr style="background:${C.bg};">
        <th style="${thStyle()}">Task Type</th>
        <th style="${thStyle('center')}">Instances</th>
        <th style="${thStyle('center')}">Avg Cycle</th>
        <th style="${thStyle('center')}">Overdue</th>
        <th style="${thStyle('center')}">Pending</th>
        <th style="${thStyle('center')}">Completion</th>
      </tr></thead>
      <tbody>${(r.bottlenecks || []).slice(0, 10).map((b: any) => `
        <tr>
          <td style="${tdStyle()}font-weight:600;color:${C.darkSlate};">${b.taskName}</td>
          <td style="${tdStyle('center')}">${b.totalInstances}</td>
          <td style="${tdStyle('center')}font-weight:700;color:${b.avgCycleHours > 48 ? C.red : b.avgCycleHours > 24 ? C.amber : C.emerald};">${b.avgCycleHours}h</td>
          <td style="${tdStyle('center')}color:${b.overdueCount > 0 ? C.red : C.slate};">${b.overdueCount}</td>
          <td style="${tdStyle('center')}">${b.pendingCount}</td>
          <td style="${tdStyle('center')}font-weight:700;color:${b.completionRate >= 80 ? C.emerald : b.completionRate >= 50 ? C.amber : C.red};">${b.completionRate}%</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- ╔══ 9. FLOW & SYSTEM PERFORMANCE ══╗ -->
  <div style="margin-bottom:36px;">
    ${sectionHeader(9, 'Workflow System Performance', C.blue)}
    <div style="margin-bottom:16px;">${vBarChart(systemChartItems, 150)}</div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead><tr style="background:${C.bg};">
        <th style="${thStyle()}">System</th>
        <th style="${thStyle('center')}">Total</th>
        <th style="${thStyle('center')}">Done</th>
        <th style="${thStyle('center')}">Pending</th>
        <th style="${thStyle('center')}">Overdue</th>
        <th style="${thStyle('center')}">Rate</th>
        <th style="${thStyle('center')}">Avg Cycle</th>
      </tr></thead>
      <tbody>${systemRows || `<tr><td colspan="7" style="text-align:center;padding:20px;color:${C.lightSlate};">No data</td></tr>`}</tbody>
    </table>
  </div>

  <!-- ╔══ 10. FLOW COMPLETION TIME ══╗ -->
  <div style="margin-bottom:36px;">
    ${sectionHeader(10, 'Flow Average Completion Time', C.teal)}
    <p style="font-size:12px;color:${C.charcoal};margin:0 0 10px;">Average completion time (days) per workflow. Overall average: <strong>${s.avgFlowCompletionDays || 0} days</strong>.</p>
    ${vBarChart(flowCompletionItems, 140)}
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:12px;">
      <thead><tr style="background:#F0FDFA;">
        <th style="${thStyle()}">Flow / System</th>
        <th style="${thStyle('center')}">Avg Completion (days)</th>
        <th style="${thStyle('center')}">On-Time Rate</th>
      </tr></thead>
      <tbody>${(r.flowPerformance || []).map((f: any) => `
        <tr>
          <td style="${tdStyle()}font-weight:600;color:${C.darkSlate};">${f.system}</td>
          <td style="${tdStyle('center')}font-weight:700;color:${C.teal};">${Math.abs(f.avgCompletionTime || 0).toFixed(1)}</td>
          <td style="${tdStyle('center')}"><div style="display:flex;align-items:center;gap:6px;justify-content:center;">
            <span style="font-weight:700;color:${(f.onTimeRate||0) >= 80 ? C.emerald : (f.onTimeRate||0) >= 50 ? C.amber : C.red};">${f.onTimeRate || 0}%</span>
            <div style="width:50px;">${miniBar(f.onTimeRate || 0, (f.onTimeRate||0) >= 80 ? C.emerald : (f.onTimeRate||0) >= 50 ? C.amber : C.red, 4)}</div>
          </div></td>
        </tr>`).join('') || `<tr><td colspan="3" style="text-align:center;padding:20px;color:${C.lightSlate};">No flow data</td></tr>`}</tbody>
    </table>
  </div>

  <!-- ╔══ 11. TEAM PERFORMANCE ══╗ -->
  <div style="margin-bottom:36px;">
    ${sectionHeader(11, 'Team Performance Intelligence', C.violet)}
    
    <!-- Team Distribution -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
      <div style="padding:12px;background:#ECFDF5;border:1px solid ${C.emerald}20;border-radius:8px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:${C.emerald};">${pd.excellent}</div>
        <div style="font-size:9px;color:${C.slate};text-transform:uppercase;">Excellent (≥80%)</div>
      </div>
      <div style="padding:12px;background:#FFFBEB;border:1px solid ${C.amber}20;border-radius:8px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:${C.amber};">${pd.good}</div>
        <div style="font-size:9px;color:${C.slate};text-transform:uppercase;">Good (60-79%)</div>
      </div>
      <div style="padding:12px;background:#FFF7ED;border:1px solid #FB923C20;border-radius:8px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:#EA580C;">${pd.average}</div>
        <div style="font-size:9px;color:${C.slate};text-transform:uppercase;">Average (40-59%)</div>
      </div>
      <div style="padding:12px;background:#FEF2F2;border:1px solid ${C.red}20;border-radius:8px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:${C.red};">${pd.poor}</div>
        <div style="font-size:9px;color:${C.slate};text-transform:uppercase;">Needs Attention (<40%)</div>
      </div>
    </div>

    <!-- Doer Chart -->
    <div style="margin-bottom:16px;">${vBarChart(doerChartItems, 130)}</div>

    <!-- Doer Table -->
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead><tr style="background:${C.bg};">
        <th style="${thStyle()}">Team Member</th>
        <th style="${thStyle('center')}">Tasks</th>
        <th style="${thStyle('center')}">Completed</th>
        <th style="${thStyle('center')}">On-Time Rate</th>
        <th style="${thStyle('center')}">Avg Time</th>
      </tr></thead>
      <tbody>${doerRows || `<tr><td colspan="5" style="text-align:center;padding:20px;color:${C.lightSlate};">No team data</td></tr>`}</tbody>
    </table>
  </div>

  <!-- ╔══ 12. TOP & BOTTOM PERFORMERS ══╗ -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:36px;">
    <div style="border:1.5px solid ${C.emerald}30;border-radius:10px;padding:18px;background:#F0FDF4;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:${C.emerald};display:flex;align-items:center;justify-content:center;font-size:12px;color:white;">&#9733;</div>
        <h3 style="font-size:13px;color:#065F46;margin:0;font-weight:700;">Top Performers</h3>
      </div>
      ${(r.topPerformers || []).length > 0 ? (r.topPerformers || []).map((d: any, i: number) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;${i > 0 ? 'border-top:1px solid #D1FAE5;' : ''}">
          <span style="font-size:12px;color:#065F46;font-weight:500;">${i === 0 ? '&#127942; ' : ''}${d.doerEmail}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:40px;">${miniBar(d.onTimeRate, C.emerald, 4)}</div>
            <span style="font-size:12px;font-weight:700;color:${C.emerald};width:36px;text-align:right;">${d.onTimeRate}%</span>
          </div>
        </div>`).join('') : `<div style="font-size:12px;color:${C.lightSlate};text-align:center;padding:10px;">No data</div>`}
    </div>
    <div style="border:1.5px solid ${C.red}30;border-radius:10px;padding:18px;background:#FEF2F2;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:${C.red};display:flex;align-items:center;justify-content:center;font-size:12px;color:white;">!</div>
        <h3 style="font-size:13px;color:#991B1B;margin:0;font-weight:700;">Needs Attention</h3>
      </div>
      ${(r.needsAttention || []).length > 0 ? (r.needsAttention || []).map((d: any, i: number) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;${i > 0 ? 'border-top:1px solid #FECACA;' : ''}">
          <span style="font-size:12px;color:#991B1B;font-weight:500;">${d.doerEmail}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:40px;">${miniBar(d.onTimeRate, C.red, 4)}</div>
            <span style="font-size:12px;font-weight:700;color:${C.red};width:36px;text-align:right;">${d.onTimeRate}%</span>
          </div>
        </div>`).join('') : `<div style="font-size:12px;color:${C.lightSlate};text-align:center;padding:10px;">No data</div>`}
    </div>
  </div>

  <!-- ╔══ 13. CAPACITY & UTILIZATION ══╗ -->
  <div style="margin-bottom:36px;">
    ${sectionHeader(13, 'Capacity & Utilization', C.indigo)}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
      ${metricCard(cap.totalTeamMembers, 'Team Members', C.indigo, '#EEF2FF', '&#128101;')}
      ${metricCard(cap.tasksPerPerson, 'Tasks / Person', C.blue, '#EFF6FF', '&#128203;')}
      ${metricCard(cap.completedPerPerson, 'Done / Person', C.emerald, '#ECFDF5', '&#9989;')}
      <div style="padding:16px;background:${C.bg};border:1px solid ${C.indigo}20;border-radius:8px;text-align:center;">
        <div style="font-size:18px;margin-bottom:4px;">&#9881;</div>
        <div style="font-size:20px;font-weight:800;color:${C.indigo};">${cap.overallUtilization}%</div>
        <div style="font-size:9px;color:${C.slate};text-transform:uppercase;letter-spacing:0.8px;margin-top:4px;">Utilization</div>
        <div style="margin-top:6px;">${miniBar(cap.overallUtilization, C.indigo)}</div>
      </div>
    </div>
  </div>

  ${r.aiAnalysis ? `
  <!-- ╔══ 14. AI STRATEGIC ANALYSIS ══╗ -->
  <div style="margin-bottom:36px;border:1.5px solid ${C.accent}30;border-radius:10px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#EEF2FF,#E0E7FF);padding:16px 22px;border-bottom:1px solid ${C.accent}20;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:28px;height:28px;border-radius:6px;background:${C.accent};display:flex;align-items:center;justify-content:center;font-size:14px;color:white;">&#9733;</div>
        <div>
          <h2 style="font-size:15px;color:${C.navy};margin:0;font-weight:700;">AI-Powered Strategic Analysis</h2>
          <div style="font-size:10px;color:${C.accent};margin-top:1px;">Generated by artificial intelligence based on aggregated workflow data</div>
        </div>
      </div>
    </div>
    <div style="padding:20px 24px;font-size:12px;color:${C.charcoal};line-height:1.75;">${formatAI(r.aiAnalysis)}</div>
  </div>` : ''}

  <!-- ╔══ HEALTH SCORE BREAKDOWN ══╗ -->
  <div style="margin-bottom:28px;padding:16px 20px;background:linear-gradient(135deg,${C.bg},#EEF2FF);border:1px solid #E2E8F0;border-radius:8px;">
    <div style="font-size:10px;font-weight:700;color:${C.slate};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Health Score Composition (${hs.composite}/100)</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      <span style="font-size:11px;color:${C.charcoal};">Completion: <strong>${hs.breakdown?.completionComponent || 0}</strong>/30</span>
      <span style="font-size:11px;color:${C.charcoal};">On-Time: <strong>${hs.breakdown?.onTimeComponent || 0}</strong>/30</span>
      <span style="font-size:11px;color:${C.charcoal};">Efficiency: <strong>+${hs.breakdown?.efficiencyBonus || 0}</strong></span>
      <span style="font-size:11px;color:${C.charcoal};">Bottleneck Penalty: <strong style="color:${C.red};">-${hs.breakdown?.bottleneckPenalty || 0}</strong></span>
      <span style="font-size:11px;color:${C.charcoal};">Trend: <strong style="color:${(hs.breakdown?.trendBonus || 0) >= 0 ? C.emerald : C.red};">${(hs.breakdown?.trendBonus || 0) >= 0 ? '+' : ''}${hs.breakdown?.trendBonus || 0}</strong></span>
    </div>
  </div>

  <!-- ╔══ COPYRIGHT & PATENT ══╗ -->
  <div style="padding:14px 18px;background:${C.bg};border:1px solid #E2E8F0;border-radius:6px;margin-bottom:16px;">
    <div style="font-size:9px;color:${C.lightSlate};line-height:1.6;">${copyrightFull}</div>
  </div>

  <!-- ╔══ FOOTER ══╗ -->
  <div style="border-top:2px solid ${C.navy};padding-top:14px;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <div style="font-size:10px;color:${C.lightSlate};text-transform:uppercase;letter-spacing:1px;font-weight:600;">Generated by Process Sutra &mdash; Voice of Business&trade; v3.0</div>
      <div style="font-size:10px;color:${C.lightSlate};margin-top:3px;">${r.totalSystems} systems &bull; ${r.totalFlowRules} flow rules &bull; ${cap.totalTeamMembers} team members &bull; TAT: ${r.tatConfig.officeHours} (${r.tatConfig.timezone})${r.tatConfig.skipWeekends ? ' &bull; Weekends excluded' : ''}</div>
    </div>
    <div style="font-size:9px;color:${C.lightSlate};font-style:italic;text-align:right;">${copyrightLine}</div>
  </div>

  </div>
</div>`;
  };

  // Export weekly scoring data
  const exportWeeklyScoring = () => {
    if (!weeklyScoring) return;
    exportToCSV(
      weeklyScoring,
      'weekly-scoring',
      ['weekStart', 'weekEnd', 'totalTasks', 'completedTasks', 'onTimeRate', 'avgCompletionDays']
    );
  };

  const taskDistributionData = [
    { name: 'Completed', value: metrics?.completedTasks || 0, color: '#10B981' },
    { name: 'In Progress', value: Math.floor((metrics?.totalTasks || 0) * 0.3), color: '#3B82F6' },
    { name: 'Pending', value: Math.floor((metrics?.totalTasks || 0) * 0.4), color: '#F59E0B' },
    { name: 'Overdue', value: metrics?.overdueTasks || 0, color: '#EF4444' },
  ];

  // Business Health Status Matrix — determines status based on completion rate & on-time rate
  const getBusinessHealthStatus = (completionRate: number, onTimeRate: number, isAdmin: boolean) => {
    if (isAdmin) {
      // Organization-level (Admin) matrix
      if (completionRate >= 80 && onTimeRate >= 80) return {
        emoji: '🚀', status: 'Growth Ready',
        meaning: 'Team is completing work AND delivering on time — operating at peak efficiency.',
        action: 'Pursue aggressive growth, acquire new business, increase marketing spend, invest in automation.',
        color: 'from-emerald-500 to-green-500', bg: 'from-emerald-50 to-green-50', border: 'border-emerald-200', text: 'text-emerald-800'
      };
      if (completionRate >= 80 && onTimeRate < 70) return {
        emoji: '⚠️', status: 'Overloaded System',
        meaning: 'Work is getting done but with delays — the team is carrying too much load.',
        action: 'Hire additional staff, rebalance workload across team, review and adjust TAT targets.',
        color: 'from-amber-500 to-orange-500', bg: 'from-amber-50 to-orange-50', border: 'border-amber-200', text: 'text-amber-800'
      };
      if (completionRate >= 50 && completionRate < 80 && onTimeRate >= 80) return {
        emoji: '📉', status: 'Underutilized Capacity',
        meaning: 'Team can deliver on time but not enough tasks are being completed — capacity is being wasted.',
        action: 'Bring in more work, boost sales pipeline, audit task flow for bottlenecks.',
        color: 'from-blue-500 to-indigo-500', bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200', text: 'text-blue-800'
      };
      if (completionRate >= 50 && completionRate < 80 && onTimeRate >= 50 && onTimeRate < 80) return {
        emoji: '😐', status: 'Stable but Slow',
        meaning: 'System is running but not at optimal speed — moderate performance across the board.',
        action: 'Improve SOPs, increase monitoring frequency, provide micro-training to team.',
        color: 'from-gray-500 to-slate-500', bg: 'from-gray-50 to-slate-50', border: 'border-gray-200', text: 'text-gray-800'
      };
      if (completionRate < 50 && onTimeRate >= 80) return {
        emoji: '🧭', status: 'Misaligned Execution',
        meaning: 'People are reporting on time but actual output is low — effort is misaligned with results.',
        action: 'Redefine KPIs, switch to output-based tracking, realign team priorities.',
        color: 'from-violet-500 to-purple-500', bg: 'from-violet-50 to-purple-50', border: 'border-violet-200', text: 'text-violet-800'
      };
      if (completionRate < 50 && onTimeRate < 50) return {
        emoji: '🔥', status: 'Critical Condition',
        meaning: 'Work is not being completed AND deadlines are being missed — urgent intervention needed.',
        action: 'Immediate system audit, assign clear accountability, enforce strict follow-ups, consider restructuring.',
        color: 'from-red-500 to-rose-500', bg: 'from-red-50 to-rose-50', border: 'border-red-200', text: 'text-red-800'
      };
      // Default fallback for edge cases (e.g., completion 80+, on-time 70-79)
      return {
        emoji: '😐', status: 'Stable but Slow',
        meaning: 'System is running but not at optimal speed — moderate performance across the board.',
        action: 'Improve SOPs, increase monitoring frequency, provide micro-training to team.',
        color: 'from-gray-500 to-slate-500', bg: 'from-gray-50 to-slate-50', border: 'border-gray-200', text: 'text-gray-800'
      };
    } else {
      // User-level (Individual) matrix
      if (completionRate >= 80 && onTimeRate >= 80) return {
        emoji: '🌟', status: 'Star Performer',
        meaning: 'You are completing tasks AND delivering on time — outstanding performance!',
        action: 'You\'re on track for rewards, incentives, and promotion. Keep up the great work!',
        color: 'from-emerald-500 to-green-500', bg: 'from-emerald-50 to-green-50', border: 'border-emerald-200', text: 'text-emerald-800'
      };
      if (completionRate >= 80 && onTimeRate < 70) return {
        emoji: '⏳', status: 'Hard Worker but Delayed',
        meaning: 'You get work done but often past deadlines — time management needs attention.',
        action: 'Focus on time management, prioritize tasks, discuss workload with your manager.',
        color: 'from-amber-500 to-orange-500', bg: 'from-amber-50 to-orange-50', border: 'border-amber-200', text: 'text-amber-800'
      };
      if (completionRate >= 50 && completionRate < 80 && onTimeRate >= 80) return {
        emoji: '⚡', status: 'Disciplined but Low Output',
        meaning: 'You deliver on time but your output volume is below potential.',
        action: 'Upgrade your skills, clarify KPIs, aim for higher targets.',
        color: 'from-blue-500 to-indigo-500', bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200', text: 'text-blue-800'
      };
      if (completionRate >= 50 && completionRate < 80 && onTimeRate >= 50 && onTimeRate < 80) return {
        emoji: '🙂', status: 'Average Performer',
        meaning: 'Neither excelling nor falling behind — consistent but has room for improvement.',
        action: 'Weekly self-monitoring, micro-training sessions, set incremental improvement goals.',
        color: 'from-gray-500 to-slate-500', bg: 'from-gray-50 to-slate-50', border: 'border-gray-200', text: 'text-gray-800'
      };
      if (completionRate < 50 && onTimeRate >= 80) return {
        emoji: '📋', status: 'Busy but Not Productive',
        meaning: 'You appear active but actual results are low — effort vs. output gap.',
        action: 'Set output-based KPIs, focus on high-impact tasks, reduce time on low-value work.',
        color: 'from-violet-500 to-purple-500', bg: 'from-violet-50 to-purple-50', border: 'border-violet-200', text: 'text-violet-800'
      };
      if (completionRate < 50 && onTimeRate < 50) return {
        emoji: '🔴', status: 'Critical Performer',
        meaning: 'Tasks are incomplete AND late — performance needs urgent improvement.',
        action: 'Performance Improvement Plan (PIP), strict weekly reviews, manager support needed.',
        color: 'from-red-500 to-rose-500', bg: 'from-red-50 to-rose-50', border: 'border-red-200', text: 'text-red-800'
      };
      // Default fallback
      return {
        emoji: '🙂', status: 'Average Performer',
        meaning: 'Neither excelling nor falling behind — consistent but has room for improvement.',
        action: 'Weekly self-monitoring, micro-training sessions, set incremental improvement goals.',
        color: 'from-gray-500 to-slate-500', bg: 'from-gray-50 to-slate-50', border: 'border-gray-200', text: 'text-gray-800'
      };
    }
  };

  // Compute current business health
  const completionRate = Math.round(((metrics?.completedTasks || 0) / (metrics?.totalTasks || 1)) * 100);
  const onTimeRate = metrics?.onTimeRate || 0;
  const isAdmin = (user as any)?.role === 'admin' || dbUser?.role === 'admin';
  const currentHealthStatus = getBusinessHealthStatus(completionRate, onTimeRate, isAdmin);

  // Helper function to get performance color
  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (rate >= 60) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  // Helper function to get performance badge
  const getPerformanceBadge = (rate: number) => {
    if (rate >= 80) return { label: 'Excellent', color: 'bg-emerald-500' };
    if (rate >= 60) return { label: 'Good', color: 'bg-amber-500' };
    return { label: 'Needs Improvement', color: 'bg-red-500' };
  };

  // Clear filters function
  const clearDoerFilters = () => {
    setDoerFilters({
      startDate: "",
      endDate: "",
      doerName: "",
      doerEmail: "",
      performanceLevel: "",
    });
  };

  // Filter doers by performance level (client-side)
  const filteredDoersPerformance = doersPerformance?.filter((doer: any) => {
    if (!doerFilters.performanceLevel) return true;
    if (doerFilters.performanceLevel === 'excellent') return doer.onTimeRate >= 80;
    if (doerFilters.performanceLevel === 'good') return doer.onTimeRate >= 60 && doer.onTimeRate < 80;
    if (doerFilters.performanceLevel === 'needs-improvement') return doer.onTimeRate < 60;
    return true;
  });

  // Compute aggregate stats for filtered doers
  const doersSummaryStats = filteredDoersPerformance?.reduce((acc: any, doer: any) => {
    return {
      totalUsers: acc.totalUsers + 1,
      totalTasks: acc.totalTasks + (doer.totalTasks || 0),
      totalCompleted: acc.totalCompleted + (doer.completedTasks || 0),
      sumOnTimeRate: acc.sumOnTimeRate + (doer.onTimeRate || 0),
    };
  }, { totalUsers: 0, totalTasks: 0, totalCompleted: 0, sumOnTimeRate: 0 }) || { totalUsers: 0, totalTasks: 0, totalCompleted: 0, sumOnTimeRate: 0 };

  if (loading || !user) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <Activity className="h-8 w-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="mt-6 text-lg font-medium text-gray-700">Loading analytics...</p>
            <p className="text-sm text-gray-500 mt-2">Preparing your insights</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header 
          title="Analytics Dashboard" 
          description="Comprehensive performance insights and metrics"
        />

        <div className="p-8 space-y-8">
          {/* Organization Incomplete Banner - Admin Only */}
          {dbUser?.role === 'admin' && isIncomplete && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 flex items-start gap-4 shadow-md">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">
                  Organization Details Incomplete
                </h3>
                <p className="text-sm text-amber-800 mb-3">
                  Please complete your organization profile to unlock all features and ensure smooth operations.
                </p>
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => setLocation('/profile')}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Complete Profile Now
                </Button>
              </div>
            </div>
          )}

          {/* Google Drive Not Connected Banner - Admin Only */}
          {dbUser?.role === 'admin' && isDriveConnected === false && (
            <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 flex items-start gap-4 shadow-md">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">
                  Google Drive Not Connected
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  Connect your Google Drive to enable file uploads in forms. Files will be stored securely in your Drive.
                </p>
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => setLocation('/profile')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Connect Now
                </Button>
              </div>
            </div>
          )}

          {/* Key Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="transform transition-all duration-300 hover:scale-105">
              <MetricCard
                title="Total Tasks"
                value={metrics?.totalTasks || 0}
                icon={<Target className="text-blue-600" />}
                trend={{ value: 15, isPositive: true }}
                description="from last month"
              />
            </div>
            <div className="transform transition-all duration-300 hover:scale-105">
              <MetricCard
                title="Completion Rate"
                value={`${Math.round(((metrics?.completedTasks || 0) / (metrics?.totalTasks || 1)) * 100)}%`}
                icon={<CheckCircle className="text-emerald-600" />}
                trend={{ value: 8, isPositive: true }}
                description="from last month"
              />
            </div>
            <div className="transform transition-all duration-300 hover:scale-105">
              <MetricCard
                title="On-Time Rate"
                value={`${metrics?.onTimeRate || 0}%`}
                icon={<Clock className="text-amber-600" />}
                trend={{ value: 3, isPositive: true }}
                description="from last month"
              />
            </div>
            <div className="transform transition-all duration-300 hover:scale-105">
              <MetricCard
                title="Avg Flow Completion"
                value={`${flowPerformance && flowPerformance.length > 0 ? (flowPerformance.reduce((sum, f) => sum + Math.abs(f.avgCompletionTime), 0) / flowPerformance.length).toFixed(1) : '0'} days`}
                icon={<Zap className="text-teal-600" />}
                trend={{ value: 0, isPositive: true }}
                description="across all flows"
              />
            </div>
          </div>

          {/* Business Health Status Card */}
          {metrics && (metrics.totalTasks > 0) && (
            <Card className={`shadow-lg border-2 ${currentHealthStatus.border} bg-gradient-to-r ${currentHealthStatus.bg} backdrop-blur-sm overflow-hidden`}>
              <div className="relative">
                {/* Decorative gradient bar */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${currentHealthStatus.color}`} />
                <CardHeader className="pt-6 pb-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`text-4xl flex items-center justify-center w-16 h-16 rounded-2xl bg-white/80 shadow-sm border ${currentHealthStatus.border}`}>
                        {currentHealthStatus.emoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className={`text-xl ${currentHealthStatus.text}`}>
                            {currentHealthStatus.status}
                          </CardTitle>
                          <Badge variant="outline" className={`${currentHealthStatus.border} ${currentHealthStatus.text} text-xs font-medium`}>
                            {isAdmin ? 'Organization Health' : 'Your Performance'}
                          </Badge>
                        </div>
                        <CardDescription className={`${currentHealthStatus.text} opacity-80 text-sm max-w-2xl`}>
                          {currentHealthStatus.meaning}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4 text-sm">
                      <div className="text-center px-4 py-2 bg-white/60 rounded-xl border border-white/80">
                        <div className="text-xs text-gray-500 font-medium">Completion</div>
                        <div className={`text-lg font-bold ${completionRate >= 80 ? 'text-emerald-600' : completionRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {completionRate}%
                        </div>
                      </div>
                      <div className="text-center px-4 py-2 bg-white/60 rounded-xl border border-white/80">
                        <div className="text-xs text-gray-500 font-medium">On-Time</div>
                        <div className={`text-lg font-bold ${onTimeRate >= 80 ? 'text-emerald-600' : onTimeRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {onTimeRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-5">
                  <div className="flex items-start gap-3 p-4 bg-white/60 rounded-xl border border-white/80">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${currentHealthStatus.color} flex-shrink-0`}>
                      <Target className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        {isAdmin ? 'Recommended Action Plan' : 'What You Should Do'}
                      </div>
                      <p className={`text-sm font-medium ${currentHealthStatus.text}`}>
                        {currentHealthStatus.action}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          )}

          {/* Voice of Business Report — Admin Only, Direct PDF Download */}
          {isAdmin && metrics && (
            <Card className="shadow-md border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50">
              <CardContent className="py-4 px-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-sm">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Voice of Business</h3>
                      <p className="text-xs text-gray-500">Download comprehensive PDF report with charts, bottlenecks & AI analysis</p>
                    </div>
                  </div>
                  <Button
                    onClick={generatePerformanceReport}
                    disabled={reportGenerating}
                    className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white shadow-md gap-2"
                  >
                    {reportGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download Report
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={`grid w-full ${(user as any)?.role === 'admin' ? 'grid-cols-4' : 'grid-cols-3'} bg-white shadow-sm border border-gray-200 p-1 rounded-lg`}>
              <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="weekly" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Weekly Scoring
              </TabsTrigger>
              {(user as any)?.role === 'admin' && (
                <TabsTrigger value="doers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  All Doers
                </TabsTrigger>
              )}
              <TabsTrigger value="report" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Reporting
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Flow Performance Chart */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                      </div>
                      Flow Performance Overview
                    </CardTitle>
                    <CardDescription>Average completion time and on-time delivery rates</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {flowPerformance?.map((flow: any, index: number) => (
                        <div key={index} className="group flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-200">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                              <Activity className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-800">{flow.system}</h4>
                              <p className="text-sm text-gray-500">
                                Average: {flow.avgCompletionTime} days
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                              {flow.onTimeRate}%
                            </div>
                            <div className="text-xs text-gray-500 font-medium">On-time delivery</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Task Distribution */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                      <div className="p-2 bg-violet-100 rounded-lg">
                        <Users className="h-5 w-5 text-violet-600" />
                      </div>
                      Task Distribution
                    </CardTitle>
                    <CardDescription>Current status breakdown of all tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={taskDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            dataKey="value"
                            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                          >
                            {taskDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            iconType="circle"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="weekly" className="space-y-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-gray-800">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <Calendar className="h-5 w-5 text-emerald-600" />
                        </div>
                        My Weekly Performance
                      </CardTitle>
                      <CardDescription className="mt-1">Track your weekly productivity and completion rates</CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-white hover:bg-gray-50 border-gray-300 shadow-sm"
                      onClick={exportWeeklyScoring}
                      disabled={!weeklyScoring || weeklyScoring.length === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {weeklyLoading ? (
                    <div className="flex items-center justify-center p-12">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                        <Activity className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {weeklyScoring && weeklyScoring.length > 0 ? (
                        <>
                          {/* Weekly Chart */}
                          <div className="h-80 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-100">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={weeklyScoring}>
                                <defs>
                                  <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.4}/>
                                  </linearGradient>
                                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.4}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis 
                                  dataKey="weekStart" 
                                  tickFormatter={(value) => format(new Date(value), "MMM dd")}
                                  tick={{ fill: '#6B7280' }}
                                />
                                <YAxis tick={{ fill: '#6B7280' }} />
                                <Tooltip 
                                  labelFormatter={(value) => `Week of ${format(new Date(value), "MMM dd, yyyy")}`}
                                  contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                  }}
                                />
                                <Legend />
                                <Bar dataKey="onTimeRate" fill="url(#colorOnTime)" name="On-Time Rate %" radius={[8, 8, 0, 0]} />
                                <Bar dataKey="completedTasks" fill="url(#colorCompleted)" name="Completed Tasks" radius={[8, 8, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Weekly Table */}
                          <div className="rounded-xl border border-gray-200 overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gradient-to-r from-gray-50 to-blue-50 hover:from-gray-100 hover:to-blue-100">
                                  <TableHead className="font-semibold text-gray-700">Week Period</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Total Tasks</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Completed</TableHead>
                                  <TableHead className="font-semibold text-gray-700">On-Time Rate</TableHead>
                                  <TableHead className="font-semibold text-gray-700">Avg Days</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {weeklyScoring.map((week: any, index: number) => (
                                  <TableRow key={index} className="hover:bg-blue-50/50 transition-colors">
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-blue-600" />
                                        {format(new Date(week.weekStart), "MMM dd")} - {format(new Date(week.weekEnd), "MMM dd")}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                                        {week.totalTasks}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                        {week.completedTasks}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={week.onTimeRate >= 80 ? "default" : week.onTimeRate >= 60 ? "secondary" : "destructive"}
                                        className={week.onTimeRate >= 80 ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700" : ""}
                                      >
                                        {week.onTimeRate}%
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <span className="font-semibold text-gray-700">{week.avgCompletionDays.toFixed(1)}</span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-16">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                            <Calendar className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-lg font-medium text-gray-600">No weekly data available yet</p>
                          <p className="text-sm text-gray-500 mt-2">Start completing tasks to see your weekly performance</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {(user as any)?.role === 'admin' && (
              <TabsContent value="doers" className="space-y-6">
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-gray-800">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Users className="h-5 w-5 text-purple-600" />
                          </div>
                          All Doers Performance
                        </CardTitle>
                        <CardDescription className="mt-1">Monitor team member performance and productivity</CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-white hover:bg-gray-50 border-gray-300 shadow-sm"
                        onClick={exportDoersPerformance}
                        disabled={!doersPerformance || doersPerformance.length === 0}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between text-sm font-medium text-gray-700 sm:col-span-2 lg:col-span-5 mb-2">
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4 text-blue-600" />
                          Filter Results
                        </div>
                        {(doerFilters.startDate || doerFilters.endDate || doerFilters.doerName || doerFilters.doerEmail || doerFilters.performanceLevel) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearDoerFilters}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Clear Filters
                          </Button>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="startDate" className="text-gray-700 font-medium">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={doerFilters.startDate}
                          onChange={(e) => handleFilterChange('startDate', e.target.value)}
                          className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate" className="text-gray-700 font-medium">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={doerFilters.endDate}
                          onChange={(e) => handleFilterChange('endDate', e.target.value)}
                          className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="doerName" className="text-gray-700 font-medium">Doer Name</Label>
                        <Input
                          id="doerName"
                          placeholder="Search by name..."
                          value={doerFilters.doerName}
                          onChange={(e) => handleFilterChange('doerName', e.target.value)}
                          className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="doerEmail" className="text-gray-700 font-medium">Doer Email</Label>
                        <Input
                          id="doerEmail"
                          placeholder="Search by email..."
                          value={doerFilters.doerEmail}
                          onChange={(e) => handleFilterChange('doerEmail', e.target.value)}
                          className="mt-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="performanceLevel" className="text-gray-700 font-medium">Performance Level</Label>
                        <select
                          id="performanceLevel"
                          className="w-full border border-gray-300 rounded-lg h-10 px-3 mt-1 focus:border-blue-500 focus:ring-blue-500 bg-white"
                          value={doerFilters.performanceLevel}
                          onChange={(e) => handleFilterChange('performanceLevel', e.target.value)}
                        >
                          <option value="">All Levels</option>
                          <option value="excellent">Excellent (≥80%)</option>
                          <option value="good">Good (60-79%)</option>
                          <option value="needs-improvement">Needs Improvement (&lt;60%)</option>
                        </select>
                      </div>
                    </div>

                    {/* Summary Stats Cards */}
                    {filteredDoersPerformance && filteredDoersPerformance.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-purple-600" />
                            <span className="text-sm text-gray-600">Total Users</span>
                          </div>
                          <div className="text-2xl font-bold text-purple-700">{doersSummaryStats.totalUsers}</div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-gray-600">Total Tasks</span>
                          </div>
                          <div className="text-2xl font-bold text-blue-700">{doersSummaryStats.totalTasks}</div>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm text-gray-600">Total Completed</span>
                          </div>
                          <div className="text-2xl font-bold text-emerald-700">{doersSummaryStats.totalCompleted}</div>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-amber-600" />
                            <span className="text-sm text-gray-600">Avg On-Time Rate</span>
                          </div>
                          <div className="text-2xl font-bold text-amber-700">
                            {doersSummaryStats.totalUsers > 0 ? Math.round(doersSummaryStats.sumOnTimeRate / doersSummaryStats.totalUsers) : 0}%
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Doers Performance Table */}
                    {doersLoading ? (
                      <div className="flex items-center justify-center p-12">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
                          <Activity className="h-6 w-6 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gradient-to-r from-gray-50 to-purple-50 hover:from-gray-100 hover:to-purple-100">
                              <TableHead className="font-semibold text-gray-700">Doer</TableHead>
                              <TableHead className="font-semibold text-gray-700">Total Tasks</TableHead>
                              <TableHead className="font-semibold text-gray-700">Completed</TableHead>
                              <TableHead className="font-semibold text-gray-700">On-Time Rate</TableHead>
                              <TableHead className="font-semibold text-gray-700">Avg Days</TableHead>
                              <TableHead className="font-semibold text-gray-700">Last Task</TableHead>
                              <TableHead className="font-semibold text-gray-700 text-center">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredDoersPerformance?.map((doer: any, index: number) => (
                              <TableRow key={index} className="hover:bg-purple-50/50 transition-colors">
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold">
                                      {doer.doerName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-gray-800">{doer.doerName}</div>
                                      <div className="text-sm text-gray-500">{doer.doerEmail}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                                    {doer.totalTasks}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                    {doer.completedTasks}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={doer.onTimeRate >= 80 ? "default" : doer.onTimeRate >= 60 ? "secondary" : "destructive"}
                                    className={doer.onTimeRate >= 80 ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700" : ""}
                                  >
                                    {doer.onTimeRate}%
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="font-semibold text-gray-700">{doer.avgCompletionDays.toFixed(1)}</span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-gray-600">
                                    {doer.lastTaskDate ? format(new Date(doer.lastTaskDate), "MMM dd, yyyy") : 'Never'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setSelectedDoer({ email: doer.doerEmail, name: doer.doerName })}
                                    className="hover:bg-purple-100"
                                  >
                                    <Eye className="h-4 w-4 mr-1 text-purple-600" />
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )) || (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-16">
                                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                    <Users className="h-8 w-8 text-gray-400" />
                                  </div>
                                  <p className="text-lg font-medium text-gray-600">No doers data available</p>
                                  <p className="text-sm text-gray-500 mt-2">Adjust your filters or check back later</p>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Reporting Tab */}
            <TabsContent value="report" className="space-y-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-cyan-50 to-blue-50">
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <div className="p-2 bg-cyan-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-cyan-600" />
                    </div>
                    Reporting Dashboard
                  </CardTitle>
                  <CardDescription>Comprehensive analytics and trend analysis</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-6 bg-gradient-to-br from-gray-50 to-cyan-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 md:col-span-4 mb-2">
                      <Filter className="h-4 w-4 text-cyan-600" />
                      Apply Filters
                    </div>
                    <div>
                      <Label htmlFor="system" className="text-gray-700 font-medium">Flow (System)</Label>
                      <select
                        id="system"
                        className="w-full border border-gray-300 rounded-lg h-10 px-3 mt-1 focus:border-cyan-500 focus:ring-cyan-500 bg-white"
                        value={reportFilters.system}
                        onChange={(e) => {
                          setReportFilters(prev => ({ ...prev, system: e.target.value, taskName: "" }));
                        }}
                      >
                        <option value="">All Systems</option>
                        {systems?.map((s: string) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="task" className="text-gray-700 font-medium">Process (Task)</Label>
                      <select
                        id="task"
                        className="w-full border border-gray-300 rounded-lg h-10 px-3 mt-1 focus:border-cyan-500 focus:ring-cyan-500 bg-white disabled:bg-gray-100"
                        value={reportFilters.taskName}
                        onChange={(e) => setReportFilters(prev => ({ ...prev, taskName: e.target.value }))}
                        disabled={!reportFilters.system}
                      >
                        <option value="">All Processes</option>
                        {processes?.map((p: string) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="start" className="text-gray-700 font-medium">Start Date</Label>
                      <Input 
                        id="start" 
                        type="date" 
                        value={reportFilters.startDate}
                        onChange={(e) => setReportFilters(prev => ({ ...prev, startDate: e.target.value }))} 
                        className="mt-1 border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="end" className="text-gray-700 font-medium">End Date</Label>
                      <Input 
                        id="end" 
                        type="date" 
                        value={reportFilters.endDate}
                        onChange={(e) => setReportFilters(prev => ({ ...prev, endDate: e.target.value }))} 
                        className="mt-1 border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Filtered Report Summary - Compact inline stats instead of duplicate cards */}
                  {(reportFilters.system || reportFilters.taskName || reportFilters.startDate || reportFilters.endDate) && (
                    <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white/60 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-600">Tasks:</span>
                        <span className="font-semibold text-gray-800">{report?.metrics?.totalTasks || 0}</span>
                      </div>
                      <div className="w-px h-6 bg-gray-300" />
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm text-gray-600">Completion:</span>
                        <span className="font-semibold text-gray-800">{report?.metrics?.completionRate || 0}%</span>
                      </div>
                      <div className="w-px h-6 bg-gray-300" />
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span className="text-sm text-gray-600">On-Time:</span>
                        <span className="font-semibold text-gray-800">{report?.metrics?.onTimeRate || 0}%</span>
                      </div>
                      <div className="w-px h-6 bg-gray-300" />
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-violet-600" />
                        <span className="text-sm text-gray-600">Avg:</span>
                        <span className="font-semibold text-gray-800">{report?.metrics?.avgCompletionDays || 0} days</span>
                      </div>
                    </div>
                  )}

                  {/* Timeseries Chart */}
                  <div className="bg-gradient-to-br from-gray-50 to-cyan-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-cyan-600" />
                      Task Timeline Analysis
                    </h3>
                    <div className="h-80">
                      {reportLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="relative">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-200 border-t-cyan-600"></div>
                            <Activity className="h-6 w-6 text-cyan-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                          </div>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={report?.timeseries || []}>
                            <defs>
                              <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(v) => format(new Date(v), "MMM dd")} 
                              tick={{ fill: '#6B7280' }}
                            />
                            <YAxis tick={{ fill: '#6B7280' }} />
                            <Tooltip 
                              labelFormatter={(v) => format(new Date(v), "MMM dd, yyyy")} 
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                              }}
                            />
                            <Legend />
                            <Area 
                              type="monotone" 
                              dataKey="created" 
                              stroke="#3B82F6" 
                              strokeWidth={2}
                              fill="url(#colorCreated)" 
                              name="Created" 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="completed" 
                              stroke="#10B981" 
                              strokeWidth={2}
                              fill="url(#colorCompleted)" 
                              name="Completed" 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="overdue" 
                              stroke="#EF4444" 
                              strokeWidth={2}
                              fill="url(#colorOverdue)" 
                              name="Overdue" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* User Performance Drill-Down Dialog */}
        <Dialog open={!!selectedDoer} onOpenChange={(open) => !open && setSelectedDoer(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                  {selectedDoer?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <DialogTitle className="text-xl text-gray-800">{selectedDoer?.name || 'User'} Performance</DialogTitle>
                  <DialogDescription className="text-gray-500">{selectedDoer?.email}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            {/* User Performance Summary - Quick Stats */}
            {doersPerformance && selectedDoer && (() => {
              const doerData = doersPerformance.find((d: any) => d.doerEmail === selectedDoer.email);
              if (!doerData) return null;
              const perfBadge = getPerformanceBadge(doerData.onTimeRate);
              
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-600">Total Tasks</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-700">{doerData.totalTasks}</div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm text-gray-600">Completed</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-700">{doerData.completedTasks}</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-gray-600">On-Time Rate</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-amber-700">{doerData.onTimeRate}%</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${perfBadge.color} text-white`}>{perfBadge.label}</span>
                    </div>
                  </div>
                  <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-violet-600" />
                      <span className="text-sm text-gray-600">Avg Days</span>
                    </div>
                    <div className="text-2xl font-bold text-violet-700">{doerData.avgCompletionDays.toFixed(1)}</div>
                  </div>
                </div>
              );
            })()}

            {/* Weekly Performance Chart */}
            <div className="mt-4">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Weekly Performance Trend (Last 12 Weeks)
              </h4>
              
              {doerWeeklyLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
                    <Activity className="h-6 w-6 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                </div>
              ) : doerWeeklyData && doerWeeklyData.length > 0 ? (
                <div className="space-y-6">
                  {/* Performance Chart */}
                  <div className="h-64 bg-gradient-to-br from-gray-50 to-purple-50 rounded-xl p-4 border border-gray-100">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={doerWeeklyData}>
                        <defs>
                          <linearGradient id="userColorOnTime" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                          </linearGradient>
                          <linearGradient id="userColorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.4}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="weekStart" 
                          tickFormatter={(value) => format(new Date(value), "MMM dd")}
                          tick={{ fill: '#6B7280' }}
                        />
                        <YAxis tick={{ fill: '#6B7280' }} />
                        <Tooltip 
                          labelFormatter={(value) => `Week of ${format(new Date(value), "MMM dd, yyyy")}`}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="onTimeRate" fill="url(#userColorOnTime)" name="On-Time Rate %" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="completedTasks" fill="url(#userColorCompleted)" name="Completed Tasks" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Weekly Data Table */}
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-purple-50">
                          <TableHead className="font-semibold text-gray-700">Week Period</TableHead>
                          <TableHead className="font-semibold text-gray-700">Total</TableHead>
                          <TableHead className="font-semibold text-gray-700">Completed</TableHead>
                          <TableHead className="font-semibold text-gray-700">On-Time</TableHead>
                          <TableHead className="font-semibold text-gray-700">Avg Days</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doerWeeklyData.slice(0, 8).map((week: any, index: number) => (
                          <TableRow key={index} className="hover:bg-purple-50/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-purple-600" />
                                {format(new Date(week.weekStart), "MMM dd")} - {format(new Date(week.weekEnd), "MMM dd")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">{week.totalTasks}</span>
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">{week.completedTasks}</span>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={week.onTimeRate >= 80 ? "default" : week.onTimeRate >= 60 ? "secondary" : "destructive"}
                                className={week.onTimeRate >= 80 ? "bg-emerald-500" : ""}
                              >
                                {week.onTimeRate}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-gray-700">{week.avgCompletionDays?.toFixed(1) || 0}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No weekly performance data available for this user</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}