'use client';

import React, { useState, useEffect } from 'react';
import { useDroppable, useDndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SingleTask } from './SingleTask';
import { Button } from '../ui/Button';
import { ChevronLeft, ChevronRight, Inbox, Plus } from 'lucide-react';
import { useKanban } from './_contexts';
import { TaskInputForm } from './_components/TaskInputForm';
import { useCreateTask, useUpdateTask } from '@/hooks/useTasks';
import { Task } from './types';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { CardDetailsModal } from './CardDetailsModal';

import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

export const Sidebar: React.FC = () => {
  const {
    inboxCards,
    isInboxLoading,
    loadInboxTasks,
    updateCard,
    deleteCard,
    isDeletingTask,
    setInboxCards,
    inboxFilter,
    setInboxFilter,
    selectedBoardId,
    updateInboxCard,
    syncTaskFromApi,
  } = useKanban();

  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [inboxMeta, setInboxMeta] = useState<any>(null);
  const [newTitle, setNewTitle] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);

  // Load more function for infinite scroll
  const handleLoadMore = React.useCallback(async () => {
    if (isLoadingMore || isInboxLoading || !inboxMeta?.hasMore) return;

    try {
      setIsLoadingMore(true);
      const nextPage = (inboxMeta.page || 0) + 1;
      const meta = await loadInboxTasks({ page: nextPage });
      if (meta) {
        setInboxMeta(meta);
      }
    } catch (error) {
      console.error('Error loading more inbox tasks:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, isInboxLoading, inboxMeta?.hasMore, inboxMeta?.page, loadInboxTasks]);

  const { sentinelRef } = useInfiniteScroll({
    hasMore: !!inboxMeta?.hasMore,
    isLoading: isLoadingMore || isInboxLoading,
    onLoadMore: handleLoadMore,
    rootMargin: '100px',
  });

  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({
    id: 'inbox',
    disabled: active?.data.current?.type === 'List',
  });

  // Load inbox tasks on mount and when filter changes
  useEffect(() => {
    loadInboxTasks({ page: 1 }).then(setInboxMeta);
  }, [loadInboxTasks, inboxFilter]);

  // Create task mutation
  const createTaskMutation = useCreateTask();

  // Update task mutation
  const updateTaskMutation = useUpdateTask();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      if (editingTask) {
        // Store original task for potential revert
        const originalTask = editingTask;

        // Optimistic update: Update inbox card immediately in local state
        const updatedTask: Task = {
          ...editingTask,
          title: newTitle.trim(),
        };

        // Update local state directly
        setInboxCards((prev) =>
          prev.map((card) => (card.id === editingTask.id ? updatedTask : card))
        );

        try {
          // Update existing task via API
          await updateTaskMutation.mutateAsync({
            id: editingTask.id,
            data: {
              taskTitle: newTitle.trim(),
            },
          });

          toast.push(
            <Notification title="Success" type="success">
              Task updated successfully
            </Notification>
          );

          setNewTitle('');
          setIsAdding(false);
          setEditingTask(null);

          // Reload inbox tasks to ensure consistency with backend
          await loadInboxTasks();
        } catch (updateError: any) {
          // Revert optimistic update on error - restore original task
          setInboxCards((prev) =>
            prev.map((card) => (card.id === editingTask.id ? originalTask : card))
          );
          throw updateError;
        }
        return; // Exit early after successful update
      } else {
        // Create new task
        const createdTask = await createTaskMutation.mutateAsync({
          taskTitle: newTitle.trim(),
          taskDescription: '',
          // Don't assign to board/list - this makes it an inbox task
        });

        toast.push(
          <Notification title="Success" type="success">
            Task created successfully
          </Notification>
        );

        // Optimistic update: Add task to inbox immediately
        if (createdTask?.data) {
          const newTask: Task = {
            id: createdTask.data._id,
            title: createdTask.data.taskTitle || newTitle.trim(),
            description: createdTask.data.taskDescription || '',
            labels: [],
            members: [],
            checklist: [],
            checklists: [],
            comments: [],
            emails: [],
            status: 'Inbox',
            isCompleted: false,
            leadId: createdTask.data._id,
            agent: 'unassigned',
            project: 'N/A',
            contact: 'New Lead',
            phone: '',
            email: '',
            revenue: '0',
            source: 'Manual',
          };

          // Add optimistically to inbox
          setInboxCards((prev) => [newTask, ...prev]);
        }

        // Small delay to ensure API has indexed the new task, then refresh
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      setNewTitle('');
      setIsAdding(false);
      setEditingTask(null);

      // Reload inbox tasks to ensure consistency with backend
      await loadInboxTasks();
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast.push(
        <Notification title="Error" type="danger">
          {error?.message ||
            `Failed to ${editingTask ? 'update' : 'create'} task. Please try again.`}
        </Notification>
      );
    }
  };

  // Handle task click - open CardDetailsModal
  const handleTaskClick = (taskId: string) => {
    const task = inboxCards.find((t) => t.id === taskId);
    if (task) {
      setSelectedTaskForModal(task);
    }
  };

  // Handle edit icon click - fill form with task data
  const handleEditClick = (taskId: string) => {
    const task = inboxCards.find((t) => t.id === taskId);
    if (task) {
      setEditingTask(task);
      setNewTitle(task.title);
      setIsAdding(true);
    }
  };

  // Handle task delete
  const handleConfirmDelete = async (taskId: string) => {
    await deleteCard(taskId);
    // Reload inbox tasks to update the list
    await loadInboxTasks();
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setNewTitle('');
    setIsAdding(false);
    setEditingTask(null);
  };

  return (
    <div className="relative flex h-full">
      {/* Collapsed Arrow Icon - Sticky to Left */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="border-ocean-2/50 hover:bg-ocean-2/50 group absolute top-[1.17rem] -left-0.5 z-10 -translate-y-1/2 cursor-pointer rounded-r-md border-t border-r border-b bg-white p-[5px] text-black/80 shadow-sm transition-colors"
          title="Expand Inbox"
        >
          <ChevronRight className="h-4 w-4 group-hover:scale-150 group-hover:text-white" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`border-ocean-2/50 flex h-full flex-col overflow-hidden border-r bg-white transition-all duration-300 ${isExpanded ? 'w-72' : 'w-0'}`}
      >
        {/* Header */}
        <div className="border-ocean-2/50 flex shrink-0 items-center justify-between border-b px-4 py-[10.5px]">
          <div className="flex items-center gap-2 text-black">
            <Inbox className="text-ocean-2 h-5 w-5" />
            <span className="font-semibold">{inboxFilter === 'inbox' ? 'Inbox' : 'Email'}</span>
            <span className="bg-ocean-2/50 rounded-full px-2 text-sm">
              {isInboxLoading ? '...' : inboxCards.length}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="hover:bg-ocean-2/50 rounded-md p-1 text-black/80 transition-colors"
            title="Collapse"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Content - Only show when expanded */}
        {isExpanded && (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Add/Update Task Form - At Top */}
            <div className="border-ocean-2/50 shrink-0 border-b bg-gray-50/50 p-3">
              {isAdding ? (
                <TaskInputForm
                  value={newTitle}
                  onChange={setNewTitle}
                  onSubmit={handleSubmit}
                  onCancel={handleCancelEdit}
                  placeholder={editingTask ? 'Update task title...' : 'Enter a title...'}
                  submitText={editingTask ? 'Update' : 'Save'}
                  isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
                />
              ) : (
                <Button
                  variant="plain"
                  icon={<Plus className="mr-2 h-4 w-4" />}
                  onClick={() => {
                    setEditingTask(null);
                    setNewTitle('');
                    setIsAdding(true);
                  }}
                  className="flex w-full items-center justify-center rounded-lg p-2 text-sm text-black transition-colors hover:bg-gray-100"
                >
                  Add Task
                </Button>
              )}
            </div>

            {/* Filter Tabs - Above Task List */}
            <div className="border-ocean-2/50 flex shrink-0 gap-1 border-b bg-gray-50/50 p-2">
              <button
                onClick={() => {
                  if (inboxFilter !== 'inbox') {
                    setInboxFilter('inbox');
                  }
                }}
                className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${inboxFilter === 'inbox'
                  ? 'bg-ocean-2 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
              >
                Inbox
              </button>
              <button
                onClick={() => {
                  if (inboxFilter !== 'email') {
                    setInboxFilter('email');
                  }
                }}
                className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${inboxFilter === 'email'
                  ? 'bg-ocean-2 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
              >
                Email
              </button>
            </div>

            {/* Scrollable Task List - Below Add Form */}
            <div
              ref={setNodeRef}
              className={`custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3 ${isOver ? 'bg-ocean-2/30' : ''}`}
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(0, 0, 0, 0.1) transparent',
              }}
            >
              <SortableContext
                items={inboxCards?.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {inboxCards?.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                      No tasks in inbox
                    </div>
                  ) : null}
                  {inboxCards?.map((card) => (
                    <SingleTask
                      key={card.id}
                      singleTask={card}
                      onClick={handleTaskClick}
                      onEdit={handleEditClick}
                      onConfirmDelete={handleConfirmDelete}
                      isDeleting={isDeletingTask}
                      unAssign={true}
                      selectedBoardId={selectedBoardId}
                      updateInboxCard={updateInboxCard}
                      onTaskApiUpdate={(apiTask) => {
                        syncTaskFromApi(apiTask);
                        updateInboxCard(apiTask);
                      }}
                      hideBoardFeatures={true}
                    />
                  ))}
                </div>
                {/* Sentinel for infinite scroll */}
                <div ref={sentinelRef} className="h-4 w-full" />

                {isLoadingMore && (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  </div>
                )}
              </SortableContext>
            </div>
          </div>
        )}
      </aside>

      {/* Card Details Modal */}
      {selectedTaskForModal && (
        <CardDetailsModal
          taskId={selectedTaskForModal.id}
          onClose={() => setSelectedTaskForModal(null)}
          hideBoardFeatures={true}
        />
      )}
    </div>
  );
};
