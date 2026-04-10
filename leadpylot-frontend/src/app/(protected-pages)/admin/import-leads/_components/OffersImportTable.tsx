import DataTable, { ColumnDef } from '@/components/shared/DataTable';
import ScrollBar from '@/components/ui/ScrollBar';
import { OffersImport } from '@/services/LeadsService';
import { getPaginationOptions } from '@/utils/paginationNumber';
import React from 'react';

interface OffersImportTableProps {
  columns: ColumnDef<OffersImport>[];
  dataTable: OffersImport[];
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  total: number;
  setPageSize: (pageSize: number) => void;
  showPagination?: boolean;
  loading?: boolean;
}

const OffersImportTable = ({
  columns,
  dataTable,
  page,
  pageSize,
  setPage,
  total,
  setPageSize,
  loading,
  showPagination = true,
}: OffersImportTableProps) => {
  return (
    <div>
      <div className="min-w-max">
        <style jsx global>{`
          .offers-import-table tbody tr {
            cursor: pointer;
            position: relative;
          }
          .offers-import-table tbody tr:hover {
            background-color: rgba(0, 0, 0, 0.04);
          }
          .offers-import-table tbody tr td:first-child {
            position: relative;
            z-index: 10;
          }
          .offers-import-table tbody tr td:first-child * {
            position: relative;
            z-index: 10;
          }
        `}</style>
        <ScrollBar>
          <div className="offers-import-table">
            <DataTable
              data={dataTable}
              columns={columns}
              pagingData={{
                pageIndex: page,
                pageSize: pageSize,
                total: total,
              }}
              loading={loading}
              pageSizes={getPaginationOptions(total)}
              onPaginationChange={setPage}
              onSelectChange={setPageSize}
              selectable={false}
              showPagination={showPagination}
              noData={!dataTable?.length}
            />
          </div>
        </ScrollBar>
      </div>
    </div>
  );
};

export default OffersImportTable;
