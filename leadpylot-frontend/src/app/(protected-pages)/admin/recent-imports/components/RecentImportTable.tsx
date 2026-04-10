import DataTable, { ColumnDef } from '@/components/shared/DataTable';
import ScrollBar from '@/components/ui/ScrollBar';
import { Lead } from '@/services/LeadsService';
import { getPaginationOptions } from '@/utils/paginationNumber';
import React from 'react';
interface RecentImportTableProps {
  columns: ColumnDef<Lead, any>[];
  dataTable: Lead[];
  expandedRowId: string | null;
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  total: number;
  setPageSize: (pageSize: number) => void;
  showPagination?: boolean;
  loading?: boolean;
}
const RecentImportTable = ({
  columns,
  dataTable,
  expandedRowId,
  page,
  pageSize,
  setPage,
  total,
  setPageSize,
  loading,
  showPagination = true,
}: RecentImportTableProps) => {
  return (
    <div>
      <div className="min-w-max">
        <style jsx global>{`
          .leads-table tbody tr {
            cursor: pointer;
            position: relative;
          }
          .leads-table tbody tr:hover {
            background-color: rgba(0, 0, 0, 0.04);
          }
          .leads-table tbody tr td:first-child {
            position: relative;
            z-index: 10;
          }
          .leads-table tbody tr td:first-child * {
            position: relative;
            z-index: 10;
          }
        `}</style>
        <ScrollBar>
          <div className="leads-table">
            <DataTable
              data={dataTable}
              columns={columns}
              pagingData={{
                pageIndex: page,
                pageSize: pageSize,
                total: total,
              }}
              loading={loading}
              renderExpandedRow={(row) => RenderRowExpandColumn({ row, expandedRowId })}
              pageSizes={getPaginationOptions(total)}
              onPaginationChange={setPage}
              onSelectChange={setPageSize}
              selectable={false} // We're using our custom checkbox column
              showPagination={showPagination}
              noData={!dataTable?.length}
            />
          </div>
        </ScrollBar>
      </div>
    </div>
  );
};

const RenderRowExpandColumn = ({
  row,
  expandedRowId,
}: {
  row: any;
  expandedRowId: string | null;
}) => {
  const lead = row.original;
  if (expandedRowId === lead._id.toString()) {
    return (
      <div className="bg-gray-50 py-6 pl-26">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-base font-semibold">Contact Information</p>
            <div className="mt-2 space-y-2">
              <p>
                <span className="font-medium">Name:</span> {lead.contact_name || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Email:</span> {lead.email_from || 'N/A'}
              </p>
              <p>
                <span className="font-medium">Phone:</span> {lead.phone || 'N/A'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-base font-semibold">Lead Information</p>
            <div className="mt-2 space-y-2">
              <p>
                <span className="font-medium">Status:</span> {lead.status?.name || 'New'}
              </p>
              <p>
                <span className="font-medium">Stage:</span> {lead.stage?.name || 'New'}
              </p>
              <p>
                <span className="font-medium">Source:</span> {lead.lead_source_no || 'New'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-base font-semibold">Financial Information</p>
            <div className="mt-2 space-y-2">
              <p>
                <span className="font-medium">Expected Revenue:</span>{' '}
                {lead.expected_revenue ? `$${lead.expected_revenue.toLocaleString()}` : 'N/A'}
              </p>
              <p>
                <span className="font-medium">Created:</span>{' '}
                {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'N/A'}
              </p>
              <p>
                <span className="font-medium">Updated:</span>{' '}
                {lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {lead.projects && lead.projects.length > 0 && (
          <div className="mt-6">
            <h6 className="mb-2 font-medium">Assigned Projects</h6>
            <div className="mt-2 flex flex-wrap gap-3">
              {lead.projects.map((project: any, index: number) => (
                <div key={index} className="rounded-md bg-white p-3 shadow-sm">
                  <p>
                    <span className="font-medium">Project:</span>{' '}
                    {project.project?.name || 'Unknown'}
                  </p>
                  <p>
                    <span className="font-medium">Agent:</span>{' '}
                    {project.agent?.login || 'Unassigned'}
                  </p>
                  <p>
                    <span className="font-medium">Assigned:</span>{' '}
                    {project.assignedAt ? new Date(project.assignedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default RecentImportTable;
