'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import { TaskInputForm } from '@/components/kanban-ui/_components/TaskInputForm';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import { useCreateTask } from '@/hooks/useTasks';
import type { CreateTaskRequest } from '@/services/TaskService';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateTaskPopoverStore } from '@/stores/createTaskPopoverStore';

const ADD_TASK_PLUS_TOOLTIP =
  'Add task (+): opens a quick form to create a new task linked to this lead (or offer/opening when applicable). After save, the task appears in the list and the Tasks counter refreshes.';

interface CreateTaskPopoverProps {
  leadId?: string;
  taskType?: string;
  offerId?: string;
  openingId?: string;
  triggerClassName?: string;
  triggerRef?: React.RefObject<HTMLDivElement | null>;
  children?: React.ReactNode;
  /** When true, popover is controlled by createTaskPopoverStore (opens from header when triggered from FilterTabs) */
  useStore?: boolean;
}

export default function CreateTaskPopover({
  leadId: propLeadId,
  taskType: propTaskType = 'lead',
  offerId: propOfferId,
  openingId: propOpeningId,
  triggerClassName = '',
  triggerRef: externalTriggerRef,
  children,
  useStore = false,
}: CreateTaskPopoverProps) {
  const store = useCreateTaskPopoverStore();
  const isStoreControlled = useStore;

  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isOpen = isStoreControlled ? store.isOpen : internalIsOpen;
  const leadId = isStoreControlled ? (store.leadId ?? propLeadId) : propLeadId;
  const taskType = isStoreControlled ? (store.taskType ?? propTaskType) : propTaskType;
  const [taskTitle, setTaskTitle] = useState('');
  const createTaskMutation = useCreateTask();
  const queryClient = useQueryClient();
  const internalRef = useRef<HTMLDivElement>(null);
  const triggerRef = externalTriggerRef ?? internalRef;

  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef?.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopoverStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      zIndex: 100010,
    });
  }, [triggerRef]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePopoverPosition();
    window.addEventListener('scroll', updatePopoverPosition, true);
    window.addEventListener('resize', updatePopoverPosition);
    return () => {
      window.removeEventListener('scroll', updatePopoverPosition, true);
      window.removeEventListener('resize', updatePopoverPosition);
    };
  }, [isOpen, updatePopoverPosition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.push(
        <Notification title="Error" type="warning">
          Please enter a task title
        </Notification>
      );
      return;
    }

    try {
      const payload: CreateTaskRequest = {
        taskTitle: taskTitle.trim(),
        taskDescription: '',
        ...(leadId && {
          lead_id: leadId,
          task_type: taskType,
          ...(taskType === 'offer' && propOfferId && { offer_id: propOfferId }),
          ...(taskType === 'opening' && propOpeningId && { opening_id: propOpeningId }),
        }),
      };
      await createTaskMutation.mutateAsync(payload);

      toast.push(
        <Notification title="Success" type="success">
          Task created successfully
        </Notification>
      );

      if (leadId) {
        queryClient.invalidateQueries({ queryKey: ['tasksByEntity'] });
        queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
        queryClient.invalidateQueries({ queryKey: ['activities'] });
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kanban:inbox-refresh'));
      }

      setTaskTitle('');
      if (isStoreControlled) store.close();
      else setInternalIsOpen(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create task. Please try again.';
      toast.push(
        <Notification title="Error" type="danger">
          {message}
        </Notification>
      );
    }
  };

  const handleClose = useCallback(() => {
    setTaskTitle('');
    if (isStoreControlled) store.close();
    else setInternalIsOpen(false);
  }, [isStoreControlled, store]);

  const handleCancel = handleClose;

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        triggerRef?.current &&
        !triggerRef.current.contains(target) &&
        !target.closest('[data-task-form]')
      ) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, triggerRef, handleClose]);

  const handleTriggerClick = () => {
    if (isStoreControlled) {
      store.open({ leadId: propLeadId, taskType: propTaskType });
    } else {
      setInternalIsOpen(true);
    }
  };

  return (
    <div ref={triggerRef} className="relative">
      {children ? (
        <div
          onClick={handleTriggerClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleTriggerClick()}
          className="inline-flex cursor-pointer"
        >
          {children}
        </div>
      ) : (
        <Tooltip
          title={ADD_TASK_PLUS_TOOLTIP}
          placement="top"
          wrapperClass="inline-flex"
          className="max-w-sm! text-xs leading-snug"
        >
          <Button
            onClick={handleTriggerClick}
            variant="default"
            size="xs"
            className={`ms-1 mt-1 h-5 w-5 rounded-md ${triggerClassName}`}
            disabled={createTaskMutation.isPending}
            aria-label="Add Task"
            icon={<Plus className="h-4 w-4" />}
          />
        </Tooltip>
      )}
      {isOpen &&
        typeof document !== 'undefined' &&
        Object.keys(popoverStyle).length > 0 &&
        createPortal(
          <div
            data-task-form
            className="min-w-[280px] rounded-lg border border-gray-200 bg-white p-2 shadow-xl"
            style={popoverStyle}
          >
            <TaskInputForm
              value={taskTitle}
              onChange={setTaskTitle}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              placeholder="Enter task title..."
              submitText="Add Task"
              isLoading={createTaskMutation.isPending}
              title={
                leadId
                  ? taskType === 'offer'
                    ? 'Create task for offer'
                    : taskType === 'opening'
                      ? 'Create task for opening'
                      : 'Create task for lead'
                  : 'Create task globally'
              }
            />
          </div>,
          document.body
        )}
    </div>
  );
}
