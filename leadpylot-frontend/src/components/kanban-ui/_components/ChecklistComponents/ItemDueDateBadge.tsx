import React from 'react';
import { Clock } from 'lucide-react';
import { formatItemDueDate, isItemDueDateOverdue } from '../../_data/checklists-data';

interface ItemDueDateBadgeProps {
  date?: string;
  time?: string;
  onClick?: (e?: React.MouseEvent) => void;
  className?: string;
}

export const ItemDueDateBadge: React.FC<ItemDueDateBadgeProps> = ({
  date,
  time,
  onClick,
  className = '',
}) => {
  const formattedDate = date ? formatItemDueDate(date, time) : null;
  const isOverdue = date ? isItemDueDateOverdue(date, time) : false;

  // Always show the badge if onClick is provided, even if no date
  if (!onClick && !date) return null;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
        date
          ? isOverdue
            ? 'bg-red-500/20 text-red-600 hover:bg-red-500/30'
            : 'bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30'
          : 'bg-gray-200 text-gray-600 hover:bg-gray-300 border border-dashed border-gray-400'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      title={date ? formattedDate || 'Due date' : 'Add due date'}
      type="button"
    >
      <Clock className="h-3 w-3" />
      {formattedDate ? <span>{formattedDate}</span> : <span className="opacity-50">Due date</span>}
    </button>
  );
};
