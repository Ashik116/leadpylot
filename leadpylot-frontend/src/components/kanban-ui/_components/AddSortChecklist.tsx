'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { useUpdateTask } from '@/hooks/useTasks';
import { toast } from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { useQueryClient } from '@tanstack/react-query';
import { ApiTask } from '@/services/TaskService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface AddSortChecklistProps {
  taskId: string;
  boardId: string;
  onChecklistAdded?: () => void;
  onCancel?: () => void;
  syncTaskFromApi?: (apiTask: ApiTask) => void;
}

interface TodoItem {
  title: string;
  priority?: 'low' | 'medium' | 'high';
}

export const AddSortChecklist: React.FC<AddSortChecklistProps> = ({
  taskId,
  boardId,
  onChecklistAdded,
  onCancel,
  syncTaskFromApi,
}) => {
  const [checklistTitle, setChecklistTitle] = useState('');
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [showTodoInput, setShowTodoInput] = useState(false);
  const updateTaskMutation = useUpdateTask();
  const queryClient = useQueryClient();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const todoInputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const parentRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastItemRef = useRef<HTMLDivElement>(null);
  const [lineStyle, setLineStyle] = useState<{ top: number; height: number } | null>(null);

  const handleAddTodo = () => {
    const trimmedTitle = newTodoTitle.trim();
    if (!trimmedTitle) return;

    setTodoItems([...todoItems, { title: trimmedTitle, priority: 'low' }]);
    setNewTodoTitle('');
    // Keep input open and focus back on it
    setTimeout(() => {
      todoInputRef.current?.focus();
    }, 0);
  };

  const handleRemoveTodo = (index: number) => {
    setTodoItems(todoItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const trimmedTitle = checklistTitle.trim();
    
    if (!trimmedTitle) {
      if (onCancel) {
        onCancel();
      }
      return;
    }

    try {
      // If there's a pending todo item in the input, add it first
      let itemsToSave = [...todoItems];
      const trimmedTodoTitle = newTodoTitle.trim();
      if (trimmedTodoTitle) {
        itemsToSave = [...todoItems, { title: trimmedTodoTitle, priority: 'low' }];
      }

      // Build the checklist structure
      const newSubTask = {
        taskTitle: trimmedTitle,
        todo: itemsToSave.map(item => ({
          title: item.title,
          priority: item.priority || 'low',
        })),
      };

      const response = await updateTaskMutation.mutateAsync({
        id: taskId,
        data: {
          subTask: [newSubTask],
          board_id: boardId,
        },
      });
      
      // Invalidate board query to refresh kanban board data
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: ['boards', 'detail', boardId] });
      }
      
      // Invalidate task detail query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', taskId] });
      
      // Sync updated task to kanban board state from response (like comments do)
      if (response?.data && syncTaskFromApi) {
        syncTaskFromApi(response.data);
      }
      
      setChecklistTitle('');
      setTodoItems([]);
      setNewTodoTitle('');
      setShowTodoInput(false);
      
      toast.push(
        <Notification title="Success" type="success">
          Checklist added successfully
        </Notification>
      );

      // Call onChecklistAdded to trigger parent update
      if (onChecklistAdded) {
        onChecklistAdded();
      }
    } catch (error: any) {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.message || 'Failed to add checklist. Please try again.'}
        </Notification>
      );
    }
  };

  const handleCancel = () => {
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setChecklistTitle('');
    setTodoItems([]);
    setNewTodoTitle('');
    setShowTodoInput(false);
    if (onCancel) {
      onCancel();
    }
  };

  const handleBlur = (type: 'title' | 'todo') => {
    // Add a delay before closing to prevent accidental closes
    // This allows space key and other inputs to register before blur fires
    blurTimeoutRef.current = setTimeout(() => {
      // Only close if there's no content
      if (type === 'title' && !checklistTitle.trim()) {
        if (onCancel) {
          onCancel();
        }
      } else if (type === 'todo' && !newTodoTitle.trim() && todoItems.length === 0 && !checklistTitle.trim()) {
        if (onCancel) {
          onCancel();
        }
      }
    }, 200);
  };

  const handleFocus = () => {
    // Clear any pending blur timeout when refocusing
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: 'title' | 'todo') => {
    // Clear blur timeout when user is typing ANY key
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    // Prevent space from bubbling up to parent (which might cause blur)
    if (e.key === ' ') {
      e.stopPropagation();
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (type === 'title') {
        // If title is filled and no todos, save immediately
        // Otherwise show todo input
        if (checklistTitle.trim()) {
          if (todoItems.length === 0 && !showTodoInput) {
            handleSave();
          } else if (!showTodoInput) {
            setShowTodoInput(true);
            setTimeout(() => {
              todoInputRef.current?.focus();
            }, 0);
          }
        }
      } else {
        // Add todo item
        handleAddTodo();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    }
    // Don't prevent default for space or other keys - let them type normally
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  // Calculate line position for parent-child flow
  useEffect(() => {
    const updateLinePosition = () => {
      if (containerRef.current && parentRef.current && lastItemRef.current && todoItems.length > 0) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const parentRect = parentRef.current.getBoundingClientRect();
        const lastItemBox = lastItemRef.current.querySelector('.rounded.border') as HTMLElement;
        
        if (!lastItemBox) {
          setLineStyle(null);
          return;
        }

        // Start line from bottom of parent (not middle) to avoid extending into parent content
        const lineStart = parentRect.bottom - containerRect.top;
        const lastBoxRect = lastItemBox.getBoundingClientRect();
        const lineEnd = lastBoxRect.bottom - containerRect.top;

        setLineStyle({
          top: lineStart,
          height: Math.max(lineEnd - lineStart, 0),
        });
      } else {
        setLineStyle(null);
      }
    };

    // Use requestAnimationFrame to ensure DOM is fully rendered
    const rafId = requestAnimationFrame(() => {
      const timeoutId = setTimeout(updateLinePosition, 0);
      return () => clearTimeout(timeoutId);
    });
    
    // Recalculate on resize or when items change
    window.addEventListener('resize', updateLinePosition);
    
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateLinePosition);
    };
  }, [todoItems]);

  return (
    <div 
      className="space-y-2 relative"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Checklist Title with Close Button */}
      <div className="relative flex items-center gap-1">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleCancel();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          size="xs"
          variant="plain"
          className="shrink-0 rounded-md bg-gray-500/10 p-1 text-gray-500 transition-colors hover:bg-gray-500/20"
          title="Close"
          icon={<X className="h-3.5 w-3.5" />}
        />
        <Input
          ref={(el) => {
            titleInputRef.current = el as HTMLInputElement;
            parentRef.current = el as HTMLInputElement;
          }}
          type="text"
          value={checklistTitle}
          onChange={(e) => setChecklistTitle(e.target.value)}
          onBlur={() => handleBlur('title')}
          onFocus={handleFocus}
          onKeyDown={(e) => handleKeyDown(e as React.KeyboardEvent<HTMLInputElement>, 'title')}
          onKeyUp={() => {
            // Clear blur timeout on any key up as well
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
              blurTimeoutRef.current = null;
            }
          }}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          placeholder="Subtask title..."
          className="flex-1 text-xs font-medium"
          size="xs"
          autoFocus
        />
      </div>

      {/* Todo Items List - Indented Child Blocks */}
      {todoItems.length > 0 && (
        <div ref={containerRef} className="ml-4 space-y-1 pl-3 relative">
          {/* Vertical line - starts from bottom of parent, stops at last item */}
          {lineStyle && (
            <div 
              className="absolute left-0 w-0.5 bg-gray-200"
              style={{ 
                top: `${lineStyle.top}px`,
                height: `${lineStyle.height}px`
              }}
            />
          )}
          {todoItems.map((item, index) => (
            <div
              key={index}
              ref={index === todoItems.length - 1 ? lastItemRef : null}
              className="relative flex items-center"
            >
              {/* Horizontal connector line from parent - starts from parent's right edge, centered vertically */}
              <div className="absolute left-[-11px] top-1/2 -translate-y-1/2 w-3 h-0.5 bg-gray-200" />
              
              {/* Child Box - Different from parent */}
              <div className="rounded border border-gray-200 bg-white px-2 py-1 w-full">
                <div className="flex items-center gap-1">
                  <span className="flex-1 text-xs text-gray-600">{item.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemoveTodo(index);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-red-500"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Todo Section - Show + icon by default, input when clicked */}
      {showTodoInput ? (
        <div className="flex items-center gap-1">
          <input
            ref={todoInputRef}
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            onBlur={() => handleBlur('todo')}
            onFocus={handleFocus}
            onKeyDown={(e) => handleKeyDown(e, 'todo')}
            onKeyUp={() => {
              // Clear blur timeout on any key up as well
              if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
                blurTimeoutRef.current = null;
              }
            }}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            placeholder="Add todo item... (Enter to add)"
            className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            autoFocus
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleAddTodo();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            disabled={!newTodoTitle.trim()}
            className="rounded-md bg-indigo-500 p-1 text-white transition-colors hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add todo"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setShowTodoInput(true);
            setTimeout(() => {
              todoInputRef.current?.focus();
            }, 0);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="flex items-center gap-1 rounded-md border border-dashed border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100"
        >
          <Plus className="h-3 w-3" />
          <span>Add todo item</span>
        </button>
      )}

      {/* Save button - Show when there are todos or a pending todo in input */}
      {checklistTitle.trim() && (todoItems.length > 0 || newTodoTitle.trim()) && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleSave();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            disabled={updateTaskMutation.isPending}
            className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateTaskMutation.isPending ? 'Saving...' : 'Save Checklist'}
          </button>
        </div>
      )}
      
      {/* Save hint - Show when title is filled but no todos */}
      {checklistTitle.trim() && todoItems.length === 0 && !showTodoInput && (
        <div className="text-xxs text-gray-400 text-right">
          Press Enter to save
        </div>
      )}
    </div>
  );
};
