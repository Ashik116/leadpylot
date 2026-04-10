'use client';

import { useMemo, useState, useCallback } from 'react';
import { ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import {
  useExtensions,
  useDeleteExtension,
  useUpdateExtensionRole,
} from '@/services/hooks/useFreePBXExtensions';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useDrawerStore } from '@/stores/drawerStore';
import ExtensionFormWrapper from './ExtensionFormWrapper';
import Badge from '@/components/ui/Badge';
import { usePathname, useSearchParams } from 'next/navigation';
import { useActiveRow } from '@/hooks/useActiveRow';
import { getSidebarLayout } from '@/utils/transitions';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import type { Extension } from '@/services/FreePBXExtensionService';
import Dialog from '@/components/ui/Dialog';
import { apiGetExtensions } from '@/services/FreePBXExtensionService';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';

const ExtensionsTableWrapper = () => {
  const pathname = usePathname();
  useSetBackUrl(pathname);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [extensionToDelete, setExtensionToDelete] = useState<Extension | null>(null);

  const {
    isOpen,
    sidebarType,
    selectedId,
    sidebarKey,
    resetDrawer,
    onOpenSidebar,
    onHandleSidebar,
  } = useDrawerStore();

  const deleteExtensionMutation = useDeleteExtension();
  const updateRoleMutation = useUpdateExtensionRole();

  // Use the active row hook
  const { handleRowClick, handleAddNew, handleEdit, handleFormSuccess, activeRowId } = useActiveRow(
    {
      onHandleSidebar,
      resetDrawer,
    }
  );

  // Custom row className for extensions (uses 'extension' field instead of '_id')
  const getRowClassName = (row: any) => {
    const baseClasses = 'hover:bg-sand-5 cursor-pointer transition-colors';
    const isActive = activeRowId === row.original?.extension;
    return `${baseClasses} ${isActive ? 'bg-sand-5 border-l-4 border-l-ocean-2' : ''}`;
  };

  // Pagination state management
  const searchParams = useSearchParams();
  const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const search = searchParams.get('search') || '';

  const { data: extensionsData, isLoading } = useExtensions({
    page: pageIndex,
    limit: pageSize,
    search: search || undefined,
  });

  const extensions = extensionsData?.data || [];
  const total = extensionsData?.metadata?.total || 0;

  // Select all functionality
  const { selected: selectedExtensions, handleSelectAll: handleSelectAllExtensions } =
    useSelectAllApi({
      apiFn: apiGetExtensions,
      apiParams: {
        page: pageIndex,
        limit: pageSize,
        search: search || undefined,
      },
      total: total,
      returnFullObjects: true,
    });

  // Handle delete
  const handleDeleteClick = (extension: Extension) => {
    setExtensionToDelete(extension);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!extensionToDelete) return;

    try {
      await deleteExtensionMutation.mutateAsync(extensionToDelete.extension);
      setDeleteDialogOpen(false);
      setExtensionToDelete(null);
    } catch {
      // Error is already handled by the mutation hook
    }
  };

  // Handle role change
  const handleRoleChange = useCallback(
    async (extension: string, newRole: 'admin' | 'agent') => {
      try {
        await updateRoleMutation.mutateAsync({ extension, role: newRole });
      } catch {
        // Error is already handled by the mutation hook
      }
    },
    [updateRoleMutation]
  );

  // Define columns for the DataTable
  const columns: ColumnDef<Extension>[] = useMemo(
    () => [
      {
        id: 'extension',
        header: 'Extension',
        accessorKey: 'extension',
        cell: (props: any) => (
          <span className="font-medium text-gray-800">{props.row.original?.extension}</span>
        ),
      },
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        cell: (props: any) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{props.row.original?.name}</span>
          </div>
        ),
      },
      {
        id: 'role',
        header: 'Role',
        accessorKey: 'role',
        cell: (props: any) => (
          <select
            value={props.row.original.role}
            onChange={(e) => {
              e.stopPropagation();
              handleRoleChange(props.row.original?.extension, e.target.value as 'admin' | 'agent');
            }}
            disabled={updateRoleMutation.isPending}
            className="focus:ring-ocean-5 rounded border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
        ),
      },
      {
        id: 'tech',
        header: 'Technology',
        accessorKey: 'tech',
        cell: (props: any) => (
          <Badge className="bg-ocean-9 text-ocean-2 uppercase">{props.row.original?.tech}</Badge>
        ),
      },
      {
        id: 'outboundcid',
        header: 'Outbound CID',
        accessorKey: 'outboundcid',
      },
      {
        id: 'voicemail',
        header: 'Voicemail',
        accessorKey: 'voicemail',
        cell: (props: any) => (
          <Badge
            className={
              props.row.original.voicemail !== 'novm'
                ? 'bg-emerald-9 text-emerald-2'
                : 'bg-gray-9 text-gray-2'
            }
          >
            {props.row.original?.voicemail !== 'novm' ? 'Enabled' : 'Disabled'}
          </Badge>
        ),
      },
      {
        id: 'sip_settings_count',
        header: 'SIP Settings',
        accessorKey: 'sip_settings_count',
        cell: (props: any) => (
          <span className="text-sm text-gray-600">
            {props.row.original?.sip_settings_count || 0} / 50
          </span>
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
                handleEdit(props.row.original?.extension);
              }}
              title="Edit extension"
            />
            <Button
              variant="plain"
              size="xs"
              className="text-rust-2 hover:text-rust-1"
              icon={<ApolloIcon name="trash" className="text-md" />}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(props.row.original);
              }}
              title="Delete extension"
            />
          </div>
        ),
      },
    ],
    [updateRoleMutation.isPending, handleEdit, handleRoleChange]
  );

  // BaseTable configuration
  const tableConfig = useBaseTable({
    tableName: 'freepbx-extensions',
    data: extensions,
    loading: isLoading,
    totalItems: total,
    pageIndex,
    pageSize,
    search,
    columns,
    selectable: true,
    returnFullObjects: true,
    isBackendSortingReady: false,
    selectedRows: selectedExtensions,
    onSelectAll: handleSelectAllExtensions,
    // bulkActionsConfig: {
    //   entityName: 'extensions',
    //   deleteUrl: '/freepbx/extensions/',
    //   invalidateQueries: ['freepbx-extensions'],
    //   singleDeleteConfig: {
    //     deleteFunction: apiDeleteExtension,
    //   },
    // },
    showPagination: !isOpen,
    extraActions: (
      <div className="flex items-center gap-2">
        <Button
          variant="solid"
          icon={<ApolloIcon name="plus" className="text-md" />}
          onClick={handleAddNew}
        >
          Add <span className="hidden md:inline">Extension</span>
        </Button>
      </div>
    ),
    onRowClick: (row) => handleRowClick(row?.extension),
    rowClassName: getRowClassName,
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'FreePBX Extensions',
    pageInfoSubtitlePrefix: 'Total Extensions',
  });

  // Get common transition classes
  const layout = getSidebarLayout(isOpen);

  return (
    <div className="mx-2 flex flex-col gap-4 xl:mx-0">
      <div>
        <div className={layout.container}>
          {/* Main content */}
          <div className={`${layout.mainContent} relative z-10`}>
            <BaseTable {...tableConfig} />
          </div>

          {/* Right sidebar for create/edit */}
          <div className={`${layout.sidebar} border-b-2 lg:border-b-0 lg:border-l-2 border-gray-100 lg:pl-2 text-sm`} style={layout.sidebarStyles}>
            <ExtensionFormWrapper
              key={`extension-${sidebarType || 'create'}-${selectedId}-${sidebarKey}`}
              type={sidebarType === 'edit' ? 'edit' : 'create'}
              extension={selectedId || undefined}
              onSuccess={handleFormSuccess}
              onClose={onOpenSidebar}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <div className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="bg-rust-9 rounded-full p-3">
              <ApolloIcon name="info-circle" className="text-rust-2 text-2xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Delete Extension</h3>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>

          {extensionToDelete && (
            <div className="mb-4 rounded-md bg-gray-50 p-4">
              <p className="mb-2 text-sm">You are about to delete:</p>
              <div className="space-y-1">
                <p className="font-medium">
                  {extensionToDelete?.name} ({extensionToDelete?.extension})
                </p>
                <p className="text-sm text-gray-600">Role: {extensionToDelete?.role}</p>
                <p className="text-sm text-gray-600">
                  Outbound CID: {extensionToDelete?.outboundcid}
                </p>
              </div>
            </div>
          )}

          <p className="mb-6 text-sm text-gray-700">
            This will delete the extension and all its settings from FreePBX. The system will
            automatically reload.
          </p>

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteExtensionMutation?.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              className="bg-rust-2 hover:bg-rust-1"
              onClick={confirmDelete}
              loading={deleteExtensionMutation?.isPending}
              icon={<ApolloIcon name="trash" className="text-md" />}
            >
              Delete Extension
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ExtensionsTableWrapper;
