import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Select from '@/components/ui/Select';
import { useUpdateTask } from '@/hooks/useTasks';

interface InlineSelectFieldProps {
  taskId: string;
  field: {
    _id?: string;
    title: string;
    value: any;
    field_type: string;
    options?: string[];
  };
  allCustomFields: Array<{
    _id?: string;
    title: string;
    value: any;
    field_type: string;
    options?: string[];
  }>;
  hideLabel?: boolean;
}

const colorCode: Record<string, string> = {
  low: '#22c55e',
  medium: '#facc15',
  high: '#f97316',
  critical: '#ef4444',
};

export const InlineSelectField: React.FC<InlineSelectFieldProps> = ({
  taskId,
  field,
  allCustomFields,
  hideLabel = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedValue, setSelectedValue] = useState(field.value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const { mutate: updateTask } = useUpdateTask();

  const options = field.options || [];

  // Transform options to Select component format
  const selectOptions = useMemo(() => {
    return options.map((option) => ({
      value: option,
      label: option,
    }));
  }, [options]);

  // Find the selected option object
  const selectedOption = useMemo(() => {
    if (!selectedValue) return null;
    return selectOptions.find((opt) => opt.value === selectedValue) || null;
  }, [selectedValue, selectOptions]);

  useEffect(() => {
    setSelectedValue(field.value || '');
  }, [field.value]);

  const handleUpdate = useCallback((newValue: string) => {
    if (!field._id) return;

    updateTask({
      id: taskId,
      data: {
        custom_fields: [{
          _id: field._id,
          value: newValue,
          isSelected: !!newValue,
        }],
      },
    });
  }, [taskId, field._id, updateTask]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (selectedValue !== field.value) {
          handleUpdate(selectedValue);
        }
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing, selectedValue, field.value, handleUpdate]);

  const handleChange = (option: { value: string; label: string } | null) => {
    const newValue = option ? option.value : '';
      setSelectedValue(newValue);
    handleUpdate(newValue);
      setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div ref={containerRef} className="items-center gap-2">
        {!hideLabel && (
          <span className="text-xs font-bold text-black/80 uppercase tracking-widest whitespace-nowrap">
            {field.title}
          </span>
        )}
        <div className="w-auto">
          <Select
            options={selectOptions}
            value={selectedOption}
            onChange={handleChange}
            placeholder="Select..."
            isClearable
            size="sm"
            className="text-sm"
            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            menuPosition="fixed"
            styles={{
              control: (base) => ({
                ...base,
                minHeight: '32px',
                fontSize: '12px',
                fontWeight: '600',
                borderColor: '#e2e8f0',
                width: 'auto',
                minWidth: selectedOption ? `${Math.max(120, (selectedOption.label.length * 8) + 60)}px` : '120px',
                '&:hover': {
                  borderColor: '#6366f1',
                },
              }),
              menuPortal: (base) => ({
                ...base,
                zIndex: 9999,
              }),
            }}
            onBlur={() => {
              if (selectedValue !== field.value) {
                handleUpdate(selectedValue);
              }
              setIsEditing(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="gap-2">
      {!hideLabel && (
        <span className="text-xs font-bold text-black/80 uppercase tracking-widest whitespace-nowrap">
          {field.title}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {selectedValue && (
          <span
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm cursor-pointer hover:opacity-80 transition-all"
            style={{
              backgroundColor: colorCode[selectedValue.toLowerCase() as keyof typeof colorCode] || '#6366f1',
            }}
          >
            {String(selectedValue)}
          </span>
        )}
        {!selectedValue && (
          <span
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center rounded-lg border border-dashed border-ocean-2/50 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            Select value
          </span>
        )}
      </div>
    </div>
  );
};
