'use client';

import { useEffect } from 'react';

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

interface IndexSyncParams {
  lead: { _id?: string } | null | undefined;
  navigationItemsLength: number;
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
  apiUrlInfo: ApiUrlInfo | null;
}

function getPaginationMetaFromResponse(
  offersProgressData: IndexSyncParams['offersProgressData'],
  offersData: IndexSyncParams['offersData'],
  leadsData: IndexSyncParams['leadsData'],
  closedLeadsData: IndexSyncParams['closedLeadsData']
): { page: number; limit: number; total: number; pages: number } | null {
  if (offersProgressData?.meta) {
    return buildPaginationMeta(
      offersProgressData.meta as { page?: number; limit?: number; total?: number; pages?: number },
      DEFAULT_PAGE_LIMIT
    );
  }
  if (offersData?.meta) {
    return buildPaginationMeta(
      offersData.meta as { page?: number; limit?: number; total?: number; pages?: number },
      DEFAULT_PAGE_LIMIT
    );
  }
  if (leadsData?.meta) {
    return buildPaginationMeta(
      leadsData.meta as { page?: number; limit?: number; total?: number; pages?: number },
      DEFAULT_PAGE_LIMIT
    );
  }
  if (closedLeadsData?.meta) {
    return buildPaginationMeta(
      closedLeadsData.meta as { page?: number; limit?: number; total?: number; pages?: number },
      DEFAULT_PAGE_LIMIT
    );
  }
  return null;
}

function getCurrentPageData(params: IndexSyncParams): {
  data: { _id: string }[];
  page: number;
  limit: number;
} {
  const {
    shouldFetchOffersProgress,
    offersProgressData,
    shouldFetchOffers,
    offersData,
    shouldFetchLeads,
    shouldFetchClosedLeads,
    leadsData,
    closedLeadsData,
    apiUrlInfo,
  } = params;

  let currentData: { _id: string }[] = [];
  let currentPage = 1;
  let currentLimit = 50;

  if (shouldFetchOffersProgress && offersProgressData?.data) {
    const offers = Array.isArray(offersProgressData.data) ? offersProgressData.data : [];
    currentData = offers
      .map((offer: any) => ({
        _id: String(offer?.lead_id?._id || offer?.leadId || offer?._id || ''),
        ...offer,
      }))
      .filter((item: any) => Boolean(item?._id));
    if (offersProgressData?.meta) {
      currentPage = (offersProgressData.meta as any).page || 1;
      currentLimit = (offersProgressData.meta as any).limit || 50;
    } else if (apiUrlInfo?.type === 'offers-progress' && apiUrlInfo.params) {
      currentPage = (apiUrlInfo.params as any).page || 1;
      currentLimit = (apiUrlInfo.params as any).limit || 50;
    }
  } else if (shouldFetchOffers && offersData?.data) {
    currentData = (offersData.data as any[])
      .map((offer: any) => ({
        _id: String(offer?.lead_id?._id || offer?.leadId || offer?._id || ''),
        ...offer,
      }))
      .filter((item: any) => Boolean(item?._id));
    if (offersData?.meta) {
      currentPage = (offersData.meta as any).page || 1;
      currentLimit = (offersData.meta as any).limit || 50;
    } else if (apiUrlInfo?.type === 'offers' && apiUrlInfo.params) {
      currentPage = (apiUrlInfo.params as any).page || 1;
      currentLimit = (apiUrlInfo.params as any).limit || 50;
    }
  } else if (shouldFetchClosedLeads && closedLeadsData?.data) {
    currentData = mapClosedLeadsForNavigation(closedLeadsData.data as any[]) as {
      _id: string;
    }[];
    if (closedLeadsData?.meta) {
      currentPage = (closedLeadsData.meta as any).page || 1;
      currentLimit = (closedLeadsData.meta as any).limit || 50;
    } else if (apiUrlInfo?.type === 'closed-leads' && apiUrlInfo.params) {
      currentPage = (apiUrlInfo.params as any).page || 1;
      currentLimit = (apiUrlInfo.params as any).limit || 50;
    }
  } else if (shouldFetchLeads && leadsData?.data) {
    currentData = leadsData.data as { _id: string }[];
    if (leadsData?.meta) {
      currentPage = (leadsData.meta as any).page || 1;
      currentLimit = (leadsData.meta as any).limit || 50;
    } else if (apiUrlInfo?.type === 'regular' && apiUrlInfo.params) {
      currentPage = (apiUrlInfo.params as any).page || 1;
      currentLimit = (apiUrlInfo.params as any).limit || 50;
    }
  }

  return { data: currentData, page: currentPage, limit: currentLimit };
}

