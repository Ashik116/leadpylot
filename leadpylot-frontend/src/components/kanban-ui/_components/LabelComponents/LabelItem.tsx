import React from 'react';
import { Label } from '../../types';
import { Check, Pencil } from 'lucide-react';

interface LabelItemProps {
  label: Label;
  isSelected: boolean;
  onToggle: () => void;
  onEdit?: () => void;
}

export const LabelItem: React.FC<LabelItemProps> = ({
  label,
  isSelected,
  onToggle,
  onEdit,
}) => {
  return (
    <div
      className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50 cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Checkbox */}
      <div
        className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${isSelected
          ? 'border-indigo-500 bg-indigo-500'
          : 'border-gray-300 bg-white hover:border-indigo-300'
          }`}
      >
        {isSelected && <Check className="h-3 w-3 text-white" />}
      </div>

      {/* Color Swatch */}
      <div
        className="h-6 w-6 rounded-md shadow-sm"
        style={{ backgroundColor: label.color }}
      />

      {/* Label Name */}
      <span className="flex-1 text-sm font-medium text-black truncate" title={label?.title || label.name}>{label?.title || label.name}</span>

      {/* Edit Icon */}
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="opacity-0 transition-opacity group-hover:opacity-100 p-1 rounded hover:bg-gray-100"
        >
          <Pencil className="h-4 w-4 text-gray-500" />
        </button>
      )}
    </div>
  );
};
