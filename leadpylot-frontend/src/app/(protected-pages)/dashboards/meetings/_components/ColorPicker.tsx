'use client';

import { useState } from 'react';
import classNames from '@/utils/classNames';

interface ColorPickerProps {
  selectedColor: string;
  onSelectColor: (colorId: string) => void;
}

const COLORS = [
  { id: 'red', label: 'Red', dotClass: 'bg-red-500' },
  { id: 'orange', label: 'Orange', dotClass: 'bg-orange-500' },
  { id: 'yellow', label: 'Yellow', dotClass: 'bg-yellow-500' },
  { id: 'green', label: 'Green', dotClass: 'bg-green-500' },
  { id: 'blue', label: 'Blue', dotClass: 'bg-blue-500' },
  { id: 'purple', label: 'Purple', dotClass: 'bg-purple-500' },
];

const ColorPicker = ({ selectedColor, onSelectColor }: ColorPickerProps) => {
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);

  const handleColorSelect = (colorId: string) => {
    onSelectColor(colorId);
    setIsColorDropdownOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
        className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-2 text-left text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <span
            className={classNames(
              'h-3 w-3 rounded-full',
              COLORS.find((c) => c.id === selectedColor)?.dotClass || 'bg-red-500'
            )}
          ></span>
          <span className="capitalize">{selectedColor}</span>
        </div>
        <svg
          className={classNames(
            'h-5 w-5 transform transition-transform',
            isColorDropdownOpen ? 'rotate-180' : ''
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isColorDropdownOpen && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-gray-100"
              onClick={() => handleColorSelect(color.id)}
            >
              <div className="flex items-center gap-2">
                <span className={classNames('h-3 w-3 rounded-full', color.dotClass)}></span>
                <span>{color.label}</span>
              </div>
              {selectedColor === color.id && (
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
