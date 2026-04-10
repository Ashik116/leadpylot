// /*
//  * ============================================================================
//  * OLD COMPONENT - REPLACED BY GroupByOptions.tsx
//  * ============================================================================
//  * This component has been replaced by:
//  * @frontend/src/components/groupAndFiltering/GroupByOptions.tsx
//  *
//  * The new component uses:
//  * - useMetadataOptions hook (GET /api/metadata/options/{Entity})
//  * - useUniversalGroupingFilterStore (Zustand store)
//  * - New GET-based API system
//  *
//  * DO NOT USE THIS COMPONENT - Use GroupByOptions instead
//  * ============================================================================
//  */

// /* eslint-disable react-hooks/set-state-in-effect */
// // OLD IMPORTS - COMMENTED OUT
// // import { useGroupOptions } from '@/services/hooks/useLeads';
// // import { DraggableDropdown } from '@/components/shared/DraggableDropdown';
// // import React, { useState, useEffect } from 'react';
// // import ApolloIcon from '@/components/ui/ApolloIcon';
// // import { GroupOption } from '@/services/LeadsService';
// // import { useCentralizedFilters } from '@/hooks/useCentralizedFilters';
// // import { useFilterChainStore } from '@/stores/filterChainStore';
// // import GroupByFilterShimmer from '@/components/shared/loaders/GroupByFilterShimmer';

// // Default visible options: Project, Agent, Status, Stage, Source, Lead Date
// const DEFAULT_VISIBLE_OPTIONS = ['project', 'agent', 'status', 'stage', 'source', 'lead_date'];

// interface GroupByFilterProps {
//   selectedGroupBy?: string;
//   onGroupByChange?: (groupBy: string | undefined) => void;
//   // New props for multiple selections
//   selectedGroupByArray?: string[];
//   onGroupByArrayChange?: (groupBy: string[]) => void;
//   // New props for external edit mode control
//   isEditMode?: boolean;
//   onExitEditMode?: () => void;
//   // Hide specific group by options
//   hideProjectOption?: boolean;
// }

// // OLD COMPONENT - DO NOT USE
// export default function GroupByFilter_OLD_DO_NOT_USE({
//   selectedGroupBy,
//   onGroupByChange,
//   selectedGroupByArray,
//   onGroupByArrayChange,
//   isEditMode = false,
//   onExitEditMode,
//   hideProjectOption = false,
// }: GroupByFilterProps) {
//   const { data: groupOptionsData, isLoading } = useGroupOptions();

//   // Use centralized filter logic
//   const { isAgent } = useCentralizedFilters();

//   // Get dynamic filters to check for mutual exclusivity
//   const { dynamicFilters } = useFilterChainStore();

//   const [visibleFilters, setVisibleFilters] = useState<Record<string, boolean>>({});
//   const [reorderedOptions, setReorderedOptions] = useState<GroupOption[]>([]);

//   // Use the new array-based props if available, otherwise fall back to single value
//   const currentSelectedGroupBy = selectedGroupByArray || (selectedGroupBy ? [selectedGroupBy] : []);
//   const [tempSelectedGroupBy, setTempSelectedGroupBy] = useState<string[]>(currentSelectedGroupBy);

//   // Track changes for edit mode
//   const [hasChanges, setHasChanges] = useState(false);
//   const [originalVisibleFilters, setOriginalVisibleFilters] = useState<Record<string, boolean>>({});
//   const [originalReorderedOptions, setOriginalReorderedOptions] = useState<GroupOption[]>([]);

//   // Add key to force DraggableDropdown re-mount when resetting
//   const [resetKey, setResetKey] = useState(0);

//   // Sync temp selection with prop when it changes externally
//   useEffect(() => {
//     const newSelection = selectedGroupByArray || (selectedGroupBy ? [selectedGroupBy] : []);
//     setTempSelectedGroupBy(newSelection);
//   }, [selectedGroupBy, selectedGroupByArray]);

