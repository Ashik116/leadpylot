import React, { useState } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight } from 'lucide-react';

interface DateCalendarProps {
  selectedDate?: Date;
  startDate?: Date;
  dueDate?: Date;
  onDateSelect: (date: Date) => void;
  currentMonth?: Date;
  onMonthChange?: (date: Date) => void;
}

export const DateCalendar: React.FC<DateCalendarProps> = ({
  selectedDate,
  startDate,
  dueDate,
  onDateSelect,
  currentMonth,
  onMonthChange,
}) => {
  const [viewMonth, setViewMonth] = useState<Date>(
    currentMonth || dueDate || startDate || selectedDate || new Date()
  );

  const handleMonthChange = (direction: 'prev' | 'next' | 'prevYear' | 'nextYear') => {
    let newMonth: Date;
    const current = dayjs(viewMonth);

    switch (direction) {
      case 'prev':
        newMonth = current.subtract(1, 'month').toDate();
        break;
      case 'next':
        newMonth = current.add(1, 'month').toDate();
        break;
      case 'prevYear':
        newMonth = current.subtract(1, 'year').toDate();
        break;
      case 'nextYear':
        newMonth = current.add(1, 'year').toDate();
        break;
      default:
        return;
    }

    setViewMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const monthStart = dayjs(viewMonth).startOf('month');
  const monthEnd = dayjs(viewMonth).endOf('month');
  const weekStart = monthStart.startOf('week'); // Start from Sunday
  const weekEnd = monthEnd.endOf('week');
  const days: Date[] = [];
  let current = weekStart;

  while (current.isBefore(weekEnd) || current.isSame(weekEnd, 'day')) {
    days.push(current.toDate());
    current = current.add(1, 'day');
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const selectedDayjs = selectedDate ? dayjs(selectedDate) : null;
  const startDayjs = startDate ? dayjs(startDate) : null;
  const dueDayjs = dueDate ? dayjs(dueDate) : null;
  const viewMonthDayjs = dayjs(viewMonth);

  // Determine if we have a valid date range
  // Due date should never be before start date (enforced at input level)
  let hasRange = false;
  let rangeStart: dayjs.Dayjs | null = null;
  let rangeEnd: dayjs.Dayjs | null = null;

  if (startDayjs && dueDayjs) {
    // Only show range if start date is on or before due date
    if (startDayjs.isBefore(dueDayjs, 'day') || startDayjs.isSame(dueDayjs, 'day')) {
      hasRange = true;
      rangeStart = startDayjs;
      rangeEnd = dueDayjs;
    }
    // If start is after due (shouldn't happen, but handle gracefully), don't show range
  }

  return (
    <div className="space-y-2">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleMonthChange('prevYear')}
            className="rounded-md p-1 text-black/60 transition-colors hover:bg-gray-100 hover:text-black"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleMonthChange('prev')}
            className="rounded-md p-1 text-black/60 transition-colors hover:bg-gray-100 hover:text-black"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="text-sm font-bold text-black">
          {viewMonthDayjs.format('MMMM YYYY')}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleMonthChange('next')}
            className="rounded-md p-1 text-black/60 transition-colors hover:bg-gray-100 hover:text-black"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleMonthChange('nextYear')}
            className="rounded-md p-1 text-black/60 transition-colors hover:bg-gray-100 hover:text-black"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-[10px] font-semibold text-black/60 py-0.5">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const dayDayjs = dayjs(day);
          const isCurrentMonth = dayDayjs.month() === viewMonthDayjs.month();
          const isToday = dayDayjs.isSame(dayjs(), 'day');

          // Range logic
          let isInRange = false;
          let isRangeStart = false;
          let isRangeEnd = false;
          let isSelected = false;

          if (hasRange && rangeStart && rangeEnd) {
            isRangeStart = dayDayjs.isSame(rangeStart, 'day');
            isRangeEnd = dayDayjs.isSame(rangeEnd, 'day');
            // Include days between start and end (inclusive boundaries handled separately)
            isInRange =
              (dayDayjs.isAfter(rangeStart, 'day') && dayDayjs.isBefore(rangeEnd, 'day')) ||
              (isRangeStart && isRangeEnd); // Same day case
            isSelected = isRangeStart || isRangeEnd;
          } else {
            // Single date selection (backward compatibility)
            if (selectedDayjs) {
              isSelected = selectedDayjs.isSame(dayDayjs, 'day');
            } else if (startDayjs && !dueDayjs) {
              isSelected = startDayjs.isSame(dayDayjs, 'day');
            } else if (dueDayjs && !startDayjs) {
              isSelected = dueDayjs.isSame(dayDayjs, 'day');
            }
          }

          // Determine position in week for range styling
          const dayOfWeek = dayDayjs.day();
          const isFirstInWeek = dayOfWeek === 0;
          const isLastInWeek = dayOfWeek === 6;

          // Build className based on state
          let className = 'h-6 w-6 text-[11px] font-medium transition-all';

          if (isSelected) {
            // Start or end date, or single selected date
            className += ' bg-indigo-500 text-white font-bold';
            if (isRangeStart && !isRangeEnd) {
              className += ' rounded-l-lg';
            } else if (isRangeEnd && !isRangeStart) {
              className += ' rounded-r-lg';
            } else if (!hasRange) {
              className += ' rounded-lg';
            } else if (isRangeStart && isRangeEnd) {
              // Same day (start = end)
              className += ' rounded-lg';
            }
          } else if (isInRange) {
            // Days in between the range
            className += ' bg-indigo-100 text-indigo-700';
            if (isFirstInWeek) {
              className += ' rounded-l-lg';
            } else if (isLastInWeek) {
              className += ' rounded-r-lg';
            } else {
              className += ' rounded-none';
            }
          } else {
            // Normal day
            className += isCurrentMonth
              ? ' text-black hover:bg-gray-100 rounded-lg'
              : ' text-black/30 hover:bg-gray-50 rounded-lg';
          }

          // Today ring (only if not selected or in range)
          if (isToday && !isSelected && !isInRange) {
            className += ' ring-2 ring-indigo-300';
          }

          return (
            <button key={idx} onClick={() => onDateSelect(day)} className={className}>
              {dayDayjs.date()}
            </button>
          );
        })}
      </div>
    </div>
  );
};
