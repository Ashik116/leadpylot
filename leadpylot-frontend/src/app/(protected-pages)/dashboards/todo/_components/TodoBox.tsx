'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Card from '@/components/ui/Card';
import { useAssignTodo } from '@/services/hooks/useLeads';
import useNotification from '@/utils/hooks/useNotification';
import TodoAssignmentDialog from './TodoAssignmentDialog';
import TodoListDialog from './TodoListDialog';
import { useQueryClient } from '@tanstack/react-query';
import { TTodoListProps } from './TodoList';
import { dateFormateUtils } from '@/utils/dateFormateUtils';
import { useFilterAwareLeadsNavigationStore } from '@/stores/navigationStores';
import { getProjectColor, lightenColor } from '@/utils/projectColors';
import { AGENT_COLORS } from '@/utils/utils';

interface TodoBoxProps {
  activeTodos: TTodoListProps[];
  contactName: string;
  emailFrom: string;
  phone: string;
  projectName?: string;
  agentName?: string;
  sourceName?: string;
  projectId?: string;
  leadId?: string;
  // Navigation tracking props
  allLeadsData?: any[];
  currentPage?: number;
  pageSize?: number;
}

const TodoBox: React.FC<TodoBoxProps> = ({
  activeTodos,
  contactName,
  emailFrom,
  phone,
  projectName,
  agentName,
  sourceName,
  projectId,
  leadId,
  allLeadsData,
  currentPage,
  pageSize,
}) => {
  const { openNotification } = useNotification();
  const queryClient = useQueryClient();
  const router = useRouter();

  // State for editing (similar to table view)
  const [state, setState] = useState({
    isExpanded: false,
    editingId: null as string | null,
    editText: '',
    isLoading: false,
  });

  // Assignment dialog state
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // Todo list dialog state
  const [isTodoListDialogOpen, setIsTodoListDialogOpen] = useState(false);
  const [isAssignmentFromTodoList, setIsAssignmentFromTodoList] = useState(false);

  // Hooks for mutations
  const assignTodoMutation = useAssignTodo();

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
        hash = (hash << 5) - hash + key?.charCodeAt(i);
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

      const trimmed = agentName.trim().toUpperCase();
      let key = '';
      if (trimmed?.length === 1) {
        key = trimmed.charAt(0);
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
      const tailwindClass = AGENT_COLORS[colorKeys[colorIndex]] || 'text-gray-500';

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

  // Safety check for activeTodos array
  if (!activeTodos || !Array.isArray(activeTodos)) {
    return (
      <Card className="card-border card-shadow">
        <div className="card-body">
          <div className="text-sand-2 text-center">No todos available</div>
        </div>
      </Card>
    );
  }

  // Get pending todos (not done)
  const pendingTodos = activeTodos?.filter((todo) => todo && !todo?.isDone);
  const completedTodos = activeTodos?.filter((todo) => todo && todo?.isDone);

  // Helper function to render message with auto-wrap
  const renderMessage = (todo: TTodoListProps) => {
    return (
      <p
        onDoubleClick={() => handleEdit(todo)}
        className={`cursor-pointer text-sm leading-relaxed font-medium break-words whitespace-pre-wrap select-none ${todo?.isDone ? 'line-through opacity-70' : ''}`}
      >
        {todo?.message}
      </p>
    );
  };

  // Handle edit function (similar to table view)
  const handleEdit = (todo: TTodoListProps) => {
    setState((s: any) => ({ ...s, editingId: todo?._id, editText: todo?.message }));
  };

  // Save edit function
  const saveEdit = async () => {
    if (!state?.editingId || !state?.editText?.trim()) return;

    // Find the original todo to compare the message
    const originalTodo = activeTodos?.find((todo) => todo?._id === state?.editingId);
    if (!originalTodo) return;

    // Check if the message has actually changed
    const trimmedNewText = state?.editText?.trim();
    if (originalTodo?.message === trimmedNewText) {
      // No changes, just cancel edit without API call
      setState((s: any) => ({ ...s, editingId: null, editText: '' }));
      return;
    }

    // Only call API if the message has actually changed
    await handleUpdateTodo(state?.editingId, { message: trimmedNewText });
    setState((s: any) => ({ ...s, editingId: null, editText: '' }));
  };

  // Handle update todo (similar to table view)
  const handleUpdateTodo = async (id: string, updates: { isDone?: boolean; message?: string }) => {
    try {
      setState((s) => ({ ...s, isLoading: true }));

      // Import the API function directly
      const { apiUpdateTodo } = await import('@/services/ToDoService');
      await apiUpdateTodo(id, updates);

      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });

      if (updates?.isDone !== undefined) {
        openNotification({
          type: 'success',
          massage: `Todo marked as ${updates?.isDone ? 'completed' : 'pending'}`,
        });
      } else if (updates?.message) {
        openNotification({
          type: 'success',
          massage: 'Todo updated successfully',
        });
      }
    } catch {
      openNotification({
        type: 'danger',
        massage: 'Failed to update todo',
      });
    } finally {
      setState((s) => ({ ...s, isLoading: false }));
    }
  };

  const handleToggleTodo = async (todoId: string, currentStatus: boolean) => {
    await handleUpdateTodo(todoId, { isDone: !currentStatus });
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      // Import the API function directly
      const { apiDeleteTodo } = await import('@/services/ToDoService');
      await apiDeleteTodo(todoId);

      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });

      openNotification({
        type: 'success',
        massage: 'Todo deleted successfully',
      });
    } catch {
      openNotification({
        type: 'danger',
        massage: 'Failed to delete todo',
      });
    }
  };

  const handleAssignTodo = (todoId: string) => {
    setSelectedTodoId(todoId);
    setSelectedAgentId('');
    // Check if assignment is coming from TodoListDialog
    const isFromTodoList = isTodoListDialogOpen;
    setIsAssignmentFromTodoList(isFromTodoList);

    // Close the todo list dialog first to avoid dialog conflicts
    setIsTodoListDialogOpen(false);
    // Open assignment dialog
    setIsAssignmentDialogOpen(true);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedAgentId || !selectedTodoId) return;

    try {
      await assignTodoMutation.mutateAsync({
        todoId: selectedTodoId,
        data: { assignee_id: selectedAgentId },
      });
      setIsAssignmentDialogOpen(false);
      setSelectedTodoId('');
      setSelectedAgentId('');
      // Only reopen the todo list dialog if assignment came from it
      if (isAssignmentFromTodoList) {
        setIsTodoListDialogOpen(true);
      }
      setIsAssignmentFromTodoList(false);
      // The assignTodoMutation already handles cache invalidation
    } catch {
      // Error handling is done in the mutation
    }
  };

  const handleOpenTodoListDialog = () => {
    setIsTodoListDialogOpen(true);
  };

  // Handle navigation to lead details page (with proper position tracking)
  const handleViewDetails = () => {
    if (!leadId) return;

    // Update navigation position to clicked lead before navigating (same as table view)
    try {
      const navStore = useFilterAwareLeadsNavigationStore.getState();

      const index = navStore.findFilteredIndexById(leadId);

      if (index >= 0) {
        navStore.setCurrentFilteredIndex(index);
      } else {
        // Try to find it in the current page data as fallback
        const currentData = allLeadsData || [];
        const fallbackIndex = currentData?.findIndex((item: any) => item?._id === leadId);
        if (fallbackIndex >= 0) {
          // Calculate the global index based on current page
          const page = currentPage || 1;
          const size = pageSize || 50;
          const globalIndex = (page - 1) * size + fallbackIndex;
          navStore.setCurrentFilteredIndex(globalIndex);
        }
      }
    } catch {
      // Error handling without console.log
    }

    router.push(`/dashboards/leads/${leadId}`);
  };

  // Combine all todos for unified rendering
  const allTodos = [...pendingTodos, ...completedTodos];
  const hasMoreAllTodos = allTodos?.length > 2;

  return (
    <Card className="card-border card-shadow">
      {/* todo box header */}
      <div className="border-sand-3 flex flex-wrap gap-2 border-b pb-3">
        {/* Related Entities Section */}
        <div className="flex flex-wrap gap-2">
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
          {sourceName && (
            <span className="bg-moss-4 text-moss-1 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium">
              <ApolloIcon name="link" className="mr-1 h-3 w-3" />
              {sourceName}
            </span>
          )}
          {/* Todo Count */}
          <Button
            onClick={handleOpenTodoListDialog}
            size="sm"
            variant="default"
            className="border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
            icon={<ApolloIcon name="checklist" className="h-2.5 w-2.5" />}
          >
            {activeTodos?.length} Todo{activeTodos?.length !== 1 ? 's' : ''}
          </Button>
          {/* View Details Button */}
          {leadId && (
            <Button
              onClick={handleViewDetails}
              size="sm"
              variant="default"
              className="bg-sand-4 text-sand-1 border-sand-3 hover:bg-sand-3 px-1.5 py-0.5 text-xs"
              icon={<ApolloIcon name="external-link" className="h-2.5 w-2.5" />}
            >
              View Details
            </Button>
          )}
        </div>

        {/* Additional Details Section */}
        <div className="flex flex-wrap gap-2">
          <span className="bg-sand-4 text-sand-1 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium">
            <ApolloIcon name="user" className="mr-1 h-3 w-3" />
            {contactName}
          </span>
          <span className="bg-sand-4 text-sand-1 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium">
            <ApolloIcon name="mail" className="mr-1 h-3 w-3" />
            {emailFrom}
          </span>
          <span className="bg-sand-4 text-sand-1 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium">
            <ApolloIcon name="phone" className="mr-1 h-3 w-3" />
            {phone}
          </span>
        </div>
      </div>

      {/* Unified Todo Items Section */}
      <div className={`pt-2 ${hasMoreAllTodos ? 'max-h-[200px] overflow-y-auto' : 'space-y-3'}`}>
        <div className={hasMoreAllTodos ? 'space-y-3 pr-2' : 'space-y-3'}>
          {allTodos &&
            allTodos?.length > 0 &&
            allTodos?.map((todo) => {
              // Safety check for todo object
              if (!todo || !todo?._id) return null;

              return (
                <div
                  key={todo?._id}
                  className={`${state?.editingId === todo?._id ? 'w-full' : 'w-full'} ${todo?.isDone ? 'bg-evergreen/10 border-evergreen/20' : 'bg-sand-4 border-sand-3'
                    } flex items-start gap-3 rounded-lg border p-3 transition-all duration-300`}
                >
                  {/* Checkbox for mark as done */}
                  <button
                    disabled={state?.isLoading}
                    onClick={() => handleToggleTodo(todo?._id, todo?.isDone)}
                    className={`relative h-5 w-5 rounded border-2 transition ${todo?.isDone ? 'border-emerald-500 bg-emerald-500 shadow-sm' : 'border-gray-300 bg-white hover:border-emerald-400'} ${state?.isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}`}
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
                    {state?.editingId === todo?._id ? (
                      <div className="w-full space-y-2">
                        <textarea
                          value={state?.editText}
                          onChange={(e) =>
                            setState((s: any) => ({ ...s, editText: e.target.value }))
                          }
                          className="w-full flex-1 resize-none rounded border p-2 text-sm outline-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit} disabled={state?.isLoading}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setState((s: any) => ({ ...s, editingId: null, editText: '' }))
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            {renderMessage(todo)}
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
                            {todo?.isDone ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleToggleTodo(todo?._id, todo?.isDone)}
                                className="px-2 py-1 text-xs"
                              >
                                Undo
                              </Button>
                            ) : (
                              <>
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
                                ></Button>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Todo Assignment Dialog */}
      <TodoAssignmentDialog
        isOpen={isAssignmentDialogOpen}
        onClose={() => {
          setIsAssignmentDialogOpen(false);
          // Only reopen the todo list dialog if assignment came from it
          if (isAssignmentFromTodoList) {
            setIsTodoListDialogOpen(true);
          }
          setIsAssignmentFromTodoList(false);
        }}
        projectId={projectId}
        selectedAgentId={selectedAgentId}
        onAgentChange={setSelectedAgentId}
        onConfirm={handleConfirmAssignment}
        isSubmitting={assignTodoMutation.isPending}
      />

      {/* Todo List Dialog */}
      <TodoListDialog
        isOpen={isTodoListDialogOpen}
        onClose={() => setIsTodoListDialogOpen(false)}
        todos={activeTodos}
        projectName={projectName}
        agentName={agentName}
        contactName={contactName}
        onUpdateTodo={handleUpdateTodo}
        onDeleteTodo={handleDeleteTodo}
        onAssignTodo={handleAssignTodo}
        isLoading={state?.isLoading}
      />
    </Card>
  );
};

export default TodoBox;