//   // Load filter visibility from localStorage on mount and initialize reordered options
//   useEffect(() => {
//     try {
//       const stored = localStorage.getItem('filter-visibility-groupBy');
//       if (stored) {
//         const parsed = JSON.parse(stored);
//         setVisibleFilters(parsed);
//         setOriginalVisibleFilters(parsed);
//       } else {
//         // Set only default visible options to true, others to false
//         const defaultVisibility =
//           groupOptionsData?.data?.reduce?.(
//             (acc, option) => {
//               // Only show default options by default: Project, Agent, Status, Stage, Source, Lead Date
//               acc[option.key] = DEFAULT_VISIBLE_OPTIONS.includes(option.key);
//               return acc;
//             },
//             {} as Record<string, boolean>
//           ) || {};
//         setVisibleFilters(defaultVisibility);
//         setOriginalVisibleFilters(defaultVisibility);
//       }
//     } catch {
//       // Set only default visible options to true, others to false if localStorage fails
//       const defaultVisibility =
//         groupOptionsData?.data?.reduce?.(
//           (acc, option) => {
//             // Only show default options by default: Project, Agent, Status, Stage, Source, Lead Date
//             acc[option.key] = DEFAULT_VISIBLE_OPTIONS.includes(option.key);
//             return acc;
//           },
//           {} as Record<string, boolean>
//         ) || {};
//       setVisibleFilters(defaultVisibility);
//       setOriginalVisibleFilters(defaultVisibility);
//     }

//     // Initialize reordered options with stored order or original data
//     if (Array.isArray(groupOptionsData?.data)) {
//       try {
//         const storedOrder = localStorage.getItem('filter-order-groupBy');
//         if (storedOrder) {
//           const order = JSON.parse(storedOrder) as string[];
//           // Reorder the data based on stored order
//           const reordered = [...groupOptionsData.data];
//           reordered.sort((a, b) => {
//             const aIndex = order.indexOf(a.key);
//             const bIndex = order.indexOf(b.key);

//             if (aIndex !== -1 && bIndex !== -1) {
//               return aIndex - bIndex;
//             }
//             if (aIndex !== -1) return -1;
//             if (bIndex !== -1) return 1;
//             return 0;
//           });
//           setReorderedOptions(reordered);
//           setOriginalReorderedOptions(reordered);
//         } else {
//           setReorderedOptions(groupOptionsData.data);
//           setOriginalReorderedOptions(groupOptionsData.data);
//         }
//       } catch {
//         setReorderedOptions(groupOptionsData.data);
//         setOriginalReorderedOptions(groupOptionsData.data);
//       }
//     }
//   }, [groupOptionsData?.data]);

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

//   // Function to handle group by selection (auto-applies immediately)
//   const handleTempGroupBySelect = (groupBy: string) => {
//     // In edit mode, don't allow filter selection
//     if (isEditMode) {
//       return;
//     }

//     const isCurrentlySelected = tempSelectedGroupBy.includes(groupBy);
//     let newSelectedGroupBy: string[];

//     if (isCurrentlySelected) {
//       // For Agents, prevent unselecting the Status field
//       if (isAgent && groupBy === 'status') {
//         return; // Don't allow Agents to unselect Status
//       }

//       // Remove if already selected
//       newSelectedGroupBy = tempSelectedGroupBy.filter((item) => item !== groupBy);
//     } else {
//       // Add if not selected, but check limit
//       if (tempSelectedGroupBy.length >= 5) {
//         // Don't add more than 5 items
//         return;
//       }

//       // Check for mutual exclusivity: "Last Transfer" and "Agent" cannot be selected together
//       // Also check if dynamic filters contain conflicting fields
//       const hasAgentInDynamicFilters = dynamicFilters.some((filter) => filter.field === 'agent');
//       const hasLastTransferInDynamicFilters = dynamicFilters.some(
//         (filter) => filter.field === 'last_transfer'
//       );

//       if (
//         groupBy === 'last_transfer' &&
//         (tempSelectedGroupBy.includes('agent') || hasAgentInDynamicFilters)
//       ) {
//         // If trying to select "Last Transfer" but "Agent" is already selected in group by or dynamic filters, remove "Agent" first
//         newSelectedGroupBy = tempSelectedGroupBy.filter((item) => item !== 'agent');
//         newSelectedGroupBy = [...newSelectedGroupBy, groupBy];
//       } else if (
//         groupBy === 'agent' &&
//         (tempSelectedGroupBy.includes('last_transfer') || hasLastTransferInDynamicFilters)
//       ) {
//         // If trying to select "Agent" but "Last Transfer" is already selected in group by or dynamic filters, remove "Last Transfer" first
//         newSelectedGroupBy = tempSelectedGroupBy.filter((item) => item !== 'last_transfer');
//         newSelectedGroupBy = [...newSelectedGroupBy, groupBy];
//       } else {
//         newSelectedGroupBy = [...tempSelectedGroupBy, groupBy];
//       }
//     }

//     // Update temporary selection
//     setTempSelectedGroupBy(newSelectedGroupBy);

//     // Auto-apply the selection immediately
//     // For Agents, automatically include 'status' field even if not visible
//     let finalSelection = [...newSelectedGroupBy];
//     if (isAgent && !finalSelection.includes('status')) {
//       finalSelection = ['status', ...finalSelection];
//     }

