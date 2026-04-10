// /*
//  * ============================================================================
//  * OLD COMPONENT - COMMENTED OUT
//  * ============================================================================
//  * This component is no longer used in the new universal grouping/filtering system.
//  * Status filtering is now handled through CustomFilterOption.tsx which uses
//  * the new GET-based API system with domain filters.
//  *
//  * DO NOT USE THIS COMPONENT
//  * ============================================================================
//  */

// // OLD IMPORTS - COMMENTED OUT
// // import { useUniqueStatusCodes } from '@/services/hooks/useLeads';
// // import { useApplyDynamicFilters } from '@/services/hooks/useLeads';
// // import { useDynamicFiltersStore } from '@/stores/dynamicFiltersStore';
// // import { useFilterChainStore, FilterRule } from '@/stores/filterChainStore';
// // import { useFilterAwareLeadsNavigationStore } from '@/stores/navigationStores';
// // import { useApiUrlStore } from '@/stores/apiUrlStore';
// // import { DraggableDropdown } from '@/components/shared/DraggableDropdown';
// // import React, { useState, useEffect } from 'react';
// // import ApolloIcon from '@/components/ui/ApolloIcon';
// // import StatusFilterShimmer from '@/components/shared/loaders/StatusFilterShimmer';

// interface StatusFilterProps {
//   selectedStatus?: string;
//   onStatusChange?: (status: string | undefined) => void;
//   buildApiFilters?: () => any[];
//   // New prop for bulk search partner IDs
//   bulkSearchPartnerIds?: string[];
//   // New props for external edit mode control
//   isEditMode?: boolean;
//   onExitEditMode?: () => void;
// }

// // OLD COMPONENT - DO NOT USE
// export default function StatusFilter_OLD_DO_NOT_USE({
//   selectedStatus,
//   onStatusChange,
//   buildApiFilters,
//   bulkSearchPartnerIds,
//   isEditMode = false,
//   onExitEditMode,
// }: StatusFilterProps) {
//   const { statusCodes, isLoading } = useUniqueStatusCodes();
//   const applyDynamicFilters = useApplyDynamicFilters();
//   const {
//     setDynamicFilterMode,
//     setDynamicFilterResults,
//     setDynamicFilterQuery,
//     setCustomFilters,
//     setLoading,
//     setTotal,
//     setPage,
//     setPageSize,
//     setHasNextPage,
//     setHasPrevPage,
//     setFilterSource,
//     setRefetchFunction,
//     sortBy,
//     sortOrder,
//   } = useDynamicFiltersStore();

//   // Add filter chaining functionality - like FilterDropdown
//   const { setStatusFilter, setImportFilter } = useFilterChainStore();

//   // Add navigation store for updating filtered items
//   const { setFilteredItems, setFilterState } = useFilterAwareLeadsNavigationStore();

//   // Add API URL store for storing the filter URL
//   const { setApiUrl } = useApiUrlStore();

//   const [visibleFilters, setVisibleFilters] = useState<Record<string, boolean>>({});
//   const [reorderedOptions, setReorderedOptions] = useState<string[]>([]);
//   const [tempSelectedStatus, setTempSelectedStatus] = useState<string | undefined>(selectedStatus);

//   // Track changes for edit mode
//   const [hasChanges, setHasChanges] = useState(false);
//   const [originalVisibleFilters, setOriginalVisibleFilters] = useState<Record<string, boolean>>({});
//   const [originalReorderedOptions, setOriginalReorderedOptions] = useState<string[]>([]);

//   // Add key to force DraggableDropdown re-mount when resetting
//   const [resetKey, setResetKey] = useState(0);

//   // Sync temp selection with prop when it changes externally
//   useEffect(() => {
//     setTempSelectedStatus(selectedStatus);
//   }, [selectedStatus]);

