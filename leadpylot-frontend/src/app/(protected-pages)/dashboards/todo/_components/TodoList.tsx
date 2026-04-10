import Button from '@/components/ui/Button';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useState } from 'react';
import TodoAssignmentDialog from './TodoAssignmentDialog';
import { useAssignTodo } from '@/services/hooks/useLeads';
import { dateFormateUtils } from '@/utils/dateFormateUtils';
import Timer from '@/app/(protected-pages)/dashboards/tickets/_components/Timer';
import TodoTicketTypeBadge from '@/app/(protected-pages)/dashboards/todo/_components/TodoTicketTypeBadge';
import { useSession } from '@/hooks/useSession';

export interface TCreator {
  _id: string;
  login: string;
  role: string;
}

export interface TTodoListProps {
  _id: string;
  message: string;
  isDone: boolean;
  active: boolean;
  creator: TCreator;
  assignedTo?: {
    _id: string;
    login: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
  dateOfDoneTime?: string | null;
  type?: string;
}

interface TodoListComponentProps {
  activeTodos: TTodoListProps[];
  author: string;
  todoId: string;
  updateTodo: (id: string, updates: { isDone?: boolean; message?: string }) => Promise<void>;
  projectId?: string; // Add projectId for agent filtering
  onTodoClick?: (taskId: string) => void; // Handler to open task detail modal
  assignButton?: boolean;
}

const renderMessage = (
  todo: TTodoListProps,
  state: any,
  handleEdit: (todo: TTodoListProps) => void,
  setState: (state: any) => void
) => {
  const isLong = todo?.message?.length > 30;
  const displayText =
    state?.viewingId === todo?._id || !isLong ? todo?.message : `${todo?.message?.slice(0, 30)}...`;

  // Calculate closedAt: use dateOfDoneTime if available, otherwise use updatedAt if isDone
  const closedAt = todo.isDone ? todo.updatedAt || todo.dateOfDoneTime : undefined;
  return (
    <div className="flex items-center justify-between gap-2">
      <p
        onDoubleClick={() => handleEdit(todo)}
        className={`flex-1 cursor-pointer text-base leading-tight font-medium select-none ${todo?.isDone ? 'line-through opacity-70' : ''}`}
        title={isLong ? todo?.message : undefined}
      >
        <span
          className={`wrap-break-words ${state?.viewingId === todo?._id ? 'whitespace-pre-wrap' : 'whitespace-nowrap'}`}
        >
          {displayText}
        </span>
        {isLong && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setState((s: any) => ({
                ...s,
                viewingId: s?.viewingId === todo?._id ? null : todo?._id,
              }));
            }}
            className="inline-block cursor-pointer px-2 text-xs text-gray-600 hover:text-blue-500"
          >
            <span className="text-xs text-gray-600 hover:underline">
              {state?.viewingId === todo?._id ? 'less <<' : 'more >>'}
            </span>
          </div>
        )}
      </p>
      {/* Timer positioned at right side */}
      <div className="shrink-0">
        <Timer
          createdAt={todo.createdAt}
          closedAt={closedAt || undefined}
          autoStart={true}
          format="human"
          showControls={false}
          isDone={todo.isDone}
          className="text-xs"
        />
      </div>
    </div>
  );
};

