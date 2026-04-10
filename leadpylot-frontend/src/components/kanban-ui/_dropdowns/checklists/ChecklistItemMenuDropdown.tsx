import React from 'react';
import { SmartDropdown } from '@/components/shared/SmartDropdown';
import ConfirmPopover from '@/components/shared/ConfirmPopover';
import { Clock, User, Trash2 } from 'lucide-react';

interface ChecklistItemMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  hasDueDate: boolean;
  hasAssignees: boolean;
  onDueDateClick?: () => void;
  onAssignClick?: () => void;
  onDeleteClick: () => void;
}

export const ChecklistItemMenuDropdown: React.FC<ChecklistItemMenuDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  hasDueDate,
  hasAssignees,
  onDueDateClick,
  onAssignClick,
  onDeleteClick,
}) => {
  const handleDueDate = () => {
    onDueDateClick?.();
    onClose();
  };

  const handleAssign = () => {
    onAssignClick?.();
    onClose();
  };

  const handleDeleteConfirm = () => {
    onDeleteClick();
    onClose();
  };

  return (
    <SmartDropdown
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      dropdownWidth={200}
      dropdownHeight={200}
    >
      <div className="rounded-xl border border-ocean-2/50 bg-white shadow-xl">
        <div className="p-1">
          {onDueDateClick && (
            <button
              onClick={handleDueDate}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-black transition-colors hover:bg-gray-50"
            >
              <Clock className="h-4 w-4 text-gray-500" />
              <span>{hasDueDate ? 'Change due date' : 'Due date'}</span>
            </button>
          )}

          {onAssignClick && (
            <button
              onClick={handleAssign}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-black transition-colors hover:bg-gray-50"
            >
              <User className="h-4 w-4 text-gray-500" />
              <span>{hasAssignees ? 'Change assignees' : 'Assign'}</span>
            </button>
          )}

          {(onDueDateClick || onAssignClick) && (
            <div className="my-1 h-px bg-ocean-2/50" />
          )}

          <ConfirmPopover
            title="Delete Subtask item"
            description="Remove this item from the Subtask? This cannot be undone."
            confirmText="Delete"
            onConfirm={handleDeleteConfirm}
            placement="left"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </ConfirmPopover>
        </div>
      </div>
    </SmartDropdown>
  );
};
