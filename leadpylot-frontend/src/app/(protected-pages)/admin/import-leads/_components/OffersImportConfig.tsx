import { ColumnDef } from '@/components/shared/DataTable';
import DownloadOffersImports from '@/components/shared/DownloadOffersImports';
import TruncatedText from '@/components/shared/TruncatedText';
import { OffersImport } from '@/services/LeadsService';
import { appendToFilename } from '@/utils/appendToFilename';
import { formatFileSize } from '@/utils/documentUtils';
import { formatProcessingTime, getImportStatusColor } from '@/utils/importUtils';
import { format } from 'date-fns';
import { useOffersImportHistory } from '@/services/hooks/useLeads';
import RevertButton from './RevertButton';

export const offersImportHistoryHookConfig = {
  useDataHook: useOffersImportHistory,
  transformData: (data: any) => data?.data?.imports || [],
  getColumns: ({
    onRevertClick,
  }: {
    onRevertClick?: (objectId: string, fileName: string) => void;
  }): ColumnDef<OffersImport>[] => {
    const columns: ColumnDef<OffersImport>[] = [
      {
        id: 'created_at',
        header: () => <span className="whitespace-nowrap">Created</span>,
        accessorKey: 'created_at',
        enableSorting: false,
        cell: (props) => (
          <span className="text-sand-2 text-sm whitespace-nowrap">
            {format(new Date(props.row?.original?.created_at), 'MMM dd, yyyy HH:mm')}
          </span>
        ),
      },
      {
        id: 'file',
        header: () => <span className="whitespace-nowrap">File</span>,
        accessorKey: 'file',
        enableSorting: false,
        cell: (props) => (
          <div>
            <div className="font-medium">
              <TruncatedText
                text={props.row?.original?.file?.original_filename || ''}
                maxLength={20}
                className="font-medium"
              />
            </div>
            <div className="text-sand-2 text-sm">
              {formatFileSize(props.row?.original?.file?.file_size)}
            </div>
          </div>
        ),
      },
      {
        id: 'user',
        header: () => <span className="whitespace-nowrap">User</span>,
        accessorKey: 'user',
        enableSorting: false,
        cell: (props) => (
          <div>
            <div className="font-medium">{props.row?.original?.user?.name}</div>
            <div className="text-sand-2 text-sm">{props.row?.original?.user?.email}</div>
          </div>
        ),
      },
      {
        id: 'status',
        header: () => <span className="whitespace-nowrap">Status</span>,
        accessorKey: 'status',
        enableSorting: false,
        cell: (props) => (
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${getImportStatusColor(props.row?.original?.status)}`}
          >
            {props.row?.original?.status}
          </span>
        ),
      },
      {
        id: 'results',
        header: () => <span className="whitespace-nowrap">Results</span>,
        accessorKey: 'import_details',
        enableSorting: false,
        cell: (props) => (
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
        ),
      },
      {
        id: 'processing_time',
        header: () => <span className="whitespace-nowrap">Processing Time</span>,
        accessorKey: 'processing_time_ms',
        enableSorting: false,
        cell: (props) => (
          <span className="text-sand-2 text-sm">
            {formatProcessingTime(props.row?.original?.processing_time_ms)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="whitespace-nowrap">Actions</span>,
        accessorKey: 'actions',
        enableSorting: false,
        cell: (props) => (
          <div className="flex gap-2">
            <DownloadOffersImports
              downloadLink={props.row?.original?.file?.download_url}
              fileName={appendToFilename(
                props.row?.original?.file?.original_filename,
                '_failed_imports'
              )}
            />
            {onRevertClick && (
              <RevertButton revertInfo={props.row?.original} onRevertClick={onRevertClick} />
            )}
          </div>
        ),
      },
    ];

    return columns;
  },
  config: {
    pageSize: 10,
    tableName: 'offers-import-history',
    searchPlaceholder: 'Search offers import history...',
    title: 'Offers Import History',
    description: 'Total history',
  },
};
