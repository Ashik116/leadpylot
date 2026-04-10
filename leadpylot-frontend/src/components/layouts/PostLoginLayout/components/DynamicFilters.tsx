// /*
//  * ============================================================================
//  * OLD COMPONENT - REPLACED BY CustomFilterOption.tsx
//  * ============================================================================
//  * This component has been replaced by:
//  * @frontend/src/components/groupAndFiltering/CustomFilterOption.tsx
//  *
//  * The new component uses:
//  * - useMetadataOptions hook (GET /api/metadata/options/{Entity})
//  * - useUniversalGroupingFilterStore (Zustand store)
//  * - New GET-based API system with domain filters format: [[field, operator, value]]
//  *
//  * DO NOT USE THIS COMPONENT - Use CustomFilterOption instead
//  * ============================================================================
//  */

// 'use client';
// // OLD IMPORTS - COMMENTED OUT
// // import Button from '@/components/ui/Button';
import DatePicker from '@/components/ui/DatePicker';
import Input from '@/components/ui/Input';
// // import Select from '@/components/ui/Select';
// // import { useApplyDynamicFilters, useDynamicFilterOptions } from '@/services/hooks/useLeads';
// // import { FilterRule, useFilterChainStore } from '@/stores/filterChainStore';
// // import { useDynamicFiltersStore } from '@/stores/dynamicFiltersStore';
// // import { useFilterAwareLeadsNavigationStore } from '@/stores/navigationStores';
// // import { useApiUrlStore } from '@/stores/apiUrlStore';
// // import React, { useState, useEffect, useRef, useMemo, startTransition } from 'react';
// // import dayjs from 'dayjs';
// // import DynamicFiltersShimmer from '@/components/shared/loaders/DynamicFiltersShimmer';
// const emptyRule = { field: '', operator: '', value: '' as any };
// const BUTTON_REMOVE = 'plain';
// const BUTTON_ADD = 'plain';
// const BUTTON_APPLY = 'solid';

// // OLD COMPONENT - DO NOT USE
// const DynamicFilters_OLD_DO_NOT_USE = ({
//   onApply,
//   buildApiFilters,
//   selectedGroupByArray,
// }: {
//   onApply?: (data: any) => void;
//   buildApiFilters?: () => any[];
//   selectedGroupByArray?: string[];
//   // New props for external edit mode control
//   isEditMode?: boolean;
//   onExitEditMode?: () => void;
// }) => {
//   // Helper function to deduplicate filters
//   // For same field+operator, keep only the latest value (process in reverse to keep last occurrence)
//   const deduplicateFilters = (filters: any[]): any[] => {
//     const seen = new Set<string>();
//     const result: any[] = [];

//     // Process filters in reverse order to keep the last occurrence of duplicates
//     for (let i = filters.length - 1; i >= 0; i--) {
//       const filter = filters[i];
//       if (!filter || !filter.field) continue;

//       // Create a key based on field+operator only (not value) to handle value changes
//       // This ensures if same field+operator appears multiple times, only the latest value is kept
//       const filterKey = `${filter.field}|${filter.operator}`;

//       // Only add if we haven't seen this field+operator combination before
//       // This ensures latest value wins for same field+operator
//       if (!seen.has(filterKey)) {
//         seen.add(filterKey);
//         result.unshift(filter); // Add to beginning to maintain order
//       }
//     }

//     return result;
//   };

//   // Helper function to convert date strings back to Date objects
//   const convertDateStringsToDates = (rules: Array<{ field: string; operator: string; value: any }>, fields: any) => {
//     return rules.map((rule) => {
//       if (!rule.field || !rule.operator) return rule;

//       const isDate = fields[rule.field]?.type === 'date' || rule.field.includes('date') || rule.field.includes('_at');
//       const isRange = rule.operator === 'between' || rule.operator === 'not_between';

//       if (isDate && isRange && Array.isArray(rule.value) && rule.value.length === 2) {
//         // Convert date range strings to Date objects
//         const convertToDate = (val: any): Date | null => {
//           if (!val) return null;
//           if (val instanceof Date) {
//             // Check if date is valid
//             return isNaN(val.getTime()) ? null : val;
//           }
//           if (typeof val === 'string') {
//             const date = new Date(val);
//             // Check if date is valid
//             return isNaN(date.getTime()) ? null : date;
//           }
//           return null;
//         };

//         return {
//           ...rule,
//           value: [convertToDate(rule.value[0]), convertToDate(rule.value[1])],
//         };
//       } else if (isDate && !isRange && rule.value) {
//         // Convert single date string to Date object
//         if (rule.value instanceof Date) {
//           // Check if date is valid
//           return {
//             ...rule,
//             value: isNaN(rule.value.getTime()) ? null : rule.value,
//           };
//         }
//         if (typeof rule.value === 'string') {
//           const date = new Date(rule.value);
//           return {
//             ...rule,
//             value: isNaN(date.getTime()) ? null : date,
//           };
//         }
//       }

//       return rule;
//     });
//   };

//   const [rules, setRules] = useState<Array<{ field: string; operator: string; value: any }>>(() => {
//     // Always return default on initial render to avoid SSR/client mismatch
//     return [{ ...emptyRule }];
//   });

//   // Load from localStorage after component mounts (client-side only)
//   // IMPORTANT: Only load from localStorage which contains ONLY custom filters
//   // sessionStorage contains complete filter body (defaults + custom) for API calls only
//   // We don't load from sessionStorage to avoid circular dependency with buildApiFilters
//   useEffect(() => {
//     if (typeof window !== 'undefined') {
//       try {
//         // Load ONLY custom filters from localStorage (user-added filters)
//         // localStorage never contains default filters, so no need to separate them
//         const savedFilters = localStorage.getItem('dynamicFilters');
//         if (savedFilters) {
//           const parsedFilters = JSON.parse(savedFilters);
//           if (Array.isArray(parsedFilters) && parsedFilters.length > 0) {
//             // Deduplicate filters (keep only latest for same field+operator)
//             const deduplicatedFilters = deduplicateFilters(parsedFilters);

