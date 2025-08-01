import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, Filter } from "lucide-react";
import FlowDataViewer from "@/components/flow-data-viewer";

interface FlowSummary {
  flowId: string;
  system: string;
  orderNumber?: string;
  description?: string;
  initiatedAt?: string;
  initiatedBy?: string;
  taskCount: number;
  completedTasks: number;
  status: 'completed' | 'in-progress' | 'pending';
}

export default function FlowData() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [systemFilter, setSystemFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);

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

  // Get all tasks to extract unique flow IDs
  const { data: tasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  // Get comprehensive flow data for selected flow
  const { data: selectedFlowData, isLoading: flowDataLoading } = useQuery<any>({
    queryKey: ["/api/flows", selectedFlowId, "data"],
    enabled: isAuthenticated && !!selectedFlowId,
  });

  if (isLoading || tasksLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">
            <div className="text-center">Loading flow data...</div>
          </main>
        </div>
      </div>
    );
  }

  // Create flow summaries from tasks
  const flowSummaries: FlowSummary[] = [];
  const flowMap = new Map<string, FlowSummary>();

  (tasks || []).forEach((task: any) => {
    if (!flowMap.has(task.flowId)) {
      const status = task.status === 'completed' ? 'completed' : 
                   task.status === 'pending' ? 'in-progress' : 'pending';
      
      flowMap.set(task.flowId, {
        flowId: task.flowId,
        system: task.system,
        orderNumber: task.orderNumber,
        description: task.flowDescription,
        initiatedAt: task.flowInitiatedAt,
        initiatedBy: task.flowInitiatedBy,
        taskCount: 1,
        completedTasks: task.status === 'completed' ? 1 : 0,
        status
      });
    } else {
      const flow = flowMap.get(task.flowId)!;
      flow.taskCount++;
      if (task.status === 'completed') {
        flow.completedTasks++;
      }
      // Update status based on completion
      if (flow.completedTasks === flow.taskCount) {
        flow.status = 'completed';
      } else if (flow.completedTasks > 0) {
        flow.status = 'in-progress';
      }
    }
  });

  flowSummaries.push(...Array.from(flowMap.values()));

  // Filter flows
  const filteredFlows = flowSummaries.filter(flow => {
    const matchesSearch = searchTerm === "" || 
      flow.system.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flow.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flow.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSystem = systemFilter === "all" || flow.system === systemFilter;
    const matchesStatus = statusFilter === "all" || flow.status === statusFilter;
    
    return matchesSearch && matchesSystem && matchesStatus;
  });

  // Get unique systems for filter
  const uniqueSystems = Array.from(new Set(flowSummaries.map(flow => flow.system)));

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      "in-progress": "secondary", 
      pending: "outline"
    };
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status.replace('-', ' ')}
      </Badge>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flow Data</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive view of task flows, form responses, and progress tracking
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search flows..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={systemFilter} onValueChange={setSystemFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by system" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Systems</SelectItem>
                    {uniqueSystems.map(system => (
                      <SelectItem key={system} value={system}>{system}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  {filteredFlows.length} flows found
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Flow List */}
          {!selectedFlowId && (
            <Card>
              <CardHeader>
                <CardTitle>Flow Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredFlows.map((flow) => (
                    <div 
                      key={flow.flowId}
                      className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      onClick={() => setSelectedFlowId(flow.flowId)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{flow.system}</h3>
                            {getStatusBadge(flow.status)}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <div>Order: {flow.orderNumber}</div>
                            {flow.description && <div>Description: {flow.description}</div>}
                            {flow.initiatedAt && (
                              <div>Started: {new Date(flow.initiatedAt).toLocaleString()}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {flow.completedTasks}/{flow.taskCount} tasks completed
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round((flow.completedTasks/flow.taskCount) * 100)}% complete
                          </div>
                          <Button variant="outline" size="sm" className="mt-2">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredFlows.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No flows found matching your criteria
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Flow View */}
          {selectedFlowId && (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                onClick={() => setSelectedFlowId(null)}
                className="mb-4"
              >
                ← Back to Flow List
              </Button>
              
              {flowDataLoading ? (
                <div className="text-center py-8">Loading detailed flow data...</div>
              ) : selectedFlowData ? (
                <FlowDataViewer
                  flowId={selectedFlowData.flowId}
                  tasks={selectedFlowData.tasks}
                  flowDescription={selectedFlowData.flowDescription}
                  flowInitiatedAt={selectedFlowData.flowInitiatedAt}
                  flowInitiatedBy={selectedFlowData.flowInitiatedBy}
                  orderNumber={selectedFlowData.orderNumber}
                  system={selectedFlowData.system}
                />
              ) : (
                <div className="text-center py-8 text-red-500">
                  Failed to load flow data
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}