import { ColumnDef } from '@/components/shared/DataTable';
import DownloadImports from '@/components/shared/DownloadImport';
import ExcelViewerDialog from '@/components/shared/ExcelViewerDialog';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Import } from '@/services/LeadsService';
import { appendToFilename } from '@/utils/appendToFilename';
import { dateFormateUtils } from '@/utils/dateFormateUtils';
import { useState } from 'react';
import { useRecentImport } from '@/services/hooks/useLeads';
import RevertButton from './RevertButton';

export const recentImportsHookConfig = {
  useDataHook: useRecentImport,
  transformData: (data: any) => data?.imports || [],
  getColumns: ({
    onRevertClick,
  }: {
    onRevertClick?: (objectId: string, fileName: string) => void;
    dashboardType?: 'recent-imports' | 'offers-import-history';
  }): ColumnDef<Import, any>[] => {
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
              className="text-sm"
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

    const columns: ColumnDef<Import, any>[] = [
      {
        id: 'created_at',
        header: () => <span className="whitespace-nowrap">Date</span>,
        accessorKey: 'created_at',
        enableSorting: false,
        cell: (props) => (
          <span className="whitespace-nowrap">
            {dateFormateUtils(props.row?.original?.created_at.toString())}
          </span>
        ),
      },
      {
        id: 'file_name',
        header: () => <span className="whitespace-nowrap">File Name</span>,
        accessorKey: 'file_name',
        enableSorting: false,
        cell: (props) => (
          <span className="whitespace-nowrap">{props.row?.original?.file?.original_filename}</span>
        ),
      },
      {
        id: 'total',
        header: () => <span className="whitespace-nowrap">Total</span>,
        accessorKey: 'total',
        enableSorting: false,
        cell: (props) => props.row.original?.import_details?.total_rows,
      },
      {
        id: 'success',
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
        id: 'failed',
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
        id: 'new',
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
        id: 'oldDuplicate',
        header: () => <span className="whitespace-nowrap">Old Duplicate</span>,
        accessorKey: 'oldDuplicate',
        enableSorting: false,
        cell: (props) => (
          <span className="whitespace-nowrap">
            {props.row.original?.import_details?.duplicate_status_summary?.oldDuplicate}
          </span>
        ),
      },
      {
        id: 'ten_week_duplicate',
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
        columnWidth: 257,
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
      {
        id: 'action',
        header: 'Actions',
        cell: (props) => <ActionCell row={props.row} />,
      },
      {
        id: 'revert',
        header: 'Revert',
        cell: (props) => {
          const revertInfo = props.row.original as any;
          return (
            <RevertButton revertInfo={revertInfo} onRevertClick={onRevertClick || (() => { })} />
          );
        },
      },
    ];

    return columns;
  },
  config: {
    pageSize: 10,
    tableName: 'recent-imports',
    searchPlaceholder: 'Search recent imports...',
    title: 'Recent Imports',
    description: 'Total imports',
  },
};
