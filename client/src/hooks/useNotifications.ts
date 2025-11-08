import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { useQueryClient } from "@tanstack/react-query";

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotificationContext();
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Exponential backoff delays in milliseconds
  const reconnectDelays = [1000, 2000, 5000, 10000, 30000];

  useEffect(() => {
    if (!isAuthenticated) return;

    const connect = () => {
      // Clear any existing connection
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }

      setConnectionStatus('connecting');
      const es = new EventSource("/api/notifications/stream", { withCredentials: true } as any);
      sourceRef.current = es;

      es.addEventListener("hello", () => {
        console.log('[Notifications] Connected to SSE stream');
        setConnectionStatus('connected');
        reconnectAttemptRef.current = 0; // Reset reconnection counter on successful connection
        
        // Show connection toast only if this is a reconnection
        if (reconnectAttemptRef.current > 0) {
          toast({
            title: "Reconnected",
            description: "Notification system is back online",
          });
        }
      });

      es.onopen = () => {
        console.log('[Notifications] SSE connection opened');
        setConnectionStatus('connected');
        reconnectAttemptRef.current = 0;
      };

      es.addEventListener("flow-started", (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data);
          
          // Show toast notification
          toast({
            title: `New task assigned: ${data.taskName}`,
            description: `${data.system} • ${data.orderNumber}`,
          });

          // Add to notification context for the bell icon
          addNotification({
            title: `New task assigned: ${data.taskName}`,
            description: `${data.system} • ${data.orderNumber}`,
            type: 'info',
          });

          // Invalidate cached queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
          queryClient.invalidateQueries({ queryKey: ["/api/analytics/metrics"] });
        } catch (error) {
          console.error('[Notifications] Error handling flow-started:', error, ev.data);
        }
      });

      // NEW: task-cancelled event handler
      es.addEventListener("task-cancelled", (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data);
          
          toast({
            title: "Task Cancelled",
            description: `${data.taskName} has been cancelled`,
            variant: "destructive",
          });

          addNotification({
            title: "Task Cancelled",
            description: `${data.taskName} • ${data.reason || 'Cancelled by admin'}`,
            type: 'error',
          });

          // Invalidate cached queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
          queryClient.invalidateQueries({ queryKey: ["/api/flows"] });
        } catch (error) {
          console.error('[Notifications] Error handling task-cancelled:', error, ev.data);
        }
      });

      // NEW: task-resumed event handler
      es.addEventListener("task-resumed", (ev: MessageEvent) => {
        try {
          const data = JSON.parse(ev.data);
          
          toast({
            title: "Task Resumed",
            description: `${data.taskName} is now active`,
          });

          addNotification({
            title: "Task Resumed",
            description: `${data.taskName} • ${data.reason || 'Resumed by admin'}`,
            type: 'success',
          });

          // Invalidate cached queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
          queryClient.invalidateQueries({ queryKey: ["/api/flows"] });
        } catch (error) {
          console.error('[Notifications] Error handling task-resumed:', error, ev.data);
        }
      });

      es.onerror = () => {
        console.error('[Notifications] SSE connection error');
        setConnectionStatus('disconnected');
        es.close();
        sourceRef.current = null;

        // Implement exponential backoff reconnection
        const delay = reconnectDelays[Math.min(reconnectAttemptRef.current, reconnectDelays.length - 1)];
        console.log(`[Notifications] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1})`);
        
        reconnectAttemptRef.current++;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isAuthenticated) {
            console.log('[Notifications] Attempting to reconnect...');
            connect();
          }
        }, delay);
      };
    };

    // Start initial connection
    connect();

    return () => {
      console.log('[Notifications] Cleaning up SSE connection');
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, toast, addNotification]);

  return { connectionStatus };
}
