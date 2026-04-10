/**
 * TaskItem Component - Main task item display
 */

import Checkbox from '@/components/ui/Checkbox';
import classNames from '@/utils/classNames';
import { TaskItemContent } from './TaskItemContent';
import { TaskItemMeta } from './TaskItemMeta';
import { TaskItemActions } from './TaskItemActions';
import type { Task } from '../../TaskDrawer.types';

interface TaskItemProps {
  task: Task;
  isAdmin: boolean;
  isExpanded: boolean;
  isUpdating: boolean;
  onToggleStatus: (taskId: string, currentStatus: boolean) => void;
  onToggleExpansion: (taskId: string, emailId?: string) => void;
  onViewEmail: (emailId: string, todoType?: string) => void;
  onViewLead: (leadId: string) => void;
  onViewTask: (taskId: string) => void;
  children?: React.ReactNode; // For expanded content (email thread, comments)
}

export const TaskItem = ({
  task,
  isAdmin,
  isExpanded,
  isUpdating,
  onToggleStatus,
  onToggleExpansion,
  onViewEmail,
  onViewLead,
  onViewTask,
  children,
}: TaskItemProps) => {
  return (
    <div
      className={classNames(
        'group relative rounded-lg border bg-white transition-all duration-200',
        task.isDone ? 'border-gray-200 opacity-60' : 'border-gray-200 shadow-sm',
        !isExpanded &&
          !task.isDone &&
          'hover:border-orange-300 hover:shadow-md hover:shadow-orange-100/50'
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Checkbox */}
        <div className="pt-0.5">
          <Checkbox
            checked={task.isDone}
            onChange={() => onToggleStatus(task._id, task.isDone)}
            disabled={isUpdating}
            className="cursor-pointer"
          />
        </div>

        {/* Task Content */}
        <div className="min-w-0 flex-1">
          {/* Task Message with Expand Button */}
          <div className="flex items-start gap-2">
            {task.email_id && (
              <button
                onClick={() => onToggleExpansion(task._id, task.email_id)}
                className="mt-0.5 shrink-0 rounded p-0.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-blue-600"
                title={isExpanded ? 'Collapse email thread' : 'Expand email thread'}
              >
                {isExpanded ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </button>
            )}
            <TaskItemContent task={task} onTaskClick={onViewTask} />
          </div>

          {/* Task Meta */}
          <TaskItemMeta
            task={task}
            isAdmin={isAdmin}
            onViewEmail={onViewEmail}
            onViewLead={onViewLead}
            onViewTask={onViewTask}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && children && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 transition-all duration-200">
          {children}
        </div>
      )}
    </div>
  );
};
