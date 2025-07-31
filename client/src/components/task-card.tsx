import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertTriangle, Eye, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: {
    id: string;
    taskName: string;
    system: string;
    flowId: string;
    plannedTime: string;
    actualTime?: string;
    status: string;
    formId?: string;
    orderNumber?: string;
  };
  onViewDetails?: (task: any) => void;
  showActions?: boolean;
}

export default function TaskCard({ task, onViewDetails, showActions = true }: TaskCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "overdue":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "status-completed";
      case "overdue":
        return "status-overdue";
      case "in_progress":
        return "status-in-progress";
      default:
        return "status-pending";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100";
      case "overdue":
        return "bg-red-100";
      case "in_progress":
        return "bg-blue-100";
      default:
        return "bg-yellow-100";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const isOverdue = (plannedTime: string, status: string) => {
    if (status === "completed") return false;
    return new Date(plannedTime) < new Date();
  };

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={cn("p-2 rounded-lg", getStatusBg(task.status))}>
            {task.formId ? (
              <FileText className="w-4 h-4 text-primary" />
            ) : (
              getStatusIcon(task.status)
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">{task.taskName}</h3>
            <p className="text-sm text-gray-600">System: {task.system}</p>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-xs text-gray-500">Flow ID: {task.flowId}</span>
              <span className={cn(
                "text-xs",
                isOverdue(task.plannedTime, task.status) && task.status !== "completed"
                  ? "text-red-600 font-medium"
                  : "text-gray-500"
              )}>
                {task.status === "completed" && task.actualTime
                  ? `Completed: ${formatDate(task.actualTime)}`
                  : isOverdue(task.plannedTime, task.status)
                  ? `Overdue: ${formatDate(task.plannedTime)}`
                  : `Due: ${formatDate(task.plannedTime)}`
                }
              </span>
              {task.orderNumber && (
                <span className="text-xs text-gray-500">Order: {task.orderNumber}</span>
              )}
            </div>
          </div>
        </div>
        {showActions && (
          <div className="flex items-center space-x-3">
            <Badge className={getStatusColor(task.status)}>
              {task.status.replace('_', ' ')}
            </Badge>
            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(task)}
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
