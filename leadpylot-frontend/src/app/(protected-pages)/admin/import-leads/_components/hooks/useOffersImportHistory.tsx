

import DownloadOffersImports from '@/components/shared/DownloadOffersImports';
import { useOffersImportHistory } from '@/services/hooks/useLeads';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { appendToFilename } from '@/utils/appendToFilename';
import { formatFileSize } from '@/utils/documentUtils';
import { formatProcessingTime, getImportStatusColor } from '@/utils/importUtils';

interface OffersImportHistoryProps {
  pageSize?: number;
}

export const useOffersImportHistoryHook = ({
  pageSize: externalPageSize,
}: OffersImportHistoryProps = {}) => {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(10);
  const page = internalPage;
  const pageSize = externalPageSize !== undefined ? externalPageSize : internalPageSize;
  const setPage = setInternalPage;
  const setPageSize = setInternalPageSize;

  // Data fetching
  const { data: offersImportData, isLoading } = useOffersImportHistory({
    page,
    limit: pageSize,
    status: status || undefined,
  });

  const { onAppendQueryParams } = useAppendQueryParams();

  // Column key helper
  const getColumnKey = (column: any): string | undefined => {
    if ('accessorKey' in column && typeof column.accessorKey === 'string') {
      return column.accessorKey;
    }
    return column.id;
  };

  // Column display label helper
  const getColumnDisplayLabel = (column: any): string => {
    if (typeof column.header === 'string') {
      return column.header;
    }
    if (typeof column.header === 'function') {
      const headerResult = (column as any).header();
      if (headerResult && headerResult.props && headerResult.props.children) {
        return headerResult.props.children;
      }
      return column.id || 'Column';
    }
    if ('accessorKey' in column && typeof column.accessorKey === 'string') {
      return column.accessorKey
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    if (column.id) {
      return column.id.charAt(0).toUpperCase() + column.id.slice(1);
    }
    return 'Unnamed Column';
  };

  // Columns definition memoized
  const allColumns: any[] = useMemo(() => {
    const columns: any[] = [
      {
        id: 'created_at',
        header: () => <span className="whitespace-nowrap">Created</span>,
        accessorKey: 'created_at',
        enableSorting: false,
        cell: (props: any) => {
          return (
            <span className="text-sand-2 text-sm whitespace-nowrap">
              {format(new Date(props.row?.original?.created_at), 'MMM dd, yyyy HH:mm')}
            </span>
          );
        },
      },
      {
        id: 'file',
        header: () => <span className="whitespace-nowrap">File</span>,
        accessorKey: 'file',
        enableSorting: false,
        cell: (props: any) => {
          return (
            <div>
              <div className="font-medium">{props.row?.original?.file?.original_filename}</div>
              <div className="text-sand-2 text-sm">
                {formatFileSize(props.row?.original?.file?.file_size)}
              </div>
            </div>
          );
        },
      },
      {
        id: 'user',
        header: () => <span className="whitespace-nowrap">User</span>,
        accessorKey: 'user',
        enableSorting: false,
        cell: (props: any) => {
          return (
            <div>
              <div className="font-medium">{props.row?.original?.user?.name}</div>
              <div className="text-sand-2 text-sm">{props.row?.original?.user?.email}</div>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: () => <span className="whitespace-nowrap">Status</span>,
        accessorKey: 'status',
        enableSorting: false,
        cell: (props: any) => {
          return (
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getImportStatusColor(props.row?.original?.status)}`}
            >
              {props.row?.original?.status}
            </span>
          );
        },
      },
      {
        id: 'results',
        header: () => <span className="whitespace-nowrap">Results</span>,
        accessorKey: 'import_details',
        enableSorting: false,
        cell: (props: any) => {
          return (
            <div className="text-sm">
              <div className="text-moss-1">
                ✓ {props.row?.original?.import_details?.success_count} successful
              </div>
              {props.row?.original?.import_details?.failure_count > 0 && (
                <div className="text-rust">
                  ✗ {props.row?.original?.import_details?.failure_count} failed
                </div>
              )}
              <div className="text-sand-2">
                Total: {props.row?.original?.import_details?.total_rows}
              </div>
            </div>
          );
        },
      },
      {
        id: 'processing_time',
        header: () => <span className="whitespace-nowrap">Processing Time</span>,
        accessorKey: 'processing_time',
        enableSorting: false,
        cell: (props: any) => {
          return (
            <span className="text-sand-2 text-sm">
              {formatProcessingTime(props.row?.original?.processing_time_ms)}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: () => <span className="whitespace-nowrap">Actions</span>,
        accessorKey: 'actions',
        enableSorting: false,
        cell: (props: any) => {
          return (
            <div className="flex items-center gap-2">
              <DownloadOffersImports
                type="success"
                downloadLink={props?.row?.original?.file?.download_url}
                fileName={appendToFilename(
                  props?.row?.original?.file?.original_filename,
                  'original'
                )}
              />
              {props?.row?.original?.import_details?.failure_count > 0 && (
                <DownloadOffersImports
                  type="failed"
                  downloadLink={props?.row?.original?.error_file?.download_url}
                  fileName={appendToFilename(
                    props?.row?.original?.file?.original_filename,
                    'failed'
                  )}
                />
              )}
            </div>
          );
        },
      },
    ];

    return columns;
  }, []);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const initialVisibility: Record<string, boolean> = {};
    allColumns.forEach((column) => {
      const key = getColumnKey(column);
      if (key) {
        initialVisibility[key] = true;
      }
    });
    return initialVisibility;
  });

  // Handle column visibility change
  const handleColumnVisibilityChange = (columnKey: string, isVisible: boolean) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnKey]: isVisible,
    }));
  };

  // Filter visible columns
  const renderableColumns = useMemo(() => {
    return allColumns.filter((column) => {
      const key = getColumnKey(column);
      return key ? columnVisibility[key] : true;
    });
  }, [allColumns, columnVisibility]);

  return {
    allColumns,
    offersImportData,
    onAppendQueryParams,
    page,
    pageSize,
    setPage,
    setPageSize,
    getColumnKey,
    isLoading,
    renderableColumns,
    getColumnDisplayLabel,
    handleColumnVisibilityChange,
    columnVisibility,
  };
};
