import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Crown, Zap, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface LimitCheckResult {
  allowed: boolean;
  withinLimit: boolean;
  used: number;
  limit: number;
  planName: string | null;
  message?: string;
}

/**
 * Hook to check billing limits before performing actions
 */
export function useBillingLimit(actionType: "flow_execution" | "form_submission" | "user_added") {
  const { dbUser } = useAuth();
  
  const { data, isLoading } = useQuery<LimitCheckResult>({
    queryKey: ["/api/billing/check-limit", actionType],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/billing/check-limit?actionType=${actionType}`);
      return res.json();
    },
    enabled: !!dbUser,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  return {
    isLoading,
    allowed: data?.allowed ?? true,
    withinLimit: data?.withinLimit ?? true,
    used: data?.used ?? 0,
    limit: data?.limit ?? 0,
    planName: data?.planName,
    message: data?.message,
  };
}

/**
 * Hook to track usage after billable action
 */
export function useTrackUsage() {
  return async (actionType: "flow_execution" | "form_submission" | "user_added", actionId?: string) => {
    try {
      await apiRequest("POST", "/api/billing/track-usage", { actionType, actionId });
    } catch {
      // Fail silently - don't block the action
      console.warn("[Billing] Failed to track usage:", actionType);
    }
  };
}

/**
 * Upgrade Banner - shown when limits are exceeded
 */
export function UpgradeBanner({
  actionType,
  className = "",
}: {
  actionType: "flow_execution" | "form_submission" | "user_added";
  className?: string;
}) {
  const { allowed, withinLimit, used, limit, planName, message } = useBillingLimit(actionType);
  const [, navigate] = useLocation();

  if (withinLimit || !planName) return null;

  const isBlocked = !allowed;
  const isFreeTrial = planName === "free_trial";
  const usagePercent = limit > 0 ? Math.round((used / limit) * 100) : 0;

  const actionLabel =
    actionType === "flow_execution"
      ? "flow executions"
      : actionType === "form_submission"
      ? "form submissions"
      : "users";

  return (
    <div
      className={`rounded-lg p-4 flex items-start gap-3 ${
        isBlocked
          ? "bg-red-50 border border-red-200"
          : "bg-amber-50 border border-amber-200"
      } ${className}`}
    >
      {isBlocked ? (
        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
      ) : (
        <Zap className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1">
        <h4 className={`font-semibold text-sm ${isBlocked ? "text-red-800" : "text-amber-800"}`}>
          {isBlocked
            ? "Usage Limit Reached"
            : `Exceeded Plan Limit (${used}/${limit} ${actionLabel})`}
        </h4>
        <p className={`text-sm mt-1 ${isBlocked ? "text-red-700" : "text-amber-700"}`}>
          {message ||
            (isBlocked
              ? `You have reached the free usage limit. Upgrade your plan to continue using ProcessSutra workflows.`
              : `You're using more ${actionLabel} than your plan includes. Extra charges apply.`)}
        </p>
        <Button
          size="sm"
          className="mt-2"
          variant={isBlocked ? "destructive" : "default"}
          onClick={() => navigate("/billing")}
        >
          <Crown className="w-4 h-4 mr-1" />
          {isFreeTrial ? "Upgrade Your Plan" : "View Billing"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Small inline upgrade prompt - for use in action buttons
 */
export function UpgradeInline({
  actionType,
}: {
  actionType: "flow_execution" | "form_submission" | "user_added";
}) {
  const { allowed, planName } = useBillingLimit(actionType);
  const [, navigate] = useLocation();

  if (allowed) return null;

  return (
    <div className="text-center py-3">
      <p className="text-sm text-red-600 font-medium mb-2">
        You have reached the free usage limit.
        <br />
        Upgrade your plan to continue using ProcessSutra workflows.
      </p>
      <Button size="sm" onClick={() => navigate("/billing")}>
        <ArrowUpRight className="w-4 h-4 mr-1" /> Upgrade Plan
      </Button>
    </div>
  );
}
