'use client';

import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Next from '@/components/ui/Pagination/Next';
import Prev from '@/components/ui/Pagination/Prev';
import { useBanks } from '@/services/hooks/useSettings';
import {
  useUniversalGroupingFilterStore,
  type GroupSummary as GroupSummaryType,
} from '@/stores/universalGroupingFilterStore';
import { DEFAULT_PAGE_LIMIT } from '@/constants/pagination.constant';
import SimpleBankCard from './SimpleBankCard';
import { formatGroupNameIfDate } from '@/utils/dateFormateUtils';
import {
  isDateField,
  buildGroupDomainFilters,
  buildDefaultFiltersAsQueryParams,
  buildGroupDetailsQueryParams,
} from '@/components/groupAndFiltering/groupSummaryUtils';
import { useMetadataOptions } from '@/services/hooks/useLeads';
import { usePathname } from 'next/navigation';

interface BankGroupSummaryProps {
  group: GroupSummaryType;
  onBankClick?: (bank: any) => void;
  level?: number;
  parentPath?: Array<{ groupId: string; groupName: string; fieldName: string }>;
  groupByFields?: string[];
  search?: string | null;
  isCheckboxChecked?: (bank: any) => boolean;
  onCheckboxChange?: (checked: boolean, bank: any) => void;
  showCheckboxes?: boolean;
}

