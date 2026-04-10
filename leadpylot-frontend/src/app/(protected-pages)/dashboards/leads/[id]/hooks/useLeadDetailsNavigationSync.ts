'use client';

import { useEffect, useRef } from 'react';

import { Lead } from '@/services/LeadsService';
import {
  useFilterAwareLeadsNavigationStore,
  useLeadsNavigationStore,
} from '@/stores/navigationStores';
import { buildPaginationMeta } from '@/utils/buildPaginationMeta';
import { normalizeOffersToLeads } from '@/utils/normalizeOffersToLeads';
import type { ApiUrlInfo } from './useLeadDetailsApiUrlInfo';
import { mapClosedLeadsForNavigation } from '@/utils/closedLeadNavigation';

const DEFAULT_PAGE_LIMIT = 50;

interface NavigationSyncParams {
  lead: { _id?: string } | null | undefined;
  navigationItemsLength: number;
  apiUrl: string | null | undefined;
  apiUrlInfo: ApiUrlInfo | null;
  shouldFetchLeads: boolean;
  shouldFetchClosedLeads: boolean;
  shouldFetchOffers: boolean;
  shouldFetchOffersProgress: boolean;
  leadsData: { data?: unknown[]; meta?: unknown } | undefined;
  closedLeadsData: { data?: unknown[]; meta?: unknown } | undefined;
  offersData: { data?: unknown[]; meta?: unknown } | undefined;
  offersProgressData: {
    data?: unknown[];
    meta?: unknown;
  } | undefined;
}

function buildFilterStateFromParams(
  apiUrlInfo: ApiUrlInfo | null,
  metaToUse: { page: number; limit: number; total: number; pages: number },
  apiUrl: string | null | undefined
): Record<string, unknown> {
  const filterState: Record<string, unknown> = {
    paginationMeta: metaToUse,
    apiUrl,
  };

  if (!apiUrlInfo?.params) return filterState;

  const params = apiUrlInfo.params as Record<string, unknown>;

  if (apiUrlInfo.type === 'regular') {
    if (params.search) filterState.search = params.search;
    if (params.duplicate !== undefined) filterState.duplicate = params.duplicate;
    if (params.use_status) filterState.use_status = params.use_status;
    if (params.showInactive) filterState.showInactive = params.showInactive;
    if (params.has_todo) filterState.has_todo = params.has_todo;
    if (params.source) filterState.source = params.source;
    if (params.status) filterState.status = params.status;
    if (params.has_schedule) filterState.has_schedule = params.has_schedule;
    if (params.project_id) filterState.project_id = params.project_id;
    if (params.agent_name) filterState.agent_name = params.agent_name;
    if (params.sortBy) filterState.sortBy = params.sortBy;
    if (params.sortOrder) filterState.sortOrder = params.sortOrder;
  } else if (apiUrlInfo.type === 'offers-progress') {
    if (params.search) filterState.search = params.search;
    if (params.has_progress) filterState.has_progress = params.has_progress;
    if (params.sortBy) filterState.sortBy = params.sortBy;
    if (params.sortOrder) filterState.sortOrder = params.sortOrder;
    if (params.domain) filterState.domain = params.domain;
  } else if (apiUrlInfo.type === 'offers') {
    if (params.search) filterState.search = params.search;
    if (params.status) filterState.status = params.status;
    if (params.sortBy) filterState.sortBy = params.sortBy;
    if (params.sortOrder) filterState.sortOrder = params.sortOrder;
    if (params.has_transferred_offer)
      filterState.has_transferred_offer = params.has_transferred_offer;
    if (params.domain) filterState.domain = params.domain;
  } else if (apiUrlInfo.type === 'closed-leads') {
    if (params.domain) filterState.domain = params.domain;
    if (params.project_id) filterState.project_id = params.project_id;
    if (params.contact_name) filterState.contact_name = params.contact_name;
    if (params.sortBy) filterState.sortBy = params.sortBy;
    if (params.sortOrder !== undefined) filterState.sortOrder = params.sortOrder;
    if (params.groupBy) filterState.groupBy = params.groupBy;
    if (params.values) filterState.values = params.values;
    if (params.is_reverted !== undefined) filterState.is_reverted = params.is_reverted;
  }

  return filterState;
}

