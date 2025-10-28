import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { useLayout } from "@/contexts/LayoutContext";
import MetricCard from "@/components/metric-card";
import TaskCard from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CheckCircle, Clock, AlertTriangle, TrendingUp, Plus, FileText, Workflow } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, loading, handleTokenExpired } = useAuth();
  const { sidebarOpen } = useLayout();

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
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
    enabled: !!user,
  });

  const { data: flowPerformance } = useQuery<Array<{
    system: string;
    avgCompletionTime: number;
    onTimeRate: number;
  }>>({
    queryKey: ["/api/analytics/flow-performance"],
    enabled: !!user,
  });

  // Mock chart data for completion trends
  const chartData = [
    { name: 'Mon', completed: 12 },
    { name: 'Tue', completed: 19 },
    { name: 'Wed', completed: 8 },
    { name: 'Thu', completed: 15 },
    { name: 'Fri', completed: 11 },
    { name: 'Sat', completed: 25 },
    { name: 'Sun', completed: 18 },
  ];

  if (loading || metricsLoading) {
    return (
      <div className="h-screen flex bg-neutral">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pt-16" style={{ paddingLeft: sidebarOpen ? undefined : undefined }}>
          <Header title="Dashboard" description="Manage your tasks and workflows efficiently" />
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-neutral">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-16">
        <Header 
          title="Dashboard" 
          description="Manage your tasks and workflows efficiently"
          actions={
            <div className="flex space-x-3">
              {/* <Button variant="outline" className="flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Export
              </Button> */}
              <Button className="flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                New Flow
              </Button>
            </div>
          }
        />

        <div className="p-6 space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Active Tasks"
              value={metrics?.totalTasks || 0}
              icon={<Clock className="text-primary" />}
              trend={{ value: 12, isPositive: true }}
              description="from last week"
            />
      <MetricCard
              title="Completed Today"
              value={tasks?.filter((t: any) => 
                t.status === 'completed' && 
        t.actualCompletionTime && new Date(t.actualCompletionTime).toDateString() === new Date().toDateString()
              ).length || 0}
              icon={<CheckCircle className="text-success" />}
              trend={{ value: 8, isPositive: true }}
              description="from yesterday"
            />
            <MetricCard
              title="Overdue Tasks"
              value={metrics?.overdueTasks || 0}
              icon={<AlertTriangle className="text-warning" />}
              trend={{ value: 4, isPositive: false }}
              description="from last week"
            />
            <MetricCard
              title="On-Time Rate"
              value={`${metrics?.onTimeRate || 0}%`}
              icon={<TrendingUp className="text-accent" />}
              trend={{ value: 2, isPositive: true }}
              description="from last month"
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Task List */}
            <div>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Tasks</CardTitle>
                    <div className="flex space-x-2">
                      <select className="text-sm border border-gray-300 rounded-lg px-3 py-1">
                        <option>All Status</option>
                        <option>Pending</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                      </select>
                      <Button variant="link" size="sm">View All</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-200">
                    {tasksLoading ? (
                      [...Array(3)].map((_, i) => (
                        <div key={i} className="p-6 animate-pulse">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : tasks?.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        No tasks found. Create a new flow to get started.
                      </div>
                    ) : (
                      tasks?.slice(0, 5).map((task: any) => (
                        <TaskCard key={task.id} task={task} />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>


          </div>

          {/* Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Completion Trends Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Task Completion Trends</CardTitle>
                  <select className="text-sm border border-gray-300 rounded-lg px-3 py-1">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 90 days</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="completed" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Flow Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Flow Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {flowPerformance?.map((flow: any) => (
                  <div key={flow.system} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{flow.system}</p>
                      <p className="text-xs text-gray-600">Average completion: {flow.avgCompletionTime} days</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={flow.onTimeRate} className="w-16" />
                      <span className="text-sm font-medium text-gray-900">{flow.onTimeRate}%</span>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-gray-500 py-4">
                    No flow performance data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
