import React from 'react';
import { CardDates } from '../../types';
import { ChevronDown } from 'lucide-react';
import { formatDateForDisplay, calculateDateStatus, getDateStatusBadge } from '../../_data/dates-data';

interface DateDisplayProps {
  dates?: CardDates;
  onClick?: () => void;
  className?: string;
  showIcon?: boolean;
}

export const DateDisplay: React.FC<DateDisplayProps> = ({
  dates,
  onClick,
  className = '',
  showIcon = false,
}) => {
  if (!dates?.dueDate) return null;

  const status = calculateDateStatus(dates.dueDate, dates.dueTime);
  const statusBadge = getDateStatusBadge(status);
  const displayText = formatDateForDisplay(dates.dueDate, dates.dueTime);

  return (
    <div
      onClick={onClick}
      className={`group bg-gray-300 px-2 rounded-md py-1 flex items-center gap-2 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <span className="text-sm font-semibold text-black">{displayText}</span>
      {statusBadge && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${statusBadge.color}`}
        >
          {statusBadge.text}
        </span>
      )}
      {onClick && (
        <ChevronDown className="h-4 w-4 text-black/60 transition-transform group-hover:scale-110" />
      )}
    </div>
  );
};
