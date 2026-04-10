'use client';

import { useTask } from '@/hooks/useTasks';
import { ApiTask } from '@/services/TaskService';
import { X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Tabs } from '../ui';
import { CardDetailsModalSkeleton } from '@/components/shared/loaders';
import { CardDetailsLeftPanel } from './_components/CardDetailsLeftPanel';
import { CardDetailsRightPanel } from './_components/CardDetailsRightPanel';
import { useKanban } from './_contexts';
import { getCustomFields } from './_data/custom-fields-data';
import { getLabels } from './_data/labels-data';
import { useTaskOperations } from './_hooks/useTaskOperations';
import TaskLeadDetailsTab from './_components/TaskLeadDetailsTab';
import { useTaskLeadDetails } from './_hooks/useTaskLeadDetails';

// ============================================================================
// Inner Component that receives props
// ============================================================================

interface CardDetailsContentProps {
  task: ApiTask | undefined;
  isLoading: boolean;
  error: Error | null;
  onClose: () => void;
  operations: ReturnType<typeof useTaskOperations>;
  onRefetch: () => void;
  hideBoardFeatures?: boolean;
}

const CardDetailsContent: React.FC<CardDetailsContentProps> = ({
  task,
  isLoading,
  error,
  onClose,
  operations,
  onRefetch,
  hideBoardFeatures = false,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'kanban'>('kanban');
  const [localDescription, setLocalDescription] = useState(task?.taskDescription || '');
  const { availableBoards, selectedBoardId } = useKanban();


  // Sync local state with task data
  React.useEffect(() => {
    if (task) {
      setLocalDescription(task.taskDescription || '');
    }
  }, [task]);

  const selectedBoard = useMemo(() => {
    if (!selectedBoardId) return undefined;
    return availableBoards.find((board) => board?._id === selectedBoardId);
  }, [availableBoards, selectedBoardId]);
  const isEmailBoard = (selectedBoard?.board_type || '').toLowerCase().includes('email');

  // Get all task lead details data using custom hook
  const taskLeadDetails = useTaskLeadDetails({ task, activeTab, forceEmailTask: isEmailBoard });

  // Get all available data for labels, members, custom fields (must be before conditional returns)
  const allCustomFields = getCustomFields();

  // Map API labels to Label objects for display
  const taskLabelObjects = useMemo(() => {
    if (!task?.labels || !Array.isArray(task.labels)) return [];
    return task.labels
      .filter((l: any) => l.isSelected !== false)
      .map((apiLabel: any) => {
        const labelId = apiLabel._id || apiLabel.id;
        const labelTitle = apiLabel.title || apiLabel.name || '';

        // Try to find label in local storage by matching id or name/title
        const allLocalLabels = getLabels();
        const localLabel = allLocalLabels.find(
          (l) => l.id === labelId || l.name === labelTitle
        );

        // If found in local storage, use it; otherwise create from API data
        if (localLabel) {
          return localLabel;
        }

        // Create Label object from API data
        return {
          id: labelId || '',
          _id: labelId,
          name: labelTitle,
          title: labelTitle,
          color: apiLabel.color || '#4bce97',
        };
      });
  }, [task]);
  // Extract member IDs from API response (assigned is array of objects with _id and login)
  const taskMemberIds = useMemo(() => {
    if (!task?.assigned || !Array.isArray(task.assigned)) return [];
    // Handle both formats: array of strings or array of objects with _id
    return task.assigned.map((member: any) => {
      if (typeof member === 'string') {
        return member;
      }
      return member._id || member.id || '';
    }).filter(Boolean);
  }, [task]);
  // Extract custom field IDs from API response
  // const taskCustomFieldIds = useMemo(() => {
  //   if (!task?.custom_fields || !Array.isArray(task.custom_fields)) return [];
  //   return task.custom_fields.map((cf) => cf._id || cf.field_id || '').filter(Boolean);
  // }, [task?.custom_fields]);
  // const taskCustomFieldObjects = useMemo(
  //   () => getCustomFieldsByIds(taskCustomFieldIds),
  //   [taskCustomFieldIds]
  // );

  // Transform subTask to Checklist format for component compatibility
  const checklists = useMemo(() => {
    if (!task?.subTask || !Array.isArray(task.subTask)) return [];
    return task.subTask
      .filter((st: any) => !st?.isDelete && !st?.isDeleted)
      .map((st) => ({
        id: st._id || `checklist-${crypto.randomUUID()}`,
        title: st.taskTitle || 'Checklist',
        items: Array.isArray(st.todo)
          ? st.todo
            .filter((todo: any) => !todo?.isDelete && !todo?.isDeleted)
            .map((todo: any) => ({
              id: todo._id || `item-${crypto.randomUUID()}`,
              text: todo.title || '',
              completed: todo.isCompleted || false,
              dueDate: todo.dueDate,
              dueTime: todo.dueTime,
              // API returns "assigned" as array of objects: [{ _id: "...", login: "..." }]
              // Transform to assignedMembers for component compatibility
              assignedMembers: Array.isArray(todo.assigned) ? todo.assigned : (Array.isArray(todo.assignedMembers) ? todo.assignedMembers : []),
              reminder: todo.reminder,
            }))
          : [],
        hideCheckedItems: false,
        assignedMemberId: st.assigned,
        dueDate: st.dueDate,
        dueTime: st.dueTime,
        isCompleted: st.isCompleted || false,
      }));
  }, [task]);

  // Transform custom_fields to CustomFieldValue format for component compatibility
  const taskCustomFields = useMemo(() => {
    if (!task?.custom_fields || !Array.isArray(task.custom_fields)) return [];
    return task.custom_fields.map((cf) => {
      // For todo fields, the API stores the array in 'todo' property, not 'value'
      // Also transform API format (isCompleted, _id) to frontend format (completed, id)
      let value = cf.value;
      if (cf.field_type === 'todo' && Array.isArray(cf.todo)) {
        value = cf.todo.map((todo: any) => ({
          id: todo._id || todo.id,
          title: todo.title || todo.text || '',
          completed: todo.isCompleted !== undefined ? todo.isCompleted : (todo.completed || false),
          _id: todo._id, // Keep _id for backend reference
        }));
      }
      return {
        fieldId: cf._id || cf.field_id || '',
        value: value,
      };
    });
  }, [task]);

  // Transform attachment to Attachment format for component compatibility
  const attachments = useMemo(() => {
    if (!task?.attachment || !Array.isArray(task.attachment)) return [];
    return task.attachment.map((att: any) => ({
      id: att._id || att.id,
      filename: att.filename || att.name || 'Unknown',
      size: att.size || 0,
      type: att.type || att.mimeType || 'application/octet-stream',
      uploadedBy: att.uploadedBy || att.uploaded_by || 'Unknown',
      uploadedAt: att.uploadedAt || att.uploaded_at || new Date().toISOString(),
      url: att.url || att.url_path,
    }));
  }, [task]);



  // Comments are now handled directly in CommentsTab via API

  if (isLoading) {
    return <CardDetailsModalSkeleton />;
  }

  if (error || !task) {
    return (
      <div
        onClick={onClose}
        className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-1 backdrop-blur-md duration-300 cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="animate-in zoom-in-95 flex h-[94vh] w-full min-w-[95dvw] max-w-[95dvw] flex-col overflow-hidden rounded-md border border-ocean-2/50 bg-white shadow-2xl duration-200 cursor-default"
        >
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <p className="text-red-500 mb-2">Error loading task</p>
              <p className="text-sm text-gray-600">{error?.message || 'Task not found'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-1 backdrop-blur-md duration-300 cursor-pointer"
    >
      {/* Main Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-in zoom-in-95 flex h-[94vh] w-full min-w-[95dvw] max-w-[95dvw] flex-col overflow-hidden rounded-md border border-ocean-2/50 bg-white shadow-2xl duration-200 cursor-default"
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-2 shadow-sm">
          <div className="flex items-center">
            {taskLeadDetails.shouldShowTabs && (
              <Tabs
                value={activeTab}
                onChange={(value) => setActiveTab(value as 'details' | 'kanban')}
                variant="underline"
                className="shrink-0"
              >
                <Tabs.TabList>
                  <Tabs.TabNav value="details" className="px-3 py-1 text-sm">
                    Details
                  </Tabs.TabNav>
                  <Tabs.TabNav value="kanban" className="px-3 py-1 text-sm">
                    Kanban
                  </Tabs.TabNav>
                </Tabs.TabList>
              </Tabs>
            )}
          </div>
          <Button
            variant="plain"
            onClick={onClose}
            className="ml-auto rounded-lg p-1 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
            icon={<X className="h-4 w-4" />}
          />
        </div>

        <div className="xl:flex flex-1 overflow-y-auto xl:overflow-hidden">
          {activeTab === 'details' && taskLeadDetails.shouldShowTabs ? (
            // Details tab: Show full-width TaskLeadDetailsTab
            <div className="flex flex-1 overflow-hidden">
              <TaskLeadDetailsTab task={task} taskLeadDetails={taskLeadDetails} />
            </div>
          ) : (
            // Kanban tab: Show split view with LeftPanel and RightPanel
            <>
              {/* LEFT SIDE: TABS & CONTENT */}
              <div className="flex w-full xl:w-1/2 flex-col overflow-hidden border-r border-ocean-2/50">
                <CardDetailsLeftPanel
                  task={task}
                  description={localDescription}
                  onDescriptionChange={setLocalDescription}
                  taskLabelObjects={taskLabelObjects}
                  taskMembers={taskMemberIds}
                  taskDates={task.dueDate ? { dueDate: task.dueDate } : undefined}
                  checklists={checklists}
                  taskCustomFields={taskCustomFields}
                  customFields={allCustomFields}
                  attachments={attachments}
                  operations={operations}
                  onRefetch={onRefetch}
                  hideBoardFeatures={hideBoardFeatures}
                />
              </div>

              {/* RIGHT SIDE: COMMENTS & ACTIVITY */}
              <div className="w-full xl:w-1/2 overflow-hidden">
                <CardDetailsRightPanel card={task} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

interface CardDetailsModalProps {
  taskId: string;
  onClose: () => void;
  hideBoardFeatures?: boolean;
}

export const CardDetailsModal: React.FC<CardDetailsModalProps> = ({
  taskId,
  onClose,
  hideBoardFeatures = false,
}) => {

  const { data: taskResponse, isLoading, error, refetch } = useTask(taskId);
  const { syncTaskFromApi } = useKanban();

  // Use API response directly
  const task = useMemo(() => {
    if (!taskResponse?.data) return undefined;
    return taskResponse.data;
  }, [taskResponse]);

  // Extract board_id from task data
  const boardId = useMemo(() => {
    return task?.board_id;
  }, [task?.board_id]);


  // Sync task updates to KanbanContext when task data changes
  useEffect(() => {
    if (!task?._id) return;
    syncTaskFromApi(task);
  }, [task]); // eslint-disable-line react-hooks/exhaustive-deps

  // Setup operations hook
  const operations = useTaskOperations({
    taskId,
    boardId: boardId,
    onSuccess: async () => {
      // No manual refetch needed - useUpdateTask mutation already invalidates queries
      // The query will automatically refetch and syncTaskFromApi will be called via useEffect
    },
    onError: (err) => {
      // Error handling - operation will show error notification
      void err;
    },
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <CardDetailsContent
      task={task}
      isLoading={isLoading}
      error={error as Error | null}
      onClose={onClose}
      operations={operations}
      onRefetch={handleRefetch}
      hideBoardFeatures={hideBoardFeatures}
    />
  );
};