export default function useLeadDetailsNavigationSync({
  lead,
  navigationItemsLength,
  apiUrl,
  apiUrlInfo,
  shouldFetchLeads,
  shouldFetchClosedLeads,
  shouldFetchOffers,
  shouldFetchOffersProgress,
  leadsData,
  closedLeadsData,
  offersData,
  offersProgressData,
}: NavigationSyncParams) {
  const lastDataLengthRef = useRef(0);
  const lastTotalRef = useRef(0);
  const lastSyncedMetaRef = useRef<string>('');
  /** When /closed-leads apiUrl changes (different expanded group), force list re-sync. */
  const prevClosedLeadsApiUrlRef = useRef<string | undefined>(undefined);

  // Preserve paginationMeta from store on mount (when navigating from list page)
  useEffect(() => {
    const navStore = useFilterAwareLeadsNavigationStore.getState();

    if (navStore.paginationMeta) {
      const existingFilterState = navStore.currentFilterState || {};
      if (
        !existingFilterState.paginationMeta ||
        existingFilterState.paginationMeta.total !== navStore.paginationMeta.total
      ) {
        navStore.setFilterState({
          ...existingFilterState,
          paginationMeta: navStore.paginationMeta,
        });
      }
    }
  }, []);

  // Store data in filter-aware navigation store when loaded
  useEffect(() => {
    if (!lead) return;

    let dataToStore: Lead[] | null = null;
    let paginationMeta: { page: number; limit: number; total: number; pages: number } | null = null;

    if (shouldFetchOffersProgress && offersProgressData?.data && offersProgressData?.meta) {
      const offers = (Array.isArray(offersProgressData.data) ? offersProgressData.data : []) as any[];
      dataToStore = normalizeOffersToLeads(offers, {
        includeLeadId: true,
      }) as unknown as Lead[];
      paginationMeta = buildPaginationMeta(
        offersProgressData.meta as { page?: number; limit?: number; total?: number; pages?: number },
        DEFAULT_PAGE_LIMIT
      );
    } else if (shouldFetchOffers && offersData?.data && offersData?.meta) {
      dataToStore = normalizeOffersToLeads(offersData.data as any[]) as unknown as Lead[];
      paginationMeta = buildPaginationMeta(
        offersData.meta as { page?: number; limit?: number; total?: number; pages?: number },
        DEFAULT_PAGE_LIMIT
      );
    } else if (shouldFetchClosedLeads && closedLeadsData?.data && closedLeadsData?.meta) {
      dataToStore = mapClosedLeadsForNavigation(closedLeadsData.data as any[]) as unknown as Lead[];
      paginationMeta = buildPaginationMeta(
        closedLeadsData.meta as { page?: number; limit?: number; total?: number; pages?: number },
        DEFAULT_PAGE_LIMIT
      );
    } else if (shouldFetchLeads && leadsData?.data && leadsData?.meta) {
      dataToStore = leadsData.data as Lead[];
      paginationMeta = buildPaginationMeta(
        leadsData.meta as { page?: number; limit?: number; total?: number; pages?: number },
        DEFAULT_PAGE_LIMIT
      );
    }

    const navStore = useFilterAwareLeadsNavigationStore.getState();
    const metaKey = paginationMeta ? JSON.stringify(paginationMeta) : '';
    const shouldUpdateMeta =
      paginationMeta !== null &&
      (!navStore.paginationMeta || navStore.paginationMeta.total !== paginationMeta.total) &&
      metaKey !== lastSyncedMetaRef.current;

    if (shouldUpdateMeta && paginationMeta) {
      lastSyncedMetaRef.current = metaKey;
      navStore.setPaginationMeta(paginationMeta);
      const existingFilterState = navStore.currentFilterState || {};
      navStore.setFilterState({
        ...existingFilterState,
        paginationMeta,
      });
    } else if (navStore.paginationMeta && !paginationMeta) {
      const existingFilterState = navStore.currentFilterState || {};
      const existingMetaKey = JSON.stringify(navStore.paginationMeta);
      if (
        (!existingFilterState.paginationMeta ||
          existingFilterState.paginationMeta.total !== navStore.paginationMeta.total) &&
        existingMetaKey !== lastSyncedMetaRef.current
      ) {
        lastSyncedMetaRef.current = existingMetaKey;
        navStore.setFilterState({
          ...existingFilterState,
          paginationMeta: navStore.paginationMeta,
        });
      }
    }

    if (dataToStore) {
      const metaToUse = paginationMeta || navStore.paginationMeta;
      if (shouldFetchClosedLeads && apiUrl) {
        if (
          prevClosedLeadsApiUrlRef.current !== undefined &&
          prevClosedLeadsApiUrlRef.current !== apiUrl
        ) {
          lastDataLengthRef.current = -1;
          lastTotalRef.current = -1;
        }
        prevClosedLeadsApiUrlRef.current = apiUrl;
      }
      const isStoreEmpty = navigationItemsLength === 0 || !navStore.filteredItems.length;
      const currentTotal = metaToUse?.total ?? 0;
      const dataChanged =
        dataToStore.length !== lastDataLengthRef.current ||
        currentTotal !== lastTotalRef.current;
      const totalChanged = metaToUse && navStore.paginationMeta?.total !== metaToUse.total;

      if (!isStoreEmpty && !dataChanged && !totalChanged && metaToUse) {
        if (shouldFetchClosedLeads && dataToStore.length > 0) {
          const idx = dataToStore.findIndex(
            (item: Lead) => item._id?.toString() === lead._id?.toString()
          );
          if (idx >= 0) {
            const currentPage = metaToUse.page || 1;
            const currentLimit = metaToUse.limit || 50;
            const globalIndex = (currentPage - 1) * currentLimit + idx;
            if (navStore.findFilteredIndexById(String(lead._id)) !== globalIndex) {
              navStore.setCurrentFilteredIndex(globalIndex);
            }
          }
        }
        return;
      }

      const needsDataUpdate =
        isStoreEmpty || !navStore.filteredItems.length || totalChanged || dataChanged;

      if (needsDataUpdate && metaToUse) {
        lastDataLengthRef.current = dataToStore.length;
        lastTotalRef.current = currentTotal;
        lastSyncedMetaRef.current = JSON.stringify(metaToUse);

        const { setFilteredItems, setFilterState } = navStore;
        setFilteredItems(dataToStore, metaToUse);

        const filterState = buildFilterStateFromParams(apiUrlInfo, metaToUse, apiUrl);
        setFilterState(filterState as any);

        const storedIndex = dataToStore.findIndex(
          (item: Lead) => item._id?.toString() === lead._id
        );
        if (storedIndex >= 0) {
          const currentPage = metaToUse.page || 1;
          const currentLimit = metaToUse.limit || 50;
          const globalIndex = (currentPage - 1) * currentLimit + storedIndex;
          navStore.setCurrentFilteredIndex(globalIndex);
        }

        const leadsLegacy = useLeadsNavigationStore.getState();
        if (shouldFetchClosedLeads) {
          leadsLegacy.setItems(dataToStore);
        } else {
          leadsLegacy.addItems(dataToStore);
        }
        leadsLegacy.setTotalItems(metaToUse.total);
      }
    }
  }, [
    lead,
    navigationItemsLength,
    apiUrl,
    apiUrlInfo,
    shouldFetchLeads,
    shouldFetchClosedLeads,
    leadsData?.data,
    leadsData?.meta,
    closedLeadsData?.data,
    closedLeadsData?.meta,
    shouldFetchOffers,
    offersData?.data,
    offersData?.meta,
    shouldFetchOffersProgress,
    offersProgressData?.data,
    offersProgressData?.meta,
  ]);
}
