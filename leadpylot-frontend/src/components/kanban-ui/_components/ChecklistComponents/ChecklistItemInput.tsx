import React, { useState } from 'react';
import { ReminderOption } from '../../types';
import Button from '@/components/ui/Button';
import { Plus, X } from 'lucide-react';

interface ChecklistItemInputProps {
  onAdd: (text: string, assignedMembers?: string[], dueDate?: { date?: string; time?: string; reminder?: ReminderOption }) => void;
  onCancel: () => void;
  placeholder?: string;
}

export const ChecklistItemInput: React.FC<ChecklistItemInputProps> = ({
  onAdd,
  onCancel,
  placeholder = 'Add an item',
}) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim()) {
      onAdd(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setText('');
      onCancel();
    }
  };

  return (
    <div className="space-y-0.5">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-lg border border-ocean-2/50 bg-white px-1.5 py-1 text-sm text-black placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        autoFocus
      />
      <div className="flex items-center gap-1">
        <Button
          variant="solid"
          size="xs"
          onClick={() => handleSubmit()}
          disabled={!text.trim()}
          icon={<Plus className="h-3 w-3" />}
          className="px-1.5 py-0.5 text-xs"
        >
          Add
        </Button>
        <Button
          variant="default"
          size="xs"
          onClick={onCancel}
          icon={<X className="h-3 w-3" />}
          className="px-1.5 py-0.5 text-xs"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