//   // Load filter visibility from localStorage on mount and initialize reordered options
//   useEffect(() => {
//     try {
//       const stored = localStorage.getItem('filter-visibility-status');
//       if (stored) {
//         const parsed = JSON.parse(stored);
//         setVisibleFilters(parsed);
//         setOriginalVisibleFilters(parsed);
//       } else {
//         // Set all filters visible by default
//         const defaultVisibility = statusCodes.reduce(
//           (acc, status) => {
//             acc[status] = true;
//             return acc;
//           },
//           {} as Record<string, boolean>
//         );
//         setVisibleFilters(defaultVisibility);
//         setOriginalVisibleFilters(defaultVisibility);
//       }
//     } catch {
//       // Set all filters visible by default if localStorage fails
//       const defaultVisibility = statusCodes.reduce(
//         (acc, status) => {
//           acc[status] = true;
//           return acc;
//         },
//         {} as Record<string, boolean>
//       );
//       setVisibleFilters(defaultVisibility);
//       setOriginalVisibleFilters(defaultVisibility);
//     }

//     // Initialize reordered options with stored order or original data
//     try {
//       const storedOrder = localStorage.getItem('filter-order-status');
//       if (storedOrder) {
//         const order = JSON.parse(storedOrder);
//         // Reorder the data based on stored order
//         const reordered = [...statusCodes];
//         reordered.sort((a, b) => {
//           const aIndex = order.indexOf(a);
//           const bIndex = order.indexOf(b);

//           if (aIndex !== -1 && bIndex !== -1) {
//             return aIndex - bIndex;
//           }
//           if (aIndex !== -1) return -1;
//           if (bIndex !== -1) return 1;
//           return 0;
//         });
//         setReorderedOptions(reordered);
//         setOriginalReorderedOptions(reordered);
//       } else {
//         setReorderedOptions(statusCodes);
//         setOriginalReorderedOptions(statusCodes);
//       }
//     } catch {
//       setReorderedOptions(statusCodes);
//       setOriginalReorderedOptions(statusCodes);
//     }
//   }, [statusCodes]);

//   // Check for changes when edit mode is active
//   useEffect(() => {
//     if (isEditMode) {
//       const visibilityChanged =
//         JSON.stringify(visibleFilters) !== JSON.stringify(originalVisibleFilters);
//       const orderChanged =
//         JSON.stringify(reorderedOptions) !== JSON.stringify(originalReorderedOptions);
//       setHasChanges(visibilityChanged || orderChanged);
//     }
//   }, [
//     isEditMode,
//     visibleFilters,
//     originalVisibleFilters,
//     reorderedOptions,
//     originalReorderedOptions,
//   ]);

//   // Function to handle comprehensive clear (same as DynamicFilterResults)
//   const handleComprehensiveClear = () => {
//     try {
//       // 1. Clear ALL localStorage filter data
//       localStorage.removeItem('dynamicFilters'); // DynamicFilters saved rules
//       localStorage.removeItem('filter-visibility-import'); // FilterByImport visibility
//       localStorage.removeItem('filter-visibility-status'); // StatusFilter visibility
//       localStorage.removeItem('filter-visibility-groupBy'); // GroupByFilter visibility

//       // 2. Clear ALL global filter chain store states
//       setImportFilter(null); // Clear import filter
//       setStatusFilter(null); // Clear status filter

//       // 3. Clear dynamic filters store completely
//       setDynamicFilterMode(false);
//       setDynamicFilterResults([]);
//       setDynamicFilterQuery([]);
//       setCustomFilters([]); // Clear custom filters too
//       setTotal(0);
//       setPage(1);
//       setPageSize(50);
//       setHasNextPage(false);
//       setHasPrevPage(false);
//       setFilterSource(null);
//       setLoading(false);

//       // 4. Clear local state
//       setTempSelectedStatus(undefined);

//       // 5. Call the onStatusChange callback to update parent
//       if (onStatusChange) {
//         onStatusChange(undefined);
//       }

//       // 6. Clear navigation store
//       setFilteredItems([]);
//       setFilterState(null);
//     } catch {
//       // Error handling silently
//     }
//   };

//   // Function to handle temporary status selection (doesn't call API immediately)
//   const handleTempStatusSelect = (status: string) => {
//     // In edit mode, don't allow filter selection
//     if (isEditMode) {
//       return;
//     }

//     const newSelectedStatus = tempSelectedStatus === status ? undefined : status;
//     setTempSelectedStatus(newSelectedStatus);
//   };

//   // Function to apply the selected status filter (calls the API)
//   const handleApplyStatusFilter = async () => {
//     // Clear import filters when status filter is applied
//     setImportFilter(null);

