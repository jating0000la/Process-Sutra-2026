import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationContext } from '@/contexts/NotificationContext';

interface OrganizationData {
  id?: string;
  name?: string;
  domain?: string;
  companyName?: string;
  address?: string;
  phone?: string;
  gstNumber?: string;
  industry?: string;
  customerType?: "B2B" | "B2C" | "B2G";
  businessType?: "Trading" | "Manufacturing" | "Wholesaler" | "Retailer" | "Service Provider";
  planType?: string;
  maxUsers?: number;
  isActive?: boolean;
}

/**
 * Hook to check if organization details are incomplete and notify admin users
 * This hook should be called once at app-level (e.g., in App.tsx or Dashboard)
 */
export function useOrganizationCheck() {
  const { dbUser } = useAuth();
  const { addNotification } = useNotificationContext();
  const notificationShownRef = useRef(false);

  // Only fetch if user is an admin
  const { data: organization, isLoading } = useQuery<OrganizationData>({
    queryKey: ["/api/organizations/current"],
    enabled: !!dbUser?.organizationId && dbUser?.role === 'admin',
    staleTime: 60000, // Cache for 1 minute
  });

  useEffect(() => {
    // Only check for admin users
    if (dbUser?.role !== 'admin') {
      return;
    }

    // Skip if already shown notification or still loading
    if (notificationShownRef.current || isLoading || !organization) {
      return;
    }

    // Define required fields for organization
    const requiredFields: (keyof OrganizationData)[] = [
      'companyName',
      'address',
      'phone',
      'industry',
      'customerType',
      'businessType'
    ];

    // Check if any required field is missing or empty
    const missingFields = requiredFields.filter(
      field => !organization[field] || organization[field] === '' || organization[field] === '—'
    );

    if (missingFields.length > 0) {
      // Format field names for better readability
      const formattedFields = missingFields.map(field => {
        // Convert camelCase to readable format
        return field
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();
      });

      // Show notification
      addNotification({
        title: '⚠️ Organization Details Incomplete',
        description: `Please complete your organization profile. Missing fields: ${formattedFields.join(', ')}. Visit Profile > Organization tab.`,
        type: 'warning',
      });

      notificationShownRef.current = true;
    }
  }, [organization, isLoading, dbUser?.role, addNotification]);

  return {
    isIncomplete: organization ? 
      ['companyName', 'address', 'phone', 'industry', 'customerType', 'businessType']
        .some(field => !organization[field as keyof OrganizationData] || organization[field as keyof OrganizationData] === '' || organization[field as keyof OrganizationData] === '—')
      : false,
    organization,
    isLoading
  };
}
