import React, { useState, useEffect, useRef, startTransition } from 'react';
import { SmartDropdown } from '@/components/shared/SmartDropdown';
import { CardDates } from '../../types';
import {
  DateCalendar,
  DateInput,
  TimeInput,
} from '../../_components/DateComponents';
import { ArrowLeft, Check, X } from 'lucide-react';
import dayjs from 'dayjs';
import { useUpdateTask } from '@/hooks/useTasks';
import Button from '@/components/ui/Button';

interface DatesDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  taskId: string; // Task ID to update
  dates?: CardDates;
  onSave?: (dates: CardDates) => void; // Optional callback for parent component
  onRemove?: () => void; // Optional callback for parent component
  // Optional: Stop event propagation to prevent parent click handlers (e.g., prevent modal opening)
  stopPropagation?: boolean;
}

export const DatesDropdown: React.FC<DatesDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  taskId,
  dates,
  onSave,
  onRemove,
  stopPropagation = false,
}) => {
  const { mutate: updateTask } = useUpdateTask();
  const [hasStartDate, setHasStartDate] = useState(!!dates?.startDate);
  const [hasDueDate, setHasDueDate] = useState(!!dates?.dueDate);
  const [startDate, setStartDate] = useState<Date | null>(
    dates?.startDate ? dayjs(dates.startDate).toDate() : null
  );
  const [dueDate, setDueDate] = useState<Date | null>(
    dates?.dueDate ? dayjs(dates.dueDate).toDate() : null
  );
  const [startTime, setStartTime] = useState<string>(dates?.startTime || '');
  const [dueTime, setDueTime] = useState<string>(dates?.dueTime || '18:30');
  const [reminder, setReminder] = useState<'none' | 'at-time' | '5-minutes' | '15-minutes' | '1-hour' | '2-hours' | '1-day' | '2-days' | '1-week'>(
    dates?.reminder || '1-day'
  );
  const [calendarDate, setCalendarDate] = useState<Date>(dueDate || startDate || new Date());
  const [lastSelectedType, setLastSelectedType] = useState<'start' | 'due'>('due');
  const prevDatesRef = useRef<CardDates | undefined>(dates);

  useEffect(() => {
    // Only sync when dates prop changes or dropdown opens
    if (!isOpen) return;

    const prevDates = prevDatesRef.current;
    const datesChanged =
      prevDates?.startDate !== dates?.startDate ||
      prevDates?.dueDate !== dates?.dueDate ||
      prevDates?.startTime !== dates?.startTime ||
      prevDates?.dueTime !== dates?.dueTime ||
      prevDates?.reminder !== dates?.reminder;

    if (!datesChanged && prevDates === dates) return;

    prevDatesRef.current = dates;

    if (dates) {
      // Batch state updates using startTransition to avoid cascading renders
      startTransition(() => {
        setHasStartDate(!!dates.startDate);
        setHasDueDate(!!dates.dueDate);
        setStartDate(dates.startDate ? dayjs(dates.startDate).toDate() : null);
        setDueDate(dates.dueDate ? dayjs(dates.dueDate).toDate() : null);
        setStartTime(dates.startTime || '');
        setDueTime(dates.dueTime || '18:30');
        setReminder(dates.reminder || '1-day');
        setCalendarDate(dates.dueDate ? dayjs(dates.dueDate).toDate() : dates.startDate ? dayjs(dates.startDate).toDate() : new Date());
        // Set last selected type based on which date exists
        if (dates.dueDate) {
          setLastSelectedType('due');
        } else if (dates.startDate) {
          setLastSelectedType('start');
        }
      });
    }
  }, [dates, isOpen]);

  // Set default values when opening with no existing dates
  useEffect(() => {
    if (isOpen && (!dates || !dates.dueDate)) {
      const tomorrow = dayjs().add(1, 'day').toDate();
      // Use startTransition to batch state updates and avoid cascading renders
      startTransition(() => {
        setHasDueDate(true);
        setDueDate(tomorrow);
        setDueTime('13:44');
        setCalendarDate(tomorrow);
        setLastSelectedType('due');
        // reminder keeps default '1-day' from initial state
      });
    }
  }, [isOpen, dates]);

  const handleDateSelect = (date: Date) => {
    if (hasDueDate && !hasStartDate) {
      setDueDate(date);
      setCalendarDate(date);
      setLastSelectedType('due');
    } else if (hasStartDate && !hasDueDate) {
      setStartDate(date);
      setCalendarDate(date);
      setLastSelectedType('start');
    } else if (hasDueDate && hasStartDate) {
      // When both are checked, update based on last selected type
      if (lastSelectedType === 'due') {
        // Ensure due date is not before start date
        if (startDate && dayjs(date).isBefore(dayjs(startDate), 'day')) {
          // If selected date is before start date, set it as the new start date and keep due date at least at start date
          setStartDate(date);
          // Keep due date at the new start date (minimum)
          setDueDate(date);
        } else {
          setDueDate(date);
        }
      } else {
        // Ensure start date is not after due date
        if (dueDate && dayjs(date).isAfter(dayjs(dueDate), 'day')) {
          // If selected date is after due date, set it as the new due date and keep start date at the new due date (minimum)
          setDueDate(date);
          setStartDate(date);
        } else {
          setStartDate(date);
        }
      }
      setCalendarDate(date);
    } else {
      setStartDate(date);
      setCalendarDate(date);
      setLastSelectedType('start');
    }
  };

  const handleSave = () => {
    const datesToSave: CardDates = {};

    if (hasStartDate && startDate) {
      datesToSave.startDate = dayjs(startDate).format('YYYY-MM-DD');
      if (startTime) {
        datesToSave.startTime = startTime;
      }
    }

    if (hasDueDate && dueDate) {
      // Format dueDate as ISO string with time (e.g., "2024-12-31T23:59:59Z")
      // Combine date and time, default to end of day (23:59:59) if no time specified
      let dateTime = dayjs(dueDate);

      if (dueTime) {
        // Parse time string (format: "HH:mm" or "H:mm" - 24-hour format)
        const timeParts = dueTime.match(/^(\d{1,2}):(\d{2})$/);
        if (timeParts) {
          const hours = parseInt(timeParts[1], 10);
          const minutes = parseInt(timeParts[2], 10);

          // Validate hours (0-23) and minutes (0-59)
          if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            dateTime = dateTime.hour(hours).minute(minutes).second(59).millisecond(0);
          } else {
            // Invalid time, default to end of day
            dateTime = dateTime.hour(23).minute(59).second(59).millisecond(0);
          }
        } else {
          // If time format is not recognized, default to end of day
          dateTime = dateTime.hour(23).minute(59).second(59).millisecond(0);
        }
      } else {
        // No time specified, default to end of day
        dateTime = dateTime.hour(23).minute(59).second(59).millisecond(0);
      }

      // Format as ISO string with Z timezone (UTC)
      datesToSave.dueDate = dateTime.utc().toISOString();

      if (dueTime) {
        datesToSave.dueTime = dueTime;
      }
      datesToSave.reminder = reminder;
    }

    // Prefer parent callback to avoid double updates
    if (onSave) {
      onSave(datesToSave);
    } else {
      // Fallback: update task directly if no callback provided
      updateTask({
        id: taskId,
        data: { dueDate: datesToSave.dueDate || null },
      });
    }

    onClose();
  };

  const handleRemove = () => {
    // Reset all date states
    setHasStartDate(false);
    setHasDueDate(false);
    setStartDate(null);
    setDueDate(null);
    setStartTime('');
    setDueTime('18:30');
    setReminder('1-day');
    setCalendarDate(new Date());

    // Prefer parent callback to avoid double updates
    if (onRemove) {
      onRemove();
    } else {
      // Fallback: update task directly if no callback provided
      updateTask({
        id: taskId,
        data: { dueDate: null },
      });
    }

    onClose();
  };

  return (
    <SmartDropdown
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      dropdownWidth={300}
      dropdownHeight={420}
      hideArrow={false}
    >
      <div 
        className="rounded-xl border border-ocean-2/50 bg-white shadow-xl"
        onClick={stopPropagation ? (e) => {
          e.stopPropagation();
          e.preventDefault();
        } : undefined}
        onMouseDown={stopPropagation ? (e) => {
          e.stopPropagation();
          e.preventDefault();
        } : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ocean-2/50 px-2 py-0.5">
          <div className="flex items-center gap-2">
            <Button
              onClick={(e) => {
                if (stopPropagation) {
                  e.stopPropagation();
                  e.preventDefault();
                }
                onClose();
              }}
              onMouseDown={stopPropagation ? (e) => {
                e.stopPropagation();
                e.preventDefault();
              } : undefined}
              className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
              size="xs"
              variant="plain"
              icon={<ArrowLeft className="h-4 w-4" />}
            >
            </Button>
            <h3 className="text-xs font-bold text-black">Dates</h3>
          </div>
          <Button
            onClick={(e) => {
              if (stopPropagation) {
                e.stopPropagation();
                e.preventDefault();
              }
              onClose();
            }}
            onMouseDown={stopPropagation ? (e) => {
              e.stopPropagation();
              e.preventDefault();
            } : undefined}
            className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
            size="xs"
            variant="plain"
            icon={<X className="h-4 w-4" />}
          >
          </Button>
        </div>

        <div className="p-2.5 space-y-3 overflow-y-auto">
          {/* Calendar */}
          <DateCalendar
            startDate={hasStartDate && startDate ? startDate : undefined}
            dueDate={hasDueDate && dueDate ? dueDate : undefined}
            onDateSelect={handleDateSelect}
            currentMonth={calendarDate}
            onMonthChange={setCalendarDate}
          />

          {/* Start Date Section */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-black/70 uppercase tracking-wider">
              Start date
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={hasStartDate}
                onChange={(e) => {
                  setHasStartDate(e.target.checked);
                  if (e.target.checked) {
                    // Set default date if none exists
                    if (!startDate) {
                      const defaultDate = dueDate || dayjs().add(1, 'day').toDate();
                      setStartDate(defaultDate);
                      setCalendarDate(defaultDate);
                    }
                    setLastSelectedType('start');
                  } else {
                    setStartDate(null);
                    setStartTime('');
                  }
                }}
                className="h-4 w-4 rounded border-ocean-2/50 text-indigo-500 focus:ring-indigo-500"
              />
              <DateInput
                value={startDate || undefined}
                onChange={(date) => {
                  if (date) {
                    // Ensure start date is not after due date
                    if (hasDueDate && dueDate && dayjs(date).isAfter(dayjs(dueDate), 'day')) {
                      // If start date is after due date, adjust due date to be same or after start date
                      setDueDate(date);
                    }
                    setStartDate(date);
                    setCalendarDate(date);
                    setLastSelectedType('start');
                  } else {
                    setStartDate(null);
                  }
                }}
                disabled={!hasStartDate}
                placeholder="M/D/YYYY"
              />
            </div>
          </div>

          {/* Due Date Section */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-black/70 uppercase tracking-wider">
              Due date
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={hasDueDate}
                onChange={(e) => {
                  setHasDueDate(e.target.checked);
                  if (e.target.checked) {
                    // Set default date if none exists
                    if (!dueDate) {
                      const defaultDate = startDate || dayjs().add(1, 'day').toDate();
                      setDueDate(defaultDate);
                      setCalendarDate(defaultDate);
                    }
                    setLastSelectedType('due');
                  } else {
                    setDueDate(null);
                    setDueTime('18:30');
                    setReminder('1-day');
                  }
                }}
                className="h-4 w-4 rounded border-ocean-2/50 text-indigo-500 focus:ring-indigo-500"
              />
              <DateInput
                value={dueDate || undefined}
                onChange={(date) => {
                  if (date) {
                    // Ensure due date is not before start date
                    if (hasStartDate && startDate && dayjs(date).isBefore(dayjs(startDate), 'day')) {
                      // If due date is before start date, adjust start date to be same or before due date
                      setStartDate(date);
                    }
                    setDueDate(date);
                    setCalendarDate(date);
                    setLastSelectedType('due');
                  } else {
                    setDueDate(null);
                  }
                }}
                disabled={!hasDueDate}
                placeholder="M/D/YYYY"
              />
              {hasDueDate && (
                <TimeInput
                  value={dueTime}
                  onChange={setDueTime}
                  disabled={!hasDueDate || !dueDate}
                  placeholder="6:30 PM"
                />
              )}
            </div>
          </div>

          {/* Reminder Section */}
          {/* {hasDueDate && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-black/80 uppercase tracking-widest">
                Set due date reminder
              </label>
              <ReminderDropdown
                value={reminder}
                onChange={setReminder}
                disabled={!hasDueDate || !dueDate}
              />
              <p className="text-xs text-black/60">
                Reminders will be sent to all members and watchers of this card.
              </p>
            </div>
          )} */}

          {/* Action Buttons */}
          <div className="flex flex-row gap-1.5 justify-between">

            <Button
              onClick={(e) => {
                if (stopPropagation) {
                  e.stopPropagation();
                  e.preventDefault();
                }
                handleRemove();
              }}
              onMouseDown={stopPropagation ? (e) => {
                e.stopPropagation();
                e.preventDefault();
              } : undefined}
              size="xs"
              variant="default"
              icon={<X className="h-4 w-4" />}
            >
              Remove
            </Button>
            <Button
              onClick={(e) => {
                if (stopPropagation) {
                  e.stopPropagation();
                  e.preventDefault();
                }
                handleSave();
              }}
              onMouseDown={stopPropagation ? (e) => {
                e.stopPropagation();
                e.preventDefault();
              } : undefined}
              disabled={!hasStartDate && !hasDueDate}
              size="xs"
              variant="solid"
              icon={<Check className="h-4 w-4" />}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </SmartDropdown>
  );
};
