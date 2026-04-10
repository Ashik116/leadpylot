'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Select from '@/components/ui/Select';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { AdminTodo } from '@/services/AdminTodoService';
import { useQueryClient } from '@tanstack/react-query';
import useNotification from '@/utils/hooks/useNotification';
import { dateFormateUtils } from '@/utils/dateFormateUtils';
import { useAssignAdminTodoToAgent } from '@/services/hooks/useAdminTodos';
import { useUsers } from '@/services/hooks/useUsers';

interface TodoItemProps {
  todo: AdminTodo;
  onMakeAdminOnly: () => void;
  isLoading: boolean;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onMakeAdminOnly, isLoading }) => {
  const { openNotification } = useNotification();
  const queryClient = useQueryClient();
  const assignTodoMutation = useAssignAdminTodoToAgent();

  // State for editing
  const [state, setState] = useState({
    editingId: null as string | null,
    editText: '',
    isLoading: false,
  });

  // Assignment dialog state
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch users (agents) for assignment
  const { data: usersData } = useUsers({
    page: 1,
    limit: 100, // Get all users for assignment
  });

  // Filter agents only
  const agents = usersData?.data?.filter((user: any) => user.role === 'agent') || [];
  // const getPriorityColor = (priority: number) => {
  //   switch (priority) {
  //     case 5:
  //       return 'text-red-600 bg-red-100';
  //     case 4:
  //       return 'text-orange-600 bg-orange-100';
  //     case 3:
  //       return 'text-yellow-600 bg-yellow-100';
  //     case 2:
  //       return 'text-blue-600 bg-blue-100';
  //     case 1:
  //       return 'text-gray-600 bg-gray-100';
  //     default:
  //       return 'text-gray-600 bg-gray-100';
  //   }
  // };

  // const getPriorityLabel = (priority: number) => {
  //   switch (priority) {
  //     case 5:
  //       return 'Critical';
  //     case 4:
  //       return 'High';
  //     case 3:
  //       return 'Medium';
  //     case 2:
  //       return 'Low';
  //     case 1:
  //       return 'Very Low';
  //     default:
  //       return 'Normal';
  //   }
  // };

  // Handle edit function
  const handleEdit = (todo: AdminTodo) => {
    setState((s: any) => ({ ...s, editingId: todo._id, editText: todo.message }));
  };

  // Save edit function
  const saveEdit = async () => {
    if (!state.editingId || !state.editText.trim()) return;
    await handleUpdateTodo(state.editingId, { message: state.editText.trim() });
    setState((s: any) => ({ ...s, editingId: null, editText: '' }));
  };

  // Handle update todo
  const handleUpdateTodo = async (id: string, updates: { isDone?: boolean; message?: string }) => {
    try {
      setState((s) => ({ ...s, isLoading: true }));

      // Import the API function directly
      const { apiUpdateAdminTodo } = await import('@/services/AdminTodoService');
      await apiUpdateAdminTodo(id, updates);

      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['admin-todos'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      if (updates.isDone !== undefined) {
        openNotification({
          type: 'success',
          massage: `Todo marked as ${updates.isDone ? 'completed' : 'pending'}`,
        });
      } else if (updates.message) {
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
      setState((s) => ({ ...s, isLoading: true }));

      // Import the API function directly
      const { apiDeleteAdminTodo } = await import('@/services/AdminTodoService');
      await apiDeleteAdminTodo(todoId);

      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['admin-todos'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      openNotification({
        type: 'success',
        massage: 'Todo deleted successfully',
      });

      setIsDeleteDialogOpen(false);
    } catch {
      openNotification({
        type: 'danger',
        massage: 'Failed to delete todo',
      });
    } finally {
      setState((s) => ({ ...s, isLoading: false }));
    }
  };

  // Assignment handlers
  const handleAssignTodo = () => {
    setSelectedAgentId('');
    setIsAssignmentDialogOpen(true);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedAgentId) return;

    try {
      await assignTodoMutation.mutateAsync({
        todoId: todo._id,
        agentId: selectedAgentId,
      });

      setIsAssignmentDialogOpen(false);
      setSelectedAgentId('');

      openNotification({
        type: 'success',
        massage: 'Todo assigned successfully',
      });
    } catch {
      openNotification({
        type: 'danger',
        massage: 'Failed to assign todo',
      });
    }
  };

  // Helper function to render message with auto-wrap
  const renderMessage = (todo: AdminTodo) => {
    return (
      <p
        onDoubleClick={() => handleEdit(todo)}
        className={`cursor-pointer text-sm leading-relaxed font-medium break-words whitespace-pre-wrap select-none ${todo.isDone ? 'line-through opacity-70' : ''}`}
      >
        {todo.message}
      </p>
    );
  };

  return (
    <div
      className={`${state.editingId === todo._id ? 'w-full' : 'w-full'} group flex items-start gap-4 overflow-hidden rounded-2xl border border-l-4 border-gray-200 bg-gradient-to-r from-white to-gray-50 p-4 transition-all duration-300 hover:border-blue-300 hover:shadow-md`}
    >
      {/* Checkbox for mark as done */}
      <button
        disabled={state.isLoading || isLoading}
        onClick={() => handleToggleTodo(todo._id, todo.isDone)}
        className={`relative h-5 w-5 rounded border-2 transition ${todo.isDone ? 'border-emerald-500 bg-emerald-500 shadow-sm' : 'border-gray-300 bg-white hover:border-emerald-400'} ${state.isLoading || isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}`}
      >
        {todo.isDone && (
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
        {state.editingId === todo._id ? (
          <div className="w-full space-y-2">
            <textarea
              value={state.editText}
              onChange={(e) => setState((s: any) => ({ ...s, editText: e.target.value }))}
              className="w-full flex-1 resize-none rounded border p-2 text-sm outline-none"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} disabled={state.isLoading}>
                Save
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setState((s: any) => ({ ...s, editingId: null, editText: '' }))}
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
                <div className="mt-3 space-y-2">
                  {/* <p className="text-gray-500 text-xs font-medium">by {todo.creator.first_name} {todo.creator.last_name}</p> */}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1">
                      <ApolloIcon name="calendar" />
                      {dateFormateUtils(todo.createdAt)}
                    </span>
                    {todo.updatedAt !== todo.createdAt && (
                      <span className="flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1">
                        <ApolloIcon name="pen" />
                        {dateFormateUtils(todo.updatedAt)}
                      </span>
                    )}
                    {todo.due_date && (
                      <span className="flex items-center gap-1.5 rounded-md bg-orange-50 px-2 py-1 text-orange-600">
                        <ApolloIcon name="calendar" />
                        Due: {new Date(todo.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!todo.isDone && (
                <div className="ml-2 flex items-center gap-2">
                  {/* Assign Button - Only show if NOT already assigned OR show reassign button */}
                  {todo.assignedUser ? (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={handleAssignTodo}
                      disabled={isLoading || state.isLoading}
                      icon={<ApolloIcon name="user-check" />}
                      className="px-3 py-1.5 text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      {todo.assignedUser.login}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleAssignTodo}
                      disabled={isLoading || state.isLoading}
                      icon={<ApolloIcon name="user-plus" />}
                      className="px-3 py-1.5 text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      Assign
                    </Button>
                  )}

                  {/* Make Admin Only Button - Only show if assigned */}
                  {!todo.admin_only && todo.assignedUser && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={onMakeAdminOnly}
                      disabled={isLoading || state.isLoading}
                      icon={<ApolloIcon name="padlock" />}
                      className="px-3 py-1.5 text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      Admin Only
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="default"
                    icon={<ApolloIcon name="trash" />}
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={isLoading || state.isLoading}
                    className="bg-red-500 px-3 py-1.5 text-xs font-medium shadow-sm transition-all duration-200 hover:bg-red-600 hover:shadow-md"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Assignment Dialog */}
      <Dialog isOpen={isAssignmentDialogOpen} onClose={() => setIsAssignmentDialogOpen(false)}>
        <div className="space-y-4">
          <h6 className="mb-4 text-lg font-semibold text-gray-900">Assign Todo to Agent</h6>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Select Agent</label>
            <Select
              placeholder="Choose an agent..."
              value={
                selectedAgentId
                  ? agents
                      .map((agent: any) => ({
                        value: agent._id,
                        label: `${agent.info?.name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim()} (${agent.login})`,
                      }))
                      .find((opt: any) => opt.value === selectedAgentId)
                  : null
              }
              onChange={(option: any) => setSelectedAgentId(option?.value || '')}
              options={agents.map((agent: any) => ({
                value: agent._id,
                label: `${agent.info?.name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim()} (${agent.login})`,
              }))}
              className="w-full"
            />
          </div>
          <div className="mt-6 flex justify-end space-x-2">
            <Button variant="default" onClick={() => setIsAssignmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={handleConfirmAssignment}
              disabled={!selectedAgentId || assignTodoMutation.isPending}
            >
              {assignTodoMutation.isPending ? 'Assigning...' : 'Assign Todo'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <ApolloIcon name="trash" className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div>
              <h6 className="text-lg font-semibold text-gray-900">Delete Todo</h6>
              <p className="text-sm text-gray-600">This action cannot be undone.</p>
            </div>
          </div>
          <p className="text-gray-700">
            Are you sure you want to delete this todo? This will permanently remove it from the
            system.
          </p>
          <div className="mt-6 flex justify-end space-x-2">
            <Button
              variant="default"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={state.isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={() => handleDeleteTodo(todo._id)}
              disabled={state.isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {state.isLoading ? 'Deleting...' : 'Delete Todo'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default TodoItem;
