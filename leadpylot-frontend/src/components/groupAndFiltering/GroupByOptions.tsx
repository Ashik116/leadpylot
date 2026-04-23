'use client';
import { DraggableDropdown } from '@/components/shared/DraggableDropdown';
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import {
  apiCreateSavedFilter,
  apiDeleteSavedFilter,
  apiListSavedFiltersByPage,
  apiUpdateSavedFilter,
} from '@/services/SavedFiltersService';
import { useMetadataOptions } from '@/services/hooks/useLeads';
import { useCentralizedFilters } from '@/hooks/useCentralizedFilters';
import { useFilterChainStore } from '@/stores/filterChainStore';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import { useFilterContext } from '@/contexts/FilterContext';
import GroupByFilterShimmer from '@/components/shared/loaders/GroupByFilterShimmer';
import { FilterRule } from '@/stores/filterChainStore';
import { usePathname } from 'next/navigation';
import { hasRole } from '@/services/AuthService';
import { Role } from '@/configs/navigation.config/auth.route.config';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import type { SavedFilter } from '@/types/savedFilter.types';
import { isSavedFilterGroupingPreset } from '@/types/savedFilter.types';
import {
  GROUP_BY_SAVE_BUTTON_TOOLTIP,
  GROUP_BY_SAVED_VIEWS_TOOLTIP,
  TOOLTIP_POPOVER_CLASS,
} from '@/utils/toltip.constants';
import {
  isCloseProjectsLeadsBankPath,
  METADATA_OPTIONS_ENTITY_CLOSED_LEADS,
} from '@/utils/closeProjectUtils';

// Default visible options for Lead entity: Project, Agent, Status, Stage, Source, Lead Date
// These map to field names: team_id (project), user_id (agent), status_id, stage_id, source_id, lead_date
const DEFAULT_VISIBLE_OPTIONS_LEAD = [
  'team_id', // project
  'user_id', // agent
  'stage_id',
  'status_id',
  'source_id',
  'lead_date',
  'createdAt',
  'assigned_date',
  // status

  // stage

  // lead_date
];

// Default visible options for Offer entity: Agent, Bank, Last Updated, Offer Type, Project, Status
// These map to field names: agent_id, bank_id, updated_at, offerType, project_id, status
const DEFAULT_VISIBLE_OPTIONS_OFFER = [
  'project_id',
  'agent_id', // Agent
  'lead_id.stage_id',
  'status',
  'current_stage',
  'lead_id.lead_date',
  'createdAt',
  //   'scheduled_date',
];

// Default visible options for User entity: Create Date, Role, Unmask, Last Updated
// These map to field names: create_date, role, unmask, updatedAt
const DEFAULT_VISIBLE_OPTIONS_USER = [
  'create_date', // Create Date
  'role', // Role
  'unmask', // Unmask
  'updatedAt', // Last Updated
];

// Default visible options for Team (Project) entity
// These map to field names for project grouping
const DEFAULT_VISIBLE_OPTIONS_TEAM = [
  'voipserver_id', // VoIP Server
  'mailserver_id', // Mail Server
  'active', // Active status
  'createdAt', // Created date
  'updatedAt', // Last Updated
];

// Default visible options for Bank entity
// These map to field names for bank grouping
const DEFAULT_VISIBLE_OPTIONS_BANK = [
  'account', // Account
  'account_number', // Account Number
  'address', // Address
  'code', // Code
  'commission_percentage', // Commission Percentage
  'country', // Country
  'email', // Email
  'iban', // Iban
];

// Default visible options for CashflowEntry entity
const DEFAULT_VISIBLE_OPTIONS_CASHFLOW_ENTRY = [
  'status', // Status
  'current_bank_id', // Current Bank
  'initial_bank_id', // Initial Bank
  'offer_id.project_id', // Project
  'offer_id.agent_id', // Agent
  'createdAt', // Created Date
];

// Default visible options for Reclamation entity (same order as leads: Project, Agent, Stage, Status, Source, Lead Date, Created Date, Last Updated)
const DEFAULT_VISIBLE_OPTIONS_RECLAMATION = [
  'project_id', // Project
  'agent_id', // Agent
  'lead_id.stage_id', // Stage (Lead's Stage)
  'status', // Status
  'lead_id.source_id', // Source (Lead's Source)
  'lead_id.lead_date', // Lead Date
  'createdAt', // Created Date
  'updatedAt', // Last Updated
];

// Default visible options for CashflowTransaction entity
const DEFAULT_VISIBLE_OPTIONS_CASHFLOW_TRANSACTION = [
  'direction', // Direction (incoming/outgoing)
  'transaction_type', // Type (deposit/transfer/bounce/refund)
  'status', // Status (sent/received)
  'bank_id', // Bank
  'counterparty_bank_id', // Counterparty Bank
  'created_at', // Created Date
];

interface GroupByOptionsProps {
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
  // Hide specific group by options
  hideProjectOption?: boolean;
  // New props for external edit mode control
  isEditMode?: boolean;
  onExitEditMode?: () => void;
  /** @deprecated Use useFilterContext() instead */
  buildApiFilters?: () => FilterRule[];
  // External state management props - when provided, use these instead of global store
  // This enables table-scoped state for multi-table pages
  selectedGroupByArray?: string[];
  onGroupByArrayChange?: (groupBy: string[]) => void;
}