//             // Set rules from localStorage (dates will be converted in the fields useEffect)
//             startTransition(() => {
//               setRules(deduplicatedFilters);
//             });
//           }
//         }
//       } catch {
//         // Silent fail
//       }
//     }
//   }, []);
//   const [error, setError] = useState<string | null>(null);
//   const [rangeErrors, setRangeErrors] = useState<Record<number, string>>({});

//   // Track if date conversion has been performed to prevent infinite loops
//   const dateConversionDoneRef = useRef<Set<string>>(new Set());

//   // Fetch filter options using the hook
//   const {
//     data: filterOptions,
//     isLoading: fieldsLoading,
//     error: fieldsError,
//   } = useDynamicFilterOptions();
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

//   // Add filter chaining functionality - like StatusFilter
//   const { setDynamicFilters } = useFilterChainStore();

//   // Add navigation store for updating filtered items
//   const { setFilteredItems, setFilterState } = useFilterAwareLeadsNavigationStore();

//   // Store buildApiFilters and rules in refs so refetch function can access them
//   const buildApiFiltersRef = useRef(buildApiFilters);
//   const rulesRef = useRef(rules);

//   // Update refs when they change
//   useEffect(() => {
//     buildApiFiltersRef.current = buildApiFilters;
//   }, [buildApiFilters]);

//   useEffect(() => {
//     rulesRef.current = rules;
//   }, [rules]);

//   // Get group by selections from props

//   // Prepare fields and operatorLabels from API response
//   const fields = useMemo(() => filterOptions?.data.fields || {}, [filterOptions?.data.fields]);
//   const operatorLabels = filterOptions?.data.operators || {};

//   // Convert date strings to Date objects when fields are loaded or rules change
//   useEffect(() => {
//     // Only convert if we have fields loaded and rules exist (and not just empty rule)
//     if (fields && Object.keys(fields).length > 0 && rules.length > 0 && rules.some(r => r.field && r.operator)) {
//       // Create a signature for the current rules state to check if we've already converted
//       const rulesSignature = JSON.stringify(rules.map(r => ({ field: r.field, operator: r.operator, valueType: typeof r.value })));

//       // Skip if we've already converted this exact state
//       if (dateConversionDoneRef.current.has(rulesSignature)) {
//         return;
//       }

//       // Check if any rule has date strings that need conversion
//       const needsConversion = rules.some((rule) => {
//         if (!rule.field || !rule.operator) return false;
//         const isDate = fields[rule.field]?.type === 'date' || rule.field.includes('date') || rule.field.includes('_at');
//         const isRange = rule.operator === 'between' || rule.operator === 'not_between';

//         if (isDate && isRange && Array.isArray(rule.value) && rule.value.length === 2) {
//           // Check if values are strings (not Date objects) or invalid dates
//           const val0 = rule.value[0];
//           const val1 = rule.value[1];
//           return (
//             (typeof val0 === 'string' && val0) ||
//             (typeof val1 === 'string' && val1) ||
//             (val0 instanceof Date && isNaN(val0.getTime())) ||
//             (val1 instanceof Date && isNaN(val1.getTime()))
//           );
//         } else if (isDate && !isRange && rule.value) {
//           // Check if it's a string or invalid date
//           return (
//             typeof rule.value === 'string' ||
//             (rule.value instanceof Date && isNaN(rule.value.getTime()))
//           );
//         }
//         return false;
//       });

//       if (needsConversion) {
//         const convertedRules = convertDateStringsToDates(rules, fields);
//         // Only update if conversion actually changed something
//         const hasChanges = convertedRules.some((convertedRule, idx) => {
//           const originalRule = rules[idx];
//           if (!originalRule) return false;

//           // Compare dates - check if values are different
//           if (Array.isArray(convertedRule.value) && Array.isArray(originalRule.value)) {
//             // Helper to safely get time value
//             const getTimeValue = (val: any): number | null => {
//               if (!val) return null;
//               if (val instanceof Date) return val.getTime();
//               if (typeof val === 'string') {
//                 const date = new Date(val);
//                 return isNaN(date.getTime()) ? null : date.getTime();
//               }
//               return null;
//             };

//             const val0Time = getTimeValue(convertedRule.value[0]);
//             const val1Time = getTimeValue(convertedRule.value[1]);
//             const origVal0Time = getTimeValue(originalRule.value[0]);
//             const origVal1Time = getTimeValue(originalRule.value[1]);

//             return val0Time !== origVal0Time || val1Time !== origVal1Time;
//           }
//           if (convertedRule.value instanceof Date && originalRule.value instanceof Date) {
//             return convertedRule.value.getTime() !== originalRule.value.getTime();
//           }
//           // For non-date values or mixed types, do simple comparison
//           return JSON.stringify(convertedRule.value) !== JSON.stringify(originalRule.value);
//         });

//         if (hasChanges) {
//           // Mark this signature as converted before updating
//           dateConversionDoneRef.current.add(rulesSignature);
//           // This is necessary to convert date strings to Date objects
//           startTransition(() => {
//             setRules(convertedRules);
//           });
//         } else {
//           // Even if no changes, mark as processed to avoid re-checking
//           dateConversionDoneRef.current.add(rulesSignature);
//         }
//       } else {
//         // No conversion needed, mark as processed
//         dateConversionDoneRef.current.add(rulesSignature);
//       }
//     }
//   }, [fields, rules]);

