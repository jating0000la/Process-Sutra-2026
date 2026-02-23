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
import { Eye, X } from "lucide-react";

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
                title="Avg Resolution Time"
                value={`${metrics?.avgResolutionTime || 0} days`}
                icon={<Zap className="text-violet-600" />}
                trend={{ value: 12, isPositive: false }}
                description="from last month"
              />
            </div>
          </div>

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