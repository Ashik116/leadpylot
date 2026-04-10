'use client';

import Dialog from '@/components/ui/Dialog';
import { TodoTypeFormSidebar } from '@/app/(protected-pages)/admin/predefined-tasks/_components/TodoTypeFormSidebar';

interface TodoTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'create' | 'edit';
  todoTypeId?: string;
  onSuccess?: () => void;
}

export default function TodoTypeDialog({
  isOpen,
  onClose,
  type,
  todoTypeId,
  onSuccess,
}: TodoTypeDialogProps) {
  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  const dialogTitle = type === 'create' ? 'Create Predefined Task' : 'Edit Predefined Task';
  const dialogDescription = type === 'create' ? 'Create a new predefined task' : 'Edit the predefined task';

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={600}>
      <div className="flex max-h-[85vh] flex-col">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
          <h6 className="text-lg font-semibold text-gray-900">{dialogTitle}</h6>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto">
          <TodoTypeFormSidebar
            type={type}
            todoTypeId={todoTypeId}
            onClose={onClose}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </Dialog>
  );
}