//   // Check if we're on a project details page by checking if buildApiFilters includes project/agent filters
//   const isProjectPage = buildApiFilters
//     ? (() => {
//         try {
//           const defaultFilters = buildApiFilters();
//           return defaultFilters.some(
//             (filter) => filter.field === 'project' || filter.field === 'agent'
//           );
//         } catch {
//           return false;
//         }
//       })()
//     : false;

//   // Check for global mutual exclusivity: if "agent" or "last_transfer" is selected in group by filters
//   const hasAgentInGroupBy = selectedGroupByArray?.includes('agent') || false;
//   const hasLastTransferInGroupBy = selectedGroupByArray?.includes('last_transfer') || false;

//   // Filter out project and agent fields if we're on a project page
//   const filteredFields = isProjectPage
//     ? Object.fromEntries(
//         Object.entries(fields).filter(
//           ([fieldName]) => fieldName !== 'project' && fieldName !== 'agent'
//         )
//       )
//     : fields;

//   // Apply global mutual exclusivity: hide conflicting fields based on group by selections
//   const availableFields = Object.fromEntries(
//     Object.entries(filteredFields).filter(([fieldName]) => {
//       // If "agent" is selected in group by, hide "last_transfer" from dynamic filters
//       if (hasAgentInGroupBy && fieldName === 'last_transfer') {
//         return false;
//       }
//       // If "last_transfer" is selected in group by, hide "agent" from dynamic filters
//       if (hasLastTransferInGroupBy && fieldName === 'agent') {
//         return false;
//       }
//       return true;
//     })
//   );

//   // Helper functions for field types and values
//   const isDateField = (field: string) => {
//     return fields[field]?.type === 'date' || field.includes('date') || field.includes('_at');
//   };

//   const isNumericField = (field: string) => {
//     return fields[field]?.type === 'number' || fields[field]?.type === 'integer';
//   };

//   const isRangeOperator = (operator: string) => {
//     return operator === 'between';
//   };

//   const formatDateForAPI = (date: Date | null) => {
//     return date ? dayjs(date).format('YYYY-MM-DD') : null;
//   };

//   const formatValueForAPI = (field: string, operator: string, value: any) => {
//     if (!value) return '';

//     if (isRangeOperator(operator)) {
//       // For range operators, value should be an array
//       if (Array.isArray(value) && value.length === 2) {
//         if (isDateField(field)) {
//           return [formatDateForAPI(value[0]), formatDateForAPI(value[1])];
//         } else if (isNumericField(field)) {
//           return [Number(value[0]) || 0, Number(value[1]) || 0];
//         }
//         return value;
//       }
//       return [];
//     } else {
//       // For single operators
//       if (isDateField(field)) {
//         return formatDateForAPI(value);
//       } else if (isNumericField(field)) {
//         return Number(value) || 0;
//       }
//       return value;
//     }
//   };

//   const handleFieldChange = (idx: number, field: string) => {
//     const ops = fields[field]?.operators || [];
//     setRules((rules) =>
//       rules.map((r, i) =>
//         i === idx
//           ? {
//               field,
//               operator: ops[0] || '',
//               value: '',
//             }
//           : r
//       )
//     );
//   };

//   const handleOperatorChange = (idx: number, operator: string) => {
//     setRules((rules) => rules.map((r, i) => (i === idx ? { ...r, operator } : r)));

//     // Clear range error if operator is no longer a range operator
//     const rule = rules[idx];
//     if (rule && isNumericField(rule.field) && !isRangeOperator(operator)) {
//       setRangeErrors((prev) => {
//         const newErrors = { ...prev };
//         delete newErrors[idx];
//         return newErrors;
//       });
//     }
//   };

//   const handleValueChange = (idx: number, value: any) => {
//     setRules((rules) => {
//       const updatedRules = rules.map((r, i) => (i === idx ? { ...r, value } : r));
//       const rule = updatedRules[idx];

//       // Validate range values for numeric fields with "between" operator
//       if (rule && isNumericField(rule.field) && isRangeOperator(rule.operator)) {
//         // Validate immediately with the new value
//         validateRangeValue(idx, value);
//       } else {
//         // Clear range error if not a range operator
//         setRangeErrors((prev) => {
//           const newErrors = { ...prev };
//           delete newErrors[idx];
//           return newErrors;
//         });
//       }

//       return updatedRules;
//     });
//   };

//   // Validate that Min <= Max for range inputs
//   const validateRangeValue = (idx: number, value: any) => {
//     if (Array.isArray(value) && value.length === 2) {
//       const min = value[0];
//       const max = value[1];

//       // Only validate if both values are provided and are valid numbers
//       if (min !== '' && max !== '' && min !== null && max !== null && min !== undefined && max !== undefined) {
//         const minNum = Number(min);
//         const maxNum = Number(max);

//         if (!isNaN(minNum) && !isNaN(maxNum)) {
//           if (minNum > maxNum) {
//             setRangeErrors((prev) => ({
//               ...prev,
//               [idx]: 'Min value cannot be greater than Max value',
//             }));
//             return false;
//           }
//         }
//       }
//     }

//     // Clear error if validation passes
//     setRangeErrors((prev) => {
//       const newErrors = { ...prev };
//       delete newErrors[idx];
//       return newErrors;
//     });
//     return true;
//   };

//   const addRule = () => {
//     const firstField = Object.keys(availableFields)[0];
//     setRules((rules) => [
//       ...rules,
//       {
//         field: firstField,
//         operator: availableFields[firstField]?.operators[0] || '',
//         value: '',
//       },
//     ]);
//   };
//   const removeRule = (idx: number) => {
//     let newRules: typeof rules;

