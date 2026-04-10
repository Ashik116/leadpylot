/* eslint-disable react-hooks/exhaustive-deps */

import { ColumnDef } from '@/components/shared/DataTable';
import DownloadImports from '@/components/shared/DownloadImport';
import ExcelViewerDialog from '@/components/shared/ExcelViewerDialog';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useRecentImport } from '@/services/hooks/useLeads';
import { GetAllRecentImport, Import } from '@/services/LeadsService';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import { appendToFilename } from '@/utils/appendToFilename';
import { dateFormateUtils } from '@/utils/dateFormateUtils';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
import { useSession } from '@/hooks/useSession';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface LeadsDashboardProps {
  data?: Import[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPaginationChange?: React.Dispatch<React.SetStateAction<number>>;
  onPageSizeChange?: React.Dispatch<React.SetStateAction<number>>;
  pendingLeadsComponent?: boolean;
  recentImport?: boolean;
  onRevertClick?: (objectId: string, fileName: string) => void;
}

export const useRecentImports = ({
  data: externalData,
  loading: externalLoading,
  total: externalTotal,
  page: externalPage,
  pageSize: externalPageSize,
  onPaginationChange: externalOnPaginationChange,
  onPageSizeChange: externalOnPageSizeChange,
  pendingLeadsComponent,
  recentImport = false,
  onRevertClick,
}: LeadsDashboardProps = {}) => {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const search = searchParams?.get('search');
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(10);
  const page = externalPage !== undefined ? externalPage : internalPage;
  const pageSize = externalPageSize !== undefined ? externalPageSize : internalPageSize;
  const setPage = externalOnPaginationChange || setInternalPage;
  const setPageSize = externalOnPageSizeChange || setInternalPageSize;
  const currentProject = useSelectedProjectStore();
  const projectName = currentProject?.selectedProject?.name || '';
  const role = session?.user?.role;
  const agentName = session?.user?.name;
  // Get status from URL params and convert to number if it exists
  const statusParam = searchParams?.get('status');
  const totalParam = searchParams?.get('total');
  const parsedStatus = statusParam ? parseInt(statusParam, 10) : undefined;
  const parsedTotal = totalParam ? parseInt(totalParam, 10) : 0;

  // Initialize filter data from URL params, but only if total > 0
  const [filterData, setFilterData] = useState<number | undefined>(
    parsedTotal && parsedTotal > 0 ? parsedStatus : undefined
  );
  // Data fetching
  const {
    data: recentImportsData,
    isLoading,
    isRefetching,
  } = useRecentImport<GetAllRecentImport>({
    page,
    // If total parameter is provided and greater than 0, use it as the limit
    limit: parsedTotal && parsedTotal > 0 ? parsedTotal : pageSize,
    search: search || undefined,
    project_name: role === 'Agent' ? projectName : undefined,
    agent_name: role === 'Agent' ? agentName : undefined,
    use_status: pendingLeadsComponent === true ? 'pending' : undefined,
    duplicate: filterData,
  });

  const { onAppendQueryParams } = useAppendQueryParams();

  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Column key helper
  const getColumnKey = (column: ColumnDef<Import, any>): string | undefined => {
    if ('accessorKey' in column && typeof column?.accessorKey === 'string') {
      return column?.accessorKey;
    }
    return column?.id;
  };

  // Column display label helper
  const getColumnDisplayLabel = (column: ColumnDef<Import, any>): string => {
    if (typeof column?.header === 'string') {
      return column?.header;
    }
    if (typeof column?.header === 'function') {
      const headerResult = (column as any)?.header();
      if (headerResult && headerResult?.props && headerResult?.props?.children) {
        return headerResult?.props?.children;
      }
      return column?.id || 'Column';
    }
    if ('accessorKey' in column && typeof column?.accessorKey === 'string') {
      return column?.accessorKey
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    if (column?.id) {
      return column?.id?.charAt(0).toUpperCase() + column?.id?.slice(1);
    }
    return 'Unnamed Column';
  };

  // Columns definition memoized
  const allColumns: ColumnDef<Import, any>[] = useMemo(() => {
    const columns: ColumnDef<Import, any>[] = [
      {
        id: 'created_at',
        header: () => <span className="whitespace-nowrap">Date</span>,
        accessorKey: 'created_at',
        enableSorting: false,
        cell: (props) => {
          return (
            <span className="whitespace-nowrap">
              {dateFormateUtils(props.row?.original?.created_at.toString())}
            </span>
          );
        },
      },
      {
        id: 'file_name',
        header: () => <span className="whitespace-nowrap">File Name</span>,
        accessorKey: 'file_name',
        enableSorting: false,
        cell: (props) => {
          return (
            <span className="whitespace-nowrap">
              {props.row?.original?.file?.original_filename}
            </span>
          );
        },
      },
      {
        id: 'total',
        header: () => <span className="whitespace-nowrap">Total</span>,
        accessorKey: 'total',
        enableSorting: false,
        cell: (props) => props.row.original?.import_details?.total_rows,
      },
      {
        header: () => <span className="whitespace-nowrap">Success</span>,
        accessorKey: 'success',
        enableSorting: false,
        cell: (props) => (
          <span className="whitespace-nowrap">
            {props.row.original?.import_details?.success_count}
          </span>
        ),
      },

      {
        header: () => <span className="whitespace-nowrap">Failed</span>,
        accessorKey: 'failed',
        enableSorting: false,
        cell: (props) => (
          <div className="whitespace-nowrap">
            {props.row.original?.import_details?.failure_count}
          </div>
        ),
      },

      {
        header: () => <span className="whitespace-nowrap">New</span>,
        accessorKey: 'new',
        enableSorting: false,
        cell: (props) => (
          <span className="whitespace-nowrap">
            {props.row.original?.import_details?.duplicate_status_summary?.new}
          </span>
        ),
      },

      {
        header: () => <span className="whitespace-nowrap">Old Duplicate</span>,
        accessorKey: 'old_duplicate',
        enableSorting: false,
        cell: (props) => (
          <span className="whitespace-nowrap">
            {props.row.original?.import_details?.duplicate_status_summary?.oldDuplicate}
          </span>
        ),
      },

      {
        header: () => <span className="whitespace-nowrap">10 Week Duplicate</span>,
        enableSorting: false,
        accessorKey: 'ten_week_duplicate',
        cell: (props) => (
          <span className="whitespace-nowrap">
            {props.row.original?.import_details?.duplicate_status_summary?.duplicate}
          </span>
        ),
      },
      {
        id: 'download',
        header: () => <span className="whitespace-nowrap">Download</span>,
        enableSorting: false,
        accessorKey: 'download',
        cell: (props) => (
          <div className="flex items-center gap-2">
            <DownloadImports
              type="success"
              downloadLink={props?.row?.original?.file?.download_url}
              fileName={appendToFilename(props?.row?.original?.file?.original_filename, 'original')}
            />
            {props?.row?.original?.import_details?.failure_count > 0 && (
              <DownloadImports
                type="failed"
                downloadLink={props?.row?.original?.error_file?.download_url}
                fileName={appendToFilename(props?.row?.original?.file?.original_filename, 'failed')}
              />
            )}
          </div>
        ),
      },
    ];

    const ActionCell = ({ row }: { row: any }) => {
      const [isExcelViewerOpen, setIsExcelViewerOpen] = useState(false);

      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          data-no-navigate="true"
        >
          <div className="flex gap-2">
            <Button
              icon={<ApolloIcon name="file" className="text-md" />}
              size="xs"
              variant="secondary"
              onClick={() => setIsExcelViewerOpen(true)}
            >
              View file
            </Button>
          </div>

          <ExcelViewerDialog
            isOpen={isExcelViewerOpen}
            onClose={() => setIsExcelViewerOpen(false)}
            title="Excel File Preview"
            downloadUrl={row.original?.file?.download_url}
            fileName={row.original?.file?.original_filename}
          />
        </div>
      );
    };

    columns.push({
      id: 'action',
      header: 'Actions',
      cell: (props) => <ActionCell row={props?.row} />,
    });
    // Conditionally add Download column if recentImport is true
    columns.push({
      id: 'revert',
      header: 'Revert',
      cell: (props) => {
        const revertInfo = props?.row?.original as any;
        if (revertInfo?.revert_info?.is_reverted) {
          return (
            <Button
              icon={<ApolloIcon name="check" className="text-md text-green-500" />}
              size="xs"
              variant="default"
            >
              Reverted
            </Button>
          );
        }
        return (
          <Button
            icon={<ApolloIcon name="rotate-right" className="text-md" />}
            size="xs"
            variant="solid"
            onClick={() => {
              if (onRevertClick) {
                const objectId = props?.row?.original?._id;
                const fileName = props?.row?.original?.file?.original_filename || 'Unknown';
                onRevertClick(objectId, fileName);
              }
            }}
          >
            Revert
          </Button>
        );
      },
    });
    return columns;
  }, [recentImportsData?.imports, expandedRowId, recentImport]);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const initialVisibility: Record<string, boolean> = {};
    allColumns?.forEach((col) => {
      const key = getColumnKey(col);
      if (key && !['checkbox', 'action']?.includes(key)) {
        initialVisibility[key] = true;
      }
    });
    return initialVisibility;
  });

  // Initialize column visibility when allColumns changes
  useEffect(() => {
    if (allColumns?.length > 0) {
      const newVisibility: Record<string, boolean> = {};
      allColumns?.forEach((col) => {
        const key = getColumnKey(col);
        if (key && !['checkbox', 'action']?.includes(key)) {
          newVisibility[key] = true;
        }
      });
      setColumnVisibility(newVisibility);
    }
  }, [allColumns]);

  const handleColumnVisibilityChange = (columnKey: string, isVisible: boolean) => {
    setColumnVisibility((prev) => ({ ...prev, [columnKey]: isVisible }));
  };

  const renderableColumns = useMemo(() => {
    return allColumns?.filter((col) => {
      const key = getColumnKey(col);
      if (!key) return false;
      if (['checkbox', 'action']?.includes(key)) {
        return true;
      }
      return columnVisibility[key];
    });
  }, [allColumns, columnVisibility]);

  // Create a properly typed recentImportsData object if external data is provided
  const typedLeadsData: GetAllRecentImport | undefined | any = externalData
    ? { imports: externalData, meta: { total: externalTotal || 0, page: page, limit: pageSize } }
    : recentImportsData;

  return {
    filterData,
    setFilterData,
    recentImportsData: typedLeadsData,
    isLoading: externalLoading !== undefined ? externalLoading : isLoading || isRefetching,
    page,
    pageSize,
    setPage,
    setPageSize,
    expandedRowId,
    setExpandedRowId,

    getColumnKey,
    getColumnDisplayLabel,
    handleColumnVisibilityChange,
    renderableColumns,

    onAppendQueryParams,
    allColumns,
    search,
    columnVisibility,
    isRefetching,
  };
};
