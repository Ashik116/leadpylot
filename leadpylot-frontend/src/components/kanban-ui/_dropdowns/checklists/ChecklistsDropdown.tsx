import React, { useState } from 'react';
import { SmartDropdown } from '@/components/shared/SmartDropdown';
import { Check, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import { useTodoTypes } from '@/services/hooks/useTodoTypes';

interface ChecklistsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  onCreate: (title: string, selectedTodoTypeIds?: string[]) => void;
}

export const ChecklistsDropdown: React.FC<ChecklistsDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [selectedTodoTypes, setSelectedTodoTypes] = useState<string[]>([]);

  // Fetch todo types when dropdown opens
  const { data: todoTypesData, isLoading: isLoadingTodoTypes } = useTodoTypes({
    status: 'active',
    page: 1,
    limit: 10,
    enabled: isOpen,
  });

  const activeTodoTypes = todoTypesData?.data || [];

  const handleSubmit = () => {
    // Allow submission if either title is provided OR predefined tasks are selected
    if (title.trim() || selectedTodoTypes.length > 0) {
      onCreate(title.trim() || '', selectedTodoTypes.length > 0 ? selectedTodoTypes : undefined);
      setTitle('');
      setSelectedTodoTypes([]);
      onClose();
    }
  };

  const handleTodoTypeToggle = (todoTypeId: string) => {
    // Prevent toggling if custom title is entered
    if (title.trim()) {
      return;
    }
    setSelectedTodoTypes((prev) =>
      prev.includes(todoTypeId)
        ? prev.filter((id) => id !== todoTypeId)
        : [...prev, todoTypeId]
    );
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    // Clear selected todo types when user starts typing custom title
    if (newTitle.trim() && selectedTodoTypes.length > 0) {
      setSelectedTodoTypes([]);
    }
  };

  const handleClose = () => {
    setTitle('');
    setSelectedTodoTypes([]);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setTitle('');
      onClose();
    }
  };

  return (
    <SmartDropdown
      isOpen={isOpen}
      onClose={handleClose}
      triggerRef={triggerRef}
      dropdownWidth={500}
      dropdownHeight={600}
    >
      <div className="rounded-xl border border-ocean-2/50 bg-white shadow-xl flex flex-col max-h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ocean-2/50 px-2 py-1">
          <h3 className="text-sm font-bold text-black">Add Subtask</h3>
          <Button
            onClick={handleClose}
            className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
            size="xs"
            variant="plain"
            icon={<X className="h-4 w-4" />}
          >
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Predefined Todo Types */}
          <div className="flex w-48 flex-col border-r border-ocean-2/50 bg-gray-50 p-2">
            <div className="mb-3 shrink-0">
              <p className="text-xs font-semibold text-gray-700">Predefined Tasks</p>
              <p className="text-xs text-gray-500">Select tasks (Optional)</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoadingTodoTypes ? (
                <div className="text-xs text-gray-500">Loading...</div>
              ) : activeTodoTypes.length === 0 ? (
                <div className="text-xs text-gray-500">No tasks available</div>
              ) : (
                <div className="space-y-1">
                  {activeTodoTypes?.map((todoType) => {
                    const isDisabled = title.trim().length > 0;
                    return (
                      <div
                        key={todoType._id}
                        className={`group rounded-lg border border-gray-200 bg-white px-1.5 transition-colors ${
                          isDisabled
                            ? 'opacity-60 cursor-not-allowed'
                            : 'hover:border-amber-300'
                        }`}
                      >
                        <div
                          onClick={() => handleTodoTypeToggle(todoType._id)}
                          className={`flex items-center gap-1.5 mb-1 ${
                            isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        >
                          <Checkbox 
                            checked={selectedTodoTypes.includes(todoType._id)} 
                            disabled={isDisabled}
                          />
                          <div className={`text-xs font-medium truncate ${
                            isDisabled ? 'text-gray-400' : 'text-gray-900'
                          }`}>
                            {todoType.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Main Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* Title Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-black/80  tracking-widest">
                Title <span className="text-gray-400 font-normal   ">(Optional if predefined tasks selected)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                onKeyDown={handleKeyDown}
                placeholder="Subtask title..."
                disabled={selectedTodoTypes.length > 0}
                className={`w-full rounded-lg border border-ocean-2/50 bg-white px-3 py-1 text-sm text-black placeholder:text-gray-400 outline-none ${
                  selectedTodoTypes.length > 0
                    ? 'bg-gray-100 cursor-not-allowed opacity-60'
                    : 'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
                autoFocus={selectedTodoTypes.length === 0}
              />
            </div>

            {/* Selected Todo Types Info */}
            {selectedTodoTypes.length > 0 && (
              <div className="text-xs text-gray-500">
                {selectedTodoTypes.length} task{selectedTodoTypes.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row gap-2 justify-end border-t border-ocean-2/50 p-2">
          <Button
            onClick={handleClose}
            size="xs"
            variant="plain"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() && selectedTodoTypes.length === 0}
            size="xs"
            variant="solid"
            icon={<Check className="h-4 w-4" />}
          >
            Add
          </Button>
        </div>
      </div>
    </SmartDropdown>
  );
};
