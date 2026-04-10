import React from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

interface CalendarSelectorProps {
  currentYear: number;
  sidebarDate: Date | null;
  calendarReady: boolean;
  calendarRef: React.RefObject<any>;
  prevYear: () => void;
  nextYear: () => void;
  updateViewTitle: (calendarApi: any) => void;
}

const CalendarSelector: React.FC<CalendarSelectorProps> = ({
  currentYear,
  sidebarDate,
  calendarReady,
  calendarRef,
  prevYear,
  nextYear,
  updateViewTitle,
}) => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return (
    <div className="p-4">
      <h2 className="mb-3 text-lg font-medium">Calendar</h2>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={prevYear}
          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-100"
        >
          <LuChevronLeft size={16} />
        </button>
        <span className="font-medium">{currentYear}</span>
        <button
          onClick={nextYear}
          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-100"
        >
          <LuChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {months.map((month, index) => {
          const isCurrentMonth =
            sidebarDate &&
            sidebarDate.getMonth() === index &&
            sidebarDate.getFullYear() === currentYear;
          return (
            <button
              key={month}
              className={`rounded-md px-2 py-1 text-sm ${isCurrentMonth ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
              onClick={() => {
                const newDate = new Date(currentYear, index, 15);
                if (calendarReady && calendarRef.current) {
                  try {
                    const calendarApi = calendarRef.current.getApi();
                    calendarApi.gotoDate(newDate);
                    updateViewTitle(calendarApi);
                  } catch {
                    // Silently handle error
                  }
                }
              }}
            >
              {month}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarSelector;