//     // Apply immediately
//     if (onGroupByArrayChange) {
//       // Use the new array-based handler for multiple selections
//       onGroupByArrayChange(finalSelection);
//     } else if (onGroupByChange) {
//       // Fall back to single value for backward compatibility
//       onGroupByChange(finalSelection.length === 0 ? undefined : finalSelection[0]);
//     }
//   };

//   // // Function to apply the selected group by (calls the API)
//   // const handleApplyGroupBy = () => {
//   //   // For Agents, automatically include 'status' field even if not visible
//   //   let finalSelection = [...tempSelectedGroupBy];
//   //   if (isAgent && !finalSelection.includes('status')) {
//   //     finalSelection = ['status', ...finalSelection];
//   //   }

//   //   if (onGroupByArrayChange) {
//   //     // Use the new array-based handler for multiple selections
//   //     onGroupByArrayChange(finalSelection);
//   //   } else if (onGroupByChange) {
//   //     // Fall back to single value for backward compatibility
//   //     onGroupByChange(finalSelection.length === 0 ? undefined : finalSelection[0]);
//   //   }
//   // };

//   // Function to handle filter visibility change
//   const handleFilterVisibilityChange = (key: string, isVisible: boolean) => {
//     // For Agents, prevent hiding the Status field
//     if (isAgent && key === 'status' && !isVisible) {
//       return; // Don't allow Agents to hide Status field
//     }

//     setVisibleFilters((prev) => ({ ...prev, [key]: isVisible }));
//   };

//   // Function to handle order changes from DraggableDropdown
//   const handleOrderChange = (orderedFilters: any[]) => {
//     // Convert the ordered filters back to GroupOption format
//     const newReorderedOptions = orderedFilters.map((filter) => ({
//       key: filter.key,
//       label: filter.label,
//       type: 'string', // Default type
//     }));
//     setReorderedOptions(newReorderedOptions);
//   };

//   // Function to handle cancel button
//   const handleCancel = () => {
//     // Clear localStorage to reset DraggableDropdown state
//     localStorage.removeItem('filter-visibility-groupBy');
//     localStorage.removeItem('filter-order-groupBy');

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
//       localStorage.setItem('filter-visibility-groupBy', JSON.stringify(visibleFilters));

//       // Save order changes
//       const order = reorderedOptions.map((option) => option.key);
//       localStorage.setItem('filter-order-groupBy', JSON.stringify(order));

//       // Update original values
//       setOriginalVisibleFilters(visibleFilters);
//       setOriginalReorderedOptions(reorderedOptions);
//       setHasChanges(false);
//     } catch {
//       // Failed to save filter changes
//     }

//     // Exit edit mode
//     if (onExitEditMode) {
//       onExitEditMode();
//     }
//   };

//   // Get selection info for footer
//   // const getSelectionInfo = () => {
//   //   // For Agents, always include 'status' in the count and display
//   //   const effectiveSelection = isAgent
//   //     ? ['status', ...tempSelectedGroupBy.filter((item) => item !== 'status')]
//   //     : tempSelectedGroupBy;

//   //   if (effectiveSelection.length === 0) {
//   //     return 'No filter selected (Max: 5 items)';
//   //   }

//   //   if (effectiveSelection.length === 1) {
//   //     const currentOption = Array.isArray(groupOptionsData?.data)
//   //       ? groupOptionsData?.data.find((option) => option.key === effectiveSelection[0])
//   //       : undefined;
//   //     const label = currentOption ? currentOption.label : 'Unknown Filter';

//   //     if (effectiveSelection[0] !== currentSelectedGroupBy[0]) {
//   //       return `Preview: ${label} (${effectiveSelection.length}/5)`;
//   //     }

//   //     return `Applied: ${label} (${effectiveSelection.length}/5)`;
//   //   }

//   //   // Multiple selections
//   //   const labels = effectiveSelection.map((key) => {
//   //     const option = Array.isArray(groupOptionsData?.data)
//   //       ? groupOptionsData?.data.find((opt) => opt.key === key)
//   //       : undefined;
//   //     return option ? option.label : key;
//   //   });

//   //   const isApplied = effectiveSelection[0] === currentSelectedGroupBy[0];
//   //   const prefix = isApplied ? 'Applied' : 'Preview';

//   //   return `${prefix}: ${labels.join(' > ')} (${effectiveSelection.length}/5)`;
//   // };

