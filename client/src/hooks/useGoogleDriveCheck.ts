import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { apiRequest } from '@/lib/queryClient';

interface DriveStatus {
  connected: boolean;
  hasToken: boolean;
  tokenExpiry: string | null;
}

/**
 * Hook to check if Google Drive is connected and notify admin users if not
 * This hook should be called once at app-level (e.g., in App.tsx)
 */
export function useGoogleDriveCheck() {
  const { dbUser } = useAuth();
  const { addNotification } = useNotificationContext();
  const notificationShownRef = useRef(false);

  // Only fetch if user is an admin
  const { data: driveStatus, isLoading } = useQuery<DriveStatus>({
    queryKey: ["/api/oauth/google/status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/oauth/google/status");
      return response.json();
    },
    enabled: !!dbUser?.organizationId && dbUser?.role === 'admin',
    staleTime: 60000, // Cache for 1 minute
    retry: 1, // Only retry once on failure
  });

  useEffect(() => {
    // Only check for admin users
    if (dbUser?.role !== 'admin') {
      return;
    }

    // Skip if already shown notification or still loading
    if (notificationShownRef.current || isLoading || !driveStatus) {
      return;
    }

    // Check if Google Drive is not connected
    if (!driveStatus.connected || !driveStatus.hasToken) {
      // Show notification
      addNotification({
        title: '🔗 Google Drive Not Connected',
        description: 'Connect Google Drive to enable file uploads in forms. Visit Profile > Integrations to connect.',
        type: 'warning',
      });

      notificationShownRef.current = true;
    }
  }, [driveStatus, isLoading, dbUser?.role, addNotification]);

  return {
    isConnected: driveStatus?.connected && driveStatus?.hasToken,
    driveStatus,
    isLoading
  };
}
