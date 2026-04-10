/**
 * TaskItem Content Component - Task message display
 */

import classNames from '@/utils/classNames';
import type { Task } from '../../TaskDrawer.types';

interface TaskItemContentProps {
  task: Task;
  onTaskClick: (taskId: string) => void;
}

export const TaskItemContent = ({ task, onTaskClick }: TaskItemContentProps) => {
  return (
    <button
      onClick={() => onTaskClick(task._id)}
      className={classNames(
        'flex-1 text-left transition-all duration-200',
        task.isDone
          ? 'text-sm font-normal text-gray-500 line-through hover:text-gray-600'
          : 'text-sm font-semibold text-gray-900 hover:text-blue-600'
      )}
    >
      <span className="line-clamp-2">{task.message || task.todo_message || 'No message'}</span>
    </button>
  );
};