//     if (rules.length === 1) {
//       // If only one rule, reset it to empty instead of removing
//       newRules = [{ ...emptyRule }];
//       setRules(newRules);
//     } else {
//       // Remove the specific rule
//       newRules = rules.filter((_, i) => i !== idx);
//       setRules(newRules);
//     }

//     // Clear range error for removed rule and reindex remaining errors
//     setRangeErrors((prev) => {
//       const newErrors: Record<number, string> = {};
//       Object.keys(prev).forEach((key) => {
//         const keyNum = Number(key);
//         if (keyNum < idx) {
//           // Keep errors for rules before the removed one
//           newErrors[keyNum] = prev[keyNum];
//         } else if (keyNum > idx) {
//           // Reindex errors for rules after the removed one
//           newErrors[keyNum - 1] = prev[keyNum];
//         }
//         // Skip the error for the removed rule (keyNum === idx)
//       });
//       return newErrors;
//     });

//     // Get current dynamic filters from filter chain store
//     const currentDynamicFilters = useFilterChainStore.getState().dynamicFilters;

//     const ruleToRemove = rules[idx];
//     if (
//       ruleToRemove &&
//       ruleToRemove.field &&
//       ruleToRemove.operator &&
//       ruleToRemove.value !== undefined
//     ) {
//       const formattedRuleToRemove = {
//         field: ruleToRemove.field,
//         operator: ruleToRemove.operator,
//         value: formatValueForAPI(ruleToRemove.field, ruleToRemove.operator, ruleToRemove.value),
//       };

//       // Remove only the matching rule from dynamic filters
//       const updatedDynamicFilters = currentDynamicFilters.filter(
//         (filter) =>
//           !(
//             filter.field === formattedRuleToRemove.field &&
//             filter.operator === formattedRuleToRemove.operator &&
//             JSON.stringify(filter.value) === JSON.stringify(formattedRuleToRemove.value)
//           )
//       );

//       setDynamicFilters(updatedDynamicFilters);
//     } else {
//       // If the rule was empty, just clear all dynamic filters
//       setDynamicFilters([]);
//     }

//     // Save updated rules to localStorage immediately
//     saveFiltersToStorage(newRules);

//     // Clear any previous error when removing rules
//     setError(null);
//   };

//   // Save only non-empty filters to localStorage
//   const saveFiltersToStorage = (filters: any[]) => {
//     // Only run on client side
//     if (typeof window === 'undefined') {
//       return;
//     }

//     try {
//       // Filter out empty rules (where field, operator, or value is undefined)
//       const nonEmptyFilters = filters.filter(
//         (filter) => filter.field && filter.operator && filter.value !== undefined
//       );

//       if (nonEmptyFilters.length > 0) {
//         localStorage.setItem('dynamicFilters', JSON.stringify(nonEmptyFilters));
//       } else {
//         localStorage.removeItem('dynamicFilters');
//       }
//     } catch {
//       // Silent fail
//     }
//   };

//   // Function to handle comprehensive clear (same as other filter components)
//   const handleComprehensiveClear = () => {
//     try {
//       // 1. Clear ALL localStorage filter data
//       localStorage.removeItem('dynamicFilters'); // DynamicFilters saved rules
//       localStorage.removeItem('filter-visibility-import'); // FilterByImport visibility
//       localStorage.removeItem('filter-visibility-status'); // StatusFilter visibility
//       // localStorage.removeItem('filter-visibility-groupBy'); // GroupByFilter visibility

//       // 2. Clear ALL global filter chain store states
//       setDynamicFilters([]); // Clear dynamic filters

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
//       setRules([{ ...emptyRule }]);
//       setError(null);

//       // 5. Clear navigation store
//       setFilteredItems([]);
//       setFilterState(null);
//     } catch {
//       // Silent fail
//     }
//   };

//   const handleApply = async () => {
//     setError(null);

//     // Validate all range inputs before applying
//     let hasRangeErrors = false;
//     rules.forEach((rule, idx) => {
//       if (isNumericField(rule.field) && isRangeOperator(rule.operator)) {
//         if (!validateRangeValue(idx, rule.value)) {
//           hasRangeErrors = true;
//         }
//       }
//     });

//     if (hasRangeErrors) {
//       setError('Please fix range validation errors before applying filters');
//       return;
//     }

//     setLoading(true);

//     // CRITICAL: Get default filters WITHOUT dynamicFilters to avoid circular dependency
//     // Temporarily clear dynamicFilters, get defaults, then restore
//     const filterChainStore = useFilterChainStore.getState();
//     const previousDynamicFilters = [...filterChainStore.dynamicFilters];
//     const { setDynamicFilters: setStoreDynamicFilters } = useFilterChainStore.getState();

//     let defaultFilters: any[] = [];
//     let formattedRules: any[] = [];
//     let deduplicatedFilters: any[] = [];

//     try {
//       // Temporarily clear dynamicFilters to get clean defaults
//       setStoreDynamicFilters([]);

//       // Get default filters (page-specific, import, status, project) WITHOUT dynamicFilters
//       // CRITICAL: Read importFilter and statusFilter directly from store to ensure we get the latest values
//       const currentStoreState = useFilterChainStore.getState();
//       const currentImportFilter = currentStoreState.importFilter;
//       const currentStatusFilter = currentStoreState.statusFilter;

//       defaultFilters = buildApiFilters ? buildApiFilters() : [];

//       // CRITICAL FIX: Ensure importFilter is included even if buildApiFilters hasn't been updated yet
//       // Check if importFilter exists in store but not in defaultFilters
//       if (currentImportFilter && !defaultFilters.some(f => f.field === 'duplicate_status')) {
//         defaultFilters.push(currentImportFilter);
//       }

