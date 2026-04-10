import { SmartDropdown } from '@/components/shared/SmartDropdown';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useUpdateTask } from '@/hooks/useTasks';
import { CheckSquare, Edit2, FileText, Plus, Search, X } from 'lucide-react';
import React from 'react';
import { useCustomFields } from '../../_hooks/useCustomFields';
import { CustomFieldDefinition, CustomFieldValue } from '../../types';

interface CustomFieldsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  taskId: string;
  cardFieldValues: CustomFieldValue[];
  onEditFieldValue: (fieldId: string) => void;
  onCreateField: () => void;
}

export const CustomFieldsDropdown: React.FC<CustomFieldsDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  taskId,
  cardFieldValues,
  onEditFieldValue,
  onCreateField,
}) => {
  const { customFields, searchQuery, setSearchQuery, filteredFields } = useCustomFields();
  const { mutate: updateTask } = useUpdateTask();

  const getFieldValue = (fieldId: string) =>
    cardFieldValues.find((fv) => fv.fieldId === fieldId)?.value;

  const isFieldOnCard = (fieldId: string) =>
    cardFieldValues.some((fv) => fv.fieldId === fieldId);

  const getDefaultValue = (field: CustomFieldDefinition) => {
    if (field.defaultValue !== undefined) return field.defaultValue;
    if (field.field_type === 'checkbox') return false;
    if (field.field_type === 'number') return 0;
    if (field.field_type === 'select' && field.options?.length) return field.options[0];
    return '';
  };

  const handleAddField = (field: CustomFieldDefinition) => {
    const defaultValue = getDefaultValue(field);
    const existingFields = cardFieldValues
      .map((fv) => {
        const fieldDef = customFields.find((f) => f.id === fv.fieldId);
        if (!fieldDef) return null;
        return {
          title: fieldDef.title,
          field_type: fieldDef.field_type,
          value: fv.value,
          ...(fieldDef.options && { options: fieldDef.options }),
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    const newField = {
      title: field.title,
      field_type: field.field_type,
      value: defaultValue,
      ...(field.options && { options: field.options }),
    };

    updateTask({
      id: taskId,
      data: { custom_fields: [...existingFields, newField] },
    });
  };

  const formatFieldValue = (field: CustomFieldDefinition, value: any): string => {
    if (value === null || value === undefined) return '';

    switch (field.field_type) {
      case 'checkbox':
        return value ? 'Yes' : 'No';
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'number':
        return value.toString();
      default:
        return String(value);
    }
  };

  const getFieldTypeIcon = (type: CustomFieldDefinition['field_type']) => {
    switch (type) {
      case 'text':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'textarea':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'number':
        return <span className="text-purple-500 font-bold">#</span>;
      case 'date':
        return <span className="text-green-500">📅</span>;
      case 'select':
        return <span className="text-orange-500">📋</span>;
      case 'checkbox':
        return <CheckSquare className="h-4 w-4 text-gray-500" />;
      case 'member':
        return <span className="text-indigo-500">👤</span>;
      case 'label':
        return <span className="text-pink-500">🏷️</span>;
      case 'todo':
        return <CheckSquare className="h-4 w-4 text-emerald-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getFieldTypeColor = (type: CustomFieldDefinition['field_type']): string => {
    switch (type) {
      case 'text':
      case 'textarea':
        return 'bg-blue-50 border-blue-200';
      case 'number':
        return 'bg-purple-50 border-purple-200';
      case 'date':
        return 'bg-green-50 border-green-200';
      case 'select':
        return 'bg-orange-50 border-orange-200';
      case 'checkbox':
        return 'bg-gray-50 border-gray-200';
      case 'member':
        return 'bg-indigo-50 border-indigo-200';
      case 'label':
        return 'bg-pink-50 border-pink-200';
      case 'todo':
        return 'bg-emerald-50 border-emerald-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <SmartDropdown
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      dropdownWidth={320}
      dropdownHeight={500}
    >
      <div className="rounded-xl border border-ocean-2/50 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ocean-2/50 px-2 py-1">
          <h3 className="text-sm font-bold text-black">Custom Fields</h3>
          <Button onClick={onClose} size="xs" variant="plain" icon={<X className="h-4 w-4" />}>
          </Button>
        </div>

        {/* Create New Field Button - Prominent */}
        <div className="border-b border-ocean-2/50 px-2 py-1 bg-gradient-to-r from-indigo-50 to-purple-50">
          <button
            onClick={onCreateField}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-indigo-300 bg-white px-4 py-1 text-sm font-bold text-indigo-700 transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md active:scale-95"
          >
            <Plus className="h-5 w-5" />
            <span>Create New Field</span>
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-ocean-2/50 px-2 py-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fields..."
              className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 py-1 pl-10 pr-3 text-sm text-black placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Fields List */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredFields.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {searchQuery ? 'No fields found' : 'No custom fields available'}
              </p>
              {!searchQuery && (
                <p className="mt-1 text-xs text-gray-500">
                  Click &quot;Create New Field&quot; above to get started
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFields.map((field) => {
                const isOnCard = isFieldOnCard(field.id);
                const currentValue = getFieldValue(field.id);
                const hasValue = currentValue !== null && currentValue !== undefined && currentValue !== '';

                return (
                  <div
                    key={field.id}
                    className={`group relative flex items-start gap-3 rounded-lg border-2 p-1 transition-all ${isOnCard
                      ? `${getFieldTypeColor(field.field_type)} shadow-sm`
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                  >
                    {/* Icon */}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isOnCard ? 'bg-white' : 'bg-gray-100'
                      }`}>
                      {getFieldTypeIcon(field.field_type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <h4 className="text-sm font-bold text-black truncate">{field.title}</h4>
                        {isOnCard && (
                          <span className="flex h-2 w-2 shrink-0 rounded-full bg-green-500"></span>
                        )}
                      </div>
                      {hasValue && (
                        <div className=" text-xs font-medium text-gray-700 truncate">
                          {formatFieldValue(field, currentValue)}
                        </div>
                      )}
                      <div className=" flex items-center gap-2">
                        <span className="text-xs text-gray-500 capitalize">{field.field_type}</span>
                        {field.required && (
                          <span className="text-xs font-semibold text-red-500">Required</span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex shrink-0 items-center justify-center mt-1">
                      {isOnCard ? (
                        <Button
                          onClick={() => onEditFieldValue(field.id)}
                          size="xs"
                          variant="solid"
                          icon={<Edit2 className="h-3 w-3" />}
                        >
                          Edit
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleAddField(field)}
                          size="xs"
                          variant="solid"
                          icon={<Plus className="h-3 w-3" />}
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SmartDropdown>
  );
};
