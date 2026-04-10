/**
 * TaskDrawer Empty State Component
 */

import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from '@/utils/classNames';
import { EMPTY_STATE_MESSAGES } from '../TaskDrawer.constants';
import type { TaskFilter } from '../TaskDrawer.types';

interface TaskDrawerEmptyStateProps {
  filter: TaskFilter;
}

export const TaskDrawerEmptyState = ({ filter }: TaskDrawerEmptyStateProps) => {
  const messages = EMPTY_STATE_MESSAGES[filter];

  const getIconColor = () => {
    if (filter === 'pending') return 'text-orange-300';
    if (filter === 'completed') return 'text-green-300';
    return 'text-blue-300';
  };

  const getTextColor = () => {
    if (filter === 'pending') return 'text-orange-600';
    if (filter === 'completed') return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-12 text-center">
      <ApolloIcon name="checklist" className={classNames('mb-3 text-5xl', getIconColor())} />
      <p className={classNames('text-sm font-medium', getTextColor())}>{messages.title}</p>
      <p className="mt-1 text-xs text-gray-500">{messages.subtitle}</p>
    </div>
  );
};
