import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
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
        toast({
          title: `New task assigned: ${data.taskName}`,
          description: `${data.system} • ${data.orderNumber}`,
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
  }, [isAuthenticated, toast]);
}
