import React, { useRef, useState } from 'react';
import { CustomFieldDefinition, CustomFieldValue } from '../../types';
import { UnifiedMemberAssignment } from '../MemberComponents/UnifiedMemberAssignment';
import { LabelsDropdown } from '../../_dropdowns/labels/LabelsDropdown';
import { DatesDropdown } from '../../_dropdowns/dates/DatesDropdown';
import { CustomTodoField } from './CustomTodoField';
import { CustomTextArea } from './CustomTextArea';
import { getMembers } from '../../_data/members-data';
import { getLabels } from '../../_data/labels-data';
import { CardDates } from '../../types';
import ConfirmPopover from '@/components/shared/ConfirmPopover';
import { Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';

interface CustomFieldSectionProps {
  fieldDefinition: CustomFieldDefinition;
  fieldValue: CustomFieldValue;
  onUpdate: (value: any) => void;
  onRemove: () => void;
  cardMembers?: string[];
  cardLabels?: string[];
  cardDates?: CardDates;
  taskId: string;
}

export const CustomFieldSection: React.FC<CustomFieldSectionProps> = ({
  fieldDefinition,
  fieldValue,
  onUpdate,
  onRemove,
  cardDates,
  taskId,
}) => {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [membersDropdownOpen, setMembersDropdownOpen] = useState(false);
  const [labelsDropdownOpen, setLabelsDropdownOpen] = useState(false);
  const [datesDropdownOpen, setDatesDropdownOpen] = useState(false);
  
  // State for select field
  const [isEditingSelect, setIsEditingSelect] = useState(false);
  const [selectValue, setSelectValue] = useState(fieldValue.value || '');
  
  // State for text field
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(fieldValue.value || '');

  const members = getMembers();
  const labels = getLabels();
  
  // Sync editValue when fieldValue changes (but not when actively editing)
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(fieldValue.value || '');
    }
  }, [fieldValue.value, isEditing]);
  
  // Sync selectValue when fieldValue changes (but not when actively editing)
  React.useEffect(() => {
    if (!isEditingSelect) {
      setSelectValue(fieldValue.value || '');
    }
  }, [fieldValue.value, isEditingSelect]);

  const handleSaveDates = (dates: CardDates) => {
    onUpdate(dates.dueDate || dates.startDate || dates);
  };

  const handleRemoveDates = () => {
    onUpdate(null);
  };

  const renderFieldContent = () => {
    switch (fieldDefinition.field_type) {
      case 'member':
        const selectedMemberIds = Array.isArray(fieldValue.value) ? fieldValue.value : fieldValue.value ? [fieldValue.value] : [];
        const selectedMembers = members.filter(m => selectedMemberIds.includes(m.id));
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => setMembersDropdownOpen(true)}
                  className="flex items-center gap-2 rounded-lg border border-ocean-2/50 bg-gray-50 px-2 py-1 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white text-xs font-bold">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-black">{member.name}</span>
                </div>
              ))}
              <button
                onClick={() => setMembersDropdownOpen(true)}
                className="flex items-center gap-1 rounded-lg border border-dashed border-ocean-2/50 bg-gray-50 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>Add member</span>
              </button>
            </div>
            <UnifiedMemberAssignment
              isOpen={membersDropdownOpen}
              onClose={() => setMembersDropdownOpen(false)}
              triggerRef={fieldRef as React.RefObject<HTMLElement>}
              context="task"
              taskId={taskId}
              assignedMemberIds={selectedMemberIds}
              onAssign={(memberIds) => {
                const finalValue = memberIds.length === 1 ? memberIds[0] : memberIds;
                onUpdate(finalValue);
              }}
              title="Assign"
            />
          </div>
        );

      case 'label':
        const selectedLabelIds = Array.isArray(fieldValue.value) ? fieldValue.value : fieldValue.value ? [fieldValue.value] : [];
        const selectedLabels = labels.filter(l => selectedLabelIds.includes(l.id));
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {selectedLabels.map((label) => (
                <span
                  key={label.id}
                  onClick={() => setLabelsDropdownOpen(true)}
                  className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm cursor-pointer hover:opacity-80 transition-all"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
              <button
                onClick={() => setLabelsDropdownOpen(true)}
                className="flex items-center gap-1 rounded-lg border border-dashed border-ocean-2/50 bg-gray-50 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>Add label</span>
              </button>
            </div>
            <LabelsDropdown
              isOpen={labelsDropdownOpen}
              onClose={() => setLabelsDropdownOpen(false)}
              triggerRef={fieldRef as React.RefObject<HTMLElement>}
              taskId={taskId}
              currentLabels={selectedLabelIds}
              onCreateLabel={() => { }}
            />
          </div>
        );

      case 'date':
        const dateValue = fieldValue.value ? (typeof fieldValue.value === 'string' ? { dueDate: fieldValue.value } : fieldValue.value) : cardDates;
        return (
          <div>
            <div
              onClick={() => setDatesDropdownOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              {dateValue?.dueDate ? (
                <span className="text-sm font-semibold text-black">
                  {new Date(dateValue.dueDate).toLocaleDateString()}
                </span>
              ) : (
                <span className="text-sm text-gray-500">Set date</span>
              )}
            </div>
            <DatesDropdown
              isOpen={datesDropdownOpen}
              onClose={() => setDatesDropdownOpen(false)}
              triggerRef={fieldRef as React.RefObject<HTMLElement>}
              taskId={taskId}
              dates={dateValue}
              onSave={handleSaveDates}
              onRemove={handleRemoveDates}
            />
          </div>
        );

      case 'select':
        // Inline editable select field
        const selectOptions = fieldDefinition.options || [];

        if (isEditingSelect) {
          return (
            <div className="space-y-2">
              <select
                value={selectValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSelectValue(newValue);
                  onUpdate(newValue);
                  setIsEditingSelect(false);
                }}
                onBlur={() => {
                  if (selectValue !== fieldValue.value) {
                    onUpdate(selectValue);
                  }
                  setIsEditingSelect(false);
                }}
                className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-2 text-sm font-semibold text-black focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
              >
                <option value="">Select...</option>
                {selectOptions.map((option, index) => (
                  <option key={index} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {selectValue && selectOptions.includes(selectValue) && (
                <span
                  onClick={() => setIsEditingSelect(true)}
                  className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm cursor-pointer hover:opacity-80 transition-all"
                  style={{ backgroundColor: '#f87168' }} // Orange color for select badges
                >
                  {selectValue}
                </span>
              )}
              {!selectValue && (
                <button
                  onClick={() => setIsEditingSelect(true)}
                  className="flex items-center gap-1 rounded-lg border border-dashed border-ocean-2/50 bg-gray-50 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>Select value</span>
                </button>
              )}
            </div>
          </div>
        );

      case 'text':
        // Inline editable text field
        if (isEditing) {
          return (
            <div className="space-y-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => {
                  onUpdate(editValue);
                  setIsEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onUpdate(editValue);
                    setIsEditing(false);
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditValue(fieldValue.value || '');
                  }
                }}
                className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
            </div>
          );
        }

        return (
          <div
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors min-h-[40px]"
          >
            <span className="text-sm font-semibold text-black">
              {fieldValue.value !== null && fieldValue.value !== undefined && fieldValue.value !== ''
                ? String(fieldValue.value)
                : 'Click to edit'}
            </span>
          </div>
        );

      case 'textarea':
        // Use CustomTextArea component (same as Description field)
        return (
          <CustomTextArea
            value={fieldValue.value || ''}
            onUpdate={onUpdate}
            placeholder={`Add ${fieldDefinition?.title || 'content'}...`}
          />
        );

      case 'number':
        // Number should be handled in the top section, not here
        return null;

      case 'todo':
        // Handle both direct array and object with allTodos property
        const todosArray = Array.isArray(fieldValue.value) 
          ? fieldValue.value 
          : (fieldValue.value?.allTodos && Array.isArray(fieldValue.value.allTodos))
            ? fieldValue.value.allTodos
            : [];
        const todos = todosArray;

        return (
          <CustomTodoField
            todos={todos}
            onUpdate={onUpdate}
            isCollapsed={isCollapsed}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(fieldValue.value)}
              onChange={(e) => onUpdate(e.target.checked)}
              className="h-5 w-5 rounded border-ocean-2/50 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-sm font-semibold text-black">
              {fieldValue.value ? 'Yes' : 'No'}
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  const isTodoField = fieldDefinition.field_type === 'todo';

  return (
    <div ref={fieldRef} className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          {isTodoField && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center justify-center rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label={isCollapsed ? 'Expand todo field' : 'Collapse todo field'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
          <h3
            className={`text-sm font-bold text-black ${isTodoField ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''}`}
            onClick={isTodoField ? () => setIsCollapsed(!isCollapsed) : undefined}
          >
            {fieldDefinition?.title || 'Untitled'}
          </h3>
        </div>
        <ConfirmPopover
          title="Remove custom field"
          description={`Remove "${fieldDefinition?.title || 'Untitled'}" from this task? You can add it again from Custom Fields.`}
          confirmText="Remove"
          onConfirm={onRemove}
          placement="top"
        >
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </ConfirmPopover>
      </div>

      {/* Content */}
      {renderFieldContent()}
    </div>
  );
};
