import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Activity, 
  FileText, 
  Database, 
  DollarSign, 
  Users, 
  Zap,
  Download,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Calendar,
  HardDrive,
  Workflow,
  BarChart3,
  PieChart
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { format } from "date-fns";

interface UsageSummary {
  flows: {
    total: number;
    thisMonth: number;
    active: number;
    completed: number;
    cancelled: number;
    successRate: number;
    avgCompletionTime: number;
    trend: number;
  };
  forms: {
    total: number;
    thisMonth: number;
    byFormType: Record<string, number>;
    avgSubmissionTime: number;
    trend: number;
  };
  storage: {
    totalFiles: number;
    totalBytes: number;
    totalGB: number;
    byFileType: Record<string, number>;
    avgFileSize: number;
    trend: number;
  };
  users: {
    total: number;
    active: number;
    activeToday: number;
    avgTasksPerUser: number;
  };
  cost: {
    currentMonth: number;
    flowCost: number;
    userCost: number;
    formCost: number;
    projected: number;
    comparison: number;
  };
  performance: {
    tatCompliance: number;
    onTimeRate: number;
    avgResponseTime: number;
  };
  quotas: {
    maxUsers: number;
    currentUsers: number;
    storageLimit: number;
    storageUsed: number;
  };
}

interface UsageTrends {
  daily: Array<{
    date: string;
    flows: number;
    forms: number;
    storage: number;
  }>;
  flowsBySystem: Array<{
    system: string;
    count: number;
    percentage: number;
  }>;
  topForms: Array<{
    formId: string;
    count: number;
  }>;
}

