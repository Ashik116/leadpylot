'use client';

import React, { useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import DatePicker from '@/components/ui/DatePicker';

export interface ScheduleSendData {
  scheduled_at?: string; // ISO 8601, e.g. "2026-02-25T10:00:00.000Z"
}

/** Internal form state for date + time pickers */
interface ScheduleFormValues {
  scheduledDate?: Date;
  scheduledTime?: string;
}

const TIME_SLOTS = (() => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const h12 = hour % 12 || 12;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      slots.push({ value: time, label: `${h12}:${minute.toString().padStart(2, '0')} ${ampm}` });
    }
  }
  return slots;
})();

function getTimezoneLabel(): string {
  const offset = -new Date().getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const sign = offset >= 0 ? '+' : '-';
  return `GMT${sign}${hours}`;
}

function combineToDate(date: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h ?? 9, m ?? 0, 0, 0);
}

function formatScheduleSummary(date: Date, timeStr: string): string {
  const combined = combineToDate(date, timeStr);
  const tz = getTimezoneLabel();
  return dayjs(combined).format(`MMM D [at] h:mm A [(${tz})]`);
}

interface SchedulePreset {
  id: string;
  label: string;
  getDate: () => Date;
  getTime: () => string;
}

const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: '1h',
    label: 'In 1 hour',
    getDate: () => new Date(),
    getTime: () => {
      const d = new Date();
      d.setHours(d.getHours() + 1, 0, 0, 0);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    },
  },
  {
    id: 'tomorrow',
    label: 'Tomorrow at 9 AM',
    getDate: () => dayjs().add(1, 'day').toDate(),
    getTime: () => '09:00',
  },
  {
    id: 'monday',
    label: 'Next Monday at 9 AM',
    getDate: () => {
      const d = dayjs();
      const daysUntilMonday = ((8 - d.day()) % 7) || 7;
      return d.add(daysUntilMonday, 'day').toDate();
    },
    getTime: () => '09:00',
  },
];

interface ScheduleSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (data: ScheduleSendData) => void;
  isScheduling?: boolean;
}

export const ScheduleSendModal: React.FC<ScheduleSendModalProps> = ({
  isOpen,
  onClose,
  onSchedule,
  isScheduling = false,
}) => {
  const {
    handleSubmit,
    watch,
    setValue,
  } = useForm<ScheduleFormValues>({
    defaultValues: {
      scheduledDate: new Date(),
      scheduledTime: '09:00',
    },
  });

  const scheduledDate = watch('scheduledDate');
  const scheduledTime = watch('scheduledTime');

  const combined = useMemo(() => {
    const d = scheduledDate ?? new Date();
    const t = scheduledTime ?? '09:00';
    return combineToDate(d, t);
  }, [scheduledDate, scheduledTime]);

  const isPast = useMemo(() => combined.getTime() < Date.now(), [combined]);

  const scheduleSummary = useMemo(() => {
    const d = scheduledDate ?? new Date();
    const t = scheduledTime ?? '09:00';
    return formatScheduleSummary(d, t);
  }, [scheduledDate, scheduledTime]);

  const timezoneLabel = useMemo(() => getTimezoneLabel(), []);

  const handlePresetSelect = useCallback(
    (preset: SchedulePreset) => {
      setValue('scheduledDate', preset.getDate());
      setValue('scheduledTime', preset.getTime());
    },
    [setValue]
  );

  const onSubmit = useCallback(
    (data: ScheduleFormValues) => {
      const [h, m] = data.scheduledTime?.split(':').map(Number) ?? [9, 0];
      const d = data.scheduledDate ?? new Date();
      const combinedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
      onSchedule({ scheduled_at: combinedDate.toISOString() });
      onClose();
    },
    [onSchedule, onClose]
  );

  const selectedTimeOption = useMemo(
    () => TIME_SLOTS.find((o) => o.value === scheduledTime) ?? TIME_SLOTS[0],
    [scheduledTime]
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      onRequestClose={onClose}
      width={500}
      className="schedule-send-modal"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
        {/* Header */}
        <div className="px-2 pb-1">
          <h2
            id="schedule-send-title"
            className="text-xl font-semibold tracking-tight text-gray-900"
          >
            Schedule send
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose when this email should be sent.
          </p>
        </div>

        {/* Schedule summary - updates live */}
        <div className="mt-2 px-2">
          <p
            className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
            aria-live="polite"
          >
            This email will be sent on {scheduleSummary}
          </p>
        </div>

        {/* Quick presets */}
        <div className=" px-2">
          <p className="mb-2 text-xs font-medium text-gray-600">Quick presets</p>
          <div className="flex flex-wrap gap-2">
            {SCHEDULE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date & time inputs - visually grouped */}
        <div className="mt-2 space-y-4 rounded-lg border border-gray-200 bg-white p-4 mx-2" >
          <div>
            <label
              htmlFor="schedule-date"
              className="mb-1.5 block text-xs font-medium text-gray-600"
            >
              Date
            </label>
            <DatePicker
              id="schedule-date"
              value={scheduledDate}
              onChange={(date) => setValue('scheduledDate', date || new Date())}
              size="sm"
              className="w-full"
              minDate={new Date()}
            />
          </div>
          <div>
            <label
              htmlFor="schedule-time"
              className="mb-1.5 block text-xs font-medium text-gray-600"
            >
              Time ({timezoneLabel})
            </label>
            <Select
              id="schedule-time"
              value={selectedTimeOption}
              onChange={(opt) => setValue('scheduledTime', opt?.value ?? '09:00')}
              options={TIME_SLOTS}
              size="sm"
              className="w-full"
            />
          </div>

          {/* Inline validation - past time */}
          {isPast && (
            <p
              role="alert"
              className="flex items-center gap-1.5 text-sm text-amber-600"
            >
              <span aria-hidden>⚠</span>
              Scheduled time must be in the future.
            </p>
          )}
        </div>

        {/* Footer - separated with divider */}
        <div className=" mt-2 flex justify-end gap-2 border-t border-gray-200 px-5 pt-2">
          <Button
            type="button"
            variant="plain"
            size="sm"
            onClick={onClose}
            className="text-gray-600"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="solid"
            size="sm"
            loading={isScheduling}
            disabled={isPast}
          >
            Schedule Send
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
