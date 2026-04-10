'use client';

import * as React from 'react';
import Input from '@/components/ui/Input';
import ScrollBar from '@/components/ui/ScrollBar';
import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from '@/utils/classNames';

export type TimePrecision = 'hour' | 'hourMinute' | 'hourMinuteSecond';
export type TimeDisplayFormat = 'HH' | 'HH:MM' | 'HH:MM:SS' | 'HH:00:00' | string; // Custom format string

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  format?: '12' | '24';
  precision?: TimePrecision; // Control which parts to show: hour only, hour+minute, or all
  displayFormat?: TimeDisplayFormat; // Custom display format: 'HH', 'HH:MM', 'HH:MM:SS', 'HH:00:00', etc.
  /** When true, closes the dropdown popup after selecting a complete time (like date picker behavior). Default: false. */
  closeOnSelect?: boolean;
}

interface TimeParts {
  hour: string;
  minute: string;
  second: string;
  period?: 'AM' | 'PM';
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  disabled,
  format = '12',
  precision = 'hourMinute',
  displayFormat, // Optional custom display format
  closeOnSelect = false,
}: TimePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedParts, setSelectedParts] = React.useState<TimeParts>({
    hour: '',
    minute: '',
    second: '',
    period: format === '12' ? 'AM' : undefined,
  });
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Utility functions
  const parseTimeValue = React.useCallback(
    (timeStr: string): TimeParts => {
      const parts: TimeParts = { hour: '', minute: '', second: '' };
      if (!timeStr) return parts;

      const segments = timeStr.split(':');
      const hour24 = segments[0] || '';

      // For hour-only precision with 24-hour format, convert 0-23 to 1-24 for display
      // BUT: If displayFormat is set, the value is already in display format (1-24), so don't convert
      if (precision === 'hour' && format === '24' && hour24 && !displayFormat) {
        const hourNum = parseInt(hour24, 10);
        if (!isNaN(hourNum)) {
          // Convert 0-23 to 1-24 (0->1, 1->2, ..., 23->24)
          const displayHour = hourNum + 1;
          parts.hour = String(displayHour).padStart(2, '0');
        }
      } else {
        parts.hour = hour24;
      }

      parts.minute = segments[1] || '';
      parts.second = segments[2] || '';

      if (format === '12' && parts.hour) {
        const hours24Num = parseInt(parts.hour, 10);
        if (!isNaN(hours24Num)) {
          // Handle 1-24 range conversion for 12-hour format hour-only
          if (precision === 'hour' && format === '12') {
            // For hour-only 12-hour, parse from 24-hour format value
            const originalHour24 = parseInt(hour24, 10);
            if (!isNaN(originalHour24)) {
              parts.period = originalHour24 >= 12 ? 'PM' : 'AM';
              const hours12 = originalHour24 % 12 || 12;
              parts.hour = String(hours12).padStart(2, '0');
            }
          } else {
            parts.period = hours24Num >= 12 ? 'PM' : 'AM';
            const hours12 = hours24Num % 12 || 12;
            parts.hour = String(hours12).padStart(2, '0');
          }
        }
      }

      return parts;
    },
    [format, precision, displayFormat]
  );

  // Format time value for onChange (storage format) based on displayFormat
  const formatTimeValue = (parts: TimeParts): string => {
    let hour24 = parts.hour;

    if (format === '12' && parts.period) {
      hour24 = convert12HourTo24Hour(parts.hour, parts.period);
    }

    const minute24 = parts.minute || '00';
    const second24 = parts.second || '00';

    // If displayFormat is set, format according to it using display values
    if (displayFormat && format === '24') {
      // For displayFormat, use the display hour (1-24) not the storage hour (0-23)
      const displayHour = hour24;

      // For hour-only precision with 24-hour format, the display hour is already 1-24
      // For other cases, hour24 is 0-23, so we keep it as is for displayFormat
      // (displayFormat is typically used for hourMinute or hourMinuteSecond, not hour-only)

      let formatted = displayFormat;

      // Replace HH with hour (2-digit, padded)
      formatted = formatted.replace(/HH/g, displayHour.padStart(2, '0'));

      // Replace MM with minute (2-digit, padded)
      formatted = formatted.replace(/MM/g, minute24);

      // Replace SS with second (2-digit, padded)
      formatted = formatted.replace(/SS/g, second24);

      // Replace mm with minute (lowercase, 2-digit, padded)
      formatted = formatted.replace(/mm/g, minute24);

      // Replace ss with second (lowercase, 2-digit, padded)
      formatted = formatted.replace(/ss/g, second24);

      // Replace hh with hour (lowercase, unpadded)
      formatted = formatted.replace(/hh/g, String(parseInt(displayHour, 10) || 0));

      // Replace single h, m, s (unpadded)
      formatted = formatted.replace(
        /(?<![HhMmSs])h(?![HhMmSs])/g,
        String(parseInt(displayHour, 10) || 0)
      );
      formatted = formatted.replace(
        /(?<![HhMmSs])m(?![HhMmSs])/g,
        String(parseInt(minute24, 10) || 0)
      );
      formatted = formatted.replace(
        /(?<![HhMmSs])s(?![HhMmSs])/g,
        String(parseInt(second24, 10) || 0)
      );

      // Remove any remaining placeholders or AM/PM (for storage)
      formatted = formatted.replace(/\s*(AM|PM)/gi, '').trim();

      return formatted;
    }

    // Default behavior: format based on precision
    // For hour-only precision with 24-hour format, convert 1-24 to 0-23 for storage
    if (precision === 'hour' && format === '24') {
      const hourNum = parseInt(hour24, 10);
      // Convert 1-24 to 0-23 (1->0, 2->1, ..., 23->22, 24->23)
      const storageHour = hourNum === 24 ? '23' : String(hourNum - 1).padStart(2, '0');
      return `${storageHour}:00:00`;
    }

    if (precision === 'hour') {
      return `${hour24}:00:00`;
    }

    const segments = [hour24];

    if (precision === 'hourMinute' || precision === 'hourMinuteSecond') {
      segments.push(minute24);
    }

    if (precision === 'hourMinuteSecond') {
      segments.push(second24);
    }

    return segments.join(':');
  };

  const convert12HourTo24Hour = (hour12: string, period: 'AM' | 'PM'): string => {
    let hours24 = parseInt(hour12, 10);
    if (period === 'PM' && hours24 !== 12) {
      hours24 += 12;
    } else if (period === 'AM' && hours24 === 12) {
      hours24 = 0;
    }
    return String(hours24).padStart(2, '0');
  };

  // Format time according to displayFormat pattern
  const formatTimeDisplay = React.useCallback(
    (hour: string, minute: string, second: string, period?: string): string => {
      if (!displayFormat) {
        // Default behavior based on precision
        if (precision === 'hour') {
          return format === '24' ? `${hour}:00:00` : `${hour} ${period || ''}`.trim();
        }
        if (precision === 'hourMinute') {
          return format === '24' ? `${hour}:${minute}` : `${hour}:${minute} ${period || ''}`.trim();
        }
        return format === '24'
          ? `${hour}:${minute}:${second}`
          : `${hour}:${minute}:${second} ${period || ''}`.trim();
      }

      // Replace format placeholders in order (most specific first)
      let formatted = displayFormat;

      // Replace HH with hour (2-digit, padded)
      formatted = formatted.replace(/HH/g, hour);

      // Replace MM with minute (2-digit, padded)
      formatted = formatted.replace(/MM/g, minute || '00');

      // Replace SS with second (2-digit, padded)
      formatted = formatted.replace(/SS/g, second || '00');

      // Replace mm with minute (lowercase, 2-digit, padded)
      formatted = formatted.replace(/mm/g, minute || '00');

      // Replace ss with second (lowercase, 2-digit, padded)
      formatted = formatted.replace(/ss/g, second || '00');

      // Replace hh with hour (lowercase, unpadded)
      formatted = formatted.replace(/hh/g, String(parseInt(hour, 10) || 0));

      // Replace single h, m, s (unpadded) - use word boundary to avoid replacing in other strings
      // Process in reverse order to avoid conflicts
      formatted = formatted.replace(/(?<![HhMmSs])h(?![HhMmSs])/g, String(parseInt(hour, 10) || 0));
      formatted = formatted.replace(
        /(?<![HhMmSs])m(?![HhMmSs])/g,
        String(parseInt(minute, 10) || 0)
      );
      formatted = formatted.replace(
        /(?<![HhMmSs])s(?![HhMmSs])/g,
        String(parseInt(second, 10) || 0)
      );

      // Add period if format is 12-hour and period is provided
      if (format === '12' && period && !formatted.includes(period)) {
        // Check if format already has a space, if not add one before period
        formatted = formatted.trim() + ` ${period}`;
      }

      return formatted;
    },
    [displayFormat, precision, format]
  );

  const convertTo12HourDisplay = React.useCallback(
    (time24: string): string => {
      if (!time24) return '';
      const [hours24, minutes, seconds] = time24.split(':').map(Number);
      const period = hours24 >= 12 ? 'PM' : 'AM';
      const hours12 = hours24 % 12 || 12;

      const hourStr = String(hours12).padStart(2, '0');
      const minuteStr = String(minutes || 0).padStart(2, '0');
      const secondStr = String(seconds || 0).padStart(2, '0');

      return formatTimeDisplay(hourStr, minuteStr, secondStr, period);
    },
    [formatTimeDisplay]
  );

  const convertTo24HourDisplay = React.useCallback(
    (time24: string): string => {
      if (!time24) return '';
      const segments = time24.split(':');
      const hour24 = segments[0] || '00';
      const minute24 = segments[1] || '00';
      const second24 = segments[2] || '00';

      // For hour-only precision with 24-hour format, convert 0-23 back to 1-24 for display
      // BUT: If displayFormat is set, the value is already in display format (1-24), so don't convert
      if (precision === 'hour' && format === '24' && !displayFormat) {
        const hourNum = parseInt(hour24, 10);
        if (!isNaN(hourNum)) {
          // Convert 0-23 to 1-24 (0->1, 1->2, ..., 23->24)
          const displayHour = hourNum + 1;
          const hourStr = String(displayHour).padStart(2, '0');
          return formatTimeDisplay(hourStr, '00', '00');
        }
        return formatTimeDisplay(hour24, '00', '00');
      }

      // For hour-only precision, use formatTimeDisplay
      if (precision === 'hour') {
        return formatTimeDisplay(hour24, '00', '00');
      }

      return formatTimeDisplay(hour24, minute24, second24);
    },
    [precision, format, formatTimeDisplay, displayFormat]
  );

  // Get current hour for default initialization
  const getCurrentHour = React.useCallback((): string => {
    const now = new Date();
    const currentHour24 = now.getHours();

    if (precision === 'hour' && format === '24') {
      // For hour-only 24-hour format, use 1-24 range
      // Convert 0-23 to 1-24 (0->1, 1->2, ..., 23->24)
      return String(currentHour24 + 1).padStart(2, '0');
    }

    if (format === '12') {
      const hours12 = currentHour24 % 12 || 12;
      return String(hours12).padStart(2, '0');
    }

    return String(currentHour24).padStart(2, '0');
  }, [format, precision]);

  const hasInitializedRef = React.useRef(false);

  // Initialize with current hour if no value and precision is 'hour'
  React.useEffect(() => {
    if (!hasInitializedRef.current && !value && precision === 'hour') {
      hasInitializedRef.current = true;
      const currentHour = getCurrentHour();
      const now = new Date();
      const currentPeriod = format === '12' ? (now.getHours() >= 12 ? 'PM' : 'AM') : undefined;

      setSelectedParts({
        hour: currentHour,
        minute: '',
        second: '',
        period: currentPeriod,
      });

      // Auto-select current hour - format as HH:00:00
      const currentHour24 = now.getHours();
      onChange(`${String(currentHour24).padStart(2, '0')}:00:00`);
    }
  }, [value, precision, format, getCurrentHour, onChange]);

  // Parse value when it changes
  React.useEffect(() => {
    if (value) {
      const parsed = parseTimeValue(value);
      setSelectedParts((prev) => ({
        ...prev,
        ...parsed,
        period: parsed.period ?? (format === '12' ? 'AM' : undefined),
      }));
    } else if (precision !== 'hour') {
      // Only reset if not hour-only precision (hour-only will auto-set current hour)
      setSelectedParts({
        hour: '',
        minute: '',
        second: '',
        period: format === '12' ? 'AM' : undefined,
      });
    }
  }, [value, format, parseTimeValue, precision]);

  // Close dropdown when clicking outside
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

  const handleReset = () => {
    onChange('');
    setSelectedParts({
      hour: '',
      minute: '',
      second: '',
      period: format === '12' ? 'AM' : undefined,
    });
  };

  const updateTimeValue = (updatedParts: Partial<TimeParts>) => {
    const newParts = { ...selectedParts, ...updatedParts };
    setSelectedParts(newParts);

    // Only update if we have the minimum required parts
    const hasMinRequired =
      precision === 'hour'
        ? newParts.hour
        : precision === 'hourMinute'
          ? newParts.hour && newParts.minute
          : newParts.hour && newParts.minute && newParts.second;

    if (hasMinRequired) {
      const formattedValue = formatTimeValue(newParts);
      onChange(formattedValue);
      if (closeOnSelect) {
        setIsOpen(false);
      }
    }
  };

  const handleHourClick = (hour: string) => {
    updateTimeValue({ hour });
  };

  const handleMinuteClick = (minute: string) => {
    updateTimeValue({ minute });
  };

  const handleSecondClick = (second: string) => {
    updateTimeValue({ second });
  };

  const handlePeriodClick = (period: 'AM' | 'PM') => {
    updateTimeValue({ period });
  };

  const displayValue = React.useMemo(() => {
    if (!value) return '';
    return format === '12' ? convertTo12HourDisplay(value) : convertTo24HourDisplay(value);
  }, [value, format, convertTo12HourDisplay, convertTo24HourDisplay]);

  // Generate options arrays
  const hours = React.useMemo(() => {
    if (format === '12') {
      // 12-hour format: 01-12
      return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    } else {
      // 24-hour format
      if (precision === 'hour') {
        // For hour-only precision, show 1-24 (not 0-23)
        return Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, '0'));
      } else {
        // For other precisions, show 0-23
        return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
      }
    }
  }, [format, precision]);

  const minutes = React.useMemo(
    () => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')),
    []
  );

  const seconds = React.useMemo(
    () => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')),
    []
  );

  const periods: ('AM' | 'PM')[] = ['AM', 'PM'];

  // Calculate grid columns based on precision and format
  const getGridCols = () => {
    let cols = 1; // Hour column
    if (precision === 'hourMinute' || precision === 'hourMinuteSecond') cols += 1; // Minute column
    if (precision === 'hourMinuteSecond') cols += 1; // Second column
    if (format === '12') cols += 1; // Period column (AM/PM)
    return cols;
  };

  const getDropdownWidth = () => {
    // Special width for hour-only grid layout
    if (precision === 'hour' && format === '24') {
      return 'w-[320px]';
    }
    const cols = getGridCols();
    if (cols === 2) return 'w-[160px]';
    if (cols === 3) return 'w-[200px]';
    if (cols === 4) return 'w-[240px]';
    return 'w-[280px]';
  };

  // Render grid layout for hour-only mode (calendar-style)
  const renderHourGrid = () => {
    const hours24 = Array.from({ length: 24 }, (_, i) => String(i + 1).padStart(2, '0'));

    return (
      <div className="flex flex-col">
        <div className="mt-2 mb-2 border-b border-gray-200 pb-1.5 text-center text-xs font-semibold tracking-wide text-black uppercase">
          Hour
        </div>
        <div className="grid grid-cols-6 gap-1.5 p-2">
          {hours24.map((hour) => (
            <button
              key={hour}
              type="button"
              onClick={() => handleHourClick(hour)}
              className={classNames(
                'flex h-10 w-10 items-center justify-center rounded-full text-center text-sm font-medium transition-all duration-150',
                selectedParts.hour === hour
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-700 hover:border-2 hover:border-gray-300 hover:bg-gray-100'
              )}
            >
              {hour}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render column component
  const renderColumn = (
    label: string,
    options: string[],
    selectedValue: string,
    onSelect: (value: string) => void,
    key: string
  ) => (
    <div key={key} className="flex flex-col">
      <div className="sticky top-0 z-10 mb-1.5 rounded-t border-b bg-white px-2 py-1.5 text-center text-xs font-semibold tracking-wide text-black uppercase">
        {label}
      </div>
      <ScrollBar className="max-h-[200px]">
        <div className="flex flex-col items-center justify-center gap-0.5 px-1">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={classNames(
                'flex h-8 w-8 items-center justify-center rounded-full text-center text-sm font-medium transition-all duration-150 hover:bg-green-600 hover:text-white',
                selectedValue === option
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-green-600 hover:text-white'
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </ScrollBar>
    </div>
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <Input
        ref={inputRef}
        type="text"
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        size="md"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={classNames('w-full cursor-pointer pr-20 text-sm', !value && 'text-gray-500')}
      />
      <div className="absolute inset-y-0 right-0 z-20 flex items-center gap-1.5 pr-3">
        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            className="rounded-full p-1.5 transition-all duration-150 hover:bg-gray-100 active:scale-95"
            title="Clear time"
          >
            <ApolloIcon name="times" className="text-sm text-gray-500" />
          </button>
        )}
        <div className="pointer-events-none">
          <ApolloIcon name="history" className="text-gray-400" />
        </div>
      </div>

      {/* Custom Time Picker Dropdown */}
      {isOpen && !disabled && (
        <div
          className={classNames(
            'absolute top-full left-0 z-50 mt-1.5 rounded-lg border border-gray-200 bg-white shadow-xl',
            getDropdownWidth()
          )}
        >
          {precision === 'hour' && format === '24' ? (
            // Calendar-style grid layout for hour-only 24-hour format
            renderHourGrid()
          ) : (
            <div
              className="grid gap-0 p-2"
              style={{ gridTemplateColumns: `repeat(${getGridCols()}, minmax(0, 1fr))` }}
            >
              {renderColumn('Hour', hours, selectedParts.hour, handleHourClick, 'hour')}

              {(precision === 'hourMinute' || precision === 'hourMinuteSecond') && (
                <>
                  {renderColumn('Min', minutes, selectedParts.minute, handleMinuteClick, 'minute')}
                </>
              )}

              {precision === 'hourMinuteSecond' && (
                <>
                  {renderColumn('Sec', seconds, selectedParts.second, handleSecondClick, 'second')}
                </>
              )}

              {format === '12' && (
                <>
                  {precision !== 'hour' && (
                    <div className="flex items-center justify-center">
                      <div className="w-2" />
                    </div>
                  )}
                  {renderColumn(
                    'Period',
                    periods,
                    selectedParts.period || 'AM',
                    (value: string) => handlePeriodClick(value as 'AM' | 'PM'),
                    'period'
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
