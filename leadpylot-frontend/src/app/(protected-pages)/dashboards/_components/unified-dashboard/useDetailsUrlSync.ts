'use client';

import React, { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBackNavigationStore } from '@/stores/backNavigationStore';
import { DashboardType, TDashboardType } from '../dashboardTypes';

type UseDetailsUrlSyncArgs = {
  pathname: string;
  searchParamsKey: string;
  dashboardType: TDashboardType;
  transformedData: any[];
  isOfferDetailsOpen: boolean;
  isOpeningDetailsOpen: boolean;
  selectedOfferForDetails: any;
  selectedOpeningForDetails: any;
  setIsOfferDetailsOpen: (value: boolean) => void;
  setIsOpeningDetailsOpen: (value: boolean) => void;
  setSelectedOfferForDetails: (value: any) => void;
  setSelectedOpeningForDetails: (value: any) => void;
};

/**
 * Resolves the ID from row data (handles _id, originalData._id, offer_id._id).
 */
function resolveDetailsId(rowData: any): string {
  const directId = rowData?._id;
  const originalId = rowData?.originalData?._id;
  const offerId = rowData?.offer_id?._id ?? rowData?.originalData?.offer_id?._id;
  const resolved = originalId || directId || offerId;
  return resolved ? String(resolved) : '';
}

/**
 * Syncs Offer/Opening details URL params (detailsType, detailsId) with dialog state.
 * Handles: URL → state (on load/navigation), state → URL (on row click).
 */
export function useDetailsUrlSync({
  pathname,
  searchParamsKey,
  dashboardType,
  transformedData,
  isOfferDetailsOpen,
  isOpeningDetailsOpen,
  selectedOfferForDetails,
  selectedOpeningForDetails,
  setIsOfferDetailsOpen,
  setIsOpeningDetailsOpen,
  setSelectedOfferForDetails,
  setSelectedOpeningForDetails,
}: UseDetailsUrlSyncArgs) {
  const router = useRouter();
  const { setBackUrl } = useBackNavigationStore();

  const getUrlSearchParams = useCallback(() => {
    if (typeof window === 'undefined') {
      return new URLSearchParams(searchParamsKey);
    }
    return new URLSearchParams(window.location.search);
  }, [searchParamsKey]);

  const setDetailsParams = useCallback(
    (type: 'offer' | 'opening', id: string) => {
      if (!pathname || !id) return;
      const params = getUrlSearchParams();
      params.set('detailsType', type);
      params.set('detailsId', id);
      const queryString = params.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', nextUrl);
      } else {
        router.replace(nextUrl, { scroll: false });
      }
      setBackUrl(nextUrl);
    },
    [pathname, getUrlSearchParams, router, setBackUrl]
  );

  const clearDetailsParams = useCallback(() => {
    if (!pathname) return;
    const params = getUrlSearchParams();
    params.delete('detailsType');
    params.delete('detailsId');
    const queryString = params.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', nextUrl);
    } else {
      router.replace(nextUrl, { scroll: false });
    }
  }, [pathname, getUrlSearchParams, router]);

  const applyDetailsState = useCallback(
    (type: 'offer' | 'opening', rowData: any, detailsId: string) => {
      if (type === 'offer') {
        if (!isOfferDetailsOpen || resolveDetailsId(selectedOfferForDetails) !== detailsId) {
          setSelectedOfferForDetails(rowData);
        }
        if (!isOfferDetailsOpen) {
          setIsOfferDetailsOpen(true);
        }
        if (isOpeningDetailsOpen) {
          setIsOpeningDetailsOpen(false);
          setSelectedOpeningForDetails(null);
        }
        return;
      }

      if (!isOpeningDetailsOpen || resolveDetailsId(selectedOpeningForDetails) !== detailsId) {
        setSelectedOpeningForDetails(rowData);
      }
      if (!isOpeningDetailsOpen) {
        setIsOpeningDetailsOpen(true);
      }
      if (isOfferDetailsOpen) {
        setIsOfferDetailsOpen(false);
        setSelectedOfferForDetails(null);
      }
    },
    [
      isOfferDetailsOpen,
      isOpeningDetailsOpen,
      selectedOfferForDetails,
      selectedOpeningForDetails,
      setIsOfferDetailsOpen,
      setIsOpeningDetailsOpen,
      setSelectedOfferForDetails,
      setSelectedOpeningForDetails,
    ]
  );

  const handleOpenOpeningDetailsWithUrl = useCallback(
    (rowData: any) => {
      const rowId = resolveDetailsId(rowData);
      if (!rowId) return;
      applyDetailsState('opening', rowData, rowId);
      setDetailsParams('opening', rowId);
    },
    [applyDetailsState, setDetailsParams]
  );

  const handleOpenOfferDetailsWithUrl = useCallback(
    (rowData: any) => {
      const rowId = resolveDetailsId(rowData);
      if (!rowId) return;
      applyDetailsState('offer', rowData, rowId);
      setDetailsParams('offer', rowId);
    },
    [applyDetailsState, setDetailsParams]
  );

  // Sync URL params → dialog state (on load, back/forward, external URL change)
  useEffect(() => {
    const params = getUrlSearchParams();
    const detailsId = params.get('detailsId');
    const detailsType = (params.get('detailsType') || '').toLowerCase();
    const effectiveType =
      detailsType === 'offer' || detailsType === 'opening'
        ? detailsType
        : dashboardType === DashboardType.OFFER
          ? 'offer'
          : 'opening';

    if (!detailsId) {
      if (isOfferDetailsOpen) {
        setIsOfferDetailsOpen(false);
        setSelectedOfferForDetails(null);
      }
      if (isOpeningDetailsOpen) {
        setIsOpeningDetailsOpen(false);
        setSelectedOpeningForDetails(null);
      }
      return;
    }

    if (effectiveType === 'offer' && dashboardType !== DashboardType.OFFER) return;
    if (effectiveType === 'opening' && dashboardType !== DashboardType.OPENING) return;

    const currentDetailsId =
      effectiveType === 'offer'
        ? resolveDetailsId(selectedOfferForDetails)
        : resolveDetailsId(selectedOpeningForDetails);
    const isCurrentOpen = effectiveType === 'offer' ? isOfferDetailsOpen : isOpeningDetailsOpen;

    if (isCurrentOpen && currentDetailsId === detailsId) {
      return;
    }

    const matchedRow = transformedData.find((item: any) => {
      const itemId = String(item?._id || item?.originalData?._id || '');
      return itemId === detailsId;
    });
    const resolvedRow = matchedRow || { _id: detailsId };

    applyDetailsState(effectiveType, resolvedRow, detailsId);
  }, [
    applyDetailsState,
    dashboardType,
    getUrlSearchParams,
    isOfferDetailsOpen,
    isOpeningDetailsOpen,
    setIsOfferDetailsOpen,
    setIsOpeningDetailsOpen,
    setSelectedOfferForDetails,
    setSelectedOpeningForDetails,
    transformedData,
  ]);

  return {
    setDetailsParams,
    clearDetailsParams,
    handleOpenOpeningDetailsWithUrl,
    handleOpenOfferDetailsWithUrl,
    resolveDetailsId,
  };
}
