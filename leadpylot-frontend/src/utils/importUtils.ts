/**
 * Utility functions for import-related components
 */

/**
 * Format processing time in milliseconds to human readable format
 * @param ms Processing time in milliseconds
 * @returns Formatted processing time string
 */
export const formatProcessingTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * Get status color classes for import status badges
 * @param status Import status string
 * @returns CSS classes for status badge styling
 */
export const getImportStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'text-moss-1 bg-moss-4/10';
    case 'processing':
      return 'text-amber-1 bg-amber-4/10';
    case 'failed':
      return 'text-rust bg-rust/10';
    default:
      return 'text-sand-2 bg-sand-4/10';
  }
};

/**
 * Get status options for import history filtering
 * @returns Array of status filter options
 */
export const getImportStatusOptions = () => [
  { value: '', label: 'All Status' },
  { value: 'completed', label: 'Completed' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
];

/**
 * Format import results for display
 * @param importDetails Import details object with success, failure, and total counts
 * @returns Formatted results object
 */
export const formatImportResults = (importDetails: {
  success_count: number;
  failure_count: number;
  total_rows: number;
}) => {
  return {
    success: importDetails.success_count,
    failure: importDetails.failure_count,
    total: importDetails.total_rows,
  };
};
