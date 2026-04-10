'use client';

import React, { useState } from 'react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { SingleList } from './SingleList';
import { Plus, X } from 'lucide-react';
import { useKanban } from './_contexts';
import { useCreateList } from '@/hooks/useBoards';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { Button } from '../ui';
import { KanbanBoardSkeleton } from '@/components/shared/loaders';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useAuth } from '@/hooks/useAuth';

export const Board: React.FC = () => {
  const { boardData, selectedBoardId, isKanbanLoading } = useKanban();
  const { user } = useAuth();
  const createListMutation = useCreateList();
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim() || !selectedBoardId) return;

    try {
      await createListMutation.mutateAsync({
        boardId: selectedBoardId,
        data: {
          CardTitle: newListTitle.trim(),
          types: 'todo',
        },
      });

      toast.push(
        <Notification title="Success" type="success">
          List created successfully
        </Notification>
      );

      setNewListTitle('');
      setIsAddingList(false);
    } catch (error: any) {
      console.error('Error creating list:', error);
      toast.push(
        <Notification title="Error" type="danger">
          {error?.message || 'Failed to create list. Please try again.'}
        </Notification>
      );
    }
  };

  const handleCancel = () => {
    setNewListTitle('');
    setIsAddingList(false);
  };

  // Show skeleton loader when board is loading
  if (isKanbanLoading) {
    return <KanbanBoardSkeleton />;
  }
  if (boardData.columnOrder.length === 0) {
    return <div className="flex h-full items-center justify-center">
      <div className="text-sm text-gray-500">No lists found</div>
    </div>
  }
  return (
    <div className="custom-scrollbar h-full flex-1 overflow-x-auto p-6 mr-4">
      <div className="flex h-full items-start gap-6">
        <SortableContext
          key={selectedBoardId || 'no-board'}
          items={boardData.columnOrder}
          strategy={horizontalListSortingStrategy}
        >
          {boardData.columnOrder.map((colId) => (
            <SingleList key={colId} listId={colId} />
          ))}
        </SortableContext>
        {(!boardData?.board?.is_system || user?.role === Role.ADMIN) ? (
          isAddingList ? (
            <div className="border-ocean-2/50 flex w-[272px] shrink-0 flex-col rounded-xl border bg-white p-3">
              <form onSubmit={handleSubmit} className="space-y-2">
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Enter list title..."
                  autoFocus
                  className="border-ocean-2/50 focus:ring-ocean-2/50 w-full rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-black focus:ring-2 focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    variant="secondary"
                    size="xs"
                    className="rounded-sm"
                    disabled={createListMutation.isPending}
                  >
                    {createListMutation.isPending ? 'Adding...' : 'Add List'}
                  </Button>
                  <Button
                    type="button"
                    variant="plain"
                    size="xs"
                    onClick={handleCancel}
                    className="rounded transition-colors hover:bg-gray-100"
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingList(true)}
              className="border-ocean-2/50 flex h-8 w-[272px] shrink-0 items-center gap-2 rounded-lg border border-dashed bg-gray-100 px-4 text-sm font-semibold text-black transition-colors hover:bg-gray-200"
            >
              <Plus className="h-5 w-5" />
              <span>Add a list</span>
            </button>
          )
        ) : null}


      </div>
    </div>
  );
};
