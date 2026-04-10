import React, { useState, useEffect } from 'react';
import { SmartDropdown } from '@/components/shared/SmartDropdown';
import ConfirmPopover from '@/components/shared/ConfirmPopover';
import { CustomFieldDefinition, CustomFieldValue, Member, Label } from '../../types';
import { ArrowLeft, X, Plus, Trash2, CheckSquare2 } from 'lucide-react';
import { getMembers } from '../../_data/members-data';
import { getLabels } from '../../_data/labels-data';
import { v4 as uuidv4 } from 'uuid';

interface CustomFieldValueEditorProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  fieldDefinition: CustomFieldDefinition;
  currentValue?: any;
  onSave: (value: any) => void;
  onRemove: () => void;
}

export const CustomFieldValueEditor: React.FC<CustomFieldValueEditorProps> = ({
  isOpen,
  onClose,
  triggerRef,
  fieldDefinition,
  currentValue,
  onSave,
  onRemove,
}) => {
  const [value, setValue] = useState<any>(currentValue || '');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    fieldDefinition.field_type === 'member' ? (Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : []) : []
  );
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    fieldDefinition.field_type === 'label' ? (Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : []) : []
  );
  const [todos, setTodos] = useState<Array<{ id: string; text: string; completed: boolean }>>(
    fieldDefinition.field_type === 'todo' ? (Array.isArray(currentValue) ? currentValue : []) : []
  );
  const [newTodoText, setNewTodoText] = useState('');

  const members = getMembers();
  const labels = getLabels();

  useEffect(() => {
    if (isOpen) {
      if (fieldDefinition.field_type === 'member') {
        setSelectedMembers(Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : []);
      } else if (fieldDefinition.field_type === 'label') {
        setSelectedLabels(Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : []);
      } else if (fieldDefinition.field_type === 'todo') {
        setTodos(Array.isArray(currentValue) ? currentValue : []);
      } else {
        setValue(currentValue || (fieldDefinition.defaultValue !== undefined ? fieldDefinition.defaultValue : ''));
      }
    }
  }, [isOpen, currentValue, fieldDefinition]);

  const handleSave = () => {
    let valueToSave: any;

    switch (fieldDefinition.field_type) {
      case 'member':
        valueToSave = selectedMembers.length === 1 ? selectedMembers[0] : selectedMembers;
        break;
      case 'label':
        valueToSave = selectedLabels.length === 1 ? selectedLabels[0] : selectedLabels;
        break;
      case 'todo':
        valueToSave = todos;
        break;
      case 'number':
        valueToSave = value ? Number(value) : null;
        break;
      case 'checkbox':
        valueToSave = Boolean(value);
        break;
      case 'date':
        valueToSave = value || null;
        break;
      default:
        valueToSave = value || '';
    }

    onSave(valueToSave);
    onClose();
  };

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      setTodos([...todos, { id: uuidv4(), text: newTodoText.trim(), completed: false }]);
      setNewTodoText('');
    }
  };

  const handleToggleTodo = (todoId: string) => {
    setTodos(todos.map(todo => todo.id === todoId ? { ...todo, completed: !todo.completed } : todo));
  };

  const handleDeleteTodo = (todoId: string) => {
    setTodos(todos.filter(todo => todo.id !== todoId));
  };

  const handleRemove = () => {
    onRemove();
    onClose();
  };

  const toggleMember = (memberId: string) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const toggleLabel = (labelId: string) => {
    if (selectedLabels.includes(labelId)) {
      setSelectedLabels(selectedLabels.filter((id) => id !== labelId));
    } else {
      setSelectedLabels([...selectedLabels, labelId]);
    }
  };

  const renderInput = () => {
    switch (fieldDefinition.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Enter ${fieldDefinition.title.toLowerCase()}...`}
            className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`Enter ${fieldDefinition.title.toLowerCase()}...`}
            rows={4}
            className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            autoFocus
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => setValue(e.target.value ? Number(e.target.value) : '')}
            placeholder="Enter number..."
            className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-2 text-sm text-black focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-2 text-sm text-black focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
          >
            <option value="">Select an option...</option>
            {fieldDefinition.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="checkbox-value"
              checked={Boolean(value)}
              onChange={(e) => setValue(e.target.checked)}
              className="h-5 w-5 rounded border-ocean-2/50 text-indigo-500 focus:ring-indigo-500"
            />
            <label htmlFor="checkbox-value" className="text-sm font-semibold text-black">
              {value ? 'Yes' : 'No'}
            </label>
          </div>
        );

      case 'member':
        return (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => toggleMember(member.id)}
                className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${selectedMembers.includes(member.id)
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-ocean-2/50 bg-gray-50 hover:bg-gray-100'
                  }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white text-xs font-bold">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-black">{member.name}</div>
                  {member.email && (
                    <div className="text-xs text-gray-500">{member.email}</div>
                  )}
                </div>
                {selectedMembers.includes(member.id) && (
                  <div className="text-indigo-600">✓</div>
                )}
              </button>
            ))}
          </div>
        );

      case 'label':
        return (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {labels.map((label) => (
              <button
                key={label.id}
                onClick={() => toggleLabel(label.id || '')}
                className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${selectedLabels.includes(label.id || '')
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-ocean-2/50 bg-gray-50 hover:bg-gray-100'
                  }`}
              >
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name?.charAt(0).toUpperCase() || ''}
                </span>
                <div className="flex-1 text-sm font-semibold text-black">{label.name}</div>
                {selectedLabels.includes(label.id || '') && (
                  <div className="text-indigo-600">✓</div>
                )}
              </button>
            ))}
          </div>
        );

      case 'todo':
        return (
          <div className="space-y-3">
            {/* Add Todo Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTodo();
                  }
                }}
                placeholder="Add a todo item..."
                className="flex-1 rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
              <button
                onClick={handleAddTodo}
                disabled={!newTodoText.trim()}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Todo List */}
            <div className="max-h-[250px] space-y-2 overflow-y-auto">
              {todos.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  No todos yet. Add one above!
                </div>
              ) : (
                todos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50"
                  >
                    <button
                      onClick={() => handleToggleTodo(todo.id)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${todo.completed
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300 hover:border-indigo-400'
                        }`}
                    >
                      {todo.completed && <CheckSquare2 className="h-3 w-3 text-white" />}
                    </button>
                    <span
                      className={`flex-1 text-sm ${todo.completed
                          ? 'text-gray-500 line-through'
                          : 'text-black'
                        }`}
                    >
                      {todo.text}
                    </span>
                    <ConfirmPopover
                      title="Delete todo item"
                      description="Remove this todo item? This cannot be undone."
                      confirmText="Delete"
                      onConfirm={() => handleDeleteTodo(todo.id)}
                      placement="top"
                    >
                      <button
                        type="button"
                        className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </ConfirmPopover>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SmartDropdown
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      dropdownWidth={360}
      dropdownHeight={fieldDefinition.field_type === 'member' || fieldDefinition.field_type === 'label' || fieldDefinition.field_type === 'todo' ? 500 : 400}
    >
      <div className="rounded-xl border border-ocean-2/50 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ocean-2/50 p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-bold text-black">{fieldDefinition.title || 'Untitled'}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-black/80 uppercase tracking-widest">
              {fieldDefinition.title || 'Untitled'}
            </label>
            {renderInput()}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleRemove}
              className="flex-1 rounded-lg border border-ocean-2/50 bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gray-50"
            >
              Remove
            </button>
            <button
              onClick={handleSave}
              className="flex-1 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </SmartDropdown>
  );
};
