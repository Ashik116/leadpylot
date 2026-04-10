/**
 * TaskDrawer Component - Main orchestrator
 * Refactored with clean architecture
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Drawer from '@/components/ui/Drawer';
import { useTaskDrawer } from './hooks/useTaskDrawer';
import { useTaskFilters } from './hooks/useTaskFilters';
import { useEmailThread } from './hooks/useEmailThread';
import { useEmailComments } from './hooks/useEmailComments';
import { TaskDrawerHeader } from './components/TaskDrawerHeader';
import { TaskDrawerFooter } from './components/TaskDrawerFooter';
import { TaskDrawerEmptyState } from './components/TaskDrawerEmptyState';
import { TaskItem } from './components/TaskItem/TaskItem';
import { TaskItemSkeleton } from './components/TaskItem/TaskItemSkeleton';
import { EmailThread } from './components/EmailThread/EmailThread';
import { CommentSection } from './components/CommentSection/CommentSection';
import { TaskDetailModal } from './components/TaskDetailModal';
import { DRAWER_WIDTH } from './TaskDrawer.constants';
import type { TaskDrawerProps, TaskFilter } from './TaskDrawer.types';

const TaskDrawer = ({ isOpen, onClose, onPendingCountChange }: TaskDrawerProps) => {
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<TaskFilter>('pending');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Main hooks
  const {
    tasks,
    loading,
    isAdmin,
    fetchTasks,
    toggleTaskStatus,
    toggleTaskExpansion,
    isTaskExpanded,
    isUpdatingTask,
  } = useTaskDrawer({ isOpen, onPendingCountChange });

  const { filteredTasks, counts } = useTaskFilters({ tasks, filter });

  const { fetchEmailThread, toggleEmailExpansion, isLoadingThread, getThread, expandedEmails } =
    useEmailThread();

  const {
    fetchEmailComments,
    handleCommentChange,
    saveEmailComment,
    getComments,
    isLoadingComments,
    isSavingComment,
    getNewComment,
  } = useEmailComments();

  // Handle task expansion with email thread and comments fetching
  const handleTaskExpansion = (taskId: string, emailId?: string) => {
    const isCurrentlyExpanded = isTaskExpanded(taskId);
    toggleTaskExpansion(taskId);

    if (!isCurrentlyExpanded && emailId) {
      // Fetch email thread and comments if not already fetched
      const thread = getThread(taskId);
      if (thread.length === 0) {
        fetchEmailThread(taskId, emailId);
      }
      const comments = getComments(emailId);
      if (comments.length === 0) {
        fetchEmailComments(emailId);
      }
    }
  };

  // Navigation handlers
  const navigateToEmail = (emailId: string, todoType?: string) => {
    const url = todoType
      ? `/dashboards/mails?conversation=${emailId}&todoType=${todoType}`
      : `/dashboards/mails?conversation=${emailId}`;
    router.push(url);
  };

  const navigateToLead = (leadId: string) => {
    router.push(`/dashboards/leads/${leadId}`);
  };

  const navigateToTask = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleCloseModal = () => {
    setSelectedTaskId(null);
  };

  const handleStatusChange = () => {
    fetchTasks();
  };

  // Handle outside click to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const drawerSelectors = [
        '.drawer-content',
        '.drawer-header',
        '.drawer-footer',
        '.drawer-body',
      ];
      const dialogSelectors = ['.dialog-overlay', '.dialog', '.dialog-portal'];

      const isInsideDrawer =
        drawerRef.current?.contains(target) ||
        drawerSelectors.some((selector) => target.closest(selector));

      const isInsideDialog = dialogSelectors.some((selector) => target.closest(selector));

      if (!isInsideDrawer && !isInsideDialog) onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        onRequestClose={onClose}
        title="My Tasks"
        width={DRAWER_WIDTH}
        placement="right"
        showBackdrop={false}
        lockScroll={false}
        shouldCloseOnOverlayClick={false}
        shouldCloseOnEsc={false}
        style={{
          overlay: {
            backgroundColor: 'transparent',
            pointerEvents: 'none',
          },
          content: {
            pointerEvents: 'auto',
          },
        }}
        className="border-l border-gray-200 shadow-2xl"
        headerClass="border-b border-gray-200 bg-white h-[2.786rem]"
        bodyClass="p-0 bg-white"
        footer={
          <TaskDrawerFooter
            filter={filter}
            taskCount={filteredTasks.length}
            onRefresh={fetchTasks}
            isLoading={loading}
          />
        }
      >
        <div ref={drawerRef} className="flex h-full flex-col">
          {/* Filter Tabs */}
          <TaskDrawerHeader filter={filter} onFilterChange={setFilter} counts={counts} />

          {/* Task List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <TaskItemSkeleton key={`skeleton-${index}`} />
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <TaskDrawerEmptyState filter={filter} />
            ) : (
              <div className="space-y-3 p-4">
                {filteredTasks.map((task) => {
                  const isExpanded = isTaskExpanded(task._id);
                  const taskThread = getThread(task._id);
                  const isLoading = isLoadingThread(task._id);

                  return (
                    <TaskItem
                      key={task._id}
                      task={task}
                      isAdmin={isAdmin}
                      isExpanded={isExpanded}
                      isUpdating={isUpdatingTask(task._id)}
                      onToggleStatus={toggleTaskStatus}
                      onToggleExpansion={handleTaskExpansion}
                      onViewEmail={navigateToEmail}
                      onViewLead={navigateToLead}
                      onViewTask={navigateToTask}
                    >
                      {task.email_id && (
                        <>
                          {/* Email Thread */}
                          <EmailThread
                            emails={taskThread}
                            isLoading={isLoading}
                            expandedEmails={expandedEmails}
                            onToggleEmailExpansion={toggleEmailExpansion}
                          />

                          {/* Comment Section */}
                          <CommentSection
                            emailId={task.email_id}
                            comments={getComments(task.email_id)}
                            isLoading={isLoadingComments(task.email_id)}
                            newComment={getNewComment(task.email_id)}
                            isSaving={isSavingComment(task.email_id)}
                            onCommentChange={(value) => handleCommentChange(task.email_id!, value)}
                            onSaveComment={() => saveEmailComment(task.email_id!)}
                          />
                        </>
                      )}
                    </TaskItem>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Drawer>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={!!selectedTaskId}
        onClose={handleCloseModal}
        taskId={selectedTaskId}
        onStatusChange={handleStatusChange}
      />
    </>
  );
};

export default TaskDrawer;
