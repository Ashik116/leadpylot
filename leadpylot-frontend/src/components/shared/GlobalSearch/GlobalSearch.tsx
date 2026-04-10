'use client';

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import DebouceInput from '@/components/shared/DebouceInput';
import ApolloIcon from '@/components/ui/ApolloIcon';
import LeadsMenuIcon from '@/assets/svg/menu-icons/LeadsMenuIcon';
import ProjectsMenuIcon from '@/assets/svg/menu-icons/ProjectsMenuIcon';
import ReclamationsMenuIcon from '@/assets/svg/menu-icons/ReclamationsMenuIcon';
import type { SearchResult } from '@/services/SettingsService';
import { apiSearch } from '@/services/SettingsService';
import { useFilterAwareLeadsNavigationStore } from '@/stores/navigationStores';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { getDocumentPreviewType } from '@/utils/documentUtils';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';

export interface GlobalSearchProps {
  placeholder?: string;
  className?: string;
  maxWidth?: string;
  minWidth?: string;
  onResultClick?: (result: SearchResult) => void;
  customNavigation?: Record<string, (id: string) => string>;
  showResultsLabel?: boolean;
  resultsLabel?: string;
  debounceTime?: number;
  onFocus?: () => void;
  onValueChange?: (value: string) => void;
}

export interface GlobalSearchRef {
  clear: () => void;
}

