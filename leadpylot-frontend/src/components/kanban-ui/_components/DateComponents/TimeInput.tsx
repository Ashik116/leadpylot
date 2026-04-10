import React, { useState, useEffect } from 'react';
import { formatTimeForDisplay, parseTimeFromDisplay } from '../../_data/dates-data';

interface TimeInputProps {
  value?: string; // 24-hour format: "18:30"
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  placeholder = '6:30 PM',
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (value) {
      setInputValue(formatTimeForDisplay(value));
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Try to parse the time
    try {
      const parsed = parseTimeFromDisplay(val);
      if (parsed) {
        onChange(parsed);
      }
    } catch {
      // Invalid time, keep input as is
    }
  };

  const handleBlur = () => {
    // Validate and format on blur
    if (inputValue) {
      try {
        const parsed = parseTimeFromDisplay(inputValue);
        if (parsed) {
          setInputValue(formatTimeForDisplay(parsed));
          onChange(parsed);
        } else {
          // Reset to last valid value
          if (value) {
            setInputValue(formatTimeForDisplay(value));
          } else {
            setInputValue('');
          }
        }
      } catch {
        // Reset to last valid value
        if (value) {
          setInputValue(formatTimeForDisplay(value));
        } else {
          setInputValue('');
        }
      }
    }
  };

  return (
    <input
      type="text"
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-md border border-ocean-2/50 bg-gray-50 px-2 py-0.5 text-xs text-black placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
};
