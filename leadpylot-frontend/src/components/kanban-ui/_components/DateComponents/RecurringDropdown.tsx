import React from 'react';
import { RecurringOption } from '../../types';
import { RECURRING_OPTIONS, getRecurringLabel } from '../../_data/dates-data';
import { ChevronDown } from 'lucide-react';

interface RecurringDropdownProps {
  value: RecurringOption;
  onChange: (value: RecurringOption) => void;
  selectedDate?: Date;
  disabled?: boolean;
}

export const RecurringDropdown: React.FC<RecurringDropdownProps> = ({
  value,
  onChange,
  selectedDate,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const displayLabel = getRecurringLabel(value, selectedDate);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-2 text-sm text-black transition-all hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>{displayLabel}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-ocean-2/50 bg-white shadow-xl">
          <div className="max-h-60 overflow-y-auto p-1">
            {RECURRING_OPTIONS.map((option) => {
              const label = getRecurringLabel(option.value, selectedDate);
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    value === option.value
                      ? 'bg-indigo-50 text-indigo-600 font-semibold'
                      : 'text-black hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
