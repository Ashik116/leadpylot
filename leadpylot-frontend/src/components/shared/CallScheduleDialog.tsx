'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import DatePicker from '@/components/ui/DatePicker';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { TLead } from '@/services/LeadsService';

interface CallScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: TLead;
  onSchedule: (scheduleData: CallScheduleData) => void;
}

export interface CallScheduleData {
  leadId: string;
  scheduledDate: Date;
  scheduledTime: string;
  timezone: string;
  duration: string;
  notes?: string;
  callType: 'initial' | 'follow-up' | 'closing';
  reminderBefore: string;
  priority: 'low' | 'medium' | 'high';
}

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

const CALL_TYPE_OPTIONS = [
  { value: 'initial', label: 'Initial Call' },
  { value: 'follow-up', label: 'Follow-up Call' },
  { value: 'closing', label: 'Closing Call' },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const REMINDER_OPTIONS = [
  { value: 0, label: 'No reminder' },
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'high', label: 'High Priority' },
];

// Generate time slots for the day (9 AM to 6 PM in 30-minute intervals)
const generateTimeSlots = () => {
  const slots = [];
  const startHour = 9; // 9 AM
  const endHour = 18; // 6 PM

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = `${hour % 12 === 0 ? 12 : hour % 12}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
      slots.push({ value: time, label: displayTime });
    }
  }

  return slots;
};

const CallScheduleDialog = ({ isOpen, onClose, lead, onSchedule }: CallScheduleDialogProps) => {
  const timeSlots = generateTimeSlots();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<CallScheduleData>({
    defaultValues: {
      leadId: lead?._id?.toString() || '',
      scheduledDate: new Date(),
      scheduledTime: '10:00',
      timezone: 'America/New_York',
      duration: '',
      callType: 'initial',
      reminderBefore: '15',
      priority: 'medium',
      notes: '',
    },
  });

  const onSubmit = async (data: CallScheduleData) => {
    console.log({ data });
    try {
      await onSchedule(data);
      onClose();
      reset();
    } catch (error) {
      console.error('Error scheduling call:', error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const selectedDate = watch('scheduledDate');

  // Helper function to normalize date (remove time component)
  const normalizeDate = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized.getTime();
  };

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) =>
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();

  // Disable past dates (before today)
  const disablePastDates = (date: Date) => normalizeDate(date) < normalizeDate(new Date());

  // Custom day styling for the date picker
  const getDayClassName = (date: Date) => {
    const today = new Date();
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isToday = isSameDay(date, today);
    const isFuture = normalizeDate(date) > normalizeDate(today);

    if (isSelected) return '!bg-blue-500 !text-white hover:!bg-blue-600';
    if (isToday)
      return '!border !border-black !bg-transparent hover:!bg-gray-500 hover:!text-white';
    if (isFuture) return 'hover:!bg-gray-500 hover:!text-white';
    return '';
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} width={600}>
      <div className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <ApolloIcon name="phone" className="text-xl text-gray-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Schedule Call</h2>
            <p className="text-sm text-gray-600">Schedule a call with {lead?.contact_name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Lead Info */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <ApolloIcon name="user" className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{lead?.contact_name}</h3>
                <p className="text-sm text-gray-600">{lead?.email_from}</p>
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Date *</label>
              <DatePicker
                {...register('scheduledDate', { required: 'Date is required' })}
                className="w-full"
                onChange={(date) => setValue('scheduledDate', date || new Date())}
                value={watch('scheduledDate')}
                dayClassName={getDayClassName}
                disableDate={disablePastDates}
              />
              {errors.scheduledDate && (
                <p className="mt-1 text-sm text-red-600">{errors.scheduledDate.message}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Time *</label>
              <Select
                {...register('scheduledTime', { required: 'Time is required' })}
                className="w-full"
                value={timeSlots.find((opt) => opt.value === watch('scheduledTime')) || null}
                onChange={(option: any) => setValue('scheduledTime', option?.value || '10:00')}
                options={timeSlots as any}
              />
              {errors.scheduledTime && (
                <p className="mt-1 text-sm text-red-600">{errors.scheduledTime.message}</p>
              )}
            </div>
          </div>

          {/* Timezone and Duration */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Timezone *</label>
              <Select
                {...register('timezone', { required: 'Timezone is required' })}
                className="w-full"
                value={TIMEZONE_OPTIONS?.find((opt) => opt?.value === watch('timezone')) || null}
                onChange={(option: any) =>
                  setValue('timezone', option?.value || 'America/New_York')
                }
                options={TIMEZONE_OPTIONS as any}
              />

              {errors.timezone && (
                <p className="mt-1 text-sm text-red-600">{errors.timezone.message}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Duration *</label>
              <Select
                {...register('duration', { required: 'Duration is required' })}
                className="w-full"
                value={
                  DURATION_OPTIONS?.find((opt) => String(opt?.value) === watch('duration')) || null
                }
                onChange={(option: any) =>
                  setValue('duration', option?.value ? String(option?.value) : '')
                }
                options={DURATION_OPTIONS as any}
              />
              {errors.duration && (
                <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
              )}
            </div>
          </div>

          {/* Call Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Call Type *</label>
            <Select
              {...register('callType', { required: 'Call type is required' })}
              className="w-full"
              value={CALL_TYPE_OPTIONS?.find((opt) => opt?.value === watch('callType')) || null}
              onChange={(option: any) => setValue('callType', option?.value || 'initial')}
              options={CALL_TYPE_OPTIONS as any}
            />
            {errors.callType && (
              <p className="mt-1 text-sm text-red-600">{errors.callType.message}</p>
            )}
          </div>

          {/* Priority and Reminder */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Priority</label>
              <Select
                {...register('priority')}
                className="w-full"
                value={
                  PRIORITY_OPTIONS?.find((opt) => opt?.value === watch('priority')) ||
                  PRIORITY_OPTIONS?.find((opt) => opt?.value === 'medium') ||
                  null
                }
                onChange={(option: any) => setValue('priority', option?.value || 'medium')}
                options={PRIORITY_OPTIONS as any}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Reminder</label>
              <Select
                {...register('reminderBefore')}
                className="w-full"
                value={
                  REMINDER_OPTIONS?.find((opt) => String(opt?.value) === watch('reminderBefore')) ||
                  REMINDER_OPTIONS?.find((opt) => opt?.value === 15) ||
                  null
                }
                onChange={(option: any) =>
                  setValue('reminderBefore', option?.value ? String(option?.value) : '15')
                }
                options={REMINDER_OPTIONS as any}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              {...register('notes')}
              className="w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Add any notes or talking points..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="plain" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              disabled={isSubmitting}
              icon={
                isSubmitting ? <ApolloIcon name="loading" className="animate-spin" /> : undefined
              }
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Call'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default CallScheduleDialog;
