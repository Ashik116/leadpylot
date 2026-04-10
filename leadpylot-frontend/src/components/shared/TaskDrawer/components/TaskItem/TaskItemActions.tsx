/**
 * TaskItem Actions Component - Action buttons
 */

import ApolloIcon from '@/components/ui/ApolloIcon';
import type { Task } from '../../TaskDrawer.types';

interface TaskItemActionsProps {
  task: Task;
  onViewEmail: (emailId: string, todoType?: string) => void;
  onViewLead: (leadId: string) => void;
  onViewTask: (taskId: string) => void;
}

export const TaskItemActions = ({
  task,
  onViewEmail,
  onViewLead,
  onViewTask,
}: TaskItemActionsProps) => {
  const getLeadId = (
    leadId: string | { _id: string; contact_name?: string } | undefined
  ): string => {
    if (!leadId) return '';
    return typeof leadId === 'string' ? leadId : leadId._id;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {task.email_id && (
        <button
          onClick={() => onViewEmail(task.email_id!, task.email_task_type)}
          className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-1 py-1 text-xs font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 hover:shadow-sm active:scale-95"
        >
          <ApolloIcon name="mail" className="text-xs" />
          View Email
        </button>
      )}
      {task.lead_id && (
        <button
          onClick={() => onViewLead(getLeadId(task.lead_id))}
          className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-1 py-1 text-xs font-semibold text-green-700 transition-all hover:border-green-300 hover:bg-green-100 hover:shadow-sm active:scale-95"
        >
          <ApolloIcon name="eye-filled" className="text-xs" />
          View Lead
        </button>
      )}
      {task.email_id && (
        <button
          onClick={() => onViewTask(task._id)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-1 py-1 text-xs font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-100 hover:shadow-sm active:scale-95"
        >
          <ApolloIcon name="external-link" className="text-xs" />
          Details
        </button>
      )}
    </div>
  );
};
