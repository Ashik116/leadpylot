'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/stores/userStore';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Notification from '@/components/ui/Notification';
import Spinner from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination/Pagination';
import Tooltip from '@/components/ui/Tooltip';
import toast from '@/components/ui/toast';
import { LeadbotService } from '@/services/leadbot/LeadbotService';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { QuickActionTable } from './QuickActionTable';
import { QuickActionFormDialog } from './QuickActionFormDialog';
import { leadbotRichTooltipTitle } from '@/components/leadbot/LeadbotChat/leadbotRichTooltip';
import {
  EMPTY_FORM,
  QUERY_KEY,
  type FormMode,
  type ActionFormData,
  type QuickActionAdminItem,
} from './quickActions.types';

const QuickActions = () => {
  const currentUser = useCurrentUser();
  const userId = currentUser?._id ?? '';
  const queryClient = useQueryClient();

  // ── Dialog state ───────────────────────────────
  const [dialogMode, setDialogMode] = useState<FormMode>('create');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<QuickActionAdminItem | null>(null);
  const [dialogKey, setDialogKey] = useState(0);

  // ── Confirmation state ─────────────────────────
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // ── Toolbar state ──────────────────────────────
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterAvailable, setFilterAvailable] = useState<'all' | 'visible' | 'hidden'>('all');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [localOrderedItems, setLocalOrderedItems] = useState<QuickActionAdminItem[]>([]);

  // ── Pagination state ───────────────────────────
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // ── Selection state ────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Data ───────────────────────────────────────
  const { data, isLoading, error } = useQuery({
    queryKey: [...QUERY_KEY, userId, page, pageSize, search, filterActive, filterAvailable],
    queryFn: () =>
      LeadbotService.adminListQuickActions(userId, {
        page,
        limit: pageSize,
        search: search || undefined,
        is_active: filterActive === 'all' ? undefined : filterActive === 'active',
        is_visible: filterAvailable === 'all' ? undefined : filterAvailable === 'visible',
      }),
    enabled: !!userId,
    retry: false,
  });

  const items = data?.data ?? [];

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setPage(1);
  };

  // ── Mutations ──────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (body: { label: string; message: string; slug?: string }) =>
      LeadbotService.adminCreateQuickAction(userId, body),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast.push(<Notification title="Created" type="success">Quick action created.</Notification>);
    },
    onError: () => toast.push(<Notification title="Error" type="danger">Failed to create.</Notification>),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof LeadbotService.adminUpdateQuickAction>[2];
    }) => LeadbotService.adminUpdateQuickAction(userId, id, body),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast.push(<Notification title="Updated" type="success">Quick action updated.</Notification>);
    },
    onError: () => toast.push(<Notification title="Error" type="danger">Failed to update.</Notification>),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => LeadbotService.adminDeleteQuickAction(userId, id),
    onSuccess: () => {
      invalidate();
      setConfirmId(null);
      toast.push(<Notification title="Deleted" type="success">Quick action deleted permanently.</Notification>);
    },
    onError: () => toast.push(<Notification title="Error" type="danger">Delete failed.</Notification>),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => LeadbotService.adminBulkDelete(userId, ids),
    onSuccess: (res) => {
      invalidate();
      setSelectedIds(new Set());
      setBulkDeleteConfirmOpen(false);
      toast.push(
        <Notification title="Deleted" type="success">
          {res.deleted} quick action{res.deleted !== 1 ? 's' : ''} deleted permanently.
        </Notification>
      );
    },
    onError: () => toast.push(<Notification title="Error" type="danger">Bulk delete failed.</Notification>),
  });

  const toggleVisibleMutation = useMutation({
    mutationFn: (id: string) => LeadbotService.adminToggleVisible(userId, id),
    onSuccess: () => invalidate(),
    onError: () => toast.push(<Notification title="Error" type="danger">Toggle visibility failed.</Notification>),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => LeadbotService.adminToggleActive(userId, id),
    onSuccess: () => invalidate(),
    onError: () => toast.push(<Notification title="Error" type="danger">Toggle status failed.</Notification>),
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => LeadbotService.adminReorderQuickActions(userId, ids),
    onSuccess: () => {
      invalidate();
      setIsReorderMode(false);
      setLocalOrderedItems([]);
      toast.push(<Notification title="Reordered" type="success">Order saved successfully.</Notification>);
    },
    onError: () => toast.push(<Notification title="Error" type="danger">Failed to reorder.</Notification>),
  });

  const seedMutation = useMutation({
    mutationFn: () => LeadbotService.adminSeedQuickActions(userId),
    onSuccess: (res) => {
      invalidate();
      toast.push(<Notification title="Seeded" type="success">{res.message}</Notification>);
    },
    onError: () => toast.push(<Notification title="Error" type="danger">Failed to seed defaults.</Notification>),
  });

  // ── Handlers ───────────────────────────────────
  const openCreate = () => {
    setDialogMode('create');
    setEditTarget(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  };

  const openEdit = (item: QuickActionAdminItem) => {
    setDialogMode('edit');
    setEditTarget(item);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  };

  const handleFormSubmit = (form: ActionFormData) => {
    if (dialogMode === 'create') {
      createMutation.mutate({ label: form.label, message: form.message, slug: form.slug || undefined });
    } else if (editTarget) {
      updateMutation.mutate({
        id: editTarget._id,
        body: { label: form.label, message: form.message, slug: form.slug || undefined },
      });
    }
  };

  // Handle local reorder (just updates visual state, no API call)
  const handleReorderChange = (newItems: QuickActionAdminItem[]) => {
    setLocalOrderedItems(newItems);
  };

  // Save the reordered items to the API
  const handleSaveOrder = () => {
    const itemsToSave = localOrderedItems.length > 0 ? localOrderedItems : items;
    reorderMutation.mutate(itemsToSave.map((i) => i._id));
  };

  // Enter reorder mode and initialize local state
  const enterReorderMode = () => {
    setLocalOrderedItems([...items]);
    setIsReorderMode(true);
  };

  // Cancel reorder mode
  const cancelReorderMode = () => {
    setIsReorderMode(false);
    setLocalOrderedItems([]);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i._id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size > 0) {
      setBulkDeleteConfirmOpen(true);
    }
  };

  // ── Guard ──────────────────────────────────────
  if (!userId) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size={20} />
      </div>
    );
  }

  const initialForm: ActionFormData = editTarget
    ? { label: editTarget.label, message: editTarget.message, slug: editTarget.slug }
    : EMPTY_FORM;

  // ── Render ─────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              handleFilterChange();
            }}
            placeholder="Search actions..."
            className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
          />
          <select
            value={filterActive}
            onChange={(e) => {
              setFilterActive(e.target.value as typeof filterActive);
              handleFilterChange();
            }}
            className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={filterAvailable}
            onChange={(e) => {
              setFilterAvailable(e.target.value as typeof filterAvailable);
              handleFilterChange();
            }}
            className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Visibility</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          {isReorderMode ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={cancelReorderMode}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                size="sm"
                icon={<ApolloIcon name="check" />}
                onClick={handleSaveOrder}
                loading={reorderMutation.isPending}
              >
                Save Order
              </Button>
            </>
          ) : (
            <>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  icon={<ApolloIcon name="trash" />}
                  onClick={handleBulkDelete}
                >
                  Delete ({selectedIds.size})
                </Button>
              )}
              <Tooltip
                title={leadbotRichTooltipTitle(
                  'Seed Defaults',
                  items.length > 0
                    ? 'Disabled: Quick actions already exist. This button only adds default actions when the list is empty.'
                    : 'Add default quick actions to get started. This will only work when no actions exist.'
                )}
                placement="top"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ApolloIcon name="refresh" />}
                  onClick={() => seedMutation.mutate()}
                  loading={seedMutation.isPending}
                  disabled={items.length > 0}
                >
                  Seed Defaults
                </Button>
              </Tooltip>
              <Tooltip
                title={leadbotRichTooltipTitle(
                  'Reorder Quick Actions',
                  items.length < 2
                    ? 'Disabled: Need at least 2 actions to reorder. Add more actions first.'
                    : 'Enter reorder mode to change the order of quick actions by dragging them.'
                )}
                placement="top"
              >
                <Button
                  variant="default"
                  size="sm"
                  icon={<ApolloIcon name="reorder" />}
                  onClick={enterReorderMode}
                  disabled={items.length < 2}
                >
                  Reorder
                </Button>
              </Tooltip>
              <Tooltip
                title={leadbotRichTooltipTitle(
                  'Add Quick Action',
                  'Open the form to create a new quick action. Specify the label, message, and slug.'
                )}
                placement="top"
              >
                <Button
                  variant="solid"
                  size="sm"
                  icon={<ApolloIcon name="plus" />}
                  onClick={openCreate}
                >
                  Add Action
                </Button>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <QuickActionTable
        items={isReorderMode && localOrderedItems.length > 0 ? localOrderedItems : items}
        isLoading={isLoading}
        error={error}
        isReordering={reorderMutation.isPending}
        isReorderMode={isReorderMode}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        mutatingId={
          updateMutation.isPending
            ? (updateMutation.variables as any)?.id
            : deleteMutation.isPending
            ? (deleteMutation.variables as any)
            : toggleVisibleMutation.isPending
            ? (toggleVisibleMutation.variables as any)
            : toggleActiveMutation.isPending
            ? (toggleActiveMutation.variables as any)
            : null
        }
        onEdit={openEdit}
        onHardDelete={(id: string) => setConfirmId(id)}
        onToggleAvailable={(item) => toggleVisibleMutation.mutate(item._id)}
        onToggleActive={(item) => toggleActiveMutation.mutate(item._id)}
        onReorder={handleReorderChange}
        onAddFirst={openCreate}
        total={data?.total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {/* Create / Edit Dialog */}
      <QuickActionFormDialog
        key={dialogKey}
        isOpen={dialogOpen}
        mode={dialogMode}
        initial={initialForm}
        isLoading={createMutation.isPending || updateMutation.isPending}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleFormSubmit}
      />

      {/* Hard Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmId}
        onCancel={() => setConfirmId(null)}
        onConfirm={() => confirmId && deleteMutation.mutate(confirmId)}
        title="Delete Permanently"
        confirmText="Delete"
        confirmButtonProps={{ variant: 'solid', className: 'bg-red-600 hover:bg-red-700 border-red-600 text-white' }}
      >
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to permanently delete this quick action? This action cannot be undone.
        </p>
      </ConfirmDialog>

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirmOpen}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
        title="Delete Permanently"
        confirmText="Delete"
        confirmButtonProps={{ variant: 'solid', className: 'bg-red-600 hover:bg-red-700 border-red-600 text-white' }}
      >
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to permanently delete {selectedIds.size} quick action{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
        </p>
      </ConfirmDialog>
    </div>
  );
};

export default QuickActions;
