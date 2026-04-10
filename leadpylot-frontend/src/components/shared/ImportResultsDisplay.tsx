import React from 'react';

interface ImportResultsDisplayProps {
  successCount: number;
  failureCount: number;
  totalRows: number;
  className?: string;
}

/**
 * Reusable component for displaying import results
 */
const ImportResultsDisplay: React.FC<ImportResultsDisplayProps> = ({
  successCount,
  failureCount,
  totalRows,
  className = '',
}) => {
  return (
    <div className={`text-sm ${className}`}>
      <div className="text-moss-1">✓ {successCount} successful</div>
      {failureCount > 0 && <div className="text-rust">✗ {failureCount} failed</div>}
      <div className="text-sand-2">Total: {totalRows}</div>
    </div>
  );
};

export default ImportResultsDisplay;
