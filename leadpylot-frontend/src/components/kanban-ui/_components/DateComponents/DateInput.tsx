import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { formatDateForInput } from '../../_data/dates-data';

interface DateInputProps {
  value?: Date | string;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  placeholder = 'M/D/YYYY',
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (value) {
      const date = typeof value === 'string' ? dayjs(value).toDate() : value;
      setInputValue(formatDateForInput(date));
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Try to parse the date
    const parsed = dayjs(val, ['M/D/YYYY', 'M/D/YY', 'MM/DD/YYYY', 'MM/DD/YY'], true);
    if (parsed.isValid()) {
      onChange(parsed.toDate());
    } else if (val === '') {
      onChange(null);
    }
  };

  const handleBlur = () => {
    // Validate and format on blur
    if (inputValue) {
      const parsed = dayjs(inputValue, ['M/D/YYYY', 'M/D/YY', 'MM/DD/YYYY', 'MM/DD/YY'], true);
      if (parsed.isValid()) {
        setInputValue(formatDateForInput(parsed.toDate()));
        onChange(parsed.toDate());
      } else {
        // Reset to last valid value
        if (value) {
          const date = typeof value === 'string' ? dayjs(value).toDate() : value;
          setInputValue(formatDateForInput(date));
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
