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
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
import { useDefaultApiStore } from '@/stores/defaultApiStore';
import TicketFilterBar, { TTicketFilter } from './TicketFilterBar';
import { UnifiedDashboard } from '../../_components/unified-dashboard';
import { offerTicketsHookConfig } from './OfferTicketsConfig';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';

interface TicketsDashboardProps {
  pageTitle?: string;
  tableName?: string;
}

const TicketsDashboard: React.FC<TicketsDashboardProps> = ({
  pageTitle = 'Tickets',
  tableName = 'ticket_leads',
}) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { onAppendQueryParams } = useAppendQueryParams();
  const { setDefaultApiParams } = useDefaultApiStore();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  // Get default filter based on user role
  // Admin default: Offer Tickets, All (ownership), Pending (status)
  // Agent default: Lead Tickets (no access to Offer Tickets), All (ownership), Pending (status)
  const getDefaultFilter = useCallback((): TTicketFilter => {
    return {
      status: isAdmin ? 'pending' : 'all',
      ownership: 'all_admin', // Both admin and agent default to "All"
      source: isAdmin ? 'offer' : 'lead', // Agents can only see Lead Tickets
    };
  }, [isAdmin]);

  // State for filter selection
  const [selectedFilter, setSelectedFilter] = useState<TTicketFilter>(getDefaultFilter());

  // Compute effective filter - force agents to 'lead' source if somehow 'offer' is selected
  const effectiveFilter = useMemo((): TTicketFilter => {
    if (!isAdmin && selectedFilter.source === 'offer') {
      return { ...selectedFilter, source: 'lead' };
    }
    return selectedFilter;
  }, [isAdmin, selectedFilter]);

  // Get selected items from global store
  const { clearSelectedItems } = useSelectedItemsStore();

  // Get dynamic filters store
  const { isDynamicFilterMode } = useDynamicFiltersStore();

  // Navigation store methods
  const setFilteredItems = useFilterAwareLeadsNavigationStore((state) => state?.setFilteredItems);
  const setFilterState = useFilterAwareLeadsNavigationStore((state) => state?.setFilterState);

  // Back navigation store
  const { setBackUrl } = useBackNavigationStore();

  // Page info store (used by UnifiedDashboard for offer tickets)
  usePageInfoStore();

  // Filter chain hook
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

  const isOfferTickets = effectiveFilter.source === 'offer';

  // ============ LEAD TICKETS API PARAMS ============
  const leadTicketsParams = useMemo(() => {
    if (isOfferTickets) return undefined;

    const params: Record<string, unknown> = {
      page: pageIndex,
      limit: pageSize,
      search: search || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      has_ticket: true,
      ticket_source: 'lead',
    };

    if (effectiveFilter.status === 'pending') {
      params.pending = true;
    } else if (effectiveFilter.status === 'done') {
      params.done_todos = true;
    }

    if (effectiveFilter.ownership === 'for_me') {
      params.todo_scope = 'assigned_to_me';
    } else if (effectiveFilter.ownership === 'from_me') {
      params.todo_scope = 'assigned_by_me';
    }

    return params;
  }, [
    isOfferTickets,
    pageIndex,
    pageSize,
    search,
    sortBy,
    sortOrder,
    effectiveFilter.status,
    effectiveFilter.ownership,
  ]);

  // ============ API CALLS (for Lead Tickets only) ============
  const { data: leadTicketsData, isLoading: leadTicketsLoading } = useLeads(
    leadTicketsParams as any,
    { enabled: !isOfferTickets }
  );

  // Populate navigation stores (for lead tickets)
  useEffect(() => {
    if (!isDynamicFilterMode && !isOfferTickets && leadTicketsData?.data) {
      setFilteredItems(leadTicketsData?.data);
      setFilterState(leadTicketsParams || {});
    }
  }, [
    isDynamicFilterMode,
    isOfferTickets,
    leadTicketsData?.data,
    leadTicketsParams,
    setFilteredItems,
    setFilterState,
  ]);

  // Persist API params (for lead tickets)
  useEffect(() => {
    if (!isOfferTickets && leadTicketsParams) {
      setDefaultApiParams(leadTicketsParams);
    }
  }, [isOfferTickets, leadTicketsParams, setDefaultApiParams]);

  // Set back URL
  useEffect(() => {
    setBackUrl(pathname);
  }, [pathname, setBackUrl]);

  // Handle filter change
  const handleFilterChange = (filter: TTicketFilter) => {
    setSelectedFilter(filter);
    if (pageIndex !== 1) {
      onAppendQueryParams({ pageIndex: 1 });
    }
  };

  const handlePaginationChange: React.Dispatch<React.SetStateAction<number>> = (value) => {
    const nextPage = typeof value === 'function' ? value(pageIndex) : value;
    onAppendQueryParams({ pageIndex: nextPage });
  };

  const handlePageSizeChange: React.Dispatch<React.SetStateAction<number>> = (value) => {
    const nextSize = typeof value === 'function' ? value(pageSize) : value;
    onAppendQueryParams({ pageIndex: 1, pageSize: nextSize });
  };

  const shouldPassData = !isDynamicFilterMode;
  const total = leadTicketsData?.meta?.total;

  // Legacy filter for CommonLeadsDashboard (lead tickets only)
  const legacyTodoFilter = useMemo(
    () => ({
      filter:
        effectiveFilter.ownership === 'for_me'
          ? ('assigned_to_me' as const)
          : effectiveFilter.ownership === 'from_me'
            ? ('assigned_by_me' as const)
            : undefined,
      pendingTodos: effectiveFilter.status === 'pending',
      completedTodos: effectiveFilter.status === 'done',
    }),
    [effectiveFilter.ownership, effectiveFilter.status]
  );

  // Build offer tickets params for UnifiedDashboard
  const offerTicketsDataHookParams = useMemo(
    () => ({
      ticket_status: effectiveFilter.status === 'all' ? undefined : effectiveFilter.status,
      ownership: effectiveFilter.ownership === 'all_admin' ? 'all' : effectiveFilter.ownership,
    }),
    [effectiveFilter.status, effectiveFilter.ownership]
  );

  return (
    <div className="mx-2 flex flex-col gap-1 xl:mx-0">
      {/* Filter Bar */}
      <Card>
        <div className="flex items-center justify-between">
          <TicketFilterBar selectedFilter={selectedFilter} onFilterChange={handleFilterChange} />
        </div>
      </Card>

      {/* Render different dashboards based on ticket source */}
      {isOfferTickets ? (
        <UnifiedDashboard
          dashboardType="offer_tickets"
          {...offerTicketsHookConfig}
          dataHookParams={offerTicketsDataHookParams}
        />
      ) : (
        <CommonLeadsDashboard
          deleteButton={false}
          pageTitle={pageTitle}
          tableName={tableName}
          data={shouldPassData ? leadTicketsData?.data : undefined}
          loading={shouldPassData ? leadTicketsLoading : undefined}
          total={total}
          page={pageIndex}
          pageSize={pageSize}
          onPaginationChange={handlePaginationChange}
          onPageSizeChange={handlePageSizeChange}
          todoFilterScope={legacyTodoFilter}
          todoStatistics={{
            totalCount: leadTicketsData?.statistics?.todos?.total_count,
            pendingCount: leadTicketsData?.statistics?.todos?.pending_count,
            completedCount: leadTicketsData?.statistics?.todos?.completed_count,
          }}
        />
      )}
    </div>
  );
};

export default TicketsDashboard;
