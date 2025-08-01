import { useState } from "react";
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

  const renderFormData = (formResponse: Record<string, any> | undefined) => {
    if (!formResponse || Object.keys(formResponse).length === 0) {
      return <div className="text-sm text-gray-500 italic">No form data submitted</div>;
    }

    return (
      <div className="space-y-3">
        {Object.entries(formResponse).map(([key, value]) => (
          <div key={key} className="border-l-2 border-blue-200 pl-3">
            <div className="font-medium text-sm text-gray-700">{key}</div>
            <div className="text-sm mt-1">
              {typeof value === 'object' && value !== null ? (
                Array.isArray(value) ? (
                  value.length > 0 ? (
                    <div className="space-y-2">
                      {value.map((item, index) => (
                        <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                          {typeof item === 'object' ? (
                            Object.entries(item).map(([itemKey, itemValue]) => (
                              <div key={itemKey} className="flex justify-between">
                                <span className="font-medium">{itemKey}:</span>
                                <span>{String(itemValue)}</span>
                              </div>
                            ))
                          ) : (
                            String(item)
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500 italic">Empty list</span>
                  )
                ) : (
                  <div className="bg-gray-50 p-2 rounded text-xs">
                    {Object.entries(value).map(([objKey, objValue]) => (
                      <div key={objKey} className="flex justify-between">
                        <span className="font-medium">{objKey}:</span>
                        <span>{String(objValue)}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <span>{String(value)}</span>
              )}
            </div>
          </div>
        ))}
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
                <>
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
                          <div className="font-medium">Step {index + 1}: {task.taskName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell className="text-sm">{task.doerEmail}</TableCell>
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
                      <TableCell colSpan={7} className="bg-gray-50 p-4">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">Form Response Data:</h4>
                          {renderFormData(task.formResponse)}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
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