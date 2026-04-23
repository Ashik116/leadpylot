import { Lead } from '@/app/(protected-pages)/dashboards/leads/projects/Type.Lead.project';
import useSingleAndDoubleClick from '@/hooks/useSingleAndDoubleClick';
import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';
import InlineEditField from './InlineEditField';
import CopyButton from './CopyButton';
import { useQueryClient } from '@tanstack/react-query';
import { useAssignLeadsTransform, useUpdateLeadStatus } from '@/services/hooks/useLeads';
import AgentBatch from '@/app/(protected-pages)/dashboards/leads/_components/AgentBatch';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';
import StatusBadge from './StatusBadge';
import useNotification from '@/utils/hooks/useNotification';
import { useApiUrlStore } from '@/stores/apiUrlStore';
import { useGroupContextStore } from '@/stores/groupContextStore';
import CustomSelect from './CustomSelect';
import classNames from '@/utils/classNames';
import { useLeadNavigation } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadDetails/hooks/useLeadNavigation';
import ApiService from '@/services/ApiService';
import {  formatAmountK, } from '@/utils/utils';
import { getLeadDetailRouteId } from '@/utils/closedLeadNavigation';
import RoleGuard from './RoleGuard';
import ApolloIcon from '../ui/ApolloIcon';

type TCellInlineEditProps = {
  props: any;
  type: string;
  refetch?: () => void;
  isCopyable?: boolean;
  externalLeadId?: string;
  apiUpdateField?: string;
  enableTodo?: boolean;
  dropdown?: boolean;
  options?: any;
  initialValue?: string;
  leadId?: string;
  selectOptionClassName?: string;
  apiType?: string;
  offerId?: string;
  selectClassName?: string;
  invalidateQueries?: string[] | string;
  onRowClick?: (lead: any) => void; // Add onRowClick prop
  apiUrl?: string; // Add apiUrl prop
  cellInlineEditClassName?: string;
  agentColor?: string;
  updateApiUrl?: string;
  updateApiMethod?: string;
  sourceColor?: string;
};

