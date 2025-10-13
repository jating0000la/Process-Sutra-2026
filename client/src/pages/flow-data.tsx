import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Eye, Filter, StopCircle, Play } from "lucide-react";
import FlowDataViewer from "@/components/flow-data-viewer";
import { queryClient } from "@/lib/queryClient";

interface FlowSummary {
  flowId: string;
  system: string;
  orderNumber?: string;
  description?: string;
  initiatedAt?: string;
  initiatedBy?: string;
  taskCount: number;
  completedTasks: number;
  cancelledTasks: number;
  status: 'completed' | 'in-progress' | 'pending' | 'stopped';
}

export default function FlowData() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [systemFilter, setSystemFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);
  const [flowToStop, setFlowToStop] = useState<FlowSummary | null>(null);
  const [stopReason, setStopReason] = useState("");
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [flowToResume, setFlowToResume] = useState<FlowSummary | null>(null);
  const [resumeReason, setResumeReason] = useState("");

  // Check if user is admin or manager
  const isAdmin = (user as any)?.role === 'admin' || (user as any)?.role === 'manager';

  // Check for system parameter in URL and set filter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const systemParam = urlParams.get('system');
    if (systemParam) {
      setSystemFilter(systemParam);
    }
  }, []);

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

  // Stop flow mutation
  const stopFlowMutation = useMutation({
    mutationFn: async ({ flowId, reason }: { flowId: string; reason: string }) => {
      const response = await fetch(`/api/flows/${flowId}/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to stop flow");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Flow Stopped",
        description: data.message || "Flow has been stopped successfully",
      });
      // Refresh tasks and close dialogs
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/flows"] });
      setIsStopDialogOpen(false);
      setFlowToStop(null);
      setStopReason("");
      setSelectedFlowId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Resume flow mutation
  const resumeFlowMutation = useMutation({
    mutationFn: async ({ flowId, reason }: { flowId: string; reason: string }) => {
      const response = await fetch(`/api/flows/${flowId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to resume flow");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Flow Resumed",
        description: data.message || "Flow has been resumed successfully",
      });
      // Refresh tasks and close dialogs
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/flows"] });
      setIsResumeDialogOpen(false);
      setFlowToResume(null);
      setResumeReason("");
      setSelectedFlowId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStopFlow = (flow: FlowSummary) => {
    setFlowToStop(flow);
    setIsStopDialogOpen(true);
  };

  const confirmStopFlow = () => {
    if (flowToStop) {
      stopFlowMutation.mutate({
        flowId: flowToStop.flowId,
        reason: stopReason,
      });
    }
  };

  const handleResumeFlow = (flow: FlowSummary) => {
    setFlowToResume(flow);
    setIsResumeDialogOpen(true);
  };

  const confirmResumeFlow = () => {
    if (flowToResume) {
      resumeFlowMutation.mutate({
        flowId: flowToResume.flowId,
        reason: resumeReason,
      });
    }
  };

  if (isLoading || tasksLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col">
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
      pending: "outline",
      stopped: "destructive"
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
       
<Header 
  title="Flow Data" 
  description="Comprehensive view of task flows, form responses, and progress tracking"
/>

        <main className="flex-1 p-6 space-y-6">
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
                    <SelectItem value="stopped">Stopped</SelectItem>
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
                      className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div 
                          className="space-y-2 flex-1 cursor-pointer"
                          onClick={() => setSelectedFlowId(flow.flowId)}
                        >
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
                        <div className="text-right flex flex-col items-end gap-2">
                          <div className="text-sm font-medium">
                            {flow.completedTasks}/{flow.taskCount} tasks completed
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round((flow.completedTasks/flow.taskCount) * 100)}% complete
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setSelectedFlowId(flow.flowId)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            {isAdmin && flow.status !== 'completed' && (
                              flow.status === 'stopped' ? (
                                <Button
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResumeFlow(flow);
                                  }}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Resume Flow
                                </Button>
                              ) : (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStopFlow(flow);
                                  }}
                                >
                                  <StopCircle className="h-4 w-4 mr-1" />
                                  Stop Flow
                                </Button>
                              )
                            )}
                          </div>
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
              <div className="flex items-center justify-between mb-4">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedFlowId(null)}
                >
                  ← Back to Flow List
                </Button>
                
                {/* Stop/Resume Flow button in detailed view */}
                {isAdmin && selectedFlowData && (
                  (() => {
                    const flowSummary = flowSummaries.find(f => f.flowId === selectedFlowId);
                    const hasActiveTasks = selectedFlowData.tasks?.some((t: any) => t.status !== 'completed' && t.status !== 'cancelled');
                    const hasCancelledTasks = selectedFlowData.tasks?.some((t: any) => t.status === 'cancelled');
                    
                    if (flowSummary) {
                      if (flowSummary.status === 'stopped' && hasCancelledTasks) {
                        return (
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleResumeFlow(flowSummary)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Resume This Flow
                          </Button>
                        );
                      } else if (hasActiveTasks) {
                        return (
                          <Button
                            variant="destructive"
                            onClick={() => handleStopFlow(flowSummary)}
                          >
                            <StopCircle className="h-4 w-4 mr-2" />
                            Stop This Flow
                          </Button>
                        );
                      }
                    }
                    return null;
                  })()
                )}
              </div>
              
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

          {/* Stop Flow Confirmation Dialog */}
          <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Stop Flow?</DialogTitle>
                <DialogDescription>
                  This will cancel all pending and in-progress tasks for this flow. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              
              {flowToStop && (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                    <div className="text-sm">
                      <span className="font-semibold">System:</span> {flowToStop.system}
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold">Order Number:</span> {flowToStop.orderNumber}
                    </div>
                    {flowToStop.description && (
                      <div className="text-sm">
                        <span className="font-semibold">Description:</span> {flowToStop.description}
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="font-semibold">Progress:</span> {flowToStop.completedTasks}/{flowToStop.taskCount} tasks completed
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stopReason">Reason for stopping (optional)</Label>
                    <Textarea
                      id="stopReason"
                      placeholder="Enter reason for stopping this flow..."
                      value={stopReason}
                      onChange={(e) => setStopReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsStopDialogOpen(false);
                    setFlowToStop(null);
                    setStopReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmStopFlow}
                  disabled={stopFlowMutation.isPending}
                >
                  {stopFlowMutation.isPending ? "Stopping..." : "Stop Flow"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Resume Flow Confirmation Dialog */}
          <Dialog open={isResumeDialogOpen} onOpenChange={setIsResumeDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resume Flow?</DialogTitle>
                <DialogDescription>
                  This will restore all cancelled tasks back to pending status and allow the flow to continue.
                </DialogDescription>
              </DialogHeader>
              
              {flowToResume && (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                    <div className="text-sm">
                      <span className="font-semibold">System:</span> {flowToResume.system}
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold">Order Number:</span> {flowToResume.orderNumber}
                    </div>
                    {flowToResume.description && (
                      <div className="text-sm">
                        <span className="font-semibold">Description:</span> {flowToResume.description}
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="font-semibold">Progress:</span> {flowToResume.completedTasks}/{flowToResume.taskCount} tasks completed
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold">Cancelled Tasks:</span> {flowToResume.cancelledTasks} task(s) will be resumed
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resumeReason">Reason for resuming (optional)</Label>
                    <Textarea
                      id="resumeReason"
                      placeholder="Enter reason for resuming this flow..."
                      value={resumeReason}
                      onChange={(e) => setResumeReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsResumeDialogOpen(false);
                    setFlowToResume(null);
                    setResumeReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={confirmResumeFlow}
                  disabled={resumeFlowMutation.isPending}
                >
                  {resumeFlowMutation.isPending ? "Resuming..." : "Resume Flow"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}