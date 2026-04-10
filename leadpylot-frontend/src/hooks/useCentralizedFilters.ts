/**
 * Centralized filters hook – page detection and default/role-based filters from filter.config.
 *
 * @remarks
 * - Uses pathname or currentTab as effective path; currentTab maps to path patterns for detectPageType.
 * - Returns pageType, defaultFilters, roleBasedFilters, defaultGroupBy, allPageFilters from filter.config.
 * - Lighter than useFilterChainLeads: no filter chain state, no buildApiFilters; use when only config-derived filters are needed.
 *
 * @see docs/GROUPING_AND_FILTERING_GUIDE.md
 */
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { FilterRule } from '@/stores/filterChainStore';
import { Role } from '@/configs/navigation.config/auth.route.config';
import {
  getPageFilters,
  buildCompleteFilters,
  detectPageType,
  PageType,
} from '@/configs/filter.config';

interface UseCentralizedFiltersProps {
  pendingLeadsComponent?: boolean;
  currentTab?: string; // For tab-based page detection
}

interface UseCentralizedFiltersResult {
  // Page detection
  pageType: PageType | null;
  isLiveLeadsPage: boolean;
  isRecycleLeadsPage: boolean;
  isLeadsPage: boolean;
  isArchivedPage: boolean;
  isTodoPage: boolean;
  isOffersPage: boolean;
  isOpeningsPage: boolean;
  isConfirmationsPage: boolean;
  isPaymentsPage: boolean;
  isPendingLeadsPage: boolean;

  // Filter data
  defaultFilters: FilterRule[];
  roleBasedFilters: FilterRule[];
  allPageFilters: FilterRule[];
  defaultGroupBy: string[];

  // User info
  userRole: string | undefined;
  isAgent: boolean;
  isAdmin: boolean;
  isProvider: boolean;

  // Helper functions
  getPageSpecificFilter: () => FilterRule | null;
  getRoleBasedStatusFilters: () => FilterRule[];
}

export const useCentralizedFilters = ({
  pendingLeadsComponent = false,
  currentTab,
}: UseCentralizedFiltersProps = {}): UseCentralizedFiltersResult => {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Get user role
  const userRole = session?.user?.role;
  const isAgent = userRole === Role.AGENT;
  const isAdmin = userRole === Role.ADMIN;
  const isProvider = userRole === Role.PROVIDER;

  // Use effective path (currentTab or pathname)
  const effectivePath = currentTab || pathname || '';

  // Detect page type
  const pageType = useMemo(() => detectPageType(effectivePath), [effectivePath]);

  // Get page-specific filters
  const { defaultFilters, roleBasedFilters, defaultGroupBy } = useMemo(() => {
    return getPageFilters(effectivePath, userRole, pendingLeadsComponent);
  }, [effectivePath, userRole, pendingLeadsComponent]);

  // Build all page filters
  const allPageFilters = useMemo(() => {
    return buildCompleteFilters(effectivePath, userRole, pendingLeadsComponent);
  }, [effectivePath, userRole, pendingLeadsComponent]);

  // Page detection flags
  const isLiveLeadsPage = useMemo(() => pageType === 'live-leads', [pageType]);
  const isRecycleLeadsPage = useMemo(() => pageType === 'recycle-leads', [pageType]);
  const isLeadsPage = useMemo(() => pageType === 'leads', [pageType]);
  const isArchivedPage = useMemo(() => pageType === 'archived', [pageType]);
  const isTodoPage = useMemo(() => pageType === 'todo', [pageType]);
  const isOffersPage = useMemo(() => pageType === 'offers', [pageType]);
  const isOpeningsPage = useMemo(() => pageType === 'openings', [pageType]);
  const isConfirmationsPage = useMemo(() => pageType === 'confirmations', [pageType]);
  const isPaymentsPage = useMemo(() => pageType === 'payments', [pageType]);
  const isPendingLeadsPage = useMemo(() => pageType === 'pending-leads', [pageType]);

  // Helper function to get page-specific filter (for backward compatibility)
  const getPageSpecificFilter = (): FilterRule | null => {
    if (defaultFilters.length === 0) return null;

    // Return the first default filter for backward compatibility
    // This maintains the existing behavior in components
    return defaultFilters[0];
  };

  // Helper function to get role-based status filters (for backward compatibility)
  const getRoleBasedStatusFilters = (): FilterRule[] => {
    return roleBasedFilters;
  };

  return {
    // Page detection
    pageType,
    isLiveLeadsPage,
    isRecycleLeadsPage,
    isLeadsPage,
    isArchivedPage,
    isTodoPage,
    isOffersPage,
    isOpeningsPage,
    isConfirmationsPage,
    isPaymentsPage,
    isPendingLeadsPage,

    // Filter data
    defaultFilters,
    roleBasedFilters,
    allPageFilters,
    defaultGroupBy,

    // User info
    userRole,
    isAgent,
    isAdmin,
    isProvider,

    // Helper functions
    getPageSpecificFilter,
    getRoleBasedStatusFilters,
  };
};
