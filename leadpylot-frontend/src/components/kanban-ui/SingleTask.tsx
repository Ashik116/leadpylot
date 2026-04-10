import ConfirmPopover from '@/components/shared/ConfirmPopover';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Pencil } from 'lucide-react';
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { SingleTaskFooter } from './_components/SingleTaskFooter';
import { ShortDescription } from './_components/ShortDescription';
import { TaskSortComment } from './_components/TaskSortComment';
import { ShortChecklist } from './_components/ShortChecklist';
import { Task } from './types';
import { createLabel, updateLabel as updateLabelData } from './_data/labels-data';
import { LabelsDropdown } from './_dropdowns/labels/LabelsDropdown';
import { CreateLabelDropdown } from './_dropdowns/labels/CreateLabelDropdown';
import { useLabelsDropdown } from './_hooks/useLabelsDropdown';
import { useSingleTaskHandlers } from './_hooks/useSingleTaskHandlers';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { ApiTask } from '@/services/TaskService';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useAuth } from '@/hooks/useAuth';
import TaskTypeBadge from './_components/TaskTypeBadge';

interface SingleTaskProps {
  singleTask: Task;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void;
  onConfirmDelete?: (id: string) => Promise<void>;
  onUpdate?: (updatedTask: Task) => void;
  isDeleting?: boolean;
  isOverlay?: boolean;
  unAssign?: boolean;
  onEdit?: (id: string) => void;
  selectedBoardId: string | null;
  updateInboxCard: (updatedApiTask: ApiTask) => void;
  /** Sync task from API after date/member update so footer shows changes immediately */
  onTaskApiUpdate?: (apiTask: ApiTask) => void;
  hideBoardFeatures?: boolean;
  is_system?: boolean;
}

