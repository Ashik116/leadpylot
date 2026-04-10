'use client';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/ui/DatePicker';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Tooltip from '@/components/ui/Tooltip';
import CreatableSelect from 'react-select/creatable';
import { useMetadataOptions } from '@/services/hooks/useLeads';
import { FilterRule } from '@/stores/filterChainStore';
import {
  useUniversalGroupingFilterStore,
  DomainFilter,
  MetadataFilterOption,
  MetadataValueOption,
} from '@/stores/universalGroupingFilterStore';
import { useTableScopedFilters } from '@/stores/multiTableFilterStore';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Skeleton from '@/components/ui/Skeleton/Skeleton';
import DynamicFiltersShimmer from '@/components/shared/loaders/DynamicFiltersShimmer';
import { usePathname } from 'next/navigation';
import { useFilterContext } from '@/contexts/FilterContext';
import { OPERATOR_LABELS } from '../shared/DataTable/components/ColumnHeaderFilter';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import {
  appendSavedCustomFilter,
  entityTypeToFilterPage,
  getSavedCustomFiltersStorageKey,
  type SavedCustomFilterRecord,
  type SavedFilterApiPayload,
} from '@/utils/savedCustomFiltersStorage';
import {
  type Domain,
  type SavedFilter,
  type UpdateSavedFilterInput,
  isSavedFilterTypeFilter,
} from '@/types/savedFilter.types';
import {
  apiCreateSavedFilter,
  apiDeleteSavedFilter,
  apiListSavedFiltersByPage,
  apiUpdateSavedFilter,
} from '@/services/SavedFiltersService';
import {
  areSavedDomainsEquivalent,
  flattenDomainLeafFilters,
} from '@/utils/savedFilterDomainCompare';
import {
  CUSTOM_FILTER_ADD_RULE_TOOLTIP,
  CUSTOM_FILTER_APPLY_BUTTON_TOOLTIP,
  CUSTOM_FILTER_CLEAR_RULES_TOOLTIP,
  CUSTOM_FILTER_REMOVE_RULE_TOOLTIP,
  CUSTOM_FILTER_SAVE_BUTTON_TOOLTIP,
  CUSTOM_FILTER_SAVED_VIEWS_TOOLTIP,
  TOOLTIP_POPOVER_CLASS,
} from '@/utils/toltip.constants';
import {
  isCloseProjectsLeadsBankPath,
  METADATA_OPTIONS_ENTITY_CLOSED_LEADS,
} from '@/utils/closeProjectUtils';

const emptyRule = { field: '', operator: '', value: '' as any };
const BUTTON_REMOVE = 'plain';
const BUTTON_APPLY = 'solid';

const MAX_VISIBLE_VALUE_CHIPS = 2;

/** Popover trigger for "+N more" – shows overflow values on hover, each with remove. Renders popover in portal so it is not clipped by select's overflow-hidden. */
function MorePopoverTrigger({
  overflow,
  onRemove,
}: {
  overflow: Array<{ value: any; label: string }>;
  onRemove: (val: any) => void;
}) {
  const [hover, setHover] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** After removing an item the list shrinks and mouse can briefly be "outside", so ignore leave for a short period */
  const ignoreLeaveRef = useRef(false);

  const openPopover = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    ignoreLeaveRef.current = false;
    const el = triggerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    }
    setHover(true);
  };

  const scheduleClose = () => {
    if (ignoreLeaveRef.current) return;
    leaveTimeoutRef.current = setTimeout(() => setHover(false), 150);
  };

  const handleRemove = (val: any) => {
    onRemove(val);
    ignoreLeaveRef.current = true;
    // Keep focus on popover so the Select's input doesn't receive focus and open the full agent list
    requestAnimationFrame(() => {
      popoverRef.current?.focus({ preventScroll: true });
    });
    setTimeout(() => {
      ignoreLeaveRef.current = false;
    }, 350);
  };

  useEffect(
    () => () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    },
    []
  );

  const popoverContent = position && (
    <div
      ref={popoverRef}
      tabIndex={-1}
      data-custom-filter-value-popover
      className="fixed z-[9999] max-h-48 min-w-[160px] overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg outline-none"
      style={{ top: position.top, left: position.left }}
      onMouseEnter={openPopover}
      onMouseLeave={scheduleClose}
    >
      {overflow.map((opt) => (
        <div
          key={String(opt.value)}
          className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <span className="truncate">{opt.label}</span>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRemove(opt.value);
            }}
            className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            title="Remove"
          >
            <ApolloIcon name="cross" className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex shrink-0"
      onMouseEnter={openPopover}
      onMouseLeave={scheduleClose}
    >
      <span className="inline-flex cursor-default items-center rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-sm font-medium text-gray-700">
        +{overflow.length} more
      </span>
      {hover && typeof document !== 'undefined' && createPortal(popoverContent, document.body)}
    </div>
  );
}

/** MultiValueRemove: removes only the clicked chip and stops propagation so the big "clear all" X is never triggered (e.g. on quick clicks) */
function CustomFilterMultiValueRemove(props: any) {
  const { data, selectProps, innerProps } = props;
  const onRemove = selectProps.customFilterOnRemoveValue;
  const { onClick: _clearClick, ...restInnerProps } = innerProps || {};
  void _clearClick; // ignore default clear (we remove one value only)
  if (!onRemove) return null;
  return (
    <div
      {...restInnerProps}
      role="button"
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onRemove(data.value);
      }}
      onMouseDown={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="flex shrink-0 cursor-pointer items-center justify-center self-center rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
      title="Remove"
    >
      <ApolloIcon name="cross" className="h-3 w-3" />
    </div>
  );
}

/** ClearIndicator: clear all selected values in this field only; stop propagation so the main filter popover does not close */
function CustomFilterClearIndicator(props: any) {
  const { innerProps } = props;
  const { onMouseDown, onTouchEnd, ...restInnerProps } = innerProps || {};
  return (
    <div
      {...restInnerProps}
      data-custom-filter-clear-indicator
      className="flex items-center justify-center self-stretch"
      onMouseDown={(e: React.MouseEvent) => {
        e.stopPropagation();
        onMouseDown?.(e);
      }}
      onTouchEnd={(e: React.TouchEvent) => {
        e.stopPropagation();
        onTouchEnd?.(e);
      }}
    >
      <div className="select-clear-indicator flex items-center justify-center">
        <ApolloIcon name="cross" />
      </div>
    </div>
  );
}

/** ValueContainer for multi-select: show only first 2 chips, rest in "+N more" hover popover */
function CustomFilterValueContainer(props: any) {
  const { children, selectProps } = props;
  const value = selectProps.value || [];
  const childArray = React.Children.toArray(children);

  if (value.length <= MAX_VISIBLE_VALUE_CHIPS) {
    return (
      <div
        className="select-value-container scrollbar-none flex flex-nowrap items-center gap-0.5 overflow-x-auto"
        {...props}
      >
        {children}
      </div>
    );
  }

  const firstTwo = childArray.slice(0, MAX_VISIBLE_VALUE_CHIPS);
  const inputPart = childArray.slice(value.length);
  const overflow = value.slice(MAX_VISIBLE_VALUE_CHIPS);
  const onRemove = selectProps.customFilterOnRemoveValue;

  return (
    <div
      className="select-value-container scrollbar-none flex flex-nowrap items-center gap-0.5 overflow-x-auto"
      {...props}
    >
      {/* Keep first 2 chips and "+N more" on the same line */}
      <div className="flex shrink-0 flex-nowrap items-center gap-0.5">
        {firstTwo}
        {onRemove && <MorePopoverTrigger overflow={overflow} onRemove={onRemove} />}
      </div>
      {inputPart}
    </div>
  );
}

export const SPECIAL_FIELDS_NO_CHANGE = [
  'expected_revenue',
  'createdAt',
  'updatedAt',
  'assigned_date',
  'lead_date',
  'active',
  'checked',
  'user_id.active',
  'team_id.active',
];
export const FILTER_OPTIONS = ['=', '!=', 'like', 'is_not_empty'];

interface CustomFilterOptionProps {
  entityType?:
    | 'Lead'
    | 'Offer'
    | 'User'
    | 'Team'
    | 'Opening'
    | 'Bank'
    | 'CashflowEntry'
    | 'CashflowTransaction'
    | 'Reclamation';
  /** @deprecated Use useFilterContext() instead */
  buildApiFilters?: () => FilterRule[];
  onApply?: (domainFilters: DomainFilter[]) => void;
  selectedGroupByArray?: string[];
  tableId?: string; // Optional: for multi-table pages, use multi-table store instead of global store
}

