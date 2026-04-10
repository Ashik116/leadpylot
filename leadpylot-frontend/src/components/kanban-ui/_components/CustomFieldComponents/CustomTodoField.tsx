import React, { useState } from 'react';
import { ChecklistItem as ChecklistItemType } from '../../types';
import { ChecklistProgress } from '../ChecklistComponents/ChecklistProgress';
import { ChecklistItem } from '../ChecklistComponents/ChecklistItem';
import { Plus } from 'lucide-react';

interface CustomTodoFieldProps {
  todos: any[];
  onUpdate: (value: any) => void;
  isCollapsed: boolean;
}

export const CustomTodoField: React.FC<CustomTodoFieldProps> = ({
  todos,
  onUpdate,
  isCollapsed,
}) => {
  const [newTodoText, setNewTodoText] = useState('');

  // Filter out deleted todos for display
  const activeTodos = todos.filter((t: any) => !t.isDelete);
  
  // Calculate progress
  const todoProgress = activeTodos.length === 0 ? 0 : (() => {
    const completedCount = activeTodos.filter((t: any) => {
      return t.completed !== undefined ? t.completed : (t.isCompleted || false);
    }).length;
    return Math.round((completedCount / activeTodos.length) * 100);
  })();

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      // Don't include 'id' or '_id' when creating new todo items - backend will generate it
      // Use 'title' instead of 'text' as per API requirements
      const newTodo = { title: newTodoText.trim(), completed: false };
      const newTodos = [...todos, newTodo];
      
      // Update local state with all todos (for UI)
      // But pass only the new todo for API update (partial update)
      onUpdate({ changedTodo: newTodo, allTodos: newTodos });
      setNewTodoText('');
    }
  };

  const handleToggleTodo = (todoIndex: number, todoId?: string) => {
    // Find the todo that was changed
    const changedTodo = todos.find((todo: any, index: number) => {
      const matchesId = todoId && (todo.id === todoId || todo._id === todoId);
      return matchesId || (index === todoIndex && !todoId);
    });

    if (changedTodo) {
      const currentCompleted = changedTodo.completed !== undefined ? changedTodo.completed : (changedTodo.isCompleted || false);
      const updatedTodo = {
        ...changedTodo,
        completed: !currentCompleted,
        // Mark this as the changed todo for partial update
        _isChanged: true,
      };
      
      // Update local state with all todos (for UI)
      const updatedTodos = todos.map((todo: any, index: number) => {
        const matchesId = todoId && (todo.id === todoId || todo._id === todoId);
        if (matchesId || (index === todoIndex && !todoId)) {
          return updatedTodo;
        }
        return todo;
      });
      
      // Pass only the changed todo for API update
      onUpdate({ changedTodo: updatedTodo, allTodos: updatedTodos });
    }
  };

  const handleDeleteTodo = (todoIndex: number, todoId?: string) => {
    // Find the todo to delete
    const todoToDelete = todos.find((todo: any, index: number) => {
      const matchesId = todoId && (todo.id === todoId || todo._id === todoId);
      return matchesId || (index === todoIndex && !todoId);
    });

    if (todoToDelete) {
      // Set isDelete: true instead of removing from array
      const deletedTodo = {
        ...todoToDelete,
        isDelete: true,
        // Mark this as the changed todo for partial update
        _isChanged: true,
      };
      
      // Update local state - mark as deleted (for UI)
      const updatedTodos = todos.map((todo: any, index: number) => {
        const matchesId = todoId && (todo.id === todoId || todo._id === todoId);
        if (matchesId || (index === todoIndex && !todoId)) {
          return deletedTodo;
        }
        return todo;
      });
      
      // Pass only the deleted todo for API update
      onUpdate({ changedTodo: deletedTodo, allTodos: updatedTodos });
    }
  };

  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <ChecklistProgress progress={todoProgress} />
      
      {!isCollapsed && (
        <>
          <div className="space-y-1">
            {activeTodos.map((todo: any, index: number) => {
              // Support both 'completed' (frontend) and 'isCompleted' (API) formats
              const isCompleted = todo.completed !== undefined ? todo.completed : (todo.isCompleted || false);
              const todoId = todo.id || todo._id;
              // Find original index in full array for proper handling
              const originalIndex = todos.findIndex((t: any) => (t.id === todoId || t._id === todoId));
              
              // Transform todo to ChecklistItem format
              const checklistItem: ChecklistItemType = {
                id: todoId || `todo-${index}`,
                text: todo.title || todo.text || '',
                completed: isCompleted,
                // No assigned members or due date for custom todos
                assignedMembers: undefined,
                dueDate: undefined,
                dueTime: undefined,
              };
              
              const handleUpdate = (text: string) => {
                const updatedTodos = todos.map((t: any, idx: number) => {
                  const matchesId = todoId && (t.id === todoId || t._id === todoId);
                  if (matchesId || (idx === originalIndex && !todoId)) {
                    return { ...t, title: text };
                  }
                  return t;
                });
                onUpdate(updatedTodos);
              };

              return (
                <ChecklistItem
                  key={checklistItem.id}
                  item={checklistItem}
                  onToggle={() => handleToggleTodo(originalIndex >= 0 ? originalIndex : index, todoId)}
                  onUpdate={handleUpdate}
                  onDelete={() => handleDeleteTodo(originalIndex >= 0 ? originalIndex : index, todoId)}
                  showDeleteIcon={true}
                  deleteConfirmTitle="Delete todo item"
                  deleteConfirmDescription="Remove this todo item? This cannot be undone."
                />
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTodo();
                }
              }}
              placeholder="Add a todo item..."
              className="flex-1 rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={handleAddTodo}
              disabled={!newTodoText.trim()}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
