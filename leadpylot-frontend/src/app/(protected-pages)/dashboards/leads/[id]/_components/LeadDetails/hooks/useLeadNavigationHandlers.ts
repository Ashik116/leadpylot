import { useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useKeyboardNavigation } from './useKeyboardNavigation';

interface UseLeadNavigationHandlersProps {
  leadId: string;
  lead: any;
  queueNavigation?: any;
  navigation: any;
  actions: any;
  completeTopLead: any;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  onNavigateComplete?: () => void;
  onStatusUpdated?: () => void;
}

export const useLeadNavigationHandlers = ({
  leadId,
  lead,
  queueNavigation,
  navigation,
  actions,
  completeTopLead,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateComplete,
}: UseLeadNavigationHandlersProps) => {
  const router = useRouter();
  const pathname = usePathname();

  // Memoize callback functions to prevent re-creation
  const memoizedOnPrevious = useCallback(() => {
    if (onNavigatePrevious) {
      onNavigatePrevious();
    } else if (queueNavigation?.previous_lead_id) {
      router.push(`/dashboards/leads/${queueNavigation?.previous_lead_id}`);
    } else {
      navigation?.goToPreviousUser();
    }
  }, [onNavigatePrevious, queueNavigation, navigation, router]);

  const memoizedOnNext = useCallback(async () => {
    if (onNavigateNext) {
      onNavigateNext();
    } else if (queueNavigation) {
      if (queueNavigation?.can_complete && queueNavigation?.is_current_top) {
        try {
          await completeTopLead.mutateAsync({ lead_id: leadId });
          router.push(`${pathname}?refresh=${Date.now()}`);
        } catch (error) {
          console.error('Failed to complete top lead:', error);
        }
      } else if (queueNavigation?.next_lead_id) {
        if (queueNavigation?.next_is_current_top) {
          router.push('/dashboards/agent-live-lead/live');
        } else {
          router.push(`/dashboards/leads/${queueNavigation?.next_lead_id}`);
        }
      }
    } else if ((lead as any)?.is_on_top) {
      try {
        await completeTopLead.mutateAsync({ lead_id: leadId });
      } catch (error) {
        console.error('Failed to complete top lead:', error);
      }
    } else {
      navigation.goToNextUser();
    }
  }, [
    onNavigateNext,
    queueNavigation,
    navigation,
    lead,
    leadId,
    completeTopLead,
    router,
    pathname,
  ]);

  const memoizedOnDelete = useCallback(() => actions.openDeleteDialog(), [actions]);

  const handlePermanentDelete = useCallback(async () => {
    const data = await actions.permanentDelete.mutateAsync([leadId]);
    if (data.status === 'success') router.back();
  }, [actions.permanentDelete, leadId, router]);

  const memoizedOnComplete = useCallback(async () => {
    if (onNavigateComplete) {
      try {
        await completeTopLead.mutateAsync({ lead_id: leadId });
        onNavigateComplete();
      } catch (error) {
        console.error('Failed to complete lead:', error);
      }
    } else if (queueNavigation?.can_complete && leadId) {
      try {
        await completeTopLead.mutateAsync({ lead_id: leadId });
        router.push('/dashboards/agent-live-lead/live');
      } catch (error) {
        console.error('Failed to complete lead:', error);
      }
    }
  }, [onNavigateComplete, queueNavigation, leadId, completeTopLead, router]);

  // Keyboard navigation handler
  useKeyboardNavigation({
    onPrevious: memoizedOnPrevious,
    onNext: memoizedOnNext,
    canGoToPrevious: navigation.canGoToPrevious,
    canGoToNext: navigation.canGoToNext,
    queueNavigation,
    lead,
  });

  // Mouse back/forward button navigation handler
  const navigationHistoryRef = useRef<string[]>([]);
  const currentHistoryIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (leadId && pathname) {
      const currentUrl = pathname;
      const history = navigationHistoryRef.current;
      const currentIndex = currentHistoryIndexRef.current;
      const existingIndex = history.indexOf(currentUrl);

      if (existingIndex === -1) {
        if (currentIndex < history.length - 1) {
          navigationHistoryRef.current = history.slice(0, currentIndex + 1);
        }
        navigationHistoryRef.current.push(currentUrl);
        currentHistoryIndexRef.current = navigationHistoryRef.current.length - 1;
      } else {
        currentHistoryIndexRef.current = existingIndex;
      }
    }
  }, [leadId, pathname]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const currentUrl = window.location.pathname;
      const history = navigationHistoryRef.current;
      const currentIndex = currentHistoryIndexRef.current;
      const urlIndex = history.indexOf(currentUrl);
      const isForward = urlIndex > currentIndex;
      const isBack = urlIndex < currentIndex;

      const canGoPrevious = queueNavigation
        ? queueNavigation.has_previous
        : navigation?.canGoToPrevious;
      const canGoNext = queueNavigation
        ? queueNavigation.has_next
        : navigation?.canGoToNext || (lead as any)?.is_on_top;

      if (isBack && canGoPrevious) {
        event.preventDefault();
        event.stopPropagation();
        currentHistoryIndexRef.current = Math.max(0, currentIndex - 1);
        memoizedOnPrevious();
        return;
      }

      if (isForward && canGoNext) {
        event.preventDefault();
        event.stopPropagation();
        currentHistoryIndexRef.current = Math.min(history.length - 1, currentIndex + 1);
        memoizedOnNext();
        return;
      }

      if (urlIndex >= 0) {
        currentHistoryIndexRef.current = urlIndex;
      }
    };

    window.addEventListener('popstate', handlePopState, true);
    return () => window.removeEventListener('popstate', handlePopState, true);
  }, [
    memoizedOnPrevious,
    memoizedOnNext,
    queueNavigation,
    navigation?.canGoToPrevious,
    navigation?.canGoToNext,
    lead,
  ]);

  return {
    onPrevious: memoizedOnPrevious,
    onNext: memoizedOnNext,
    onDelete: memoizedOnDelete,
    onComplete: memoizedOnComplete,
    handlePermanentDelete,
  };
};
