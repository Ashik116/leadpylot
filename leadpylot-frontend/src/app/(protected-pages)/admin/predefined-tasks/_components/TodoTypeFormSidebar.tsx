import { TodoTypeDetailsForm } from './TodoTypeDetailsForm';
import { TodoTypeFormWrapper } from './TodoTypeFormWrapper';

interface TodoTypeFormSidebarProps {
  type: 'create' | 'edit';
  todoTypeId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function TodoTypeFormSidebar({
  type,
  todoTypeId,
  onClose,
  onSuccess,
}: TodoTypeFormSidebarProps) {
  if (type === 'edit' && todoTypeId) {
    return <TodoTypeDetailsForm todoTypeId={todoTypeId} onClose={onClose} onSuccess={onSuccess} />;
  }

  if (type === 'create') {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-hidden">
          <TodoTypeFormWrapper onSuccess={onSuccess} onClose={onClose} />
        </div>
      </div>
    );
  }

  return null;
}
