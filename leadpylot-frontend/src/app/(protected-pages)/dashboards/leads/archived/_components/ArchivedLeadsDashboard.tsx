'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import CommonLeadsDashboard from '../../_components/CommonLeadsDashboard';
import { useLeads, useSources } from '@/services/hooks/useLeads';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import type { DomainFilter } from '@/stores/universalGroupingFilterStore';
import { useApiUrlStore } from '@/stores/apiUrlStore';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';

// Tabs for archived leads filters
// all: default fetch (active=false)
// archive: status!=Out (active=false is already applied by archived page defaults)
// live_out: source=live (active=false comes from page defaults)
// recycle_out: source=recycle (active=false comes from page defaults)

type ArchivedTab = 'all' | 'archive' | 'live_out' | 'recycle_out';

const ArchivedLeadsDashboard: React.FC<{ pageTitle?: string; tableName?: string }> = ({
  pageTitle = 'Archived Leads',
  tableName = 'archived-leads',
}) => {
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || undefined;
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;

  // Get session to check user role
  const { data: session } = useSession();
  const isAgent = session?.user?.role === Role.AGENT;

  // State for active tab with local storage
  const [activeTab, setActiveTab] = useState<ArchivedTab>(() => {
    // Get stored tab from localStorage (only on client side)
    const storageKey = 'archived_leads_dashboard_tab';
    const storedTab = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;

    // Validate stored tab
    const validTabs: ArchivedTab[] = ['all', 'archive', 'live_out', 'recycle_out'];
    if (storedTab && validTabs?.includes(storedTab as ArchivedTab)) {
      return storedTab as ArchivedTab;
    }

    // Default to 'all'
    return 'all';
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(80);

  // Universal grouping filter store
  const {
    setUserDomainFilters,
    setLockedDomainFilters,
    groupBy,
    pagination: groupingPagination,
  } = useUniversalGroupingFilterStore();

  // API URL store for navigation
  const { setApiUrl } = useApiUrlStore();

  // Check if grouping is active
  const hasGrouping = groupBy && groupBy.length > 0;

  // Use grouping pagination when grouping is active, otherwise use local pagination
  const effectivePage = hasGrouping ? groupingPagination.page : page;
  const effectivePageSize = hasGrouping ? groupingPagination.limit : pageSize;

  // Fetch sources to get source IDs
  const { data: sourcesData } = useSources();

  // Get source IDs for 'live' and 'recycle' sources
  const sourceIds = useMemo(() => {
    if (!sourcesData?.data) return { live: null, recycle: null };

    const liveSource = sourcesData.data.find((source) => source.name?.toLowerCase() === 'live');
    const recycleSource = sourcesData.data.find(
      (source) => source.name?.toLowerCase() === 'recycle'
    );

    return {
      live: liveSource?._id || null,
      recycle: recycleSource?._id || null,
    };
  }, [sourcesData]);

  // Helper: get tab-specific domain filters
  const getTabDomainFilters = useCallback(
    (tab: ArchivedTab): DomainFilter[] => {
      const pageDefaults: DomainFilter[] = [['active', '=', false]];

      if (tab === 'all') {
        // For "all" tab, return active=false in domain filter
        return [['active', '=', false]];
      }

      if (tab === 'archive') {
        // status = 'Out' and active = false
        return [
          ['active', '=', false],
          ['status', '=', 'Out'],
        ];
      }

      if (tab === 'live_out') {
        // source_id = live source ID and active = false
        if (!sourceIds.live) return pageDefaults; // Fallback if source not found
        return [
          ['active', '=', false],
          ['source_id', '=', sourceIds.live],
        ];
      }

      if (tab === 'recycle_out') {
        // source_id = recycle source ID and active = false
        if (!sourceIds.recycle) return pageDefaults; // Fallback if source not found
        return [
          ['active', '=', false],
          ['source_id', '=', sourceIds.recycle],
        ];
      }

      return pageDefaults;
    },
    [sourceIds]
  );

  // Build query params for GET /leads API (same approach as leads page - include sortBy/sortOrder from URL)
  const leadsQueryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      page: effectivePage,
      limit: effectivePageSize,
    };

    // For all tabs, use domain filters with active=false
    const domainFilters = getTabDomainFilters(activeTab);

    if (domainFilters?.length > 0) {
      params.domain = JSON.stringify(domainFilters);
    }

    // Include sorting from URL - enables API refetch when user sorts (same as leads page)
    if (search) params.search = search;
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;

    return params;
  }, [activeTab, effectivePage, effectivePageSize, getTabDomainFilters, search, sortBy, sortOrder]);

  // Build API URL from query params for api-url-storage (include sort for consistency)
  const buildApiUrl = useCallback(() => {
    const baseUrl = '/leads';
    const params = new URLSearchParams();

    // Add pagination - use grouping pagination when grouping is active
    params.set('page', effectivePage.toString());
    params.set('limit', effectivePageSize.toString());

    // Add domain filters
    const domainFilters = getTabDomainFilters(activeTab);
    if (domainFilters?.length > 0) {
      params.set('domain', JSON.stringify(domainFilters));
    }

    // Add sorting (same as leads page)
    if (search) params.set('search', search);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);

    return `${baseUrl}?${params.toString()}`;
  }, [activeTab, effectivePage, effectivePageSize, getTabDomainFilters, search, sortBy, sortOrder]);

  // Fetch leads using GET /leads API with domain parameter
  const {
    data: leadsData,
    isLoading,
    isFetching,
  } = useLeads(leadsQueryParams, {
    enabled: true,
  });

  // Save tab to localStorage whenever it changes
  useEffect(() => {
    const storageKey = 'archived_leads_dashboard_tab';
    localStorage.setItem(storageKey, activeTab);
  }, [activeTab]);

  // Update locked domain filters when tab changes - these are tab-specific default filters
  // Locked filters are included in getCombinedDomainFilters() which is used by grouping API
  // They should NOT appear in FilterTags (that's why we use lockedDomainFilters, not userDomainFilters)
  useEffect(() => {
    // Clear user domain filters - these are for user-added filters only
    setUserDomainFilters([]);

    // Set tab-specific filters as locked domain filters (for grouping API)
    // Locked filters are immutable and included in getCombinedDomainFilters()
    const tabFilters = getTabDomainFilters(activeTab);
    setLockedDomainFilters(tabFilters);
  }, [activeTab, getTabDomainFilters, setUserDomainFilters, setLockedDomainFilters]);

  // Automatically update API URL storage when pagination or filters change
  useEffect(() => {
    const apiUrl = buildApiUrl();
    setApiUrl(apiUrl);
  }, [buildApiUrl, setApiUrl]);

  const handleApplyForTab = useCallback((nextTab: ArchivedTab) => {
    setActiveTab(nextTab);
    setPage(1); // Reset to first page when changing tabs
  }, []);

  // Extract data from API response
  const leads = leadsData?.data || [];
  const total = leadsData?.meta?.total || 0;
  const currentPage = leadsData?.meta?.page || page;
  const currentLimit = leadsData?.meta?.limit || pageSize;

  return (
    <div className="mx-2 flex flex-col gap-1 xl:mx-0">
      {/* Dashboard with tabs inside ActionBar */}
      <CommonLeadsDashboard
        pageTitle={pageTitle}
        tableName={tableName}
        deleteButton={false}
        // Pass external data from GET /leads API
        data={leads}
        loading={isLoading || isFetching}
        total={total}
        page={currentPage}
        pageSize={currentLimit}
        onPaginationChange={setPage}
        onPageSizeChange={setPageSize}
        // Compute subtitle prefix based on tab selection
        pageInfoSubtitlePrefix={(() => {
          if (activeTab === 'all') return 'All Archived';
          if (activeTab === 'recycle_out') return 'Recycle Out';
          if (activeTab === 'live_out') return 'Live Out';
          if (activeTab === 'archive') return 'Archive';
          return undefined;
        })()}
        filterBtnComponent={
          <div className="flex items-center justify-center gap-1">
            {!isAgent && (
              <Button
                size="xs"
                icon={<ApolloIcon name="archive-box" className="text-xs" />}
                onClick={() => handleApplyForTab('archive')}
                variant={activeTab === 'archive' ? 'secondary' : 'default'}
                className={
                  activeTab === 'archive'
                    ? 'hover:bg-btn-archive filter-triangle-indicator relative flex items-center justify-center gap-1 bg-black text-white hover:text-white'
                    : `bg-btn-archive hover:bg-btn-archive relative flex items-center justify-center gap-1 hover:text-black ${isAgent ? 'cursor-not-allowed opacity-50' : ''}`
                }
              >
                <span>Archive</span>
              </Button>
            )}
            <Button
              size="xs"
              icon={<ApolloIcon name="lightning" className="text-xs" />}
              onClick={() => handleApplyForTab('live_out')}
              variant={activeTab === 'live_out' ? 'secondary' : 'default'}
              className={
                activeTab === 'live_out'
                  ? 'hover:bg-btn-live-out filter-triangle-indicator relative flex items-center justify-center gap-1 bg-black text-white hover:text-white'
                  : 'bg-btn-live-out hover:bg-btn-live-out relative flex items-center justify-center gap-1 hover:text-black'
              }
            >
              <span>Live Out</span>
            </Button>
            <Button
              size="xs"
              icon={<ApolloIcon name="refresh" className="text-xs" />}
              onClick={() => handleApplyForTab('recycle_out')}
              variant={activeTab === 'recycle_out' ? 'secondary' : 'default'}
              className={
                activeTab === 'recycle_out'
                  ? 'hover:bg-btn-recycle-out filter-triangle-indicator relative flex items-center justify-center gap-1 bg-black text-white hover:text-white'
                  : 'bg-btn-recycle-out hover:bg-btn-recycle-out relative flex items-center justify-center gap-1 hover:text-black'
              }
            >
              <span>Recycle Out</span>
            </Button>
            <Button
              size="xs"
              icon={<ApolloIcon name="view-list" className="text-xs" />}
              onClick={() => handleApplyForTab('all')}
              variant={activeTab === 'all' ? 'secondary' : 'default'}
              className={
                activeTab === 'all'
                  ? 'hover:bg-btn-all filter-triangle-indicator relative flex items-center justify-center gap-1 bg-black text-white hover:text-white'
                  : 'bg-btn-all hover:bg-btn-all relative flex items-center justify-center gap-1 hover:text-black'
              }
            >
              <span>All</span>
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default ArchivedLeadsDashboard;
