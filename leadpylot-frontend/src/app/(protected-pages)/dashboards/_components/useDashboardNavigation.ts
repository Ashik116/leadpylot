import React from 'react';
import { useRouter } from 'next/navigation';
import { useApiUrlStore } from '@/stores/apiUrlStore';
import { useEmailViewStore } from '@/stores/emailViewStore';
import {
  useFilterAwareLeadsNavigationStore,
  useFilterAwareOffersNavigationStore,
  useFilterAwareOpeningsNavigationStore,
  useFilterAwareUsersNavigationStore,
} from '@/stores/navigationStores';
import { isProgressDashboardType } from '@/utils/dashboardUtils';
import { DashboardType, TDashboardType } from './dashboardTypes';

type UseDashboardNavigationArgs = {
  config: {
    enableRowClick?: boolean;
    getRowClickPath?: (row: any) => string;
    tableName: string;
  };
  dashboardType: TDashboardType;
  entityType: string;
  selectedProgressFilter: TDashboardType;
  domainFilters: any[];
  dataHookParams?: Record<string, any>;
  pageIndex: number;
  pageSize: number;
  search: string | null;
  sortBy?: string;
  sortOrder?: string;
  transformedData: any[];
  preFetchedData?: { data?: any[]; meta?: any };
  apiData?: { data?: any[]; meta?: any };
  shouldSkipFlatViewApi: boolean;
  selectedGroupByLength: number;
  handleOpenOpeningDetails: (rowData: any) => void;
  handleOpenOfferDetails: (rowData: any) => void;
};

