import React from 'react';
import { LABEL_COLOR_PALETTE } from '../../_data/labels-data';

interface LabelColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

export const LabelColorPicker: React.FC<LabelColorPickerProps> = ({
  selectedColor,
  onColorSelect,
}) => {
  return (
    <div className="space-y-2">
      <div className="text-xs font-bold text-black/80 uppercase tracking-widest mb-3">
        Select a color
      </div>
      <div className="grid grid-cols-6 gap-2">
        {LABEL_COLOR_PALETTE.map((color) => (
          <button
            key={color}
            onClick={(e) => {
              e.stopPropagation();
              onColorSelect(color);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className={`h-8 w-8 rounded-md transition-all hover:scale-110 active:scale-95 ${
              selectedColor === color
                ? 'ring-2 ring-indigo-500 ring-offset-2'
                : 'hover:ring-2 hover:ring-gray-300'
            }`}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>
    </div>
  );
};
