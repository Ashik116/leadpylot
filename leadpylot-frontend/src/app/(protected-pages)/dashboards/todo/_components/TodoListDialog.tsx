'use client';

import React, { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { TTodoListProps } from './TodoList';
import { dateFormateUtils } from '@/utils/dateFormateUtils';
import { getProjectColor, lightenColor } from '@/utils/projectColors';
import { AGENT_COLORS } from '@/utils/utils';

interface TodoListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  todos: TTodoListProps[];
  projectName?: string;
  agentName?: string;
  contactName?: string;
  onUpdateTodo: (id: string, updates: { isDone?: boolean; message?: string }) => Promise<void>;
  onDeleteTodo: (id: string) => Promise<void>;
  onAssignTodo: (todoId: string) => void;
  isLoading: boolean;
}

const TodoListDialog: React.FC<TodoListDialogProps> = ({
  isOpen,
  onClose,
  todos,
  projectName,
  agentName,
  contactName,
  onUpdateTodo,
  onDeleteTodo,
  onAssignTodo,
  isLoading,
}) => {
  // State for editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

  // Helper function to get agent background color (lighter version)
  const getAgentBackgroundColor = (agentName: string): string => {
    try {
      if (!agentName || typeof agentName !== 'string') return '#f3f4f6'; // gray-100 fallback

      const trimmed = agentName.trim().toUpperCase();
      let key = '';
      if (trimmed?.length === 1) {
        key = trimmed?.charAt(0);
      } else if (trimmed?.length === 2) {
        key = trimmed?.slice(0, 2);
      } else if (trimmed?.length > 2) {
        key = trimmed?.slice(0, 2) + trimmed?.charAt(trimmed?.length - 1);
      }

      // Use a hash of the key to pick a color deterministically
      const colorKeys = Object?.keys(AGENT_COLORS);
      let hash = 0;
      for (let i = 0; i < key?.length; i++) {
        hash = (hash << 5) - hash + key.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      const colorIndex = Math.abs(hash) % colorKeys?.length;
      const tailwindClass = AGENT_COLORS[colorKeys?.[colorIndex]] || 'text-gray-500';

      // Convert Tailwind text color classes to lighter background color classes
      const colorMap: Record<string, string> = {
        'text-red-500': '#fef2f2', // red-50
        'text-red-600': '#fef2f2', // red-50
        'text-red-700': '#fef2f2', // red-50
        'text-orange-500': '#fff7ed', // orange-50
        'text-orange-600': '#fff7ed', // orange-50
        'text-orange-700': '#fff7ed', // orange-50
        'text-yellow-500': '#fefce8', // yellow-50
        'text-yellow-600': '#fefce8', // yellow-50
        'text-yellow-700': '#fefce8', // yellow-50
        'text-green-500': '#f0fdf4', // green-50
        'text-green-600': '#f0fdf4', // green-50
        'text-green-700': '#f0fdf4', // green-50
        'text-teal-500': '#f0fdfa', // teal-50
        'text-teal-600': '#f0fdfa', // teal-50
        'text-teal-700': '#f0fdfa', // teal-50
        'text-blue-500': '#eff6ff', // blue-50
        'text-blue-600': '#eff6ff', // blue-50
        'text-blue-700': '#eff6ff', // blue-50
        'text-indigo-500': '#eef2ff', // indigo-50
        'text-indigo-600': '#eef2ff', // indigo-50
        'text-indigo-700': '#eef2ff', // indigo-50
        'text-purple-500': '#faf5ff', // purple-50
        'text-purple-600': '#faf5ff', // purple-50
        'text-purple-700': '#faf5ff', // purple-50
        'text-pink-500': '#fdf2f8', // pink-50
        'text-pink-600': '#fdf2f8', // pink-50
        'text-pink-700': '#fdf2f8', // pink-50
      };

      return colorMap[tailwindClass] || '#f3f4f6';
    } catch {
      return '#f3f4f6';
    }
  };

  // Helper function to get agent text color (darker version for contrast)
  const getAgentTextColor = (agentName: string): string => {
    try {
      if (!agentName || typeof agentName !== 'string') return '#6b7280'; // gray-500 fallback

      const trimmed = agentName?.trim()?.toUpperCase();
      let key = '';
      if (trimmed?.length === 1) {
        key = trimmed?.charAt(0);
      } else if (trimmed?.length === 2) {
        key = trimmed?.slice(0, 2);
      } else if (trimmed?.length > 2) {
        key = trimmed?.slice(0, 2) + trimmed?.charAt(trimmed?.length - 1);
      }

      // Use a hash of the key to pick a color deterministically
      const colorKeys = Object?.keys(AGENT_COLORS);
      let hash = 0;
      for (let i = 0; i < key?.length; i++) {
        hash = (hash << 5) - hash + key.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      const colorIndex = Math.abs(hash) % colorKeys?.length;
      const tailwindClass = AGENT_COLORS[colorKeys?.[colorIndex]] || 'text-gray-500';

      // Convert Tailwind text color classes to darker text color classes
      const colorMap: Record<string, string> = {
        'text-red-500': '#dc2626', // red-600
        'text-red-600': '#dc2626', // red-600
        'text-red-700': '#b91c1c', // red-700
        'text-orange-500': '#ea580c', // orange-600
        'text-orange-600': '#ea580c', // orange-600
        'text-orange-700': '#c2410c', // orange-700
        'text-yellow-500': '#ca8a04', // yellow-600
        'text-yellow-600': '#ca8a04', // yellow-600
        'text-yellow-700': '#a16207', // yellow-700
        'text-green-500': '#16a34a', // green-600
        'text-green-600': '#16a34a', // green-600
        'text-green-700': '#15803d', // green-700
        'text-teal-500': '#0d9488', // teal-600
        'text-teal-600': '#0d9488', // teal-600
        'text-teal-700': '#0f766e', // teal-700
        'text-blue-500': '#2563eb', // blue-600
        'text-blue-600': '#2563eb', // blue-600
        'text-blue-700': '#1d4ed8', // blue-700
        'text-indigo-500': '#4f46e5', // indigo-600
        'text-indigo-600': '#4f46e5', // indigo-600
        'text-indigo-700': '#4338ca', // indigo-700
        'text-purple-500': '#9333ea', // purple-600
        'text-purple-600': '#9333ea', // purple-600
        'text-purple-700': '#7c3aed', // purple-700
        'text-pink-500': '#db2777', // pink-600
        'text-pink-600': '#db2777', // pink-600
        'text-pink-700': '#be185d', // pink-700
      };

      return colorMap[tailwindClass] || '#6b7280';
    } catch {
      return '#6b7280';
    }
  };

  // Helper function to get project background color (lighter version)
  const getProjectBackgroundColor = (projectName: string): string => {
    const baseColor = getProjectColor(projectName);
    return lightenColor(baseColor, 85); // Make it much lighter (85% lighter)
  };

  // Helper function to get project text color (darker version for contrast)
  const getProjectTextColor = (projectName: string): string => {
    return getProjectColor(projectName); // Use the original color for text
  };

  const handleToggleTodo = async (todoId: string, currentStatus: boolean) => {
    await onUpdateTodo(todoId, { isDone: !currentStatus });
  };

  const handleDeleteTodo = async (todoId: string) => {
    await onDeleteTodo(todoId);
  };

  const handleAssignTodo = (todoId: string) => {
    onAssignTodo(todoId);
  };

  // Handle edit function
  const handleEdit = (todo: TTodoListProps) => {
    setEditingId(todo._id);
    setEditText(todo.message);
  };

  // Save edit function
  const saveEdit = async () => {
    if (!editingId || !editText?.trim()) return;

    // Find the original todo to compare the message
    const originalTodo = todos?.find((todo) => todo?._id === editingId);
    if (!originalTodo) return;

    // Check if the message has actually changed
    const trimmedNewText = editText?.trim();
    if (originalTodo?.message === trimmedNewText) {
      // No changes, just cancel edit without API call
      setEditingId(null);
      setEditText('');
      return;
    }

    // Only call API if the message has actually changed
    await onUpdateTodo(editingId, { message: trimmedNewText });
    setEditingId(null);
    setEditText('');
  };

  // Cancel edit function
  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  // Safety check for todos array
  if (!todos || !Array.isArray(todos)) {
    return (
      <Dialog isOpen={isOpen} onClose={onClose} width={800}>
        <div className="dialog-content">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h4 className="flex items-center gap-2 text-lg font-semibold">
              <ApolloIcon name="checklist" className="h-5 w-5" />
              All Todos
            </h4>
          </div>
          <div className="text-sand-2 py-8 text-center">No todos available</div>
        </div>
      </Dialog>
    );
  }

  const pendingTodos = todos?.filter((todo) => todo && !todo?.isDone);
  const completedTodos = todos?.filter((todo) => todo && todo?.isDone);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={800}>
      <div className="flex max-h-[500px] flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div>
            <h4 className="flex items-center gap-2 text-lg font-semibold">
              <ApolloIcon name="checklist" className="h-5 w-5" />
              All Todos ({todos?.length})
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {contactName && (
                <span className="bg-sand-4 text-sand-1 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium">
                  <ApolloIcon name="user" className="mr-1 h-3 w-3" />
                  {contactName}
                </span>
              )}
              {projectName && (
                <span
                  className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: getProjectBackgroundColor(projectName),
                    color: getProjectTextColor(projectName),
                  }}
                >
                  <ApolloIcon name="folder" className="mr-1 h-3 w-3" />
                  {projectName}
                </span>
              )}
              {agentName && (
                <span
                  className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: getAgentBackgroundColor(agentName),
                    color: getAgentTextColor(agentName),
                  }}
                >
                  <ApolloIcon name="user-star" className="mr-1 h-3 w-3" />
                  {agentName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 pr-2">
          {/* Pending Todos */}
          {pendingTodos?.length > 0 && (
            <div>
              <h3 className="text-sand-1 mb-3 text-sm font-medium">
                Pending ({pendingTodos?.length})
              </h3>
              <div className="space-y-3">
                {pendingTodos &&
                  pendingTodos?.length > 0 &&
                  pendingTodos?.map((todo) => {
                    if (!todo || !todo?._id) return null;

                    return (
                      <div
                        key={todo?._id}
                        className="bg-sand-4 border-sand-3 flex items-start gap-3 rounded-lg border p-3"
                      >
                        {/* Checkbox for mark as done */}
                        <button
                          disabled={isLoading}
                          onClick={() => handleToggleTodo(todo?._id, todo?.isDone)}
                          className={`relative h-5 w-5 rounded border-2 transition ${
                            todo?.isDone
                              ? 'border-emerald-500 bg-emerald-500 shadow-sm'
                              : 'border-gray-300 bg-white hover:border-emerald-400'
                          } ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}`}
                        >
                          {todo?.isDone && (
                            <svg
                              className="absolute inset-0 h-full w-full text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>

                        <div className="w-full min-w-0 flex-1">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              {editingId === todo?._id ? (
                                <div className="w-full space-y-2">
                                  <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="w-full flex-1 resize-none rounded border p-2 text-sm outline-none"
                                    rows={2}
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={saveEdit} disabled={isLoading}>
                                      Save
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={cancelEdit}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p
                                  className="cursor-pointer text-sm leading-relaxed font-medium break-words whitespace-pre-wrap"
                                  onDoubleClick={() => handleEdit(todo)}
                                >
                                  {todo.message}
                                </p>
                              )}
                              <div className="mt-2 space-y-1">
                                <p className="text-sand-2 text-xs">by {todo?.creator?.login}</p>
                                <div className="text-sand-2 flex flex-wrap gap-2 text-xs">
                                  <span className="flex items-center gap-1">
                                    <ApolloIcon name="calendar" className="h-3 w-3" />
                                    {dateFormateUtils(todo?.createdAt)}
                                  </span>
                                  {todo?.updatedAt !== todo?.createdAt && (
                                    <span className="flex items-center gap-1">
                                      <ApolloIcon name="pen" className="h-3 w-3" />
                                      {dateFormateUtils(todo?.updatedAt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {!todo?.isDone && (
                              <div className="ml-2 flex items-center gap-2">
                                {todo?.assignedTo ? (
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() => handleAssignTodo(todo?._id)}
                                    icon={<ApolloIcon name="user-star" />}
                                    className="px-2 py-1 text-xs"
                                  >
                                    {todo?.assignedTo?.login}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleAssignTodo(todo?._id)}
                                    className="px-2 py-1 text-xs"
                                  >
                                    Assign
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="default"
                                  icon={<ApolloIcon name="trash" />}
                                  onClick={() => handleDeleteTodo(todo?._id)}
                                  className="bg-rust hover:bg-rust/80 px-2 py-1 text-xs text-white"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Completed Todos */}
          {completedTodos?.length > 0 && (
            <div>
              <h3 className="text-sand-1 mb-3 text-sm font-medium">
                Completed ({completedTodos?.length})
              </h3>
              <div className="space-y-3">
                {completedTodos?.map((todo) => {
                  if (!todo || !todo?._id) return null;

                  return (
                    <div
                      key={todo?._id}
                      className="bg-evergreen/10 border-evergreen/20 flex items-start gap-3 rounded-lg border p-3"
                    >
                      {/* Checkbox for completed todos */}
                      <button
                        disabled={isLoading}
                        onClick={() => handleToggleTodo(todo?._id, todo?.isDone)}
                        className={`relative h-5 w-5 rounded border-2 transition ${
                          todo?.isDone
                            ? 'border-emerald-500 bg-emerald-500 shadow-sm'
                            : 'border-gray-300 bg-white hover:border-emerald-400'
                        } ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}`}
                      >
                        {todo?.isDone && (
                          <svg
                            className="absolute inset-0 h-full w-full text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        {editingId === todo?._id ? (
                          <div className="w-full space-y-2">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full flex-1 resize-none rounded border p-2 text-sm outline-none"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={saveEdit} disabled={isLoading}>
                                Save
                              </Button>
                              <Button size="sm" variant="secondary" onClick={cancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className="text-sand-1 cursor-pointer text-sm leading-relaxed font-medium line-through opacity-70"
                            onDoubleClick={() => handleEdit(todo)}
                          >
                            {todo?.message || 'No message'}
                          </p>
                        )}
                        <div className="mt-2 space-y-1">
                          <p className="text-sand-2 text-xs">by {todo?.creator?.login}</p>
                          <div className="text-sand-2 flex flex-wrap gap-2 text-xs">
                            <span className="flex items-center gap-1">
                              <ApolloIcon name="calendar" className="h-3 w-3" />
                              {dateFormateUtils(todo?.createdAt)}
                            </span>
                            {todo?.updatedAt !== todo?.createdAt && (
                              <span className="flex items-center gap-1">
                                <ApolloIcon name="pen" className="h-3 w-3" />
                                {dateFormateUtils(todo?.updatedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-2 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleToggleTodo(todo?._id, todo?.isDone)}
                          className="px-2 py-1 text-xs"
                        >
                          Undo
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default TodoListDialog;