//       // Also ensure statusFilter is included
//       if (currentStatusFilter && !defaultFilters.some(f => f.field === 'status')) {
//         defaultFilters.push(currentStatusFilter);
//       }

//       // Format custom rules for API (only non-empty rules)
//       formattedRules = rules
//         .filter((rule) => rule.field && rule.operator && rule.value !== undefined && rule.value !== '')
//         .map((rule) => ({
//           field: rule.field,
//           operator: rule.operator,
//           value: formatValueForAPI(rule.field, rule.operator, rule.value),
//         }));

//       // Build final filter body with default filters and formatted custom rules
//       // Put default filters first, then custom rules
//       const finalFilterBody: any[] = [...defaultFilters, ...formattedRules];

//       // Deduplicate filters to prevent sending duplicates to API
//       // This ensures if same field+operator exists in both default and custom, custom wins (latest)
//       deduplicatedFilters = deduplicateFilters(finalFilterBody);
//     } finally {
//       // Always restore previous dynamicFilters (they'll be replaced with new ones below)
//       setStoreDynamicFilters(previousDynamicFilters);
//     }

//     // Store the complete filter body in global filter chain store (including page-specific filters)
//     const filterBodyAsFilterRules: FilterRule[] = deduplicatedFilters.map((filter: any) => ({
//       field: filter.field,
//       operator: filter.operator,
//       value: filter.value,
//     }));
//     setDynamicFilters(filterBodyAsFilterRules);

//     // Create refetch function for pagination
//     // CRITICAL: This function rebuilds filters each time to include updated importFilter/statusFilter
//     const refetchWithPagination = async (page = 1, pageSize = 50) => {
//       try {
//         setLoading(true);

//         // Rebuild filters each time to include updated importFilter/statusFilter from filter chain store
//         const filterChainStore = useFilterChainStore.getState();
//         const previousDynamicFilters = [...filterChainStore.dynamicFilters];
//         const { setDynamicFilters: setStoreDynamicFilters } = useFilterChainStore.getState();

//         let rebuiltDefaultFilters: any[] = [];
//         let rebuiltFormattedRules: any[] = [];
//         let rebuiltDeduplicatedFilters: any[] = [];

//         try {
//           // Temporarily clear dynamicFilters to get clean defaults (including updated importFilter)
//           setStoreDynamicFilters([]);

//           // Get default filters (page-specific, import, status, project) WITHOUT dynamicFilters
//           // This will include the updated importFilter if FilterByImport was applied
//           // CRITICAL: Read importFilter and statusFilter directly from store to ensure we get the latest values
//           // This ensures FilterByImport changes are immediately reflected when refetching
//           const currentStoreState = useFilterChainStore.getState();
//           const currentImportFilter = currentStoreState.importFilter;
//           const currentStatusFilter = currentStoreState.statusFilter;

//           // Call buildApiFilters, but it should read from store which has the latest importFilter
//           // However, to be safe, we'll also manually ensure importFilter is included if buildApiFilters doesn't
//           rebuiltDefaultFilters = buildApiFiltersRef.current ? buildApiFiltersRef.current() : [];

//           // CRITICAL FIX: Ensure importFilter is included even if buildApiFilters hasn't been updated yet
//           // Check if importFilter exists in store but not in rebuiltDefaultFilters
//           if (currentImportFilter && !rebuiltDefaultFilters.some(f => f.field === 'duplicate_status')) {
//             rebuiltDefaultFilters.push(currentImportFilter);
//           }

//           // Also ensure statusFilter is included
//           if (currentStatusFilter && !rebuiltDefaultFilters.some(f => f.field === 'status')) {
//             rebuiltDefaultFilters.push(currentStatusFilter);
//           }

//           // Format current custom rules for API (only non-empty rules)
//           rebuiltFormattedRules = rulesRef.current
//             .filter((rule) => rule.field && rule.operator && rule.value !== undefined && rule.value !== '')
//             .map((rule) => ({
//               field: rule.field,
//               operator: rule.operator,
//               value: formatValueForAPI(rule.field, rule.operator, rule.value),
//             }));

//           // Build final filter body with default filters and formatted custom rules
//           const rebuiltFinalFilterBody: any[] = [...rebuiltDefaultFilters, ...rebuiltFormattedRules];

//           // Deduplicate filters to prevent sending duplicates to API
//           rebuiltDeduplicatedFilters = deduplicateFilters(rebuiltFinalFilterBody);

//           // Update filter chain store with rebuilt filters (including updated importFilter)
//           const rebuiltFilterBodyAsFilterRules: FilterRule[] = rebuiltDeduplicatedFilters.map((filter: any) => ({
//             field: filter.field,
//             operator: filter.operator,
//             value: filter.value,
//           }));
//           setDynamicFilters(rebuiltFilterBodyAsFilterRules);
//         } finally {
//           // Always restore previous dynamicFilters (they've been replaced above)
//           setStoreDynamicFilters(previousDynamicFilters);
//         }

//         const result = await applyDynamicFilters.mutateAsync({
//           filters: rebuiltDeduplicatedFilters,
//           page,
//           limit: pageSize,
//           sortBy: sortBy || undefined,
//           sortOrder: sortOrder || undefined,
//         });

//         // Update store with filtered results and pagination info
//         setDynamicFilterResults(result.data || []);

//         // Handle dynamic filter response structure with nested pagination
//         const dynamicFilterResult = result as any;
//         const pagination = dynamicFilterResult.meta?.pagination;
//         setTotal(
//           pagination?.total || dynamicFilterResult.totalFiltered || 0
//         );
//         setPage(pagination?.page || page);
//         setPageSize(
//           pagination?.limit ||
//             pagination?.currentPageSize ||
//             pageSize
//         );
//         setHasNextPage(pagination?.hasNextPage || false);
//         setHasPrevPage(pagination?.hasPrevPage || false);
//         setLoading(false);