//     // Create filter rule for filter chaining - like FilterDropdown
//     const newFilter: FilterRule | null = tempSelectedStatus
//       ? {
//           field: 'status',
//           operator: 'equals',
//           value: tempSelectedStatus,
//         }
//       : null;

//     // Update filter chain store - data stays in global state only
//     setStatusFilter(newFilter);

//     // Then set the filter state (EXISTING FUNCTIONALITY) - like FilterDropdown
//     if (onStatusChange) {
//       onStatusChange(tempSelectedStatus);
//     }

//     if (tempSelectedStatus) {
//       // Get default filters from filter chain (includes project-specific defaults)
//       const defaultFilters = buildApiFilters ? buildApiFilters() : [];

//       // Build filter body with default filters, but exclude any existing status filters
//       const filterBody: FilterRule[] = defaultFilters?.filter(
//         (filter) => filter?.field !== 'status'
//       );

//       // Add the new status filter (this replaces any previous status filter)
//       filterBody.push({
//         field: 'status',
//         operator: 'equals',
//         value: tempSelectedStatus,
//       });

//       // Add bulk search partner IDs filter if they exist
//       if (bulkSearchPartnerIds && bulkSearchPartnerIds?.length > 0) {
//         filterBody.push({
//           field: 'partner_id',
//           operator: 'equals',
//           value: JSON.stringify(bulkSearchPartnerIds),
//         });
//       }

//       setLoading(true);

//       try {
//         // Create refetch function for pagination
//         const refetchWithPagination = async (page = 1, pageSize = 50) => {
//           try {
//             setLoading(true);
//             const result = await applyDynamicFilters.mutateAsync({
//               filters: filterBody,
//               page,
//               limit: pageSize,
//               sortBy: sortBy || undefined,
//               sortOrder: sortOrder || undefined,
//             });

//             // Update store with filtered results and pagination info
//             setDynamicFilterResults(result?.data || []);

//             // Handle dynamic filter response structure with nested pagination
//             const dynamicFilterResult = result as any;
//             const pagination = dynamicFilterResult.meta?.pagination;
//             setTotal(pagination?.total || dynamicFilterResult.totalFiltered || 0);
//             setPage(pagination?.page || page);
//             setPageSize(pagination?.limit || pagination?.currentPageSize || pageSize);
//             setHasNextPage(pagination?.hasNextPage || false);
//             setHasPrevPage(pagination?.hasPrevPage || false);
//             setLoading(false);

//             // CRITICAL: Update navigation store with current page data and pagination metadata
//             // This ensures filteredItems has the correct page data for handleRowClick
//             const { setFilteredItems, setFilterState } =
//               useFilterAwareLeadsNavigationStore.getState();
//             const paginationMeta = pagination
//               ? {
//                   page: pagination.page || page,
//                   limit: pagination.limit || pageSize,
//                   total: pagination.total || 0,
//                   pages: Math.ceil((pagination.total || 0) / (pagination.limit || pageSize)),
//                 }
//               : undefined;

//             setFilteredItems(result.data || [], paginationMeta);
//             setFilterState({
//               isDynamicFilterMode: true,
//               dynamicFilters: filterBody,
//               isGroupedMode: false,
//               paginationMeta,
//               apiUrl: '/dynamic-filters/apply',
//               sortBy: sortBy ?? undefined,
//               sortOrder: sortOrder ?? undefined,
//             });

//             // Update sessionStorage with current page number when pagination changes
//             try {
//               const currentPage = pagination?.page || page;
//               const currentLimit = pagination?.limit || pageSize;
//               const savedBody = sessionStorage.getItem('dynamic-filters-body');
//               if (savedBody) {
//                 const parsed = JSON.parse(savedBody);
//                 sessionStorage.setItem(
//                   'dynamic-filters-body',
//                   JSON.stringify({
//                     ...parsed,
//                     page: currentPage,
//                     limit: currentLimit,
//                   })
//                 );
//               }
//             } catch {
//               // Silent fail
//             }
//           } catch {
//             setLoading(false);
//           }
//         };

//         // Set the refetch function in the store
//         setRefetchFunction(refetchWithPagination);

