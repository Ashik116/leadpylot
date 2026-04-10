import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useApiUrlStore } from '@/stores/apiUrlStore';

/**
 * Custom hook to manage apiUrl based on route changes
 * - Clears apiUrl when navigating away from lead detail pages
 * - Preserves apiUrl when staying within lead detail pages.
 */
export const useApiUrlRouteHandler = () => {
  const pathname = usePathname();
  const { apiUrl, clearApiUrl } = useApiUrlStore();

  useEffect(() => {
    // Check if current route is a lead-related page (details or main leads page)
    const isLeadDetailsPage = pathname.match(/^\/dashboards\/leads\/[a-f0-9]{24}$/i);
    const isProjectsPage = pathname.match(/^\/dashboards\/projects\/[a-f0-9]{24}$/i);
    const isLeadsPage = pathname === '/dashboards/leads';
    const isLeadsBankPage = pathname === '/dashboards/leads-bank';
    const isOffersPage = pathname === '/dashboards/offers';
    const isOpeningsPage = pathname === '/dashboards/openings';
    const isPaymentPage = pathname === '/dashboards/payment';
    const isTodoPage = pathname === '/dashboards/todo';
    const isArchivedPage = pathname === '/dashboards/leads/archived';
    const isPendingLeadsPage = pathname === '/dashboards/leads/pending-leads';
    const isLiveLeadsPage = pathname === '/dashboards/live-leads';
    const isRecycleLeadsPage = pathname === '/dashboards/recycle-leads';
    const isTerminLeadsPage = pathname === '/dashboards/termin';
    /** Close-project lead bank keeps the same /closed-leads apiUrl for lead details navigation */
    const isCloseProjectsLeadBank =
      pathname?.includes('/dashboards/projects/close-projects/') ?? false;
    const isLeadRelatedPage =
      isLeadDetailsPage ||
      isLeadsPage ||
      isLeadsBankPage ||
      isProjectsPage ||
      isCloseProjectsLeadBank ||
      isArchivedPage ||
      isPendingLeadsPage ||
      isLiveLeadsPage ||
      isRecycleLeadsPage ||
      isTerminLeadsPage ||
      isOffersPage ||
      isOpeningsPage ||
      isPaymentPage ||
      isTodoPage;

    // If we have an apiUrl and we're NOT on a lead-related page, clear it
    if (apiUrl && !isLeadRelatedPage) {
      clearApiUrl();
    }
  }, [pathname, apiUrl, clearApiUrl]);

  return { apiUrl };
};