const GlobalSearch = forwardRef<GlobalSearchRef, GlobalSearchProps>(
  (
    {
      placeholder = 'Search Here',
      className = '',
      maxWidth = 'max-w-[600px]',
      minWidth = 'min-w-[150px]',
      onResultClick,
      customNavigation,
      showResultsLabel = true,
      resultsLabel = 'Search Results',
      debounceTime = 300,
      onFocus,
      onValueChange,
    },
    ref
  ) => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [inputValue, setInputValue] = useState<string>(''); // Track input value for filter button visibility
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<{
      top: number;
      left: number;
      width: number;
    } | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    // Document preview hook
    const documentPreview = useDocumentPreview();
    // Default navigation mapping
    const defaultNavigation: Record<string, (id: string) => string> = {
      lead: (id: string) => `/dashboards/leads/${id}`,
      project: (id: string) => `/dashboards/projects/${id}`,
      source: (id: string) => `/admin/sources/${id}`,
      bank: (id: string) => `/admin/banks/${id}`,
      voipservers: (id: string) => `/admin/voip-servers/${id}`,
      mailserver: (id: string) => `/admin/mailservers/${id}`,
      reclamation: (id: string) => `/dashboards/leads/${id}`,
      payment_terms: (id: string) => `/admin/payment-terms/${id}`,
      user: (id: string) => `/admin/users/${id}`,
    };

    // Use custom navigation if provided, otherwise use default
    const navigationMap = customNavigation || defaultNavigation;

    // Handle debouncing
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearch(searchTerm);
      }, debounceTime);

      return () => clearTimeout(timer);
    }, [searchTerm, debounceTime]);

    // Perform search
    useEffect(() => {
      if (!debouncedSearch) {
        // Use requestAnimationFrame to avoid synchronous setState in effect
        const rafId = requestAnimationFrame(() => {
          setShowSearchResults(false);
          setSearchResults([]);
          setIsSearching(false);
        });
        return () => cancelAnimationFrame(rafId);
      }

      // Use requestAnimationFrame to avoid synchronous setState in effect
      const rafId = requestAnimationFrame(() => {
        setIsSearching(true);
      });
      let isMounted = true;

      const performSearch = async () => {
        try {
          const result = await apiSearch(debouncedSearch);
          if (isMounted) {
            setSearchResults(result.data);
            setShowSearchResults(true);
            setIsSearching(false);
          }
        } catch {
          if (isMounted) {
            setIsSearching(false);
          }
        }
      };

      performSearch();

      return () => {
        cancelAnimationFrame(rafId);
        isMounted = false;
      };
    }, [debouncedSearch]);

    // Position dropdown using a fixed portal layer to avoid z-index/stacking issues
    useEffect(() => {
      const updateDropdownPosition = () => {
        if (!searchRef.current) return;
        const rect = searchRef.current.getBoundingClientRect();
        setDropdownStyle({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      };

      if (showSearchResults) {
        updateDropdownPosition();
        window.addEventListener('resize', updateDropdownPosition);
        window.addEventListener('scroll', updateDropdownPosition, true);
        return () => {
          window.removeEventListener('resize', updateDropdownPosition);
          window.removeEventListener('scroll', updateDropdownPosition, true);
        };
      }
    }, [showSearchResults]);

    // Handle clicking outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        const insideInput = !!searchRef.current?.contains(target);
        const insideDropdown = !!dropdownRef.current?.contains(target);
        if (!insideInput && !insideDropdown) {
          setShowSearchResults(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    // Handle search result click
    const handleResultClick = (result: SearchResult) => {
      if (onResultClick) {
        onResultClick(result);
      } else {
        // Handle document preview
        if (result?._type === 'document') {
          const filename = result?.name || 'Unknown file';
          // Determine preview type from filename
          const previewType = getDocumentPreviewType('', filename);
          documentPreview.openPreview(
            result?._id,
            filename,
            previewType as 'pdf' | 'image' | 'other'
          );
          setShowSearchResults(false);
          return;
        }

        const navigateTo = navigationMap[result?._type];
        if (navigateTo) {
          // If navigating to a lead, set special filter state for search navigation
          if (result?._type === 'lead') {
            const setFilteredItems = useFilterAwareLeadsNavigationStore.getState().setFilteredItems;
            const setFilterState = useFilterAwareLeadsNavigationStore.getState().setFilterState;

            // Convert SearchResult to Lead-like object for navigation store
            const leadForNavigation = {
              _id: result?._id,
              contact_name: result?.name,
              // Add minimal required properties for navigation
              id: 1,
              use_status: 'active',
              usable: 'yes',
              duplicate_status: 'new',
              checked: false,
              lead_source_no: '',
              system_id: null,
              email_from: '',
              phone: '',
              expected_revenue: 0,
              lead_date: new Date().toISOString(),
              assigned_date: new Date().toISOString(),
              source_month: null,
              prev_month: null,
              current_month: null,
              source_team_id: null,
              source_user_id: null,
              prev_team_id: null,
              prev_user_id: null,
              team_id: null,
              user_id: null,
              instance_id: null,
              source_id: null,
              active: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              __v: 0,
              stage: {
                id: 'active',
                name: 'Active',
                isWonStage: false,
              },
              status: {
                id: 'active',
                name: 'Active',
                code: 'active',
              },
              assigned_agent: {
                _id: '',
                login: '',
                role: '',
                active: true,
                instance_status: '',
                instance_userid: null,
                anydesk: null,
                user_id: '',
              },
              project: {
                _id: '',
                name: '',
              },
            };

            // Set only this lead as the filtered result
            setFilteredItems([leadForNavigation]);
            setFilterState({
              isFromSearch: true,
              searchTerm: searchTerm,
              searchResultId: result?._id,
            });
          }

          router.push(navigateTo(result?._id));
        }
      }
      setShowSearchResults(false);
    };

    // Get icon for result type
    const getResultIcon = (type: string) => {
      switch (type) {
        case 'project':
          return <ProjectsMenuIcon height={15} width={15} />;
        case 'bank':
          return (
            <ApolloIcon
              name="money-bag"
              className="text-md flex h-8 w-8 items-center justify-center text-gray-500"
            />
          );
        case 'lead':
          return <LeadsMenuIcon height={15} width={15} />;
        case 'reclamation':
          return <ReclamationsMenuIcon height={15} width={15} />;
        case 'voipservers':
          return (
            <ApolloIcon
              name="phone"
              className="text-md flex h-8 w-8 items-center justify-center text-gray-500"
            />
          );
        case 'source':
          return (
            <ApolloIcon
              name="multi-split"
              className="flex h-8 w-8 items-center justify-center text-lg text-gray-500"
            />
          );
        case 'mailserver':
          return (
            <ApolloIcon
              name="mail"
              className="text-md flex h-8 w-8 items-center justify-center text-gray-500"
            />
          );
        case 'payment_terms':
          return (
            <ApolloIcon
              name="calendar"
              className="text-md flex h-8 w-8 items-center justify-center text-gray-500"
            />
          );
        case 'user':
          return (
            <ApolloIcon
              name="user"
              className="text-md flex h-8 w-8 items-center justify-center text-gray-500"
            />
          );
        case 'document':
          return (
            <ApolloIcon
              name="file"
              className="text-md flex h-8 w-8 items-center justify-center text-gray-500"
            />
          );
        default:
          return (
            <ApolloIcon
              name="file"
              className="text-md flex h-8 w-8 items-center justify-center text-gray-500"
            />
          );
      }
    };

    // Expose clear method via ref
    useImperativeHandle(ref, () => ({
      clear: () => {
        setSearchTerm('');
        setInputValue('');
        setDebouncedSearch('');
        setShowSearchResults(false);
        setSearchResults([]);
        setIsSearching(false);
      },
    }));

    return (
      <div
        className={`relative min-w-0 rounded-2xl shadow ${maxWidth} ${minWidth} md:w-full ${className}`}
        ref={searchRef}
      >
        <DebouceInput
          prefix={<ApolloIcon name="search" className="w-4 shrink-0 text-sm leading-none" />}
          placeholder={placeholder}
          onChange={(e) => {
            const value = e.target.value;
            if (value && value.length > 2) {
              setInputValue(value);
              setSearchTerm(value);
              onValueChange?.(value);
            }
          }}
          onFocus={() => {
            if (searchTerm && searchTerm?.length > 0) {
              setShowSearchResults(true);
            }
            onFocus?.();
          }}
          value={searchTerm || ''}
          className="w-full"
          wait={250}
          size="sm"
        />

        {showSearchResults &&
          searchTerm &&
          searchTerm?.length > 0 &&
          dropdownStyle &&
          createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[999999] mt-1 rounded-md border border-gray-200 bg-white p-2 shadow-lg"
              style={{
                top: dropdownStyle?.top,
                left: dropdownStyle?.left,
                width: dropdownStyle?.width,
              }}
            >
              {showResultsLabel && (
                <div className="mb-2 text-sm font-medium text-gray-500">{resultsLabel}</div>
              )}

              {isSearching && (
                <div className="flex justify-center py-4">
                  <div className="border-t-primary h-6 w-6 animate-spin rounded-full border-2 border-gray-300"></div>
                </div>
              )}

              <div className="max-h-60 overflow-y-auto">
                {!isSearching && searchResults?.length > 0 ? (
                  searchResults?.map((result) => (
                    <div
                      key={result?._id}
                      className="flex w-auto cursor-pointer items-center rounded-md px-1 py-1 hover:bg-gray-100"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="mr-1 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                        {getResultIcon(result?._type)}
                      </div>
                      <div>
                        <div className="text-xs font-medium">{result?.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{result?._type}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-2 text-sm text-gray-600">
                    No results found for &ldquo;{searchTerm}&rdquo;
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}

        {/* Document Preview Dialog */}
        <DocumentPreviewDialog {...documentPreview.dialogProps} title="Document Preview" />
      </div>
    );
  }
);

GlobalSearch.displayName = 'GlobalSearch';

export default GlobalSearch;
