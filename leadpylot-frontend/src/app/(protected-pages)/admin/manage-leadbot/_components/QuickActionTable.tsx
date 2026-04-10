'use client';

import { useRef, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Pagination from '@/components/ui/Pagination/Pagination';
import { SortableRow } from './SortableRow';
import type { QuickActionAdminItem } from './quickActions.types';

interface QuickActionTableProps {
  items: QuickActionAdminItem[];
  isLoading: boolean;
  error: unknown;
  isReordering: boolean;
  isReorderMode: boolean;
  selectedIds: Set<string>;
  onSelectAll: () => void;
  onSelectOne: (id: string) => void;
  mutatingId: string | null;
  onEdit: (item: QuickActionAdminItem) => void;
  onHardDelete: (id: string) => void;
  onToggleAvailable: (item: QuickActionAdminItem) => void;
  onToggleActive: (item: QuickActionAdminItem) => void;
  onReorder: (newItems: QuickActionAdminItem[]) => void;
  onAddFirst: () => void;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

export function QuickActionTable({
  items,
  isLoading,
  error,
  isReordering,
  isReorderMode,
  selectedIds,
  onSelectAll,
  onSelectOne,
  mutatingId,
  onEdit,
  onHardDelete,
  onToggleAvailable,
  onToggleActive,
  onReorder,
  onAddFirst,
  total = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
}: QuickActionTableProps) {
  // All hooks must be called before any conditional returns
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Ref for indeterminate checkbox state
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Calculate selection states
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  // Update indeterminate state
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item._id === active.id);
    const newIndex = items.findIndex((item) => item._id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = [...items];
      const [removed] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, removed);
      onReorder(newItems);
    }
  };

  // Early returns (after all hooks)
  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <Spinner size={24} />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
          <ApolloIcon name="alert-circle" className="text-2xl text-red-400" />
          <p className="text-xs">Failed to load quick actions. Is the Leadbot service running?</p>
        </div>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
          <ApolloIcon name="lightning" className="text-3xl" />
          <p className="text-xs">No quick actions found.</p>
          <Button variant="solid" size="sm" onClick={onAddFirst}>
            Add your first action
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="relative">
        {isReorderMode ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {/* Checkbox column */}
                    <th className="px-2 py-2 text-left w-8">
                      <label className="cursor-pointer checkbox-label">
                        <span className="checkbox-wrapper relative">
                          <input
                            ref={selectAllCheckboxRef}
                            className="checkbox rounded-none border-none"
                            type="checkbox"
                            checked={allSelected}
                            onChange={onSelectAll}
                            disabled={isLoading || items.length === 0}
                          />
                        </span>
                      </label>
                    </th>

                    {/* Order column */}
                    <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-12">
                      #
                    </th>

                    <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Label / Slug
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Message preview
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Available
                    </th>
                    <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-2 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <SortableContext
                    items={items.map((item) => item._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {items.map((item, idx) => {
                      const isSelected = selectedIds.has(item._id);
                      const isItemMutating = mutatingId === item._id;

                      return (
                        <SortableRow
                          key={item._id}
                          item={item}
                          index={idx}
                          isSelected={isSelected}
                          isReorderMode={isReorderMode}
                          isItemMutating={isItemMutating}
                          onEdit={onEdit}
                          onHardDelete={onHardDelete}
                          onToggleAvailable={onToggleAvailable}
                          onToggleActive={onToggleActive}
                          onSelectOne={onSelectOne}
                        />
                      );
                    })}
                  </SortableContext>
                </tbody>
              </table>
            </div>
          </DndContext>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {/* Checkbox column */}
                  <th className="px-2 py-2 text-left w-8">
                    <label className="cursor-pointer checkbox-label">
                      <span className="checkbox-wrapper relative">
                        <input
                          ref={selectAllCheckboxRef}
                          className="checkbox rounded-none border-none"
                          type="checkbox"
                          checked={allSelected}
                          onChange={onSelectAll}
                          disabled={isLoading || items.length === 0}
                        />
                      </span>
                    </label>
                  </th>

                  {/* Order column */}
                  <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-12">
                    #
                  </th>

                  <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Label / Slug
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Message preview
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-2 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => {
                  const isSelected = selectedIds.has(item._id);
                  const isItemMutating = mutatingId === item._id;

                  return (
                    <SortableRow
                      key={item._id}
                      item={item}
                      index={idx}
                      isSelected={isSelected}
                      isReorderMode={isReorderMode}
                      isItemMutating={isItemMutating}
                      onEdit={onEdit}
                      onHardDelete={onHardDelete}
                      onToggleAvailable={onToggleAvailable}
                      onToggleActive={onToggleActive}
                      onSelectOne={onSelectOne}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Global loading overlay for reorder */}
        {isReordering && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded-lg">
            <div className="flex items-center gap-2">
              <Spinner size={16} />
              <span className="text-xs text-gray-600">Saving order...</span>
            </div>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {total > pageSize && onPageChange && (
        <div className="flex justify-center">
          <Pagination
            currentPage={page}
            pageSize={pageSize}
            total={total}
            onChange={onPageChange}
          />
        </div>
      )}

      {/* Summary */}
      <p className="text-xs text-gray-400">
        {items.length} action{items.length !== 1 ? 's' : ''} shown
        {total !== undefined && total !== items.length ? ` (${total} total)` : ''}
      </p>
    </>
  );
}
