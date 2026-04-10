'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useDrawerStore } from '@/stores/drawerStore';

export const useRouteChangeHandler = () => {
  const pathname = usePathname();
  const { resetDrawer } = useDrawerStore();
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    const isProjectsIndex =
      pathname === '/dashboards/projects' || pathname === '/dashboards/projects/';

    if (
      prevPathnameRef.current &&
      prevPathnameRef.current.startsWith('/dashboards/projects/') &&
      prevPathnameRef.current !== '/dashboards/projects' &&
      prevPathnameRef.current !== '/dashboards/projects/create' &&
      !pathname.includes('/projects/') &&
      !pathname.startsWith('/dashboards/leads') &&
      !isProjectsIndex
    ) {
      localStorage.removeItem('isProjectOpen');
    }

    // Update the previous pathname
    prevPathnameRef.current = pathname;

    // Reset drawer state when route changes
    resetDrawer();
  }, [pathname, resetDrawer]);
};
