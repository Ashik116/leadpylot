/**
 * Custom hook to determine table height based on table name and filter visibility
 * @param tableName - The name/type of the table
 * @param hasFilterResults - Whether filter results are currently visible above the table
 * @returns CSS class string for the table height
 */
export const useTableHeight = (tableName: string, hasFilterResults: boolean = false): string => {
  // When filter results are visible, use 78dvh to accommodate the filter results header
  if (hasFilterResults) {
    return 'max-h-[78dvh]';
  }

  // Apply specific max-height based on table type
  if (['pending-leads', 'leads', 'live_leads', 'recycle_leads'].includes(tableName)) {
    return 'max-h-[82.5dvh]';
  } else if (['todo_leads', 'archived-leads'].includes(tableName)) {
    return 'max-h-[78dvh]';
  }
  // Default fallback
  return 'max-h-[78dvh]';
};
