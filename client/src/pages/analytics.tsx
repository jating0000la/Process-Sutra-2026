import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MetricCard from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Cell
} from "recharts";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Target,
  Award,
  Users,
  Calendar,
  Download
} from "lucide-react";
import { format } from "date-fns";

export default function Analytics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [doerFilters, setDoerFilters] = useState({
    startDate: "",
    endDate: "",
    doerName: "",
    doerEmail: "",
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
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: metrics, isLoading: metricsLoading } = useQuery<{
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    onTimeRate: number;
    avgResolutionTime: number;
  }>({
    queryKey: ["/api/analytics/metrics"],
    enabled: isAuthenticated,
  });

  const { data: flowPerformance, isLoading: flowLoading } = useQuery<Array<{
    system: string;
    avgCompletionTime: number;
    onTimeRate: number;
  }>>({
    queryKey: ["/api/analytics/flow-performance"],
    enabled: isAuthenticated,
  });

  // Weekly scoring for users
  const { data: weeklyScoring, isLoading: weeklyLoading } = useQuery<any[]>({
    queryKey: ["/api/analytics/weekly-scoring"],
    enabled: isAuthenticated,
  });

  // Reporting queries
  const { data: systems } = useQuery<string[]>({
    queryKey: ["/api/analytics/report/systems"],
    enabled: isAuthenticated,
  });

  const { data: processes, refetch: refetchProcesses } = useQuery<string[]>({
    queryKey: ["/api/analytics/report/processes", reportFilters.system],
    queryFn: async () => {
      if (!reportFilters.system) return [];
      const res = await fetch(`/api/analytics/report/processes?system=${encodeURIComponent(reportFilters.system)}`);
      if (!res.ok) throw new Error("Failed to fetch processes");
      return res.json();
    },
    enabled: isAuthenticated && !!reportFilters.system,
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
    enabled: isAuthenticated,
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
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  const handleFilterChange = (key: string, value: string) => {
    setDoerFilters(prev => ({ ...prev, [key]: value }));
  };

  const taskDistributionData = [
    { name: 'Completed', value: metrics?.completedTasks || 0, color: '#10B981' },
    { name: 'In Progress', value: Math.floor((metrics?.totalTasks || 0) * 0.3), color: '#3B82F6' },
    { name: 'Pending', value: Math.floor((metrics?.totalTasks || 0) * 0.4), color: '#F59E0B' },
    { name: 'Overdue', value: metrics?.overdueTasks || 0, color: '#EF4444' },
  ];

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen bg-neutral">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header 
          title="Analytics" 
          description="Performance insights and metrics"
        />

        <div className="p-6 space-y-6">
          {/* Key Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Tasks"
              value={metrics?.totalTasks || 0}
              icon={<Target className="text-blue-500" />}
              trend={{ value: 15, isPositive: true }}
              description="from last month"
            />
            <MetricCard
              title="Completion Rate"
              value={`${Math.round(((metrics?.completedTasks || 0) / (metrics?.totalTasks || 1)) * 100)}%`}
              icon={<CheckCircle className="text-green-500" />}
              trend={{ value: 8, isPositive: true }}
              description="from last month"
            />
            <MetricCard
              title="On-Time Rate"
              value={`${metrics?.onTimeRate || 0}%`}
              icon={<Clock className="text-orange-500" />}
              trend={{ value: 3, isPositive: true }}
              description="from last month"
            />
            <MetricCard
              title="Avg Resolution Time"
              value={`${metrics?.avgResolutionTime || 0} days`}
              icon={<Award className="text-purple-500" />}
              trend={{ value: 12, isPositive: false }}
              description="from last month"
            />
          </div>

          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full ${(user as any)?.role === 'admin' ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="weekly">Weekly Scoring</TabsTrigger>
              {(user as any)?.role === 'admin' && <TabsTrigger value="doers">All Doers Performance</TabsTrigger>}
              <TabsTrigger value="report">Reporting</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Flow Performance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Flow Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {flowPerformance?.map((flow: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium">{flow.system}</h4>
                            <p className="text-sm text-gray-600">
                              Avg: {flow.avgCompletionTime} days
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-green-600">
                              {flow.onTimeRate}%
                            </div>
                            <div className="text-xs text-gray-500">On-time</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Task Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Task Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={taskDistributionData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {taskDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="weekly" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    My Weekly Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {weeklyLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {weeklyScoring && weeklyScoring.length > 0 ? (
                        <>
                          {/* Weekly Chart */}
                          <div className="h-64 mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={weeklyScoring}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="weekStart" 
                                  tickFormatter={(value) => format(new Date(value), "MMM dd")}
                                />
                                <YAxis />
                                <Tooltip 
                                  labelFormatter={(value) => `Week of ${format(new Date(value), "MMM dd, yyyy")}`}
                                />
                                <Bar dataKey="onTimeRate" fill="#10B981" name="On-Time Rate %" />
                                <Bar dataKey="completedTasks" fill="#3B82F6" name="Completed Tasks" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Weekly Table */}
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Week</TableHead>
                                <TableHead>Total Tasks</TableHead>
                                <TableHead>Completed</TableHead>
                                <TableHead>On-Time Rate</TableHead>
                                <TableHead>Avg Days</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {weeklyScoring.map((week: any, index: number) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    {format(new Date(week.weekStart), "MMM dd")} - {format(new Date(week.weekEnd), "MMM dd")}
                                  </TableCell>
                                  <TableCell>{week.totalTasks}</TableCell>
                                  <TableCell>{week.completedTasks}</TableCell>
                                  <TableCell>
                                    <Badge variant={week.onTimeRate >= 80 ? "default" : week.onTimeRate >= 60 ? "secondary" : "destructive"}>
                                      {week.onTimeRate}%
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{week.avgCompletionDays.toFixed(1)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No weekly data available yet
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {(user as any)?.role === 'admin' && (
              <TabsContent value="doers" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        All Doers Performance
                      </CardTitle>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={doerFilters.startDate}
                          onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={doerFilters.endDate}
                          onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="doerName">Doer Name</Label>
                        <Input
                          id="doerName"
                          placeholder="Search by name..."
                          value={doerFilters.doerName}
                          onChange={(e) => handleFilterChange('doerName', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="doerEmail">Doer Email</Label>
                        <Input
                          id="doerEmail"
                          placeholder="Search by email..."
                          value={doerFilters.doerEmail}
                          onChange={(e) => handleFilterChange('doerEmail', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Doers Performance Table */}
                    {doersLoading ? (
                      <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Doer</TableHead>
                            <TableHead>Total Tasks</TableHead>
                            <TableHead>Completed</TableHead>
                            <TableHead>On-Time Rate</TableHead>
                            <TableHead>Avg Days</TableHead>
                            <TableHead>Last Task</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {doersPerformance?.map((doer: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{doer.doerName}</div>
                                  <div className="text-sm text-gray-500">{doer.doerEmail}</div>
                                </div>
                              </TableCell>
                              <TableCell>{doer.totalTasks}</TableCell>
                              <TableCell>{doer.completedTasks}</TableCell>
                              <TableCell>
                                <Badge variant={doer.onTimeRate >= 80 ? "default" : doer.onTimeRate >= 60 ? "secondary" : "destructive"}>
                                  {doer.onTimeRate}%
                                </Badge>
                              </TableCell>
                              <TableCell>{doer.avgCompletionDays.toFixed(1)}</TableCell>
                              <TableCell>
                                {doer.lastTaskDate ? format(new Date(doer.lastTaskDate), "MMM dd, yyyy") : 'Never'}
                              </TableCell>
                            </TableRow>
                          )) || (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                No doers data available
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Reporting Tab */}
            <TabsContent value="report" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" /> Reporting Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label htmlFor="system">Flow (System)</Label>
                      <select
                        id="system"
                        className="w-full border rounded h-9 px-2"
                        value={reportFilters.system}
                        onChange={(e) => {
                          setReportFilters(prev => ({ ...prev, system: e.target.value, taskName: "" }));
                        }}
                      >
                        <option value="">All</option>
                        {systems?.map((s: string) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="task">Process (Task)</Label>
                      <select
                        id="task"
                        className="w-full border rounded h-9 px-2"
                        value={reportFilters.taskName}
                        onChange={(e) => setReportFilters(prev => ({ ...prev, taskName: e.target.value }))}
                        disabled={!reportFilters.system}
                      >
                        <option value="">All</option>
                        {processes?.map((p: string) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="start">Start Date</Label>
                      <Input id="start" type="date" value={reportFilters.startDate}
                        onChange={(e) => setReportFilters(prev => ({ ...prev, startDate: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="end">End Date</Label>
                      <Input id="end" type="date" value={reportFilters.endDate}
                        onChange={(e) => setReportFilters(prev => ({ ...prev, endDate: e.target.value }))} />
                    </div>
                  </div>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <MetricCard title="Total Tasks" value={report?.metrics?.totalTasks || 0} icon={<Target className="text-blue-500" />} />
                    <MetricCard title="Completion Rate" value={`${report?.metrics?.completionRate || 0}%`} icon={<CheckCircle className="text-green-500" />} />
                    <MetricCard title="On-Time Rate" value={`${report?.metrics?.onTimeRate || 0}%`} icon={<Clock className="text-orange-500" />} />
                    <MetricCard title="Avg Completion" value={`${report?.metrics?.avgCompletionDays || 0} days`} icon={<Award className="text-purple-500" />} />
                  </div>

                  {/* Timeseries Chart */}
                  <div className="h-72">
                    {reportLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={report?.timeseries || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), "MMM dd")} />
                          <YAxis />
                          <Tooltip labelFormatter={(v) => format(new Date(v), "MMM dd, yyyy")} />
                          <Line type="monotone" dataKey="created" stroke="#3B82F6" name="Created" />
                          <Line type="monotone" dataKey="completed" stroke="#10B981" name="Completed" />
                          <Line type="monotone" dataKey="overdue" stroke="#EF4444" name="Overdue" />
                        </LineChart>
                      </ResponsiveContainer>
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