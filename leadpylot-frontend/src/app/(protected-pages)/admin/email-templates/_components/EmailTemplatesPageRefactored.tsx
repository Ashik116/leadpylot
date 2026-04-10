'use client';

import { useMemo, useState, useCallback } from 'react';
import { ColumnDef, Row } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useEmailTemplates, useDeleteEmailTemplate } from '@/services/hooks/useSettings';
import { EmailTemplate, apiGetEmailTemplates } from '@/services/SettingsService';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import CategoriesModal from './CategoriesModal';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import RoleGuard from '@/components/shared/RoleGuard';

const EmailTemplatesPageRefactored = () => {
  const pathname = usePathname();
  const router = useRouter();
  useSetBackUrl(pathname);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [selected, setSelected] = useState<{ name: string; id: string } | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  // Navigation handlers
  const handleAddNew = () => {
    router.push('/admin/email-templates/create');
  };

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/admin/email-templates/edit?id=${id}`);
    },
    [router]
  );

  const handleRowClick = (id: string) => {
    setActiveRowId(id);
    handleEdit(id);
  };

  const getRowClassName = (row: Row<EmailTemplate>) => {
    return row.original._id === activeRowId ? 'bg-blue-50' : '';
  };

  // Pagination state management
  const searchParams = useSearchParams();
  const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;

  const { data: templatesData, isLoading } = useEmailTemplates({
    page: pageIndex,
    limit: pageSize,
    search: search || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  });
  const { selected: selectedEmailTemplates, handleSelectAll: handleSelectAllEmailTemplate } =
    useSelectAllApi({
      apiFn: apiGetEmailTemplates,
      apiParams: {
        page: pageIndex,
        limit: pageSize,
        search: search || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        select: '_id',
      },
      total: templatesData?.meta?.total || 0,
      returnFullObjects: true,
    });
  const deleteTemplateMutation = useDeleteEmailTemplate();

  // Define columns for the DataTable
  const columns: ColumnDef<EmailTemplate>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        sortable: true,
        cell: (props) => String(props.row.original?.name || ''),
      },
      {
        id: 'slug',
        header: 'Slug',
        accessorKey: 'slug',
        sortable: true,
        cell: (props) => String((props.row.original as any)?.slug || ''),
      },
      {
        id: 'category',
        header: 'Category',
        accessorKey: 'category',
        sortable: true,
        cell: (props) => String((props.row.original as any)?.info?.category_id?.name || '-'),
      },
      {
        id: 'gender_type',
        header: 'Gender',
        accessorKey: 'gender_type',
        sortable: true,
        cell: (props) => {
          const gender = (props.row.original as any)?.gender_type;
          return gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : '-';
        },
      },
      {
        id: 'projects',
        header: 'Projects',
        accessorKey: 'projects',
        cell: (props) => {
          const projects = (props.row.original as any)?.projects;
          if (!projects || projects.length === 0) return '-';
          return projects.map((p: any) => p.name).join(', ');
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (props) => (
          <div className="flex items-center gap-2">
            <Button
              variant="plain"
              size="xs"
              className="text-sand-2 hover:text-ocean-2"
              icon={<ApolloIcon name="pen" className="text-md" />}
              onClick={(e) => {
                e.stopPropagation();
                if (props.row.original?._id) {
                  handleEdit(props.row.original?._id);
                }
              }}
            />
            <Button
              variant="plain"
              size="xs"
              className="text-sand-2 hover:text-rust"
              icon={<ApolloIcon name="trash" className="text-md" />}
              onClick={(e) => {
                e.stopPropagation();
                if (props.row.original._id) {
                  setSelected({ name: props.row.original?.name, id: props.row.original?._id });
                  setDeleteConfirmDialogOpen(true);
                }
              }}
            />
          </div>
        ),
      },
    ],
    [handleEdit]
  );

  // BaseTable configuration
  const tableConfig = useBaseTable({
    tableName: 'email-templates',
    data: templatesData?.data || [],
    loading: isLoading,
    totalItems: templatesData?.meta?.total || 0,
    pageIndex,
    pageSize,
    search,
    columns,
    selectable: true,
    returnFullObjects: true,
    selectedRows: selectedEmailTemplates,
    onSelectAll: handleSelectAllEmailTemplate,
    isBackendSortingReady: true,
    showPagination: true,
    bulkActionsConfig: {
      entityName: 'email-templates',
      deleteUrl: '/settings/email-templates/',
      invalidateQueries: ['email-templates'],
    },
    customActions: ({ setDeleteConfirmOpen }: { setDeleteConfirmOpen: (open: boolean) => void }) => (
      <RoleGuard>
        <Button
          variant="destructive"
          size="xs"
          icon={<ApolloIcon name="trash" className="text-md" />}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setDeleteConfirmOpen(true);
          }}
        >
          Delete
        </Button>
      </RoleGuard>
    ),
    extraActions: (
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          icon={<ApolloIcon name="folder" className="text-md" />}
          onClick={() => setCategoriesModalOpen(true)}
          size="xs"
        >
          Categories
        </Button>
        <Button
          variant="solid"
          icon={<ApolloIcon name="plus" className="text-md" />}
          onClick={handleAddNew}
          size="xs"
        >
          Add <span className="hidden md:inline">Template</span>{' '}
        </Button>
      </div>
    ),
    onRowClick: (row) => {
      if (row?._id) {
        handleRowClick(row?._id);
      }
    },
    rowClassName: getRowClassName,
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'Email Templates',
    pageInfoSubtitlePrefix: 'Total Templates',
  });

  return (
    <div className="mx-2 flex flex-col gap-4 xl:mx-0 px-4">
      <BaseTable {...tableConfig} />

      <CategoriesModal
        isOpen={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
      />

      <ConfirmDialog
        type="warning"
        isOpen={deleteConfirmDialogOpen}
        title="Warning"
        onCancel={() => {
          setDeleteConfirmDialogOpen(false);
          setSelected(null);
        }}
        onConfirm={async () => {
          if (selected?.id) {
            deleteTemplateMutation.mutate(selected?.id);
            setDeleteConfirmDialogOpen(false);
            setSelected(null);
          }
        }}
        confirmButtonProps={{ disabled: deleteTemplateMutation.isPending }}
      >
        <p>Are you sure you want to delete {selected?.name}?</p>
      </ConfirmDialog>
    </div>
  );
};

export default EmailTemplatesPageRefactored;