const BankGroupSummary: React.FC<BankGroupSummaryProps> = ({
  group,
  onBankClick,
  level = 0,
  parentPath = [],
  groupByFields = [],
  search,
  isCheckboxChecked,
  onCheckboxChange,
  showCheckboxes = false,
}) => {
  const {
    expandedGroups,
    toggleGroupExpansion,
    setSelectedGroupPath,
    userDomainFilters,
    lockedDomainFilters,
    sorting,
    groupDetailsPagination,
    setGroupDetailsPagination,
    groupBy,
    buildDefaultFilters,
    setSubgroupPagination,
    clearSubgroupPagination,
    subgroupPagination,
  } = useUniversalGroupingFilterStore();

  // Get metadata options to identify date fields
  const { data: metadataOptions } = useMetadataOptions('Bank');

  // Create a map of field types from metadata
  const fieldTypesMap = useMemo(() => {
    if (!metadataOptions?.filterOptions) return null;
    const fieldTypes: Record<string, string> = {};
    metadataOptions.filterOptions.forEach((option) => {
      fieldTypes[option.field] = option.type;
    });
    return fieldTypes;
  }, [metadataOptions]);

  // Helper function to check if a field is a date field
  const isDateFieldFn = useCallback(
    (fieldName: string): boolean => isDateField(fieldName, fieldTypesMap),
    [fieldTypesMap]
  );

  // Use groupByFields from props, fallback to store groupBy
  const effectiveGroupByFields = groupByFields.length > 0 ? groupByFields : groupBy;

  // Create unique group ID that includes parent path
  const uniqueGroupId =
    parentPath.length > 0
      ? [...parentPath.map((p) => p.groupId), group.groupId].join('|')
      : group.groupId;
  const isExpanded = expandedGroups.has(uniqueGroupId);

  // Build domain filters for this specific group
  const groupDomainFilters = useMemo(() => {
    const locked = lockedDomainFilters || [];
    const user = userDomainFilters || [];
    return buildGroupDomainFilters([...locked, ...user], parentPath, group, isDateFieldFn);
  }, [lockedDomainFilters, userDomainFilters, parentPath, group, isDateFieldFn]);

  // Get pagination for this group
  const groupPagination = useMemo(
    () => groupDetailsPagination[uniqueGroupId] || { page: 1, limit: DEFAULT_PAGE_LIMIT },
    [groupDetailsPagination, uniqueGroupId]
  );

  // Page number and range end editing state
  const [isEditingPageNumber, setIsEditingPageNumber] = useState(false);
  const [isEditingRangeEnd, setIsEditingRangeEnd] = useState(false);
  const pageNumberSpanRef = useRef<HTMLSpanElement | null>(null);
  const rangeEndSpanRef = useRef<HTMLSpanElement | null>(null);
  const pageNumberClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rangeEndClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if group has subgroups
  const hasSubGroups = group.subGroups && group.subGroups.length > 0;

  // Only fetch group details when expanded AND there are no subgroups (leaf node)
  const shouldFetchDetails = isExpanded && !hasSubGroups && group.count > 0;
  const pathname = usePathname();

  // Convert default filters to query params format
  const defaultFiltersAsQueryParams = useMemo(
    () => buildDefaultFiltersAsQueryParams(buildDefaultFilters, false, undefined, pathname),
    [buildDefaultFilters, pathname]
  );

  // Build query params for API calls
  const groupDetailsQueryParams = useMemo(
    () =>
      buildGroupDetailsQueryParams(
        groupDomainFilters,
        defaultFiltersAsQueryParams,
        groupPagination,
        false, // isProgressPage
        undefined, // hasProgressValue
        sorting,
        pathname,
        search
      ),
    [groupDomainFilters, defaultFiltersAsQueryParams, groupPagination, sorting, pathname, search]
  );

  // Fetch bank details for this group
  const { data: bankDetailsData, isLoading: bankDetailsLoading } = useBanks(
    groupDetailsQueryParams as any,
    {
      enabled: shouldFetchDetails,
    }
  );

  const banks = bankDetailsData?.data || [];
  const bankDetailsMeta = bankDetailsData?.meta;

  // Responsive columns calculation
  const columns = useMemo(() => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width < 768) return 1;
    if (width < 1280) return 2;
    return 4;
  }, []);

  // Container ref (kept for potential future use)
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
  }, []);

  // Handle toggle expansion
  const handleToggle = useCallback(() => {
    toggleGroupExpansion(uniqueGroupId);

    if (!isExpanded) {
      const newPath =
        parentPath.length > 0
          ? [...parentPath.map((p) => p.groupId), group.groupId]
          : [group.groupId];
      setSelectedGroupPath(newPath);
    } else {
      setSelectedGroupPath(null);
      if (hasSubGroups) {
        clearSubgroupPagination(uniqueGroupId);
      }
    }
  }, [
    toggleGroupExpansion,
    uniqueGroupId,
    isExpanded,
    parentPath,
    group.groupId,
    setSelectedGroupPath,
    hasSubGroups,
    clearSubgroupPagination,
  ]);

  // Get stored subgroup pagination
  const storedSubgroupPagination = useMemo(
    () => subgroupPagination[uniqueGroupId] || null,
    [subgroupPagination, uniqueGroupId]
  );

  // Get pagination for subgroups
  const subgroupPaginationFromMeta = useMemo(() => {
    const effectiveLimit =
      storedSubgroupPagination?.subLimit || group.meta?.limit || DEFAULT_PAGE_LIMIT;
    const effectivePage = storedSubgroupPagination?.subPage || group.meta?.page || 1;
    const total = group.meta?.total || 0;
    const calculatedPages = total > 0 ? Math.ceil(total / effectiveLimit) : 1;

    return {
      page: effectivePage,
      limit: effectiveLimit,
      total: total,
      pages: Math.max(calculatedPages, group.meta?.pages || 1),
    };
  }, [storedSubgroupPagination, group.meta]);

  // Handle pagination change for group details
  const handleGroupPaginationChange = useCallback(
    (page: number, newLimit?: number) => {
      setGroupDetailsPagination(uniqueGroupId, {
        ...groupPagination,
        page,
        limit: newLimit !== undefined ? newLimit : groupPagination.limit,
      });
    },
    [uniqueGroupId, groupPagination, setGroupDetailsPagination]
  );

  // Handle pagination change for subgroups
  const handleSubgroupPaginationChange = useCallback(
    (page: number, newLimit?: number) => {
      setSubgroupPagination(uniqueGroupId, {
        subPage: page,
        subLimit: newLimit !== undefined ? newLimit : group.meta?.limit || DEFAULT_PAGE_LIMIT,
      });
    },
    [uniqueGroupId, group.meta?.limit, setSubgroupPagination]
  );

  // Helper functions for pagination display
  const getStartNumber = useCallback(() => {
    return groupPagination.page === 1 ? 1 : (groupPagination.page - 1) * groupPagination.limit + 1;
  }, [groupPagination.page, groupPagination.limit]);

  const getEndNumber = useCallback(() => {
    return Math.min(groupPagination.page * groupPagination.limit, bankDetailsMeta?.total || 0);
  }, [groupPagination.page, groupPagination.limit, bankDetailsMeta?.total]);

  const getSubgroupRangeText = useCallback(() => {
    const start =
      subgroupPaginationFromMeta.page === 1
        ? 1
        : (subgroupPaginationFromMeta.page - 1) * subgroupPaginationFromMeta.limit + 1;
    const end = Math.min(
      subgroupPaginationFromMeta.page * subgroupPaginationFromMeta.limit,
      subgroupPaginationFromMeta.total
    );
    return `${start}-${end}`;
  }, [subgroupPaginationFromMeta]);

  // Page Number editing handlers
  const getPageNumberText = useCallback(() => getStartNumber().toString(), [getStartNumber]);
  const getRangeEndText = useCallback(() => getEndNumber().toString(), [getEndNumber]);

  const startEditingPageNumber = useCallback(() => {
    if (!pageNumberSpanRef.current) return;
    setIsEditingPageNumber(true);
    pageNumberSpanRef.current.textContent = getPageNumberText();
  }, [getPageNumberText]);

  const handlePageNumberClick = useCallback(() => {
    if (pageNumberClickTimeoutRef.current) clearTimeout(pageNumberClickTimeoutRef.current);
    pageNumberClickTimeoutRef.current = setTimeout(startEditingPageNumber, 200);
  }, [startEditingPageNumber]);

  const handlePageNumberInput = useCallback((e: React.FormEvent<HTMLSpanElement>) => {
    const text = e.currentTarget.textContent || '';
    if (!/^\d+$/.test(text) && text !== '') {
      e.currentTarget.textContent = text.replace(/\D/g, '');
    }
  }, []);

  const submitPageNumber = useCallback(() => {
    if (!pageNumberSpanRef.current) return;
    const text = pageNumberSpanRef.current.textContent || '';
    const newStart = parseInt(text, 10);
    const total = bankDetailsMeta?.total || 0;

    if (isNaN(newStart) || newStart < 1 || newStart > total) {
      pageNumberSpanRef.current.textContent = getPageNumberText();
      setIsEditingPageNumber(false);
      return;
    }

    const newPage = Math.ceil(newStart / groupPagination.limit);
    const maxPage = Math.ceil(total / groupPagination.limit);
    const finalPage = Math.min(Math.max(1, newPage), maxPage);
    handleGroupPaginationChange(finalPage, groupPagination.limit);
    setIsEditingPageNumber(false);
  }, [
    getPageNumberText,
    bankDetailsMeta?.total,
    groupPagination.limit,
    handleGroupPaginationChange,
  ]);

  const handlePageNumberKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitPageNumber();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditingPageNumber(false);
        if (pageNumberSpanRef.current) {
          pageNumberSpanRef.current.textContent = getPageNumberText();
        }
      }
    },
    [submitPageNumber, getPageNumberText]
  );

  // Range End editing handlers
  const startEditingRangeEnd = useCallback(() => {
    if (!rangeEndSpanRef.current) return;
    setIsEditingRangeEnd(true);
    rangeEndSpanRef.current.textContent = getRangeEndText();
  }, [getRangeEndText]);

  const handleRangeEndClick = useCallback(() => {
    if (rangeEndClickTimeoutRef.current) clearTimeout(rangeEndClickTimeoutRef.current);
    rangeEndClickTimeoutRef.current = setTimeout(startEditingRangeEnd, 200);
  }, [startEditingRangeEnd]);

  const handleRangeEndDoubleClick = useCallback(() => {
    if (rangeEndClickTimeoutRef.current) {
      clearTimeout(rangeEndClickTimeoutRef.current);
      rangeEndClickTimeoutRef.current = null;
    }
    const total = bankDetailsMeta?.total || 0;
    if (total > 0) {
      handleGroupPaginationChange(1, total);
    }
  }, [bankDetailsMeta?.total, handleGroupPaginationChange]);

  const handleRangeEndInput = useCallback((e: React.FormEvent<HTMLSpanElement>) => {
    const text = e.currentTarget.textContent || '';
    if (!/^\d+$/.test(text) && text !== '') {
      e.currentTarget.textContent = text.replace(/\D/g, '');
    }
  }, []);

  const submitRangeEnd = useCallback(() => {
    if (!rangeEndSpanRef.current) return;
    const text = rangeEndSpanRef.current.textContent || '';
    const newEnd = parseInt(text, 10);
    const start = getStartNumber();
    const total = bankDetailsMeta?.total || 0;

    if (isNaN(newEnd) || newEnd < 1 || newEnd > total) {
      rangeEndSpanRef.current.textContent = getRangeEndText();
      setIsEditingRangeEnd(false);
      return;
    }

    const newPageSize = newEnd - start + 1;
    if (newPageSize < 1) {
      const targetPage = Math.ceil(newEnd / groupPagination.limit);
      const maxPage = Math.ceil(total / groupPagination.limit);
      const finalPage = Math.min(Math.max(1, targetPage), maxPage);
      handleGroupPaginationChange(finalPage, groupPagination.limit);
      setIsEditingRangeEnd(false);
      return;
    }

    const maxPageSize = total > 0 ? total : 1000;
    const finalPageSize = Math.min(Math.max(1, newPageSize), maxPageSize);
    const maxPage = Math.ceil(total / finalPageSize);
    const targetPage = Math.min(groupPagination.page, maxPage);
    handleGroupPaginationChange(targetPage, finalPageSize);
    setIsEditingRangeEnd(false);
  }, [
    getRangeEndText,
    getStartNumber,
    bankDetailsMeta?.total,
    groupPagination.page,
    groupPagination.limit,
    handleGroupPaginationChange,
  ]);

  const handleRangeEndKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitRangeEnd();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditingRangeEnd(false);
        if (rangeEndSpanRef.current) {
          rangeEndSpanRef.current.textContent = getRangeEndText();
        }
      }
    },
    [submitRangeEnd, getRangeEndText]
  );

  // Auto-select text when editing starts
  useEffect(() => {
    if (isEditingPageNumber && pageNumberSpanRef.current) {
      if (
        !pageNumberSpanRef.current.textContent ||
        pageNumberSpanRef.current.textContent.trim() === ''
      ) {
        pageNumberSpanRef.current.textContent = getPageNumberText();
      }
      requestAnimationFrame(() => {
        if (pageNumberSpanRef.current) {
          const range = document.createRange();
          range.selectNodeContents(pageNumberSpanRef.current);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      });
    }
  }, [isEditingPageNumber, getPageNumberText]);

  useEffect(() => {
    if (isEditingRangeEnd && rangeEndSpanRef.current) {
      if (
        !rangeEndSpanRef.current.textContent ||
        rangeEndSpanRef.current.textContent.trim() === ''
      ) {
        rangeEndSpanRef.current.textContent = getRangeEndText();
      }
      requestAnimationFrame(() => {
        if (rangeEndSpanRef.current) {
          const range = document.createRange();
          range.selectNodeContents(rangeEndSpanRef.current);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      });
    }
  }, [isEditingRangeEnd, getRangeEndText]);

  // Cleanup timeouts
  useEffect(
    () => () => {
      if (pageNumberClickTimeoutRef.current) clearTimeout(pageNumberClickTimeoutRef.current);
      if (rangeEndClickTimeoutRef.current) clearTimeout(rangeEndClickTimeoutRef.current);
    },
    []
  );

  // Get group display name
  const groupDisplayName = formatGroupNameIfDate(group.groupName);

  return (
    <div className="w-full">
      {/* Group Header Card */}
      <div
        className={`col-span-full border-b bg-gray-200 ${
          hasSubGroups || group.count > 0 ? 'cursor-pointer hover:bg-gray-200' : ''
        }`}
        onClick={hasSubGroups || group.count > 0 ? handleToggle : undefined}
      >
        <div
          className="flex items-center justify-between p-1"
          style={{ paddingLeft: level === 0 ? '6px' : `${(level - 1) * 20 + 42}px` }}
        >
          {/* Left: Group Name and Count */}
          <div className="flex items-center gap-3">
            {(hasSubGroups || group.count > 0) && (
              <Button
                variant="plain"
                size="sm"
                icon={
                  <ApolloIcon
                    name={isExpanded ? 'arrow-down' : 'arrow-right'}
                    className="text-base"
                  />
                }
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle();
                }}
              />
            )}
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 capitalize">{groupDisplayName}</h3>
              <p className="text-xs text-gray-600">{group.count}</p>
            </div>
          </div>

          {/* Center: Pagination */}
          <div className="absolute left-1/2 -translate-x-1/2">
            {/* Group Details Pagination */}
            {/* {isExpanded && !hasSubGroups && bankDetailsMeta && bankDetailsMeta.total > 0 && (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  className="cursor-pointer rounded px-1 text-xs whitespace-nowrap text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  title="Click to edit start number"
                >
                  <span
                    ref={pageNumberSpanRef}
                    contentEditable={isEditingPageNumber}
                    suppressContentEditableWarning
                    onClick={handlePageNumberClick}
                    onInput={handlePageNumberInput}
                    onBlur={submitPageNumber}
                    onKeyDown={handlePageNumberKeyDown}
                    className={
                      isEditingPageNumber
                        ? 'inline-block w-12 max-w-min rounded bg-gray-50 px-1 transition-all duration-200 ease-in-out outline-none'
                        : 'transition-all duration-200 ease-in-out'
                    }
                  >
                    {!isEditingPageNumber && getStartNumber()}
                  </span>
                </button>
                <span className="mx-0.5 text-xs text-gray-700">-</span>
                <button
                  onDoubleClick={handleRangeEndDoubleClick}
                  className="cursor-pointer rounded px-1 text-xs whitespace-nowrap text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  title="Single click to edit range end, double click to show all items"
                >
                  <span
                    ref={rangeEndSpanRef}
                    contentEditable={isEditingRangeEnd}
                    suppressContentEditableWarning
                    onClick={handleRangeEndClick}
                    onInput={handleRangeEndInput}
                    onBlur={submitRangeEnd}
                    onKeyDown={handleRangeEndKeyDown}
                    className={
                      isEditingRangeEnd
                        ? 'inline-block w-12 max-w-min rounded bg-gray-50 px-1 transition-all duration-200 ease-in-out outline-none'
                        : 'transition-all duration-200 ease-in-out'
                    }
                  >
                    {!isEditingRangeEnd && getEndNumber()}
                  </span>
                </button>
                <span className="ml-1 text-xs font-semibold text-gray-700">
                  /{bankDetailsMeta.total}
                </span>
                {bankDetailsMeta.total > groupPagination.limit && (
                  <div className="ml-2 flex items-center gap-1">
                    <Prev
                      currentPage={groupPagination.page}
                      pagerClass={{
                        default:
                          'cursor-pointer text-sm rounded-md hover:bg-gray-200 transition-colors',
                        inactive: 'text-gray-700',
                        active: 'bg-blue-500 text-white',
                        disabled: 'text-gray-400 cursor-not-allowed hover:bg-transparent',
                      }}
                      onPrev={() => handleGroupPaginationChange(groupPagination.page - 1)}
                    />
                    <Next
                      currentPage={groupPagination.page}
                      pageCount={
                        bankDetailsMeta.pages ||
                        Math.ceil(bankDetailsMeta.total / groupPagination.limit)
                      }
                      pagerClass={{
                        default:
                          'cursor-pointer text-sm rounded hover:bg-gray-300 transition-colors',
                        inactive: 'text-gray-700',
                        active: 'bg-blue-500 text-white',
                        disabled: 'text-gray-400 cursor-not-allowed hover:bg-transparent',
                      }}
                      onNext={() => handleGroupPaginationChange(groupPagination.page + 1)}
                    />
                  </div>
                )}
              </div>
            )} */}

            {/* Subgroup Pagination - Commented out for now */}
            {/* {isExpanded &&
              hasSubGroups &&
              ((group.meta && group.meta.total > 0) || group.count > 0) && (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs whitespace-nowrap text-gray-700">
                    {getSubgroupRangeText()} / {group.meta?.total || group.count || 0}
                  </span>
                  {(() => {
                    const total = group.meta?.total || group.count || 0;
                    const effectiveLimit = subgroupPaginationFromMeta.limit;
                    const hasMultiplePages = subgroupPaginationFromMeta.pages > 1;
                    const totalExceedsLimit = total > effectiveLimit;
                    const totalExceedsDefault = total > DEFAULT_PAGE_LIMIT;
                    const hasStoredPagination = storedSubgroupPagination !== null;
                    const countExceedsDefault = group.count > DEFAULT_PAGE_LIMIT;

                    return (
                      hasMultiplePages ||
                      totalExceedsLimit ||
                      totalExceedsDefault ||
                      hasStoredPagination ||
                      countExceedsDefault
                    );
                  })() && (
                    <div className="ml-2 flex items-center gap-1">
                      <Prev
                        currentPage={subgroupPaginationFromMeta.page}
                        pagerClass={{
                          default:
                            'cursor-pointer text-sm rounded-md hover:bg-gray-200 transition-colors',
                          inactive: 'text-gray-700',
                          active: 'bg-blue-500 text-white',
                          disabled: 'text-gray-400 cursor-not-allowed hover:bg-transparent',
                        }}
                        onPrev={() =>
                          handleSubgroupPaginationChange(subgroupPaginationFromMeta.page - 1)
                        }
                      />
                      <Next
                        currentPage={subgroupPaginationFromMeta.page}
                        pageCount={subgroupPaginationFromMeta.pages}
                        pagerClass={{
                          default:
                            'cursor-pointer text-sm rounded hover:bg-gray-300 transition-colors',
                          inactive: 'text-gray-700',
                          active: 'bg-blue-500 text-white',
                          disabled: 'text-gray-400 cursor-not-allowed hover:bg-transparent',
                        }}
                        onNext={() =>
                          handleSubgroupPaginationChange(subgroupPaginationFromMeta.page + 1)
                        }
                      />
                    </div>
                  )}
                </div>
              )} */}
          </div>

          {/* Right: Loading indicator */}
          <div className="ml-auto flex items-center gap-2">
            {isExpanded && bankDetailsLoading && <Skeleton width="60px" height="16px" />}
          </div>
        </div>
      </div>

      {/* Expanded Group Content */}
      {isExpanded && (
        <div className="w-full bg-gray-100">
          {/* Render subgroups first if they exist */}
          {hasSubGroups && group.subGroups && (
            <div className="w-full">
              {group?.subGroups?.map((subGroup) => (
                <BankGroupSummary
                  key={subGroup.groupId}
                  group={subGroup}
                  onBankClick={onBankClick}
                  level={level + 1}
                  parentPath={
                    parentPath.length > 0
                      ? [
                          ...parentPath,
                          {
                            groupId: group.groupId,
                            groupName: group.groupName,
                            fieldName: group.fieldName || '',
                          },
                        ]
                      : [
                          {
                            groupId: group.groupId,
                            groupName: group.groupName,
                            fieldName: group.fieldName || '',
                          },
                        ]
                  }
                  groupByFields={effectiveGroupByFields}
                  search={search}
                  isCheckboxChecked={isCheckboxChecked}
                  onCheckboxChange={onCheckboxChange}
                  showCheckboxes={showCheckboxes}
                />
              ))}
            </div>
          )}

          {/* Render bank cards only if there are no subgroups (leaf node) */}
          {!hasSubGroups && (
            <>
              {bankDetailsLoading || (shouldFetchDetails && banks.length === 0) ? (
                <div
                  className={`grid gap-4 px-4 py-2 ${
                    columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-4'
                  }`}
                  style={{ paddingLeft: `${level * 20 + 42}px`, paddingRight: '16px' }}
                >
                  {Array.from({ length: 8 }, (_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className="relative rounded-lg border border-gray-200 bg-white"
                    >
                      <div className="flex justify-between gap-2">
                        {/* Left section skeleton */}
                        <div className="px-4 py-3 text-left">
                          <div className="flex items-center gap-2">
                            <Skeleton width="80px" height="20px" className="rounded-md" />
                            <Skeleton width="20px" height="20px" className="rounded" />
                          </div>
                          <div className="mt-2 flex items-center gap-1">
                            <Skeleton width="40px" height="12px" />
                            <Skeleton width="60px" height="12px" />
                          </div>
                        </div>
                        {/* Right section skeleton */}
                        <div className="px-4 py-3 text-right">
                          <Skeleton width="100px" height="12px" className="mb-2" />
                          <div className="flex items-center gap-1">
                            <Skeleton width="35px" height="12px" />
                            <Skeleton width="50px" height="12px" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : banks.length > 0 ? (
                <div ref={setContainerRef} className="w-full" onClick={(e) => e.stopPropagation()}>
                  <div
                    className={`grid gap-2 px-4 py-2 ${
                      columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-4'
                    }`}
                    style={{ paddingLeft: `${level * 20 + 42}px`, paddingRight: '16px' }}
                  >
                    {banks.map((bank: any) => (
                      <div
                        key={bank._id}
                        className="relative rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                      >
                        {showCheckboxes && (
                          <div
                            className="absolute top-2 right-2 z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isCheckboxChecked && onCheckboxChange && (
                              <input
                                type="checkbox"
                                checked={isCheckboxChecked(bank)}
                                onChange={(e) => onCheckboxChange(e.target.checked, bank)}
                                className="h-4 w-4 cursor-pointer"
                              />
                            )}
                          </div>
                        )}
                        <div className="cursor-pointer" onClick={() => onBankClick?.(bank)}>
                          <SimpleBankCard bank={bank} showCheckBox={showCheckboxes} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                shouldFetchDetails && (
                  <div
                    className="p-8 text-center text-sm text-gray-500"
                    style={{ paddingLeft: `${level * 20 + 42}px`, paddingRight: '16px' }}
                  >
                    No banks found in this group
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(BankGroupSummary, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.group.groupId === nextProps.group.groupId &&
    prevProps.group.count === nextProps.group.count &&
    prevProps.level === nextProps.level &&
    JSON.stringify(prevProps.parentPath) === JSON.stringify(nextProps.parentPath) &&
    JSON.stringify(prevProps.groupByFields) === JSON.stringify(nextProps.groupByFields) &&
    prevProps.search === nextProps.search &&
    prevProps.showCheckboxes === nextProps.showCheckboxes
  );
});
