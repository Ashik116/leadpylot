'use client';

/**
 * NotificationSearch Component
 *
 * Compact search input for filtering notifications by text.
 * Features debounced search and clear button.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import classNames from '@/utils/classNames';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface NotificationSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

// ============================================
// MAIN COMPONENT
// ============================================

const NotificationSearch: React.FC<NotificationSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Debounce the onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className="relative flex-1">
      <div className="relative">
        <HiOutlineSearch className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          className={classNames(
            'w-full py-1.5 pr-7 pl-8 text-xs',
            'rounded border border-gray-200 bg-gray-50/80',
            'focus:border-gray-300 focus:bg-white focus:ring-1 focus:ring-gray-300 focus:outline-none',
            'placeholder:text-gray-400 transition-colors'
          )}
          aria-label="Search notifications"
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 transition-colors hover:bg-gray-200"
            aria-label="Clear search"
          >
            <HiOutlineX className="h-3 w-3 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationSearch;
