import { useState } from "react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface TaskData {
  id: string;
  taskName: string;
  status: string;
  plannedTime: string;
  actualCompletionTime: string | null;
  formResponse?: Record<string, any>;
  initialData?: Record<string, any>;
  doerEmail: string;
}

interface FlowDataViewerProps {
  flowId: string;
  tasks: TaskData[];
  flowDescription?: string;
  flowInitiatedAt?: string;
  flowInitiatedBy?: string;
  orderNumber?: string;
  system?: string;
}

export default function FlowDataViewer({
  flowId,
  tasks,
  flowDescription,
  flowInitiatedAt,
  flowInitiatedBy,
  orderNumber,
  system
}: FlowDataViewerProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Not completed";
    return format(new Date(dateString), "MMM dd, yyyy 'at' hh:mm a");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      overdue: "destructive"
    };
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const renderFormData = (formResponse: any, title?: string): React.ReactElement => {
    console.log('DEBUG: renderFormData called with:', {
      formResponse: formResponse,
      type: typeof formResponse,
      keys: formResponse && typeof formResponse === 'object' ? Object.keys(formResponse) : 'not an object'
    });
    
    // Always return a safe fallback
    return (
      <div className="bg-white dark:bg-gray-900 border rounded-lg overflow-hidden">
        {title && (
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white">{String(title || 'Data')}</h4>
          </div>
        )}
        <div className="p-4">
          <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded border">
            Data display temporarily disabled for debugging
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Flow Progress View</CardTitle>
            {flowDescription && (
              <p className="text-sm text-gray-600 mt-1">{flowDescription}</p>
            )}
          </div>
          <div className="text-right text-sm text-gray-500">
            {system && <div className="font-medium">{system}</div>}
            {orderNumber && <div>Order: {orderNumber}</div>}
            {flowInitiatedAt && (
              <div>Started: {formatDateTime(flowInitiatedAt)}</div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Planned Time</TableHead>
                <TableHead>Actual Time</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task, index) => (
                <React.Fragment key={task.id}>
                  <TableRow key={task.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTaskExpansion(task.id)}
                        className="p-1 h-6 w-6"
                      >
                        {expandedTasks.has(task.id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <div>
                          <div className="font-medium">Step {index + 1}: {String(task.taskName || '')}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell className="text-sm">{String(task.doerEmail || '')}</TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(task.plannedTime)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(task.actualCompletionTime)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {task.actualCompletionTime && task.plannedTime ? (
                        (() => {
                          const planned = new Date(task.plannedTime);
                          const actual = new Date(task.actualCompletionTime);
                          const diffMs = actual.getTime() - planned.getTime();
                          const diffHours = Math.round(diffMs / (1000 * 60 * 60));
                          return diffHours > 0 ? (
                            <span className="text-red-500">+{diffHours}h late</span>
                          ) : diffHours < 0 ? (
                            <span className="text-green-500">{Math.abs(diffHours)}h early</span>
                          ) : (
                            <span className="text-blue-500">On time</span>
                          );
                        })()
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedTasks.has(task.id) && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-gray-50 dark:bg-gray-800 p-4">
                        <div className="space-y-4">
                          {/* Display Initial Flow Data for first task */}
                          {index === 0 && task.initialData && (() => {
                            try {
                              return Object.keys(task.initialData).length > 0 ? (
                                <div key="initial-data">
                                  {renderFormData(task.initialData, "Initial Flow Data")}
                                </div>
                              ) : null;
                            } catch {
                              return null;
                            }
                          })()}
                          
                          {/* Display Form Response Data */}
                          <div key="form-response">
                            {(() => {
                              try {
                                return renderFormData(task.formResponse, "Form Response Data");
                              } catch (error) {
                                console.error('Error rendering form response:', error);
                                return (
                                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                                    <div className="text-sm text-red-600 dark:text-red-400 text-center">Error displaying data</div>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          
          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No tasks found for this flow
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}