export default function Usage() {
  const { user, dbUser, loading } = useAuth();
  const [dateRange, setDateRange] = useState("month");
  const isAdmin = dbUser?.role === "admin";

  // Fetch usage summary
  const { data: summary, isLoading: summaryLoading } = useQuery<UsageSummary>({
    queryKey: ["/api/usage/summary", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/usage/summary?dateRange=${dateRange}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch usage summary");
      return res.json();
    },
    enabled: !!user && isAdmin,
    staleTime: 60000, // 1 minute
  });

  // Fetch usage trends
  const { data: trends, isLoading: trendsLoading } = useQuery<UsageTrends>({
    queryKey: ["/api/usage/trends", dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/usage/trends?dateRange=${dateRange}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch usage trends");
      return res.json();
    },
    enabled: !!user && isAdmin,
    staleTime: 60000,
  });

  if (!isAdmin) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Header title="Usage Statistics" description="Access Denied" />
          <div className="p-6">
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                You don't have permission to access this page.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading || summaryLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Header title="Usage Statistics" description="Loading..." />
          <div className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header 
          title="Usage Statistics" 
          description="Monitor your organization's platform usage and performance"
          actions={
            <div className="flex gap-3">
              <select 
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="quarter">Last 3 Months</option>
              </select>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
          }
        />

        <div className="p-8 space-y-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Flow Executions */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Workflow className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge variant={summary?.flows.trend && summary.flows.trend > 0 ? "default" : "secondary"} className="flex items-center gap-1">
                    {summary?.flows.trend && summary.flows.trend > 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(summary?.flows.trend || 0)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Flow Executions</p>
                  <p className="text-3xl font-bold text-gray-900">{summary?.flows.thisMonth.toLocaleString() || 0}</p>
                  <p className="text-xs text-gray-500">Total: {summary?.flows.total.toLocaleString() || 0}</p>
                </div>
              </CardContent>
            </Card>

            {/* Form Submissions */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <Badge variant={summary?.forms.trend && summary.forms.trend > 0 ? "default" : "secondary"} className="flex items-center gap-1">
                    {summary?.forms.trend && summary.forms.trend > 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(summary?.forms.trend || 0)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Form Submissions</p>
                  <p className="text-3xl font-bold text-gray-900">{summary?.forms.thisMonth.toLocaleString() || 0}</p>
                  <p className="text-xs text-gray-500">Total: {summary?.forms.total.toLocaleString() || 0}</p>
                </div>
              </CardContent>
            </Card>

            {/* Storage Usage */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Database className="h-6 w-6 text-purple-600" />
                  </div>
                  <Badge variant={summary?.storage.trend && summary.storage.trend > 0 ? "default" : "secondary"} className="flex items-center gap-1">
                    {summary?.storage.trend && summary.storage.trend > 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(summary?.storage.trend || 0)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Storage Used</p>
                  <p className="text-3xl font-bold text-gray-900">{summary?.storage.totalGB.toFixed(2) || 0} GB</p>
                  <p className="text-xs text-gray-500">{summary?.storage.totalFiles.toLocaleString() || 0} files</p>
                </div>
              </CardContent>
            </Card>

            {/* Cost Estimate */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-amber-600" />
                  </div>
                  <Badge variant={summary?.cost.comparison && summary.cost.comparison > 0 ? "destructive" : "default"} className="flex items-center gap-1">
                    {summary?.cost.comparison && summary.cost.comparison > 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(summary?.cost.comparison || 0)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Current Month</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary?.cost.currentMonth || 0)}</p>
                  <p className="text-xs text-gray-500">Projected: {formatCurrency(summary?.cost.projected || 0)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Different Views */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm border border-gray-200 p-1 rounded-lg">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="flows" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white flex items-center gap-2">
                <Workflow className="h-4 w-4" />
                Flows
              </TabsTrigger>
              <TabsTrigger value="storage" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Storage
              </TabsTrigger>
              <TabsTrigger value="cost" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Cost Analysis
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Usage Trends Chart */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                      </div>
                      Usage Trends
                    </CardTitle>
                    <CardDescription>Daily flow executions and form submissions</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trends?.daily || []}>
                        <defs>
                          <linearGradient id="colorFlows" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorForms" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="date" stroke="#6B7280" />
                        <YAxis stroke="#6B7280" />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="flows" stroke="#3B82F6" fillOpacity={1} fill="url(#colorFlows)" name="Flows" />
                        <Area type="monotone" dataKey="forms" stroke="#10B981" fillOpacity={1} fill="url(#colorForms)" name="Forms" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Zap className="h-5 w-5 text-green-600" />
                      </div>
                      Performance Score
                    </CardTitle>
                    <CardDescription>Overall organization efficiency</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">TAT Compliance</span>
                        <span className="text-sm font-bold text-blue-600">{summary?.performance.tatCompliance || 0}%</span>
                      </div>
                      <Progress value={summary?.performance.tatCompliance || 0} className="h-3" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">On-Time Delivery</span>
                        <span className="text-sm font-bold text-green-600">{summary?.performance.onTimeRate || 0}%</span>
                      </div>
                      <Progress value={summary?.performance.onTimeRate || 0} className="h-3" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Flow Success Rate</span>
                        <span className="text-sm font-bold text-purple-600">{summary?.flows.successRate || 0}%</span>
                      </div>
                      <Progress value={summary?.flows.successRate || 0} className="h-3" />
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{summary?.flows.avgCompletionTime.toFixed(1) || 0}</p>
                          <p className="text-xs text-gray-600">Avg. Days/Flow</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{summary?.users.avgTasksPerUser.toFixed(1) || 0}</p>
                          <p className="text-xs text-gray-600">Tasks/User</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Flows by System */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <PieChart className="h-5 w-5 text-purple-600" />
                    </div>
                    Flow Distribution by System
                  </CardTitle>
                  <CardDescription>Breakdown of flow executions across different systems</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPie>
                        <Pie
                          data={trends?.flowsBySystem || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.system}: ${entry.percentage}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {(trends?.flowsBySystem || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      {trends?.flowsBySystem?.map((system, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-sm font-medium text-gray-700">{system.system}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{system.count}</p>
                            <p className="text-xs text-gray-500">{system.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Activity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <div className="p-2 bg-blue-100 rounded-lg w-fit">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-3xl font-bold text-gray-900">{summary?.users.total || 0}</p>
                      <p className="text-xs text-gray-500">{summary?.users.active || 0} active</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <div className="p-2 bg-green-100 rounded-lg w-fit">
                      <Activity className="h-6 w-6 text-green-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Active Today</p>
                      <p className="text-3xl font-bold text-gray-900">{summary?.users.activeToday || 0}</p>
                      <p className="text-xs text-gray-500">{((summary?.users.activeToday || 0) / (summary?.users.total || 1) * 100).toFixed(0)}% of total</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <div className="p-2 bg-purple-100 rounded-lg w-fit">
                      <Calendar className="h-6 w-6 text-purple-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Avg Tasks/User</p>
                      <p className="text-3xl font-bold text-gray-900">{summary?.users.avgTasksPerUser.toFixed(1) || 0}</p>
                      <p className="text-xs text-gray-500">This month</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Flows Tab */}
            <TabsContent value="flows" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600">Active Flows</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">{summary?.flows.active || 0}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600">Completed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">{summary?.flows.completed || 0}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600">Cancelled</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-600">{summary?.flows.cancelled || 0}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-600">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-purple-600">{summary?.flows.successRate || 0}%</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle>Top Forms by Submissions</CardTitle>
                  <CardDescription>Most frequently submitted forms</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trends?.topForms || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="formId" stroke="#6B7280" />
                      <YAxis stroke="#6B7280" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Storage Tab */}
            <TabsContent value="storage" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle>Storage Overview</CardTitle>
                    <CardDescription>File storage breakdown</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Storage Used</span>
                        <span className={`text-sm font-bold ${
                          ((summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100) > 90 
                            ? 'text-red-600' 
                            : ((summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100) > 75 
                            ? 'text-amber-600' 
                            : 'text-blue-600'
                        }`}>
                          {summary?.storage.totalGB.toFixed(2) || 0} GB
                        </span>
                      </div>
                      <Progress 
                        value={(summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100} 
                        className={`h-3 ${
                          ((summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100) > 90 
                            ? '[&>div]:bg-red-600' 
                            : ((summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100) > 75 
                            ? '[&>div]:bg-amber-600' 
                            : ''
                        }`}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {summary?.quotas.storageLimit ? `${((summary?.quotas.storageUsed || 0) / summary.quotas.storageLimit * 100).toFixed(1)}% of ${summary.quotas.storageLimit} GB limit` : 'No limit set'}
                      </p>
                      {((summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100) > 90 && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          ⚠️ Storage almost full! You've used over 90% of your 5GB limit. File uploads may fail soon.
                        </div>
                      )}
                      {((summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100) > 75 && 
                       ((summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100) <= 90 && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                          ⚠️ Storage warning: You've used over 75% of your 5GB limit.
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Total Files</p>
                        <p className="text-2xl font-bold text-blue-600">{summary?.storage.totalFiles.toLocaleString() || 0}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Avg File Size</p>
                        <p className="text-2xl font-bold text-green-600">{formatBytes(summary?.storage.avgFileSize || 0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle>Files by Type</CardTitle>
                    <CardDescription>Distribution of uploaded files</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {Object.entries(summary?.storage.byFileType || {}).map(([type, count], index) => (
                        <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-sm font-medium text-gray-700">{type}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Cost Analysis Tab */}
            <TabsContent value="cost" className="space-y-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                  <CardTitle className="flex items-center gap-2 text-gray-800">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-amber-600" />
                    </div>
                    Cost Breakdown
                  </CardTitle>
                  <CardDescription>Current month usage-based pricing</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-3 mb-3">
                        <Workflow className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Flow Executions</p>
                          <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary?.cost.flowCost || 0)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">{summary?.flows.thisMonth} flows × rate</p>
                    </div>
                    <div className="p-6 bg-green-50 rounded-xl border border-green-200">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">Active Users</p>
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.cost.userCost || 0)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">{summary?.users.active} users × rate</p>
                    </div>
                    <div className="p-6 bg-purple-50 rounded-xl border border-purple-200">
                      <div className="flex items-center gap-3 mb-3">
                        <FileText className="h-8 w-8 text-purple-600" />
                        <div>
                          <p className="text-sm text-gray-600">Form Submissions</p>
                          <p className="text-2xl font-bold text-purple-600">{formatCurrency(summary?.cost.formCost || 0)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">{summary?.forms.thisMonth} submissions × rate</p>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Current Month</p>
                        <p className="text-4xl font-bold text-gray-900">{formatCurrency(summary?.cost.currentMonth || 0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Projected End of Month</p>
                        <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary?.cost.projected || 0)}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-amber-200">
                      <p className="text-sm text-gray-600">
                        {summary?.cost.comparison && summary.cost.comparison > 0 ? (
                          <span className="text-red-600 font-medium">↑ {summary.cost.comparison}% higher than last month</span>
                        ) : (
                          <span className="text-green-600 font-medium">↓ {Math.abs(summary?.cost.comparison || 0)}% lower than last month</span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quota Limits */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle>Resource Quotas</CardTitle>
                  <CardDescription>Current usage vs. plan limits</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Users</span>
                      <span className="text-sm font-bold text-gray-900">{summary?.quotas.currentUsers || 0} / {summary?.quotas.maxUsers || 0}</span>
                    </div>
                    <Progress value={(summary?.quotas.currentUsers || 0) / (summary?.quotas.maxUsers || 1) * 100} className="h-3" />
                    <p className="text-xs text-gray-500 mt-1">
                      {((summary?.quotas.currentUsers || 0) / (summary?.quotas.maxUsers || 1) * 100).toFixed(0)}% of quota used
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Storage</span>
                      <span className={`text-sm font-bold ${
                        ((summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100) > 90 
                          ? 'text-red-600' 
                          : ((summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100) > 75 
                          ? 'text-amber-600' 
                          : 'text-gray-900'
                      }`}>
                        {summary?.quotas.storageUsed.toFixed(2) || 0} GB / {summary?.quotas.storageLimit || 5} GB
                      </span>
                    </div>
                    <Progress 
                      value={(summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100} 
                      className={`h-3 ${
                        ((summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100) > 90 
                          ? '[&>div]:bg-red-600' 
                          : ((summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100) > 75 
                          ? '[&>div]:bg-amber-600' 
                          : ''
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {((summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100).toFixed(0)}% of quota used
                    </p>
                    {((summary?.quotas.storageUsed || 0) / (summary?.quotas.storageLimit || 5) * 100) > 90 && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
                        ⚠️ Critical: Storage limit almost reached! Max file upload size: 10MB
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
