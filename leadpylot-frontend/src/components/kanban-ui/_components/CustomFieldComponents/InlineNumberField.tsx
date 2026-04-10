import React, { useState, useMemo, useCallback } from 'react';
import { useUpdateTask } from '@/hooks/useTasks';
import { Pencil } from 'lucide-react';

interface InlineNumberFieldProps {
  taskId: string;
  field: {
    _id?: string;
    title: string;
    value: any;
    field_type: string;
  };
  field_type: string;
  hideLabel?: boolean;
  showEditButton?: boolean;
  onEditClick?: () => void;
}

export const InlineNumberField: React.FC<InlineNumberFieldProps> = ({
  taskId,
  field,
  field_type,
  hideLabel = false,
  showEditButton = false,
  onEditClick,
}) => {
  const { mutate: updateTask } = useUpdateTask();
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState<string | number>('');

  // Derive the current value - use editingValue when editing, otherwise use field.value
  const numberValue = useMemo(() => {
    return isEditing ? editingValue : (field.value || '');
  }, [isEditing, editingValue, field.value]);

  const handleUpdate = useCallback((newValue: number | string | null | undefined) => {
    if (!field._id) return;

    updateTask({
      id: taskId,
      data: {
        custom_fields: [{
          _id: field._id,
          value: newValue,
        }],
      },
    });
  }, [taskId, field._id, updateTask]);

  const handleSave = () => {
    const isText = field_type === 'text' || field.field_type === 'text';

    if (numberValue === null || numberValue === undefined || numberValue === '') {
      handleUpdate('');
      setIsEditing(false);
      setEditingValue('');
      return;
    }

    if (isText) {
      handleUpdate(String(numberValue));
      setIsEditing(false);
      setEditingValue('');
      return;
    }

    const value =
      typeof numberValue === 'number'
        ? numberValue
        : Number(numberValue);

    if (Number.isFinite(value)) {
      handleUpdate(value);
    } else {
      setEditingValue(field.value || '');
    }

    setIsEditing(false);
    setEditingValue('');
  };

  const handleCancel = () => {
    setEditingValue('');
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditingValue(field.value || '');
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <div className="gap-2">
        {!hideLabel && (
        <p className="text-xs font-bold text-black/80 uppercase tracking-widest whitespace-nowrap">
          {field.title}
        </p>
        )}
        <input
          type={field_type || 'text'}
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value === '' ? '' : e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSave();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              handleCancel();
            }
          }}
          className="w-24 rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-1.5  text-sm text-black focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="group relative">
      {!hideLabel && (
      <p className="text-xs font-bold text-black/80 uppercase  whitespace-nowrap">
        {field.title}
      </p>
      )}
      <div
        onClick={handleStartEdit}
        className="bg-gray-50 px-3 cursor-pointer hover:bg-gray-100 transition-colors rounded-lg"
      >
        {field.value ? <p>{field.value}</p> : <p className=" text-gray-500">empty..</p>}
      </div>
      {showEditButton && field.value && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onEditClick) {
              onEditClick();
            } else {
              handleStartEdit();
            }
          }}
          className="border-ocean-2/50 absolute top-0 right-0 flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-xs font-medium text-black opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>Edit</span>
        </button>
      )}
    </div>
  );
};
