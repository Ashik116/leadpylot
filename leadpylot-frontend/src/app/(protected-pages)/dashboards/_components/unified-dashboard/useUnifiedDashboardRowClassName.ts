/**
 * Row className callback for UnifiedDashboard table rows.
 * Handles offer type colors (ETF, Festgeld, Tagesgeld), selection, and glowing highlight.
 */
import { useCallback } from 'react';
import { DashboardType } from '../dashboardTypes';

interface UseUnifiedDashboardRowClassNameParams {
  selectedRows: string[];
  dashboardType: string;
  enableRowClick?: boolean;
  glowingItemId?: string;
}

export function useUnifiedDashboardRowClassName({
  selectedRows,
  dashboardType,
  enableRowClick,
  glowingItemId,
}: UseUnifiedDashboardRowClassNameParams) {
  return useCallback(
    (row: any) => {
      const offerTypeValue =
        row?.original?.offerType ||
        row?.original?.offer_type ||
        row?.original?.offer_type_name ||
        '';
      const isOfferTypeColored =
        dashboardType === DashboardType.OFFER || dashboardType === DashboardType.OPENING;
      const id = String(
        row?.original?._id ?? row?.original?.id ?? row?.original?.offer_id?._id ?? ''
      );
      const isSelected = selectedRows.includes(id);
      const offerTypeClass =
        !isSelected && isOfferTypeColored
          ? offerTypeValue === 'ETF'
            ? 'bg-pink-50'
            : offerTypeValue === 'Festgeld'
              ? 'bg-blue-50'
              : offerTypeValue === 'Tagesgeld'
                ? 'bg-green-50'
                : ''
          : '';
      const isGlowing = glowingItemId && String(glowingItemId) === id;
      const base = enableRowClick
        ? offerTypeClass
          ? 'cursor-pointer hover:brightness-95'
          : 'cursor-pointer hover:bg-gray-50'
        : '';
      const glowClass = isGlowing
        ? 'animate-pulse ring-4 ring-green-400 ring-opacity-75 shadow-lg bg-green-50'
        : '';
      const selectedClass = isSelected ? 'bg-gray-300' : '';
      return `${offerTypeClass} ${base} ${glowClass} ${selectedClass}`.trim();
    },
    [selectedRows, enableRowClick, glowingItemId, dashboardType]
  );
}