//         const result = await applyDynamicFilters.mutateAsync({
//           filters: filterBody,
//           page: 1,
//           limit: 50,
//           sortBy: sortBy || undefined,
//           sortOrder: sortOrder || undefined,
//         });

//         // Update store with filtered results
//         setDynamicFilterMode(true);
//         setDynamicFilterResults(result?.data || []);
//         setDynamicFilterQuery(filterBody); // Complete filter query (including default filters)
//         setCustomFilters([
//           {
//             field: 'status',
//             operator: 'equals',
//             value: tempSelectedStatus,
//           },
//         ]); // Only the status filter (custom filter)

//         // Handle dynamic filter response structure with nested pagination
//         const dynamicFilterResult = result as any;
//         setTotal(
//           dynamicFilterResult?.meta?.pagination?.total || dynamicFilterResult?.totalFiltered || 0
//         );
//         setPage(dynamicFilterResult?.meta?.pagination?.page || 1);
//         setPageSize(
//           dynamicFilterResult?.meta?.pagination?.limit ||
//             dynamicFilterResult?.meta?.pagination?.currentPageSize ||
//             50
//         );
//         setHasNextPage(dynamicFilterResult?.meta?.pagination?.hasNextPage || false);
//         setHasPrevPage(dynamicFilterResult?.meta?.pagination?.hasPrevPage || false);
//         setFilterSource('table_header'); // Set source as table_header
//         setLoading(false);

//         // Update navigation store with current page results and pagination metadata
//         // Navigation will handle fetching new pages when needed
//         try {
//           const currentResults = result.data || [];
//           const meta = result.meta;

//           // CRITICAL: Dynamic filters API has nested pagination: meta.pagination.{total, page, limit}
//           // Not like regular leads API: meta.{total, page, limit}
//           const pagination = (meta as any)?.pagination;
//           const paginationMeta = pagination
//             ? {
//                 page: pagination.page || 1,
//                 limit: pagination.limit || 50,
//                 total: pagination.total || 0,
//                 pages: Math.ceil((pagination.total || 0) / (pagination.limit || 50)),
//               }
//             : undefined;

//           // CRITICAL FIX: Store API endpoint for POST request (no query params!)
//           // /dynamic-filters/apply is a POST API - store endpoint only, body separately
//           const apiUrlToStore = '/dynamic-filters/apply';
//           setApiUrl(apiUrlToStore);

//           // Store POST request body separately in sessionStorage for page refresh restoration
//           // Use same key as DynamicFilters since they use the same API
//           sessionStorage.setItem(
//             'dynamic-filters-body',
//             JSON.stringify({
//               filters: filterBody,
//               page: paginationMeta?.page || 1,
//               limit: paginationMeta?.limit || 50,
//               ...(sortBy && { sortBy }),
//               ...(sortOrder && { sortOrder }),
//             })
//           );

//           // Update navigation store with current page data and pagination metadata
//           setFilteredItems(currentResults, paginationMeta || undefined);
//           setFilterState({
//             isDynamicFilterMode: true,
//             dynamicFilters: filterBody,
//             isGroupedMode: false,
//             paginationMeta,
//             apiUrl: apiUrlToStore,
//             sortBy: sortBy ?? undefined,
//             sortOrder: sortOrder ?? undefined,
//           });
//         } catch {
//           // Fallback to current page results
//           const currentResults = result?.data || [];
//           setFilteredItems(currentResults);
//           setFilterState({
//             isDynamicFilterMode: true,
//             dynamicFilters: filterBody,
//             isGroupedMode: false,
//           });
//         }
//       } catch {
//         setLoading(false);
//       }
//     } else {
//       // Clear filters
//       setDynamicFilterMode(false);
//       setDynamicFilterResults([]);
//       setDynamicFilterQuery([]);
//       setCustomFilters([]); // Clear custom filters too
//       setTotal(0);
//       setPage(1);
//       setPageSize(50);
//       setFilterSource(null);
//     }
//   };

//   // Function to handle filter visibility change
//   const handleFilterVisibilityChange = (key: string, isVisible: boolean) => {
//     setVisibleFilters((prev) => ({ ...prev, [key]: isVisible }));
//   };