export const useDashboardNavigation = ({
  config,
  dashboardType,
  entityType,
  selectedProgressFilter,
  domainFilters,
  dataHookParams,
  pageIndex,
  pageSize,
  search,
  sortBy,
  sortOrder,
  transformedData,
  preFetchedData,
  apiData,
  shouldSkipFlatViewApi,
  selectedGroupByLength,
  handleOpenOpeningDetails,
  handleOpenOfferDetails,
}: UseDashboardNavigationArgs) => {
  const router = useRouter();

  // ✅ Use refs to track last synced data and prevent infinite loops
  const lastSyncedDataRef = React.useRef<string>('');
  const lastSyncedLeadsDataRef = React.useRef<string>('');

  // Keep filter-aware navigation store in sync (flat/non-grouped view)
  React.useEffect(() => {
    // Skip navigation store update for Agent transferred offers view (grouped only)
    if (shouldSkipFlatViewApi) return;

    // Use preFetchedData when available, otherwise use apiData
    const currentData = preFetchedData?.data || apiData?.data;
    const currentMeta = preFetchedData?.meta || apiData?.meta;

    if (selectedGroupByLength === 0 && Array.isArray(currentData) && currentMeta) {
      // ✅ Check if data actually changed to prevent infinite loops
      const dataKey = JSON.stringify({
        dataLength: currentData.length,
        page: currentMeta.page,
        limit: currentMeta.limit,
        total: currentMeta.total,
        firstId: currentData[0]?._id,
        lastId: currentData[currentData.length - 1]?._id,
      });

      // Skip if data hasn't changed
      if (dataKey === lastSyncedDataRef.current) {
        return;
      }

      // Update ref to track what we're syncing
      lastSyncedDataRef.current = dataKey;
      // ✅ CRITICAL: Check if this is a progress page (openings, confirmations, etc.)
      // Progress pages use /offers/progress API which returns offers with lead_id
      const isProgressPage = isProgressDashboardType(dashboardType);

      // ✅ CRITICAL: For offers AND progress pages (which are also offers), keep original offer _id
      // Store leadId separately for navigation to lead details page
      // For other types: use _id directly
      const normalizedData = currentData
        .map((item: any) => {
          // For offers AND progress pages: Keep original offer _id, store leadId separately
          // This allows tracking each offer individually even if same lead
          // Progress pages return offers with lead_id, so we need to extract it
          if ((dashboardType === DashboardType.OFFER || isProgressPage) && item?.lead_id?._id) {
            return {
              ...item,
              _id: String(item._id), // ✅ Keep original offer _id for uniqueness
              leadId: String(item.lead_id._id), // Store lead_id separately for navigation
            };
          }
          // For other types (leads, users, etc.), use _id directly
          return {
            ...item,
            _id: String(item?._id || item?.leadId || item?.lead_id?._id),
          };
        })
        .filter((item: any) => Boolean(item?._id));

      // ✅ NO DEDUPLICATION for offers AND progress pages - keep all offers even if same lead
      // This allows navigation through all offers, including multiple offers for same lead
      // For other types, deduplicate as before
      let dedupedData: any[];
      if (dashboardType === DashboardType.OFFER || isProgressPage) {
        // Keep all offers - no deduplication (for both regular offers and progress pages)
        dedupedData = normalizedData;
      } else {
        // Deduplicate by _id while preserving order (same as CommonLeadsDashboard)
        const seenIds = new Set<string>();
        dedupedData = normalizedData.reduce((acc: any[], curr: any) => {
          const id = String(curr._id);
          if (!seenIds.has(id)) {
            seenIds.add(id);
            acc.push(curr);
          }
          return acc;
        }, []);
      }

      // Get pagination metadata from the response
      const meta = currentMeta;
      const paginationMeta = {
        page: meta.page || pageIndex,
        limit: meta.limit || pageSize,
        total: meta.total || 0,
        pages: meta.pages || Math.ceil((meta.total || 0) / (meta.limit || pageSize)),
      };

      // ✅ Select the correct navigation store based on entity type
      let navStore: any = null;
      const entityTypeLower = entityType.toLowerCase();

      if (entityTypeLower === 'lead') {
        navStore = useFilterAwareLeadsNavigationStore.getState();
      } else if (entityTypeLower === 'offer') {
        navStore = useFilterAwareOffersNavigationStore.getState();
      } else if (entityTypeLower === 'user') {
        navStore = useFilterAwareUsersNavigationStore.getState();
      } else if (entityTypeLower === 'opening') {
        navStore = useFilterAwareOpeningsNavigationStore.getState();
      }

      if (navStore) {
        // Pass paginationMeta as second parameter to setFilteredItems (same as CommonLeadsDashboard)
        navStore.setFilteredItems(dedupedData as any, paginationMeta);
        navStore.setFilterState({
          groupBy: 'flat',
          dynamicFilters: undefined,
          paginationMeta, // Include pagination metadata in filterState
        });
        navStore.setCurrentFilteredIndex(-1);

        // ✅ CRITICAL: For offers and progress pages (openings, confirmations, etc.), also sync to leads navigation store
        // The lead detail page reads from useFilterAwareLeadsNavigationStore
        // This ensures navigation works even when navigating from offers/openings pages
        // Progress pages (openings, confirmations, etc.) are also offers from /offers/progress API
        if (entityTypeLower === 'offer' || entityTypeLower === 'opening' || isProgressPage) {
          const leadsNavStore = useFilterAwareLeadsNavigationStore.getState();

          // Convert offers/progress items to lead-centric view: _id = leadId
          // For offers AND progress pages: use leadId (which we stored separately) or lead_id._id
          // Progress pages are offers, so they have leadId stored from normalization above
          const leadsData = dedupedData.map((item: any) => {
            // Both offers and progress pages have leadId stored separately
            const leadId = item.leadId || item.lead_id?._id;
            return {
              ...item,
              _id: leadId || item._id, // Use leadId for navigation (lead-centric view)
              offerId: item._id, // Keep original offer_id for reference (for both offers and progress)
            };
          });

          // ✅ Check if leads data actually changed to prevent infinite loops
          const leadsDataKey = JSON.stringify({
            dataLength: leadsData.length,
            page: paginationMeta.page,
            limit: paginationMeta.limit,
            total: paginationMeta.total,
            firstId: leadsData[0]?._id,
            lastId: leadsData[leadsData.length - 1]?._id,
          });

          // Only sync if data actually changed
          if (leadsDataKey !== lastSyncedLeadsDataRef.current) {
            lastSyncedLeadsDataRef.current = leadsDataKey;

            // Sync to leads store with lead-centric view
            leadsNavStore.setFilteredItems(leadsData, paginationMeta);
            leadsNavStore.setFilterState({
              groupBy: 'flat',
              dynamicFilters: undefined,
              paginationMeta,
            });

            // ✅ CRITICAL: If there's a current index in the source store, try to map it to leads store
            // This ensures the index is set correctly when data loads (not just on row click)
            const currentSourceIndex = navStore.currentFilteredIndex;
            if (currentSourceIndex >= 0 && currentSourceIndex < navStore.filteredItems.length) {
              const currentSourceItem = navStore.filteredItems[currentSourceIndex];
              if (currentSourceItem) {
                // Find the corresponding item in leads store
                const sourceLeadId =
                  entityTypeLower === 'offer'
                    ? currentSourceItem.leadId || currentSourceItem.lead_id?._id
                    : currentSourceItem.leadId ||
                    currentSourceItem.lead_id?._id ||
                    currentSourceItem._id;

                if (sourceLeadId) {
                  const leadsIndex = leadsNavStore.findFilteredIndexById(String(sourceLeadId));
                  if (leadsIndex >= 0) {
                    leadsNavStore.setCurrentFilteredIndex(leadsIndex);
                  }
                }
              }
            }
          }
        }
      }
    }
  }, [
    preFetchedData?.data,
    preFetchedData?.meta,
    apiData?.data,
    apiData?.meta,
    selectedGroupByLength,
    shouldSkipFlatViewApi,
    pageIndex,
    pageSize,
    dashboardType, // Add dashboardType to dependencies
    entityType, // ✅ Add entityType to dependencies for store selection
  ]);

  // ✅ Handle row click for navigation (similar to leads)
  const handleRowClick = React.useCallback(
    (item: any) => {
      // Block row click when DocumentSlotViewer email modal is open (prevents redirect)
      if (useEmailViewStore.getState().openedFromDocumentSlotViewer) {
        return;
      }
      if (!config.enableRowClick || !config.getRowClickPath) {
        return;
      }

      // ✅ For offers/openings: Use original item _id for tracking
      // For offers: Use offer _id (not lead_id) to track each offer separately
      // For openings: Use opening _id (which should be lead_id for navigation)
      const itemId = item._id?.toString() || item.id?.toString();
      if (!itemId) return;

      // Get the appropriate navigation store based on entity type
      let navStore: any = null;
      const entityTypeLower = entityType.toLowerCase();

      if (entityTypeLower === 'lead') {
        navStore = useFilterAwareLeadsNavigationStore.getState();
      } else if (entityTypeLower === 'offer') {
        navStore = useFilterAwareOffersNavigationStore.getState();
      } else if (entityTypeLower === 'user') {
        navStore = useFilterAwareUsersNavigationStore.getState();
      } else if (entityTypeLower === 'opening') {
        navStore = useFilterAwareOpeningsNavigationStore.getState();
      }

      if (!navStore) return;

      try {
        const { setApiUrl, apiUrl: storedApiUrl } = useApiUrlStore.getState();

        // ✅ Find index by original item _id
        // For offers: Use offer _id (not lead_id) to track each offer separately
        // For openings: Use opening _id (which should be lead_id for navigation)
        const index = navStore.findFilteredIndexById(itemId);

        if (index >= 0) {
          navStore.setCurrentFilteredIndex(index);
        } else {
          // Fallback: try to find in current page data by item _id
          const currentData = transformedData || [];
          const fallbackIndex = currentData?.findIndex(
            (dataItem: any) => String(dataItem?._id || dataItem?.id) === itemId
          );
          if (fallbackIndex >= 0) {
            navStore.setCurrentFilteredIndex(fallbackIndex);
          }
        }

        // ✅ CRITICAL: For offers and progress pages (openings, confirmations, etc.), sync to leads navigation store
        // The lead detail page reads from useFilterAwareLeadsNavigationStore
        // Convert offers/progress items to lead-centric view: _id = leadId
        // Progress pages are also offers from /offers/progress API, so they have leadId stored
        const isProgressPage = [
          DashboardType.OPENING,
          DashboardType.CONFIRMATION,
          DashboardType.PAYMENT,
          DashboardType.NETTO,
          DashboardType.NETTO1,
          DashboardType.NETTO2,
          DashboardType.LOST,
        ].includes(dashboardType);

        if (entityTypeLower === 'offer' || entityTypeLower === 'opening' || isProgressPage) {
          const leadsNavStore = useFilterAwareLeadsNavigationStore.getState();

          // Convert offers/progress items to lead-centric view for navigation
          // Map each item to its leadId (which we stored separately during normalization)
          const itemsAsLeads = navStore.filteredItems.map((item: any) => {
            // Both offers and progress pages have leadId stored separately
            const leadId = item.leadId || item.lead_id?._id;
            return {
              ...item,
              _id: leadId || item._id, // Use leadId for navigation (lead-centric view)
              offerId: item._id, // Keep original offer_id for reference (for both offers and progress)
            };
          });

          // Sync to leads store with lead-centric view
          leadsNavStore.setFilteredItems(itemsAsLeads, navStore.paginationMeta);
          leadsNavStore.setFilterState(navStore.currentFilterState);

          // ✅ Find the correct index in leads store by leadId
          // For both offers and progress pages, we need to find the index using leadId (not the original item _id)
          // Progress pages have leadId stored separately from normalization
          const leadId = item.leadId || item.lead_id?._id;

          if (leadId) {
            // Find index in leads store using leadId
            const leadIndex = leadsNavStore.findFilteredIndexById(String(leadId));

            if (leadIndex >= 0) {
              // ✅ Found the lead in leads store - set the index
              leadsNavStore.setCurrentFilteredIndex(leadIndex);
            } else if (entityTypeLower === 'offer') {
              // For offers: try to match by both leadId AND offerId to find exact offer
              const exactOfferIndex = itemsAsLeads.findIndex(
                (offer: any) =>
                  String(offer._id) === String(leadId) && String(offer.offerId) === String(itemId) // ✅ Match exact offer!
              );
              if (exactOfferIndex >= 0) {
                leadsNavStore.setCurrentFilteredIndex(exactOfferIndex);
              } else {
                // Fallback: use the same index as offers store (if valid)
                if (index >= 0 && index < itemsAsLeads.length) {
                  leadsNavStore.setCurrentFilteredIndex(index);
                }
              }
            } else {
              // For openings: try to find by leadId in the converted data
              const openingIndex = itemsAsLeads.findIndex(
                (opening: any) => String(opening._id) === String(leadId)
              );
              if (openingIndex >= 0) {
                leadsNavStore.setCurrentFilteredIndex(openingIndex);
              } else {
                // Fallback: use the same index as openings store (if valid)
                if (index >= 0 && index < itemsAsLeads.length) {
                  leadsNavStore.setCurrentFilteredIndex(index);
                }
              }
            }
          }
        }

        // ✅ Store API URL for navigation
        // ✅ Priority order: item._apiUrl (from item) > storedApiUrl > buildApiUrl()
        // item._apiUrl is attached by GroupSummary.tsx and contains the correct URL
        const itemApiUrl = (item as any)._apiUrl;
        const apiUrlToStore = itemApiUrl || storedApiUrl;

        if (apiUrlToStore) {
          // ✅ Update api-url-storage with the correct URL (prioritize _apiUrl)
          setApiUrl(apiUrlToStore);
        }

        let apiUrl: string;
        if (itemApiUrl) {
          // Grouped items provide their own API URL
          apiUrl = itemApiUrl;
        } else if (storedApiUrl) {
          // Use stored API URL if available
          apiUrl = storedApiUrl;
        } else {
          // ✅ Build API URL based on dashboard type
          // Check if this is a progress page (openings, confirmations, payments, etc.)
          const isProgressPage = isProgressDashboardType(dashboardType);

          if (isProgressPage) {
            // ✅ For progress pages, use /offers/progress endpoint with has_progress parameter
            const baseUrl = '/offers/progress';
            const params = new URLSearchParams();
            if (pageIndex) params.set('page', String(pageIndex));
            if (pageSize) params.set('limit', String(pageSize));

            // Mirror defaults used by the data hook (e.g. sortOrder=desc) and avoid `domain` on flat progress pages.
            Object.entries(dataHookParams || {}).forEach(([key, value]) => {
              if (value === undefined || value === null) return;
              if (key === 'page' || key === 'limit' || key === 'domain' || key === 'has_progress')
                return;
              if (
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'
              ) {
                params.set(key, String(value));
              }
            });

            if (search) params.set('search', search);
            if (sortBy) params.set('sortBy', sortBy);
            if (sortOrder) params.set('sortOrder', sortOrder);

            // ✅ CRITICAL: Add has_progress parameter (opening, confirmation, payment, netto1, netto2, lost)
            if (selectedProgressFilter) {
              params.set('has_progress', selectedProgressFilter);
            } else if (dashboardType === DashboardType.OPENING) {
              params.set('has_progress', 'opening');
            } else if (dashboardType === DashboardType.CONFIRMATION) {
              params.set('has_progress', 'confirmation');
            } else if (dashboardType === DashboardType.PAYMENT) {
              params.set('has_progress', 'payment');
            } else if (
              dashboardType === DashboardType.NETTO ||
              dashboardType === DashboardType.NETTO1
            ) {
              params.set('has_progress', 'netto1');
            } else if (dashboardType === DashboardType.NETTO2) {
              params.set('has_progress', 'netto2');
            } else if (dashboardType === DashboardType.LOST) {
              params.set('has_progress', 'lost');
            }
            apiUrl = `${baseUrl}?${params.toString()}`;
          } else {
            // For non-progress pages (offers), use config.tableName
            const params = new URLSearchParams();
            if (pageIndex) params.set('page', String(pageIndex));
            if (pageSize) params.set('limit', String(pageSize));
            if (search) params.set('search', search);
            if (sortBy) params.set('sortBy', sortBy);
            if (sortOrder) params.set('sortOrder', sortOrder);
            if (domainFilters && domainFilters.length > 0) {
              params.set('domain', JSON.stringify(domainFilters));
            }
            apiUrl = `/${config.tableName}?${params.toString()}`;
          }
        }
        useApiUrlStore.getState().setApiUrl(apiUrl);

        // Navigate to detail page
        if (dashboardType === DashboardType.OPENING) {
          handleOpenOpeningDetails(item);
        } else if (dashboardType === DashboardType.OFFER) {
          handleOpenOfferDetails(item);
        } else {
          const path = config.getRowClickPath(item);
          router.push(path);
        }
      } catch {
        // Error handled silently
      }
    },
    [
      config,
      entityType,
      dashboardType,
      selectedProgressFilter,
      domainFilters,
      dataHookParams,
      pageIndex,
      pageSize,
      search,
      sortBy,
      sortOrder,
      transformedData,
      router,
      handleOpenOpeningDetails,
      handleOpenOfferDetails,
    ]
  );

  return { handleRowClick };
};
