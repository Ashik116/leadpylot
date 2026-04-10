import React from 'react';
import { SmartDropdown } from '@/components/shared/SmartDropdown';
import {
  Tag,
  Calendar,
  CheckSquare,
  Users,
  Paperclip,
  FileText,
} from 'lucide-react';

interface AddToCardDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  onSelectOption: (
    option:
      | 'labels'
      | 'dates'
      | 'checklist'
      | 'members'
      | 'attachment'
      | 'customFields'
  ) => void;
}

const OPTIONS = [
  {
    id: 'labels' as const,
    icon: Tag,
    label: 'Labels',
    description: 'Organize, categorize, and prioritize',
  },
  {
    id: 'dates' as const,
    icon: Calendar,
    label: 'Dates',
    description: 'Start dates, due dates, and reminders',
  },
  {
    id: 'checklist' as const,
    icon: CheckSquare,
    label: 'Subtasks',
    description: 'Add subtasks',
  },
  {
    id: 'members' as const,
    icon: Users,
    label: 'Members',
    description: 'Assign members',
  },
  {
    id: 'attachment' as const,
    icon: Paperclip,
    label: 'Attachment',
    description: 'Add links, pages, work items, and more',
  },
  {
    id: 'customFields' as const,
    icon: FileText,
    label: 'Custom Fields',
    description: 'Add custom fields to track additional data',
  },
];

export const AddToCardDropdown: React.FC<AddToCardDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  onSelectOption,
}) => {
  const handleSelect = (optionId: typeof OPTIONS[number]['id']) => {
    onSelectOption(optionId);
    onClose();
  };

  return (
    <SmartDropdown
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      dropdownWidth={320}
      dropdownHeight={400}
    >
      <div className="rounded-xl border border-ocean-2/50 bg-white shadow-xl">
        <div className="border-b border-ocean-2/50 p-3">
          <h3 className="text-sm font-bold text-black">Add to card</h3>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Icon className="h-4 w-4 text-black" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-black">{option.label}</div>
                  <div className="text-xs text-black/60">{option.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </SmartDropdown>
  );
};