//         // CRITICAL: Update navigation store with current page data and pagination metadata
//         // This ensures filteredItems has the correct page data for handleRowClick
//         const { setFilteredItems, setFilterState } = useFilterAwareLeadsNavigationStore.getState();
//         const paginationMeta = pagination
//           ? {
//               page: pagination.page || page,
//               limit: pagination.limit || pageSize,
//               total: pagination.total || 0,
//               pages: Math.ceil((pagination.total || 0) / (pagination.limit || pageSize)),
//             }
//           : undefined;

//         setFilteredItems(result.data || [], paginationMeta);
//         setFilterState({
//           isDynamicFilterMode: true,
//           dynamicFilters: rebuiltDeduplicatedFilters,
//           isGroupedMode: false,
//           paginationMeta,
//           apiUrl: '/dynamic-filters/apply',
//           sortBy: sortBy ?? undefined,
//           sortOrder: sortOrder ?? undefined,
//         });

//         // Update sessionStorage with current page number and rebuilt filters
//         try {
//           const currentPage = pagination?.page || page;
//           const currentLimit = pagination?.limit || pageSize;
//           sessionStorage.setItem('dynamic-filters-body', JSON.stringify({
//             filters: rebuiltDeduplicatedFilters,
//             page: currentPage,
//             limit: currentLimit,
//             ...(sortBy && { sortBy }),
//             ...(sortOrder && { sortOrder }),
//           }));
//         } catch {
//           // Silent fail
//         }
//       } catch {
//         setLoading(false);
//       }
//     };

//     // Set the refetch function in the store
//     setRefetchFunction(refetchWithPagination);

//     applyDynamicFilters.mutate(
//       {
//         filters: deduplicatedFilters,
//         page: 1,
//         limit: 50,
//         sortBy: sortBy || undefined,
//         sortOrder: sortOrder || undefined,
//       },
//       {
//         onSuccess: async (data) => {
//           // Update store with filtered results
//           setDynamicFilterMode(true);
//           setDynamicFilterResults(data.data || []);
//           setDynamicFilterQuery(deduplicatedFilters); // Complete filter query (including default filters)
//           setCustomFilters(formattedRules); // Only custom/user-added filters

//           // Handle dynamic filter response structure with nested pagination
//           const dynamicFilterData = data as any;
//           setTotal(
//             dynamicFilterData.meta?.pagination?.total || dynamicFilterData.totalFiltered || 0
//           );
//           setPage(dynamicFilterData.meta?.pagination?.page || 1);
//           setPageSize(
//             dynamicFilterData.meta?.pagination?.limit ||
//               dynamicFilterData.meta?.pagination?.currentPageSize ||
//               50
//           );
//           setHasNextPage(dynamicFilterData.meta?.pagination?.hasNextPage || false);
//           setHasPrevPage(dynamicFilterData.meta?.pagination?.hasPrevPage || false);
//           setFilterSource('custom'); // Set source as custom
//           setLoading(false);

//           // Update navigation store with current page results and pagination metadata
//           // Navigation will handle fetching new pages when needed
//           try {
//             const currentResults = data.data || [];
//             const meta = data.meta;

//             // CRITICAL: Dynamic filters API has nested pagination: meta.pagination.{total, page, limit}
//             const pagination = (meta as any)?.pagination;
//             const paginationMeta = pagination
//               ? {
//                   page: pagination.page || 1,
//                   limit: pagination.limit || 50,
//                   total: pagination.total || 0,
//                   pages: Math.ceil((pagination.total || 0) / (pagination.limit || 50)),
//                 }
//               : undefined;

//             // CRITICAL FIX: Store API endpoint for POST request (no query params!)
//             // /dynamic-filters/apply is a POST API - store endpoint only, body separately
//             const apiUrlToStore = '/dynamic-filters/apply';
//             const { setApiUrl } = useApiUrlStore.getState();
//             setApiUrl(apiUrlToStore);

//             // Store POST request body separately in sessionStorage for page refresh restoration
//             // Update page number dynamically from paginationMeta (not hardcoded to 1)
//             sessionStorage.setItem('dynamic-filters-body', JSON.stringify({
//               filters: deduplicatedFilters,
//               page: paginationMeta?.page || 1,
//               limit: paginationMeta?.limit || 50,
//               ...(sortBy && { sortBy }),
//               ...(sortOrder && { sortOrder }),
//             }));

//             // Update navigation store with current page data and pagination metadata
//             setFilteredItems(currentResults, paginationMeta);
//             setFilterState({
//               isDynamicFilterMode: true,
//               dynamicFilters: deduplicatedFilters,
//               isGroupedMode: false,
//               paginationMeta,
//               apiUrl: apiUrlToStore,
//               sortBy: sortBy ?? undefined,
//               sortOrder: sortOrder ?? undefined,
//             });
//           } catch {
//             // Fallback to current page results
//             const currentResults = data.data || [];
//             const apiUrlToStore = '/dynamic-filters/apply';
//             const { setApiUrl } = useApiUrlStore.getState();
//             setApiUrl(apiUrlToStore);

//             // Store filters even in fallback (use current page from store if available)
//             const navStore = useFilterAwareLeadsNavigationStore.getState();
//             const currentPage = navStore.paginationMeta?.page || 1;
//             const currentLimit = navStore.paginationMeta?.limit || 50;
//             sessionStorage.setItem('dynamic-filters-body', JSON.stringify({
//               filters: deduplicatedFilters,
//               page: currentPage,
//               limit: currentLimit,
//             }));

