import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  className?: string;
}

export default function MetricCard({ 
  title, 
  value, 
  icon, 
  trend, 
  description,
  className 
}: MetricCardProps) {
  return (
    <Card className={cn("metric-card", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg">
            {icon}
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center">
            <span className={cn(
              "text-sm flex items-center",
              trend.isPositive ? "metric-trend-positive" : "metric-trend-negative"
            )}>
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              {Math.abs(trend.value)}%
            </span>
            {description && (
              <span className="text-sm text-gray-600 ml-2">{description}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
