import type { Props as ReactSelectProps, GroupBase, MenuListProps } from 'react-select';
import type { AsyncProps } from 'react-select/async';
import type { CreatableProps } from 'react-select/creatable';
import { useId, useState, useEffect, useRef, useCallback } from 'react';
import { CommonProps } from '@/@types/common';
import { TypeAttributes } from '../ui/@types/common';
import ApiService from '@/services/ApiService';
import AsyncSelect from 'react-select/async';
import { components } from 'react-select';
import ApolloIcon from '../ui/ApolloIcon';
import { useQueryClient } from '@tanstack/react-query';

export type SelectProps<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
> = CommonProps &
  ReactSelectProps<Option, IsMulti, Group> &
  AsyncProps<Option, IsMulti, Group> &
  CreatableProps<Option, IsMulti, Group> & {
    invalid?: boolean;
    size?: TypeAttributes.ControlSize;
    field?: any;
    componentAs?: any;
    api_url: string;
    optLabelKey?: string;
    optValueKey?: string;
    queryKey: string;
    searchKey?: string;
    maxMenuHeight?: number;
    sidebarVisible?: boolean;
  };

const LIMIT = 10;
const SCROLL_THRESHOLD = 50;
const DEBOUNCE_DELAY = 100;

const ADD_NEW_OPTIONS = {
  voipservers: { value: 'add-new-voip', label: 'Add New VOIP Server' },
  mailservers: { value: 'add-new-mail', label: 'Add New Mail Server' },
  banks: { value: 'add-new-bank', label: 'Add New Bank' },
  // email_templates: { value: 'add-new-email-template', label: 'Add New Email Template' },
};

