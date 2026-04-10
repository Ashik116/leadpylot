'use client';

import React, { useCallback, useState, useEffect, useRef, startTransition, useMemo } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDndContext } from '@dnd-kit/core';
import { SingleTask } from './SingleTask';
import { TaskInputForm } from './_components/TaskInputForm';
import { MoreHorizontal, Plus, ArrowDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { ListMenuDropdown } from './_dropdowns/lists/ListMenuDropdown';
import { useKanban } from './_contexts';
import { useCreateTask } from '@/hooks/useTasks';
import { useUpdateList } from '@/hooks/useBoards';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { getTextColor } from '@/utils/getTextColor';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

interface SingleListProps {
  listId: string;
}

const SingleListComponent: React.FC<SingleListProps> = ({ listId }) => {
  const {
    boardData,
    setActiveCardId,
    deleteList,
    updateListTitle,
    setListBackgroundColor,
    selectedBoardId,
    loadListTasks,
    updateCard,
    deleteCard,
    updateInboxCard,
    syncTaskFromApi,
  } = useKanban();

  const singleList = boardData.columns[listId];
  // Memoize cards array to prevent unnecessary recalculations
  // Only recalculate when cardIds array reference changes or boardData.cards changes
  const cards = useMemo(() => {
    if (!singleList?.cardIds || !singleList.cardIds.length) return [];
    return singleList.cardIds.map((id) => boardData.cards[id]).filter(Boolean);
  }, [singleList?.cardIds, boardData.cards]);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !singleList?.meta?.hasMore || !selectedBoardId) return;

    try {
      setIsLoadingMore(true);
      const nextPage = (singleList.meta.page || 0) + 1;
      await loadListTasks(selectedBoardId, listId, { page: nextPage });
    } catch (error) {
      console.error('Error loading more tasks:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, singleList?.meta, selectedBoardId, listId, loadListTasks]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore: !!singleList?.meta?.hasMore,
    isLoading: isLoadingMore,
    onLoadMore: handleLoadMore,
  });
  const [addFromTop, setAddFromTop] = useState(false); // Track if adding from header (+) or bottom button
  const [newTitle, setNewTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(singleList?.title || '');
  const prevTitleRef = useRef(singleList?.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const createTaskMutation = useCreateTask();
  const updateListMutation = useUpdateList();

  const { active, over } = useDndContext();

  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: listId,
    data: { type: 'List', list: singleList },
  });

  // Combine refs (legacy support if needed, otherwise just use setNodeRef)
  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
  };

  const isOverMe = over?.id === listId;
  const isCardBeingDragged = active?.data.current?.type === 'Card';
  const isListBeingDragged = active?.data.current?.type === 'List';

  const isCardOverMe = isOverMe && isCardBeingDragged;
  const isListOverMe = isOverMe && isListBeingDragged && active?.id !== listId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !selectedBoardId) return;

    try {
      await createTaskMutation.mutateAsync({
        taskTitle: newTitle.trim(),
        taskDescription: '',
        priority: 'high',
        position: 0,
        board_id: [selectedBoardId],
        list_id: [listId],
      });

      // Reload list tasks to show the new task
      if (selectedBoardId) {
        await loadListTasks(selectedBoardId, listId);
      }

      toast.push(
        <Notification title="Success" type="success">
          Task created successfully
        </Notification>
      );

      setNewTitle('');
      // Keep form visible so user can add another task; hide only via Cancel
    } catch (error: any) {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.message || 'Failed to create task. Please try again.'}
        </Notification>
      );
    }
  };

  const handleTitleDoubleClick = () => {
    setIsEditingTitle(true);
    setEditedTitle(singleList?.title || '');
  };

  const handleTitleSave = async () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== singleList?.title) {
      try {
        // Optimistic update
        updateListTitle(listId, trimmedTitle);
        setIsEditingTitle(false);

        if (selectedBoardId) {
          await updateListMutation.mutateAsync({
            listId,
            boardId: selectedBoardId,
            data: { CardTitle: trimmedTitle },
          });

          toast.push(
            <Notification title="Success" type="success">
              List title updated successfully
            </Notification>
          );
        }
      } catch (error: any) {
        // Revert on error
        updateListTitle(listId, singleList?.title || '');
        setEditedTitle(singleList?.title || '');

        toast.push(
          <Notification title="Error" type="danger">
            {error?.message || 'Failed to update list title. Please try again.'}
          </Notification>
        );
      }
    } else {
      setEditedTitle(singleList?.title || '');
      setIsEditingTitle(false);
    }
  };

  const handleTitleCancel = () => {
    setEditedTitle(singleList?.title || '');
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleTitleCancel();
    }
  };

  // Sync editedTitle when singleList.title prop changes
  useEffect(() => {
    if (!isEditingTitle && singleList?.title && prevTitleRef.current !== singleList.title) {
      prevTitleRef.current = singleList.title;
      startTransition(() => {
        setEditedTitle(singleList.title);
      });
    }
  }, [singleList?.title, isEditingTitle]);

  const backgroundColor = singleList?.backgroundColor || '#ffffff';

  const handleDelete = async () => {
    try {
      await deleteList(listId);
      toast.push(
        <Notification title="Success" type="success">
          List deleted successfully
        </Notification>
      );
    } catch (error: any) {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.message || 'Failed to delete list. Please try again.'}
        </Notification>
      );
    }
  };

  const handleSetBackgroundColor = async (color: string) => {
    try {
      // Optimistic update for immediate UI feedback
      setListBackgroundColor(listId, color);

      if (selectedBoardId) {
        // Update via API
        await updateListMutation.mutateAsync({
          listId,
          boardId: selectedBoardId,
          data: { color: color || undefined }, // Use undefined for empty string to clear color
        });

        toast.push(
          <Notification title="Success" type="success">
            List color updated successfully
          </Notification>
        );
      }
    } catch (error: any) {
      // Revert on error
      setListBackgroundColor(listId, singleList?.backgroundColor || '#ffffff');

      toast.push(
        <Notification title="Error" type="danger">
          {error?.message || 'Failed to update list color. Please try again.'}
        </Notification>
      );
    }
  };

  if (!singleList) return null;

  return (
    <div
      ref={combinedRef}
      // style={{ ...style, backgroundColor }}
      className={`border-ocean-2/20 relative flex max-h-full w-[310px] shrink-0 flex-col overflow-hidden rounded-md border transition-all duration-200 ${isDragging ? 'opacity-50 shadow-2xl' : ''} ${isCardOverMe ? 'ring-2 ring-indigo-500 ring-offset-2' : ''} ${isListOverMe ? 'z-20 scale-[1.02] ring-2 ring-blue-500 ring-offset-2' : ''}`}
    >
      {/* Card Drop zone indicator */}
      {isCardOverMe && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-indigo-500/10">
          <div className="flex flex-col items-center gap-2 text-indigo-600">
            <ArrowDown className="h-8 w-8 animate-bounce" />
            <span className="text-sm font-semibold">Drop here</span>
          </div>
        </div>
      )}

      {/* List Drop zone indicator */}
      {isListOverMe && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-blue-500 bg-blue-500/10">
          <div className="flex flex-col items-center gap-2 text-blue-600">
            <ArrowDown className="h-8 w-8 animate-bounce" />
            <span className="text-sm font-semibold">Move List Here</span>
          </div>
        </div>
      )}
      <div
        className="flex min-w-0 items-center gap-0.5 px-3"
        style={{ backgroundColor }}
        {...(!isEditingTitle ? { ...attributes, ...listeners } : {})}
      >
        {isEditingTitle ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            autoFocus
            className="border-ocean-2/50 focus:ring-ocean-2/50 min-w-0 flex-1 rounded border bg-white px-2 text-base font-bold text-black focus:ring-2 focus:outline-none"
          />
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <h3
                className="min-w-0 flex-1 cursor-pointer truncate rounded px-2 py-1 text-base font-bold transition-colors"
                style={{ color: getTextColor(backgroundColor) }}
                onDoubleClick={handleTitleDoubleClick}
                title={editedTitle}
              >
                {editedTitle}
              </h3>
              {/* {singleList?.meta?.total && singleList?.meta?.total > 0 ? (
                <p
                  className="shrink-0 rounded-full bg-indigo-500/10 px-2 py-1 text-xs whitespace-nowrap"
                  style={{ color: getTextColor(backgroundColor) + '99' }}
                >
                  {singleList?.meta?.total} tasks
                </p>
              ) : null} */}
            </div>
          </>
        )}
        <div className="flex shrink-0 items-center">
          <Button
            variant="plain"
            onClick={(e) => {
              e.stopPropagation();
              setAddFromTop(true);
              setIsAdding(true);
            }}
            className="group"
            title="Add Task"
            icon={
              <Plus
                className="h-3 w-3 transition-colors group-hover:text-gray-800!"
                style={{
                  color: getTextColor(backgroundColor),
                }}
              />
            }
          />
          <Button
            variant="plain"
            ref={menuButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(true);
            }}
            className="group"
            icon={
              <MoreHorizontal
                className="h-4 w-4 transition-colors group-hover:text-gray-800!"
                style={{
                  color: getTextColor(backgroundColor),
                }}
              />
            }
          />
        </div>
      </div>
      <div className="mx-3 border-t pb-2" />
      <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto px-2 pb-2">
        {/* Add Task Form - Show at top when adding from header (+) */}
        {isAdding && addFromTop && (
          <TaskInputForm
            value={newTitle}
            onChange={setNewTitle}
            onSubmit={handleSubmit}
            onCancel={() => {
              setNewTitle('');
              setIsAdding(false);
              setAddFromTop(false);
            }}
            placeholder="Enter a title..."
            submitText="Save"
            isLoading={createTaskMutation.isPending}
          />
        )}

        {/* Tasks List */}
        <SortableContext items={singleList.cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SingleTask
              key={card.id}
              singleTask={card}
              onClick={setActiveCardId}
              onUpdate={updateCard}
              onConfirmDelete={deleteCard}
              selectedBoardId={selectedBoardId}
              updateInboxCard={updateInboxCard}
              onTaskApiUpdate={(apiTask) => {
                syncTaskFromApi(apiTask);
                updateInboxCard(apiTask);
              }}
              is_system={boardData?.board?.is_system || false}
            />
          ))}
        </SortableContext>

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1 w-full" />

        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        )}

        {/* Add Task Form - Show at bottom when adding from bottom button */}
        {isAdding && !addFromTop && (
          <TaskInputForm
            value={newTitle}
            onChange={setNewTitle}
            onSubmit={handleSubmit}
            onCancel={() => {
              setNewTitle('');
              setIsAdding(false);
              setAddFromTop(false);
            }}
            placeholder="Enter a title..."
            submitText="Save"
            isLoading={createTaskMutation.isPending}
          />
        )}

        {/* Add Task Button - Show at bottom when not adding */}
        {!isAdding && (
          <Button
            variant="plain"
            icon={<Plus className="mr-2 h-4 w-4" />}
            onClick={() => {
              setAddFromTop(false);
              setIsAdding(true);
            }}
            className="flex w-full items-center rounded-lg p-2 text-sm hover:bg-transparent"
          // style={{ color: getTextColor(backgroundColor) }}
          >
            Add Task
          </Button>
        )}
      </div>

      {/* List Menu Dropdown */}
      <ListMenuDropdown
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        triggerRef={menuButtonRef as React.RefObject<HTMLElement>}
        is_system={boardData?.board?.is_system || false}
        // currentBackgroundColor={singleList.backgroundColor}
        onDelete={handleDelete}
        onSetBackgroundColor={handleSetBackgroundColor}
      />
    </div>
  );
};

// Memoize SingleList to prevent re-renders when other lists change
// Only re-render if listId changes or if this list's data actually changed
export const SingleList = React.memo(SingleListComponent, (prevProps, nextProps) => {
  // Only re-render if listId changes
  return prevProps.listId === nextProps.listId;
});
