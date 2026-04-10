'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { Task } from '../types';
import { AddSortChecklist } from './AddSortChecklist';
import { useKanban } from '../_contexts';
import { useTaskOperations } from '../_hooks/useTaskOperations';
import { apiGetTaskById } from '@/services/TaskService';

interface ShortChecklistProps {
  task: Task;
  boardId: string;
}

interface ChecklistData {
  id: string;
  title: string;
  items: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  isCompleted?: boolean;
}

interface ChecklistItemsContainerProps {
  items: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  parentRef: React.RefObject<HTMLDivElement | null>;
  onToggleItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onEditItem: (itemId: string, title: string) => void;
}

const ChecklistItemsContainer: React.FC<ChecklistItemsContainerProps> = ({ 
  items, 
  parentRef, 
  onToggleItem,
  onDeleteItem,
  onEditItem
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastItemRef = useRef<HTMLDivElement>(null);
  const [lineStyle, setLineStyle] = useState<{ top: number; height: number } | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    if (containerRef.current && parentRef.current && lastItemRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const parentRect = parentRef.current.getBoundingClientRect();
      const lastRect = lastItemRef.current.getBoundingClientRect();

      // Start line from bottom of parent (not middle) to avoid extending into parent content
      const lineStart = parentRect.bottom - containerRect.top;
      // End line at the vertical center of the last item (where horizontal connector connects)
      const lastItemCenter = lastRect.top + lastRect.height / 2 - containerRect.top;

      setLineStyle({
        top: lineStart,
        height: Math.max(lastItemCenter - lineStart, 0),
      });
    } else {
      setLineStyle(null);
    }
  }, [items, parentRef]);

  const startEdit = (itemId: string, currentTitle: string) => {
    setEditingItemId(itemId);
    setEditingText(currentTitle);
  };

  const submitEdit = (itemId: string, currentTitle: string) => {
    const trimmed = editingText.trim();
    if (trimmed && trimmed !== currentTitle) {
      onEditItem(itemId, trimmed);
    }
    setEditingItemId(null);
    setEditingText('');
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditingText('');
  };

  return (
    <div ref={containerRef} className="ml-4 space-y-0.5 pl-3 relative">
      {/* Vertical line - starts from first item, stops at last item */}
      {lineStyle && (
        <div 
          className="absolute left-0 w-0.5 bg-gray-200"
          style={{ 
            top: `${lineStyle.top}px`,
            height: `${lineStyle.height}px`
          }}
        />
      )}
      {items.map((item, index) => (
        <div
          key={item.id}
          ref={index === items.length - 1 ? lastItemRef : null}
          className="group relative flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5"
        >
          {/* Horizontal connector line from parent - starts from parent's right edge, centered vertically */}
          <div className="absolute left-[-11px] top-1/2 -translate-y-1/2 w-3 h-0.5 bg-gray-200" />
          
          {/* Checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleItem(item.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`mt-0 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border-2 transition-all ${
              item.completed
                ? 'border-indigo-500 bg-indigo-500'
                : 'border-gray-300 bg-white hover:border-indigo-300'
            }`}
          >
            {item.completed && <Check className="h-2 w-2 text-white" />}
          </button>
          
          {/* Child Box - Different from parent */}
          <div className="px-2 py-0.5 flex-1 min-w-0">
            {editingItemId === item.id ? (
              <input
                type="text"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={() => submitEdit(item.id, item.title)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitEdit(item.id, item.title);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="w-full border-none bg-transparent px-0 text-xs font-medium text-gray-700 leading-5 focus:outline-none"
                autoFocus
              />
            ) : (
              <span
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(item.id, item.title);
                }}
                onDoubleClick={(e) => e.stopPropagation()}
                className={`text-xs font-medium leading-none block cursor-text ${
                  item.completed 
                    ? 'line-through text-gray-400' 
                    : 'text-gray-600'
                }`}
              >
                {item.title}
              </span>
            )}
          </div>

          {/* Delete Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDeleteItem(item.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

interface ChecklistBlockProps {
  checklist: ChecklistData;
  onToggleItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteChecklist: () => void;
  onToggleChecklistComplete: (nextValue: boolean) => void;
  onEditItem: (itemId: string, title: string) => void;
  onEditChecklistTitle: (title: string) => void;
}

const ChecklistBlock: React.FC<ChecklistBlockProps> = ({ 
  checklist, 
  onToggleItem, 
  onDeleteItem,
  onDeleteChecklist,
  onToggleChecklistComplete,
  onEditItem,
  onEditChecklistTitle
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const hasItems = checklist.items.length > 0;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(checklist.title);

  useEffect(() => {
    setTimeout(() => {
      setEditTitle(checklist.title);
    }, 0);
  }, [checklist.title]);

  const submitTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== checklist.title) {
      onEditChecklistTitle(trimmed);
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="space-y-1.5">
      {/* Checklist Title (Parent) - Different Box */}
      <div
        ref={parentRef}
        className="group relative flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleChecklistComplete(!checklist.isCompleted);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
              checklist.isCompleted
                ? 'border-indigo-500 bg-indigo-500'
                : 'border-gray-300 bg-white hover:border-indigo-300'
            }`}
            aria-pressed={!!checklist.isCompleted}
            aria-label={checklist.isCompleted ? 'Mark checklist incomplete' : 'Mark checklist complete'}
            title={checklist.isCompleted ? 'Mark incomplete' : 'Mark complete'}
          >
            {checklist.isCompleted && <Check className="h-2 w-2 text-white" />}
          </button>
          {isEditingTitle ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={submitTitle}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitTitle();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setEditTitle(checklist.title);
                  setIsEditingTitle(false);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              className="flex-1 border-none bg-transparent px-0 text-xs font-medium text-gray-900 focus:outline-none"
              autoFocus
            />
          ) : (
            <p
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              className={`text-xs font-medium ${checklist.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'} truncate cursor-text`}
            >
              {checklist.title}
            </p>
          )}
        </div>
        {/* Delete Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDeleteChecklist();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 text-red-600 hover:bg-red-50"
          title="Delete Subtask"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      
      {/* Checklist Items (Children) - Different Box with Indented Flow */}
      {hasItems && (
        <ChecklistItemsContainer 
          items={checklist.items} 
          parentRef={parentRef}
          onToggleItem={onToggleItem}
          onDeleteItem={onDeleteItem}
          onEditItem={onEditItem}
        />
      )}
    </div>
  );
};

