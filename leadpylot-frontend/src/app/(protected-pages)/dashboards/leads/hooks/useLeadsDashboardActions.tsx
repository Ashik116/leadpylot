import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCurrentPageColumnsStore } from '@/stores/currentPageColumnsStore';
import { usePageInfoStore } from '@/stores/pageInfoStore';
import { useBackNavigationStore } from '@/stores/backNavigationStore';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import useNotification from '@/utils/hooks/useNotification';
import { GetAllLeadsResponse } from '@/services/LeadsService';

// Type guard function
function isGetAllLeadsResponse(data: any): data is GetAllLeadsResponse {
  return data && typeof data === 'object' && 'data' in data && 'meta' in data;
}

interface UseLeadsDashboardActionsProps {
  // Page and table configuration
  pageTitle?: string;
  tableName?: string;
  sharedDataTable?: boolean;
  pendingLeadsComponent?: boolean;

  // Project-specific props
  projectNameFromDetailsPage?: string;
  externalProjectId?: string;
  getCurrentPosition?: () => number;
  totalProjects?: number;
  goToPreviousProject?: () => void;
  goToNextProject?: () => void;
  setIsProjectOpen?: (open: boolean) => void;

  // Todo-specific props
  todoFilterScope?: any;
  todoStatistics?: any;
  pageInfoSubtitlePrefix?: string;

  // Data and state
  leadsData: any;
  externalTotal?: number;
  externalLoading?: boolean;
  isLoading: boolean;
  // selectedLeads removed - use store directly via useSelectedItemsStore
  allColumns: any[];

  // Search and filter modes
  isBulkSearchMode: boolean;
  bulkSearchResults: any[];
  isDynamicFilterMode: boolean;

  // Grouping
  selectedGroupBy: string[];
  liftedGroupedLeadsData?: any;
  selectedGroupDetails?: any;
  groupLeadsData?: any;

  // Filter clearing
  clearDynamicFilters: () => void;
  clearFilterByType: (type: 'status' | 'import' | 'dynamic' | 'groupBy') => void;

  // Mutations
  bulkUpdateMutationLeads: any;
  closeProjectMutation: any;
  conditionalRefetch: () => Promise<void>;
  clearSelectedItems: () => void;

  // Dialog state setters
  setUpdateConfirmDialogOpen: (open: boolean) => void;
  setIsCloseProjectDialogOpen: (open: boolean) => void;
  setIsBulkUpdateDialogOpen: (open: boolean) => void;
  setIsBulkSearchEditModalOpen: (open: boolean) => void;
  closureReason: string;
  setClosureReason: (reason: string) => void;
  closeProjectCurrentStatus: string;
  setCloseProjectCurrentStatus: (statusId: string) => void;
  closeProjectNotes: string;
  setCloseProjectNotes: (notes: string) => void;

  // Row click handler
  handleRowClick: (lead: any) => void;
}