// eslint-disable-next-line react/display-name
export const SingleTask: React.FC<SingleTaskProps> = React.memo(
  ({
    singleTask,
    onClick,
    onUpdate,
    onDelete,
    onConfirmDelete,
    isDeleting,
    isOverlay,
    unAssign,
    selectedBoardId,
    updateInboxCard,
    onTaskApiUpdate,
    hideBoardFeatures = false,
    is_system = false,
  }) => {

    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(singleTask.title);
    const [showDescriptionIcon, setShowDescriptionIcon] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showChecklist, setShowChecklist] = useState(false);

    const inputRef = React.useRef<HTMLTextAreaElement>(null);
    const measureRef = React.useRef<HTMLSpanElement>(null);
    const editLabelButtonRef = useRef<HTMLButtonElement>(null);
    const titleRef = React.useRef<HTMLHeadingElement>(null);
    const [isTitleTruncated, setIsTitleTruncated] = useState(false);

    // Use custom hook for all handlers
    const {
      handleDoubleClick,
      handleSingleClick,
      handleTitleKeyDown,
      handleDelete,
      handleSubmit,
      handleCancel,
      handleUpdateDescription,
      updateInputSize,
    } = useSingleTaskHandlers({
      singleTask,
      onClick,
      onDelete,
      onUpdate,
      unAssign,
      selectedBoardId: selectedBoardId || null,
      updateInboxCard,
      setIsEditing,
      setEditTitle,
      isEditing,
      editTitle,
      inputRef,
      measureRef,
    });

    // Labels operations
    const createNewLabel = useCallback((data: { name: string; color: string }) => {
      const newLabel = createLabel(data);
      return newLabel;
    }, []);

    const editLabel = useCallback((id: string, data: { name: string; color: string }) => {
      updateLabelData(id, data);
    }, []);

    // Use shared hook for LabelsDropdown state management
    const labelsDropdown = useLabelsDropdown({
      createNewLabel,
      editLabel,
    });

    // Get current labels from task (API format)
    // Pass the full label objects so LabelsDropdown can check isSelected property
    // The API returns labels as objects with isSelected property
    const currentLabels = useMemo(() => {
      if (!singleTask.labels || !Array.isArray(singleTask.labels)) return [];
      // Return labels as-is from API (they should have isSelected property)
      return singleTask.labels;
    }, [singleTask.labels]);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: singleTask.id,
      data: { type: 'Card', card: singleTask },
    });

    const style = {
      transform: CSS.Translate.toString(transform),
      transition,
    };

    if (isDragging && !isOverlay) {
      return (
        <div
          ref={setNodeRef}
          style={style}
          className="h-32 w-full rounded-lg border-2 border-dashed border-gray-300/50 bg-gray-50/50 opacity-60 transition-all"
          aria-hidden="true"
        />
      );
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...(!isEditing && !showDescriptionIcon ? { ...attributes, ...listeners } : {})}
        onDoubleClick={handleDoubleClick}
        onClick={handleSingleClick}
        className={`group relative w-full rounded-md bg-gray-100 p-3 shadow-md ${isEditing || showDescriptionIcon ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'} border transition-all hover:border-black ${isOverlay ? 'shadow-2xl' : ''}`}
      >
        {/* Edit and Delete Icons - Top Right */}
        {!isEditing && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {/* Edit Label Icon */}
            {
              !hideBoardFeatures && (
                <Button
                  ref={editLabelButtonRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    labelsDropdown.openLabelsDropdown();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  size="xs"
                  variant="plain"
                  className="rounded-md bg-white p-1 text-blue-500 transition-colors"
                  title="Edit labels"
                  icon={<Pencil className="h-3.5 w-3.5" />}
                />
              )
            }

            {/* Delete Icon */}
            {(onDelete || onConfirmDelete) && (
              <>
                {onDelete && (
                  <Button
                    onClick={handleDelete}
                    size="xs"
                    variant="plain"
                    className="rounded-md bg-red-500/10 p-1 text-red-500 transition-colors"
                    title="Delete task"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                  />
                )}
                {onConfirmDelete && (!is_system || Role.ADMIN === user?.role) && (
                  <ConfirmPopover
                    title="Delete Task"
                    description="Are you sure you want to delete this task? This cannot be undone."
                    confirmText="Delete"
                    onConfirm={() => onConfirmDelete(singleTask.id)}
                    isLoading={isDeleting}
                    placement="left"
                  >
                    <Button
                      onClick={(e) => e.stopPropagation()}
                      size="xs"
                      variant="plain"
                      className="rounded-md bg-white p-1 text-red-500 transition-colors"
                      title="Delete task"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                    />
                  </ConfirmPopover>
                )}
              </>
            )}
          </div>
        )}
        {singleTask?.labels?.length > 0 && (
          <div className="mb-2 flex items-start justify-between">
            <div className="flex flex-wrap gap-1">
              {singleTask?.labels?.map((label: any) => (
                <div
                  key={label?._id}
                  className="h-1.5 w-8 rounded-full"
                  style={{ backgroundColor: label?.color || '#fff' }}
                />
              ))}
            </div>
          </div>
        )}
        <div className="mb-1 flex min-h-[24px] items-start min-w-0 w-full">
          {isEditing ? (
            <div onClick={(e) => e.stopPropagation()} className="relative inline-block w-full">
              {/* Hidden span to measure text width */}
              <span
                ref={measureRef}
                className="invisible absolute px-2 text-[14px] leading-snug font-semibold whitespace-pre-wrap"
                aria-hidden="true"
                style={{ width: '100%', maxWidth: '100%' }}
              >
                {editTitle || 'Enter task title...'}
              </span>
              <textarea
                ref={inputRef}
                value={editTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  // Update size based on content
                  requestAnimationFrame(() => {
                    updateInputSize();
                  });
                }}
                onBlur={handleSubmit}
                onKeyDown={(e) => handleTitleKeyDown(e, handleSubmit, handleCancel)}
                onFocus={(e) => {
                  // Set cursor to end of text
                  const length = e.target.value.length;
                  e.target.setSelectionRange(length, length);
                }}
                autoFocus
                rows={1}
                className="block resize-none overflow-hidden rounded border bg-transparent px-0 py-0 text-[14px] leading-snug font-semibold text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                placeholder="Enter task title..."
                style={{ width: '100px', maxWidth: '100%', minHeight: '20px' }}
              />
            </div>
          ) : (
            <div className="group/title flex items-start gap-2 min-w-0 w-full">
              {/* <div className="mt-0.5 shrink-0 w-0 transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100 group-hover:w-4 -translate-x-3 group-hover:translate-x-0">
              <TaskCompletionToggle
                isCompleted={singleTask.isCompleted}
                onToggle={handleToggleComplete}
                size="sm"
                disabled={updateTaskMutation.isPending}
              />
            </div> */}
              {isTitleTruncated ? (
                <Tooltip
                  title={singleTask.title}
                  placement="right"
                  className="max-w-[250px] break-words bg-white text-gray-900 border border-gray-200 shadow-lg px-3 py-2"
                >
                  <h4
                    ref={(el) => {
                      titleRef.current = el;
                      if (el) {
                        // Check if text is truncated by comparing scrollHeight to clientHeight
                        const isTruncated = el.scrollHeight > el.clientHeight;
                        if (isTruncated !== isTitleTruncated) {
                          requestAnimationFrame(() => {
                            setIsTitleTruncated(isTruncated);
                          });
                        }
                      }
                    }}
                    className={`line-clamp-2 cursor-text text-[14px] leading-snug font-semibold transition-all duration-300 ease-in-out min-w-0 w-full ${singleTask.isCompleted ? 'text-black/80 line-through' : 'text-black group-hover:text-black'} ml-0`}
                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  >
                    {singleTask.title}
                  </h4>
                </Tooltip>
              ) : (
                <h4
                  ref={(el) => {
                    titleRef.current = el;
                    if (el) {
                      // Check if text is truncated by comparing scrollHeight to clientHeight
                      const isTruncated = el.scrollHeight > el.clientHeight;
                      if (isTruncated !== isTitleTruncated) {
                        requestAnimationFrame(() => {
                          setIsTitleTruncated(isTruncated);
                        });
                      }
                    }
                  }}
                  className={`line-clamp-2 cursor-text text-[14px] leading-snug font-semibold transition-all duration-300 ease-in-out min-w-0 w-full ${singleTask.isCompleted ? 'text-black/80 line-through' : 'text-black group-hover:text-black'} ml-0`}
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                >
                  {singleTask.title}
                </h4>
              )}
            </div>
          )}
        </div>
        

        {/* Footer area with description icon and description box */}
        <div className="relative">
          <SingleTaskFooter
            task={singleTask}
            boardId={selectedBoardId || undefined}
            onTaskUpdated={onTaskApiUpdate}
            hideInteractiveElements={showDescriptionIcon || showComments || showChecklist}
            onCloseComments={() => setShowComments(false)}
            showCloseComments={showComments}
            onCloseChecklist={() => setShowChecklist(false)}
            showCloseChecklist={showChecklist}
            onOpenDescription={() => setShowDescriptionIcon(true)}
            onOpenComments={() => setShowComments(true)}
            onOpenChecklist={() => setShowChecklist(true)}
            showDescriptionIcon={showDescriptionIcon}
            showComments={showComments}
            showChecklist={showChecklist}
            hideBoardFeatures={hideBoardFeatures}
          />

          {/* Description Section - Shows below footer when icon is clicked */}
          {showDescriptionIcon && !hideBoardFeatures && (
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="mt-2"
            >
              <ShortDescription
                description={singleTask.description || ''}
                taskId={singleTask.id}
                boardId={selectedBoardId || ''}
                onUpdate={handleUpdateDescription}
                isEditing={true}
                onEditChange={setShowDescriptionIcon}
              />
            </div>
          )}

          {/* Comments Section - Shows below footer when icon is clicked */}
          {showComments && !hideBoardFeatures && (
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="mt-2"
            >
              <TaskSortComment taskId={singleTask.id} onClose={() => setShowComments(false)} />
            </div>
          )}

          {/* Checklist Section - Shows below footer when icon is clicked */}
          {showChecklist && !hideBoardFeatures && (
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="mt-2"
            >
              <ShortChecklist task={singleTask} boardId={selectedBoardId || ''} />
            </div>
          )}
        </div>

        {/* Labels Dropdown */}
        {!hideBoardFeatures && <LabelsDropdown
          isOpen={labelsDropdown.labelsDropdownOpen}
          onClose={labelsDropdown.closeLabelsDropdown}
          triggerRef={editLabelButtonRef as React.RefObject<HTMLElement>}
          taskId={singleTask.id}
          currentLabels={currentLabels}
          onCreateLabel={labelsDropdown.handleCreateLabelClick}
          onEditLabel={labelsDropdown.handleEditLabel}
          stopPropagation={true}
        />}

        {/* Create/Edit Label Dropdown */}
        {!hideBoardFeatures && <CreateLabelDropdown
          key={`create-label-${labelsDropdown.editingLabel?._id || labelsDropdown.editingLabel?.id || 'new'}-${labelsDropdown.createLabelDropdownOpen}`}
          isOpen={labelsDropdown.createLabelDropdownOpen}
          onClose={labelsDropdown.closeCreateLabelDropdown}
          triggerRef={editLabelButtonRef as React.RefObject<HTMLElement>}
          taskId={singleTask.id}
          editingLabel={labelsDropdown.editingLabel}
          onCreate={labelsDropdown.handleCreateLabel}
          onUpdate={labelsDropdown.handleUpdateLabel}
          onBack={labelsDropdown.editingLabel ? undefined : labelsDropdown.handleBackToLabels}
          stopPropagation={true}
        />}
      </div>
    );
  }
);
