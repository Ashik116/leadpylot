'use client';

import { useLayoutEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { hasRouteAccess } from '@/configs/navigation.config/auth.route.config';
import Spinner from '@/components/ui/Spinner';

// Import to initialize route permissions from navigation configs
import '@/configs/navigation.config/routePermissions';

interface RouteGuardProps {
  children: React.ReactNode;
}

const RouteGuard = ({ children }: RouteGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();

  // Compute access permission using memoization instead of state
  const accessInfo = useMemo(() => {
    // If user is not authenticated
    if (!isAuthenticated || !user) {
      return { isChecking: false, hasAccess: false, shouldRedirect: false };
    }

    // Skip access check for access-denied page itself
    if (pathname === '/access-denied') {
      return { isChecking: false, hasAccess: true, shouldRedirect: false };
    }

    // Check route permissions
    const hasAccessToRoute = hasRouteAccess(pathname, user.role);

    return {
      isChecking: false,
      hasAccess: hasAccessToRoute,
      shouldRedirect: !hasAccessToRoute,
    };
  }, [pathname, user, isAuthenticated]);

  // Handle redirect using useEffect
  useLayoutEffect(() => {
    if (accessInfo.shouldRedirect) {
      router.replace('/access-denied');
    }
  }, [accessInfo.shouldRedirect, router]);

  // Show loading spinner while checking permissions
  if (accessInfo.isChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // If user is not authenticated, let the auth system handle it
  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  // If user has access, render children
  if (accessInfo.hasAccess) {
    return <>{children}</>;
  }

  // If no access, show loading while redirecting
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
};

export default RouteGuard;