export const useLeadsDashboardActions = ({
  pageTitle,
  tableName = 'leads',
  sharedDataTable = false,
  pendingLeadsComponent,
  projectNameFromDetailsPage,
  externalProjectId,
  getCurrentPosition,
  totalProjects,
  goToPreviousProject,
  goToNextProject,
  setIsProjectOpen,
  todoFilterScope,
  todoStatistics,
  pageInfoSubtitlePrefix,
  leadsData,
  externalTotal,
  externalLoading,
  isLoading,
  // selectedLeads and setSelectedLeads removed - use store directly
  allColumns,
  isBulkSearchMode,
  bulkSearchResults,
  isDynamicFilterMode,
  selectedGroupBy,
  liftedGroupedLeadsData,
  selectedGroupDetails,
  groupLeadsData,
  clearDynamicFilters,
  clearFilterByType,
  bulkUpdateMutationLeads,
  closeProjectMutation,
  conditionalRefetch,
  clearSelectedItems,
  setUpdateConfirmDialogOpen,
  setIsCloseProjectDialogOpen,
  setIsBulkUpdateDialogOpen,
  setIsBulkSearchEditModalOpen,
  closureReason,
  setClosureReason,
  closeProjectCurrentStatus,
  setCloseProjectCurrentStatus,
  closeProjectNotes,
  setCloseProjectNotes,
  handleRowClick,
}: UseLeadsDashboardActionsProps) => {
  // Get selected IDs from store (single source of truth)
  const { getSelectedIds } = useSelectedItemsStore();
  const router = useRouter();
  const pathname = usePathname();
  const { setCurrentPageColumns } = useCurrentPageColumnsStore();
  const { setPageInfo } = usePageInfoStore();
  const { setBackUrl } = useBackNavigationStore();
  const { openNotification } = useNotification();

  // Use ref to track previous values and prevent infinite loops
  const prevPageInfoRef = useRef<any>(null);
  const prevRouteRef = useRef<string | null>(null);

  // Wrapper function to handle both Lead and GroupedLead types
  const handleRowClickWrapper = (lead: any) => {
    // Both Lead and GroupedLead have _id and other common properties
    // The handleRowClick function should work with both types
    handleRowClick(lead);
  };

  // Determine if we're on the archived page based on pathname
  const isArchivedPage = pathname?.includes('/archived') || false;

  // Calculate total
  const total = leadsData?.meta?.total || 0;

  // Set current page columns for export functionality
  useEffect(() => {
    setCurrentPageColumns(allColumns, 'leads');
  }, [allColumns, setCurrentPageColumns]);

  // Set back URL based on current page
  useEffect(() => {
    if (pathname) {
      setBackUrl(pathname);
    }
  }, [pathname, setBackUrl]);

  // Set page info when it changes - restructured to avoid infinite loops
  useEffect(() => {
    // Don't set page info when used as shared data table to avoid conflicts
    // if (sharedDataTable) {
    //   return;
    // }

    // Avoid flashing 0 totals during loading; prefer external loading if provided
    const effectiveLoading = externalLoading !== undefined ? externalLoading : isLoading;
    if (effectiveLoading) {
      return;
    }

    let pageInfoData;

    // If bulk search mode is active, show only bulk search result info
    if (isBulkSearchMode) {
      const total = bulkSearchResults?.length || 0;
      pageInfoData = {
        // Set title if pageTitle is explicitly provided
        ...(pageTitle && { title: pageTitle }),
        total,
        subtitle: `Found ${total} leads matching your filters`,
      };
    } else if (selectedGroupBy.length > 0) {
      // If grouped leads mode is active, show grouped leads info
      const totalGroups = liftedGroupedLeadsData?.data?.length || 0;
      const totalLeads = liftedGroupedLeadsData?.meta?.totalLeads || 0;
      // const groupingLevels = liftedGroupedLeadsData?.meta?.groupingLevels || selectedGroupBy;
      pageInfoData = {
        // Set title if pageTitle is explicitly provided
        ...(pageTitle && { title: pageTitle }),
        total: totalGroups,
        subtitle: `${totalGroups} groups containing ${totalLeads} total leads`,
      };
    } else if (selectedGroupDetails) {
      // If a specific group is selected, show group details
      const total = groupLeadsData?.meta?.total || 0;
      const groupName = groupLeadsData?.data?.group?.groupName || selectedGroupDetails?.groupName;
      pageInfoData = {
        // Set title if pageTitle is explicitly provided
        ...(pageTitle && { title: pageTitle }),
        total,
        subtitle: `Group: ${groupName} - ${total} leads in this group`,
      };
    } else {
      const total = isGetAllLeadsResponse(leadsData) ? leadsData.meta?.total : externalTotal;

      // Don't set title here - let the pathname HashMap handle it!
      // Only set total and subtitle from the page data

      let subtitle = `${pendingLeadsComponent === true ? 'Total Pending Leads' : 'Total Leads'}: ${typeof total === 'number' ? total : ''}`;

      // Allow explicit subtitle prefix override (e.g., Archived tabs)
      if (pageInfoSubtitlePrefix) {
        subtitle = `${pageInfoSubtitlePrefix}: ${typeof total === 'number' ? total : ''}`;
      }

      // Override subtitle for Todo dashboard based on selected tab/filter
      if (tableName === 'todo_leads' && todoFilterScope) {
        if (todoFilterScope?.pendingTodos && todoFilterScope?.filter === undefined) {
          const count =
            typeof todoStatistics?.pendingCount === 'number' ? todoStatistics?.pendingCount : '';
          subtitle = `Task Pending: ${count}`;
        } else if (todoFilterScope?.completedTodos && todoFilterScope?.filter === undefined) {
          const count =
            typeof todoStatistics?.completedCount === 'number'
              ? todoStatistics?.completedCount
              : '';
          subtitle = `Tasks Complete: ${count}`;
        }
      }

      pageInfoData = {
        // Set title if pageTitle is explicitly provided (e.g., for close-projects route)
        ...(pageTitle && { title: pageTitle }),
        total,
        subtitle,
        // Add project navigation info if available (for /leads/projects route)
        ...(pathname?.includes('/leads/projects') &&
          getCurrentPosition &&
          totalProjects &&
          goToPreviousProject &&
          goToNextProject && {
          projectNavigation: {
            currentPosition: getCurrentPosition(),
            totalProjects,
            goToPreviousProject,
            goToNextProject,
          },
        }),
      };
    }

    // Require a defined total to avoid premature header updates (e.g., Todo page initial pass)
    if (typeof pageInfoData?.total === 'undefined') {
      return;
    }

    const currentRoute = pathname;

    // Only update if the data actually changed to prevent infinite loops
    const prevPageInfo = prevPageInfoRef.current;
    const prevRoute = prevRouteRef.current;

    // Compare current data with previous to avoid unnecessary updates
    const hasChanged =
      prevRoute !== currentRoute ||
      prevPageInfo?.title !== pageInfoData?.title ||
      prevPageInfo?.total !== pageInfoData?.total ||
      prevPageInfo?.subtitle !== pageInfoData?.subtitle ||
      JSON.stringify((prevPageInfo as any)?.projectNavigation) !== JSON.stringify((pageInfoData as any)?.projectNavigation);

    if (hasChanged) {
      setPageInfo(pageInfoData);
      prevPageInfoRef.current = pageInfoData;
      prevRouteRef.current = currentRoute;
    }
  }, [
    sharedDataTable,
    isBulkSearchMode,
    bulkSearchResults,
    externalTotal,
    leadsData,
    pageTitle,
    projectNameFromDetailsPage,
    pendingLeadsComponent,
    totalProjects,
    selectedGroupBy,
    liftedGroupedLeadsData,
    selectedGroupDetails,
    groupLeadsData,
    getCurrentPosition,
    goToPreviousProject,
    goToNextProject,
    // Removed setPageInfo - Zustand setters are stable and don't need to be in deps
    pathname,
    isLoading,
    externalLoading,
    tableName,
    todoFilterScope,
    todoStatistics,
    pageInfoSubtitlePrefix,
  ]);

  // Clear dynamic filters when component unmounts or when not on leads page
  useEffect(() => {
    return () => {
      if (isDynamicFilterMode) {
        clearDynamicFilters();
      }
    };
  }, [isDynamicFilterMode, clearDynamicFilters]);

  // Clear filters when navigating to other pages
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear filters from global store when navigating away
      clearFilterByType('import');
      clearFilterByType('status');
      clearFilterByType('dynamic');
      clearDynamicFilters();
    };

    // Listen for navigation events
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [clearFilterByType, clearDynamicFilters]);

  // Clear filters when component unmounts
  useEffect(() => {
    return () => {
      // Clear filters from global store when component unmounts
      clearFilterByType('import');
      clearFilterByType('status');
      clearFilterByType('dynamic');
      clearDynamicFilters();
    };
  }, [clearFilterByType, clearDynamicFilters]);

  // Handler for checking leads (usable/not usable)
  const handleCheckLeads = async (usable: boolean = true) => {
    const currentSelectedIds = getSelectedIds('leads');
    bulkUpdateMutationLeads.mutate({
      ids: currentSelectedIds,
      updateData: {
        use_status: usable ? 'usable' : 'not usable',
        checked: true,
        usable: usable ? 'yes' : 'no',
      },
    });
    await conditionalRefetch();
    setUpdateConfirmDialogOpen(false);
    clearSelectedItems(); // Clear store (single source of truth)
  };

  // Handler for making fresh leads
  const handleMakeFreshLeads = () => {
    const currentSelectedIds = getSelectedIds('leads');
    if (currentSelectedIds.length === 0) {
      openNotification({
        type: 'warning',
        massage: 'Please select leads you want to refresh',
      });
      return;
    }
    setIsCloseProjectDialogOpen(true);
  };

  // Handler for bulk update
  const handleBulkUpdate = () => {
    const currentSelectedIds = getSelectedIds('leads');
    if (currentSelectedIds.length === 0) {
      openNotification({
        type: 'warning',
        massage: 'Please select leads you want to update',
      });
      return;
    }
    setIsBulkUpdateDialogOpen(true);
  };

  // Handler for edit bulk search
  const handleEditBulkSearch = () => {
    setIsBulkSearchEditModalOpen(true);
  };

  // Handler for close project submit
  const handleCloseProjectSubmit = async () => {
    const currentSelectedIds = getSelectedIds('leads');
    if (!currentSelectedIds.length) return;

    if (!externalProjectId) {
      openNotification({
        type: 'danger',
        massage: 'Unable to determine project ID',
      });
      return;
    }

    try {
      const trimmedNotes = closeProjectNotes.trim();
      await closeProjectMutation.mutateAsync({
        projectId: externalProjectId as string,
        data: {
          leadsToRefresh: currentSelectedIds,
          closureReason,
          ...(closeProjectCurrentStatus
            ? { current_status: closeProjectCurrentStatus }
            : {}),
          ...(closureReason === 'other' && trimmedNotes ? { notes: trimmedNotes } : {}),
        },
      });
      await conditionalRefetch();

      setIsCloseProjectDialogOpen(false);
      clearSelectedItems(); // Clear store (single source of truth)
      setClosureReason('project_completed');
      setCloseProjectCurrentStatus('');
      setCloseProjectNotes('');
      setIsProjectOpen?.(false);

      const isRegularProjectDetailsPage =
        pathname.startsWith('/dashboards/projects/') &&
        !pathname.startsWith('/dashboards/projects/create') &&
        !pathname.startsWith('/dashboards/projects/close-projects');

      if (!isRegularProjectDetailsPage) {
        router.push('/dashboards/projects');
      }
    } catch (error) {
      // Error is handled by the hook
      openNotification({
        type: 'danger',
        massage: `Failed to close project: ${error instanceof Error ? error?.message : 'Unknown error'}`,
      });
    }
  };

  return {
    // State values
    isArchivedPage,
    total,

    // Handler functions
    handleRowClickWrapper,
    handleCheckLeads,
    handleMakeFreshLeads,
    handleBulkUpdate,
    handleEditBulkSearch,
    handleCloseProjectSubmit,
  };
};
