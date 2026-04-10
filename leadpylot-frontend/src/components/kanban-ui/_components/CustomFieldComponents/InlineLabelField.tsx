import React, { useState, useRef } from 'react';
import { CustomFieldDefinition, CustomFieldValue } from '../../types';
import { LabelsDropdown } from '../../_dropdowns/labels/LabelsDropdown';
import { getLabels, getLabelsByIds } from '../../_data/labels-data';

interface InlineLabelFieldProps {
  fieldDefinition: CustomFieldDefinition;
  fieldValue: CustomFieldValue;
  onUpdate: (value: string | string[]) => void;
  taskId: string;
  hideLabel?: boolean;
}

export const InlineLabelField: React.FC<InlineLabelFieldProps> = ({
  fieldDefinition,
  fieldValue,
  onUpdate,
  taskId,
  hideLabel = false,
}) => {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [labelsDropdownOpen, setLabelsDropdownOpen] = useState(false);

  const selectedLabelIds = Array.isArray(fieldValue.value)
    ? fieldValue.value
    : fieldValue.value
      ? [fieldValue.value]
      : [];
  const selectedLabels = getLabelsByIds(selectedLabelIds);

  const handleToggleLabel = (labelId: string) => {
    const newValue = selectedLabelIds.includes(labelId)
      ? selectedLabelIds.filter((id: string) => id !== labelId)
      : [...selectedLabelIds, labelId];
    const finalValue = newValue.length === 1 ? newValue[0] : newValue;
    onUpdate(finalValue);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2" ref={fieldRef}>
        {!hideLabel && (
          <span
            onClick={() => setLabelsDropdownOpen(true)}
            className="text-xs font-bold text-black/80 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:text-black transition-colors"
          >
            {fieldDefinition.title || 'Untitled'}
          </span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {selectedLabels.map((label) => (
            <span
              key={label.id}
              onClick={() => setLabelsDropdownOpen(true)}
              className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm cursor-pointer hover:opacity-80 transition-all"
              style={{ backgroundColor: label.color }}
            >
              {label.name || 'Untitled'}
            </span>
          ))}
          <span
            onClick={() => setLabelsDropdownOpen(true)}
            className="inline-flex items-center rounded-lg border border-dashed border-ocean-2/50 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
          >
            + Add
          </span>
        </div>
      </div>
      <LabelsDropdown
        isOpen={labelsDropdownOpen}
        onClose={() => setLabelsDropdownOpen(false)}
        triggerRef={fieldRef as React.RefObject<HTMLElement>}
        taskId={taskId}
        currentLabels={selectedLabelIds}
        onCreateLabel={() => { }}
        onEditLabel={() => { }}
      />
    </>
  );
};
