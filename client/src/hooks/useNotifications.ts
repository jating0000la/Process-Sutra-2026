import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationContext } from "@/contexts/NotificationContext";

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotificationContext();
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAuthenticated || sourceRef.current) return;

    const es = new EventSource("/api/notifications/stream", { withCredentials: true } as any);
    sourceRef.current = es;

    es.addEventListener("hello", () => {
      // no-op
    });

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
      } catch {}
    });

    es.onerror = () => {
      es.close();
      sourceRef.current = null;
    };

    return () => {
      es.close();
      sourceRef.current = null;
    };
  }, [isAuthenticated, toast, addNotification]);
}
