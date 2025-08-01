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

  const renderFormData = (formResponse: Record<string, any> | undefined, title?: string): React.ReactElement => {
    try {
      if (!formResponse || typeof formResponse !== 'object' || Object.keys(formResponse).length === 0) {
        return (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
            <div className="text-sm text-gray-500 italic text-center">No data available</div>
          </div>
        );
      }

      // Safe function to render any value as a string
      const renderValue = (val: any): string => {
        try {
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
            return String(val);
          }
          if (typeof val === 'object') {
            try {
              return JSON.stringify(val, null, 2);
            } catch {
              return '[Complex Object]';
            }
          }
          return String(val);
        } catch {
          return '[Error displaying value]';
        }
      };

    return (
      <div className="bg-white dark:bg-gray-900 border rounded-lg overflow-hidden">
        {title && (
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white">{title}</h4>
          </div>
        )}
        <div className="p-4 space-y-3">
          {Object.entries(formResponse)
            .filter(([key]) => 
              !key.toLowerCase().includes('questionid') && 
              !key.toLowerCase().includes('questiontitle')
            )
            .map(([key, value]) => {
              const titleKey = key.replace(/answer/i, 'questionTitle');
              const displayKey = formResponse[titleKey] || 
                               key.replace(/([A-Z])/g, ' $1')
                                  .replace(/^./, str => str.toUpperCase())
                                  .replace(/answer/i, '')
                                  .trim();
              
              // Additional safety check - convert any object to safe display
              const safeValue = (() => {
                if (value === null || value === undefined) return '';
                if (typeof value === 'object' && !Array.isArray(value)) {
                  // Handle objects with answer/questionId/questionTitle pattern
                  if (value.hasOwnProperty('answer') && value.hasOwnProperty('questionId')) {
                    return value.answer || '';
                  }
                }
                return value;
              })();
              
              return (
                <div key={key} className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div className="font-medium text-sm text-gray-700 dark:text-gray-300">
                    {displayKey}
                  </div>
                  <div className="col-span-2 text-sm">
                    {Array.isArray(safeValue) && safeValue.length > 0 && typeof safeValue[0] === 'object' ? (
                      // Table display for array of objects
                      <div className="bg-white dark:bg-gray-900 border rounded overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-800 px-3 py-1 border-b">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Table Data</span>
                        </div>
                        <div className="max-h-64 overflow-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                              <tr>
                                {Object.keys(safeValue[0] || {}).map((header) => (
                                  <th key={header} className="px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300 border-r last:border-r-0">
                                    {String(header)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {safeValue.map((row, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                                  {Object.values(row || {}).map((cell, cellIndex) => (
                                    <td key={`${index}-${cellIndex}`} className="px-2 py-1 border-r last:border-r-0 text-gray-900 dark:text-gray-100">
                                      {renderValue(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : Array.isArray(safeValue) ? (
                      // Simple array display
                      <div className="space-y-1">
                        {safeValue.map((item, index) => (
                          <div key={index} className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                            <span className="text-blue-900 dark:text-blue-100">{renderValue(item)}</span>
                          </div>
                        ))}
                      </div>
                    ) : typeof safeValue === 'object' && safeValue !== null ? (
                      // Object display - ensure safe rendering
                      <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded border">
                        <div className="space-y-1">
                          {Object.entries(safeValue).map(([objKey, objValue]) => (
                            <div key={objKey} className="flex justify-between text-xs">
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {String(objKey)}:
                              </span>
                              <span className="text-gray-900 dark:text-gray-100">
                                {renderValue(objValue)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // Simple value display - ensure safe rendering
                      <span className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded border">
                        {renderValue(safeValue)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    );
    } catch (error) {
      // Fallback for any rendering errors
      return (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-600 dark:text-red-400 text-center">Error displaying form data</div>
        </div>
      );
    }
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
                      <TableCell colSpan={7} className="bg-gray-50 dark:bg-gray-800 p-4">
                        <div className="space-y-4">
                          {/* Display Initial Flow Data for first task */}
                          {index === 0 && task.initialData && Object.keys(task.initialData).length > 0 && (
                            <div key="initial-data">
                              {renderFormData(task.initialData, "Initial Flow Data")}
                            </div>
                          )}
                          
                          {/* Display Form Response Data */}
                          <div key="form-response">
                            {renderFormData(task.formResponse, "Form Response Data")}
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