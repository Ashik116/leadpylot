'use client';

import Checkbox from '../Checkbox';
import classNames from '../utils/classNames';

export interface CheckboxOptionCardProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export default function CheckboxOptionCard({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: CheckboxOptionCardProps) {
  return (
    <label
      htmlFor={id}
      className={classNames(
        'flex cursor-pointer items-start gap-4 rounded-lg border border-gray-200 bg-gray-50/50 p-2 transition-colors opacity-70',
        !disabled && 'hover:bg-gray-50 hover:border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
    >
      <div className="flex shrink-0 pt-0.5">
        <Checkbox
          id={id}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-gray-900 opacity-70">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-gray-500">{description}</span>
        )}
      </div>
    </label>
  );
}
