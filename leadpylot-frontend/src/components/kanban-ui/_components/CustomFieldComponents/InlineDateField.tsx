import React, { useState } from 'react';
import { CustomFieldDefinition, CustomFieldValue } from '../../types';

interface InlineDateFieldProps {
  fieldDefinition: CustomFieldDefinition;
  fieldValue: CustomFieldValue;
  onUpdate: (value: string | null) => void;
  hideLabel?: boolean;
}

export const InlineDateField: React.FC<InlineDateFieldProps> = ({
  fieldDefinition,
  fieldValue,
  onUpdate,
  hideLabel = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [dateValue, setDateValue] = useState(() => {
    if (fieldValue.value) {
      // Convert to YYYY-MM-DD format for input
      const date = new Date(fieldValue.value);
      return date.toISOString().split('T')[0];
    }
    return '';
  });

  const handleSave = () => {
    if (dateValue) {
      onUpdate(dateValue);
    } else {
      onUpdate(null);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDateValue(fieldValue.value ? new Date(fieldValue.value).toISOString().split('T')[0] : '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        {!hideLabel && (
          <span className="text-xs font-bold text-black/80 uppercase tracking-widest whitespace-nowrap">
            {fieldDefinition.title || 'Untitled'}
          </span>
        )}
        <input
          type="date"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSave();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
          className="rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-1.5 text-sm font-semibold text-black focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          autoFocus
        />
      </div>
    );
  }

  const displayValue = fieldValue.value
    ? new Date(fieldValue.value).toLocaleDateString()
    : null;

  return (
    <div className="flex items-center gap-2">
      {!hideLabel && (
        <span className="text-xs font-bold text-black/80 uppercase tracking-widest whitespace-nowrap">
          {fieldDefinition.title || 'Untitled'}
        </span>
      )}
      <div
        onClick={() => setIsEditing(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-1.5 cursor-pointer hover:bg-gray-100 transition-colors"
      >
        {displayValue ? (
          <span className="text-sm font-semibold text-black">{displayValue}</span>
        ) : (
          <span className="text-sm text-gray-500">Set date</span>
        )}
      </div>
    </div>
  );
};
