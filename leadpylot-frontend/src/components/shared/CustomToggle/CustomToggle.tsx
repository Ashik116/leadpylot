'use client';

import React from 'react';
import classNames from '@/utils/classNames';

export type CustomToggleProps = {
  checked: boolean;
  onChange: () => void;
  colorClass?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
};

export function CustomToggle({
  checked,
  onChange,
  colorClass = 'bg-ocean-2',
  label,
  disabled,
  className,
}: CustomToggleProps) {
  return (
    <div className={classNames('flex flex-col items-center gap-0.5', className)}>
      {label && (
        <span className="text-xxs font-semibold tracking-wider text-gray-700 uppercase">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onChange();
        }}
        className={classNames(
          'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
          disabled && 'cursor-not-allowed opacity-50',
          checked ? colorClass : 'bg-gray-200'
        )}
      >
        <span
          className={classNames(
            'pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-3' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

export default CustomToggle;