const CellInlineEdit = ({
  props,
  type = 'contact_name',
  refetch,
  isCopyable = false,
  externalLeadId,
  apiUpdateField,
  enableTodo = false,
  dropdown = false,
  options,
  initialValue,
  leadId,
  selectOptionClassName,
  apiType,
  offerId,
  selectClassName = '',
  invalidateQueries,
  onRowClick, // Add onRowClick parameter
  apiUrl, // Add apiUrl parameter
  agentColor = '',
  sourceColor = '',
  cellInlineEditClassName = '',
  updateApiUrl,
  updateApiMethod = 'PUT',
}: TCellInlineEditProps) => {
  const { openNotification } = useNotification();
  const currentPath = usePathname();
  const isOffersPath = currentPath?.includes('offers');
  const isOpeningPath = currentPath?.includes('opening');
  const isConfirmationPath = currentPath?.includes('confirmation');
  const isPaymentPath = currentPath?.includes('payment');
  const isNettoPath = currentPath?.includes('netto');
  const isLeadsPath = currentPath?.includes('leads');
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role?.ADMIN;
  const { groupFilterState } = useGroupContextStore();
  const { navigateToLeadFromRowClick } = useLeadNavigation();
  const handleInlineEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const assignLeadsMutationTransform = useAssignLeadsTransform({ queryKey: ['leads'] });

  const handleInvalidateQueries = useCallback(async () => {
    isOffersPath && queryClient.invalidateQueries({ queryKey: ['offers'] });
    if (isLeadsPath) {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      // Also invalidate grouped-summary queries when inline editing leads
      const { invalidateGroupedLeadQueries } = await import('@/utils/queryInvalidation');
      invalidateGroupedLeadQueries(queryClient);
    }

    isOpeningPath && queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
    isConfirmationPath &&
      queryClient.invalidateQueries({
        queryKey: ['offers-progress', { has_progress: 'confirmation' }],
      });
    isPaymentPath &&
      queryClient.invalidateQueries({
        queryKey: ['offers-progress', { has_progress: 'payment' }],
      });
    isNettoPath &&
      queryClient.invalidateQueries({
        queryKey: ['offers-progress', { has_progress: 'netto' }],
      });

    // Invalidate multi-table query if on openings page (multi-table view)
    if (isOpeningPath || isConfirmationPath || isPaymentPath || isNettoPath) {
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
    }

    // Invalidate leads queries with filter params (grouped-summary is already handled by invalidateGroupedLeadQueries above)
    // Only invalidate, don't force refetch - React Query will refetch when components need it
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key0 = query?.queryKey?.[0] as unknown as string;
        if (key0 === 'leads') {
          const key1 = query?.queryKey?.[1] as unknown;
          // Invalidate filtered leads queries (with params)
          return typeof key1 === 'object' && key1 !== null;
        }
        return false;
      },
    });
    if (invalidateQueries) {
      if (Array?.isArray(invalidateQueries)) {
        invalidateQueries?.forEach((query) => {
          queryClient.invalidateQueries({ queryKey: [query] });
        });
      } else {
        queryClient.invalidateQueries({ queryKey: [invalidateQueries] });
      }
    }
  }, [
    isOffersPath,
    isLeadsPath,
    isOpeningPath,
    isConfirmationPath,
    isPaymentPath,
    isNettoPath,
    queryClient,
    invalidateQueries,
  ]);
  const handleInlineEditUpdate = useCallback(
    async (leadId: string, newValue: string, type: string) => {
      try {
        // Use the API directly since we can't call hooks inside callbacks
        const { apiUpdateLead } = await import('@/services/LeadsService');
        const { apiUpdateOffer } = await import('@/services/LeadsService');

        // Handle different field types

        if (updateApiUrl) {
          await ApiService.fetchDataWithAxios({
            url: updateApiUrl,
            method: updateApiMethod,
            data: { [apiUpdateField || type]: newValue },
          });
        } else {
          if (apiType === 'offer' && offerId) {
            await apiUpdateOffer(offerId, { [apiUpdateField || type]: newValue });
          } else {
            await apiUpdateLead(externalLeadId || leadId, { [apiUpdateField || type]: newValue });
          }
        }
        await handleInvalidateQueries();
        // Use conditional refetch
        await refetch?.();

        // CRITICAL: Refetch dynamic filters POST request if active (same as delete does)
        // This ensures UI updates immediately when data comes from POST /dynamic-filters/apply
        const { useDynamicFiltersStore } = await import('@/stores/dynamicFiltersStore');
        const dynamicFiltersStore = useDynamicFiltersStore.getState();
        if (dynamicFiltersStore.isDynamicFilterMode && dynamicFiltersStore.refetchDynamicFilters) {
          await dynamicFiltersStore.refetchDynamicFilters(
            dynamicFiltersStore.page,
            dynamicFiltersStore.pageSize
          );
        }

        // Dynamic success message based on field type
        const fieldName =
          type === 'lead_source'
            ? 'source'
            : type === 'contact_name'
              ? 'contact name'
              : type === 'expected_revenue'
                ? 'expected revenue'
                : type === 'email_from'
                  ? 'email'
                  : type === 'lead_source_no'
                    ? 'partner ID'
                    : type.replace('_', ' ');

        openNotification({
          massage: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} updated successfully`,
          type: 'success',
        });
      } catch {
        const fieldName =
          type === 'lead_source'
            ? 'source'
            : type === 'contact_name'
              ? 'contact name'
              : type === 'expected_revenue'
                ? 'expected revenue'
                : type === 'email_from'
                  ? 'email'
                  : type === 'lead_source_no'
                    ? 'partner ID'
                    : type.replace('_', ' ');

        openNotification({
          massage: `Failed to update ${fieldName}. Please try again.`,
          type: 'danger',
        });
      }
    },
    [
      apiType,
      offerId,
      handleInvalidateQueries,
      refetch,
      openNotification,
      apiUpdateField,
      externalLeadId,
    ]
  );
  const updateLeadStatusMutation = useUpdateLeadStatus({
    id: leadId as string,
    invalidLeads: true,
    invalidActivities: true,
  });

  const handleAssignLeads = (leadId: string, newValue: string) => {
    const transformLeadsData = {
      leadIds: [leadId],
      toAgentUserId: type === 'agent' ? newValue : props.row.original?.project?.[0]?.agent?._id,
      toProjectId: type === 'project' ? newValue : props.row.original?.project?.[0]?._id,
    };

    assignLeadsMutationTransform.mutateAsync(transformLeadsData as any);
  };
  const handleStatusUpdate = async (stage_id: string, newValue: string) => {
    try {
      await updateLeadStatusMutation.mutateAsync({
        stage_id: stage_id,
        status_id: newValue,
      });
      handleInvalidateQueries();
    } catch {
      openNotification({
        massage: `Failed to update status. Please try again.`,
        type: 'danger',
      });
    }
  };

  const handleRowClick = (lead: Lead) => {
    const { setApiUrl, apiUrl: storedApiUrl } = useApiUrlStore.getState();

    // ✅ Priority order: lead._apiUrl (from item) > apiUrl prop > storedApiUrl
    // lead._apiUrl is attached by GroupSummary.tsx or LeadDataTables.tsx and contains the correct URL
    const itemApiUrl = (lead as any)._apiUrl;
    const sourceUrl = itemApiUrl || apiUrl || storedApiUrl;

    // CRITICAL FIX: For grouped mode, itemApiUrl already has the correct page for that specific group
    // Don't overwrite it with storedApiUrl's page (which might be from a different expanded group)
    // For non-grouped mode (especially archived page), always prefer storedApiUrl's page
    // because storedApiUrl is updated by ArchivedLeadsDashboard when pagination changes
    let apiUrlToUse = sourceUrl;

    // Check if itemApiUrl exists and has a page parameter
    let itemApiUrlHasPage = false;
    if (itemApiUrl) {
      try {
        const itemUrl = new URL(itemApiUrl, window.location.origin);
        itemApiUrlHasPage = itemUrl.searchParams.has('page');
      } catch {
        // If parsing fails, assume it doesn't have page
      }
    }

    // Extract page from storedApiUrl
    let storedPage: number | null = null;
    if (storedApiUrl) {
      try {
        const storedUrl = new URL(storedApiUrl, window.location.origin);
        storedPage = parseInt(storedUrl.searchParams.get('page') || '1', 10);
      } catch {
        // If extraction fails, continue without updating page
      }
    }

    // Determine which page to use:
    // - If both itemApiUrl and storedApiUrl have pages AND they're different: use itemApiUrl's page (grouped mode - each group has its own page)
    // - If storedApiUrl has a page: use it (non-grouped mode - single source of truth updated by ArchivedLeadsDashboard)
    // - Otherwise: use itemApiUrl's page if available
    let itemApiUrlPage: number | null = null;
    if (itemApiUrlHasPage && itemApiUrl) {
      try {
        const itemUrl = new URL(itemApiUrl, window.location.origin);
        itemApiUrlPage = parseInt(itemUrl.searchParams.get('page') || '1', 10);
      } catch {
        // If parsing fails, set to null
      }
    }

    // Check if URLs have different domain parameters (indicates grouped mode)
    // In grouped mode, itemApiUrl has group-specific domain filters that differ from storedApiUrl
    const isLikelyGroupedMode =
      itemApiUrl && storedApiUrl
        ? (() => {
            try {
              const itemUrl = new URL(itemApiUrl, window.location.origin);
              const storedUrl = new URL(storedApiUrl, window.location.origin);
              const itemDomain = itemUrl.searchParams.get('domain');
              const storedDomain = storedUrl.searchParams.get('domain');
              // If domains are different, it's likely grouped mode
              return itemDomain !== storedDomain && itemDomain !== null && storedDomain !== null;
            } catch {
              return false;
            }
          })()
        : false;

    const pageToUse =
      // If likely grouped mode and itemApiUrl has a page, use it (group-specific pagination)
      isLikelyGroupedMode && itemApiUrlPage !== null && itemApiUrlPage >= 1
        ? itemApiUrlPage
        : // Otherwise, prefer storedApiUrl's page (non-grouped mode or when itemApiUrl doesn't have page)
          storedPage !== null && storedPage >= 1
          ? storedPage
          : // Fallback to itemApiUrl's page
            itemApiUrlPage !== null && itemApiUrlPage >= 1
            ? itemApiUrlPage
            : null;

    // Update the source URL with correct page if we have a page to use
    if (pageToUse !== null && pageToUse >= 1 && sourceUrl) {
      try {
        const url = new URL(sourceUrl, window.location.origin);
        const searchParams = new URLSearchParams(url.search);
        // Update page to the correct page
        searchParams.set('page', pageToUse.toString());
        // Preserve limit if it exists, otherwise keep original
        if (!searchParams.has('limit') && storedApiUrl) {
          try {
            const storedUrl = new URL(storedApiUrl, window.location.origin);
            const storedLimit = storedUrl.searchParams.get('limit');
            if (storedLimit) {
              searchParams.set('limit', storedLimit);
            }
          } catch {
            // If limit extraction fails, continue without updating
          }
        }
        apiUrlToUse = `${url.pathname}?${searchParams.toString()}`;
      } catch {
        // If URL parsing fails, use sourceUrl as-is
        apiUrlToUse = sourceUrl;
      }
    }

    // ✅ Add includeAll=true when navigating from /dashboards/leads page (list page only, not detail page)
    const isLeadsListPage = currentPath === '/dashboards/leads';
    if (isLeadsListPage && apiUrlToUse) {
      try {
        const url = new URL(apiUrlToUse, window.location.origin);
        const searchParams = new URLSearchParams(url.search);
        // Only add if not already present
        if (!searchParams.has('includeAll')) {
          searchParams.set('includeAll', 'true');
          apiUrlToUse = `${url.pathname}?${searchParams.toString()}`;
        }
      } catch {
        // If URL parsing fails, use original URL
      }
    }

    // ✅ Update api-url-storage with the correct URL (with correct page number)
    if (apiUrlToUse && apiUrlToUse !== storedApiUrl) {
      setApiUrl(apiUrlToUse);
    }

    if (onRowClick) {
      onRowClick(lead);
    } else {
      const navigationLeadId = getLeadDetailRouteId(lead);
      if (!navigationLeadId) return;

      // Determine entity type based on current path
      const effectiveEntityTypeLower = isOffersPath
        ? 'offer'
        : isLeadsPath
          ? 'lead'
          : isOpeningPath
            ? 'opening'
            : isConfirmationPath
              ? 'confirmation'
              : isPaymentPath
                ? 'payment'
                : isNettoPath
                  ? 'netto'
                  : 'unknown';

      // Closed-lead rows: URL and store index use original_lead_id; otherwise keep prior behavior.
      const routeId =
        (lead as any).original_lead_id != null && String((lead as any).original_lead_id).trim() !== ''
          ? navigationLeadId
          : externalLeadId || navigationLeadId;

      navigateToLeadFromRowClick(
        navigationLeadId,
        apiUrlToUse || '',
        effectiveEntityTypeLower,
        groupFilterState,
        routeId
      );
    }
  };
  // Use the hook at the component level
  const clickHandlers = useSingleAndDoubleClick(
    () => handleRowClick(props.row.original),
    handleInlineEditClick,
    300
  );

  // Helper function to get the value based on type
  const getValue = () => {
    switch (type) {
      case 'lead_source':
        return props.row.original?.source_id?.name || '';
      default:
        return props.row.original?.[type] || '';
    }
  };

  const formatCompactAmount = (value: string | number) => {
    return formatAmountK(value);
  };

  // Helper function to get the placeholder text
  const getPlaceholder = () => {
    switch (type) {
      case 'contact_name':
        return 'contact name';
      case 'phone':
        return 'phone number';
      case 'email_from':
        return 'email';
      case 'expected_revenue':
        return 'revenue';
      case 'lead_source':
        return 'source';
      case 'lead_source_no':
        return 'partner ID';
      default:
        return `${type.replace('_', ' ')}`;
    }
  };

  const currentValue = getValue();
  const shouldFormatAmount = type === 'investmentVolume' && isOpeningPath;
  const formattedAmount = shouldFormatAmount ? formatCompactAmount(currentValue) : '';

  // Transform sources data for the dropdown

  const Dropdown = () => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [selectedSource, setSelectedSource] = useState<{
      value: string;
      label: string;
    } | null>({
      value: initialValue || currentValue,
      label: initialValue || currentValue,
    });

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onBlur={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setDropdownOpen(false);
        }}
        className={`${selectClassName} cursor-pointer truncate`}
        onDoubleClick={(e) => {
          if (!isAdmin) return;
          e.stopPropagation();
          setDropdownOpen(true);
        }}
      >
        {!dropdownOpen ? (
          type === 'agent' ? (
            <AgentBatch
              agentName={initialValue || currentValue}
              agentColor={agentColor}
              icon={true}
            />
          ) : type === 'status' ? (
            <StatusBadge status={initialValue || currentValue} icon={true} />
          ) : type === 'use_status' ? (
            <StatusBadge status={initialValue || currentValue} icon={true} />
          ) : type === 'project' ? (
            <div className="flex items-center gap-0.5">
              <span
                style={{ color: agentColor }}
                className="truncate text-sm font-medium"
                title={initialValue || currentValue}
              >
                {initialValue || currentValue}
              </span>
              <RoleGuard>
                <ApolloIcon name="chevron-arrow-down" className="h-3 w-3" />
              </RoleGuard>
            </div>
          ) : type === 'source_project' ? (
            <span
              style={{ color: agentColor }}
              className="truncate text-sm font-medium"
              title={initialValue || currentValue}
            >
              {initialValue || currentValue}
            </span>
          ) : type === 'lead_source' ? (
            <span
            style={{ color: sourceColor }}
            className="truncate text-sm font-medium"
            title={initialValue || currentValue}
          >
            {initialValue || currentValue}
          </span>
          ) : (
            <span className="truncate text-sm font-medium" title={initialValue || currentValue}>
              {/* {getShortWord(initialValue || currentValue)} */}
              {initialValue || currentValue}
            </span>
          )
        ) : null}
        {dropdownOpen && (
          <>
            <CustomSelect
              options={options ? options : []}
              onChange={(value: any) => {
                setSelectedSource(value);
                setDropdownOpen(false);
                if (type === 'agent' || type === 'project') {
                  handleAssignLeads(leadId as string, value?.value as any);
                } else if (type === 'status') {
                  handleStatusUpdate(value?.stage_id as string, value?.value as any);
                } else {
                  handleInlineEditUpdate(
                    props.row.original?._id?.toString(),
                    value?.value as any,
                    type
                  );
                }
              }}
              menuIsOpen={dropdownOpen}
              onBlur={() => setDropdownOpen(false)}
              className={`${selectClassName} text-sm`}
              value={selectedSource}
              classNameOptions={selectOptionClassName}
              menuPosition="auto"
            />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center" onClick={clickHandlers}>
      {dropdown ? (
        <Dropdown />
      ) : (
        <div onClick={clickHandlers} className="min-w-0">
          <InlineEditField
            value={currentValue?.toString() || ''}
            onSave={(newValue) =>
              handleInlineEditUpdate(props.row.original?._id?.toString(), newValue, type)
            }
            type="text"
            placeholder={getPlaceholder()}
            enableInlineEditing={true}
            className={classNames('truncate', cellInlineEditClassName)}
          >
            {shouldFormatAmount ? formattedAmount : undefined}
          </InlineEditField>
        </div>
      )}

      <div className="flex items-center gap-1">
        {isCopyable && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white dark:bg-[var(--dm-bg-elevated)]"
          >
            <CopyButton value={currentValue} />
          </div>
        )}
        {enableTodo && (props.row.original?.todoCount as number) > 0 && (
          <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs leading-none text-white">
            {props.row.original?.todoCount}
          </div>
        )}
      </div>
    </div>
  );
};
export default CellInlineEdit;