export const ShortChecklist: React.FC<ShortChecklistProps> = ({
  task,
  boardId,
}) => {
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const { syncTaskFromApi } = useKanban();
  
  // Extract subTask for dependency array
  const taskSubTask = (task as any).subTask;

  // Transform task checklists to ChecklistData format (parent-child flow)
  const initialChecklists = useMemo<ChecklistData[]>(() => {
    // Check if task has checklists array
    if (task.checklists && Array.isArray(task.checklists)) {
      return task.checklists.map((cl) => ({
        id: cl.id,
        title: cl.title,
        items: (cl.items || []).map((item) => ({
          id: item.id,
          title: item.text,
          completed: item.completed || false,
        })),
        isCompleted: (cl as any).isCompleted || false,
      }));
    }

    return [];
  }, [task.checklists]);

  // Local state for optimistic updates
  const [localChecklists, setLocalChecklists] = useState<ChecklistData[]>(initialChecklists);

  // Sync local state when task.checklists changes (from API refetch)
  useEffect(() => {
    setLocalChecklists(initialChecklists);
  }, [initialChecklists]);

  // After toggle/delete, refetch task and sync to board so footer count (e.g. 0/4) updates
  const refetchTaskAndSyncToBoard = useCallback(async () => {
    if (!task.id) return;
    try {
      const response = await apiGetTaskById(task.id);
      if (response?.data) syncTaskFromApi(response.data);
    } catch {
      // Ignore refetch errors; list will eventually be consistent on next load
    }
  }, [task.id, syncTaskFromApi]);

  // Get task operations for checklist item actions
  const operations = useTaskOperations({
    taskId: task.id,
    boardId: boardId,
    onSuccess: refetchTaskAndSyncToBoard,
  });

  // Use local checklists for rendering
  const checklists = localChecklists;

  const handleChecklistAdded = () => {
    setShowAddChecklist(false);
    // The task will be updated via query invalidation in useUpdateTask
    // If parent provides onTaskUpdate, we can call it here too
  };

  // Handle toggle checklist item completion
  const handleToggleItem = async (checklistId: string, itemId: string) => {
    // Optimistic update - update UI immediately
    setLocalChecklists((prev) =>
      prev.map((checklist) =>
        checklist.id === checklistId
          ? (() => {
              const nextItems = checklist.items.map((item) =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
              );
              const allCompleted = nextItems.length > 0 && nextItems.every((item) => item.completed);
              return {
                ...checklist,
                items: nextItems,
                isCompleted: allCompleted,
              };
            })()
          : checklist
      )
    );

    try {
      // Get fresh currentSubTasks - prefer subTask (raw API format)
      let freshSubTasks: Array<{ _id?: string; taskTitle?: string; todo?: any[] }>;
      
      if (taskSubTask && Array.isArray(taskSubTask)) {
        freshSubTasks = taskSubTask;
      } else {
        // Transform from checklists format to API format
        freshSubTasks = (task.checklists || []).map((cl) => ({
          _id: cl.id,
          taskTitle: cl.title,
          todo: (cl.items || []).map((item) => ({
            _id: item.id,
            title: item.text,
            isCompleted: item.completed || false,
          })),
        }));
      }
      
      // Find the checklist and item to verify they exist
      const checklist = freshSubTasks.find((st) => st._id === checklistId);
      if (!checklist) {
        // Checklist not found - revert optimistic update
        setLocalChecklists(initialChecklists);
        return;
      }
      
      const item = checklist.todo?.find((todo: any) => todo._id === itemId);
      if (!item) {
        // Item not found - revert optimistic update
        setLocalChecklists(initialChecklists);
        return;
      }
      
      await operations.toggleChecklistItem(checklistId, itemId, freshSubTasks);
    } catch (error) {
      // Error handling - revert optimistic update on error
      setLocalChecklists(initialChecklists);
      // eslint-disable-next-line no-console
      console.error('Failed to toggle checklist item:', error);
    }
  };

  // Handle delete checklist item
  const handleDeleteItem = async (checklistId: string, itemId: string) => {
    // Optimistic update - update UI immediately
    setLocalChecklists((prev) =>
      prev.map((checklist) =>
        checklist.id === checklistId
          ? {
              ...checklist,
              items: checklist.items.filter((item) => item.id !== itemId),
            }
          : checklist
      )
    );

    try {
      // Get fresh currentSubTasks - prefer subTask (raw API format)
      let freshSubTasks: Array<{ _id?: string; taskTitle?: string; todo?: any[] }>;
      
      if (taskSubTask && Array.isArray(taskSubTask)) {
        freshSubTasks = taskSubTask;
      } else {
        // Transform from checklists format to API format
        freshSubTasks = (task.checklists || []).map((cl) => ({
          _id: cl.id,
          taskTitle: cl.title,
          todo: (cl.items || []).map((item) => ({
            _id: item.id,
            title: item.text,
            isCompleted: item.completed || false,
          })),
        }));
      }
      
      // Find the checklist and item to verify they exist
      const checklist = freshSubTasks.find((st) => st._id === checklistId);
      if (!checklist) {
        // Checklist not found - revert optimistic update
        setLocalChecklists(initialChecklists);
        return;
      }
      
      const item = checklist.todo?.find((todo: any) => todo._id === itemId);
      if (!item) {
        // Item not found - revert optimistic update
        setLocalChecklists(initialChecklists);
        return;
      }
      
      await operations.deleteChecklistItem(checklistId, itemId, freshSubTasks);
    } catch (error) {
      // Error handling - revert optimistic update on error
      setLocalChecklists(initialChecklists);
      // eslint-disable-next-line no-console
      console.error('Failed to delete Subtask item:', error);
    }
  };

  const handleToggleChecklistComplete = async (checklistId: string, nextValue: boolean) => {
    // Optimistic update - update UI immediately
    setLocalChecklists((prev) =>
      prev.map((checklist) =>
        checklist.id === checklistId
          ? {
              ...checklist,
              isCompleted: nextValue,
              items: nextValue
                ? checklist.items.map((item) => ({ ...item, completed: true }))
                : checklist.items,
            }
          : checklist
      )
    );

    try {
      // Get fresh currentSubTasks - prefer subTask (raw API format)
      let freshSubTasks: Array<{ _id?: string; taskTitle?: string; todo?: any[] }>;
      
      if (taskSubTask && Array.isArray(taskSubTask)) {
        freshSubTasks = taskSubTask;
      } else {
        // Transform from checklists format to API format
        freshSubTasks = (task.checklists || []).map((cl) => ({
          _id: cl.id,
          taskTitle: cl.title,
          todo: (cl.items || []).map((item) => ({
            _id: item.id,
            title: item.text,
            isCompleted: item.completed || false,
          })),
        }));
      }
      
      // Find the checklist to verify it exists
      const checklist = freshSubTasks.find((st) => st._id === checklistId);
      if (!checklist) {
        // Checklist not found - revert optimistic update
        setLocalChecklists(initialChecklists);
        return;
      }

      await operations.updateChecklist(checklistId, { isCompleted: nextValue }, freshSubTasks);
    } catch (error) {
      // Error handling - revert optimistic update on error
      setLocalChecklists(initialChecklists);
      // eslint-disable-next-line no-console
      console.error('Failed to update checklist completion:', error);
    }
  };

  const handleUpdateChecklistTitle = async (checklistId: string, title: string) => {
    // Optimistic update - update UI immediately
    setLocalChecklists((prev) =>
      prev.map((checklist) =>
        checklist.id === checklistId ? { ...checklist, title } : checklist
      )
    );

    try {
      // Get fresh currentSubTasks - prefer subTask (raw API format)
      let freshSubTasks: Array<{ _id?: string; taskTitle?: string; todo?: any[] }>;

      if (taskSubTask && Array.isArray(taskSubTask)) {
        freshSubTasks = taskSubTask;
      } else {
        // Transform from checklists format to API format
        freshSubTasks = (task.checklists || []).map((cl) => ({
          _id: cl.id,
          taskTitle: cl.title,
          todo: (cl.items || []).map((item) => ({
            _id: item.id,
            title: item.text,
            isCompleted: item.completed || false,
          })),
        }));
      }

      const checklist = freshSubTasks.find((st) => st._id === checklistId);
      if (!checklist) {
        setLocalChecklists(initialChecklists);
        return;
      }

      await operations.updateChecklist(checklistId, { title }, freshSubTasks);
    } catch (error) {
      setLocalChecklists(initialChecklists);
      // eslint-disable-next-line no-console
      console.error('Failed to update checklist title:', error);
    }
  };

  const handleUpdateItemTitle = async (checklistId: string, itemId: string, title: string) => {
    // Optimistic update - update UI immediately
    setLocalChecklists((prev) =>
      prev.map((checklist) =>
        checklist.id === checklistId
          ? {
              ...checklist,
              items: checklist.items.map((item) =>
                item.id === itemId ? { ...item, title } : item
              ),
            }
          : checklist
      )
    );

    try {
      // Get fresh currentSubTasks - prefer subTask (raw API format)
      let freshSubTasks: Array<{ _id?: string; taskTitle?: string; todo?: any[] }>;

      if (taskSubTask && Array.isArray(taskSubTask)) {
        freshSubTasks = taskSubTask;
      } else {
        // Transform from checklists format to API format
        freshSubTasks = (task.checklists || []).map((cl) => ({
          _id: cl.id,
          taskTitle: cl.title,
          todo: (cl.items || []).map((item) => ({
            _id: item.id,
            title: item.text,
            isCompleted: item.completed || false,
          })),
        }));
      }

      const checklist = freshSubTasks.find((st) => st._id === checklistId);
      if (!checklist) {
        setLocalChecklists(initialChecklists);
        return;
      }

      const item = checklist.todo?.find((todo: any) => todo._id === itemId);
      if (!item) {
        setLocalChecklists(initialChecklists);
        return;
      }

      await operations.updateChecklistItem(checklistId, itemId, { text: title }, freshSubTasks);
    } catch (error) {
      setLocalChecklists(initialChecklists);
      // eslint-disable-next-line no-console
      console.error('Failed to update checklist item title:', error);
    }
  };

  // Handle delete entire checklist
  const handleDeleteChecklist = async (checklistId: string) => {
    // Optimistic update - update UI immediately
    setLocalChecklists((prev) => prev.filter((checklist) => checklist.id !== checklistId));

    try {
      // Get fresh currentSubTasks - prefer subTask (raw API format)
      let freshSubTasks: Array<{ _id?: string; taskTitle?: string; todo?: any[] }>;
      
      if (taskSubTask && Array.isArray(taskSubTask)) {
        freshSubTasks = taskSubTask;
      } else {
        // Transform from checklists format to API format
        freshSubTasks = (task.checklists || []).map((cl) => ({
          _id: cl.id,
          taskTitle: cl.title,
          todo: (cl.items || []).map((item) => ({
            _id: item.id,
            title: item.text,
            isCompleted: item.completed || false,
          })),
        }));
      }
      
      // Find the checklist to verify it exists
      const checklist = freshSubTasks.find((st) => st._id === checklistId);
      if (!checklist) {
        // Checklist not found - revert optimistic update
        setLocalChecklists(initialChecklists);
        return;
      }
      
      await operations.deleteChecklist(checklistId, freshSubTasks);
    } catch (error) {
      // Error handling - revert optimistic update on error
      setLocalChecklists(initialChecklists);
      // eslint-disable-next-line no-console
      console.error('Failed to delete Subtask:', error);
    }
  };

  return (
    <div 
      className="space-y-2"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* Checklists List */}
      <div className="max-h-[300px] space-y-2 overflow-y-auto">
        {checklists.length === 0 ? (
          <></>
        ) : (
          checklists.map((checklist) => (
            <ChecklistBlock 
              key={checklist.id} 
              checklist={checklist}
              onToggleItem={(itemId) => handleToggleItem(checklist.id, itemId)}
              onDeleteItem={(itemId) => handleDeleteItem(checklist.id, itemId)}
              onDeleteChecklist={() => handleDeleteChecklist(checklist.id)}
              onToggleChecklistComplete={(nextValue) => handleToggleChecklistComplete(checklist.id, nextValue)}
              onEditItem={(itemId, title) => handleUpdateItemTitle(checklist.id, itemId, title)}
              onEditChecklistTitle={(title) => handleUpdateChecklistTitle(checklist.id, title)}
            />
          ))
        )}
      </div>

      {/* Add Checklist Section */}
      {showAddChecklist ? (
        <AddSortChecklist
          taskId={task.id}
          boardId={boardId}
          onChecklistAdded={handleChecklistAdded}
          onCancel={() => setShowAddChecklist(false)}
          syncTaskFromApi={syncTaskFromApi}
        />
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setShowAddChecklist(true);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-2 py-1.5 text-xs text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100"
        >
          Add a Subtask...
        </button>
      )}
    </div>
  );
};