//             setFilteredItems(currentResults);
//             setFilterState({
//               isDynamicFilterMode: true,
//               dynamicFilters: deduplicatedFilters,
//               isGroupedMode: false,
//               apiUrl: apiUrlToStore,
//             });
//           }

//           // Save filters to localStorage (only non-empty custom rules, excluding defaults)
//           // This ensures localStorage only contains user-defined filters
//           saveFiltersToStorage(formattedRules.map(f => ({
//             field: f.field,
//             operator: f.operator,
//             value: f.value,
//           })));

//           // Call original callback if provided
//           onApply?.(data);
//         },
//         onError: (err: any) => {
//           setLoading(false);
//           setError(err?.message || 'Failed to apply filters');
//         },
//       }
//     );
//   };

//   // Helper for Select options
//   // Include currently selected fields even if they're filtered out from availableFields
//   const getFieldOptions = () => {
//     const availableFieldKeys = Object.keys(availableFields);
//     const selectedFieldKeys = rules
//       .map((rule) => rule.field)
//       .filter((field): field is string => !!field);

//     // Combine available fields with selected fields (to show selected fields even if filtered out)
//     const allFieldKeys = new Set([...availableFieldKeys, ...selectedFieldKeys]);

//     return Array.from(allFieldKeys).map((key) => ({
//       value: key,
//       label: key,
//     }));
//   };
//   const getOperatorOptions = (field: string) => {
//     // First check availableFields, but if field is not there, check original fields
//     // This ensures operators are available even if field was filtered out
//     const fieldConfig = availableFields[field] || fields[field];
//     const operators = fieldConfig?.operators || [];

//     // Also include the currently selected operator if it exists
//     const currentRule = rules.find((r) => r.field === field);
//     const allOperators = new Set(operators);
//     if (currentRule?.operator && !allOperators.has(currentRule.operator)) {
//       allOperators.add(currentRule.operator);
//     }

//     return Array.from(allOperators).map((op: string) => ({
//       value: op,
//       label: operatorLabels[op] || op,
//     }));
//   };
//   const getValueOptions = (field: string) => {
//     // First check availableFields, but if field is not there, check original fields
//     // This ensures value options are available even if field was filtered out
//     const fieldConfig = availableFields[field] || fields[field];
//     if (fieldConfig?.values) {
//       return fieldConfig.values.map((v: any) => ({
//         value: v,
//         label: String(v),
//       }));
//     }
//     return [];
//   };

//   return (
//     <div className="w-full">
//       <div className="space-y-4">
//         {fieldsLoading ? (
//           <DynamicFiltersShimmer />
//         ) : fieldsError ? (
//           <div className="text-red-500">Failed to load filter options</div>
//         ) : (
//           <>
//             {/* Warning for global mutual exclusivity */}
//             {(hasAgentInGroupBy || hasLastTransferInGroupBy) && (
//               <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3">
//                 <div className="flex items-center">
//                   <div className="text-sm font-medium text-blue-600">
//                     ℹ️ Info: Some fields are hidden due to active group filters
//                   </div>
//                 </div>
//                 <div className="mt-1 text-xs text-blue-500">
//                   {hasAgentInGroupBy &&
//                     "• 'Last Transfer' field is hidden because 'Agent' is selected in group filters"}
//                   {hasLastTransferInGroupBy &&
//                     "• 'Agent' field is hidden because 'Last Transfer' is selected in group filters"}
//                 </div>
//               </div>
//             )}

