import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import {
  useLeadsNavigationStore,
  useFilterAwareLeadsNavigationStore,
  useFilterAwareOffersNavigationStore,
  useFilterAwareOpeningsNavigationStore,
} from '@/stores/navigationStores';
import { useApiUrlStore } from '@/stores/apiUrlStore';
import { apiGetLeads, apiGetOffers } from '@/services/LeadsService';
import { apiGetOffersProgress } from '@/services/OffersProgressService';
import { isProgressEntityType } from '@/utils/dashboardUtils';
import { mapClosedLeadsForNavigation } from '@/utils/closedLeadNavigation';

export const useLeadNavigation = () => {
  const router = useRouter();

  // Get navigation state and functions from both stores
  const getPreviousLeads = useLeadsNavigationStore((state) => state.getPreviousItem);
  const getNextLeads = useLeadsNavigationStore((state) => state.getNextItem);
  const getCurrentPosition = useLeadsNavigationStore((state) => state.getCurrentPosition);
  const getTotalLeads = useLeadsNavigationStore((state) => state.getTotalItems);

  // Filter-aware navigation store
  const getPreviousFilteredItem = useFilterAwareLeadsNavigationStore(
    (state) => state.getPreviousFilteredItem
  );
  const getNextFilteredItem = useFilterAwareLeadsNavigationStore(
    (state) => state.getNextFilteredItem
  );
  const getCurrentFilteredPosition = useFilterAwareLeadsNavigationStore(
    (state) => state.getCurrentFilteredPosition
  );
  // Read paginationMeta FIRST - this is the source of truth for total count
  // Subscribe to it directly to ensure we get updates immediately
  const paginationMeta = useFilterAwareLeadsNavigationStore((state) => state.paginationMeta);

  // Read store state synchronously on mount to ensure we get the value immediately
  // This prevents the issue where paginationMeta might be null on first render
  // We read it synchronously in useState initializer to capture the value at mount time
  // CRITICAL: This ensures we get paginationMeta.total = 353 from list page, not totalFilteredItems = 50
  const [initialPaginationMeta] = useState(() => {
    const storeState = useFilterAwareLeadsNavigationStore.getState();
    return storeState.paginationMeta;
  });

  // Also read store synchronously in component body to ensure we always have the latest value
  // This is a fallback in case the subscription hasn't fired yet
  const storePaginationMeta = useFilterAwareLeadsNavigationStore.getState().paginationMeta;

  // Use paginationMeta from subscription if available, otherwise use initial value from store
  // This ensures we always have the correct total from Zustand store, even on first render
  // The subscription will update when store changes, but initial value ensures we have it immediately
  // CRITICAL: This prevents falling back to totalFilteredItems (50) when paginationMeta.total (353) exists
  // Priority: subscription > synchronous read > initial value
  const effectivePaginationMeta = paginationMeta || storePaginationMeta || initialPaginationMeta;

  const totalFilteredItems = useFilterAwareLeadsNavigationStore(
    (state) => state.totalFilteredItems
  );
  const currentFilterState = useFilterAwareLeadsNavigationStore(
    (state) => state.currentFilterState
  );
  const findFilteredIndexById = useFilterAwareLeadsNavigationStore(
    (state) => state.findFilteredIndexById
  );
  const setCurrentFilteredIndex = useFilterAwareLeadsNavigationStore(
    (state) => state.setCurrentFilteredIndex
  );
  const filteredItems = useFilterAwareLeadsNavigationStore((state) => state.filteredItems);
  const currentFilteredIndex = useFilterAwareLeadsNavigationStore(
    (state) => state.currentFilteredIndex
  );
  const isItemInCurrentPage = useFilterAwareLeadsNavigationStore(
    (state) => state.isItemInCurrentPage
  );
  const getPageForIndex = useFilterAwareLeadsNavigationStore((state) => state.getPageForIndex);
  const setFilteredItems = useFilterAwareLeadsNavigationStore((state) => state.setFilteredItems);
  const setFilterState = useFilterAwareLeadsNavigationStore((state) => state.setFilterState);
  const { apiUrl, setApiUrl } = useApiUrlStore();

  // console.log('🎯 [DETAIL PAGE] useLeadNavigation render');
  // console.log('📊 [DETAIL PAGE] currentFilteredIndex:', currentFilteredIndex);
  // console.log('📊 [DETAIL PAGE] totalFilteredItems:', totalFilteredItems);
  // console.log('📊 [DETAIL PAGE] paginationMeta:', effectivePaginationMeta);
  // console.log('📊 [DETAIL PAGE] filteredItems count:', filteredItems.length);
  // console.log('📊 [DETAIL PAGE] apiUrl from sessionStorage:', apiUrl);
  // console.log('📊 [DETAIL PAGE] currentFilterState:', currentFilterState);

  // Helper function to fetch a specific page and update navigation
  const fetchPageAndNavigate = useCallback(
    async (targetPage: number, targetItemId: string) => {
      // CRITICAL: Read values synchronously from store at call time
      const navStore = useFilterAwareLeadsNavigationStore.getState();
      const apiUrlStore = useApiUrlStore.getState();

      // Read apiUrl - priority: store > filterState (filterState may have correct URL when store is stale)
      const apiUrlToUse = apiUrl || apiUrlStore.apiUrl || navStore.currentFilterState?.apiUrl;
      // Read currentFilterState synchronously from store, or create minimal one
      let filterStateToUse = currentFilterState || navStore.currentFilterState;

      // If no filterState exists but we have paginationMeta, create minimal one
      if (!filterStateToUse && navStore.paginationMeta) {
        filterStateToUse = {
          paginationMeta: navStore.paginationMeta,
          apiUrl: apiUrlToUse || undefined,
        };
      }

      if (!apiUrlToUse) {
        // Return resolved promise so caller's .then() executes
        return Promise.resolve();
      }

      try {
        // Parse current API URL - handle both full URLs and pathname-only (e.g. /dynamic-filters/apply)
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        const url = new URL(apiUrlToUse.startsWith('/') ? apiUrlToUse : `/${apiUrlToUse}`, baseUrl);
        const endpoint = url.pathname;
        const searchParams = new URLSearchParams(url.search);

        // Update page and ensure limit is set (pathname-only URLs have no params)
        searchParams.set('page', targetPage.toString());
        if (!searchParams.has('limit')) {
          searchParams.set('limit', '50');
        }

        // Build API params object
        const apiParams: Record<string, any> = {
          page: targetPage,
          limit: parseInt(searchParams.get('limit') || '50', 10),
        };

        // Copy all other params
        searchParams.forEach((value, key) => {
          if (key !== 'page' && key !== 'limit') {
            if (key === 'duplicate' || key === '_key') {
              apiParams[key] = parseInt(value, 10);
            } else if (value === 'true') {
              apiParams[key] = true;
            } else if (value === 'false') {
              apiParams[key] = false;
            } else if (key === 'domain') {
              // ✅ CRITICAL: Keep domain as a string (URL-encoded JSON string)
              // Don't parse it to JSON, otherwise axios will serialize it as domain[0][0], domain[0][1], etc.
              // The API expects: domain=%5B%5B%22agent_id%22,%22%3D%22,%22...%22%5D%5D
              // URLSearchParams already decoded it from %5B%5B...%5D%5D to [[...]]
              // We keep it as string, and axios will URL-encode it automatically
              apiParams[key] = value; // Keep as string: "[[\"agent_id\",\"=\",\"...\"]]"
            } else if (key === 'filters') {
              // Parse filters if it's a string (for other APIs that use filters in query params)
              try {
                apiParams[key] = JSON.parse(value);
              } catch {
                apiParams[key] = value;
              }
            } else {
              apiParams[key] = value;
            }
          }
        });

        // CRITICAL FIX: Check which API type to call based on endpoint
        const isDynamicFiltersApi = endpoint.includes('/dynamic-filters/apply');
        const isOffersProgressApi = endpoint.includes('/offers/progress');
        const isOffersApi = endpoint.includes('/offers') && !isOffersProgressApi;
        const isClosedLeadsApi = endpoint.includes('/closed-leads');

        let response;
        if (isDynamicFiltersApi) {
          // Domain-based filter API (replaces removed POST /dynamic-filters/apply)
          const { apiGetLeadsWithDomain } = await import('@/services/LeadsService');

          let filters: Array<{ field: string; operator: string; value: any }> = [];
          let sortBy: string | undefined;
          let sortOrder: string | undefined;

          if (filterStateToUse?.dynamicFilters) {
            filters = filterStateToUse.dynamicFilters;
            sortBy = filterStateToUse.sortBy;
            sortOrder = filterStateToUse.sortOrder;
          } else {
            try {
              const savedBody = sessionStorage.getItem('dynamic-filters-body');
              if (savedBody) {
                const parsed = JSON.parse(savedBody);
                filters = parsed.filters || [];
                sortBy = parsed.sortBy;
                sortOrder = parsed.sortOrder;
              }
            } catch {
              // Silent fail
            }
          }

          response = await apiGetLeadsWithDomain({
            filters,
            page: targetPage,
            limit: apiParams.limit || 50,
            ...(sortBy && { sortBy }),
            ...(sortOrder && { sortOrder }),
          });
        } else if (isOffersProgressApi) {
          // ✅ Offers Progress API (/offers/progress) - For openings, confirmations, payments, netto1, netto2, lost
          // Use apiParams which already has all params correctly formatted
          // The domain parameter is kept as a string (not parsed to JSON) to prevent
          // axios from serializing it as domain[0][0], domain[0][1], etc.
          const { apiGetOffersProgress } = await import('@/services/OffersProgressService');
          
          const finalParams = {
            ...apiParams,
            page: targetPage, // Use targetPage (can be page 1)
            // has_progress is already in apiParams from URL parsing
          };

          // Use offers progress API with all parameters including domain as string
          response = await apiGetOffersProgress(finalParams);
        } else if (isOffersApi) {
          // ✅ Offers API (/offers) - Use apiParams which already has all params correctly formatted
          // The domain parameter is kept as a string (not parsed to JSON) to prevent
          // axios from serializing it as domain[0][0], domain[0][1], etc.
          // Axios will automatically URL-encode the string value
          const finalParams = {
            ...apiParams,
            page: targetPage, // Use targetPage (can be page 1)
          };

          // Use offers API with all parameters including domain as string
          response = await apiGetOffers(finalParams);
        } else if (isClosedLeadsApi) {
          const { apiGetClosedLeads } = await import('@/services/LeadsService');
          response = await apiGetClosedLeads(apiParams as any);
        } else {
          // Regular leads API
          response = await apiGetLeads(apiParams);
        }

        if (response?.data && response?.meta) {
          const meta = response.meta;

          // Extract data based on response type (dynamic filters, grouped, offers, offers progress, or regular leads)
          let dataToStore;
          if (isDynamicFiltersApi) {
            // Dynamic filters response: data is directly the leads array
            dataToStore = response.data || [];
          } else if (isOffersProgressApi || isOffersApi) {
            // ✅ Offers Progress API or Offers API response: data is offers array
            // For offers, we need to normalize _id to lead_id for navigation
            const offers = Array.isArray(response.data) ? response.data : [];
            dataToStore = offers.map((offer: any) => ({
              ...offer,
              _id: offer.lead_id?._id || offer.leadId || offer._id, // Use lead_id for navigation
              leadId: offer.lead_id?._id || offer.leadId, // Store leadId separately
            }));
          } else {
            // Regular leads response (or legacy grouped format with data.leads)
            const data = response.data;
            let raw =
              typeof data === 'object' && !Array.isArray(data) && (data as any).leads
                ? (data as any).leads
                : data;
            raw = Array.isArray(raw) ? raw : [];
            dataToStore = isClosedLeadsApi ? mapClosedLeadsForNavigation(raw) : raw;
          }

          // CRITICAL: Extract pagination metadata based on API type
          // Dynamic filters API has nested pagination: meta.pagination.{total, page, limit}
          // Regular/Grouped/Offers Progress APIs have flat structure: meta.{total, page, limit}
          let paginationMeta;
          if (isDynamicFiltersApi && (meta as any).pagination) {
            const pagination = (meta as any).pagination;
            paginationMeta = {
              page: pagination.page || targetPage,
              limit: pagination.limit || apiParams.limit,
              total: pagination.total || 0,
              pages: Math.ceil((pagination.total || 0) / (pagination.limit || apiParams.limit)),
            };
          } else {
            // Regular/Grouped/Offers Progress APIs
            // Note: OffersProgressService meta has 'pages', but LeadsService Meta type doesn't
            const metaWithPages = meta as any;
            paginationMeta = {
              page: meta.page || targetPage,
              limit: meta.limit || apiParams.limit,
              total: meta.total || 0,
              pages: metaWithPages.pages || Math.ceil((meta.total || 0) / (meta.limit || apiParams.limit)),
            };
          }

          // Update navigation store
          setFilteredItems(dataToStore, paginationMeta);

          // Update sessionStorage with current page number when navigating
          if (isDynamicFiltersApi && paginationMeta) {
            try {
              // Use single key: dynamic-filters-body
              const savedBody = sessionStorage.getItem('dynamic-filters-body');
              if (savedBody) {
                const parsed = JSON.parse(savedBody);
                sessionStorage.setItem(
                  'dynamic-filters-body',
                  JSON.stringify({
                    ...parsed,
                    page: paginationMeta.page,
                    limit: paginationMeta.limit,
                  })
                );
              }
            } catch {
              // Silent fail
            }
          }

          // Build updated API URL for next navigation
          const newApiUrl = `${url.pathname}?${searchParams.toString()}`;
          setApiUrl(newApiUrl);

          // Update filter state with new pagination meta and apiUrl for next navigation
          setFilterState({
            ...filterStateToUse,
            paginationMeta,
            apiUrl: newApiUrl,
          });

          // If targetItemId is provided, find and navigate to it
          if (targetItemId) {
            const itemIndex = dataToStore.findIndex(
              (item: any) => item._id.toString() === targetItemId
            );
            if (itemIndex >= 0) {
              setCurrentFilteredIndex(itemIndex);
              router.push(`/dashboards/leads/${targetItemId}`);
            }
          }
          // If targetItemId is empty, the caller will handle navigation (e.g., to first item)
          // This allows goToNextUser to navigate to the first item of the next page
        }
      } catch (error) {
        throw error; // Re-throw so caller can handle it
      }
    },
    [
      apiUrl,
      currentFilterState,
      setFilteredItems,
      setFilterState,
      setApiUrl,
      setCurrentFilteredIndex,
      router,
      // Note: We read values synchronously from store, but include deps for linter
    ]
  );

  const goToPreviousUser = useCallback(() => {
    // If user came from search, redirect to leads list
    if (currentFilterState?.isFromSearch === true) {
      router.push('/dashboards/leads');
      return;
    }

    // Check if we have filtered results and use them
    if (currentFilterState && totalFilteredItems > 0 && paginationMeta) {
      const currentPosition = getCurrentFilteredPosition();
      const previousPosition = currentPosition - 1;

      if (previousPosition < 1) {
        router.push('/dashboards/leads');
        return;
      }

      // Check if previous item is in current page
      if (currentFilteredIndex > 0) {
        // Previous item is in current page
        const previousItem = getPreviousFilteredItem();
        if (previousItem) {
          router.push(`/dashboards/leads/${previousItem._id}`);
          return;
        }
      } else {
        // Need to fetch previous page
        const previousPage = paginationMeta.page - 1;
        if (previousPage >= 1) {
          // Fetch previous page - the function will update store, then we navigate to last item
          fetchPageAndNavigate(previousPage, '').then(() => {
            // Get updated filtered items from store after fetch
            const navStore = useFilterAwareLeadsNavigationStore.getState();
            const updatedItems = navStore.filteredItems;
            if (updatedItems.length > 0) {
              const lastItem = updatedItems[updatedItems.length - 1];
              navStore.setCurrentFilteredIndex(updatedItems.length - 1);
              router.push(`/dashboards/leads/${lastItem._id}`);
            }
          });
          return;
        }
      }
    }

    // Fallback to original navigation
    const previousUser = getPreviousLeads();
    if (previousUser) {
      router.push(`/dashboards/leads/${previousUser?._id}`);
    } else {
      router.push('/dashboards/leads');
    }
  }, [
    currentFilterState,
    totalFilteredItems,
    paginationMeta,
    currentFilteredIndex,
    getCurrentFilteredPosition,
    getPreviousFilteredItem,
    fetchPageAndNavigate,
    filteredItems,
    getPreviousLeads,
    router,
  ]);

  const goToNextUser = useCallback(() => {
    // If user came from search, redirect to leads list
    if (currentFilterState?.isFromSearch === true) {
      router.push('/dashboards/leads');
      return;
    }

    // CRITICAL: Read values synchronously from store at call time, not from closure
    // This ensures we always have the latest values, even if component hasn't re-rendered
    const navStore = useFilterAwareLeadsNavigationStore.getState();
    const apiUrlStore = useApiUrlStore.getState();

    // Use effectivePaginationMeta or fallback to synchronous read from store
    const metaToUse = effectivePaginationMeta || paginationMeta || navStore.paginationMeta;

    // Read apiUrl - priority: store > filterState (for when store has stale/empty URL)
    const apiUrlToUse = apiUrl || apiUrlStore.apiUrl || navStore.currentFilterState?.apiUrl;

    // Also read totalFilteredItems synchronously
    const totalToUse = totalFilteredItems > 0 ? totalFilteredItems : navStore.totalFilteredItems;

    // CRITICAL: If we have metaToUse and apiUrlToUse, we can proceed
    // This handles cases where filterState wasn't set but paginationMeta exists
    // fetchPageAndNavigate will create a minimal filterState if needed
    const canProceed = metaToUse && apiUrlToUse && totalToUse > 0;

    // Check if we have filtered results and use them
    // Also check if we have apiUrl for fetching next page
    if (canProceed) {
      // Read current position and index synchronously from store
      const currentPos = navStore.getCurrentFilteredPosition();
      const nextPosition = currentPos + 1;
      const currentIdx = navStore.currentFilteredIndex;
      const items = navStore.filteredItems;

      // CRITICAL: Use metaToUse.total instead of totalFilteredItems
      // totalFilteredItems might be the page limit (50), not the actual total (353)
      if (nextPosition > metaToUse.total) {
        router.push('/dashboards/leads');
        return;
      }

      // Check if next item is in current page
      // currentFilteredIndex is 0-based, so if we're at index 49 (item 50) and length is 50,
      // then 49 < 49 is false, so we need to fetch next page
      if (currentIdx < items.length - 1) {
        // Next item is in current page
        const nextItem = navStore.getNextFilteredItem();
        if (nextItem) {
          router.push(`/dashboards/leads/${nextItem._id}`);
          return;
        }
      } else {
        // Need to fetch next page
        // Use metaToUse to get the correct page number
        const nextPage = metaToUse.page + 1;
        if (nextPage <= metaToUse.pages) {
          // Fetch next page - the function will update store, then we navigate to first item
          // Use apiUrlToUse instead of apiUrl to ensure we have the URL
          fetchPageAndNavigate(nextPage, '')
            .then(() => {
              // Get updated filtered items from store after fetch
              const navStore = useFilterAwareLeadsNavigationStore.getState();
              const updatedItems = navStore.filteredItems;
              if (updatedItems.length > 0) {
                const firstItem = updatedItems[0];
                navStore.setCurrentFilteredIndex(0);
                router.push(`/dashboards/leads/${(firstItem as any)._id}`);
              } else {
                // If no items in next page, go back to list
                router.push('/dashboards/leads');
              }
            })
            .catch((error) => {
              router.push('/dashboards/leads');
            });
          return;
        }
      }
    }

    // Fallback to original navigation
    const nextUser = getNextLeads();
    if (nextUser) {
      router.push(`/dashboards/leads/${nextUser?._id}`);
    } else {
      router.push('/dashboards/leads');
    }
  }, [
    // Note: We read values synchronously from store at call time for latest values,
    // but include these deps for React's linter. The sync reads ensure we get fresh data.
    currentFilterState,
    totalFilteredItems,
    effectivePaginationMeta,
    paginationMeta,
    apiUrl,
    fetchPageAndNavigate,
    getNextLeads,
    router,
  ]);

  const handleMeetingClick = (leadId: string, leadName: string) => {
    // Navigate to the meeting calendar page with the lead data
    router.push(`/dashboards/meetings?leadId=${leadId}&leadName=${encodeURIComponent(leadName)}`);
  };

  // Get the current position and total users count
  // Use filtered navigation if available, otherwise fallback to original
  const currentPosition =
    currentFilterState && totalFilteredItems > 0
      ? getCurrentFilteredPosition()
      : getCurrentPosition();
  // Always prioritize paginationMeta.total if available (most accurate source)
  // This ensures we show the correct total immediately when navigating from list page
  // CRITICAL: NEVER use totalFilteredItems if paginationMeta exists - totalFilteredItems might be page limit (50)
  // The store from list page has paginationMeta.total = 353, which is the correct total
  const totalUsers = useMemo(() => {
    // FIRST PRIORITY: effectivePaginationMeta.total from Zustand store
    // This is set by the list page and contains the correct total (353)
    // We use effectivePaginationMeta which includes subscription, synchronous read, and initial value
    // CRITICAL: Check effectivePaginationMeta FIRST - if it exists, use it, don't fall back to totalFilteredItems
    if (effectivePaginationMeta?.total !== undefined && effectivePaginationMeta.total > 0) {
      return effectivePaginationMeta.total;
    }

    // SECOND PRIORITY: Only use totalFilteredItems if paginationMeta is completely unavailable
    // But ONLY if we're sure it's not just the page limit
    // If totalFilteredItems equals filteredItems.length, it's likely the page limit, not the total
    if (currentFilterState && totalFilteredItems > 0) {
      // Check if totalFilteredItems might be the page limit
      const filteredItemsCount = filteredItems.length;
      // If totalFilteredItems is significantly larger than current page items, it's probably the real total
      // Otherwise, it might be the page limit, so don't use it
      if (totalFilteredItems > filteredItemsCount || filteredItemsCount === 0) {
        return totalFilteredItems;
      }
    }

    // Fallback: get from regular navigation store
    return getTotalLeads();
  }, [
    effectivePaginationMeta,
    currentFilterState,
    totalFilteredItems,
    filteredItems.length,
    getTotalLeads,
  ]);

  // Check if user came from search - if so, override navigation to show only 1 result
  const isFromSearch = currentFilterState?.isFromSearch === true;
  const finalCurrentPosition = isFromSearch ? 1 : currentPosition;
  const finalTotalUsers = isFromSearch ? 1 : totalUsers;

  // Calculate canGoToPrevious and canGoToNext directly using effectivePaginationMeta
  // This ensures we use the correct total count (353) immediately, not the page limit (50)
  const finalCanGoToPrevious = useMemo(() => {
    if (isFromSearch) return false;
    if (currentFilterState && effectivePaginationMeta) {
      // Use effectivePaginationMeta.total for accurate comparison
      return currentPosition > 1;
    }
    return currentPosition > 1;
  }, [isFromSearch, currentFilterState, effectivePaginationMeta, currentPosition]);

  const finalCanGoToNext = useMemo(() => {
    if (isFromSearch) return false;
    if (currentFilterState && effectivePaginationMeta) {
      // CRITICAL: Use effectivePaginationMeta.total instead of totalFilteredItems
      // This ensures we compare against the actual total (353), not the page limit (50)
      return currentPosition < effectivePaginationMeta.total;
    }
    // Fallback: use totalUsers which also prioritizes effectivePaginationMeta.total
    return currentPosition < totalUsers;
  }, [isFromSearch, currentFilterState, effectivePaginationMeta, currentPosition, totalUsers]);

  // Determine if user has applied filters by checking if API URL contains 'domain' parameter
  // This indicates user-applied filters (search, status, custom filters, etc.)
  // Only show "Filtered" badge when domain parameter exists in the stored API URL
  const hasUserAppliedFilters = useMemo(() => {
    if (!apiUrl) return false;

    try {
      // Check if the URL contains a 'domain' parameter
      // The domain parameter is present when users apply filters/grouping
      const url = new URL(apiUrl, window.location.origin);
      const domainParam = url.searchParams.get('domain');

      // If domain parameter exists and is not empty, user has applied filters
      return !!domainParam && domainParam.trim() !== '';
    } catch {
      // If URL parsing fails, return false
      return false;
    }
  }, [apiUrl]);

  /**
   * Navigate to lead detail page from row click (moved from CellInlineEdit.tsx)
   * This function handles fetching data and updating navigation stores before navigating
   */
  const navigateToLeadFromRowClick = useCallback(
    async (
      leadId: string,
      apiUrlToUse: string,
      effectiveEntityTypeLower: string,
      groupFilterState: any,
      externalLeadId?: string
    ) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('navigateToLeadFromRowClick - GroupSummary filterState:', groupFilterState);
        console.log('navigateToLeadFromRowClick - apiUrlToUse:', apiUrlToUse);
        console.log('navigateToLeadFromRowClick - leadId:', leadId);
        console.log('navigateToLeadFromRowClick - effectiveEntityTypeLower:', effectiveEntityTypeLower);
      }

      if (!apiUrlToUse) {
        // Fallback to simple navigation if no apiUrl is available
        router.push(`/dashboards/leads/${externalLeadId || leadId}`);
        return;
      }

      try {
        const url = new URL(apiUrlToUse, window.location.origin);
        const endpoint = url.pathname;
        const searchParams = new URLSearchParams(url.search);

        const apiParams: Record<string, any> = {
          page: parseInt(searchParams.get('page') || '1', 10),
          limit: parseInt(searchParams.get('limit') || '50', 10),
        };

        searchParams.forEach((value, key) => {
          if (key !== 'page' && key !== 'limit') {
            if (key === 'duplicate' || key === '_key') {
              apiParams[key] = parseInt(value, 10);
            } else if (value === 'true') {
              apiParams[key] = true;
            } else if (value === 'false') {
              apiParams[key] = false;
            } else if (key === 'domain' || key === 'filters') {
              apiParams[key] = value;
            } else {
              apiParams[key] = value;
            }
          }
        });

        const isDynamicFiltersApi = endpoint.includes('/dynamic-filters/apply');
        const isOffersProgressApi = endpoint.includes('/offers/progress');
        const isOffersApi = endpoint.includes('/offers') && !isOffersProgressApi;
        const isClosedLeadsApi = endpoint.includes('/closed-leads');

        let response;
        if (isDynamicFiltersApi) {
          const { apiGetLeadsWithDomain } = await import('@/services/LeadsService');
          const { filters = [], sortBy, sortOrder } = JSON.parse(
            sessionStorage.getItem('dynamic-filters-body') || '{}'
          );
          response = await apiGetLeadsWithDomain({
            filters,
            page: apiParams.page,
            limit: apiParams.limit,
            ...(sortBy && { sortBy }),
            ...(sortOrder && { sortOrder }),
          });
        } else if (isOffersProgressApi) {
          response = await apiGetOffersProgress(apiParams);
        } else if (isOffersApi) {
          response = await apiGetOffers(apiParams);
        } else if (isClosedLeadsApi) {
          const { apiGetClosedLeads } = await import('@/services/LeadsService');
          response = await apiGetClosedLeads(apiParams as any);
        } else {
          response = await apiGetLeads(apiParams);
        }

        if (response?.data && response?.meta) {
          const meta = response.meta;

          let dataToStore;
          if (isDynamicFiltersApi) {
            dataToStore = response.data || [];
          } else if (isOffersProgressApi || isOffersApi) {
            const offers = Array.isArray(response.data) ? response.data : [];
            dataToStore = offers.map((offer: any) => ({
              ...offer,
              _id: offer.lead_id?._id || offer.leadId || offer._id,
              leadId: offer.lead_id?._id || offer.leadId,
            }));
          } else {
            const data = response.data;
            let raw =
              typeof data === 'object' && !Array.isArray(data) && (data as any).leads
                ? (data as any).leads
                : data;
            raw = Array.isArray(raw) ? raw : [];
            dataToStore = isClosedLeadsApi ? mapClosedLeadsForNavigation(raw) : raw;
          }

          let paginationMeta;
          if (isDynamicFiltersApi && (meta as any).pagination) {
            const pagination = (meta as any).pagination;
            paginationMeta = {
              page: pagination.page || apiParams.page,
              limit: pagination.limit || apiParams.limit,
              total: pagination.total || 0,
              pages: Math.ceil((pagination.total || 0) / (pagination.limit || apiParams.limit)),
            };
          } else {
            const metaWithPages = meta as any;
            paginationMeta = {
              page: meta.page || apiParams.page,
              limit: meta.limit || apiParams.limit,
              total: meta.total || 0,
              pages: metaWithPages.pages || Math.ceil((meta.total || 0) / (meta.limit || apiParams.limit)),
            };
          }

          // Update appropriate navigation store
          let navStore: any = null;
          if (effectiveEntityTypeLower === 'lead') {
            navStore = useFilterAwareLeadsNavigationStore.getState();
          } else if (effectiveEntityTypeLower === 'offer') {
            navStore = useFilterAwareOffersNavigationStore.getState();
          } else if (effectiveEntityTypeLower === 'opening') {
            navStore = useFilterAwareOpeningsNavigationStore.getState();
          }

          if (navStore) {
            // Ensure filterState includes sortBy and sortOrder from groupFilterState if available
            const finalFilterState = groupFilterState || {
              isGroupedMode: false,
              groupBy: undefined,
              groupPath: [],
              sortBy: undefined,
              sortOrder: undefined,
              paginationMeta: paginationMeta, // Use the fetched paginationMeta
            };

            navStore.setFilteredItems(dataToStore, paginationMeta);
            navStore.setFilterState(finalFilterState);

            // ✅ Sync to leads navigation store for all progress pages (offers, openings, confirmations, payments, netto)
            // The lead details page reads from useFilterAwareLeadsNavigationStore
            if (isProgressEntityType(effectiveEntityTypeLower)) {
              const leadsNavStore = useFilterAwareLeadsNavigationStore.getState();
              const itemsAsLeads = dataToStore.map((item: any) => ({
                ...item,
                _id: item.leadId || item.lead_id?._id || item._id,
                offerId: item._id,
              }));
              leadsNavStore.setFilteredItems(itemsAsLeads, paginationMeta);
              leadsNavStore.setFilterState(finalFilterState);
              
              // Also set the index in leads store
              const leadIndex = itemsAsLeads.findIndex(
                (item: any) => item._id.toString() === leadId
              );
              if (leadIndex !== -1) {
                leadsNavStore.setCurrentFilteredIndex(leadIndex);
              }
            }

            // Set the current filtered index to the clicked item
            const itemIndex = dataToStore.findIndex(
              (item: any) => item._id.toString() === leadId
            );
            if (itemIndex !== -1) {
              navStore.setCurrentFilteredIndex(itemIndex);
            }
          }
          router.push(`/dashboards/leads/${externalLeadId || leadId}`);
        }
      } catch (error) {
        console.error('Error fetching data for navigation:', error);
        router.push(`/dashboards/leads/${externalLeadId || leadId}`); // Fallback navigation
      }
    },
    [router]
  );

  return {
    currentPosition: finalCurrentPosition,
    totalUsers: finalTotalUsers,
    goToPreviousUser,
    goToNextUser,
    handleMeetingClick,
    canGoToPrevious: finalCanGoToPrevious,
    canGoToNext: finalCanGoToNext,
    // Additional methods for setting current index
    findFilteredIndexById,
    setCurrentFilteredIndex,
    // Filter state info - only show "Filtered" when domain parameter exists in API URL
    hasActiveFilters: hasUserAppliedFilters,
    filterState: currentFilterState,
    // Function to navigate from row click (moved from CellInlineEdit.tsx)
    navigateToLeadFromRowClick,
  };
};
