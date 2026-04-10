/**
 * TaskItem Meta Component - Priority, Due Date, Assignee badges
 */

import ApolloIcon from '@/components/ui/ApolloIcon';
import {
  formatDate,
  isOverdue,
  getPriorityColor,
  getPriorityIcon,
  getPriorityLabel,
} from '../../TaskDrawer.utils';
import classNames from '@/utils/classNames';
import type { Task } from '../../TaskDrawer.types';
import { TaskItemActions } from './TaskItemActions';
import { getAgentColor } from '@/utils/utils';
import TodoTicketTypeBadge from '@/app/(protected-pages)/dashboards/todo/_components/TodoTicketTypeBadge';

interface TaskItemMetaProps {
  task: Task;
  isAdmin: boolean;
  onViewEmail?: (emailId: string, todoType?: string) => void;
  onViewLead?: (leadId: string) => void;
  onViewTask?: (taskId: string) => void;
}

export const TaskItemMeta = ({
  task,
  isAdmin,
  onViewEmail = () => { },
  onViewLead = () => { },
  onViewTask = () => { },
}: TaskItemMetaProps) => {
  // Calculate todoTypesids completion
  const todoTypesCompleted = task.todoTypesids?.filter((t) => t.isDone).length || 0;
  const todoTypesTotal = task.todoTypesids?.length || 0;
  const hasTodoTypes = todoTypesTotal > 0;

  // Get documents count
  const documentsCount = task.documents_ids?.length || 0;
  const hasDocuments = documentsCount > 0;

  // Get creator (prefer creator_id over created_by)
  const creator = task.creator_id || task.created_by;

  // Get lead contact name
  const leadContactName =
    typeof task.lead_id === 'object' && task.lead_id?.contact_name
      ? task.lead_id.contact_name
      : null;

  const creatorColor = getAgentColor(creator?.login || '');

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {/* Todo/Ticket Type Badge */}
      <TodoTicketTypeBadge type={task.type} />

      {/* Task Type Badge */}
      {task.email_task_type && (
        <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          <ApolloIcon name="file-alt" className="text-xs" />
          {task.email_task_type}
        </div>
      )}

      {/* Priority Badge */}
      <div
        className={classNames(
          'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
          getPriorityColor(task.priority)
        )}
      >
        <ApolloIcon name={getPriorityIcon(task.priority) as any} className="text-xs" />
        {getPriorityLabel(task.priority)}
      </div>

      {/* TodoTypesids Badge - Show completion progress */}
      {hasTodoTypes && (
        <div
          className={classNames(
            'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
            todoTypesCompleted === todoTypesTotal
              ? 'border-green-300 bg-green-100 text-green-800'
              : 'border-orange-300 bg-orange-100 text-orange-800'
          )}
        >
          <ApolloIcon name="checklist" className="text-xs" />
          {todoTypesCompleted}/{todoTypesTotal} completed
        </div>
      )}

      {/* Documents Badge - Show attachment count */}
      {hasDocuments && (
        <div className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          <ApolloIcon name="paperclip" className="text-xs" />
          {documentsCount} {documentsCount === 1 ? 'file' : 'files'}
        </div>
      )}

      {/* Due Date Badge */}
      {task.due_date && (
        <div
          className={classNames(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
            isOverdue(task.due_date, task.isDone)
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-gray-200 bg-gray-50 text-gray-700'
          )}
        >
          <ApolloIcon name="calendar" className="text-xs" />
          {formatDate(task.due_date, 'MMM d')}
        </div>
      )}

      {/* For Admins: Show assigned agent */}
      {isAdmin && task.assigned_to && (
        <div
          className={classNames(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            getAgentColor(task.assigned_to.login),
            'border border-gray-100 bg-gray-50'
          )}
        >
          <ApolloIcon name="user" className="text-xs" />
          {task.assigned_to.login}
        </div>
      )}

      {/* For Agents: Show creator (prefer creator_id) */}
      {!isAdmin && creator && (
        <div
          className={classNames(
            'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
            creatorColor
          )}
        >
          <ApolloIcon name="user-circle" className="text-xs" />
          by {creator.login}
        </div>
      )}

      {/* Lead Contact Name */}
      {leadContactName && (
        <div className="flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
          <ApolloIcon name="user" className="text-xs" />
          {leadContactName}
        </div>
      )}

      {/* Completion Duration - Show when task is done */}
      {task.isDone && task.completion_duration && (
        <div className="flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
          <ApolloIcon name="cockpit" className="text-xs" />
          Completed in {task.completion_duration}
        </div>
      )}

      {/* Action Buttons */}
      <TaskItemActions
        task={task}
        onViewEmail={onViewEmail}
        onViewLead={onViewLead}
        onViewTask={onViewTask}
      />
    </div>
  );
};