//             <div className="max-h-[200px] min-h-[200px] overflow-y-auto">
//               {rules.map((rule, idx) => (
//                 <div key={idx} className="mb-2 flex items-center gap-2 last:mb-0">
//                   <div className="flex w-full justify-between gap-2">
//                     {/* Field Select - smaller width for range operators */}
//                     <div className={isRangeOperator(rule.operator) ? 'w-1/4' : 'w-1/3'}>
//                       <Select
//                         options={getFieldOptions()}
//                         value={
//                           getFieldOptions().find(
//                             (opt: { value: string }) => opt.value === rule.field
//                           ) || null
//                         }
//                         onChange={(opt: { value: string; label: string } | null) =>
//                           handleFieldChange(idx, opt?.value || '')
//                         }
//                         placeholder="Field"
//                         isSearchable={true}
//                         size="md"
//                         menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
//                         menuPosition="fixed"
//                         styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
//                       />
//                     </div>
//                     {/* Operator Select - smaller width for range operators */}
//                     <div className={isRangeOperator(rule.operator) ? 'w-1/4' : 'w-1/3'}>
//                       <Select
//                         options={getOperatorOptions(rule.field)}
//                         value={
//                           getOperatorOptions(rule.field).find(
//                             (opt: { value: string }) => opt.value === rule.operator
//                           ) || null
//                         }
//                         onChange={(opt: { value: string; label: string } | null) =>
//                           handleOperatorChange(idx, opt?.value || '')
//                         }
//                         placeholder="Operator"
//                         isSearchable={true}
//                         size="md"
//                         menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
//                         menuPosition="fixed"
//                         styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
//                       />
//                     </div>
//                     {/* Value Select/Input - wider for range operators */}
//                     {['is_empty', 'is_not_empty'].includes(rule.operator) ? null : (
//                       <div className={isRangeOperator(rule.operator) ? 'w-1/2' : 'w-1/3'}>
//                         {isDateField(rule.field) && isRangeOperator(rule.operator) ? (
//                           // Date Range Picker for date fields with "between" operator
//                           <DatePicker.DatePickerRange
//                             value={
//                               Array.isArray(rule.value) && rule.value.length === 2
//                                 ? [
//                                     rule.value[0] instanceof Date
//                                       ? rule.value[0]
//                                       : rule.value[0]
//                                         ? new Date(rule.value[0])
//                                         : null,
//                                     rule.value[1] instanceof Date
//                                       ? rule.value[1]
//                                       : rule.value[1]
//                                         ? new Date(rule.value[1])
//                                         : null,
//                                   ]
//                                 : [null, null]
//                             }
//                             onChange={(range: [Date | null, Date | null]) => {
//                               handleValueChange(idx, range);
//                             }}
//                             inputFormat="YYYY-MM-DD"
//                             size="md"
//                           />
//                         ) : isDateField(rule.field) ? (
//                           // Single Date Picker for date fields with single operators
//                           <DatePicker
//                             value={
//                               rule.value &&
//                               typeof rule.value === 'object' &&
//                               rule.value instanceof Date
//                                 ? rule.value
//                                 : rule.value && typeof rule.value === 'string'
//                                   ? new Date(rule.value)
//                                   : null
//                             }
//                             onChange={(date: Date | null) => {
//                               handleValueChange(idx, date);
//                             }}
//                             placeholder="Select Date"
//                             inputFormat="YYYY-MM-DD"
//                             size="md"
//                           />
//                         ) : isNumericField(rule.field) && isRangeOperator(rule.operator) ? (
//                           // Number Range Input for numeric fields with "between" operator
//                           <div className="flex flex-col gap-1">
//                             <div className="flex gap-1">
//                               <Input
//                                 type="number"
//                                 placeholder="Min"
//                                 size="md"
//                                 className={`w-1/2 ${rangeErrors[idx] ? 'border-red-500' : ''}`}
//                                 value={Array.isArray(rule.value) ? rule.value[0] || '' : ''}
//                                 onChange={(e) => {
//                                   const currentValue = Array.isArray(rule.value)
//                                     ? rule.value
//                                     : ['', ''];
//                                   const newValue = [e.target.value, currentValue[1] || ''];
//                                   handleValueChange(idx, newValue);
//                                 }}
//                               />
//                               <Input
//                                 type="number"
//                                 placeholder="Max"
//                                 size="md"
//                                 className={`w-1/2 ${rangeErrors[idx] ? 'border-red-500' : ''}`}
//                                 value={Array.isArray(rule.value) ? rule.value[1] || '' : ''}
//                                 onChange={(e) => {
//                                   const currentValue = Array.isArray(rule.value)
//                                     ? rule.value
//                                     : ['', ''];
//                                   const newValue = [currentValue[0] || '', e.target.value];
//                                   handleValueChange(idx, newValue);
//                                 }}
//                               />
//                             </div>
//                             {rangeErrors[idx] && (
//                               <div className="text-xs text-red-500 mt-1">
//                                 {rangeErrors[idx]}
//                               </div>
//                             )}
//                           </div>
//                         ) : (
//                           // Regular Select for other fields
//                           <Select
//                             options={
//                               getValueOptions(rule.field).length > 0
//                                 ? getValueOptions(rule.field)
//                                 : rule.value !== undefined && rule.value !== ''
//                                   ? [{ value: rule.value, label: String(rule.value) }]
//                                   : []
//                             }
//                             value={
//                               rule.value !== undefined && rule.value !== ''
//                                 ? getValueOptions(rule.field).length > 0
//                                   ? getValueOptions(rule.field).find(
//                                       (opt: { value: any }) => opt.value === rule.value
//                                     ) || null
//                                   : { value: rule.value, label: String(rule.value) }
//                                 : null
//                             }
//                             onChange={(opt: { value: any; label: string } | null) => {
//                               // Update value when selecting from dropdown or when clearing
//                               handleValueChange(idx, opt?.value ?? '');
//                             }}
//                             placeholder="Value"
//                             isSearchable={true}
//                             isClearable={true}
//                             size="md"
//                             onInputChange={(inputValue) => {
//                               // Only update if inputValue is not empty or if we're clearing a previous value
//                               if (inputValue !== '' || rule.value === '') {
//                                 handleValueChange(idx, inputValue);
//                               }
//                             }}
//                             menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
//                             menuPosition="fixed"
//                             styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
//                           />
//                         )}
//                       </div>
//                     )}
//                   </div>
//                   {/* Remove Rule */}
//                   <Button
//                     variant={BUTTON_REMOVE}
//                     onClick={() => removeRule(idx)}
//                     disabled={rules.length === 1}
//                     className="text-red-500"
//                   >
//                     ✕
//                   </Button>
//                 </div>
//               ))}
//             </div>
//           </>
//         )}
//         <div className="border-t pt-2">
//           <div className="flex items-center justify-between">
//             <div className="flex gap-2">
//               <Button variant={BUTTON_ADD} onClick={addRule} disabled={rules.length >= 20}>
//                 + Add Rule
//               </Button>
//               <Button onClick={handleComprehensiveClear} variant="secondary" size="sm">
//                 Clear Saved
//               </Button>
//             </div>
//             <Button
//               onClick={handleApply}
//               disabled={
//                 applyDynamicFilters.isPending ||
//                 !rules.some((rule) => rule.field && rule.operator && rule.value !== undefined) ||
//                 Object.keys(rangeErrors).length > 0
//               }
//               variant={BUTTON_APPLY}
//             >
//               {applyDynamicFilters.isPending ? 'Applying...' : 'Apply'}
//             </Button>
//           </div>
//           {rules.length >= 20 && (
//             <div className="mt-2 text-xs text-gray-500">You can add up to 20 rules only.</div>
//           )}
//           {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
//         </div>
//       </div>
//     </div>
//   );
// };

// // OLD COMPONENT - DO NOT USE
// export default DynamicFilters_OLD_DO_NOT_USE;
