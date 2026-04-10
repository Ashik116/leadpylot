import dayjs from 'dayjs';
import { RecurringOption, ReminderOption } from '../types';

export interface RecurringOptionItem {
  value: RecurringOption;
  label: string;
  description?: string;
}

export interface ReminderOptionItem {
  value: ReminderOption;
  label: string;
}

export const RECURRING_OPTIONS: RecurringOptionItem[] = [
  { value: 'never', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Monday to Friday' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly-day', label: 'Monthly on the 9th' }, // Will be dynamic based on selected date
  { value: 'monthly-weekday', label: 'Monthly on the 2nd Friday' }, // Will be dynamic
];

export const REMINDER_OPTIONS: ReminderOptionItem[] = [
  { value: 'none', label: 'None' },
  { value: 'at-time', label: 'At time of due date' },
  { value: '5-minutes', label: '5 Minutes before' },
  { value: '15-minutes', label: '15 Minutes before' },
  { value: '1-hour', label: '1 Hour before' },
  { value: '2-hours', label: '2 Hours before' },
  { value: '1-day', label: '1 Day before' },
  { value: '2-days', label: '2 Days before' },
  { value: '1-week', label: '1 Week before' },
];

/**
 * Format date for display: "Jan 9, 6:30 PM"
 */
export const formatDateForDisplay = (date: Date | string, time?: string): string => {
  const dateObj = typeof date === 'string' ? dayjs(date).toDate() : date;
  const formattedDate = dayjs(dateObj).format('MMM D');
  
  if (time) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${formattedDate}, ${displayHour}:${displayMinute} ${ampm}`;
  }
  
  return formattedDate;
};

/**
 * Format date for input: "M/D/YYYY"
 */
export const formatDateForInput = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? dayjs(date).toDate() : date;
  return dayjs(dateObj).format('M/D/YYYY');
};

/**
 * Format time for display: "6:30 PM"
 */
export const formatTimeForDisplay = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const minute = parseInt(minutes, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${ampm}`;
};

/**
 * Parse time from display format to 24-hour: "6:30 PM" -> "18:30"
 */
export const parseTimeFromDisplay = (timeStr: string): string => {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return '00:00';
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Calculate date status: overdue, due-today, due-soon, or null
 */
export const calculateDateStatus = (
  dueDate?: string,
  dueTime?: string
): 'overdue' | 'due-today' | 'due-soon' | null => {
  if (!dueDate) return null;

  const now = dayjs();
  const due = dueTime
    ? dayjs(`${dueDate}T${dueTime}`)
    : dayjs(dueDate).endOf('day');

  if (due.isBefore(now, 'day')) return 'overdue';
  if (due.isSame(now, 'day')) return 'due-today';
  if (due.diff(now, 'hour') <= 24) return 'due-soon';

  return null;
};

/**
 * Get status badge text and color
 */
export const getDateStatusBadge = (
  status: 'overdue' | 'due-today' | 'due-soon' | null
): { text: string; color: string } | null => {
  if (!status) return null;

  const badges = {
    overdue: { text: 'Overdue', color: 'bg-red-500' },
    'due-today': { text: 'Due today', color: 'bg-orange-500' },
    'due-soon': { text: 'Due soon', color: 'bg-yellow-500' },
  };

  return badges[status];
};

/**
 * Get recurring option label with dynamic date
 */
export const getRecurringLabel = (
  option: RecurringOption,
  date?: Date
): string => {
  if (option === 'never') return 'Never';
  if (option === 'daily') return 'Daily';
  if (option === 'weekdays') return 'Monday to Friday';
  if (option === 'weekly') return 'Weekly';

  if (date) {
    const dayOfMonth = dayjs(date).date();
    const dayOfWeek = dayjs(date).day(); // 0 = Sunday, 5 = Friday
    const weekOfMonth = Math.ceil(dayOfMonth / 7);
    const dayName = dayjs(date).format('dddd');

    if (option === 'monthly-day') {
      return `Monthly on the ${dayOfMonth}${getOrdinalSuffix(dayOfMonth)}`;
    }
    if (option === 'monthly-weekday') {
      return `Monthly on the ${weekOfMonth}${getOrdinalSuffix(weekOfMonth)} ${dayName}`;
    }
  }

  return RECURRING_OPTIONS.find((opt) => opt.value === option)?.label || option;
};

/**
 * Get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
 */
const getOrdinalSuffix = (n: number): string => {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
};

/**
 * Calculate next recurring date based on pattern
 */
export const getNextRecurringDate = (
  pattern: RecurringOption,
  startDate: Date,
  currentDate?: Date
): Date => {
  const start = dayjs(startDate);
  const current = currentDate ? dayjs(currentDate) : dayjs();

  switch (pattern) {
    case 'daily':
      return start.add(current.diff(start, 'day') + 1, 'day').toDate();
    case 'weekdays': {
      let next = start;
      while (next.isBefore(current) || next.day() === 0 || next.day() === 6) {
        next = next.add(1, 'day');
        if (next.day() === 0) next = next.add(1, 'day'); // Skip Sunday
        if (next.day() === 6) next = next.add(2, 'day'); // Skip Saturday
      }
      return next.toDate();
    }
    case 'weekly':
      return start.add(Math.ceil(current.diff(start, 'week')) + 1, 'week').toDate();
    case 'monthly-day': {
      const dayOfMonth = start.date();
      let next = current.date(dayOfMonth);
      if (next.isBefore(current)) {
        next = next.add(1, 'month');
      }
      return next.toDate();
    }
    case 'monthly-weekday': {
      // More complex logic for "2nd Friday of month"
      // Simplified version - would need more logic for exact match
      return start.add(1, 'month').toDate();
    }
    default:
      return start.toDate();
  }
};
