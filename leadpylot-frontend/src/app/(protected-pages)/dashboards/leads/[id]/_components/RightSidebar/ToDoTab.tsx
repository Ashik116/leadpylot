import { useState, useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import classNames from '@/utils/classNames';
import { useCreateTodo, useTodosByLeadId, useUpdateTodo } from '@/services/hooks/useToDo';
import { useQueryClient } from '@tanstack/react-query';
import { apiDeleteTodo, apiToggleTodoStatus } from '@/services/ToDoService';
import { dateFormateUtils } from '@/utils/dateFormateUtils';

interface ToDoTabProps {
  leadId: string | undefined;
  leadExpandView?: boolean;
}

const ToDoTab = ({ leadId, leadExpandView }: ToDoTabProps) => {
  const [newTodoText, setNewTodoText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [shouldFocus, setShouldFocus] = useState(false);

  // Fetch todos for this lead
  const { data: todosResponse, isLoading } = useTodosByLeadId(leadId);

  // Focus input after todo creation
  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      setShouldFocus(false);
    }
  }, [shouldFocus]);

  // Mutations
  const createTodoMutation = useCreateTodo();
  const updateTodoMutation = useUpdateTodo(editingId || '');

  const addTodo = () => {
    if (!newTodoText.trim() || !leadId) return;

    createTodoMutation.mutate(
      {
        lead_id: leadId,
        message: newTodoText.trim(),
      },
      {
        onSuccess: () => {
          setNewTodoText('');
          // Trigger focus after state update
          setShouldFocus(true);
        },
      }
    );
  };

  const toggleTodo = async (id: string, isDone: boolean) => {
    try {
      await apiToggleTodoStatus(id, { isDone: !isDone });

      // Use the same comprehensive invalidation logic as useAssignTodo
      // 1) Invalidate only leads queries that include has_todo filter
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          const key1 = query.queryKey[1] as Record<string, unknown> | undefined | null;
          const hasTodoParam =
            key1 !== undefined &&
            key1 !== null &&
            typeof key1 === 'object' &&
            (key1 as any).has_todo === true;
          return key0 === 'leads' && hasTodoParam;
        },
      });

      // 2) Invalidate grouped leads queries (no removal, no explicit refetch)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          return key0 === 'grouped-leads' || key0 === 'group-leads';
        },
      });

      // 3) Invalidate todo-specific lists used by the Todo dashboard
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-todos'] });
      queryClient.invalidateQueries({ queryKey: ['extra-todos'] });

      // 4) Also invalidate basic leads queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      // 5) Invalidate todo-specific queries
      queryClient.invalidateQueries({ queryKey: ['todo', id] });
      queryClient.invalidateQueries({ queryKey: ['todos', 'lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });

      // 6) Invalidate current user query to update totalPendingTodo count
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    } catch (error) {
      console.error('Failed to toggle todo status:', error);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await apiDeleteTodo(id);

      // Use the same comprehensive invalidation logic as useAssignTodo
      // 1) Invalidate only leads queries that include has_todo filter
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          const key1 = query.queryKey[1] as Record<string, unknown> | undefined | null;
          const hasTodoParam =
            key1 !== undefined &&
            key1 !== null &&
            typeof key1 === 'object' &&
            (key1 as any).has_todo === true;
          return key0 === 'leads' && hasTodoParam;
        },
      });

      // 2) Invalidate grouped leads queries (no removal, no explicit refetch)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key0 = query.queryKey[0] as unknown;
          return key0 === 'grouped-leads' || key0 === 'group-leads';
        },
      });

      // 3) Invalidate todo-specific lists used by the Todo dashboard
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-todos'] });
      queryClient.invalidateQueries({ queryKey: ['extra-todos'] });

      // 4) Also invalidate basic leads queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      // 5) Invalidate todo-specific queries
      queryClient.invalidateQueries({ queryKey: ['todo', id] });
      queryClient.invalidateQueries({ queryKey: ['todos', 'lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['infinite-activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });

      // 6) Invalidate current user query to update totalPendingTodo count
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const startEditing = (id: string, text: string) => {
    setEditingId(id);
    setEditingText(text);
  };

  const saveEdit = () => {
    if (!editingText.trim() || !editingId) return;

    updateTodoMutation.mutate(
      {
        message: editingText.trim(),
      },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditingText('');
        },
      }
    );
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: 'add' | 'edit') => {
    if (e.key === 'Enter') {
      if (action === 'add') {
        addTodo();
      } else {
        saveEdit();
      }
    }
  };

  // Get todos from API response
  const todos = todosResponse?.data || [];

  // Sort todos: pending first, then completed
  const completedTodos = todos.filter((todo) => todo.isDone);
  const pendingTodos = todos.filter((todo) => !todo.isDone);

  return (
    <div className="flex h-full flex-col">
      {/* Add new todo */}
      {/* <div className={` ${leadExpandView ? 'p-1' : 'p-3'}`}>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Add a new todo..."
            value={newTodoText}
            size="sm"
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, 'add')}
            className="flex-1"
            disabled={!leadId || createTodoMutation.isPending}
          />
          <Button
            variant="solid"
            size="sm"
            icon={<ApolloIcon name="plus" />}
            onClick={addTodo}
            disabled={!newTodoText.trim() || !leadId || createTodoMutation.isPending}
            loading={createTodoMutation.isPending}
          >
            Add
          </Button>
        </div>
      </div> */}

      {/* Todo list */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center pt-5">
            <p className="text-sand-2 text-center text-sm">Loading tickets...</p>
          </div>
        ) : todos.length === 0 ? (
          <div className="flex h-full items-center justify-center pt-5">
            <p className="text-sand-2 text-center text-sm">No tickets found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Pending todos */}
            {pendingTodos.length > 0 && (
              <div className={`${leadExpandView ? 'p-1.5' : 'p-3'}`}>
                <h4
                  className={`${leadExpandView ? 'mb-1' : 'mb-3'} text-sm font-medium text-gray-700`}
                >
                  Pending
                </h4>
                <div className={`${leadExpandView ? 'space-y-0' : 'space-y-2'}`}>
                  {pendingTodos.map((todo) => (
                    <div
                      key={todo._id}
                      className="flex items-center gap-3 rounded-lg p-1 hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={todo.isDone}
                        onChange={() => toggleTodo(todo._id, todo.isDone)}
                        className="shrink-0"
                      />
                      <div className="flex-1">
                        {editingId === todo._id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyPress={(e) => handleKeyPress(e, 'edit')}
                              className="flex-1"
                              autoFocus
                            />
                            <Button
                              variant="solid"
                              size="xs"
                              onClick={saveEdit}
                              disabled={!editingText.trim() || updateTodoMutation.isPending}
                              loading={updateTodoMutation.isPending}
                            >
                              Save
                            </Button>
                            <Button variant="plain" size="xs" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <span className="text-sm">{todo.message}</span>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <ApolloIcon name="calendar" className="h-3 w-3" />
                                  {dateFormateUtils(todo.createdAt)}
                                </span>
                                {todo.updatedAt !== todo.createdAt && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <ApolloIcon name="pen" className="h-3 w-3" />
                                    {dateFormateUtils(todo.updatedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="plain"
                                size="xs"
                                icon={<ApolloIcon name="pen" />}
                                onClick={() => startEditing(todo._id, todo.message)}
                              />
                              <Button
                                variant="plain"
                                size="xs"
                                icon={<ApolloIcon name="trash" />}
                                onClick={() => deleteTodo(todo._id)}
                                className="text-rust hover:text-rust-600"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed todos */}
            {completedTodos.length > 0 && (
              <div className={`${leadExpandView ? 'p-1.5' : 'p-3'}`}>
                <h4
                  className={`${leadExpandView ? 'mb-1' : 'mb-3'} text-sm font-medium text-gray-700`}
                >
                  Completed ({completedTodos.length})
                </h4>
                <div className={`${leadExpandView ? 'space-y-0' : 'space-y-2'}`}>
                  {completedTodos.map((todo) => (
                    <div
                      key={todo._id}
                      className="flex items-center gap-3 rounded-lg p-1 hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={todo.isDone}
                        onChange={() => toggleTodo(todo._id, todo.isDone)}
                        className="shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <span
                              className={classNames(
                                'text-sm',
                                todo.isDone ? 'text-gray-500 line-through' : ''
                              )}
                            >
                              {todo.message}
                            </span>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <ApolloIcon name="calendar" className="h-3 w-3" />
                                {dateFormateUtils(todo.createdAt)}
                              </span>
                              {todo.updatedAt !== todo.createdAt && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <ApolloIcon name="pen" className="h-3 w-3" />
                                  {dateFormateUtils(todo.updatedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="plain"
                            size="xs"
                            icon={<ApolloIcon name="trash" />}
                            onClick={() => deleteTodo(todo._id)}
                            className="text-rust hover:text-rust-600"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToDoTab;
