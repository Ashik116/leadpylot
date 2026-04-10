import React from 'react';
import Button from '@/components/ui/Button';

interface ImportHistoryPaginationProps {
  meta: {
    page: number;
    pages: number;
    limit: number;
    total: number;
  };
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Reusable component for import history pagination
 */
const ImportHistoryPagination: React.FC<ImportHistoryPaginationProps> = ({
  meta,
  onPageChange,
  className = '',
}) => {
  if (meta?.pages <= 1) return null;

  return (
    <div className={`mt-6 flex items-center justify-between ${className}`}>
      <div className="text-sand-2 text-sm">
        Showing {(meta?.page - 1) * meta?.limit + 1} to{' '}
        {Math.min(meta?.page * meta?.limit, meta?.total)} of {meta?.total} imports
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="plain"
          disabled={meta?.page <= 1}
          onClick={() => onPageChange(meta?.page - 1)}
        >
          Previous
        </Button>
        <span className="flex items-center px-3 text-sm">
          Page {meta?.page} of {meta?.pages}
        </span>
        <Button
          size="sm"
          variant="plain"
          disabled={meta?.page >= meta?.pages}
          onClick={() => onPageChange(meta?.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default ImportHistoryPagination;
