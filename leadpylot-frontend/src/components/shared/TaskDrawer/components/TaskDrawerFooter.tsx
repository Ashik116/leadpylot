/**
 * TaskDrawer Footer Component
 */

import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from '@/utils/classNames';
import type { TaskFilter } from '../TaskDrawer.types';

interface TaskDrawerFooterProps {
  filter: TaskFilter;
  taskCount: number;
  onRefresh: () => void;
  isLoading: boolean;
}

export const TaskDrawerFooter = ({
  filter,
  taskCount,
  onRefresh,
  isLoading,
}: TaskDrawerFooterProps) => {
  const getFilterColor = () => {
    if (filter === 'pending') return 'text-orange-600';
    if (filter === 'completed') return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
      <Button
        variant="plain"
        size="xs"
        icon={<ApolloIcon name="refresh" />}
        onClick={onRefresh}
        disabled={isLoading}
        className="text-gray-600 hover:text-gray-900"
      >
        Refresh
      </Button>
      <div className={classNames('text-xs font-semibold', getFilterColor())}>
        {taskCount} {filter} task{taskCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
};
