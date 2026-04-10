'use client';

import * as React from 'react';
import Input from '@/components/ui/Input';
import Calendar from '@/components/ui/Calendar';
import Dropdown from '@/components/ui/Dropdown';
import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from '@/utils/classNames';
import './datepicker-override.css';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled,
}: DatePickerProps) {
  React.useEffect(() => {
    // Ensure floating UI portals for DatePicker have appropriate z-index
    const portals = document.querySelectorAll('[data-floating-ui-portal]');
    portals.forEach((portal) => {
      if (portal instanceof HTMLElement && portal.querySelector('.date-picker-cell')) {
        portal.style.zIndex = '50';
      }
    });
  });

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  return (
    <div style={{ zIndex: 50, position: 'relative' }}>
      <Dropdown
        placement="bottom-start"
        menuClass="!z-50 z-50"
        renderTitle={
          <div className="relative w-full">
            <Input
              type="text"
              value={value ? value.toLocaleDateString() : ''}
              placeholder={placeholder}
              disabled={disabled}
              readOnly
              size="md"
              className={classNames('w-full cursor-pointer text-sm', !value && 'text-gray-500')}
              prefix={<ApolloIcon name="calendar" />}
              suffix={
                value && !disabled ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset(e);
                    }}
                    className="flex items-center justify-center rounded-full p-1 transition-all duration-150 hover:bg-gray-100 active:scale-95"
                    title="Clear date"
                  >
                    <ApolloIcon name="times" className="text-sm text-gray-500" />
                  </button>
                ) : undefined
              }
            />
          </div>
        }
      >
        <div className="p-2" style={{ zIndex: 50 }}>
          <Calendar
            value={value}
            onChange={(date) => {
              onChange(date || undefined);
            }}
          />
        </div>
      </Dropdown>
    </div>
  );
}
