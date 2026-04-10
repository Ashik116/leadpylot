'use client';

import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import { ColumnDef } from '@/components/shared/DataTable';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import { useOutboundRoutes } from '@/services/hooks/useFreePBXOutboundRoutes';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import OutboundRouteDialPatterns from './OutboundRouteDialPatterns';

const OutboundRoutesTableWrapper = () => {
  const pathname = usePathname();
  useSetBackUrl(pathname);

  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);

  // Pagination state management
  const searchParams = useSearchParams();
  const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;

  const { data: outboundRoutesData, isLoading } = useOutboundRoutes({
    page: pageIndex,
    limit: pageSize,
    search: search || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  });

  const outboundRoutes = outboundRoutesData?.data || [];
  const total = outboundRoutesData?.metadata?.total || 0;

  // Define columns for the DataTable
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Route Name',
        accessorKey: 'name',
        cell: (props: any) => (
          <span className="font-medium text-gray-800">{props.row.original?.name}</span>
        ),
      },
      {
        id: 'outcid',
        header: 'Outbound CID',
        accessorKey: 'outcid',
        cell: (props: any) => (
          <span className="text-sm">{props.row.original?.outcid || '-'}</span>
        ),
      },
      {
        id: 'seq',
        header: 'Sequence',
        accessorKey: 'seq',
        cell: (props: any) => (
          <Badge className="bg-gray-9 text-gray-2">{props.row.original?.seq}</Badge>
        ),
      },
      {
        id: 'pattern_count',
        header: 'Patterns',
        accessorKey: 'pattern_count',
        cell: (props: any) => (
          <Badge className="bg-ocean-9 text-ocean-2">
            {props.row.original?.pattern_count || 0} patterns
          </Badge>
        ),
      },
      {
        id: 'trunk_count',
        header: 'Trunks',
        accessorKey: 'trunk_count',
        cell: (props: any) => (
          <Badge className="bg-emerald-9 text-emerald-2">
            {props.row.original?.trunk_count || 0} trunks
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (props: any) => (
          <div className="flex items-center gap-2">
            <Button
              variant="plain"
              size="xs"
              className="text-sand-2 hover:text-ocean-2"
              icon={<ApolloIcon name="pen" className="text-md" />}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRouteId(props.row.original?.route_id);
              }}
              title="Manage dial patterns"
            />
          </div>
        ),
      },
    ],
    []
  );

  // BaseTable configuration
  const tableConfig = useBaseTable({
    tableName: 'freepbx-outbound-routes',
    data: outboundRoutes,
    loading: isLoading,
    totalItems: total,
    pageIndex,
    pageSize,
    search,
    columns,
    selectable: false,
    isBackendSortingReady: true,
    showPagination: !selectedRouteId,
    onRowClick: (row) => setSelectedRouteId(row?.route_id),
    rowClassName: (row: any) => {
      const baseClasses = 'hover:bg-sand-5 cursor-pointer transition-colors';
      const isActive = selectedRouteId === row.original?.route_id;
      return `${baseClasses} ${isActive ? 'bg-sand-5 border-l-4 border-l-ocean-2' : ''}`;
    },
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'FreePBX Outbound Routes',
    pageInfoSubtitlePrefix: 'Total Outbound Routes',
  });

  return (
    <div className="mx-2 flex flex-col gap-4 xl:mx-0">
      {!selectedRouteId ? (
        <div>
          <BaseTable {...tableConfig} />
        </div>
      ) : (
        <Card>
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Manage Dial Patterns</h3>
                <p className="text-sm text-gray-600">
                  Configure dial patterns for the selected outbound route
                </p>
              </div>
              <Button
                variant="secondary"
                icon={<ApolloIcon name="arrow-left" />}
                onClick={() => setSelectedRouteId(null)}
              >
                Back to Routes
              </Button>
            </div>

            <OutboundRouteDialPatterns routeId={selectedRouteId} />
          </div>
        </Card>
      )}
    </div>
  );
};

export default OutboundRoutesTableWrapper;