export default function GroupByOptions({
  entityType = 'Lead',
  hideProjectOption = false,
  isEditMode = false,
  onExitEditMode,
  buildApiFilters: buildApiFiltersProp,
  selectedGroupByArray,
  onGroupByArrayChange,
}: GroupByOptionsProps) {
  const { buildApiFilters: buildApiFiltersFromContext } = useFilterContext();
  const buildApiFilters = buildApiFiltersProp ?? buildApiFiltersFromContext;
  const pathname = usePathname();

  // Universal grouping filter store (used as fallback when external props not provided)
  const {
    groupBy: storeGroupBy,
    setGroupBy: setStoreGroupBy,
    setEntityType,
    setBuildDefaultFilters,
    entityType: storeEntityType,
  } = useUniversalGroupingFilterStore();

  // Determine if we're using external state management (multi-table mode)
  // When external props are provided, use them instead of global store
  const isExternallyControlled =
    selectedGroupByArray !== undefined && onGroupByArrayChange !== undefined;

  // Use external state when provided, otherwise fallback to store
  const groupBy = isExternallyControlled ? selectedGroupByArray : storeGroupBy;
  const setGroupBy = isExternallyControlled ? onGroupByArrayChange : setStoreGroupBy;

  // Determine entity type:
  // - When externally controlled (multi-table mode), use the prop directly
  // - Otherwise, check pathname first, then store, then prop
  const effectiveEntityType = useMemo(() => {
    // CRITICAL: When externally controlled, use the entityType prop directly
    // This prevents one table's entity type from affecting another table
    if (isExternallyControlled) {
      return entityType;
    }

    if (isCloseProjectsLeadsBankPath(pathname)) {
      return 'Lead';
    }

    // Check pathname first to handle special pages correctly
    if (pathname?.includes('/admin/banks')) {
      return 'Bank';
    }
    if (pathname?.includes('/admin/users')) {
      return 'User';
    }
    // For project list pages, use "Team" (projects are represented as Team entity type)
    if (
      pathname?.includes('/dashboards/projects') &&
      !pathname?.match(/^\/dashboards\/projects\/[a-f0-9]{24}$/i)
    ) {
      return 'Team';
    }
    // For project details page (viewing leads within a project), use "Lead"
    // Pattern: /dashboards/projects/[id] where [id] is a MongoDB ObjectId (24 hex chars)
    if (pathname?.match(/^\/dashboards\/projects\/[a-f0-9]{24}$/i)) {
      return 'Lead';
    }
    // Then use store if available
    if (storeEntityType) {
      return storeEntityType;
    }
    // Finally fall back to prop
    return entityType;
  }, [pathname, storeEntityType, entityType, isExternallyControlled]);

  // Debug: capture where this instance is used and what entityType it is wired to
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('🔎 [GroupByOptions] mount', {
      entityType,
      storeEntityType,
      effectiveEntityType,
      hideProjectOption,
      isEditMode,
    });
  }, [entityType, storeEntityType, effectiveEntityType, hideProjectOption, isEditMode]);

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

  // Get metadata options for the entity type - use metadataEntityType (always "Offer" for UnifiedDashboard pages)
  const {
    data: metadataOptions,
    isLoading,
    error: fieldsError,
  } = useMetadataOptions(metadataEntityType);

  // Set entity type in store (only if NOT externally controlled and prop is provided and different from store)
  // When externally controlled, we don't want to modify the global store
  useEffect(() => {
    if (!isExternallyControlled && entityType && entityType !== storeEntityType) {
      setEntityType(entityType);
    }
  }, [entityType, storeEntityType, setEntityType, isExternallyControlled]);

  // Set build default filters function in store
  // This ensures default filters are converted to domain format (array of arrays)
  // Only do this when NOT externally controlled
  useEffect(() => {
    if (!isExternallyControlled && buildApiFilters) {
      setBuildDefaultFilters(buildApiFilters);
    }
  }, [buildApiFilters, setBuildDefaultFilters, isExternallyControlled]);

  // Use centralized filter logic
  const { isAgent } = useCentralizedFilters();

  // Get dynamic filters to check for mutual exclusivity
  const { dynamicFilters } = useFilterChainStore();

  const [visibleFilters, setVisibleFilters] = useState<Record<string, boolean>>({});
  const [reorderedOptions, setReorderedOptions] = useState<
    Array<{ key: string; label: string; type: string; granularities?: any[] }>
  >([]);
  const [showAllOptions, setShowAllOptions] = useState(false); // For "See more" functionality in clean view
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set()); // Track expanded options with granularities

  // Use groupBy from store as current selection
  const currentSelectedGroupBy = groupBy || [];
  const [tempSelectedGroupBy, setTempSelectedGroupBy] = useState<string[]>(currentSelectedGroupBy);

  // Track changes for edit mode
  const [hasChanges, setHasChanges] = useState(false);
  const [originalVisibleFilters, setOriginalVisibleFilters] = useState<Record<string, boolean>>({});
  const [originalReorderedOptions, setOriginalReorderedOptions] = useState<
    Array<{ key: string; label: string; type: string; granularities?: any[] }>
  >([]);

  // Add key to force DraggableDropdown re-mount when resetting
  const [resetKey, setResetKey] = useState(0);

  // Use ref to track if we're updating from handleTempGroupBySelect to prevent infinite loops
  // This prevents the useEffect from syncing when we're the ones updating the store
  const isInternalUpdateRef = useRef<boolean>(false);
  const lastSyncedStoreValueRef = useRef<string>('');

  // Sync temp selection with store when it changes externally
  // This ensures UI reflects store state (e.g., when store is updated from another component)
  // CRITICAL: Skip sync if we're the ones updating (isInternalUpdateRef) to prevent infinite loops
  useEffect(() => {
    // Skip if we're currently doing an internal update
    if (isInternalUpdateRef.current) {
      return;
    }

    const storeGroupByArray = groupBy || [];
    const storeGroupByStr = JSON.stringify(storeGroupByArray);
    const tempGroupByStr = JSON.stringify(tempSelectedGroupBy);

    // Only sync if:
    // 1. Store value is different from temp state
    // 2. Store value actually changed (not just a re-render with same value)
    if (storeGroupByStr !== tempGroupByStr && storeGroupByStr !== lastSyncedStoreValueRef.current) {
      lastSyncedStoreValueRef.current = storeGroupByStr;
      setTempSelectedGroupBy(storeGroupByArray);
    } else if (storeGroupByStr === lastSyncedStoreValueRef.current) {
      // Store value hasn't changed, just update the ref to track it
      // This prevents unnecessary updates on re-renders
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy]);

  // Get grouping options from metadata - use groupOptions array directly
  // The API provides a separate groupOptions array with all available grouping fields
  // We should use ALL options from groupOptions regardless of ref value or field type
  const groupingOptions = useMemo(() => {
    if (!metadataOptions?.groupOptions) return [];

    // Use all groupOptions directly without filtering
    // The API already filters which fields are groupable, so we trust that
    return metadataOptions.groupOptions.map((option) => ({
      key: option.field,
      label: option.label,
      type: option.type,
      granularities: option.granularities, // Include granularities if present
      baseField: option.baseField, // Include baseField for date fields
    }));
  }, [metadataOptions]);

  // Get default visible options based on entity type
  const getDefaultVisibleOptions = useMemo(() => {
    // Use metadataEntityType to determine defaults (always "Offer" for UnifiedDashboard pages)
    if (metadataEntityType === 'Offer') {
      return DEFAULT_VISIBLE_OPTIONS_OFFER;
    }
    if (metadataEntityType === 'User') {
      return DEFAULT_VISIBLE_OPTIONS_USER;
    }
    if (metadataEntityType === 'Team') {
      return DEFAULT_VISIBLE_OPTIONS_TEAM;
    }
    if (metadataEntityType === 'Bank') {
      return DEFAULT_VISIBLE_OPTIONS_BANK;
    }
    if (metadataEntityType === 'CashflowEntry') {
      return DEFAULT_VISIBLE_OPTIONS_CASHFLOW_ENTRY;
    }
    if (metadataEntityType === 'CashflowTransaction') {
      return DEFAULT_VISIBLE_OPTIONS_CASHFLOW_TRANSACTION;
    }
    if (metadataEntityType === 'Reclamation') {
      return DEFAULT_VISIBLE_OPTIONS_RECLAMATION;
    }
    // Default to Lead options for Lead entity
    return DEFAULT_VISIBLE_OPTIONS_LEAD;
  }, [metadataEntityType]);

  // Load filter visibility from localStorage on mount and initialize reordered options
  useEffect(() => {
    try {
      // Use effectiveEntityType for localStorage key to ensure correct entity type is used
      const storageKey = `filter-visibility-groupBy-${effectiveEntityType}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setVisibleFilters(parsed);
        setOriginalVisibleFilters(parsed);
      } else {
        // Set only default visible options to true, others to false
        const defaultVisibility = groupingOptions.reduce(
          (acc, option) => {
            // Only show default options by default (based on entity type)
            acc[option.key] = getDefaultVisibleOptions.includes(option.key);
            return acc;
          },
          {} as Record<string, boolean>
        );
        setVisibleFilters(defaultVisibility);
        setOriginalVisibleFilters(defaultVisibility);
      }
    } catch {
      // Set only default visible options to true, others to false if localStorage fails
      const defaultVisibility = groupingOptions.reduce(
        (acc, option) => {
          acc[option.key] = getDefaultVisibleOptions.includes(option.key);
          return acc;
        },
        {} as Record<string, boolean>
      );
      setVisibleFilters(defaultVisibility);
      setOriginalVisibleFilters(defaultVisibility);
    }

    // Initialize reordered options with stored order or original data
    if (groupingOptions.length > 0) {
      try {
        // Use effectiveEntityType for localStorage key to ensure correct entity type is used
        const storedOrder = localStorage.getItem(`filter-order-groupBy-${effectiveEntityType}`);
        if (storedOrder) {
          const order = JSON.parse(storedOrder) as string[];
          // Reorder the data based on stored order
          const reordered = [...groupingOptions];
          reordered.sort((a, b) => {
            const aIndex = order.indexOf(a.key);
            const bIndex = order.indexOf(b.key);

            if (aIndex !== -1 && bIndex !== -1) {
              return aIndex - bIndex;
            }
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return 0;
          });
          setReorderedOptions(reordered);
          setOriginalReorderedOptions(reordered);
        } else {
          // For Reclamation (and Lead), use default visible options order so leads-like options appear first
          const defaultOrder = getDefaultVisibleOptions;
          const reordered = [...groupingOptions];
          if (defaultOrder.length > 0) {
            reordered.sort((a, b) => {
              const aIndex = defaultOrder.indexOf(a.key);
              const bIndex = defaultOrder.indexOf(b.key);
              if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
              if (aIndex !== -1) return -1;
              if (bIndex !== -1) return 1;
              return 0;
            });
          }
          setReorderedOptions(reordered);
          setOriginalReorderedOptions(reordered);
        }
      } catch {
        setReorderedOptions(groupingOptions);
        setOriginalReorderedOptions(groupingOptions);
      }
    }
  }, [groupingOptions, effectiveEntityType, getDefaultVisibleOptions]);

  // Check for changes when edit mode is active
  useEffect(() => {
    if (isEditMode) {
      const visibilityChanged =
        JSON.stringify(visibleFilters) !== JSON.stringify(originalVisibleFilters);
      const orderChanged =
        JSON.stringify(reorderedOptions) !== JSON.stringify(originalReorderedOptions);
      setHasChanges(visibilityChanged || orderChanged);
    }
  }, [
    isEditMode,
    visibleFilters,
    originalVisibleFilters,
    reorderedOptions,
    originalReorderedOptions,
  ]);

  // Function to handle group by selection (auto-applies immediately)
  const handleTempGroupBySelect = (groupByField: string) => {
    // In edit mode, don't allow filter selection
    if (isEditMode) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log('🔵 [GroupByOptions] handleTempGroupBySelect called:', {
      groupByField,
      currentTempSelection: tempSelectedGroupBy,
      currentStoreGroupBy: groupBy,
    });

    const isCurrentlySelected = tempSelectedGroupBy.includes(groupByField);
    let newSelectedGroupBy: string[];

    if (isCurrentlySelected) {
      // Removed: For Agents, prevent unselecting the Status field - Agents can now freely select/unselect Status
      // Remove if already selected
      newSelectedGroupBy = tempSelectedGroupBy.filter((item) => item !== groupByField);
      // eslint-disable-next-line no-console
      console.log('🔴 [GroupByOptions] Removing field, newSelectedGroupBy:', newSelectedGroupBy);
    } else {
      // Add if not selected, but check limit
      if (tempSelectedGroupBy.length >= 5) {
        toast.push(
          <Notification title="Grouping Limit Reached" type="warning">
            Maximum 5 grouping levels allowed.
          </Notification>
        );
        return;
      }

      // Check for mutual exclusivity: "Last Transfer" and "Agent" cannot be selected together
      // Also check if dynamic filters contain conflicting fields
      const hasAgentInDynamicFilters = dynamicFilters.some((filter) => filter.field === 'agent');
      const hasLastTransferInDynamicFilters = dynamicFilters.some(
        (filter) => filter.field === 'last_transfer'
      );

      // Map field names for mutual exclusivity check
      const isLastTransfer =
        groupByField === 'last_transfer' || groupByField === 'last_transfer_id';
      const isAgent = groupByField === 'user_id' || groupByField === 'agent_id';
      const hasAgentSelected =
        tempSelectedGroupBy.includes('user_id') || tempSelectedGroupBy.includes('agent_id');
      const hasLastTransferSelected =
        tempSelectedGroupBy.includes('last_transfer') ||
        tempSelectedGroupBy.includes('last_transfer_id');

      // Transfer Lead (transferred_lead) vs Lead Transfer granularities (lead_transfer:day/week/month/year) — mutually exclusive
      const isTransferredLead = groupByField === 'transferred_lead';
      const isLeadTransferFamily =
        groupByField === 'lead_transfer' || groupByField.startsWith('lead_transfer:');
      const hasTransferredLeadSelected = tempSelectedGroupBy.includes('transferred_lead');
      const hasLeadTransferFamilySelected = tempSelectedGroupBy.some(
        (item) => item === 'lead_transfer' || item.startsWith('lead_transfer:')
      );

      if (isLastTransfer && (hasAgentSelected || hasAgentInDynamicFilters)) {
        // If trying to select "Last Transfer" but "Agent" is already selected in group by or dynamic filters, remove "Agent" first
        newSelectedGroupBy = tempSelectedGroupBy.filter(
          (item) => item !== 'user_id' && item !== 'agent_id'
        );
        newSelectedGroupBy = [...newSelectedGroupBy, groupByField];
        // eslint-disable-next-line no-console
        console.log(
          '🟡 [GroupByOptions] Mutual exclusivity: removed Agent, newSelectedGroupBy:',
          newSelectedGroupBy
        );
      } else if (isAgent && (hasLastTransferSelected || hasLastTransferInDynamicFilters)) {
        // If trying to select "Agent" but "Last Transfer" is already selected in group by or dynamic filters, remove "Last Transfer" first
        newSelectedGroupBy = tempSelectedGroupBy.filter(
          (item) => item !== 'last_transfer' && item !== 'last_transfer_id'
        );
        newSelectedGroupBy = [...newSelectedGroupBy, groupByField];
        // eslint-disable-next-line no-console
        console.log(
          '🟡 [GroupByOptions] Mutual exclusivity: removed Last Transfer, newSelectedGroupBy:',
          newSelectedGroupBy
        );
      } else if (isTransferredLead && hasLeadTransferFamilySelected) {
        newSelectedGroupBy = tempSelectedGroupBy.filter(
          (item) => !(item === 'lead_transfer' || item.startsWith('lead_transfer:'))
        );
        newSelectedGroupBy = [...newSelectedGroupBy, groupByField];
        // eslint-disable-next-line no-console
        console.log(
          '🟡 [GroupByOptions] Mutual exclusivity: removed Lead Transfer granularities, newSelectedGroupBy:',
          newSelectedGroupBy
        );
      } else if (isLeadTransferFamily && hasTransferredLeadSelected) {
        newSelectedGroupBy = tempSelectedGroupBy.filter((item) => item !== 'transferred_lead');
        newSelectedGroupBy = [...newSelectedGroupBy, groupByField];
        // eslint-disable-next-line no-console
        console.log(
          '🟡 [GroupByOptions] Mutual exclusivity: removed Transfer Lead, newSelectedGroupBy:',
          newSelectedGroupBy
        );
      } else {
        newSelectedGroupBy = [...tempSelectedGroupBy, groupByField];
        // eslint-disable-next-line no-console
        console.log('🟢 [GroupByOptions] Adding field, newSelectedGroupBy:', newSelectedGroupBy);
      }
    }

    // Auto-apply the selection immediately
    // Removed: For Agents, automatically include 'status_id' field - Agents can now freely choose grouping options
    const finalSelection = [...newSelectedGroupBy];

    // Mark that we're doing an internal update to prevent the useEffect from syncing back
    isInternalUpdateRef.current = true;
    lastSyncedStoreValueRef.current = JSON.stringify(finalSelection);

    // Update temporary selection to match finalSelection
    setTempSelectedGroupBy(finalSelection);
    // eslint-disable-next-line no-console
    console.log('📝 [GroupByOptions] Updated tempSelectedGroupBy state:', finalSelection);

    // Update store
    setGroupBy(finalSelection);

    // Reset the flag after a brief delay to allow the store update to complete
    // This ensures the useEffect won't try to sync when we're the ones updating
    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 0);

    // eslint-disable-next-line no-console
    console.log('🎯 [GroupByOptions] setGroupBy called', {
      isExternallyControlled,
      finalSelection,
    });
  };

  // Function to handle filter visibility change
  const handleFilterVisibilityChange = (key: string, isVisible: boolean) => {
    // Removed: For Agents, prevent hiding the Status field - Agents can now freely hide/show Status field
    setVisibleFilters((prev) => ({ ...prev, [key]: isVisible }));
  };

  // Function to handle order changes from DraggableDropdown
  const handleOrderChange = (orderedFilters: any[]) => {
    // Create a map of the new order from orderedFilters
    const newOrder = orderedFilters.map((filter) => filter.key);

    // Reorder the existing reorderedOptions based on the new order
    // This preserves all options and their properties, just reorders them
    const reordered = [...reorderedOptions];
    reordered.sort((a, b) => {
      const aIndex = newOrder.indexOf(a.key);
      const bIndex = newOrder.indexOf(b.key);

      // If both are in the new order, sort by position in new order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only one is in the new order, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      // If neither is in the new order, maintain original position
      return 0;
    });

    setReorderedOptions(reordered);
  };

  // Function to handle cancel button - reset to true defaults
  const handleCancel = () => {
    // Clear localStorage to reset DraggableDropdown state
    // Use effectiveEntityType for localStorage key to ensure correct entity type is used
    localStorage.removeItem(`filter-visibility-groupBy-${effectiveEntityType}`);
    localStorage.removeItem(`filter-order-groupBy-${effectiveEntityType}`);

    // Reset to true defaults (not the stored values)
    // Only show default visible options, others should be false
    const defaultVisibility = groupingOptions.reduce(
      (acc, option) => {
        // Only show default options by default (based on entity type)
        acc[option.key] = getDefaultVisibleOptions.includes(option.key);
        return acc;
      },
      {} as Record<string, boolean>
    );

    // Reset to original groupingOptions order (not stored order)
    const defaultReorderedOptions = [...groupingOptions];

    // Update state with true defaults
    setVisibleFilters(defaultVisibility);
    setReorderedOptions(defaultReorderedOptions);

    // Update original values to match true defaults
    setOriginalVisibleFilters(defaultVisibility);
    setOriginalReorderedOptions(defaultReorderedOptions);

    // Reset showAllOptions to false
    setShowAllOptions(false);

    setHasChanges(false);
    setResetKey((prev) => prev + 1); // Force re-mount
  };

  // Function to handle update button
  const handleUpdate = () => {
    try {
      // Save visibility changes
      // Use effectiveEntityType for localStorage key to ensure correct entity type is used
      localStorage.setItem(
        `filter-visibility-groupBy-${effectiveEntityType}`,
        JSON.stringify(visibleFilters)
      );

      // Save order changes
      const order = reorderedOptions.map((option) => option.key);
      localStorage.setItem(`filter-order-groupBy-${effectiveEntityType}`, JSON.stringify(order));

      // Update original values
      setOriginalVisibleFilters(visibleFilters);
      setOriginalReorderedOptions(reorderedOptions);
      setHasChanges(false);

      // Reload reorderedOptions from localStorage to ensure clean view reflects the new order
      // This ensures that when user exits edit mode, the first 5 visible options show the reordered top items
      if (groupingOptions.length > 0) {
        const reordered = [...groupingOptions];
        reordered.sort((a, b) => {
          const aIndex = order.indexOf(a.key);
          const bIndex = order.indexOf(b.key);

          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return 0;
        });
        setReorderedOptions(reordered);
      }
    } catch {
      // Failed to save filter changes
    }

    // Exit edit mode
    if (onExitEditMode) {
      onExitEditMode();
    }
  };

  // Convert group options to the format expected by DraggableDropdown
  // This returns ALL options from the backend (from groupingOptions), regardless of visibility
  const getDraggableFilters = () => {
    // Filter out 'status_id' option for Agents only (keep all other options including team_id)
    let filteredOptions = reorderedOptions;

    if (isAgent) {
      filteredOptions = filteredOptions.filter((option) => option.key !== 'status_id');
    }

    // Removed hideProjectOption restriction - team_id is now always available
    // Return ALL options from backend - the count can be any number (48, 30, 50, etc.)
    return (
      filteredOptions.map((option) => {
        // Explicitly check if the option is visible
        // If not in visibleFilters yet, use default visibility based on entity type
        const isVisible =
          visibleFilters[option.key] !== undefined
            ? visibleFilters[option.key] === true
            : getDefaultVisibleOptions.includes(option.key);

        return {
          key: option.key,
          label: option.label,
          value: option.key,
          isVisible,
          granularities: option.granularities, // Include granularities for DraggableDropdown
        };
      }) || []
    );
  };

  // Get visible filters for clean view (non-edit mode)
  const getVisibleFilters = () => {
    // Filter out 'status_id' option for Agents only (keep all other options including team_id)
    let filteredOptions = reorderedOptions;

    if (hasRole(Role.AGENT)) {
      filteredOptions = filteredOptions.filter((option) => option.key !== 'status_id');
    }

    // Removed hideProjectOption restriction - team_id is now always available

    return filteredOptions
      .map((option) => {
        // Use same visibility check as getDraggableFilters for consistency
        const isVisible =
          visibleFilters[option.key] !== undefined
            ? visibleFilters[option.key] === true
            : getDefaultVisibleOptions.includes(option.key);
        return {
          key: option.key,
          label: option.label,
          value: option.key,
          isVisible,
          granularities: option.granularities, // Include granularities
        };
      })
      .filter((filter) => filter.isVisible);
  };

  // Get all filters (including hidden ones) for clean view when "See More" is clicked
  const getAllFilters = () => {
    // Filter out 'status_id' option for Agents only (keep all other options including team_id)
    let filteredOptions = reorderedOptions;

    if (hasRole(Role.AGENT)) {
      filteredOptions = filteredOptions.filter((option) => option.key !== 'status_id');
    }

    // Return ALL options with consistent visibility check
    return filteredOptions.map((option) => {
      const isVisible =
        visibleFilters[option.key] !== undefined
          ? visibleFilters[option.key] === true
          : getDefaultVisibleOptions.includes(option.key);
      return {
        key: option.key,
        label: option.label,
        value: option.key,
        isVisible,
        granularities: option.granularities, // Include granularities
      };
    });
  };

  if (isLoading) {
    return <GroupByFilterShimmer />;
  }

  if (fieldsError) {
    return <div className="text-red-500">Failed to load group options</div>;
  }

  // Clean view (non-edit mode)
  if (!isEditMode) {
    const visibleFiltersList = getVisibleFilters();
    const allFiltersList = getAllFilters();

    // Sort filters to always show selected options first (top priority), then default options in order
    const sortSelectedFirst = (filters: typeof allFiltersList) => {
      // Separate into: selected, default visible (not selected), and other visible
      const selectedFilters = filters.filter((f) =>
        tempSelectedGroupBy.includes(f.value as string)
      );
      const defaultVisibleFilters = filters.filter(
        (f) =>
          !tempSelectedGroupBy.includes(f.value as string) &&
          getDefaultVisibleOptions.includes(f.value as string)
      );
      const otherVisibleFilters = filters.filter(
        (f) =>
          !tempSelectedGroupBy.includes(f.value as string) &&
          !getDefaultVisibleOptions.includes(f.value as string)
      );

      // Sort selected filters by their selection order
      selectedFilters.sort((a, b) => {
        const aIndex = tempSelectedGroupBy.indexOf(a.value as string);
        const bIndex = tempSelectedGroupBy.indexOf(b.value as string);
        return aIndex - bIndex;
      });

      // Sort default visible filters by their order in DEFAULT_VISIBLE_OPTIONS array
      defaultVisibleFilters.sort((a, b) => {
        const aIndex = getDefaultVisibleOptions.indexOf(a.value as string);
        const bIndex = getDefaultVisibleOptions.indexOf(b.value as string);
        return aIndex - bIndex;
      });

      // Return: selected first, then default visible (in order), then other visible
      return [...selectedFilters, ...defaultVisibleFilters, ...otherVisibleFilters];
    };

    // Show first 15 visible options by default, or ALL options (including hidden) if showAllOptions is true
    // Always sort selected options first in both views
    const sortedVisibleFilters = sortSelectedFirst(visibleFiltersList);
    const sortedAllFilters = sortSelectedFirst(allFiltersList);
    const DEFAULT_VISIBLE_COUNT = 15;
    const displayedFilters = showAllOptions
      ? sortedAllFilters
      : sortedVisibleFilters.slice(0, DEFAULT_VISIBLE_COUNT);
    const hasMoreOptions = allFiltersList.length > DEFAULT_VISIBLE_COUNT;

    // Helper function to check if any granularity child is selected
    const hasSelectedGranularity = (granularities: any[]) => {
      if (!granularities) return false;
      return granularities.some((gran) => tempSelectedGroupBy.includes(gran.field));
    };

    // Helper function to render a filter option (parent or child)
    const renderFilterOption = (filter: any, isChild: boolean = false) => {
      const isSelected = tempSelectedGroupBy.includes(filter.value as string);
      const hasAgentInDynamicFilters = dynamicFilters.some((f) => f.field === 'agent');
      const hasLastTransferInDynamicFilters = dynamicFilters.some(
        (f) => f.field === 'last_transfer'
      );

      const isLastTransfer =
        filter.value === 'last_transfer' || filter.value === 'last_transfer_id';
      const isAgentField = filter.value === 'user_id' || filter.value === 'agent_id';
      const isTransferredLeadField = filter.value === 'transferred_lead';
      const isLeadTransferFamilyField =
        filter.value === 'lead_transfer' ||
        (typeof filter.value === 'string' && filter.value.startsWith('lead_transfer:'));
      const hasAgentSelected =
        tempSelectedGroupBy.includes('user_id') || tempSelectedGroupBy.includes('agent_id');
      const hasLastTransferSelected =
        tempSelectedGroupBy.includes('last_transfer') ||
        tempSelectedGroupBy.includes('last_transfer_id');
      const hasTransferredLeadSelected = tempSelectedGroupBy.includes('transferred_lead');
      const hasLeadTransferFamilySelected = tempSelectedGroupBy.some(
        (item) => item === 'lead_transfer' || item.startsWith('lead_transfer:')
      );

      const isDisabled =
        (hasRole(Role.AGENT) && filter.value === 'status_id' && isSelected) ||
        (isLastTransfer && (hasAgentSelected || hasAgentInDynamicFilters)) ||
        (isAgentField && (hasLastTransferSelected || hasLastTransferInDynamicFilters)) ||
        (isTransferredLeadField && hasLeadTransferFamilySelected) ||
        (isLeadTransferFamilyField && hasTransferredLeadSelected);

      return (
        <button
          key={filter.key}
          onClick={(e) => {
            e.stopPropagation();
            handleTempGroupBySelect(filter.value as string);
          }}
          disabled={isDisabled}
          className={`w-full py-1.5 text-left text-sm transition-colors ${
            isChild ? '-ml-6 rounded-l-none rounded-r pr-3 pl-9' : 'rounded px-3'
          } ${
            isSelected
              ? 'bg-gray-50 font-medium text-gray-900'
              : isDisabled
                ? 'cursor-not-allowed text-gray-400 opacity-50'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]'
          }`}
          title={
            isDisabled && isLastTransfer && (hasAgentSelected || hasAgentInDynamicFilters)
              ? hasAgentInDynamicFilters
                ? 'Cannot select "Last Transfer" when "Agent" is selected in dynamic filters'
                : 'Cannot select "Last Transfer" when "Agent" is selected'
              : isDisabled &&
                  isAgentField &&
                  (hasLastTransferSelected || hasLastTransferInDynamicFilters)
                ? hasLastTransferInDynamicFilters
                  ? 'Cannot select "Agent" when "Last Transfer" is selected in dynamic filters'
                  : 'Cannot select "Agent" when "Last Transfer" is selected'
                : isDisabled && isTransferredLeadField && hasLeadTransferFamilySelected
                  ? 'Cannot select "Transfer Lead" while "Lead Transfer" (Day/Week/Month/Year) is grouped'
                  : isDisabled && isLeadTransferFamilyField && hasTransferredLeadSelected
                    ? 'Cannot select "Lead Transfer" while "Transfer Lead" is grouped'
                    : undefined
          }
        >
          <div className="flex items-center justify-between">
            <span className="truncate">{filter.label}</span>
            {isSelected && <ApolloIcon name="check" className="text-sm text-blue-600" />}
          </div>
        </button>
      );
    };

    return (
      <div className="w-full">
        <div className="space-y-0">
          {/* Clean filter list */}
          {displayedFilters.map((filter) => {
            const hasGranularities = filter.granularities && filter.granularities.length > 0;
            const isExpanded = expandedOptions.has(filter.key);
            const isParentSelected = tempSelectedGroupBy.includes(filter.value as string);
            const hasChildSelected =
              hasGranularities && filter.granularities
                ? hasSelectedGranularity(filter.granularities)
                : false;

            // If option has granularities, render as expandable parent
            if (hasGranularities) {
              const granularitiesArray = filter.granularities || [];
              const isLeadTransferParent =
                filter.value === 'lead_transfer' ||
                (typeof filter.value === 'string' && filter.value.startsWith('lead_transfer'));
              const hasTransferredLeadInGroup = tempSelectedGroupBy.includes('transferred_lead');
              const leadTransferDisabledByTransferLead =
                isLeadTransferParent && hasTransferredLeadInGroup;

              return (
                <div key={filter.key} className="space-y-0">
                  {/* Parent option with expand/collapse */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newExpanded = new Set(expandedOptions);
                      if (isExpanded) {
                        newExpanded.delete(filter.key);
                      } else {
                        newExpanded.add(filter.key);
                      }
                      setExpandedOptions(newExpanded);
                    }}
                    title={
                      leadTransferDisabledByTransferLead
                        ? 'Lead Transfer (Day/Week/Month/Year) cannot be used while Transfer Lead is grouped. Remove Transfer Lead first.'
                        : undefined
                    }
                    className={`w-full border-b px-3 py-2 text-left text-sm transition-colors ${
                      leadTransferDisabledByTransferLead ? 'opacity-55' : ''
                    } ${
                      isExpanded
                        ? 'bg-gray-800 font-medium text-white'
                        : isParentSelected || hasChildSelected
                          ? 'bg-gray-800 font-medium text-white'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-[var(--dm-text-primary)] dark:hover:bg-[var(--dm-bg-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{filter.label}</span>
                      <ApolloIcon
                        name={isExpanded ? 'dropdown-up-large' : 'dropdown-large'}
                        className={`text-xs ${
                          isExpanded || isParentSelected || hasChildSelected
                            ? 'text-white'
                            : 'text-gray-700'
                        }`}
                      />
                    </div>
                  </button>

                  {/* Child options (granularities) - Timeline only shows here when expanded */}
                  {isExpanded && granularitiesArray.length > 0 && (
                    <div className="relative mt-0 ml-6">
                      {/* Vertical timeline line for children */}
                      <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-gray-200" />

                      {granularitiesArray.map((granularity: any, index: number) => {
                        const isLastChild = index === granularitiesArray.length - 1;
                        // Extract just the granularity label (e.g., "Day", "Week", "Month", "Year")
                        const cleanLabel =
                          granularity.granularity || granularity.suffix
                            ? (granularity.granularity || granularity.suffix)
                                .charAt(0)
                                .toUpperCase() +
                              (granularity.granularity || granularity.suffix).slice(1)
                            : granularity.label;

                        return (
                          <div key={granularity.field} className="relative">
                            {/* Vertical line continuation (except for last child) */}
                            {!isLastChild && (
                              <div className="absolute top-6 bottom-0 left-0 w-0.5 bg-gray-200" />
                            )}

                            {/* Arrow connector - behind hover background */}
                            <div className="absolute top-1/2 left-0 z-0 flex -translate-y-1/2 items-center">
                              {/* Horizontal arrow line */}
                              {/* <div className="h-0.5 w-2 bg-gray-300" /> */}
                              {/* Arrow head */}
                              {/* <ApolloIcon
                                name="arrow-right"
                                className="ml-0 text-xs text-gray-400"
                              /> */}
                            </div>

                            {/* Child option button - extends left to cover timeline */}
                            <div className="relative ml-6">
                              {renderFilterOption(
                                {
                                  key: granularity.field,
                                  label: cleanLabel,
                                  value: granularity.field,
                                },
                                true
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Regular option without granularities - render normally without timeline
            return renderFilterOption(filter);
          })}

          {/* See More button */}
          {hasMoreOptions && (
            <button
              onClick={() => setShowAllOptions(!showAllOptions)}
              className="mt-2 flex w-full items-center justify-between rounded px-3 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <span>{showAllOptions ? 'Show Less' : 'See More'}</span>
              <ApolloIcon
                name={showAllOptions ? 'dropdown-up-large' : 'dropdown-large'}
                className="text-xs text-gray-700 transition-transform dark:text-[var(--dm-text-primary)]"
              />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Edit mode with full DraggableDropdown functionality
  return (
    <DraggableDropdown
      key={resetKey} // Add key to force re-mount
      filters={getDraggableFilters()}
      onFilterVisibilityChange={handleFilterVisibilityChange}
      onFilterSelect={(value) => handleTempGroupBySelect(value as string)}
      selectedValue={tempSelectedGroupBy.length > 0 ? tempSelectedGroupBy[0] : undefined}
      selectedValues={tempSelectedGroupBy}
      filterType="groupBy"
      className="w-full"
      onOrderChange={handleOrderChange}
      storageSuffix={effectiveEntityType} // Pass entity type to make localStorage keys entity-specific
      defaultVisibleOptions={getDefaultVisibleOptions} // Pass default visible options for reset functionality
      // Add custom footer with Cancel and Update buttons
      customFooter={
        <div className="border-t border-gray-200 p-2 dark:border-[var(--dm-border)]">
          <div className="flex justify-end gap-2">
            {hasChanges && (
              <button
                onClick={handleCancel}
                className="button border-border hover:bg-sand-5 button-press-feedback h-8 rounded-lg border bg-white px-3 text-sm text-gray-600"
              >
                Cancel
              </button>
            )}
            <button
              onClick={hasChanges ? handleUpdate : onExitEditMode}
              className={`button border-border button-press-feedback h-8 rounded-lg border px-3 text-sm ${
                hasChanges
                  ? 'bg-sunbeam-2 hover:bg-sunbeam-3 text-gray-700'
                  : 'hover:bg-sand-5 bg-white text-gray-600'
              }`}
            >
              {hasChanges ? 'Update' : 'Cancel'}
            </button>
          </div>
        </div>
      }
    />
  );
}

function groupBySequencesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export interface GroupBySavedPresetsToolbarProps {
  /** Saved-filters API `page` key (e.g. `lead`). */
  pageKey: string;
  /** Current grouping fields in order. */
  selectedGroupBy: string[];
  onApplyGroupBy: (groupBy: string[]) => void;
}

/**
 * Header actions: load / save grouping presets (`type: grouping` on POST /saved-filters).
 * Render beside the "Group By" title (e.g. from FiltersDropdown).
 */
export function GroupBySavedPresetsToolbar({
  pageKey,
  selectedGroupBy,
  onApplyGroupBy,
}: GroupBySavedPresetsToolbarProps) {
  const [loadOpen, setLoadOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [serverList, setServerList] = useState<SavedFilter[] | null>(null);
  const [loadLoading, setLoadLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [editingGroupingPresetId, setEditingGroupingPresetId] = useState<string | null>(null);
  const [editingGroupingTitle, setEditingGroupingTitle] = useState('');
  const [savingGroupingTitleId, setSavingGroupingTitleId] = useState<string | null>(null);
  const [deletingGroupingPresetId, setDeletingGroupingPresetId] = useState<string | null>(null);
  const loadAnchorRef = useRef<HTMLDivElement>(null);
  const saveAnchorRef = useRef<HTMLDivElement>(null);
  const loadPickerRef = useRef<HTMLDivElement>(null);
  const savePickerRef = useRef<HTMLDivElement>(null);
  const [loadPickerRect, setLoadPickerRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [savePickerRect, setSavePickerRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const computePickerRect = (anchor: DOMRect) => {
    const width = Math.min(280, Math.max(260, window.innerWidth - 24));
    let left = anchor.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    return { top: anchor.bottom + 6, left, width };
  };

  useLayoutEffect(() => {
    if (!loadOpen || !loadAnchorRef.current) {
      setLoadPickerRect(null);
      return;
    }
    setLoadPickerRect(computePickerRect(loadAnchorRef.current.getBoundingClientRect()));
  }, [loadOpen]);

  useLayoutEffect(() => {
    if (!saveOpen || !saveAnchorRef.current) {
      setSavePickerRect(null);
      return;
    }
    setSavePickerRect(computePickerRect(saveAnchorRef.current.getBoundingClientRect()));
  }, [saveOpen]);

  useEffect(() => {
    if (!loadOpen) return;
    let cancelled = false;
    setLoadLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const { data } = await apiListSavedFiltersByPage(pageKey, { limit: 100, type: 'grouping' });
        if (!cancelled) setServerList(data);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not load presets');
      } finally {
        if (!cancelled) setLoadLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadOpen, pageKey]);

  useEffect(() => {
    if (!loadOpen && !saveOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (loadOpen) {
        if (loadAnchorRef.current?.contains(t)) return;
        if (loadPickerRef.current?.contains(t)) return;
        setLoadOpen(false);
      }
      if (saveOpen) {
        if (saveAnchorRef.current?.contains(t)) return;
        if (savePickerRef.current?.contains(t)) return;
        setSaveOpen(false);
        setSaveTitle('');
        setSaveError(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [loadOpen, saveOpen]);

  const groupingPresets = (serverList ?? []).filter(isSavedFilterGroupingPreset);

  const handleCancelEditGroupingTitle = useCallback(() => {
    setEditingGroupingPresetId(null);
    setEditingGroupingTitle('');
  }, []);

  const handleCommitGroupingTitle = useCallback(
    async (preset: SavedFilter) => {
      const trimmed = editingGroupingTitle.trim();
      if (!trimmed) {
        toast.push(
          <Notification type="warning" title="Name required">
            Enter a title for this preset.
          </Notification>
        );
        return;
      }
      if (trimmed === preset.title) {
        handleCancelEditGroupingTitle();
        return;
      }
      const gb = preset.groupBy;
      if (!gb?.length) return;
      setSavingGroupingTitleId(preset._id);
      try {
        const updated = await apiUpdateSavedFilter(preset._id, {
          title: trimmed,
          page: preset.page,
          type: 'grouping',
          groupBy: [...gb],
        });
        setServerList((prev) =>
          prev ? prev.map((p) => (p._id === updated._id ? updated : p)) : [updated]
        );
        handleCancelEditGroupingTitle();
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
        setSavingGroupingTitleId(null);
      }
    },
    [editingGroupingTitle, handleCancelEditGroupingTitle]
  );

  const handleDeleteGroupingPreset = useCallback(
    async (e: React.MouseEvent, preset: SavedFilter) => {
      e.preventDefault();
      e.stopPropagation();
      if (deletingGroupingPresetId !== null) return;
      setDeletingGroupingPresetId(preset._id);
      try {
        await apiDeleteSavedFilter(preset._id);
        setServerList((prev) => (prev ? prev.filter((p) => p._id !== preset._id) : prev));
        if (editingGroupingPresetId === preset._id) {
          handleCancelEditGroupingTitle();
        }
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
        setDeletingGroupingPresetId(null);
      }
    },
    [deletingGroupingPresetId, editingGroupingPresetId, handleCancelEditGroupingTitle]
  );

  useEffect(() => {
    if (!loadOpen) {
      handleCancelEditGroupingTitle();
      setSavingGroupingTitleId(null);
    }
  }, [loadOpen, handleCancelEditGroupingTitle]);

  const applyPreset = (preset: SavedFilter) => {
    const gb = preset.groupBy;
    if (!gb?.length) return;
    onApplyGroupBy([...gb]);
    setLoadOpen(false);
    toast.push(
      <Notification type="success" title="Applied">
        Grouping &quot;{preset.title}&quot; loaded.
      </Notification>
    );
  };

  const confirmSaveGrouping = async () => {
    const trimmed = saveTitle.trim();
    if (!trimmed) {
      setSaveError('Enter a name for this grouping preset.');
      return;
    }
    if (selectedGroupBy.length === 0) {
      toast.push(
        <Notification type="warning" title="Nothing to save">
          Select at least one Group By field first.
        </Notification>
      );
      return;
    }
    setSaveBusy(true);
    setSaveError(null);
    try {
      let existing: SavedFilter[] | null = serverList;
      if (!existing?.length) {
        const { data } = await apiListSavedFiltersByPage(pageKey, { limit: 100, type: 'grouping' });
        existing = data;
        setServerList(data);
      }
      const duplicate = existing
        ?.filter(isSavedFilterGroupingPreset)
        .find((p) => groupBySequencesEqual(p.groupBy ?? [], selectedGroupBy));
      if (duplicate) {
        toast.push(
          <Notification type="info" title="Already saved">
            This grouping matches &quot;{duplicate.title}&quot;.
          </Notification>
        );
        setSaveOpen(false);
        setSaveTitle('');
        return;
      }
      const created = await apiCreateSavedFilter({
        title: trimmed,
        page: pageKey,
        type: 'grouping',
        groupBy: [...selectedGroupBy],
      });
      setServerList((prev) => (prev ? [...prev, created] : [created]));
      toast.push(
        <Notification type="success" title="Saved">
          Grouping preset &quot;{trimmed}&quot; was saved.
        </Notification>
      );
      setSaveOpen(false);
      setSaveTitle('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setSaveError(message);
      toast.push(
        <Notification type="danger" title="Could not save">
          {message}
        </Notification>
      );
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <div ref={loadAnchorRef} className="inline-flex">
          <Tooltip
            title={GROUP_BY_SAVED_VIEWS_TOOLTIP}
            placement="top"
            wrapperClass="inline-flex"
            className={TOOLTIP_POPOVER_CLASS}
          >
            <Button
              variant="default"
              size="xs"
              active={loadOpen}
              className="gap-0.5 px-1.5"
              onClick={() => {
                setLoadOpen((v) => !v);
                setSaveOpen(false);
              }}
              aria-expanded={loadOpen}
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
        <div ref={saveAnchorRef} className="inline-flex">
          <Tooltip
            title={GROUP_BY_SAVE_BUTTON_TOOLTIP}
            placement="top"
            wrapperClass="inline-flex"
            className={TOOLTIP_POPOVER_CLASS}
            disabled={selectedGroupBy.length === 0 || saveBusy}
          >
            <Button
              variant="secondary"
              size="xs"
              className="px-1.5"
              disabled={selectedGroupBy.length === 0 || saveBusy}
              onClick={() => {
                setSaveOpen((v) => {
                  const next = !v;
                  if (next) {
                    setLoadOpen(false);
                    setSaveTitle('');
                    setSaveError(null);
                  }
                  return next;
                });
              }}
            >
              Save
            </Button>
          </Tooltip>
        </div>
      </div>

      {loadOpen &&
        loadPickerRect &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={loadPickerRef}
            data-groupby-saved-picker
            className="fixed max-h-[min(260px,calc(100svh-48px))] overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-xl dark:bg-[var(--dm-bg-elevated)] dark:border-[var(--dm-border)]"
            style={{
              top: loadPickerRect.top,
              left: loadPickerRect.left,
              width: loadPickerRect.width,
              zIndex: 100020,
            }}
            role="dialog"
            aria-label="Saved grouping presets"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-100 px-2 py-1.5">
              <h3 className="text-xs font-semibold text-gray-900">Saved groupings</h3>
              <p className="text-xxs text-gray-500">Page: {pageKey}</p>
            </div>
            <div
              className="max-h-[min(200px,40svh)] overflow-y-auto px-1 py-1"
              aria-busy={loadLoading}
            >
              {loadLoading && (
                <ul className="space-y-0 pe-1" role="presentation">
                  {[0, 1, 2, 3].map((i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1 rounded-lg border border-transparent px-1 py-0.5"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5 px-1 py-1">
                        <Skeleton
                          className="rounded"
                          height={12}
                          width={i % 2 === 0 ? '72%' : '58%'}
                        />
                        <Skeleton className="rounded" height={10} width={i === 1 ? '90%' : '78%'} />
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5 pt-1 pe-0.5">
                        <Skeleton variant="circle" width={22} height={22} />
                        <Skeleton variant="circle" width={22} height={22} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!loadLoading && loadError && (
                <div className="px-2 py-2 text-xs text-red-600">{loadError}</div>
              )}
              {!loadLoading &&
                !loadError &&
                groupingPresets.length === 0 && (
                  <div className="px-2 py-3 text-center text-xs text-gray-500">
                    No saved groupings yet.
                  </div>
                )}
              {!loadLoading &&
                !loadError &&
                groupingPresets.length > 0 && (
                  <ul className="space-y-0 pe-1">
                    {groupingPresets.map((preset) => (
                      <li
                        key={preset._id}
                        className="group flex items-start gap-0.5 rounded-lg border border-transparent hover:border-gray-100 hover:bg-gray-50/90"
                      >
                        {editingGroupingPresetId === preset._id ? (
                          <div className="flex min-w-0 flex-1 items-center gap-1 px-1 py-1">
                            <Input
                              size="xs"
                              autoFocus
                              value={editingGroupingTitle}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setEditingGroupingTitle(e.target.value)
                              }
                              placeholder="Preset title"
                              className="min-w-0 flex-1 rounded-md! text-xs! font-medium leading-tight! h-7! min-h-0! py-0! px-2!"
                              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void handleCommitGroupingTitle(preset);
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  handleCancelEditGroupingTitle();
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                              aria-label="Save title"
                              disabled={savingGroupingTitleId !== null}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => void handleCommitGroupingTitle(preset)}
                            >
                              {savingGroupingTitleId === preset._id ? (
                                <span className="text-xxs text-gray-400">…</span>
                              ) : (
                                <ApolloIcon name="check" className="h-3 w-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                              aria-label="Cancel rename"
                              disabled={savingGroupingTitleId !== null}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={handleCancelEditGroupingTitle}
                            >
                              <ApolloIcon name="cross" className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="min-w-0 flex-1 px-1.5 py-1.5 text-left text-xs transition-colors disabled:opacity-50"
                              title="Click to apply this grouping. Use the pencil to rename."
                              onClick={() => {
                                if (editingGroupingPresetId !== null) return;
                                applyPreset(preset);
                              }}
                              disabled={editingGroupingPresetId !== null}
                            >
                              <span className="font-medium text-gray-900">{preset.title}</span>
                              <span className="mt-0.5 block line-clamp-2 font-mono text-xxs text-gray-500">
                                {(preset.groupBy ?? []).join(' → ')}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40"
                              aria-label={`Rename ${preset.title}`}
                              title="Rename preset"
                              disabled={
                                deletingGroupingPresetId !== null || savingGroupingTitleId !== null
                              }
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => {
                                setEditingGroupingPresetId(preset._id);
                                setEditingGroupingTitle(preset.title);
                              }}
                            >
                              <ApolloIcon name="pen" className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                              aria-label={`Delete ${preset.title}`}
                              title="Delete preset"
                              disabled={
                                deletingGroupingPresetId !== null || savingGroupingTitleId !== null
                              }
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => void handleDeleteGroupingPreset(e, preset)}
                            >
                              {deletingGroupingPresetId === preset._id ? (
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
          </div>,
          document.body
        )}

      {saveOpen &&
        savePickerRect &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={savePickerRef}
            data-groupby-save-picker
            className="fixed max-h-[min(320px,calc(100svh-48px))] overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-xl shadow-gray-200/50 dark:bg-[var(--dm-bg-elevated)] dark:border-[var(--dm-border)]"
            style={{
              top: savePickerRect.top,
              left: savePickerRect.left,
              width: savePickerRect.width,
              zIndex: 100020,
            }}
            role="dialog"
            aria-label="New grouping preset"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-gray-100 bg-linear-to-b from-violet-50/40 to-white px-2 py-1.5">
              <h3 className="text-xs font-semibold tracking-tight text-gray-900">New grouping preset</h3>
              <p className="text-xxs leading-tight text-gray-500">Page: {pageKey}</p>
              {selectedGroupBy.length > 0 && (
                <p className="mt-0.5 line-clamp-2 font-mono text-xxs text-gray-600">
                  {selectedGroupBy.join(' → ')}
                </p>
              )}
            </div>
            <div className="px-2 py-2">
              <Input
                size="sm"
                value={saveTitle}
                placeholder="e.g. Project → Agent → Stage"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSaveTitle(e.target.value);
                  if (saveError) setSaveError(null);
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void confirmSaveGrouping();
                  }
                }}
              />
              {saveError && <div className="mt-1.5 text-xs text-red-600">{saveError}</div>}
              <div className="mt-3 flex justify-end gap-1.5 border-t border-gray-100 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={saveBusy}
                  onClick={() => {
                    setSaveOpen(false);
                    setSaveTitle('');
                    setSaveError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="solid"
                  size="sm"
                  disabled={saveBusy}
                  onClick={() => void confirmSaveGrouping()}
                >
                  {saveBusy ? 'Saving…' : 'Save preset'}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
