import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useBackNavigationStore } from '@/stores/backNavigationStore';

export interface BackNavigationOptions {
  isAgentDetailPage?: boolean;
}

/**
 * Hook to handle back button navigation
 * Manages both click events and browser back button
 */
export function useBackNavigation(options: BackNavigationOptions = {}) {
  const { isAgentDetailPage = false } = options;
  const { backUrl, clearBackUrl } = useBackNavigationStore();
  const router = useRouter();

  // Handle back button click
  const onBackClick = useCallback(() => {
    const currentPathname = window?.location?.pathname;

    // Special handling for agent detail page
    if (isAgentDetailPage) {
      router.push('/admin/reportings?reset=true');
      return;
    }

    if (backUrl) {
      if (backUrl !== currentPathname) {
        router.push(backUrl);
        clearBackUrl();
        return;
      }
      // backUrl matches current pathname; clear and use browser back behavior
      clearBackUrl();
    }

    if (window?.history?.length > 1) {
      if (window?.location?.hash) window?.history?.go(-2);
      else window?.history?.back();
    } else {
      window.location.href = '/dashboards';
    }
  }, [isAgentDetailPage, backUrl, clearBackUrl, router]);

  // Note: Mouse back button (popstate) is NOT intercepted here
  // It follows natural browser history created by Next/Previous buttons
  // Only UI BackButton uses onBackClick which goes directly to list page via backUrl

  return { onBackClick };
}