function AsyncMultiSelect<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(props: SelectProps<Option, IsMulti, Group>) {
  const {
    api_url,
    queryKey,
    searchKey = 'search',
    optLabelKey = 'name',
    optValueKey = '_id',
    maxMenuHeight,
    formatOptionLabel,
    sidebarVisible,
    ...restProps
  } = props;

  // State
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Refs for pagination
  const currentPageRef = useRef(1);
  const totalPagesRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const optionsRef = useRef<any[]>([]);
  const lastSearchRef = useRef('');
  const currentCallbackRef = useRef<((options: any[]) => void) | null>(null);
  const prevSidebarVisibleRef = useRef(sidebarVisible);
  const menuListScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const id = useId();
  const queryClient = useQueryClient();

  // Process API response data
  const processApiData = useCallback(
    (data: any) => {
      let apiData;
      switch (queryKey) {
        case 'email_templates':
          apiData = data?.data || [];
          break;
        case 'pdf_templates':
          apiData = data?.data?.templates?.filter((item: any) => item.status === 'active') || [];
          break;
        case 'banks':
          apiData = data?.data || [];
          break;
        default:
          apiData = data?.data || data || [];
      }
      return Array.isArray(apiData) ? apiData : [];
    },
    [queryKey]
  );

  // Reset pagination
  const resetPagination = useCallback(() => {
    currentPageRef.current = 1;
    totalPagesRef.current = 1;
    hasMoreRef.current = true;
    optionsRef.current = [];
  }, []);

  // Map data to options
  const mapToOptions = useCallback(
    (data: any[]) =>
      data.map((item) => ({
        label: item[optLabelKey],
        value: item[optValueKey],
      })),
    [optLabelKey, optValueKey]
  );

  // Load options function for AsyncSelect
  const loadOptions = useCallback(
    async (inputValue: string, callback: (options: any[]) => void) => {
      currentCallbackRef.current = callback;
      const isNewSearch = inputValue !== lastSearchRef.current;

      if (isNewSearch) {
        resetPagination();
        lastSearchRef.current = inputValue;
      }

      // Return cached options if available
      if (optionsRef.current?.length > 0 && !isNewSearch && !loadingRef.current) {
        callback(optionsRef.current);
        return;
      }

      if (loadingRef.current) return;

      loadingRef.current = true;
      setIsLoadingMore(true);

      try {
        const response: any = await ApiService.fetchDataWithAxios({
          url: api_url,
          method: 'get',
          params: {
            page: 1,
            limit: LIMIT,
            ...(inputValue ? { [searchKey]: inputValue } : {}),
          },
        });
        const dataArray = processApiData(response);
        const newOptions = mapToOptions(dataArray);
        const responseTotalPages = response?.meta?.pages || 1;

        currentPageRef.current = 1;
        totalPagesRef.current = responseTotalPages;
        hasMoreRef.current = 1 < responseTotalPages;
        optionsRef.current = newOptions;

        callback(newOptions);
      } catch (error) {
        console.error('Error loading options:', error);
        callback([]);
      } finally {
        loadingRef.current = false;
        setIsLoadingMore(false);
      }
    },
    [api_url, searchKey, processApiData, mapToOptions, resetPagination]
  );

  // Load more options when scrolling to bottom
  const loadMoreOptions = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;

    const nextPage = currentPageRef.current + 1;
    if (nextPage > totalPagesRef.current) {
      hasMoreRef.current = false;
      return;
    }

    loadingRef.current = true;
    setIsLoadingMore(true);

    try {
      const response: any = await ApiService.fetchDataWithAxios({
        url: api_url,
        method: 'get',
        params: {
          page: nextPage,
          limit: LIMIT,
          ...(lastSearchRef.current ? { [searchKey]: lastSearchRef.current } : {}),
        },
      });

      const dataArray = processApiData(response);
      const newOptions = mapToOptions(dataArray);
      const responseTotalPages = response?.meta?.pages || totalPagesRef.current;
      const updatedOptions = [...optionsRef.current, ...newOptions];

      currentPageRef.current = nextPage;
      totalPagesRef.current = responseTotalPages;
      hasMoreRef.current = nextPage < responseTotalPages;
      optionsRef.current = updatedOptions;

      currentCallbackRef.current?.(updatedOptions);
    } catch (error) {
      console.error('Error loading more options:', error);
      hasMoreRef.current = false;
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [api_url, searchKey, processApiData, mapToOptions]);

  // Handle menu open to setup scroll listener
  const handleMenuOpen = useCallback(() => {
    setTimeout(() => {
      const menuListElement = document.querySelector('.react-select__menu-list') as HTMLElement;
      if (!menuListElement) return;

      const handleScroll = () => {
        if (menuListScrollTimeoutRef.current) {
          clearTimeout(menuListScrollTimeoutRef.current);
        }

        menuListScrollTimeoutRef.current = setTimeout(() => {
          const { scrollTop, scrollHeight, clientHeight } = menuListElement;
          const scrollBottom = scrollHeight - scrollTop - clientHeight;
          const nextPage = currentPageRef.current + 1;

          if (
            scrollBottom < SCROLL_THRESHOLD &&
            hasMoreRef.current &&
            !loadingRef.current &&
            nextPage <= totalPagesRef.current
          ) {
            loadMoreOptions();
          }
        }, DEBOUNCE_DELAY);
      };

      menuListElement.addEventListener('scroll', handleScroll, { passive: true });
      (menuListElement as any)._scrollCleanup = () => {
        menuListElement.removeEventListener('scroll', handleScroll);
      };
    }, DEBOUNCE_DELAY);
  }, [loadMoreOptions]);

  const handleMenuClose = useCallback(() => {
    const menuListElement = document.querySelector('.react-select__menu-list') as HTMLElement;
    if (menuListElement && (menuListElement as any)._scrollCleanup) {
      (menuListElement as any)._scrollCleanup();
    }
    if (menuListScrollTimeoutRef.current) {
      clearTimeout(menuListScrollTimeoutRef.current);
    }
  }, []);

  // Custom MenuList component
  const MenuList = useCallback(
    (menuListProps: MenuListProps<Option, IsMulti, Group>) => (
      <components.MenuList {...menuListProps}>
        {menuListProps.children}
        {isLoadingMore && (
          <div style={{ padding: '8px', textAlign: 'center', color: '#666' }}>Loading more...</div>
        )}
      </components.MenuList>
    ),
    [isLoadingMore]
  );

  // Add "Add New" option if needed
  const loadOptionsWithAddNew = useCallback(
    (inputValue: string, callback: (options: any[]) => void) => {
      loadOptions(inputValue, (options) => {
        if (!formatOptionLabel) {
          callback(options);
          return;
        }

        const addNewOption = Object?.entries(ADD_NEW_OPTIONS)?.find(
          ([key]) => api_url?.includes(key) || queryKey === key
        )?.[1];

        if (addNewOption) {
          callback([
            {
              ...addNewOption,
              label: (
                <div className="text-ocean-2 flex items-center">
                  <ApolloIcon name="plus" className="mr-2" />
                  {addNewOption?.label}
                </div>
              ),
            },
            ...options,
          ]);
        } else {
          callback(options);
        }
      });
    },
    [loadOptions, formatOptionLabel, api_url, queryKey]
  );

  // Reset pagination when sidebar closes (without remounting component to preserve values)
  useEffect(() => {
    if (prevSidebarVisibleRef.current && !sidebarVisible) {
      resetPagination();
      // Clear cached options to force fresh data load
      optionsRef.current = [];
      // Increment refreshKey to force component refresh and reload options
      setRefreshKey((prev) => prev + 1);
    }
    prevSidebarVisibleRef.current = sidebarVisible;
  }, [sidebarVisible, resetPagination]);

  // Listen to query invalidations and refresh options when queries are invalidated
  useEffect(() => {
    // Map queryKey to possible query keys that might be invalidated
    const relatedQueryKeys: (string | string[])[] = [];

    if (queryKey === 'mail') {
      relatedQueryKeys.push('mail', ['settings', 'mailservers'], 'mailservers');
    } else if (queryKey === 'voip') {
      relatedQueryKeys.push('voip', 'voip-servers', 'voipservers');
    } else if (queryKey === 'banks') {
      relatedQueryKeys.push('banks');
    } else if (queryKey === 'email_templates') {
      relatedQueryKeys.push('email_templates');
    } else if (queryKey === 'pdf_templates') {
      relatedQueryKeys.push('pdf_templates', 'pdf-templates');
    }

    // Helper function to check if query keys match
    const queryKeysMatch = (eventKey: any[], relatedKey: string | string[]): boolean => {
      if (typeof relatedKey === 'string') {
        return eventKey[0] === relatedKey;
      }
      // Compare array query keys
      return Array.isArray(relatedKey) &&
        eventKey.length === relatedKey.length &&
        eventKey.every((key, index) => key === relatedKey[index]);
    };

    // Subscribe to query cache changes
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Listen for updated or removed events (queries are marked stale when invalidated)
      if (event?.type === 'updated' || event?.type === 'removed') {
        const eventQuery = event?.query;
        const eventQueryKey = eventQuery?.queryKey;

        // Check if query is stale (which happens when invalidated) or if it was removed
        const isStale = eventQuery?.isStale() || event?.type === 'removed';

        if (isStale && eventQueryKey && Array.isArray(eventQueryKey)) {
          // Check if the invalidated query matches any of our related query keys
          const matches = relatedQueryKeys.some((relatedKey) =>
            queryKeysMatch(eventQueryKey, relatedKey)
          );

          if (matches) {
            // Clear cached options and refresh
            resetPagination();
            optionsRef.current = [];
            setRefreshKey((prev) => prev + 1);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryKey, queryClient, resetPagination]);

  // Size to height mapping (based on CONTROL_SIZES constants)
  const sizeMap: Record<string, { minHeight: number; padding: string; tagPadding: string; fontSize: string; indicatorPadding: string }> = {
    sm: { minHeight: 28, padding: '0px 4px', tagPadding: '0px 4px', fontSize: '12px', indicatorPadding: '2px' },
    md: { minHeight: 32, padding: '0px 6px', tagPadding: '1px 6px', fontSize: '14px', indicatorPadding: '4px' },
    lg: { minHeight: 40, padding: '0px 8px', tagPadding: '2px 8px', fontSize: '16px', indicatorPadding: '6px' },
  };

  const currentSize = props.size || 'md';
  const sizeConfig = sizeMap[currentSize] || sizeMap.md;

  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      alignItems: 'center',
      minHeight: sizeConfig.minHeight,
      height: 'auto',
      borderRadius: 8,
      borderColor: state?.isFocused ? '#c2c0bc' : provided?.borderColor,
      boxShadow: state?.isFocused ? '0 0 0 1px #c2c0bc' : provided?.boxShadow,
      '&:hover': {
        borderColor: '#c2c0bc',
      },
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: sizeConfig.padding,
      gap: '4px',
      alignContent: 'center',
    }),
    input: (provided: any) => ({
      ...provided,
      margin: 0,
      padding: 0,
      fontSize: sizeConfig.fontSize,
    }),
    singleValue: (provided: any) => ({
      ...provided,
      margin: 0,
      padding: 0,
      fontSize: sizeConfig.fontSize,
      lineHeight: `${sizeConfig.minHeight - 2}px`, // Center text vertically
    }),
    placeholder: (provided: any) => ({
      ...provided,
      margin: 0,
      padding: 0,
      fontSize: sizeConfig.fontSize,
      color: '#9ca3af',
    }),
    indicatorsContainer: (provided: any) => ({
      ...provided,
      height: sizeConfig.minHeight - 2,
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      padding: sizeConfig.indicatorPadding,
      color: '#6b7280',
    }),
    clearIndicator: (provided: any) => ({
      ...provided,
      padding: sizeConfig.indicatorPadding,
      color: '#6b7280',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    multiValue: (provided: any) => ({
      ...provided,
      margin: '2px 0',
      // backgroundColor: '#f3f4f6',
      borderRadius: '3px',
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      padding: sizeConfig.tagPadding,
      paddingLeft: currentSize === 'sm' ? 4 : 6,
      fontSize: currentSize === 'sm' ? '12px' : '13px',
      color: '#374151',
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      paddingLeft: 0,
      paddingRight: currentSize === 'sm' ? 2 : 4,
      borderRadius: '0 6px 6px 0',
      '&:hover': {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        color: '#ef4444',
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      borderRadius: '8px',
      boxShadow: '0 2px 2px -1px rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      border: '1px solid #e5e7eb',
      marginTop: '4px',
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      padding: '4px 8px',
      fontSize: sizeConfig.fontSize,
      backgroundColor: state.isSelected
        ? '#f3f4f6'
        : state.isFocused
          ? '#f3f4f6' // gray-100
          : 'transparent',
      color: state.isSelected ? '#374151' : '#374151',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: state.isSelected ? '#6b7280' : '#e5e7eb',
      },
    }),
  };

  return (
    <AsyncSelect
      key={refreshKey}
      id={id}
      className="w-full"
      classNamePrefix="react-select"
      loadOptions={loadOptionsWithAddNew}
      defaultOptions={true}
      cacheOptions={false}
      isSearchable={true}
      isLoading={isLoadingMore}
      onMenuOpen={handleMenuOpen}
      onMenuClose={handleMenuClose}
      styles={customStyles}
      maxMenuHeight={maxMenuHeight}
      components={{ MenuList, ...restProps.components }}
      closeMenuOnSelect={!props.isMulti}
      hideSelectedOptions={false}
      {...restProps}
    />
  );
}

export default AsyncMultiSelect;