export default function useLeadDetailsIndexSync(params: IndexSyncParams) {
  const {
    lead,
    navigationItemsLength,
    shouldFetchLeads,
    shouldFetchClosedLeads,
    shouldFetchOffers,
    shouldFetchOffersProgress,
    leadsData,
    closedLeadsData,
    offersData,
    offersProgressData,
    apiUrlInfo,
  } = params;

  const setCurrentIndex = useLeadsNavigationStore((state: any) => state.setCurrentIndex);
  const findItemIndexById = useLeadsNavigationStore((state: any) => state.findIndexById);
  const currentPaginationMeta = useFilterAwareLeadsNavigationStore(
    (state) => state.paginationMeta
  );
  const currentFilterState = useFilterAwareLeadsNavigationStore(
    (state) => state.currentFilterState
  );
  const filteredItemsLength = useFilterAwareLeadsNavigationStore(
    (state) => state.filteredItems.length
  );

  // Effect 1: Set current index when lead and data are available
  useEffect(() => {
    const navStore = useFilterAwareLeadsNavigationStore.getState();
    const hasData =
      navigationItemsLength > 0 ||
      !!leadsData?.data ||
      !!closedLeadsData?.data ||
      !!offersData?.data ||
      !!offersProgressData?.data ||
      navStore.filteredItems.length > 0;

    if (!lead || !hasData) return;

    const index = findItemIndexById(lead._id);
    if (index !== -1) {
      setCurrentIndex(index);
    }

    if (!navStore.paginationMeta) {
      const meta = getPaginationMetaFromResponse(
        offersProgressData,
        offersData,
        leadsData,
        closedLeadsData
      );
      if (currentPaginationMeta) {
        navStore.setPaginationMeta(currentPaginationMeta);
      } else if (meta) {
        navStore.setPaginationMeta(meta);
      }
    }

    const leadIdString = String(lead._id);
    const currentIndex = navStore.currentFilteredIndex;
    const currentLeadAtIndex = navStore.filteredItems[currentIndex];
    const isCurrentIndexCorrect =
      currentLeadAtIndex && String(currentLeadAtIndex._id) === leadIdString;

    if (isCurrentIndexCorrect && currentIndex >= 0) return;

    const filteredIndex = navStore.findFilteredIndexById(leadIdString);

    if (filteredIndex >= 0) {
      navStore.setCurrentFilteredIndex(filteredIndex);
      return;
    }

    if (currentFilterState) {
      const { data, page, limit } = getCurrentPageData(params);
      const pageIndex = data.findIndex((item) => String(item._id) === leadIdString);

      if (pageIndex >= 0) {
        const globalIndex = (page - 1) * limit + pageIndex;
        navStore.setCurrentFilteredIndex(globalIndex);
        if (!navStore.paginationMeta && currentPaginationMeta) {
          navStore.setPaginationMeta(currentPaginationMeta);
        }
      }
    }
  }, [
    lead,
    navigationItemsLength,
    leadsData?.data,
    leadsData?.meta,
    closedLeadsData?.data,
    closedLeadsData?.meta,
    shouldFetchOffers,
    shouldFetchLeads,
    shouldFetchClosedLeads,
    offersData?.data,
    offersData?.meta,
    shouldFetchOffersProgress,
    offersProgressData?.data,
    offersProgressData?.meta,
    apiUrlInfo,
    findItemIndexById,
    setCurrentIndex,
    currentFilterState,
    currentPaginationMeta,
  ]);

  // Effect 2: Find and set index AFTER data is stored (triggered by filteredItemsLength)
  useEffect(() => {
    if (!lead) return;

    const navStore = useFilterAwareLeadsNavigationStore.getState();
    if (navStore.filteredItems.length === 0) return;

    const leadIdStr = String(lead._id);
    const currentIndex = navStore.currentFilteredIndex;
    const currentLeadAtIndex = navStore.filteredItems[currentIndex];
    const isCurrentIndexCorrect =
      currentLeadAtIndex && String(currentLeadAtIndex._id) === leadIdStr;

    if (isCurrentIndexCorrect && currentIndex >= 0) return;

    const filteredIndex = navStore.findFilteredIndexById(leadIdStr);
    if (filteredIndex >= 0) {
      navStore.setCurrentFilteredIndex(filteredIndex);
      return;
    }

    const { data, page, limit } = getCurrentPageData(params);
    const pageIndex = data.findIndex((item) => String(item._id) === leadIdStr);

    if (pageIndex >= 0) {
      const globalIndex = (page - 1) * limit + pageIndex;
      navStore.setCurrentFilteredIndex(globalIndex);

      if (!navStore.paginationMeta) {
        const meta =
          getPaginationMetaFromResponse(
            offersProgressData,
            offersData,
            leadsData,
            closedLeadsData
          ) || currentPaginationMeta;
        if (meta) {
          navStore.setPaginationMeta(meta);
        } else if (
          offersProgressData?.meta ||
          offersData?.meta ||
          leadsData?.meta ||
          closedLeadsData?.meta
        ) {
          const respMeta =
            offersProgressData?.meta ||
            offersData?.meta ||
            leadsData?.meta ||
            closedLeadsData?.meta;
          const m = respMeta as any;
          navStore.setPaginationMeta({
            page: m?.page || page,
            limit: m?.limit || limit,
            total: m?.total || 0,
            pages: m?.pages || Math.ceil((m?.total || 0) / (m?.limit || limit)),
          });
        }
      }
    }
  }, [
    lead,
    shouldFetchOffersProgress,
    offersProgressData?.data,
    offersProgressData?.meta,
    shouldFetchOffers,
    offersData?.data,
    offersData?.meta,
    shouldFetchLeads,
    shouldFetchClosedLeads,
    leadsData?.data,
    leadsData?.meta,
    closedLeadsData?.data,
    closedLeadsData?.meta,
    apiUrlInfo,
    filteredItemsLength,
    currentPaginationMeta,
  ]);
}
