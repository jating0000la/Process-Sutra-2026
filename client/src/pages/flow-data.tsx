import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Search, Download, Eye } from "lucide-react";

interface FlowData {
  flowId: string;
  system: string;
  orderNumber?: string;
  tasks: any[];
  formResponses: any[];
  createdAt: string;
}

export default function FlowData() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFlows, setExpandedFlows] = useState<Set<string>>(new Set());

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

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  const { data: formResponses, isLoading: responsesLoading } = useQuery({
    queryKey: ["/api/form-responses"],
    enabled: isAuthenticated,
  });

  if (isLoading || tasksLoading || responsesLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
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

  // Group data by flow ID
  const flowData: Record<string, FlowData> = {};
  
  // Group tasks by flow ID
  (tasks || []).forEach((task: any) => {
    if (!flowData[task.flowId]) {
      flowData[task.flowId] = {
        flowId: task.flowId,
        system: task.system,
        orderNumber: task.orderNumber,
        tasks: [],
        formResponses: [],
        createdAt: task.createdAt,
      };
    }
    flowData[task.flowId].tasks.push(task);
  });

  // Group form responses by flow ID
  (formResponses || []).forEach((response: any) => {
    const task = (tasks || []).find((t: any) => t.id === response.taskId);
    if (task && flowData[task.flowId]) {
      flowData[task.flowId].formResponses.push({
        ...response,
        taskName: task.taskName,
      });
    }
  });

  const flows = Object.values(flowData).sort((a: FlowData, b: FlowData) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Filter flows based on search term
  const filteredFlows = flows.filter((flow: FlowData) => 
    flow.flowId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    flow.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    flow.system.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFlow = (flowId: string) => {
    const newExpanded = new Set(expandedFlows);
    if (newExpanded.has(flowId)) {
      newExpanded.delete(flowId);
    } else {
      newExpanded.add(flowId);
    }
    setExpandedFlows(newExpanded);
  };

  const exportFlowData = (flow: FlowData) => {
    const data = {
      flowId: flow.flowId,
      system: flow.system,
      orderNumber: flow.orderNumber,
      createdAt: flow.createdAt,
      tasks: flow.tasks.map((task: any) => ({
        taskName: task.taskName,
        status: task.status,
        doer: task.doer,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      })),
      formResponses: flow.formResponses.map((response: any) => ({
        taskName: response.taskName,
        submittedAt: response.submittedAt,
        data: response.data,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-${flow.flowId}-${flow.orderNumber || 'data'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Flow Data Viewer</h1>
              <p className="text-gray-600">View all form data organized by Order Number and Flow ID</p>
            </div>

            {/* Search and filters */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by Flow ID, Order Number, or System..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Flow data cards */}
            <div className="space-y-4">
              {filteredFlows.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500">No flow data found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredFlows.map((flow: FlowData) => (
                  <Card key={flow.flowId}>
                    <Collapsible 
                      open={expandedFlows.has(flow.flowId)}
                      onOpenChange={() => toggleFlow(flow.flowId)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              {expandedFlows.has(flow.flowId) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <div>
                                <CardTitle className="text-lg">
                                  {flow.orderNumber ? `Order: ${flow.orderNumber}` : `Flow: ${flow.flowId.slice(0, 8)}`}
                                </CardTitle>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline">{flow.system}</Badge>
                                  <span className="text-sm text-gray-500">
                                    {flow.tasks.length} tasks, {flow.formResponses.length} forms
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    Created: {new Date(flow.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportFlowData(flow);
                                }}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Export
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Tasks */}
                            <div>
                              <h3 className="font-semibold mb-3">Tasks ({flow.tasks.length})</h3>
                              <div className="space-y-2">
                                {flow.tasks.map((task) => (
                                  <div key={task.id} className="border rounded p-3 bg-white">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium">{task.taskName}</span>
                                      <Badge variant={
                                        task.status === 'Completed' ? 'default' :
                                        task.status === 'In Progress' ? 'secondary' :
                                        task.status === 'Overdue' ? 'destructive' : 'outline'
                                      }>
                                        {task.status}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      <p>Assigned to: {task.doer}</p>
                                      <p>Created: {new Date(task.createdAt).toLocaleString()}</p>
                                      {task.completedAt && (
                                        <p>Completed: {new Date(task.completedAt).toLocaleString()}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Form Responses */}
                            <div>
                              <h3 className="font-semibold mb-3">Form Data ({flow.formResponses.length})</h3>
                              <div className="space-y-2">
                                {flow.formResponses.length === 0 ? (
                                  <p className="text-gray-500 text-sm">No form data available</p>
                                ) : (
                                  flow.formResponses.map((response) => (
                                    <div key={response.id} className="border rounded p-3 bg-white">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">{response.taskName}</span>
                                        <span className="text-xs text-gray-500">
                                          {new Date(response.submittedAt).toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="text-sm space-y-1">
                                        {Object.entries(response.data || {}).map(([key, value]) => (
                                          <div key={key} className="flex">
                                            <span className="font-medium text-gray-600 mr-2 min-w-0 flex-shrink-0">
                                              {key}:
                                            </span>
                                            <span className="text-gray-800 break-words">
                                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}