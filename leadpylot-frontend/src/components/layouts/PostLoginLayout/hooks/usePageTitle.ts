import { useMemo, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { usePageInfoStore } from '@/stores/pageInfoStore';
import { getTitleFromPathname } from '../utils/titleMapping';

export interface PageInfo {
  title?: string;
  subtitle?: string;
  total?: number;
}

/**
 * Hook to manage page title derivation
 * Combines stored page info with pathname-derived title
 * Clears stale store data on route changes
 */
export function usePageTitle() {
  const pathname = usePathname();
  const { pageInfo, clearPageInfo } = usePageInfoStore();
  const previousPathnameRef = useRef<string | null>(null);

  // Derive title from pathname - this ALWAYS updates with pathname changes
  const derivedTitle = useMemo(() => {
    return getTitleFromPathname(pathname);
  }, [pathname]);

  // Clear pageInfo store when pathname changes to prevent stale data
  useEffect(() => {
    if (previousPathnameRef.current !== null && previousPathnameRef.current !== pathname) {
      // Pathname changed - clear store to show derived title immediately
      clearPageInfo();
    }
    previousPathnameRef.current = pathname;
  }, [pathname, clearPageInfo]);

  // Merge page info with derived title
  // Priority: Use explicit title from pageInfo if provided, otherwise use pathname-derived title
  const finalPageInfo = useMemo(() => {
    // Use explicit title from pageInfo if provided, otherwise use pathname-derived title
    const baseInfo: PageInfo = {
      title: pageInfo?.title || derivedTitle,
    };

    // Merge subtitle and total from store if available
    if (pageInfo) {
      if (pageInfo.subtitle) {
        baseInfo.subtitle = pageInfo.subtitle;
      }
      if (typeof pageInfo.total !== 'undefined') {
        baseInfo.total = pageInfo.total;
      }
    }

    return baseInfo.title ? baseInfo : undefined;
  }, [pageInfo, derivedTitle]);

  return finalPageInfo;
}
