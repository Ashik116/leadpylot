'use client';

import React, { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Tooltip from '@/components/ui/Tooltip';
import AgentFilterDropdown from '../AgentFilterDropdown';
import DateFilterDropdown from '../DateFilterDropdown';
import { ACTION_BAR_STAGE_GROUP_BY_TOOLTIP, TOOLTIP_POPOVER_CLASS } from '@/utils/toltip.constants';
import RoleGuard from '@/components/shared/RoleGuard';
import { Role } from '@/configs/navigation.config/auth.route.config';
import type { ActionBarEntityType } from './types';

export interface FilterSectionProps {
  entityType?: ActionBarEntityType;
  tableId?: string;
  showStageGroupByButton?: boolean;
  selectedGroupByArray?: string[];
  onGroupByArrayChange?: (groupBy: string[]) => void;
}

export function FilterSection({
  entityType,
  tableId,
  showStageGroupByButton = false,
  selectedGroupByArray,
  onGroupByArrayChange,
}: FilterSectionProps) {
  const pathname = usePathname();
  const isCashflowPage = pathname?.includes('/dashboards/cashflow');

  const getDateFieldNameForPage = useCallback(() => {
    if (pathname?.includes('/dashboards/leads')) return 'assigned_date';
    if (
      pathname?.includes('/dashboards/offers') ||
      pathname?.includes('/dashboards/openings') ||
      pathname?.includes('/dashboards/confirmations') ||
      pathname?.includes('/dashboards/payments')
    ) {
      return 'createdAt';
    }
    return undefined;
  }, [pathname]);

  const shouldShowStageGroupBy = showStageGroupByButton;
  const canUseStageGroupBy =
    shouldShowStageGroupBy && Array.isArray(selectedGroupByArray) && !!onGroupByArrayChange;
  const isStageGroupByActive =
    Array.isArray(selectedGroupByArray) && selectedGroupByArray.includes('current_stage');

  const handleStageGroupByToggle = useCallback(() => {
    if (!onGroupByArrayChange) return;
    const current = Array.isArray(selectedGroupByArray) ? selectedGroupByArray : [];
    if (current.includes('current_stage')) {
      onGroupByArrayChange(current.filter((item) => item !== 'current_stage'));
    } else {
      onGroupByArrayChange([...current, 'current_stage']);
    }
  }, [onGroupByArrayChange, selectedGroupByArray]);

  const showAgentDateFilters =
    entityType &&
    !isCashflowPage &&
    (entityType === 'Lead' || entityType === 'Offer' || entityType === 'Opening');

  return (
    <>
      {shouldShowStageGroupBy && (
        <Tooltip
          title={ACTION_BAR_STAGE_GROUP_BY_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className={TOOLTIP_POPOVER_CLASS}
          disabled={!canUseStageGroupBy}
        >
          <button
            type="button"
            onClick={handleStageGroupByToggle}
            disabled={!canUseStageGroupBy}
            className={`flex h-6 items-center gap-0.5 rounded border border-gray-200 bg-white px-1.5 py-0 text-xs transition-colors xl:px-2 ${
              isStageGroupByActive
                ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            } ${!canUseStageGroupBy ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <ApolloIcon name="layer-group" className="text-xs" />
            <span className="whitespace-nowrap">Stage</span>
          </button>
        </Tooltip>
      )}
      <RoleGuard role={Role.ADMIN}>
        {showAgentDateFilters && (
          <AgentFilterDropdown
            entityType={entityType as 'Lead' | 'Offer' | 'Opening'}
            tableId={tableId}
          />
        )}
      </RoleGuard>
      {showAgentDateFilters && (
        <DateFilterDropdown
          entityType={entityType as 'Lead' | 'Offer' | 'Opening'}
          tableId={tableId}
          dateFieldName={getDateFieldNameForPage()}
        />
      )}
    </>
  );
}
