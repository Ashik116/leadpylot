'use client';

import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { ColumnDef } from '@/components/shared/DataTable';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import type { EmailTemplateCategory } from '@/services/EmailTemplateCategoryService';
import {
  useCreateEmailTemplateCategory,
  useDeleteEmailTemplateCategory,
  useEmailTemplateCategories,
  useUpdateEmailTemplateCategory,
} from '@/services/hooks/useEmailTemplateCategories';
import { useCallback, useMemo, useState } from 'react';
import CategoryForm from './CategoryForm';

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategoriesModal({ isOpen, onClose }: CategoriesModalProps) {
  const { data: categories = [], isLoading } = useEmailTemplateCategories();
  const createMutation = useCreateEmailTemplateCategory();
  const updateMutation = useUpdateEmailTemplateCategory();
  const deleteMutation = useDeleteEmailTemplateCategory();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EmailTemplateCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<EmailTemplateCategory | null>(null);

  const handleCreateSubmit = useCallback(
    async (payload: { name: string }) => {
      await createMutation.mutateAsync(payload);
      setShowCreateModal(false);
    },
    [createMutation]
  );

  const handleEditSubmit = useCallback(
    async (payload: { name: string }) => {
      if (!editingCategory) return;
      await updateMutation.mutateAsync({ id: editingCategory._id, body: payload });
      setEditingCategory(null);
    },
    [editingCategory, updateMutation]
  );

  const handleDeleteConfirm = useCallback(() => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete._id);
      setCategoryToDelete(null);
    }
  }, [categoryToDelete, deleteMutation]);

  const columns: ColumnDef<EmailTemplateCategory>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        cell: (props) => String(props.row.original?.name ?? ''),
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
                setEditingCategory(props.row.original);
              }}
            />
            <Button
              variant="plain"
              size="xs"
              className="text-sand-2 hover:text-rust"
              icon={<ApolloIcon name="trash" className="text-md" />}
              onClick={(e) => {
                e.stopPropagation();
                setCategoryToDelete(props.row.original);
              }}
            />
          </div>
        ),
      },
    ],
    []
  );

  const tableConfig = useBaseTable<EmailTemplateCategory>({
    tableName: 'email-template-categories-modal',
    data: categories,
    loading: isLoading,
    totalItems: categories.length,
    pageIndex: 1,
    pageSize: Math.max(categories.length, 10),
    columns,
    selectable: false,
    rowIdField: '_id',
    showPagination: false,
    showSearchInActionBar: false,
    setPageInfoFromBaseTable: false,
    actionBindUrlInQuery: false,
    extraActions: (
      <Button
        variant="solid"
        size="sm"
        icon={<ApolloIcon name="plus" className="text-md" />}
        onClick={() => setShowCreateModal(true)}
      >
        Add new category
      </Button>
    ),
  });

  return (
    <>
      <Dialog isOpen={isOpen} onClose={onClose} width={880} contentClassName="p-0 flex flex-col max-h-[85vh] min-h-[29rem]">
        <div className="shrink-0 border-b border-gray-200 px-6 py-2">
          <h4 className="text-base font-semibold text-gray-900">Email Template Categories</h4>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-6 pb-4">
          <BaseTable {...tableConfig} />
        </div>
      </Dialog>

      <Dialog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        width={420}
        contentClassName="p-6"
      >
        <div className="mb-4 border-b border-gray-200 pb-4">
          <h4 className="text-base font-semibold text-gray-900">Add new category</h4>
        </div>
        <CategoryForm
          onSubmit={handleCreateSubmit}
          onCancel={() => setShowCreateModal(false)}
          submitLabel="Create"
          isSubmitting={createMutation.isPending}
        />
      </Dialog>

      <Dialog
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        width={420}
        contentClassName="p-3"
      >
        <div className="mb-1 border-b border-gray-200 py-1">
          <h4 className="text-base font-semibold text-gray-900">Edit category</h4>
        </div>
        {editingCategory && (
          <CategoryForm
            initialData={{ _id: editingCategory._id, name: editingCategory.name }}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingCategory(null)}
            submitLabel="Update"
            isSubmitting={updateMutation.isPending}
          />
        )}
      </Dialog>

      <ConfirmDialog
        type="warning"
        isOpen={!!categoryToDelete}
        title="Delete category"
        onCancel={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        confirmButtonProps={{ disabled: deleteMutation.isPending }}
      >
        {categoryToDelete && (
          <p>Are you sure you want to delete &quot;{categoryToDelete.name}&quot;?</p>
        )}
      </ConfirmDialog>
    </>
  );
}
