import React from 'react';

interface YearGridProps {
  year: number;
  selectedDate?: Date;
  onDateClick?: (date: Date) => void;
}

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const YearGrid: React.FC<YearGridProps> = ({ year, selectedDate, onDateClick }) => {
  const today = new Date();
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
      {monthNames.map((month, monthIdx) => {
        const daysInMonth = getDaysInMonth(year, monthIdx);
        const firstDay = getFirstDayOfWeek(year, monthIdx);
        const days: (number | null)[] = Array(firstDay)
          .fill(null)
          .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
        while (days.length % 7 !== 0) days.push(null);
        return (
          <div key={month} className="rounded-lg bg-gray-50 p-3">
            <div className="mb-2 font-semibold text-gray-800">
              {month} {year}
            </div>
            <div className="mb-1 grid grid-cols-7 text-xs text-gray-500">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 text-sm">
              {days.map((day, idx) => {
                if (day === null) return <div key={idx} />;
                const dateObj = new Date(year, monthIdx, day);
                const isToday =
                  dateObj.getFullYear() === today.getFullYear() &&
                  dateObj.getMonth() === today.getMonth() &&
                  dateObj.getDate() === today.getDate();
                const isSelected =
                  selectedDate &&
                  dateObj.getFullYear() === selectedDate.getFullYear() &&
                  dateObj.getMonth() === selectedDate.getMonth() &&
                  dateObj.getDate() === selectedDate.getDate();
                return (
                  <button
                    key={idx}
                    className={`m-0.5 h-7 w-7 rounded-full text-center transition-colors ${isToday ? 'bg-blue-100 font-bold text-blue-700' : ''} ${isSelected ? 'bg-blue-500 font-bold text-white' : ''} hover:bg-blue-200`}
                    onClick={() => onDateClick?.(dateObj)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default YearGrid;
