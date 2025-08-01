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
    try {
      // Handle null/undefined
      if (!formResponse) {
        return (
          <div className="bg-white dark:bg-gray-900 border rounded-lg overflow-hidden">
            {title && (
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b">
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">{String(title)}</h4>
              </div>
            )}
            <div className="p-4">
              <div className="text-sm text-gray-500 italic text-center">No data available</div>
            </div>
          </div>
        );
      }

      // Check if data looks like a table row (object with multiple string/number values)
      const isTableRowObject = (data: any): boolean => {
        if (typeof data !== 'object' || Array.isArray(data) || !data) return false;
        const values = Object.values(data);
        return values.length > 1 && values.every(v => 
          typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
        );
      };

      // Render table format for objects that look like table rows
      const renderTableObject = (data: any): React.ReactElement => {
        const entries = Object.entries(data).filter(([key]) => 
          !key.toLowerCase().includes('questionid')
        );
        
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {entries.map(([key]) => (
                    <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                      {String(key).replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-gray-900">
                  {entries.map(([key, value]) => (
                    <td key={key} className="px-3 py-2 text-sm text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
                      {String(value || '')}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        );
      };

      // Try to parse JSON strings that might be objects
      const parseIfJsonString = (data: any): any => {
        if (typeof data === 'string' && (data.startsWith('{') || data.startsWith('['))) {
          try {
            return JSON.parse(data);
          } catch {
            return data; // Return original string if parsing fails
          }
        }
        return data;
      };

      // Safe conversion function that handles the {answer, questionId, questionTitle} objects
      const convertToSafeDisplay = (data: any): string => {
        if (data === null || data === undefined) return 'No data';
        if (typeof data === 'string') return data;
        if (typeof data === 'number' || typeof data === 'boolean') return String(data);
        
        // Handle form response objects with answer property
        if (typeof data === 'object' && data.answer !== undefined) {
          return convertToSafeDisplay(data.answer);
        }
        
        // Handle arrays
        if (Array.isArray(data)) {
          return data.map(item => convertToSafeDisplay(item)).join(', ');
        }
        
        // Handle other objects
        try {
          return JSON.stringify(data, null, 2);
        } catch {
          return '[Complex data structure]';
        }
      };

      // First, try to parse the entire response if it's a JSON string
      const parsedFormResponse = parseIfJsonString(formResponse);
      
      // Check if it's an object with keys (after potential parsing)
      const isObjectWithData = typeof parsedFormResponse === 'object' && !Array.isArray(parsedFormResponse);
      
      if (isObjectWithData && Object.keys(parsedFormResponse).length > 0) {
        return (
          <div className="bg-white dark:bg-gray-900 border rounded-lg overflow-hidden">
            {title && (
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b">
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">{String(title)}</h4>
              </div>
            )}
            <div className="p-4">
              {isTableRowObject(parsedFormResponse) ? (
                renderTableObject(parsedFormResponse)
              ) : (
                <div className="space-y-3">
                  {Object.entries(parsedFormResponse).map(([key, value], index) => {
                    // Skip questionId fields to hide them as requested
                    if (key.toLowerCase().includes('questionid')) return null;
                    
                    // Parse JSON strings if they look like objects/arrays
                    const parsedValue = parseIfJsonString(value);
                    
                    // Check if this value is also a table-like object (after parsing)
                    if (isTableRowObject(parsedValue)) {
                      return (
                        <div key={`${key}-${index}`} className="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-b-0">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            {String(key).replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </div>
                          {renderTableObject(parsedValue)}
                        </div>
                      );
                    }
                    
                    const displayValue = convertToSafeDisplay(parsedValue);
                    const displayKey = String(key).replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    
                    return (
                      <div key={`${key}-${index}`} className="border-b border-gray-100 dark:border-gray-700 pb-2 last:border-b-0">
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {displayKey}
                        </div>
                        <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded">
                          {displayValue}
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              )}
            </div>
          </div>
        );
      }

      // Handle non-object data
      const displayValue = convertToSafeDisplay(parsedFormResponse);
      return (
        <div className="bg-white dark:bg-gray-900 border rounded-lg overflow-hidden">
          {title && (
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b">
              <h4 className="font-medium text-sm text-gray-900 dark:text-white">{String(title)}</h4>
            </div>
          )}
          <div className="p-4">
            <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded">
              {displayValue}
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Form data rendering error:', error);
      return (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-600 dark:text-red-400 text-center">Unable to display form data</div>
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
              {tasks.map((task, index) => {
                const taskId = String(task.id);
                const isExpanded = expandedTasks.has(taskId);
                
                return [
                  <TableRow key={`task-${taskId}`} className="cursor-pointer hover:bg-gray-50">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTaskExpansion(taskId)}
                        className="p-1 h-6 w-6"
                      >
                        {isExpanded ? (
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
                          <div className="font-medium">
                            Step {index + 1}: {String(task.taskName || '')}
                          </div>
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
                      {task.actualCompletionTime && task.plannedTime ? (() => {
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
                      })() : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>,
                  ...(isExpanded ? [
                    <TableRow key={`expanded-${taskId}`}>
                      <TableCell colSpan={7} className="bg-gray-50 dark:bg-gray-800 p-4">
                        <div className="space-y-4">
                          {/* Display Initial Flow Data for first task */}
                          {index === 0 && task.initialData && (() => {
                            try {
                              return Object.keys(task.initialData).length > 0 ? 
                                renderFormData(task.initialData, "Initial Flow Data") : null;
                            } catch {
                              return null;
                            }
                          })()}
                          
                          {/* Display Form Response Data */}
                          {renderFormData(task.formResponse, "Form Response Data")}
                        </div>
                      </TableCell>
                    </TableRow>
                  ] : [])
                ];
              }).flat()}
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