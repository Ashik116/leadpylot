'use client';

import Card from '@/components/ui/Card';
import { useFilterChainLeads } from '@/hooks/useFilterChainLeads';
import { useLeads } from '@/services/hooks/useLeads';
import { useBackNavigationStore } from '@/stores/backNavigationStore';
import { useDynamicFiltersStore } from '@/stores/dynamicFiltersStore';
import { useFilterAwareLeadsNavigationStore } from '@/stores/navigationStores';
import { usePageInfoStore } from '@/stores/pageInfoStore';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import CommonLeadsDashboard from '../../leads/_components/CommonLeadsDashboard';
import TodoBoxGrid from './TodoBoxGrid';
import TodoFilterBtn from './TodoFilterBtn';
// import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import TodoTicketSwitcher from '@/app/(protected-pages)/dashboards/todo/_components/TodoTicketSwitcher';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSession } from '@/hooks/useSession';
import { useDefaultApiStore } from '@/stores/defaultApiStore';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';

export type TTodoFilter = {
  filter: 'assigned_by_me' | 'assigned_to_me' | undefined;
  pendingTodos?: boolean;
  completedTodos: boolean;
};

interface TodoDashboardProps {
  pageTitle?: string;
  tableName?: string;
}

const TodoDashboard: React.FC<TodoDashboardProps> = ({
  pageTitle = 'Todo',
  tableName = 'todo_leads',
}) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { onAppendQueryParams } = useAppendQueryParams();
  const { data: session } = useSession();
  const { setDefaultApiParams } = useDefaultApiStore();

  // Get default filter based on user role
  const getDefaultFilter = useCallback((): TTodoFilter => {
    // Default to "Pending" tab for all roles
    return {
      filter: undefined,
      pendingTodos: true,
      completedTodos: false,
    };
  }, []);

  // State for filter selection
  const [selectedFilter, setSelectedFilter] = useState<TTodoFilter>(getDefaultFilter());

  // State for mode selection (todo vs ticket) - initialized from pathname
  const [mode, setMode] = useState<'todo' | 'ticket'>(() => {
    if (pathname?.includes('/tickets')) return 'ticket';
    if (pathname?.includes('/todos')) return 'todo';
    return 'todo';
  });

  // Update mode when pathname changes (e.g., navigating between /todos and /tickets)
  useEffect(() => {
    if (pathname?.includes('/tickets')) setMode('ticket');
    else if (pathname?.includes('/todos')) setMode('todo');
  }, [pathname]);

  // State for view toggle (table vs card view) with local storage
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    // Get stored view mode from localStorage (SSR guard)
    // if (typeof window !== 'undefined') {
    //   const storageKey = 'todo_dashboard_view_mode';
    //   const storedViewMode = localStorage.getItem(storageKey);

    //   // Validate stored view mode
    //   if (storedViewMode === 'table' || storedViewMode === 'cards') {
    //     return storedViewMode;
    //   }
    // }

    // Default to cards
    return 'table';
  });

  // Get selected items from global store
  const { clearSelectedItems } = useSelectedItemsStore();

  // Get dynamic filters store to check if dynamic filters are active
  const { isDynamicFilterMode } = useDynamicFiltersStore();

  // Navigation store methods for card view
  const setFilteredItems = useFilterAwareLeadsNavigationStore((state) => state?.setFilteredItems);
  const setFilterState = useFilterAwareLeadsNavigationStore((state) => state?.setFilterState);

  // Back navigation store for setting back URL
  const { setBackUrl } = useBackNavigationStore();

  // Page info store for setting title and subtitle
  const { setPageInfo } = usePageInfoStore();

  // Filter chain hook integration for default group by functionality
  // This will automatically apply default group by filters for Agent users
  useFilterChainLeads({
    onClearSelections: () => {
      clearSelectedItems();
    },
  });

  // Get URL parameters
  const pageIndex = Math.max(1, parseInt(searchParams.get('pageIndex') || '1', 10) || 1);
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10) || 50);
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;

  // Prepare hook parameters - only send relevant parameters based on active filter
  const hookParams = useMemo(
    () => ({
      page: pageIndex,
      limit: pageSize,
      search: search || undefined,
      sortBy: sortBy ? sortBy : undefined,
      sortOrder: sortOrder ? sortOrder : undefined,
      has_todo: mode === 'todo' && !selectedFilter?.pendingTodos ? true : undefined,
      has_ticket: mode === 'ticket' || selectedFilter?.pendingTodos ? true : undefined,
      // Conditionally add filter-specific parameters
      ...(selectedFilter?.filter && { todo_scope: selectedFilter?.filter }),
      ...(selectedFilter?.completedTodos &&
        selectedFilter?.filter === undefined && { done_todos: true }),
      ...(selectedFilter?.pendingTodos && selectedFilter?.filter === undefined && { pending: true }),
    }),
    [
      pageIndex,
      pageSize,
      search,
      sortBy,
      sortOrder,
      selectedFilter?.filter,
      selectedFilter?.completedTodos,
      selectedFilter?.pendingTodos,
      mode,
    ]
  );

  // Fetch data based on selected filter
  const { data: allTodosData, isLoading: allTodosLoading } = useLeads(hookParams);

  // For card view, we use the leads data with activeTodos instead of separate todos API

  // Populate navigation stores for card view (same as table view)
  useEffect(() => {
    // Only populate navigation stores when in card view and not in dynamic filter mode
    if (viewMode === 'cards' && !isDynamicFilterMode && allTodosData?.data) {
      const currentFilteredData = allTodosData?.data;
      const currentFilterState = {
        has_todo: mode === 'todo' && !selectedFilter?.pendingTodos ? true : undefined,
        has_ticket: mode === 'ticket' || selectedFilter?.pendingTodos ? true : undefined,
        // Conditionally add filter-specific parameters
        ...(selectedFilter?.filter && { todo_scope: selectedFilter?.filter }),
        ...(selectedFilter?.completedTodos &&
          selectedFilter?.filter === undefined && { done_todos: true }),
        ...(selectedFilter?.pendingTodos &&
          selectedFilter?.filter === undefined && { pending: true }),

        search: search || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
      };

      // Update filter-aware navigation store.
      setFilteredItems(currentFilteredData);
      setFilterState(currentFilterState);
    }
  }, [
    viewMode,
    isDynamicFilterMode,
    allTodosData?.data,
    mode,
    selectedFilter?.filter,
    selectedFilter?.completedTodos,
    selectedFilter?.pendingTodos,
    search,
    sortBy,
    sortOrder,
    setFilteredItems,
    setFilterState,
  ]);

  // Persist effective API params so details page can reconstruct on refresh
  useEffect(() => {
    // Store the same params we used to fetch leads on this page
    setDefaultApiParams(hookParams);
  }, [hookParams, setDefaultApiParams]);

  // Set back URL for navigation (same as table view)
  useEffect(() => {
    setBackUrl(pathname);
  }, [pathname, setBackUrl]);

  // Clear navigation store when switching to table view
  useEffect(() => {
    if (viewMode === 'table') {
      const clearFilterState = useFilterAwareLeadsNavigationStore.getState().clearFilterState;
      clearFilterState();
    }
  }, [viewMode]);

  // Set page info for Cards view (similar to how CommonLeadsDashboard does it)
  useEffect(() => {
    if (viewMode === 'cards' && allTodosData) {
      const total = allTodosData?.meta?.total || 0;
      const pendingCount = allTodosData?.statistics?.todos?.pending_count || 0;
      const completedCount = allTodosData?.statistics?.todos?.completed_count || 0;

      // Create subtitle based on filter and statistics
      const itemType = mode === 'ticket' ? 'tickets' : 'todos';
      let subtitle = '';
      if (selectedFilter?.filter === 'assigned_to_me') {
        subtitle = `Assigned to me • ${total} leads`;
      } else if (selectedFilter?.filter === 'assigned_by_me') {
        subtitle = `Assigned by me • ${total} leads`;
      } else if (selectedFilter?.completedTodos && !selectedFilter?.pendingTodos) {
        subtitle = `Completed ${itemType} • ${completedCount} completed • ${total} leads`;
      } else if (selectedFilter?.pendingTodos && !selectedFilter?.completedTodos) {
        subtitle = `Pending ${itemType} • ${pendingCount} pending • ${total} leads`;
      } else {
        subtitle = `All ${itemType} • ${pendingCount} pending, ${completedCount} completed • ${total} leads`;
      }

      setPageInfo({
        title: pageTitle,
        subtitle: subtitle,
        total: total,
      });
    }
  }, [
    viewMode,
    allTodosData,
    mode,
    selectedFilter?.filter,
    selectedFilter?.pendingTodos,
    selectedFilter?.completedTodos,
    pageTitle,
    setPageInfo,
  ]);

  // Handle filter change
  const handleFilterChange = (filter: TTodoFilter) => {
    setSelectedFilter(filter);
  };

  const handlePaginationChange: React.Dispatch<React.SetStateAction<number>> = (value) => {
    const nextPage = typeof value === 'function' ? value(pageIndex) : value;
    onAppendQueryParams({ pageIndex: nextPage });
  };
  const handlePageSizeChange: React.Dispatch<React.SetStateAction<number>> = (value) => {
    const nextSize = typeof value === 'function' ? value(pageSize) : value;
    onAppendQueryParams({ pageIndex: 1, pageSize: nextSize });
  };
  // Only pass data to CommonLeadsDashboard if dynamic filters are not active
  // This allows the dynamic filter results to be displayed properly
  const shouldPassData = !isDynamicFilterMode;

  const total = allTodosData?.meta?.total;

  return (
    <div className="mx-2 flex flex-col gap-1 xl:mx-0">
      {/* View Toggle and Filter buttons */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* <TodoTicketSwitcher
              mode={viewMode}
              onModeChange={(val) => setViewMode(val as 'cards' | 'table')}
              leftValue="cards"
              rightValue="table"
              leftLabel="Cards"
              rightLabel="Table"
              leftIcon="grid"
              rightIcon="grid"
              activeColor="bg-black text-white"
            /> */}
            {/* <TodoTicketSwitcher
              mode={mode}
              onModeChange={(val) => setMode(val as 'todo' | 'ticket')}
              activeColor="bg-evergreen text-white"
            /> */}
          </div>
          <TodoFilterBtn
            selectedFilter={selectedFilter}
            onFilterChange={handleFilterChange}
            mode={mode}
          />
        </div>
      </Card>

      {/* Render based on view mode */}
      {viewMode === 'cards' ? (
        <div className="space-y-4">
          <TodoBoxGrid
            leads={allTodosData?.data || []}
            todos={[]}
            currentPage={pageIndex}
            pageSize={pageSize}
            isLoading={allTodosLoading}
          // selectedFilter={selectedFilter}
          />
        </div>
      ) : (
        <CommonLeadsDashboard
          deleteButton={false}
          pageTitle={pageTitle}
          tableName={tableName}
          data={shouldPassData ? allTodosData?.data : undefined}
          loading={shouldPassData ? allTodosLoading : undefined}
          total={total}
          page={pageIndex}
          pageSize={pageSize}
          onPaginationChange={handlePaginationChange}
          onPageSizeChange={handlePageSizeChange}
          todoFilterScope={selectedFilter}
          // Provide counts for subtitle in FrameLessSide header
          todoStatistics={{
            totalCount: allTodosData?.statistics?.todos?.total_count,
            pendingCount: allTodosData?.statistics?.todos?.pending_count,
            completedCount: allTodosData?.statistics?.todos?.completed_count,
          }}
        />
      )}
    </div>
  );
};

export default TodoDashboard;
