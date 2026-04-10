'use client';

import DataTable, { ColumnDef } from '@/components/shared/DataTable';
import Card from '@/components/ui/Card';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ScrollBar from '@/components/ui/ScrollBar';
import { useSession } from '@/hooks/useSession';
import Loading from '@/components/shared/Loading';
import { getColumnKey, useReclamation } from '@/services/hooks/useReclamation';
import ReclameOptions from './ReclameOptions';
import ReclameTableColums from './ReclameTableColumns';

export interface ReclamationType {
  _id: string;
  project_id: string;
  agent_id: {
    _id: string;
  };
  lead_id: {
    _id: string;
    phone: string;
    email_from: string;
    lead_date: string;
  } | null;
  reason: string;
  status: number;
  response: string;
  createdAt: string;
  updatedAt: string;
}

function ReclamationsDashboard() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data: session } = useSession();
  const { data: reclamationsData, isLoading } = useReclamation({ page, limit: pageSize });
  // console.log(reclamationsData);

  const handleRowClick = (reclamation: ReclamationType) => {
    router.push(`/dashboards/reclamations/${reclamation._id}`);
  };
  // All Table Columns in this functions
  const allColumns: ColumnDef<ReclamationType>[] = ReclameTableColums();

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const initialVisibility: Record<string, boolean> = {};
    allColumns.forEach((col) => {
      const key = getColumnKey(col);
      if (key && !['checkbox', 'action'].includes(key)) {
        initialVisibility[key] = true;
      }
    });
    return initialVisibility;
  });

  // Filter columns based on visibility settings
  const columns = useMemo(() => {
    return allColumns.filter((col) => {
      const key = getColumnKey(col);
      if (!key) return false;
      if (['checkbox', 'action'].includes(key)) {
        return true;
      }
      return columnVisibility[key];
    });
  }, [allColumns, columnVisibility]);

  if (!session) {
    return <Loading loading={true} />;
  }

  return (
    <Card>
      <div className="mb-4">
        <h1>Reclamations</h1>
        <p>Total reclamations: {reclamationsData?.results || 0}</p>
      </div>
      <div>
        <ReclameOptions
          columns={allColumns}
          setColumnVisibleState={setColumnVisibility}
          columnVisibility={columnVisibility}
        />
      </div>
      <ScrollBar>
        <div className="min-w-max">
          <DataTable<ReclamationType>
            data={reclamationsData?.data || []}
            columns={columns}
            loading={isLoading}
            pagingData={{
              total: reclamationsData?.results || 0,
              pageIndex: page,
              pageSize,
            }}
            onPaginationChange={setPage}
            onSelectChange={setPageSize}
            rowClassName="cursor-pointer hover:bg-gray-50"
            onRowClick={(row) => handleRowClick(row.original)}
          />
        </div>
      </ScrollBar>
    </Card>
  );
}

export default ReclamationsDashboard;