//   // Convert group options to the format expected by DraggableDropdown
//   const getDraggableFilters = () => {
//     // Filter out 'status' option for Agents and 'project' option if hideProjectOption is true
//     let filteredOptions = reorderedOptions;

//     if (isAgent) {
//       filteredOptions = filteredOptions.filter((option) => option.key !== 'status');
//     }

//     if (hideProjectOption) {
//       filteredOptions = filteredOptions.filter((option) => option.key !== 'project');
//     }

//     return (
//       filteredOptions.map((option) => {
//         // Explicitly check if the option is visible
//         // If not in visibleFilters yet, use default visibility based on DEFAULT_VISIBLE_OPTIONS
//         const isVisible = visibleFilters[option.key] !== undefined
//           ? visibleFilters[option.key] === true
//           : DEFAULT_VISIBLE_OPTIONS.includes(option.key);

//         return {
//           key: option.key,
//           label: option.label,
//           value: option.key,
//           isVisible,
//         };
//       }) || []
//     );
//   };

//   // Get visible filters for clean view (non-edit mode)
//   const getVisibleFilters = () => {
//     // Filter out 'status' option for Agents and 'project' option if hideProjectOption is true
//     let filteredOptions = reorderedOptions;

//     if (isAgent) {
//       filteredOptions = filteredOptions.filter((option) => option.key !== 'status');
//     }

//     if (hideProjectOption) {
//       filteredOptions = filteredOptions.filter((option) => option.key !== 'project');
//     }

//     return filteredOptions
//       .map((option) => ({
//         key: option.key,
//         label: option.label,
//         value: option.key,
//         isVisible: visibleFilters[option.key] !== false,
//       }))
//       .filter((filter) => filter.isVisible);
//   };

//   if (isLoading) {
//     return <GroupByFilterShimmer />;
//   }

//   // Clean view (non-edit mode)
//   if (!isEditMode) {
//     const visibleFiltersList = getVisibleFilters();

//     return (
//       <div className="w-full">
//         <div className="space-y-0">
//           {/* Clean filter list */}
//           {visibleFiltersList.map((filter) => {
//             const isSelected = tempSelectedGroupBy.includes(filter.value as string);
//             const hasAgentInDynamicFilters = dynamicFilters.some((f) => f.field === 'agent');
//             const hasLastTransferInDynamicFilters = dynamicFilters.some(
//               (f) => f.field === 'last_transfer'
//             );

//             const isDisabled =
//               (isAgent && filter.value === 'status' && isSelected) ||
//               (filter.value === 'last_transfer' &&
//                 (tempSelectedGroupBy.includes('agent') || hasAgentInDynamicFilters)) ||
//               (filter.value === 'agent' &&
//                 (tempSelectedGroupBy.includes('last_transfer') || hasLastTransferInDynamicFilters));

//             return (
//               <button
//                 key={filter.key}
//                 onClick={() => handleTempGroupBySelect(filter.value as string)}
//                 disabled={isDisabled}
//                 className={`w-full px-2 py-1.5 text-left text-sm rounded transition-colors ${
//                   isSelected
//                     ? 'font-medium text-gray-900'
//                     : isDisabled
//                       ? 'cursor-not-allowed text-gray-400 opacity-50'
//                       : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
//                 }`}
//                 title={
//                   isDisabled &&
//                   filter.value === 'last_transfer' &&
//                   (tempSelectedGroupBy.includes('agent') || hasAgentInDynamicFilters)
//                     ? hasAgentInDynamicFilters
//                       ? 'Cannot select "Last Transfer" when "Agent" is selected in dynamic filters'
//                       : 'Cannot select "Last Transfer" when "Agent" is selected'
//                     : isDisabled &&
//                         filter.value === 'agent' &&
//                         (tempSelectedGroupBy.includes('last_transfer') ||
//                           hasLastTransferInDynamicFilters)
//                       ? hasLastTransferInDynamicFilters
//                         ? 'Cannot select "Agent" when "Last Transfer" is selected in dynamic filters'
//                         : 'Cannot select "Agent" when "Last Transfer" is selected'
//                       : undefined
//                 }
//               >
//                 <div className="flex items-center justify-between">
//                   <span className="truncate">{filter.label}</span>
//                   {isSelected && <ApolloIcon name="check" className="text-sm text-blue-600" />}
//                 </div>
//               </button>
//             );
//           })}
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
//       onFilterSelect={(value) => handleTempGroupBySelect(value as string)}
//       selectedValue={tempSelectedGroupBy.length > 0 ? tempSelectedGroupBy[0] : undefined}
//       selectedValues={tempSelectedGroupBy}
//       filterType="groupBy"
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
