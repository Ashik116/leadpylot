'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ColumnDef } from '@/components/shared/DataTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import ApolloIcon from '@/components/ui/ApolloIcon';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { getSidebarLayout } from '@/utils/transitions';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
import {
  useOffices,
  useCreateOffice,
  useUpdateOffice,
  useDeleteOffice,
} from '@/services/hooks/useOffices';
import type { Office } from '@/services/OfficeService';
import OfficeFormSidebar from './OfficeFormSidebar';
import AssignMembersPanel from './AssignMembersPanel';

const OFFICES_PER_PAGE = 20;

type SidebarType = 'create' | 'edit' | 'assignMembers' | null;

type EmployeePopulated = { _id: string; login?: string; info?: { name?: string; email?: string } };

export default function OfficesDashboard() {
  const searchParams = useSearchParams();
  const { onAppendQueryParams } = useAppendQueryParams();
  const pageIndex = Math.max(1, Number.parseInt(searchParams.get('pageIndex') || '1', 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(searchParams.get('pageSize') || String(OFFICES_PER_PAGE), 10) || OFFICES_PER_PAGE);
  const search = searchParams.get('search') ?? '';

  const [sidebarType, setSidebarType] = useState<SidebarType>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Office | null>(null);

  const { data, isLoading, refetch } = useOffices({
    page: pageIndex,
    limit: pageSize,
    search: search.trim() || undefined,
  });
  const createMutation = useCreateOffice();
  const updateMutation = useUpdateOffice();
  const deleteMutation = useDeleteOffice();

  const offices = data?.data ?? [];
  const totalItems = data?.pagination?.total ?? 0;
  const perms = data?.permissions?.office;

  const selectedOffice = useMemo(
    () => (selectedId ? offices.find((o) => o._id === selectedId) : null),
    [offices, selectedId]
  );

  const resetSidebar = useCallback(() => {
    setSidebarType(null);
    setSelectedId(null);
  }, []);

  const handleRowClick = useCallback(
    (office: Office) => {
      if (selectedId === office._id) {
        resetSidebar();
      } else {
        setSelectedId(office._id);
        setSidebarType('edit');
      }
    },
    [selectedId, resetSidebar]
  );

  const handleAddNew = useCallback(() => {
    setSelectedId(null);
    setSidebarType('create');
  }, []);

  const handleFormSuccess = useCallback(() => {
    resetSidebar();
    refetch();
  }, [resetSidebar, refetch]);

  const handleFormSubmit = useCallback(
    (values: { name: string; country?: string; timezone?: string; capacity?: number }) => {
      if (sidebarType === 'edit' && selectedId) {
        updateMutation.mutate(
          { id: selectedId, data: values },
          { onSuccess: handleFormSuccess }
        );
      } else {
        createMutation.mutate(values, { onSuccess: handleFormSuccess });
      }
    },
    [sidebarType, selectedId, updateMutation, createMutation, handleFormSuccess]
  );

  const handleAssignMembers = useCallback((office: Office, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedId(office._id);
    setSidebarType('assignMembers');
  }, []);

  const handleEditClick = useCallback((office: Office, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedId(office._id);
    setSidebarType('edit');
  }, []);

  const handleDeactivateClick = useCallback((office: Office, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(office);
  }, []);

  const handleActivateClick = useCallback(
    (office: Office, e: React.MouseEvent) => {
      e.stopPropagation();
      updateMutation.mutate(
        { id: office._id, data: { active: true } },
        { onSuccess: () => refetch() }
      );
    },
    [updateMutation, refetch]
  );

  const handleConfirmDeactivate = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget._id);
      setDeleteTarget(null);
      resetSidebar();
      refetch();
    } catch {
      // Error handled by mutation
    }
  }, [deleteTarget, deleteMutation, resetSidebar, refetch]);

  const formLoading = createMutation.isPending || updateMutation.isPending;
  const isOpen = sidebarType !== null;

  const columns: ColumnDef<Office>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: 'country',
        header: 'Country',
        accessorKey: 'country',
        cell: ({ row }) => <span>{row.original.country ?? '–'}</span>,
      },
      {
        id: 'timezone',
        header: 'Timezone',
        accessorKey: 'timezone',
        cell: ({ row }) => <span>{row.original.timezone ?? 'UTC'}</span>,
      },
      {
        id: 'employees',
        header: 'Members',
        accessorKey: 'employees',
        cell: ({ row }) => {
          const employees = row.original.employees as EmployeePopulated[] | string[] | undefined;
          const count =
            row.original.employee_count ??
            (Array.isArray(employees) ? employees.length : 0);
          if (count === 0) return <span className="text-gray-500">–</span>;
          const names = Array.isArray(employees)
            ? employees
                .slice(0, 3)
                .map((e) =>
                  typeof e === 'object' && e?.info?.name
                    ? e.info.name
                    : typeof e === 'object' && e?.login
                      ? e.login
                      : null
                )
                .filter(Boolean) as string[]
            : [];
          const rest = count - names.length;
          return (
            <span className="text-gray-800" title={count > 3 ? `${count} member(s)` : undefined}>
              {names.join(', ')}
              {rest > 0 ? ` +${rest}` : ''}
            </span>
          );
        },
      },
      {
        id: 'capacity',
        header: 'Capacity',
        accessorKey: 'capacity',
        cell: ({ row }) => <span>{row.original.capacity ?? '–'}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'active',
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.original.active === false ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-800'}`}
          >
            {row.original.active === false ? 'Inactive' : 'Active'}
          </span>
        ),
      },
      ...(perms?.update || perms?.manageEmployees || perms?.delete
        ? [
            {
              id: 'actions',
              header: 'Actions',
              size: 180,
              minSize: 180,
              cell: ({ row }: { row: { original: Office } }) => (
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {perms?.update && (
                    <Button
                      size="xs"
                      variant="default"
                      icon={<ApolloIcon name="file-edit" />}
                      onClick={(e) => handleEditClick(row.original, e)}
                    >
                      Edit
                    </Button>
                  )}
                  {perms?.manageEmployees && (
                    <Button
                      size="xs"
                      variant="default"
                      icon={<ApolloIcon name="user-plus" />}
                      onClick={(e) => handleAssignMembers(row.original, e)}
                    >
                      Members
                    </Button>
                  )}
                  {perms?.delete && row.original.active !== false && (
                    <Button
                      size="xs"
                      variant="default"
                      className="text-amber-700 hover:bg-amber-50"
                      onClick={(e) => handleDeactivateClick(row.original, e)}
                    >
                      Deactivate
                    </Button>
                  )}
                  {perms?.update && row.original.active === false && (
                    <Button
                      size="xs"
                      variant="default"
                      className="text-green-700 hover:bg-green-50"
                      onClick={(e) => handleActivateClick(row.original, e)}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              ),
            } as ColumnDef<Office>,
          ]
        : []),
    ],
    [perms?.update, perms?.manageEmployees, perms?.delete, handleEditClick, handleAssignMembers, handleDeactivateClick, handleActivateClick]
  );

  const tableConfig = useBaseTable({
    tableName: 'offices',
    data: offices,
    loading: isLoading,
    totalItems,
    pageIndex,
    pageSize,
    showPagination: !isOpen,
    search: search ?? '',
    columns,
    searchPlaceholder: 'Search by name, country, timezone...',
    isBackendSortingReady: false,
    selectable: false,
    actionBindUrlInQuery: true,
    onPaginationChange: (page, size, paramsOrSearch) => {
      const params: Record<string, string> = { pageIndex: String(page), pageSize: String(size) };
      const searchVal =
        paramsOrSearch && typeof paramsOrSearch === 'object' && 'search' in paramsOrSearch
          ? paramsOrSearch.search
          : typeof paramsOrSearch === 'string'
            ? paramsOrSearch
            : undefined;
      if (searchVal !== undefined && searchVal !== '') params.search = String(searchVal);
      onAppendQueryParams(params);
    },
    extraActions: perms?.update ? (
      <Button
        variant="solid"
        size="xs"
        icon={<ApolloIcon name="plus" className="text-md" />}
        onClick={sidebarType === 'create' ? handleFormSuccess : handleAddNew}
      >
        Create Office
      </Button>
    ) : undefined,
    onRowClick: (row) => {
      if (row?._id) handleRowClick(row);
    },
    rowClassName: (row) => (row?.original?._id === selectedId ? 'bg-blue-50 dark:bg-[var(--dm-bg-hover)] dark:text-[var(--dm-text-primary)]' : ''),
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'Offices',
    pageInfoSubtitlePrefix: 'Total Offices',
    fixedHeight: '85dvh',
    headerSticky: true,
  });

  const layout = getSidebarLayout(isOpen);

  if (isLoading && offices.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={40} />
      </div>
    );
  }

  return (
    <div className="mx-2 flex flex-col gap-4 xl:mx-0">
      <div className={layout.container}>
        <div className={`${layout.mainContent} relative z-10`}>
          <BaseTable {...tableConfig} />
        </div>
        <div
          className={`${layout.sidebar} border-l-2 border-gray-100 pl-2`}
          style={layout.sidebarStyles}
        >
          <Card className="border-none">
            <div className="w-full">
              {(sidebarType === 'create' || sidebarType === 'edit') && (
                <OfficeFormSidebar
                  type={sidebarType}
                  initial={sidebarType === 'edit' ? selectedOffice ?? null : null}
                  onClose={resetSidebar}
                  onSubmit={handleFormSubmit}
                  loading={formLoading}
                />
              )}
              {sidebarType === 'assignMembers' && selectedOffice && (
                <AssignMembersPanel
                  officeId={selectedOffice._id}
                  officeName={selectedOffice.name}
                  onClose={resetSidebar}
                />
              )}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate office?"
        confirmText="Deactivate"
        type="danger"
        confirmButtonProps={{ variant: 'destructive', loading: deleteMutation.isPending }}
      >
        {deleteTarget && (
          <p className="text-sm text-gray-600">
            &quot;{deleteTarget.name}&quot; will be deactivated. You can reactivate it later by updating the office.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
