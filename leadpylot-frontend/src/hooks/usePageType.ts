import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { detectPageType, type PageType } from '@/configs/filter.config';

/**
 * Maps tab values (e.g. from UnifiedDashboard) to path patterns that detectPageType understands.
 * Tab values like 'offer' don't match pathPattern 'offers', so we normalize them.
 */
const TAB_TO_PATH_MAP: Record<string, string> = {
  offer: 'offers',
  'out-offer': 'out-offers',
  opening: 'openings',
  confirmation: 'confirmation',
  payment: 'payment',
  netto: 'netto',
  netto1: 'netto',
  netto2: 'netto',
  holds: 'holds',
  termin: 'termin',
  'project_leads': '/dashboards/projects/',
};

export interface UsePageTypeOptions {
  /** Override pathname when effective context is a tab (e.g. UnifiedDashboard). */
  currentTab?: string;
}

export interface UsePageTypeResult {
  pageType: PageType | null;
  isOffersPage: boolean;
  isOutOffersPage: boolean;
  isOpeningsPage: boolean;
  isConfirmationsPage: boolean;
  isPaymentsPage: boolean;
  isNettoPage: boolean;
  isHoldsPage: boolean;
  isTerminPage: boolean;
  isLeadsPage: boolean;
  isLeadsBankPage: boolean;
  isLiveLeadsPage: boolean;
  isRecycleLeadsPage: boolean;
  isArchivedPage: boolean;
  isTodoPage: boolean;
  isPendingLeadsPage: boolean;
}

/**
 * Centralized page type detection from pathname or current tab.
 * Use when you need page-type flags without full filter chain logic.
 *
 * @param options.currentTab - When provided, overrides pathname for detection (e.g. 'offer', 'opening').
 * @returns Page type and boolean flags for each known page.
 *
 * @example
 * // From pathname
 * const { pageType, isOffersPage } = usePageType();
 *
 * @example
 * // From tab (UnifiedDashboard)
 * const { isOffersPage } = usePageType({ currentTab: selectedProgressFilter });
 */
export function usePageType(options: UsePageTypeOptions = {}): UsePageTypeResult {
  const pathname = usePathname();
  const { currentTab } = options;

  const effectivePath = useMemo(() => {
    if (currentTab) {
      return TAB_TO_PATH_MAP[currentTab] ?? currentTab;
    }
    return pathname || '';
  }, [currentTab, pathname]);

  const pageType = useMemo(() => detectPageType(effectivePath), [effectivePath]);

  return useMemo(
    () => ({
      pageType,
      isOffersPage: pageType === 'offers',
      isOutOffersPage: pageType === 'out-offers',
      isOpeningsPage: pageType === 'openings',
      isConfirmationsPage: pageType === 'confirmations',
      isPaymentsPage: pageType === 'payments',
      isNettoPage: pageType === 'netto',
      isHoldsPage: pageType === 'holds',
      isTerminPage: pageType === 'termin',
      isLeadsPage: pageType === 'leads',
      isLeadsBankPage: pageType === 'leads-bank',
      isLiveLeadsPage: pageType === 'live-leads',
      isRecycleLeadsPage: pageType === 'recycle-leads',
      isArchivedPage: pageType === 'archived',
      isTodoPage: pageType === 'todo',
      isPendingLeadsPage: pageType === 'pending-leads',
    }),
    [pageType]
  );
}
