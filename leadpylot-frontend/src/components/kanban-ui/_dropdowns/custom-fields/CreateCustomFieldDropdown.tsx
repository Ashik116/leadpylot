import { SmartDropdown } from '@/components/shared/SmartDropdown';
import Button from '@/components/ui/Button';
import { useUpdateTask } from '@/hooks/useTasks';
import { ArrowLeft, Check, CheckSquare2, Trash2, X } from 'lucide-react';
import React, { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { CustomFieldType } from '../../types';

interface CreateCustomFieldDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  taskId: string;
  editingField?: {
    _id?: string;
    title: string;
    field_type: string;
    options?: string[];
    value?: any;
  };
  allCustomFields?: Array<{
    _id?: string;
    title: string;
    field_type: string;
    value?: any;
    options?: string[];
  }>;
  onBack?: () => void;
}

const FIELD_TYPES: { value: CustomFieldType; label: string; icon: string | React.ReactNode }[] = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'textarea', label: 'Text Area', icon: '📄' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'select', label: 'Select', icon: '📋' },
  { value: 'checkbox', label: 'Checkbox', icon: '☑️' },
  { value: 'todo', label: 'Todo', icon: <CheckSquare2 className="h-4 w-4" /> },
  // { value: 'member', label: 'Member', icon: '👤' }, // Commented out for now
  { value: 'label', label: 'Label', icon: '🏷️' },
];

interface FormData {
  fieldName: string;
  fieldType: CustomFieldType;
  options: Array<{ value: string }>;
  defaultValue: string;
  required: boolean;
  newOption: string;
}

export const CreateCustomFieldDropdown: React.FC<CreateCustomFieldDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  taskId,
  editingField,
  allCustomFields = [],
  onBack,
}) => {
  const { mutate: updateTask } = useUpdateTask();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      fieldName: editingField?.title || '',
      fieldType: (editingField?.field_type as CustomFieldType) || 'text',
      options: editingField?.options?.map((opt) => ({ value: opt })) || [],
      defaultValue: editingField?.value || '',
      required: false,
      newOption: '',
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'options',
  });

  const fieldType = watch('fieldType');
  const fieldName = watch('fieldName');
  const options = watch('options');
  const defaultValue = watch('defaultValue');
  const newOption = watch('newOption');

  useEffect(() => {
    if (editingField) {
      reset({
        fieldName: editingField.title,
        fieldType: (editingField.field_type as CustomFieldType) || 'text',
        options: editingField.options?.map((opt) => ({ value: opt })) || [],
        defaultValue: editingField.value || '',
        required: false,
        newOption: '',
      });
    } else {
      reset({
        fieldName: '',
        fieldType: 'text',
        options: [],
        defaultValue: '',
        required: false,
        newOption: '',
      });
    }
  }, [editingField, isOpen, reset]);

  const handleAddOption = () => {
    const trimmedOption = newOption.trim();
    if (trimmedOption && !options.some((opt) => opt.value === trimmedOption)) {
      append({ value: trimmedOption });
      setValue('newOption', '');
    }
  };

  const handleRemoveOption = (index: number) => {
    remove(index);
  };

  const onSubmit = (data: FormData) => {
    if (!data.fieldName.trim() || (data.fieldType === 'select' && data.options.length === 0)) return;

    const optionsArray = data.options.map((opt) => opt.value);

    if (editingField?._id) {
      // Update existing field - include _id
      const updatedField: any = {
        _id: editingField._id,
        title: data.fieldName.trim(),
        field_type: data.fieldType,
      };

      if (data.fieldType === 'select') {
        updatedField.options = optionsArray;
      } else if (data.defaultValue !== '') {
        updatedField.value = data.defaultValue;
      }

      updateTask({
        id: taskId,
        data: { custom_fields: [updatedField] },
      });
    } else {
      // Create new field
      const newField: any = {
        title: data.fieldName.trim(),
        field_type: data.fieldType,
      };

      if (data.fieldType === 'select') {
        newField.options = optionsArray;
      } else if (data.defaultValue !== '') {
        newField.value = data.defaultValue;
      }

      updateTask({
        id: taskId,
        data: { custom_fields: [newField] },
      });
    }

    onClose();
  };

  const showOptionsInput = fieldType === 'select';
  const showDefaultValueInput = fieldType !== 'checkbox' && fieldType !== 'member' && fieldType !== 'label';

  return (
    <SmartDropdown
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      dropdownWidth={360}
      dropdownHeight={600}
    >
      <div className="rounded-xl border border-ocean-2/50 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ocean-2/50 px-2 py-1">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button
                onClick={onBack}
                size="xs"
                variant="plain"
                icon={<ArrowLeft className="h-4 w-4" />}
              >
              </Button>
            )}
            <h3 className="text-sm font-bold text-black">
              {editingField ? 'Edit field' : 'Create field'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto px-2 py-1 space-y-4">
         

          {/* Field Type */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-black/80 uppercase tracking-widest">
              Field Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map((type) => (
                <Button
                  key={type.value}
                  size="md"
                  variant="plain"
                  icon={<span className="text-base">{type.icon}</span>}
                  onClick={() => {
                    setValue('fieldType', type.value);
                    if (type.value !== 'select') {
                      setValue('options', []);
                    }
                  }}
                  className={`group flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-all ${fieldType === type.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'border-gray-200 bg-white text-black hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-sm active:scale-95'
                    }`}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>


           {/* Field Name */}
           <div className="space-y-2">
            <label className="block text-xs font-bold text-black/80 uppercase tracking-widest">
              Field Name
            </label>
            <input
              type="text"
              {...register('fieldName', { required: true })}
              placeholder="e.g., Priority, Department, Status"
              className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-1 text-sm text-black placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            {errors.fieldName && (
              <p className="text-xs text-red-500">Field name is required</p>
            )}
          </div>

          {/* Options (for select type) */}
          {showOptionsInput && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-black/80 uppercase tracking-widest">
                Options
              </label>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      {...register(`options.${index}.value` as const)}
                      className="flex-1 rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-1 text-sm text-black focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div>
                  <input
                    type="text"
                    {...register('newOption')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                    placeholder="Add option..."
                    className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-1 text-sm text-black placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Default Value */}
          {showDefaultValueInput && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-black/80 uppercase tracking-widest">
                Default Value (Optional)
              </label>
              {fieldType === 'date' ? (
                <input
                  type="date"
                  {...register('defaultValue')}
                  className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-1 text-sm text-black focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ) : fieldType === 'number' ? (
                <input
                  type="number"
                  {...register('defaultValue', { valueAsNumber: true })}
                  className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-1 text-sm text-black focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              ) : (
                <input
                  type="text"
                  {...register('defaultValue')}
                  placeholder="Default value"
                  className="w-full rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-1 text-sm text-black placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}
            </div>
          )}

          {/* Required Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              {...register('required')}
              className="h-4 w-4 rounded border-ocean-2/50 text-indigo-500 focus:ring-indigo-500"
            />
            <label htmlFor="required" className="text-sm font-semibold text-black">
              Required field
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pb-2">
            <Button
              size="xs"
              variant="plain"
              icon={<X className="h-4 w-4" />}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="xs"
              variant="solid"
              icon={<Check className="h-4 w-4" />}
              onClick={handleSubmit(onSubmit)}
              disabled={!fieldName.trim() || (fieldType === 'select' && options.length === 0)}
            >
              {editingField ? 'Save Changes' : 'Create Field'}
            </Button>
          </div>
        </form>
      </div>
    </SmartDropdown>
  );
};