const TodoList = ({
  activeTodos,
  author,
  updateTodo,
  projectId,
  onTodoClick,
  assignButton = true,
}: TodoListComponentProps) => {
  const [state, setState] = useState({
    isExpanded: false,
    viewingId: null as string | null,
    editingId: null as string | null,
    editText: '',
    isLoading: false,
  });
  // Assignment dialog state
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const { data: session } = useSession();
  // Hooks for assignment functionality
  const assignTodoMutation = useAssignTodo();

  const handleAssignTodo = (todoId: string) => {
    setSelectedTodoId(todoId);
    setSelectedAgentId('');
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
    } catch {
      // Error handling is done in the mutation
    }
  };

  const hasMore = activeTodos?.length > 2;
  const todosToDisplay = state?.isExpanded ? activeTodos : activeTodos?.slice(0, 2);

  const handleUpdateTodo = async (id: string, updates: { isDone?: boolean; message?: string }) => {
    try {
      setState((s) => ({ ...s, isLoading: true }));
      await updateTodo(id, updates);
    } catch {
      // Error handling is already done in the parent component
    } finally {
      setState((s) => ({ ...s, isLoading: false }));
    }
  };

  const handleEdit = (todo: TTodoListProps) => {
    if (todo?.creator?.login === author || todo?.creator?.role === Role?.ADMIN) {
      setState((s: any) => ({ ...s, editingId: todo?._id, editText: todo?.message }));
    } else {
      toast.push(<Notification type="danger">You are not allowed to edit this todo</Notification>);
    }
  };

  const saveEdit = async () => {
    if (!state?.editingId || !state?.editText?.trim()) return;
    await handleUpdateTodo(state?.editingId, { message: state?.editText?.trim() });
    setState((s: any) => ({ ...s, editingId: null, editText: '' }));
  };

  if (!activeTodos?.length) {
    return (
      <div className="flex items-center justify-center py-2 text-xs text-gray-400">
        <ApolloIcon name="checklist" className="mr-1 text-sm" />
        No todos
      </div>
    );
  }
  return (
    <>
      <div className="max-w-[700px] space-y-2">
        {todosToDisplay &&
          todosToDisplay?.length > 0 &&
          todosToDisplay?.map((todo) => (
            <div
              key={todo?._id}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onTodoClick?.(todo?._id);
              }}
              className={`${state?.editingId === todo?._id ? 'w-full' : 'w-fit'} flex cursor-pointer items-start gap-2 rounded-lg border-l-4 p-2 text-xs transition-all duration-300 hover:shadow-md ${todo?.isDone ? 'border-emerald-400 bg-emerald-50 text-blue-800' : 'border-emerald-400 bg-blue-50 text-emerald-800'}`}
            >
              <button
                disabled={state?.isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleUpdateTodo(todo?._id, { isDone: !todo?.isDone });
                }}
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
                      onChange={(e) => setState((s: any) => ({ ...s, editText: e.target.value }))}
                      className="w-full flex-1 resize-none rounded border p-1 text-sm outline-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button size="xs" onClick={saveEdit} disabled={state?.isLoading}>
                        Save
                      </Button>
                      <Button
                        size="xs"
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
                      <div>
                        {renderMessage(todo, state, handleEdit, setState)}
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center gap-1">
                            <p className="text-xs text-gray-600">by {todo?.creator?.role === Role?.ADMIN ? session?.user.role === Role.ADMIN ? todo?.creator?.login : 'administration' : todo?.creator?.login}</p>
                            <TodoTicketTypeBadge type={todo?.type} />
                            {!todo?.isDone &&
                              (todo?.assignedTo ? (
                                <div className="text-xs font-bold whitespace-break-spaces text-gray-700">
                                  <Button
                                    size="xs"
                                    variant="success"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleAssignTodo(todo?._id);
                                    }}
                                    className="text-xs"
                                    icon={<ApolloIcon name="user-star" />}
                                  >
                                    {todo?.assignedTo?.login}
                                  </Button>
                                </div>
                              ) : (
                                assignButton ? <Button
                                  size="xs"
                                  variant="default"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAssignTodo(todo?._id);
                                  }}
                                  className="ml-2 shrink-0"
                                >
                                  Assign
                                </Button>
                                  : null
                              ))}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1 text-xs">
                              <ApolloIcon name="calendar" className="h-3 w-3" />
                              {dateFormateUtils(todo?.createdAt)}
                            </span>
                            {todo?.updatedAt !== todo?.createdAt && (
                              <span className="flex items-center gap-1 text-xs">
                                <ApolloIcon name="pen" className="h-3 w-3" />
                                {dateFormateUtils(todo?.updatedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
      </div>

      {hasMore && (
        <div className="mt-2 text-left">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setState((s) => ({ ...s, isExpanded: !s?.isExpanded }));
            }}
            size="xs"
            icon={
              <ApolloIcon name={state?.isExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'} />
            }
            className="transition hover:scale-105"
          >
            {state?.isExpanded ? 'Show less' : `+${activeTodos?.length - 2} more`}
          </Button>
        </div>
      )}

      {/* Todo Assignment Dialog */}
      <TodoAssignmentDialog
        isOpen={isAssignmentDialogOpen}
        onClose={() => setIsAssignmentDialogOpen(false)}
        projectId={projectId}
        selectedAgentId={selectedAgentId}
        onAgentChange={setSelectedAgentId}
        onConfirm={handleConfirmAssignment}
        isSubmitting={assignTodoMutation?.isPending}
      />
    </>
  );
};

export default TodoList;
