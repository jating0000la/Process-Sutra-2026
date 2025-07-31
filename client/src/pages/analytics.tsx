import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import MetricCard from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  AlertTriangle, 
  Users,
  Calendar,
  Target,
  Award
} from "lucide-react";

export default function Analytics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/analytics/metrics"],
    enabled: isAuthenticated,
  });

  const { data: flowPerformance, isLoading: flowLoading } = useQuery({
    queryKey: ["/api/analytics/flow-performance"],
    enabled: isAuthenticated,
  });

  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  // Mock data for charts - in real app, this would come from API
  const completionTrendData = [
    { name: 'Jan', completed: 65, target: 70 },
    { name: 'Feb', completed: 78, target: 75 },
    { name: 'Mar', completed: 82, target: 80 },
    { name: 'Apr', completed: 75, target: 85 },
    { name: 'May', completed: 88, target: 85 },
    { name: 'Jun', completed: 92, target: 90 },
  ];

  const taskDistributionData = [
    { name: 'Completed', value: metrics?.completedTasks || 0, color: '#10B981' },
    { name: 'In Progress', value: Math.floor((metrics?.totalTasks || 0) * 0.3), color: '#3B82F6' },
    { name: 'Pending', value: Math.floor((metrics?.totalTasks || 0) * 0.4), color: '#F59E0B' },
    { name: 'Overdue', value: metrics?.overdueTasks || 0, color: '#EF4444' },
  ];

  const performanceByDayData = [
    { day: 'Mon', tasks: 12, onTime: 10 },
    { day: 'Tue', tasks: 15, onTime: 13 },
    { day: 'Wed', tasks: 8, onTime: 7 },
    { day: 'Thu', tasks: 18, onTime: 16 },
    { day: 'Fri', tasks: 11, onTime: 9 },
    { day: 'Sat', tasks: 6, onTime: 6 },
    { day: 'Sun', tasks: 4, onTime: 4 },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen bg-neutral">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Header title="Analytics" description="Performance insights and metrics" />
          <div className="p-6">
            <div className="animate-pulse space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 shadow-sm border">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
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
              value="2.4 days"
              icon={<Award className="text-purple-500" />}
              trend={{ value: 12, isPositive: false }}
              description="from last month"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Completion Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Completion Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={completionTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="completed" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 5 }}
                        name="Completed"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="target" 
                        stroke="#94A3B8" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: "#94A3B8", strokeWidth: 2, r: 4 }}
                        name="Target"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Task Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Task Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
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

          {/* Performance Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Performance */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Daily Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceByDayData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="tasks" fill="hsl(var(--primary))" name="Total Tasks" />
                        <Bar dataKey="onTime" fill="hsl(var(--success))" name="On Time" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Sarah Johnson</p>
                      <p className="text-xs text-gray-600">Sales Executive</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">94%</p>
                      <p className="text-xs text-gray-600">On-time</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Mike Chen</p>
                      <p className="text-xs text-gray-600">Account Manager</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">91%</p>
                      <p className="text-xs text-gray-600">On-time</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Emma Davis</p>
                      <p className="text-xs text-gray-600">Quality Analyst</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">89%</p>
                      <p className="text-xs text-gray-600">On-time</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">David Wilson</p>
                      <p className="text-xs text-gray-600">Project Manager</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">87%</p>
                      <p className="text-xs text-gray-600">On-time</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Flow Performance Details */}
          <Card>
            <CardHeader>
              <CardTitle>Flow Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {flowLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  ))
                ) : flowPerformance?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No flow performance data available
                  </div>
                ) : (
                  flowPerformance?.map((flow: any) => (
                    <div key={flow.system} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-medium text-gray-900">{flow.system}</p>
                            <p className="text-sm text-gray-600">
                              Avg completion: {flow.avgCompletionTime} days
                            </p>
                          </div>
                          <Badge variant={flow.onTimeRate >= 80 ? "default" : "secondary"}>
                            {flow.onTimeRate >= 90 ? "Excellent" : 
                             flow.onTimeRate >= 80 ? "Good" : 
                             flow.onTimeRate >= 70 ? "Fair" : "Needs Improvement"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-32">
                          <div className="flex justify-between text-xs mb-1">
                            <span>On-time Rate</span>
                            <span>{flow.onTimeRate}%</span>
                          </div>
                          <Progress 
                            value={flow.onTimeRate} 
                            className="h-2"
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{flow.onTimeRate}%</p>
                          <p className="text-xs text-gray-600">Success Rate</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
