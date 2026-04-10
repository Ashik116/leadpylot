import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ReminderOption } from '../../types';
import { REMINDER_OPTIONS } from '../../_data/dates-data';
import { ChevronDown } from 'lucide-react';

interface ReminderDropdownProps {
  value: ReminderOption;
  onChange: (value: ReminderOption) => void;
  disabled?: boolean;
}

export const ReminderDropdown: React.FC<ReminderDropdownProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate position when dropdown opens and update on scroll/resize
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    };

    updatePosition();

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
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

  const selectedOption = REMINDER_OPTIONS.find((opt) => opt.value === value);

  return (
    <>
      <div className="relative">
        <button
          ref={triggerRef}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="flex w-full items-center justify-between rounded-lg border border-ocean-2/50 bg-gray-50 px-3 py-2 text-sm text-black transition-all hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{selectedOption?.label || 'None'}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen &&
        position &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] rounded-lg border border-ocean-2/50 bg-white shadow-xl"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
            }}
          >
            <div className="max-h-60 overflow-y-auto p-1">
              {REMINDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${value === option.value
                    ? 'bg-indigo-50 text-indigo-600 font-semibold'
                    : 'text-black hover:bg-gray-50'
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
