'use client';

import { useApiUrlRouteHandler } from '@/hooks/useApiUrlRouteHandler';

/**
 * Provider component that handles apiUrl route management globally
 * This ensures apiUrl is cleared when navigating away from lead detail pages
 */
export function ApiUrlRouteProvider({ children }: { children: React.ReactNode }) {
  // Use the hook to handle route-based apiUrl management
  useApiUrlRouteHandler();

  return <>{children}</>;
}