//   // Function to handle order changes from DraggableDropdown
//   const handleOrderChange = (orderedFilters: any[]) => {
//     // Convert the ordered filters back to string array format
//     const newReorderedOptions = orderedFilters?.map((filter) => filter?.key);
//     setReorderedOptions(newReorderedOptions);
//   };

//   // Function to handle cancel button
//   const handleCancel = () => {
//     // Clear localStorage to reset DraggableDropdown state
//     localStorage.removeItem('filter-visibility-status');
//     localStorage.removeItem('filter-order-status');

//     // Reset to original values
//     setVisibleFilters(originalVisibleFilters);
//     setReorderedOptions(originalReorderedOptions);
//     setHasChanges(false);
//     setResetKey((prev) => prev + 1); // Force re-mount
//   };

//   // Function to handle update button
//   const handleUpdate = () => {
//     try {
//       // Save visibility changes
//       localStorage.setItem('filter-visibility-status', JSON.stringify(visibleFilters));

//       // Save order changes
//       localStorage.setItem('filter-order-status', JSON.stringify(reorderedOptions));

//       // Update original values
//       setOriginalVisibleFilters(visibleFilters);
//       setOriginalReorderedOptions(reorderedOptions);
//       setHasChanges(false);
//     } catch {
//       // Error handling silently
//     }

//     // Exit edit mode
//     if (onExitEditMode) {
//       onExitEditMode();
//     }
//   };

//   // Convert status codes to the format expected by DraggableDropdown
//   const getDraggableFilters = () => {
//     return reorderedOptions?.map((status) => ({
//       key: status,
//       label: status,
//       value: status,
//       isVisible: visibleFilters[status] !== false,
//     }));
//   };

//   // Get visible filters for clean view (non-edit mode)
//   const getVisibleFilters = () => {
//     return getDraggableFilters()?.filter((filter) => filter?.isVisible);
//   };

//   if (isLoading) {
//     return <StatusFilterShimmer />;
//   }

//   // Clean view (non-edit mode)
//   if (!isEditMode) {
//     const visibleFiltersList = getVisibleFilters();

//     return (
//       <div className="w-full">
//         <div className="space-y-0">
//           {/* Clean filter list */}
//           {visibleFiltersList?.map((filter) => (
//             <button
//               key={filter?.key}
//               onClick={() => handleTempStatusSelect(filter?.value as string)}
//               className={`w-full px-0 py-2 text-left text-sm transition-colors ${
//                 tempSelectedStatus === filter?.value
//                   ? 'font-medium text-gray-900'
//                   : 'text-gray-700 hover:text-gray-900'
//               }`}
//             >
//               {filter?.label}
//             </button>
//           ))}
//         </div>
//       </div>
//     );
//   }

//   // Edit mode with full DraggableDropdown functionality
//   return (
//     <DraggableDropdown
//       key={resetKey} // Add key to force re-mount
//       filters={getDraggableFilters()}
//       onFilterVisibilityChange={handleFilterVisibilityChange}
//       onFilterSelect={(value) => handleTempStatusSelect(value as string)}
//       selectedValue={tempSelectedStatus}
//       filterType="status"
//       className="w-full"
//       onOrderChange={handleOrderChange}
//       // Add custom footer with Cancel and Update buttons
//       customFooter={
//         <div className="border-t border-gray-200 p-2">
//           <div className="flex justify-end gap-2">
//             {hasChanges && (
//               <button
//                 onClick={handleCancel}
//                 className="button border-border hover:bg-sand-5 button-press-feedback h-8 rounded-lg border bg-white px-3 text-sm text-gray-600"
//               >
//                 Cancel
//               </button>
//             )}
//             <button
//               onClick={hasChanges ? handleUpdate : onExitEditMode}
//               className={`button border-border button-press-feedback h-8 rounded-lg border px-3 text-sm ${
//                 hasChanges
//                   ? 'bg-sunbeam-2 hover:bg-sunbeam-3 text-gray-700'
//                   : 'hover:bg-sand-5 bg-white text-gray-600'
//               }`}
//             >
//               {hasChanges ? 'Update' : 'Cancel'}
//             </button>
//           </div>
//         </div>
//       }
//     />
//   );
// }
