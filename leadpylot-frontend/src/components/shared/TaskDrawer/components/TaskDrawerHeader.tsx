/**
 * TaskDrawer Header Component with Filter Tabs
 */

import classNames from '@/utils/classNames';
import Badge from '@/components/ui/Badge';
import type { TaskFilter } from '../TaskDrawer.types';

interface TaskDrawerHeaderProps {
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  counts: {
    pending: number;
    completed: number;
    all: number;
  };
}

export const TaskDrawerHeader = ({ filter, onFilterChange, counts }: TaskDrawerHeaderProps) => {
  return (
    <div className="flex border-b border-gray-200 bg-white">
      <button
        onClick={() => onFilterChange('pending')}
        className={classNames(
          'relative flex-1 px-4 py-3 text-sm font-medium transition-all duration-200',
          filter === 'pending'
            ? 'border-b-2 border-orange-500 bg-white text-orange-600'
            : 'border-b-2 border-transparent text-gray-600 hover:bg-orange-50 hover:text-orange-600'
        )}
      >
        <span className="flex items-center justify-center gap-2">
          Pending
          {counts.pending > 0 && (
            <Badge
              className={classNames(
                'text-xs font-semibold',
                filter === 'pending' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'
              )}
              content={counts.pending}
            />
          )}
        </span>
      </button>
      <button
        onClick={() => onFilterChange('completed')}
        className={classNames(
          'relative flex-1 px-4 py-3 text-sm font-medium transition-all duration-200',
          filter === 'completed'
            ? 'border-b-2 border-green-500 bg-white text-green-600'
            : 'border-b-2 border-transparent text-gray-600 hover:bg-green-50 hover:text-green-600'
        )}
      >
        <span className="flex items-center justify-center gap-2">
          Completed
          {counts.completed > 0 && (
            <Badge
              className={classNames(
                'text-xs font-semibold',
                filter === 'completed' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'
              )}
              content={counts.completed}
            />
          )}
        </span>
      </button>
      <button
        onClick={() => onFilterChange('all')}
        className={classNames(
          'relative flex-1 px-4 py-3 text-sm font-medium transition-all duration-200',
          filter === 'all'
            ? 'border-b-2 border-blue-500 bg-white text-blue-600'
            : 'border-b-2 border-transparent text-gray-600 hover:bg-blue-50 hover:text-blue-600'
        )}
      >
        <span className="flex items-center justify-center gap-2">
          All
          {counts.all > 0 && (
            <Badge
              className={classNames(
                'text-xs font-semibold',
                filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              )}
              content={counts.all}
            />
          )}
        </span>
      </button>
    </div>
  );
};
