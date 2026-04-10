import React, { useState, useEffect } from 'react';
import { SmartDropdown } from '@/components/shared/SmartDropdown';
import { Check, X } from 'lucide-react';
import {
  DateCalendar,
  DateInput,
  TimeInput,
  ReminderDropdown,
} from '../../_components/DateComponents';
import dayjs from 'dayjs';
import { ReminderOption } from '../../types';
import Button from '@/components/ui/Button';

interface ChecklistItemDueDateDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  dueDate?: string;
  dueTime?: string;
  reminder?: ReminderOption;
  onSave: (date?: string, time?: string, reminder?: ReminderOption) => void;
  onRemove: () => void;
}

export const ChecklistItemDueDateDropdown: React.FC<ChecklistItemDueDateDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  dueDate,
  dueTime,
  reminder,
  onSave,
  onRemove,
}) => {
  const [hasDueDate, setHasDueDate] = useState(!!dueDate);
  const [date, setDate] = useState<Date | null>(
    dueDate ? dayjs(dueDate).toDate() : null
  );
  const [time, setTime] = useState<string>(dueTime || '12:00 PM');
  const [selectedReminder, setSelectedReminder] = useState<ReminderOption>(
    reminder || 'none'
  );
  const [calendarDate, setCalendarDate] = useState<Date>(date || new Date());

  useEffect(() => {
    if (dueDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasDueDate(true);
      setDate(dayjs(dueDate).toDate());
      setTime(dueTime || '12:00 PM');
      setSelectedReminder(reminder || 'none');
      setCalendarDate(dayjs(dueDate).toDate());
    }
  }, [dueDate, dueTime, reminder, isOpen]);

  const handleSave = () => {
    if (hasDueDate && date) {
      const dateStr = dayjs(date).format('YYYY-MM-DD');
      onSave(dateStr, time, selectedReminder);
    } else {
      onRemove();
    }
    onClose();
  };

  const handleRemove = () => {
    setHasDueDate(false);
    setDate(null);
    setTime('12:00 PM');
    setSelectedReminder('none');
    onRemove();
    onClose();
  };

  return (
    <SmartDropdown
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      dropdownWidth={300}
      dropdownHeight={420}
    >
      <div className="rounded-xl border border-ocean-2/50 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ocean-2/50 px-2 py-0.5">
          <h3 className="text-xs font-bold text-black">Change due date</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-2.5 space-y-3 max-h-[360px] overflow-y-auto">
          {/* Calendar */}
          <DateCalendar
            dueDate={hasDueDate && date ? date : undefined}
            onDateSelect={(selectedDate) => {
              setDate(selectedDate);
              setCalendarDate(selectedDate);
              setHasDueDate(true);
            }}
            currentMonth={calendarDate}
            onMonthChange={setCalendarDate}
          />

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
                  if (!e.target.checked) {
                    setDate(null);
                    setTime('12:00 PM');
                    setSelectedReminder('none');
                  }
                }}
                className="h-4 w-4 rounded border-ocean-2/50 text-indigo-500 focus:ring-indigo-500"
              />
              <DateInput
                value={date || undefined}
                onChange={(selectedDate) => {
                  setDate(selectedDate);
                  if (selectedDate) {
                    setCalendarDate(selectedDate);
                    setHasDueDate(true);
                  }
                }}
                disabled={!hasDueDate}
                placeholder="M/D/YYYY"
              />
              {hasDueDate && (
                <TimeInput
                  value={time}
                  onChange={setTime}
                  disabled={!hasDueDate || !date}
                  placeholder="12:00 PM"
                />
              )}
            </div>
          </div>

          {/* Reminder Section */}
          {hasDueDate && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-black/70 uppercase tracking-wider">
                Set due date reminder
              </label>
              <ReminderDropdown
                value={selectedReminder}
                onChange={setSelectedReminder}
                disabled={!hasDueDate || !date}
              />
              <p className="text-[11px] text-black/60">
                Reminders will be sent to members assigned to this checklist item.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-row gap-1.5 justify-between">

            <Button
              onClick={handleRemove}
              variant="default"
              size="xs"
              icon={<X className="h-4 w-4" />}
              title="Remove"
            >
              <span>Remove</span>
            </Button>
            <Button
              onClick={handleSave}
              variant="solid"
              size="xs"
              disabled={!hasDueDate}
              icon={<Check className="h-4 w-4" />}
              title="Save"
            >
              <span>Save</span>
            </Button>
          </div>
        </div>
      </div>
    </SmartDropdown>
  );
};