const CustomFilterOption: React.FC<CustomFilterOptionProps> = ({
  entityType = 'Lead',
  buildApiFilters: buildApiFiltersProp,
  onApply,
  selectedGroupByArray,
  tableId,
}) => {
  const { buildApiFilters: buildApiFiltersFromContext } = useFilterContext();
  const buildApiFilters = buildApiFiltersProp ?? buildApiFiltersFromContext;
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isAgent = userRole === Role.AGENT;

  // Determine effective entity type: check pathname first, then use prop
  // This ensures correct entity type for users page and projects page
  const effectiveEntityType = useMemo(() => {
    // Check pathname first to handle special pages correctly
    if (pathname?.includes('/admin/banks')) {
      return 'Bank';
    }
    if (pathname?.includes('/admin/users')) {
      return 'User';
    }
    if (isCloseProjectsLeadsBankPath(pathname)) {
      return 'Lead';
    }
    // For project pages, Team means "project"
    if (pathname?.includes('/dashboards/projects/')) {
      return 'Team';
    }
    // For cashflow pages, use specific entity types based on prop
    if (pathname?.includes('/dashboards/cashflow')) {
      // entityType prop should be set by the table component
      return entityType;
    }
    // Otherwise use the prop
    return entityType;
  }, [pathname, entityType]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('🔎 [CustomFilterOption] mount', {
      entityType,
      effectiveEntityType,
      selectedGroupByArray,
    });
  }, [entityType, effectiveEntityType, selectedGroupByArray]);

  // Get metadata options for the entity type
  // For UnifiedDashboard pages (Opening entity type), always use "Offer" for metadata options
  // This ensures all UnifiedDashboard pages (offers, openings, confirmations, payments) call /api/metadata/options/Offer
  const metadataEntityType = useMemo(() => {
    if (isCloseProjectsLeadsBankPath(pathname)) {
      return METADATA_OPTIONS_ENTITY_CLOSED_LEADS;
    }
    // If entityType is Opening (used for openings, confirmations, payments pages), use "Offer"
    if (effectiveEntityType === 'Opening') {
      return 'Offer';
    }
    // Otherwise use the effectiveEntityType
    return effectiveEntityType;
  }, [effectiveEntityType, pathname]);

  const {
    data: metadataOptions,
    isLoading: fieldsLoading,
    error: fieldsError,
  } = useMetadataOptions(metadataEntityType);

  // Store integration - use multi-table store if tableId is provided, otherwise use global store
  const globalStore = useUniversalGroupingFilterStore();
  // Always call the hook, but pass a dummy value if tableId is not provided
  const multiTableStoreRaw = useTableScopedFilters(tableId || 'dummy');
  const multiTableStore = tableId ? multiTableStoreRaw : null;

  // Set entity type in store
  useEffect(() => {
    if (effectiveEntityType) {
      if (multiTableStore) {
        multiTableStore.setEntityType(effectiveEntityType);
      } else {
        globalStore.setEntityType(effectiveEntityType);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveEntityType, tableId]); // Only depend on values, not store objects

  // Set build default filters function (only for global store)
  useEffect(() => {
    if (buildApiFilters && !tableId) {
      globalStore.setBuildDefaultFilters(buildApiFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildApiFilters, tableId]); // Only depend on values, not store objects

  const [rules, setRules] = useState<Array<{ field: string; operator: string; value: any }>>(() => {
    return [{ ...emptyRule }];
  });
  /** When `preset`, loaded rules are shown but store is unchanged until Apply — don't overwrite from store. */
  const [rulesSyncSource, setRulesSyncSource] = useState<'store' | 'preset'>('store');

  const [error, setError] = useState<string | null>(null);
  const [rangeErrors, setRangeErrors] = useState<Record<number, string>>({});
  const [saveFiltersPanelOpen, setSaveFiltersPanelOpen] = useState(false);
  const [saveFilterTitle, setSaveFilterTitle] = useState('');
  const [saveFilterTitleError, setSaveFilterTitleError] = useState<string | null>(null);
  const saveFiltersAnchorRef = useRef<HTMLDivElement>(null);
  const saveFiltersPanelRef = useRef<HTMLDivElement>(null);
  const [savePanelRect, setSavePanelRect] = useState<{
    top: number;
    left: number;
    width: number;
    transform?: string;
  } | null>(null);

  const [loadSavedFiltersOpen, setLoadSavedFiltersOpen] = useState(false);
  const loadSavedFiltersAnchorRef = useRef<HTMLDivElement>(null);
  const savedFiltersPickerRef = useRef<HTMLDivElement>(null);
  const [loadSavedFiltersRect, setLoadSavedFiltersRect] = useState<{
    top: number;
    left: number;
    width: number;
    transform?: string;
  } | null>(null);
  const [serverSavedFiltersList, setServerSavedFiltersList] = useState<SavedFilter[] | null>(null);
  const [loadSavedFiltersLoading, setLoadSavedFiltersLoading] = useState(false);
  const [loadSavedFiltersError, setLoadSavedFiltersError] = useState<string | null>(null);
  const [deletingSavedFilterId, setDeletingSavedFilterId] = useState<string | null>(null);
  const deleteSavedFilterInFlightRef = useRef(false);
  const [editingSavedFilterId, setEditingSavedFilterId] = useState<string | null>(null);
  const [editingSavedFilterTitle, setEditingSavedFilterTitle] = useState('');
  const [savingSavedFilterTitleId, setSavingSavedFilterTitleId] = useState<string | null>(null);
  const savedFilterRowClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingSavedFilterIdRef = useRef<string | null>(null);
  editingSavedFilterIdRef.current = editingSavedFilterId;
  /** PUT /saved-filters/:id — editing domain (and metadata for the request) in the rule builder */
  const [savedFilterPutTarget, setSavedFilterPutTarget] = useState<{
    _id: string;
    title: string;
    page: string;
    description?: string;
  } | null>(null);
  const [savedFilterPutSaving, setSavedFilterPutSaving] = useState(false);

  const updateSavePanelPosition = useCallback(() => {
    const el = saveFiltersAnchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(380, Math.max(280, window.innerWidth - 32));
    let left = r.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    const gap = 8;
    const estimatedHeight = 300;
    const spaceAbove = r.top;
    const spaceBelow = window.innerHeight - r.bottom;
    // Prefer above the Save Filters control so the panel sits on top of the custom filter chrome
    // (avoids overlap with the dropdown footer and z-stacking with the filters panel).
    const openAbove =
      spaceAbove >= estimatedHeight + gap ||
      (spaceBelow < estimatedHeight + gap && spaceAbove > spaceBelow);
    if (openAbove) {
      setSavePanelRect({
        top: r.top - gap,
        left,
        width,
        transform: 'translateY(-100%)',
      });
    } else {
      setSavePanelRect({ top: r.bottom + gap, left, width });
    }
  }, []);

  const updateLoadSavedFiltersPanelPosition = useCallback(() => {
    const el = loadSavedFiltersAnchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(400, Math.max(300, window.innerWidth - 32));
    let left = r.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    const gap = 8;
    const estimatedHeight = 280;
    const spaceAbove = r.top;
    const spaceBelow = window.innerHeight - r.bottom;
    const openAbove =
      spaceAbove >= estimatedHeight + gap ||
      (spaceBelow < estimatedHeight + gap && spaceAbove > spaceBelow);
    if (openAbove) {
      setLoadSavedFiltersRect({
        top: r.top - gap,
        left,
        width,
        transform: 'translateY(-100%)',
      });
    } else {
      setLoadSavedFiltersRect({ top: r.bottom + gap, left, width });
    }
  }, []);

  useLayoutEffect(() => {
    if (!saveFiltersPanelOpen) {
      setSavePanelRect(null);
      return;
    }
    updateSavePanelPosition();
    window.addEventListener('resize', updateSavePanelPosition);
    window.addEventListener('scroll', updateSavePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updateSavePanelPosition);
      window.removeEventListener('scroll', updateSavePanelPosition, true);
    };
  }, [saveFiltersPanelOpen, updateSavePanelPosition]);

  useLayoutEffect(() => {
    if (!loadSavedFiltersOpen) {
      setLoadSavedFiltersRect(null);
      return;
    }
    updateLoadSavedFiltersPanelPosition();
    window.addEventListener('resize', updateLoadSavedFiltersPanelPosition);
    window.addEventListener('scroll', updateLoadSavedFiltersPanelPosition, true);
    return () => {
      window.removeEventListener('resize', updateLoadSavedFiltersPanelPosition);
      window.removeEventListener('scroll', updateLoadSavedFiltersPanelPosition, true);
    };
  }, [loadSavedFiltersOpen, updateLoadSavedFiltersPanelPosition]);

  useEffect(() => {
    if (!loadSavedFiltersOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (loadSavedFiltersAnchorRef.current?.contains(t)) return;
      if (savedFiltersPickerRef.current?.contains(t)) return;
      setLoadSavedFiltersOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [loadSavedFiltersOpen]);

  useEffect(() => {
    if (!loadSavedFiltersOpen) {
      if (savedFilterRowClickTimerRef.current) {
        clearTimeout(savedFilterRowClickTimerRef.current);
        savedFilterRowClickTimerRef.current = null;
      }
      setEditingSavedFilterId(null);
      setEditingSavedFilterTitle('');
    }
  }, [loadSavedFiltersOpen]);

  useEffect(() => {
    return () => {
      if (savedFilterRowClickTimerRef.current) {
        clearTimeout(savedFilterRowClickTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!saveFiltersPanelOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (saveFiltersAnchorRef.current?.contains(t)) return;
      if (saveFiltersPanelRef.current?.contains(t)) return;
      setSaveFiltersPanelOpen(false);
      setSaveFilterTitle('');
      setSaveFilterTitleError(null);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [saveFiltersPanelOpen]);

  useEffect(() => {
    if (!loadSavedFiltersOpen) return;
    let cancelled = false;
    setLoadSavedFiltersLoading(true);
    setLoadSavedFiltersError(null);
    const page = entityTypeToFilterPage(effectiveEntityType);
    void (async () => {
      try {
        const { data } = await apiListSavedFiltersByPage(page, { limit: 100, type: 'filter' });
        if (!cancelled) {
          setServerSavedFiltersList(data);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadSavedFiltersError(e instanceof Error ? e.message : 'Could not load saved filters');
        }
      } finally {
        if (!cancelled) setLoadSavedFiltersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSavedFiltersOpen, effectiveEntityType]);

  // Prepare fields and operatorLabels from API response
  // Use ALL filterOptions from the API without any filtering
  // The API already determines which fields are filterable
  const fields = useMemo(() => {
    if (!metadataOptions?.filterOptions) return {};
    const fieldsMap: Record<
      string,
      {
        type: string;
        operators: string[];
        values?: MetadataValueOption[];
        label: string;
        field?: string;
      }
    > = {};
    // Use all filterOptions directly - no filtering based on ref or field type
    metadataOptions.filterOptions.forEach((option: MetadataFilterOption) => {
      fieldsMap[option.field] = {
        type: option.type,
        operators: option.operators,
        values: option.values,
        label: option.label,
        field: option?.field || undefined,
      };
    });
    return fieldsMap;
  }, [metadataOptions]);

  // Helper functions for field types and values
  const isDateField = (field: string) => {
    return fields[field]?.type === 'date' || field.includes('date') || field.includes('_at');
  };

  const isNumericField = (field: string) => {
    return fields[field]?.type === 'number' || fields[field]?.type === 'integer';
  };

  const isRangeOperator = (operator: string) => {
    return operator === 'between' || operator === 'not_between';
  };

  const isMultiSelectOperator = (operator: string) => {
    return operator === 'in' || operator === 'not in';
  };

  const formatDateForAPI = (date: Date | null) => {
    return date ? dayjs(date).format('YYYY-MM-DD') : null;
  };

  const formatValueForAPI = (field: string, operator: string, value: any) => {
    // Check for null, undefined, or empty string, but allow 0 as a valid value
    if (value === null || value === undefined || value === '') return '';

    if (isRangeOperator(operator)) {
      // For range operators, value should be an array
      if (Array.isArray(value) && value.length === 2) {
        if (isDateField(field)) {
          return [formatDateForAPI(value[0]), formatDateForAPI(value[1])];
        } else if (isNumericField(field)) {
          return [Number(value[0]) || 0, Number(value[1]) || 0];
        }
        return value;
      }
      return [];
    } else if (isMultiSelectOperator(operator)) {
      // For "in" and "not in" operators, value should be an array
      if (Array.isArray(value)) {
        const filtered = value.filter((v) => v !== null && v !== undefined && v !== '');
        if (isNumericField(field)) {
          return filtered.map((v: any) =>
            v !== '' && v !== null && v !== undefined ? Number(v) : v
          );
        }
        return filtered;
      }
      return [];
    } else {
      // For single operators
      if (isDateField(field)) {
        return formatDateForAPI(value);
      } else if (isNumericField(field)) {
        return Number(value) || 0;
      }
      return value;
    }
  };

  // Convert DomainFilter[] back to rules format (inverse of formatValueForAPI)
  const convertDomainFiltersToRules = useMemo(() => {
    return (domainFilters: DomainFilter[], fieldsMetadata: typeof fields) => {
      if (!domainFilters?.length) return [{ ...emptyRule }];

      const parseDate = (val: any) => (val && dayjs(val).isValid() ? dayjs(val).toDate() : null);
      const isDateFieldForMetadata = (field: string) =>
        fieldsMetadata[field]?.type === 'date' || field.includes('date') || field.includes('_at');
      const isNumericFieldForMetadata = (field: string) =>
        fieldsMetadata[field]?.type === 'number' || fieldsMetadata[field]?.type === 'integer';

      return domainFilters.map(([field, operator, value]) => {
        let convertedValue: any = value;

        if (isRangeOperator(operator)) {
          if (Array.isArray(value) && value.length === 2) {
            convertedValue = isDateFieldForMetadata(field)
              ? [parseDate(value[0]), parseDate(value[1])]
              : isNumericFieldForMetadata(field)
                ? [Number(value[0]) || 0, Number(value[1]) || 0]
                : value;
          } else {
            convertedValue = [null, null];
          }
        } else if (isMultiSelectOperator(operator)) {
          // For "in" and "not in" operators, value should be an array
          if (Array.isArray(value)) {
            convertedValue = value;
          } else {
            convertedValue = [];
          }
        } else {
          convertedValue = isDateFieldForMetadata(field)
            ? parseDate(value)
            : isNumericFieldForMetadata(field)
              ? value !== null && value !== undefined
                ? Number(value)
                : ''
              : value;
        }

        return { field, operator, value: convertedValue };
      });
    };
  }, []);

  const applyPresetToRules = useCallback(
    (preset: SavedFilter) => {
      setSavedFilterPutTarget(null);
      if (!isSavedFilterTypeFilter(preset)) {
        toast.push(
          <Notification type="warning" title="Not a filter preset">
            This preset is for grouping, not filter rules. Open Group By to use it.
          </Notification>
        );
        return;
      }
      if (!fields || !Object.keys(fields).length) {
        toast.push(
          <Notification type="warning" title="Not ready">
            Filter options are still loading. Try again in a moment.
          </Notification>
        );
        return;
      }
      const leaves = flattenDomainLeafFilters(preset.domain!);
      if (leaves.length === 0) {
        toast.push(
          <Notification type="warning" title="Empty preset">
            This saved filter has no rules to load.
          </Notification>
        );
        return;
      }
      const restored = convertDomainFiltersToRules(leaves, fields);
      setRules(restored.length ? restored : [{ ...emptyRule }]);
      setRulesSyncSource('preset');
      setError(null);
      setLoadSavedFiltersOpen(false);
      toast.push(
        <Notification type="success" title="Loaded">
          &quot;{preset.title}&quot; — review rules and click Apply when ready.
        </Notification>
      );
    },
    [convertDomainFiltersToRules, fields]
  );

  const beginEditSavedFilterDomain = useCallback(
    (e: React.MouseEvent, preset: SavedFilter) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isSavedFilterTypeFilter(preset)) {
        toast.push(
          <Notification type="warning" title="Not a filter preset">
            Only filter presets can be edited here.
          </Notification>
        );
        return;
      }
      if (
        deletingSavedFilterId !== null ||
        savingSavedFilterTitleId !== null ||
        savedFilterPutSaving
      )
        return;
      if (!fields || !Object.keys(fields).length) {
        toast.push(
          <Notification type="warning" title="Not ready">
            Filter options are still loading. Try again in a moment.
          </Notification>
        );
        return;
      }
      const leaves = flattenDomainLeafFilters(preset.domain!);
      if (leaves.length === 0) {
        toast.push(
          <Notification type="warning" title="Empty preset">
            This saved filter has no rules to edit.
          </Notification>
        );
        return;
      }
      const restored = convertDomainFiltersToRules(leaves, fields);
      setRules(restored.length ? restored : [{ ...emptyRule }]);
      setRulesSyncSource('preset');
      setError(null);
      setEditingSavedFilterId(null);
      setEditingSavedFilterTitle('');
      setSavedFilterPutTarget({
        _id: preset._id,
        title: preset.title,
        page: preset.page,
        ...(preset.description !== undefined && preset.description !== ''
          ? { description: preset.description }
          : {}),
      });
      setLoadSavedFiltersOpen(false);
      toast.push(
        <Notification type="success" title="Edit rules">
          Change rules below, then use &quot;Update saved&quot; to update this preset on the server.
        </Notification>
      );
    },
    [
      convertDomainFiltersToRules,
      deletingSavedFilterId,
      fields,
      savedFilterPutSaving,
      savingSavedFilterTitleId,
    ]
  );

  const handleCancelEditSavedFilterTitle = useCallback(() => {
    setEditingSavedFilterId(null);
    setEditingSavedFilterTitle('');
  }, []);

  const handleDeleteSavedFilter = useCallback(
    async (e: React.MouseEvent, preset: SavedFilter) => {
      e.preventDefault();
      e.stopPropagation();
      if (deleteSavedFilterInFlightRef.current) return;
      deleteSavedFilterInFlightRef.current = true;
      setDeletingSavedFilterId(preset._id);
      try {
        await apiDeleteSavedFilter(preset._id);
        if (editingSavedFilterIdRef.current === preset._id) {
          handleCancelEditSavedFilterTitle();
        }
        setServerSavedFiltersList((prev) =>
          prev ? prev.filter((p) => p._id !== preset._id) : prev
        );
        setSavedFilterPutTarget((t) => (t && t._id === preset._id ? null : t));
        toast.push(
          <Notification type="success" title="Deleted">
            &quot;{preset.title}&quot; was removed.
          </Notification>
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Delete failed';
        toast.push(
          <Notification type="danger" title="Delete failed">
            {message}
          </Notification>
        );
      } finally {
        deleteSavedFilterInFlightRef.current = false;
        setDeletingSavedFilterId(null);
      }
    },
    [handleCancelEditSavedFilterTitle]
  );

  const handleStartEditSavedFilterTitle = useCallback(
    (e: React.MouseEvent, preset: SavedFilter) => {
      e.preventDefault();
      e.stopPropagation();
      if (
        deletingSavedFilterId !== null ||
        savingSavedFilterTitleId !== null ||
        savedFilterPutSaving
      ) {
        return;
      }
      setEditingSavedFilterId(preset._id);
      setEditingSavedFilterTitle(preset.title);
    },
    [deletingSavedFilterId, savedFilterPutSaving, savingSavedFilterTitleId]
  );

  const handleCommitSavedFilterTitle = useCallback(
    async (preset: SavedFilter) => {
      const trimmed = editingSavedFilterTitle.trim();
      if (!trimmed) {
        toast.push(
          <Notification type="warning" title="Name required">
            Enter a title for this preset.
          </Notification>
        );
        return;
      }
      if (trimmed === preset.title) {
        handleCancelEditSavedFilterTitle();
        return;
      }
      setSavingSavedFilterTitleId(preset._id);
      try {
        const updated = await apiUpdateSavedFilter(preset._id, {
          title: trimmed,
          page: preset.page,
          type: preset.type ?? 'filter',
          ...(preset.description !== undefined && preset.description !== ''
            ? { description: preset.description }
            : {}),
        });
        setServerSavedFiltersList((prev) =>
          prev ? prev.map((p) => (p._id === preset._id ? updated : p)) : prev
        );
        setSavedFilterPutTarget((t) =>
          t && t._id === preset._id ? { ...t, title: updated.title } : t
        );
        handleCancelEditSavedFilterTitle();
        toast.push(
          <Notification type="success" title="Updated">
            Preset renamed to &quot;{updated.title}&quot;.
          </Notification>
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Update failed';
        toast.push(
          <Notification type="danger" title="Could not update">
            {message}
          </Notification>
        );
      } finally {
        setSavingSavedFilterTitleId(null);
      }
    },
    [editingSavedFilterTitle, handleCancelEditSavedFilterTitle]
  );

  // Restore filters from store when component mounts or when userDomainFilters changes
  // Note: This useEffect syncs external Zustand store state to local component state.
  // Using queueMicrotask to defer state updates and avoid synchronous setState within effect.
  useEffect(() => {
    if (rulesSyncSource === 'preset') return;
    if (!fields || !Object.keys(fields).length) return;

    // Get userDomainFilters from the appropriate store
    const userDomainFilters = multiTableStore
      ? multiTableStore.userDomainFilters
      : globalStore.userDomainFilters;

    const normalizeRule = (r: typeof emptyRule) => ({
      field: r.field,
      operator: r.operator,
      value: r.value instanceof Date ? r.value.toISOString() : r.value,
    });

    if (userDomainFilters?.length > 0) {
      const restoredRules = convertDomainFiltersToRules(userDomainFilters, fields);
      // Defer state update to avoid synchronous setState within effect
      queueMicrotask(() => {
        setRules((current) => {
          const currentStr = JSON.stringify(current.map(normalizeRule));
          const restoredStr = JSON.stringify(restoredRules.map(normalizeRule));
          return currentStr !== restoredStr ? restoredRules : current;
        });
      });
    } else if (userDomainFilters?.length === 0) {
      // Defer state update to avoid synchronous setState within effect
      queueMicrotask(() => {
        setRules((current) =>
          current.some((r) => r.field && r.operator && r.value !== undefined && r.value !== '')
            ? [{ ...emptyRule }]
            : current
        );
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Only depend on the actual filter data, not the store objects
    rulesSyncSource,
    multiTableStore?.userDomainFilters,
    globalStore.userDomainFilters,
    fields,
    tableId,
  ]);

  const handleFieldChange = (idx: number, field: string) => {
    const ops = fields[field]?.operators || [];
    setRules((rules) =>
      rules.map((r, i) =>
        i === idx
          ? {
              field,
              operator: ops[0] || '',
              value: '',
            }
          : r
      )
    );
  };

  const handleOperatorChange = (idx: number, operator: string) => {
    const rule = rules[idx];
    const wasRangeOperator = rule && isRangeOperator(rule.operator);
    const wasMultiSelectOperator = rule && isMultiSelectOperator(rule.operator);
    const isNowRangeOperator = isRangeOperator(operator);
    const isNowMultiSelectOperator = isMultiSelectOperator(operator);

    setRules((rules) =>
      rules.map((r, i) =>
        i === idx
          ? {
              ...r,
              operator,

              // Preserve value when switching between multi-select operators (in/not in)
              value: isNowRangeOperator
                ? [null, null]
                : isNowMultiSelectOperator
                  ? wasMultiSelectOperator
                    ? r.value
                    : []
                  : wasRangeOperator || wasMultiSelectOperator
                    ? ''
                    : r.value,
            }
          : r
      )
    );

    // Clear range error if operator is no longer a range operator
    if (rule && isNumericField(rule.field) && !isRangeOperator(operator)) {
      setRangeErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[idx];
        return newErrors;
      });
    }
  };

  const handleValueChange = (idx: number, value: any) => {
    setRules((rules) => {
      const updatedRules = rules.map((r, i) => (i === idx ? { ...r, value } : r));
      const rule = updatedRules[idx];

      // Validate range values for numeric fields with "between" operator
      if (rule && isNumericField(rule.field) && isRangeOperator(rule.operator)) {
        validateRangeValue(idx, value);
      } else {
        // Clear range error if not a range operator
        setRangeErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[idx];
          return newErrors;
        });
      }

      return updatedRules;
    });
  };

  // Validate that Min <= Max for range inputs
  const validateRangeValue = (idx: number, value: any) => {
    if (Array.isArray(value) && value.length === 2) {
      const min = value[0];
      const max = value[1];

      // Only validate if both values are provided and are valid numbers
      if (
        min !== '' &&
        max !== '' &&
        min !== null &&
        max !== null &&
        min !== undefined &&
        max !== undefined
      ) {
        const minNum = Number(min);
        const maxNum = Number(max);

        if (!isNaN(minNum) && !isNaN(maxNum)) {
          if (minNum > maxNum) {
            setRangeErrors((prev) => ({
              ...prev,
              [idx]: 'Min value cannot be greater than Max value',
            }));
            return false;
          }
        }
      }
    }

    // Clear error if validation passes
    setRangeErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[idx];
      return newErrors;
    });
    return true;
  };

  const addRule = () => {
    const firstField = Object.keys(fields)[0];
    setRules((rules) => [
      ...rules,
      {
        field: firstField,
        operator: fields[firstField]?.operators[0] || '',
        value: '',
      },
    ]);
  };

  const removeRule = (idx: number) => {
    if (rules.length === 1) {
      setRules([{ ...emptyRule }]);
    } else {
      setRules(rules.filter((_, i) => i !== idx));
    }

    // Clear range error for removed rule
    setRangeErrors((prev) => {
      const newErrors: Record<number, string> = {};
      Object.keys(prev).forEach((key) => {
        const keyNum = Number(key);
        if (keyNum < idx) {
          newErrors[keyNum] = prev[keyNum];
        } else if (keyNum > idx) {
          newErrors[keyNum - 1] = prev[keyNum];
        }
      });
      return newErrors;
    });

    setError(null);
  };

  // Check for global mutual exclusivity: if "agent" or "last_transfer" is selected in group by filters
  const hasAgentInGroupBy = selectedGroupByArray?.includes('agent') || false;
  const hasLastTransferInGroupBy = selectedGroupByArray?.includes('last_transfer') || false;
  // Transfer Lead (transferred_lead) vs Lead Transfer (lead_transfer:day/week/month/year) — same rule as Group By
  const hasTransferredLeadInGroupBy =
    selectedGroupByArray?.includes('transferred_lead') ?? false;
  const hasLeadTransferFamilyInGroupBy =
    selectedGroupByArray?.some(
      (f) => f === 'lead_transfer' || (typeof f === 'string' && f.startsWith('lead_transfer:'))
    ) ?? false;

  // Apply global mutual exclusivity: hide conflicting fields based on group by selections
  const availableFields = useMemo(() => {
    return Object.fromEntries(
      Object.entries(fields).filter(([fieldName]) => {
        // If "agent" is selected in group by, hide "last_transfer" from dynamic filters
        if (hasAgentInGroupBy && fieldName === 'last_transfer') {
          return false;
        }
        // If "last_transfer" is selected in group by, hide "agent" from dynamic filters
        if (hasLastTransferInGroupBy && fieldName === 'agent') {
          return false;
        }
        // Grouped by Lead Transfer (any granularity): cannot filter by Transfer Lead
        if (hasLeadTransferFamilyInGroupBy && fieldName === 'transferred_lead') {
          return false;
        }
        // Grouped by Transfer Lead: cannot filter by Lead Transfer base or granularities
        if (
          hasTransferredLeadInGroupBy &&
          (fieldName === 'transferred_lead' ||
            fieldName === 'lead_transfer' ||
            fieldName.startsWith('lead_transfer:'))
        ) {
          return false;
        }
        return true;
      })
    );
  }, [
    fields,
    hasAgentInGroupBy,
    hasLastTransferInGroupBy,
    hasLeadTransferFamilyInGroupBy,
    hasTransferredLeadInGroupBy,
  ]);

  /** Build domain filters from current rules; on failure sets `error` and returns null. */
  const buildFormattedDomainRules = (): DomainFilter[] | null => {
    setError(null);

    let hasRangeValidationErrors = false;
    rules.forEach((rule, idx) => {
      if (isNumericField(rule.field) && isRangeOperator(rule.operator)) {
        if (!validateRangeValue(idx, rule.value)) {
          hasRangeValidationErrors = true;
        }
      }
    });

    if (hasRangeValidationErrors) {
      setError('Please fix range validation errors before applying filters');
      return null;
    }

    const formattedRules: DomainFilter[] = rules
      .filter((rule) => {
        if (!rule.field || !rule.operator) return false;
        if (isMultiSelectOperator(rule.operator)) {
          return Array.isArray(rule.value) && rule.value.length > 0;
        }
        return rule.value !== undefined && rule.value !== '';
      })
      .map(
        (rule) =>
          [
            rule.field,
            rule.operator,
            formatValueForAPI(rule.field, rule.operator, rule.value),
          ] as DomainFilter
      );

    return formattedRules;
  };

  // Handle apply filters
  const handleApply = async () => {
    const formattedRules = buildFormattedDomainRules();
    if (formattedRules === null) return;

    // Update store with user filters
    if (multiTableStore) {
      multiTableStore.setUserDomainFilters(formattedRules);
    } else {
      globalStore.setUserDomainFilters(formattedRules);
    }

    // Get combined filters (defaults + user filters)
    const combinedFilters = multiTableStore
      ? formattedRules
      : globalStore.getCombinedDomainFilters();

    // eslint-disable-next-line no-console
    console.debug('✅ [CustomFilterOption] apply', {
      entityType,
      formattedRules,
      combinedFilters,
      selectedGroupByArray,
    });

    // Call onApply callback with combined filters
    if (onApply) {
      onApply(combinedFilters);
    }
    setRulesSyncSource('store');
  };

  const openOrToggleSaveFiltersPanel = () => {
    if (saveFiltersPanelOpen) {
      setSaveFiltersPanelOpen(false);
      setSaveFilterTitle('');
      setSaveFilterTitleError(null);
      return;
    }
    setSavedFilterPutTarget(null);
    setLoadSavedFiltersOpen(false);
    const formattedRules = buildFormattedDomainRules();
    if (formattedRules === null) return;
    if (formattedRules.length === 0) {
      setError('Add at least one complete filter rule before saving.');
      return;
    }
    setSaveFilterTitle('');
    setSaveFilterTitleError(null);
    setSaveFiltersPanelOpen(true);
  };

  const confirmSaveFilters = async () => {
    const trimmed = saveFilterTitle.trim();
    if (!trimmed) {
      setSaveFilterTitleError('Enter a name for this saved filter.');
      return;
    }

    const formattedRules = buildFormattedDomainRules();
    if (formattedRules === null) return;
    if (formattedRules.length === 0) {
      setSaveFilterTitleError('Add at least one complete filter rule before saving.');
      return;
    }

    const userId =
      (session?.user as { id?: string; _id?: string } | undefined)?.id ||
      (session?.user as { id?: string; _id?: string } | undefined)?._id ||
      (session?.user as { email?: string } | undefined)?.email;
    const storageKey = getSavedCustomFiltersStorageKey(
      userId,
      effectiveEntityType,
      tableId ?? null
    );

    const page = entityTypeToFilterPage(effectiveEntityType);
    const apiPayload: SavedFilterApiPayload = {
      title: trimmed,
      page,
      type: 'filter',
      domain: formattedRules as Domain,
    };

    // eslint-disable-next-line no-console
    console.info(
      '[CustomFilterOption] POST /saved-filters body (see api-response.txt)',
      apiPayload
    );

    let listForDedupe = serverSavedFiltersList;
    if (listForDedupe === null) {
      try {
        const { data } = await apiListSavedFiltersByPage(page, { limit: 100, type: 'filter' });
        listForDedupe = data;
        setServerSavedFiltersList(data);
      } catch {
        listForDedupe = null;
      }
    }
    if (listForDedupe?.length) {
      const duplicate = listForDedupe
        .filter(isSavedFilterTypeFilter)
        .find((p) =>
          areSavedDomainsEquivalent(p.domain as Domain, formattedRules as Domain)
        );
      if (duplicate) {
        toast.push(
          <Notification type="info" title="Already saved">
            This filter matches &quot;{duplicate.title}&quot;. No request was sent.
          </Notification>
        );
        setSaveFiltersPanelOpen(false);
        setSaveFilterTitle('');
        setSaveFilterTitleError(null);
        return;
      }
    }

    const makeLocalId = () =>
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const created = await apiCreateSavedFilter(apiPayload);
      setServerSavedFiltersList((prev) => (prev ? [...prev, created] : [created]));
      toast.push(
        <Notification type="success" title="Saved">
          Filter &quot;{created.title}&quot; was saved to your account.
        </Notification>
      );
      setSaveFiltersPanelOpen(false);
      setSaveFilterTitle('');
      setSaveFilterTitleError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      const record: SavedCustomFilterRecord = {
        id: makeLocalId(),
        title: trimmed,
        page,
        domain: formattedRules,
        createdAt: new Date().toISOString(),
        entityType: effectiveEntityType,
        tableId: tableId ?? null,
      };
      try {
        appendSavedCustomFilter(storageKey, record);
        toast.push(
          <Notification type="warning" title="Saved locally">
            Server save failed ({message}). The filter was stored in this browser only.
          </Notification>
        );
        setSaveFiltersPanelOpen(false);
        setSaveFilterTitle('');
        setSaveFilterTitleError(null);
      } catch {
        toast.push(
          <Notification type="danger" title="Save failed">
            {message}. Could not save to server or browser storage.
          </Notification>
        );
      }
    }
  };

  const confirmUpdateSavedFilterDomain = async () => {
    if (!savedFilterPutTarget) return;
    const formattedRules = buildFormattedDomainRules();
    if (formattedRules === null) return;
    if (formattedRules.length === 0) {
      toast.push(
        <Notification type="warning" title="Nothing to save">
          Add at least one complete filter rule before updating this preset.
        </Notification>
      );
      return;
    }
    const payload: UpdateSavedFilterInput = {
      title: savedFilterPutTarget.title.trim(),
      page: savedFilterPutTarget.page,
      type: 'filter',
      domain: formattedRules as Domain,
    };
    if (savedFilterPutTarget.description !== undefined && savedFilterPutTarget.description !== '') {
      payload.description = savedFilterPutTarget.description;
    }
    // eslint-disable-next-line no-console
    console.info('[CustomFilterOption] PUT /saved-filters/:id body (see api-response.txt)', payload);
    setSavedFilterPutSaving(true);
    try {
      const updated = await apiUpdateSavedFilter(savedFilterPutTarget._id, payload);
      setServerSavedFiltersList((prev) =>
        prev ? prev.map((p) => (p._id === updated._id ? updated : p)) : [updated]
      );
      setSavedFilterPutTarget(null);
      setRulesSyncSource('store');
      toast.push(
        <Notification type="success" title="Updated">
          Saved filter &quot;{updated.title}&quot; was updated on the server.
        </Notification>
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      toast.push(
        <Notification type="danger" title="Could not update">
          {message}
        </Notification>
      );
    } finally {
      setSavedFilterPutSaving(false);
    }
  };

  const hasAtLeastOneValidRule = rules.some((rule) => {
    if (!rule.field || !rule.operator) return false;
    if (isMultiSelectOperator(rule.operator)) {
      return Array.isArray(rule.value) && rule.value.length > 0;
    }
    return rule.value !== undefined && rule.value !== '';
  });

  const saveFiltersDisabled = !hasAtLeastOneValidRule || Object.keys(rangeErrors).length > 0;

  // Helper for Select options
  const getFieldOptions = () => {
    const availableFieldKeys = Object.keys(availableFields);
    const selectedFieldKeys = rules
      .map((rule) => rule.field)
      .filter((field): field is string => !!field);

    // Combine available fields with selected fields
    const allFieldKeys = new Set([...availableFieldKeys, ...selectedFieldKeys]);

    return Array.from(allFieldKeys).map((key) => ({
      value: key,
      label: fields[key]?.label || key,
    }));
  };

  // const getOperatorOptions = (field: string) => {
  //   const fieldConfig = availableFields[field] || fields[field];

  //   const operators = fieldConfig?.operators || [];

  //   return operators.map((op: string) => ({
  //     value: op,
  //     label: op,
  //   }));
  // };

  const getOperatorOptions = (field: string) => {
    const fieldConfig = availableFields[field] || fields[field];
    let operators: string[] = fieldConfig?.operators || [];

    if (SPECIAL_FIELDS_NO_CHANGE.includes(field)) {
      operators = operators.filter((op) => op !== 'is_not_empty');
    } else {
      operators = operators.filter((op) => !FILTER_OPTIONS.includes(op));
    }
    return operators.map((op: string) => ({
      value: op,
      label: OPERATOR_LABELS[op] || op,
    }));
  };
  const getValueOptions = (field: string) => {
    const fieldConfig = availableFields[field] || fields[field];
    if (fieldConfig?.values) {
      return fieldConfig.values.map((v: any) => {
        // Handle new structure: values are objects with _id and value properties
        if (v && typeof v === 'object' && '_id' in v && 'value' in v) {
          // Special handling for duplicate_status - map numeric values to labels
          if (field === 'duplicate_status') {
            const labelMap: Record<number, string> = {
              0: 'New',
              1: '10 Week Duplicate',
              2: 'Duplicate',
            };
            return {
              value: v._id, // Use _id as the actual filter value
              label: labelMap[Number(v._id)] || String(v.value), // Map number to label
            };
          }
          return {
            value: v._id, // Use _id as the actual filter value
            label: String(v.value), // Use value as the display label
          };
        }
        // Fallback for old structure (plain values)
        // Special handling for duplicate_status - map numeric values to labels
        if (field === 'duplicate_status') {
          const labelMap: Record<number, string> = {
            0: 'New',
            1: '10 Week Duplicate',
            2: 'Duplicate',
          };
          return {
            value: v,
            label: labelMap[Number(v)] || String(v),
          };
        }
        return {
          value: v,
          label: String(v),
        };
      });
    }
    return [];
  };

  return (
    <>
      <div className="w-full">
        <div className="space-y-4">
          {fieldsLoading ? (
            <DynamicFiltersShimmer />
          ) : fieldsError ? (
            <div className="text-red-500">Failed to load filter options</div>
          ) : (
            <>
              {/* Warning for global mutual exclusivity */}
              {(hasAgentInGroupBy || hasLastTransferInGroupBy) && (
                <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-blue-600">
                      ℹ️ Info: Some fields are hidden due to active group filters
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-blue-500">
                    {hasAgentInGroupBy &&
                      "• 'Last Transfer' field is hidden because 'Agent' is selected in group filters"}
                    {hasLastTransferInGroupBy &&
                      "• 'Agent' field is hidden because 'Last Transfer' is selected in group filters"}
                  </div>
                </div>
              )}

              {/* Display locked filters for agents - these cannot be removed */}
              {/* Only global store has locked filters, multi-table store doesn't */}
              {isAgent && !multiTableStore && globalStore.lockedDomainFilters.length > 0 && (
                <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2">
                  <div className="mb-2 flex items-center gap-1 text-xs font-medium text-amber-700">
                    <span>🔒</span>
                    <span>Required Filters (cannot be removed)</span>
                  </div>
                  <div className="space-y-1">
                    {globalStore.lockedDomainFilters.map((filter: DomainFilter, idx: number) => {
                      const [field, operator, value] = filter;
                      const fieldLabel = fields[field]?.label || field;
                      const displayValue = Array.isArray(value)
                        ? value
                            .map((v) => {
                              // Try to resolve IDs to labels for display
                              const fieldValues = fields[field]?.values || [];
                              const match = fieldValues.find(
                                (fv: MetadataValueOption) => String(fv._id) === String(v)
                              );
                              return match ? String(match.value) : String(v);
                            })
                            .join(', ')
                        : String(value);
                      return (
                        <div
                          key={`locked-${idx}`}
                          className="flex items-center gap-2 rounded bg-amber-100 px-2 py-1 text-xs text-amber-800"
                        >
                          <span className="font-medium">{fieldLabel}</span>
                          <span className="text-amber-600">{operator}</span>
                          <span className="truncate">{displayValue}</span>
                          <span
                            className="ml-auto text-amber-500"
                            title="This filter cannot be removed"
                          >
                            🔒
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="max-h-[200px] min-h-[200px] overflow-y-auto">
                {rules.map((rule, idx) => (
                  <div key={idx} className="mb-2 flex items-center gap-2 last:mb-0">
                    <div className="flex w-full justify-between gap-2">
                      {/* Field Select */}
                      <div
                        className={`text-sm whitespace-nowrap ${
                          isRangeOperator(rule.operator) || isMultiSelectOperator(rule.operator)
                            ? 'w-1/4'
                            : 'w-1/3'
                        }`}
                      >
                        <Select
                          options={getFieldOptions()}
                          value={
                            getFieldOptions().find(
                              (opt: { value: string }) => opt.value === rule.field
                            ) || null
                          }
                          onChange={(opt: { value: string; label: string } | null) =>
                            handleFieldChange(idx, opt?.value || '')
                          }
                          placeholder="Field"
                          isSearchable={true}
                          size="md"
                          menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                          menuPosition="fixed"
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999, fontSize: '14px' }),
                            control: (base) => ({ ...base, fontSize: '14px' }),
                            menu: (base) => ({ ...base, fontSize: '14px' }),
                            menuList: (base) => ({ ...base, fontSize: '14px' }),
                            option: (base) => ({ ...base, fontSize: '14px', whiteSpace: 'nowrap' }),
                            singleValue: (base) => ({
                              ...base,
                              fontSize: '14px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }),
                            placeholder: (base) => ({ ...base, fontSize: '14px' }),
                            input: (base) => ({ ...base, fontSize: '14px' }),
                          }}
                        />
                      </div>
                      {/* Operator Select */}
                      <div
                        className={
                          isRangeOperator(rule.operator) || isMultiSelectOperator(rule.operator)
                            ? 'w-1/4'
                            : 'w-1/3'
                        }
                      >
                        <Select
                          options={getOperatorOptions(rule.field)}
                          value={
                            getOperatorOptions(rule.field).find(
                              (opt: { value: string }) => opt.value === rule.operator
                            ) || null
                          }
                          onChange={(opt: { value: string; label: string } | null) =>
                            handleOperatorChange(idx, opt?.value || '')
                          }
                          placeholder="Operator"
                          isSearchable={true}
                          size="md"
                          menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                          menuPosition="fixed"
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999, fontSize: '14px' }),
                            control: (base) => ({ ...base, fontSize: '14px' }),
                            menu: (base) => ({ ...base, fontSize: '14px' }),
                            menuList: (base) => ({ ...base, fontSize: '14px' }),
                            option: (base) => ({ ...base, fontSize: '14px', whiteSpace: 'nowrap' }),
                            singleValue: (base) => ({
                              ...base,
                              fontSize: '14px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }),
                            placeholder: (base) => ({ ...base, fontSize: '14px' }),
                            input: (base) => ({ ...base, fontSize: '14px' }),
                          }}
                        />
                      </div>
                      {/* Value Select/Input */}
                      {['is_empty', 'is_not_empty'].includes(rule.operator) ? null : (
                        <div
                          className={`min-w-0 text-sm ${
                            isRangeOperator(rule.operator) || isMultiSelectOperator(rule.operator)
                              ? 'min-w-[140px] flex-1'
                              : 'w-1/3'
                          }`}
                        >
                          {isDateField(rule.field) && isRangeOperator(rule.operator) ? (
                            // Date Range Picker
                            <div className="w-full min-w-0">
                              <DatePicker.DatePickerRange
                              value={
                                Array.isArray(rule.value) && rule.value.length === 2
                                  ? [
                                      rule.value[0] instanceof Date
                                        ? rule.value[0]
                                        : rule.value[0]
                                          ? new Date(rule.value[0])
                                          : null,
                                      rule.value[1] instanceof Date
                                        ? rule.value[1]
                                        : rule.value[1]
                                          ? new Date(rule.value[1])
                                          : null,
                                    ]
                                  : [null, null]
                              }
                              onChange={(range: [Date | null, Date | null]) => {
                                handleValueChange(idx, range);
                              }}
                              inputFormat="YYYY-MM-DD"
                              size="md"
                              className="w-full [&_input]:h-10 [&_input]:rounded-md"
                            />
                            </div>
                          ) : isDateField(rule.field) ? (
                            // Single Date Picker
                            <DatePicker
                              value={
                                rule.value &&
                                typeof rule.value === 'object' &&
                                rule.value instanceof Date
                                  ? rule.value
                                  : rule.value && typeof rule.value === 'string'
                                    ? new Date(rule.value)
                                    : null
                              }
                              onChange={(date: Date | null) => {
                                handleValueChange(idx, date);
                              }}
                              placeholder="Select Date"
                              inputFormat="YYYY-MM-DD"
                              size="md"
                              className="[&_input]:h-10 [&_input]:rounded-md"
                            />
                          ) : isNumericField(rule.field) && isRangeOperator(rule.operator) ? (
                            // Number range: same height/radius as Select controls (react-select theme.controlHeight = 38px; .select-control uses rounded-lg)
                            <div className="flex w-full min-w-0 flex-col gap-1">
                              <div className="flex w-full min-w-0 items-center gap-2">
                                <div className="min-w-0 flex-1">
                                  <Input
                                    type="number"
                                    placeholder="Min"
                                    size="md"
                                    className={`w-full h-[38px]! min-h-[38px]! py-0! text-sm leading-normal rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${rangeErrors[idx] ? 'border-red-500' : ''}`}
                                    value={Array.isArray(rule.value) ? rule.value[0] || '' : ''}
                                    onChange={(e) => {
                                      const currentValue = Array.isArray(rule.value)
                                        ? rule.value
                                        : ['', ''];
                                      const newValue = [e.target.value, currentValue[1] || ''];
                                      handleValueChange(idx, newValue);
                                    }}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <Input
                                    type="number"
                                    placeholder="Max"
                                    size="md"
                                    className={`w-full h-[38px]! min-h-[38px]! py-0! text-sm leading-normal rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${rangeErrors[idx] ? 'border-red-500' : ''}`}
                                    value={Array.isArray(rule.value) ? rule.value[1] || '' : ''}
                                    onChange={(e) => {
                                      const currentValue = Array.isArray(rule.value)
                                        ? rule.value
                                        : ['', ''];
                                      const newValue = [currentValue[0] || '', e.target.value];
                                      handleValueChange(idx, newValue);
                                    }}
                                  />
                                </div>
                              </div>
                              {rangeErrors[idx] && (
                                <div className="mt-1 text-xs text-red-500">{rangeErrors[idx]}</div>
                              )}
                            </div>
                          ) : isMultiSelectOperator(rule.operator) ? (
                            // Multi-select for "in" and "not in" operators
                            (() => {
                              const valueOptions = getValueOptions(rule.field);
                              const hasPredefinedOptions = valueOptions.length > 0;

                              // Convert rule.value array to options format for display
                              const getDisplayValue = () => {
                                if (!Array.isArray(rule.value) || rule.value.length === 0) {
                                  return [];
                                }

                                return rule.value.map((val: any) => {
                                  // Try to find in predefined options first
                                  const foundOption = valueOptions.find(
                                    (opt: { value: any }) => opt.value === val
                                  );
                                  if (foundOption) {
                                    return foundOption;
                                  }
                                  // If not found, create option from the value itself (for manual entries)
                                  return { value: val, label: String(val) };
                                });
                              };

                              const commonProps = {
                                isMulti: true,
                                value: getDisplayValue(),
                                onChange: (newValue: any) => {
                                  // Handle both MultiValue and SingleValue types
                                  const selected = Array.isArray(newValue)
                                    ? newValue
                                    : newValue
                                      ? [newValue]
                                      : [];
                                  const selectedValues = selected.map(
                                    (opt: { value: any }) => opt.value
                                  );
                                  handleValueChange(idx, selectedValues);
                                },
                                placeholder: hasPredefinedOptions
                                  ? 'Select values'
                                  : 'Type and press Enter to add values',
                                isSearchable: true,
                                isClearable: true,
                                size: 'md' as const,
                                menuPortalTarget:
                                  typeof window !== 'undefined' ? document.body : null,
                                menuPosition: 'fixed' as const,
                                customFilterOnRemoveValue: (val: any) => {
                                  const arr = Array.isArray(rule.value) ? [...rule.value] : [];
                                  // Remove first match (loose eq so string/number id still removes); keeps list in sync
                                  const i = arr.findIndex(
                                    (v: any) => v === val || String(v) === String(val)
                                  );
                                  if (i === -1) return;
                                  const next = [...arr];
                                  next.splice(i, 1);
                                  handleValueChange(idx, next);
                                },
                                components: {
                                  ValueContainer: CustomFilterValueContainer,
                                  MultiValueRemove: CustomFilterMultiValueRemove,
                                  ClearIndicator: CustomFilterClearIndicator,
                                },
                                styles: {
                                  menuPortal: (base: any) => ({
                                    ...base,
                                    zIndex: 9999,
                                    fontSize: '14px',
                                  }),
                                  control: (base: any) => ({
                                    ...base,
                                    fontSize: '14px',
                                    flexWrap: 'nowrap',
                                    paddingLeft: 4,
                                    paddingRight: 2,
                                    paddingTop: 2,
                                    paddingBottom: 2,
                                  }),
                                  valueContainer: (base: any) => ({
                                    ...base,
                                    overflow: 'auto',
                                    overflowX: 'auto',
                                    minWidth: 0,
                                    paddingLeft: 2,
                                    paddingRight: 0,
                                  }),
                                  menu: (base: any) => ({ ...base, fontSize: '14px' }),
                                  menuList: (base: any) => ({ ...base, fontSize: '14px' }),
                                  option: (base: any) => ({
                                    ...base,
                                    fontSize: '14px',
                                    whiteSpace: 'nowrap',
                                  }),
                                  multiValue: (base: any) => ({
                                    ...base,
                                    fontSize: '14px',
                                    margin: '0 2px 0 0',
                                  }),
                                  multiValueLabel: (base: any) => ({ ...base, fontSize: '14px' }),
                                  placeholder: (base: any) => ({ ...base, fontSize: '14px' }),
                                  input: (base: any) => ({ ...base, fontSize: '14px' }),
                                  indicatorsContainer: (base: any) => ({
                                    ...base,
                                    display: 'flex',
                                    alignItems: 'center',
                                    paddingLeft: 1,
                                    paddingRight: 1,
                                    gap: 0,
                                  }),
                                },
                                closeMenuOnSelect: false,
                              };

                              if (hasPredefinedOptions) {
                                // Use regular Select when there are predefined options
                                return <Select {...(commonProps as any)} options={valueOptions} />;
                              } else {
                                return (
                                  <CreatableMultiSelect
                                    commonProps={commonProps}
                                    onAddValue={(inputValue: string) => {
                                      const currentValues = Array.isArray(rule.value)
                                        ? rule.value
                                        : [];
                                      handleValueChange(idx, [...currentValues, inputValue]);
                                    }}
                                  />
                                );
                              }
                            })()
                          ) : (
                            // Regular Select
                            <Select
                              options={
                                getValueOptions(rule.field).length > 0
                                  ? getValueOptions(rule.field)
                                  : rule.value !== undefined && rule.value !== ''
                                    ? [{ value: rule.value, label: String(rule.value) }]
                                    : []
                              }
                              value={
                                rule.value !== undefined && rule.value !== ''
                                  ? getValueOptions(rule.field).length > 0
                                    ? getValueOptions(rule.field).find(
                                        (opt: { value: any }) => opt.value === rule.value
                                      ) || null
                                    : { value: rule.value, label: String(rule.value) }
                                  : null
                              }
                              onChange={(opt: { value: any; label: string } | null) => {
                                handleValueChange(idx, opt?.value ?? '');
                              }}
                              placeholder="Value"
                              isSearchable={true}
                              isClearable={true}
                              size="md"
                              onInputChange={(inputValue) => {
                                if (inputValue !== '' || rule.value === '') {
                                  handleValueChange(idx, inputValue);
                                }
                              }}
                              menuPortalTarget={
                                typeof window !== 'undefined' ? document.body : null
                              }
                              menuPosition="fixed"
                              styles={{
                                menuPortal: (base) => ({ ...base, zIndex: 9999, fontSize: '14px' }),
                                control: (base) => ({ ...base, fontSize: '14px' }),
                                menu: (base) => ({ ...base, fontSize: '14px' }),
                                menuList: (base) => ({ ...base, fontSize: '14px' }),
                                option: (base) => ({
                                  ...base,
                                  fontSize: '14px',
                                  whiteSpace: 'nowrap',
                                }),
                                singleValue: (base) => ({
                                  ...base,
                                  fontSize: '14px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }),
                                placeholder: (base) => ({ ...base, fontSize: '14px' }),
                                input: (base) => ({ ...base, fontSize: '14px' }),
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    {/* Remove Rule */}
                    <Tooltip
                      title={CUSTOM_FILTER_REMOVE_RULE_TOOLTIP}
                      placement="top"
                      wrapperClass="inline-flex"
                      className={TOOLTIP_POPOVER_CLASS}
                      disabled={rules.length === 1}
                    >
                      <Button
                        variant={BUTTON_REMOVE}
                        onClick={() => removeRule(idx)}
                        disabled={rules.length === 1}
                        className="text-red-500"
                      >
                        ✕
                      </Button>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="border-t border-gray-100 pt-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                <Tooltip
                  title={CUSTOM_FILTER_ADD_RULE_TOOLTIP}
                  placement="top"
                  wrapperClass="inline-flex"
                  className={TOOLTIP_POPOVER_CLASS}
                  disabled={rules.length >= 20}
                >
                  <Button
                    variant="default"
                    size="sm"
                    className="border-evergreen/50 bg-evergreen/10 text-evergreen hover:bg-evergreen/20"
                    onClick={addRule}
                    disabled={rules.length >= 20}
                  >
                    + Add Rule
                  </Button>
                </Tooltip>
                <Tooltip
                  title={CUSTOM_FILTER_CLEAR_RULES_TOOLTIP}
                  placement="top"
                  wrapperClass="inline-flex"
                  className={TOOLTIP_POPOVER_CLASS}
                >
                  <Button
                    onClick={() => {
                      setRules([{ ...emptyRule }]);
                      setRulesSyncSource('store');
                      setSavedFilterPutTarget(null);

                      // Clear filters from the appropriate store
                      if (multiTableStore) {
                        multiTableStore.clearFilters();
                      } else {
                        globalStore.clearUserDomainFilters();
                      }

                      setError(null);
                      setSaveFiltersPanelOpen(false);
                      setSaveFilterTitle('');
                      setSaveFilterTitleError(null);
                      setLoadSavedFiltersOpen(false);

                      // Get combined filters (only defaults, no user filters)
                      const combinedFilters = multiTableStore
                        ? []
                        : globalStore.getCombinedDomainFilters();

                      // Call onApply callback with default filters only (empty user filters)
                      // This triggers the same flow as applying filters, ensuring queries are invalidated
                      if (onApply) {
                        onApply(combinedFilters);
                      }

                      // eslint-disable-next-line no-console
                      console.debug('🧹 [CustomFilterOption] clear', {
                        entityType,
                        tableId,
                        combinedFilters,
                      });
                    }}
                    variant="default"
                    size="sm"
                    className="border-rust/40 bg-rust/10 text-rust hover:bg-rust/20"
                  >
                    Clear rules
                  </Button>
                </Tooltip>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <div ref={loadSavedFiltersAnchorRef} className="inline-flex">
                  <Tooltip
                    title={CUSTOM_FILTER_SAVED_VIEWS_TOOLTIP}
                    placement="top"
                    wrapperClass="inline-flex"
                    className={TOOLTIP_POPOVER_CLASS}
                    disabled={fieldsLoading || !!fieldsError}
                  >
                    <Button
                      variant="default"
                      size="sm"
                      className={`gap-0.5 px-1.5 ${
                        loadSavedFiltersOpen
                          ? 'border-sunbeam-2 bg-sunbeam-2 text-gray-700 hover:bg-sunbeam-3'
                          : 'border-sunbeam-2/60 bg-sunbeam-1/50 text-gray-700 hover:bg-sunbeam-1'
                      }`}
                      onClick={() => {
                        setLoadSavedFiltersOpen((v) => {
                          const next = !v;
                          if (next) {
                            setSaveFiltersPanelOpen(false);
                            setSaveFilterTitle('');
                            setSaveFilterTitleError(null);
                          }
                          return next;
                        });
                      }}
                      disabled={fieldsLoading || !!fieldsError}
                      aria-expanded={loadSavedFiltersOpen}
                      aria-haspopup="dialog"
                    >
                      <span className="inline-flex items-center gap-0.5">
                        Saved Views
                        <ApolloIcon
                          name="chevron-arrow-down"
                          className="h-3 w-3 shrink-0 opacity-80"
                          aria-hidden
                        />
                      </span>
                    </Button>
                  </Tooltip>
                </div>
                {savedFilterPutTarget ? (
                  <Tooltip
                    title={`Editing rules for "${savedFilterPutTarget.title}". Click Update saved to write the new filter rules to your account.`}
                    placement="top"
                    wrapperClass="inline-flex"
                    className={TOOLTIP_POPOVER_CLASS}
                    hoverOnly
                  >
                    <Button
                      variant="solid"
                      size="sm"
                      className="px-1.5"
                      disabled={savedFilterPutSaving || saveFiltersDisabled}
                      onClick={() => void confirmUpdateSavedFilterDomain()}
                    >
                      {savedFilterPutSaving ? 'Saving…' : 'Update saved'}
                    </Button>
                  </Tooltip>
                ) : (
                  <div ref={saveFiltersAnchorRef} className="inline-flex">
                    <Tooltip
                      title={CUSTOM_FILTER_SAVE_BUTTON_TOOLTIP}
                      placement="top"
                      wrapperClass="inline-flex"
                      className={TOOLTIP_POPOVER_CLASS}
                      disabled={saveFiltersDisabled}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        className="px-1.5"
                        onClick={openOrToggleSaveFiltersPanel}
                        disabled={saveFiltersDisabled}
                      >
                        Save
                      </Button>
                    </Tooltip>
                  </div>
                )}
                <Tooltip
                  title={CUSTOM_FILTER_APPLY_BUTTON_TOOLTIP}
                  placement="top"
                  wrapperClass="inline-flex"
                  className={TOOLTIP_POPOVER_CLASS}
                  disabled={saveFiltersDisabled}
                >
                  <Button
                    onClick={handleApply}
                    disabled={saveFiltersDisabled}
                    variant={BUTTON_APPLY}
                    size="sm"
                    className="px-1.5"
                  >
                    Apply
                  </Button>
                </Tooltip>
              </div>
            </div>
            {rules.length >= 20 && (
              <div className="mt-2 text-xs text-gray-500">You can add up to 20 rules only.</div>
            )}
            {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
          </div>
        </div>
      </div>
      {loadSavedFiltersOpen &&
        loadSavedFiltersRect &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={savedFiltersPickerRef}
            data-saved-filters-picker
            className="fixed flex max-h-[min(288px,calc(100svh-52px))] min-w-[280px] flex-col overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-xl shadow-gray-200/50"
            style={{
              top: loadSavedFiltersRect.top,
              left: loadSavedFiltersRect.left,
              width: loadSavedFiltersRect.width,
              transform: loadSavedFiltersRect.transform,
              zIndex: 100010,
            }}
            role="dialog"
            aria-label="Load a saved filter"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-gray-100 bg-linear-to-b from-sky-50/40 to-white px-3 py-1.5">
              <h3 className="text-sm font-semibold tracking-tight text-gray-900">
                Your saved filters
              </h3>
              <p className="text-[11px] leading-tight text-gray-500">
                Page: {entityTypeToFilterPage(effectiveEntityType)} · click a row to load ·
                double-click the title to rename
              </p>
            </div>
            <div className="max-h-[min(184px,30svh)] min-h-0 shrink overflow-y-auto overscroll-contain px-1.5 py-0.5 pe-3 [scrollbar-gutter:stable]">
              {loadSavedFiltersLoading && (
                <div
                  className="space-y-0.5 py-0"
                  aria-busy="true"
                  aria-label="Loading saved filters"
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Skeleton className="rounded-md" height={13} width="88%" />
                        <Skeleton className="rounded-md" height={10} width="55%" />
                      </div>
                      <Skeleton className="shrink-0 rounded" height={26} width={26} />
                    </div>
                  ))}
                </div>
              )}
              {!loadSavedFiltersLoading && loadSavedFiltersError && (
                <div className="px-1 py-2 text-sm text-red-600">{loadSavedFiltersError}</div>
              )}
              {!loadSavedFiltersLoading &&
                !loadSavedFiltersError &&
                serverSavedFiltersList &&
                serverSavedFiltersList.length === 0 && (
                  <div className="px-2 py-3 text-center text-xs text-gray-500">
                    No saved filters for this page yet.
                  </div>
                )}
              {!loadSavedFiltersLoading &&
                !loadSavedFiltersError &&
                serverSavedFiltersList &&
                serverSavedFiltersList.length > 0 &&
                !serverSavedFiltersList.some(isSavedFilterTypeFilter) && (
                  <div className="px-2 py-3 text-center text-xs text-gray-500">
                    No saved filter presets for this page yet.
                  </div>
                )}
              {!loadSavedFiltersLoading &&
                !loadSavedFiltersError &&
                serverSavedFiltersList &&
                serverSavedFiltersList.some(isSavedFilterTypeFilter) && (
                  <ul className="space-y-0">
                    {serverSavedFiltersList.filter(isSavedFilterTypeFilter).map((preset) => (
                      <li
                        key={preset._id}
                        className="group flex items-center gap-0.5 rounded-lg border border-transparent hover:border-gray-100 hover:bg-gray-50/90"
                      >
                        {editingSavedFilterId === preset._id ? (
                          <div className="flex min-w-0 flex-1 items-center gap-1 px-1.5 py-0">
                            <Input
                              size="xs"
                              autoFocus
                              value={editingSavedFilterTitle}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setEditingSavedFilterTitle(e.target.value)
                              }
                              placeholder="Preset title"
                              className="min-w-0 flex-1 rounded-md! text-sm! font-medium leading-tight! h-6! min-h-0! py-0! px-2!"
                              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void handleCommitSavedFilterTitle(preset);
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  handleCancelEditSavedFilterTitle();
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                              aria-label="Save title"
                              disabled={savingSavedFilterTitleId !== null}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => void handleCommitSavedFilterTitle(preset)}
                            >
                              {savingSavedFilterTitleId === preset._id ? (
                                <span className="text-xxs text-gray-400">…</span>
                              ) : (
                                <ApolloIcon name="check" className="h-3 w-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                              aria-label="Cancel rename"
                              disabled={savingSavedFilterTitleId !== null}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={handleCancelEditSavedFilterTitle}
                            >
                              <ApolloIcon name="cross" className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="min-w-0 flex-1 px-1.5 py-1 text-left transition-colors disabled:opacity-50"
                              title="Click to load into the editor. Double-click the title to rename."
                              onClick={() => {
                                if (editingSavedFilterId !== null) return;
                                if (savedFilterRowClickTimerRef.current) {
                                  clearTimeout(savedFilterRowClickTimerRef.current);
                                }
                                savedFilterRowClickTimerRef.current = setTimeout(() => {
                                  savedFilterRowClickTimerRef.current = null;
                                  applyPresetToRules(preset);
                                }, 280);
                              }}
                              onDoubleClick={(e) => {
                                if (editingSavedFilterId !== null) return;
                                if (
                                  deletingSavedFilterId !== null ||
                                  savingSavedFilterTitleId !== null ||
                                  savedFilterPutSaving
                                ) {
                                  return;
                                }
                                e.preventDefault();
                                e.stopPropagation();
                                if (savedFilterRowClickTimerRef.current) {
                                  clearTimeout(savedFilterRowClickTimerRef.current);
                                  savedFilterRowClickTimerRef.current = null;
                                }
                                handleStartEditSavedFilterTitle(e, preset);
                              }}
                              disabled={editingSavedFilterId !== null}
                            >
                              <span className="block text-sm leading-tight font-medium text-gray-900">
                                {preset.title}
                              </span>
                              {preset.description ? (
                                <span className="mt-0 line-clamp-1 text-xxs leading-tight text-gray-500">
                                  {preset.description}
                                </span>
                              ) : null}
                            </button>
                            <button
                              type="button"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-sky-50 hover:text-sky-700 disabled:opacity-40"
                              aria-label={`Edit rules for ${preset.title}`}
                              title='Edit filter rules in the builder, then use "Update saved" to sync'
                              disabled={
                                deletingSavedFilterId !== null ||
                                savingSavedFilterTitleId !== null ||
                                savedFilterPutSaving
                              }
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => beginEditSavedFilterDomain(e, preset)}
                            >
                              <ApolloIcon name="pen" className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                              aria-label={`Delete saved filter ${preset.title}`}
                              disabled={
                                deletingSavedFilterId !== null ||
                                savingSavedFilterTitleId !== null ||
                                savedFilterPutSaving
                              }
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                void handleDeleteSavedFilter(e, preset);
                              }}
                            >
                              {deletingSavedFilterId === preset._id ? (
                                <span className="text-xxs text-gray-400">…</span>
                              ) : (
                                <ApolloIcon name="trash" className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
            <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50/40 px-2 py-1.5">
              <Button variant="secondary" size="sm" onClick={() => setLoadSavedFiltersOpen(false)}>
                Close
              </Button>
            </div>
          </div>,
          document.body
        )}
      {saveFiltersPanelOpen &&
        savePanelRect &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={saveFiltersPanelRef}
            data-save-filter-panel
            className="fixed rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
            style={{
              top: savePanelRect.top,
              left: savePanelRect.left,
              width: savePanelRect.width,
              transform: savePanelRect.transform,
              // Above FiltersDropdown (z-50) and in line with other app overlays (Popover, etc.)
              zIndex: 100010,
            }}
            role="dialog"
            aria-label="Save new filter preset"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-gray-900">Save as new preset</h3>
            <p className="mt-0.5 text-xs leading-snug text-gray-600">
              Syncs to your account; if the request fails, only this browser keeps it.
            </p>
            <div className="mt-2.5">
              <div className="mb-1 text-xs font-medium text-gray-700">Preset name</div>
              <Input
                value={saveFilterTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSaveFilterTitle(e.target.value);
                  if (saveFilterTitleError) setSaveFilterTitleError(null);
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void confirmSaveFilters();
                  }
                }}
                placeholder="e.g. Hot leads – Berlin"
                size="sm"
              />
              {saveFilterTitleError && (
                <div className="mt-1 text-xs text-red-500">{saveFilterTitleError}</div>
              )}
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <Button
                variant="secondary"
                size="xs"
                onClick={() => {
                  setSaveFiltersPanelOpen(false);
                  setSaveFilterTitle('');
                  setSaveFilterTitleError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                size="xs"
                onClick={() => {
                  void confirmSaveFilters();
                }}
              >
                Save preset
              </Button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

function CreatableMultiSelect({
  commonProps,
  onAddValue,
}: {
  commonProps: any;
  onAddValue: (inputValue: string) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  return (
    <Select
      {...(commonProps as any)}
      componentAs={CreatableSelect}
      options={[]}
      inputValue={inputValue}
      onInputChange={(val: string, meta: any) => {
        if (meta.action !== 'input-blur' && meta.action !== 'menu-close') {
          setInputValue(val);
        }
      }}
      formatCreateLabel={(input: string) => `Add "${input}"`}
      createOptionPosition="first"
      onCreateOption={(input: string) => {
        onAddValue(input);
        setInputValue('');
      }}
    />
  );
}

export default CustomFilterOption;
