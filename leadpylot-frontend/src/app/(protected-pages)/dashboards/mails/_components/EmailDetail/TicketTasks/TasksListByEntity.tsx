import React from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useTasksByEntity } from '@/services/hooks/useTasksByEntity';
import { ApiTask } from '@/services/TaskService';
import { useRouter } from 'next/navigation';

interface TasksListByEntityProps {
  email_id?: string;
  lead_id?: string;
  offer_id?: string;
  opening_id?: string;
}

const TasksListByEntity: React.FC<TasksListByEntityProps> = ({
  email_id,
  lead_id,
  offer_id,
  opening_id,
}) => {
  const hasEntity = !!(email_id || lead_id || offer_id || opening_id);

  const { data, isLoading } = useTasksByEntity(
    { email_id, lead_id, offer_id, opening_id },
    hasEntity
  );

  const tasks = data?.data || [];
  const taskCount = tasks.length;

  const router = useRouter();

  if (!hasEntity || tasks?.length === 0) return null;

  return (
    <Dropdown
      renderTitle={
        <div className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
          <span>Tasks</span>
          {taskCount > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {taskCount}
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </div>
      }
    >
      {isLoading ? (
        <Dropdown.Item style={{ height: '24px' }} eventKey="loading" disabled>
          <div className="flex items-center gap-2 p-2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            <span className="text-sm text-gray-500">Loading tasks...</span>
          </div>
        </Dropdown.Item>
      ) : tasks.length === 0 ? (
        <Dropdown.Item style={{ height: '24px' }} eventKey="empty" disabled>
          <div className="p-2 text-sm text-gray-500">No tasks found</div>
        </Dropdown.Item>
      ) : (
        tasks.map((task: ApiTask) => (
          <Dropdown.Item
            style={{ height: '24px' }}
            key={task._id}
            eventKey={task._id}
            className="min-w-[200px]"
            onClick={() => {
              router.push(`/dashboards/kanban?opc=${task._id}`);
            }}
          >
            <div className="flex flex-col gap-1 py-1">
              <div className="max-w-[250px] truncate text-sm font-medium text-gray-900">
                {task.taskTitle}
              </div>
              {task.status && (
                <div className="text-xs text-gray-500 capitalize">
                  Status: {task.status.replace('_', ' ')}
                </div>
              )}
            </div>
          </Dropdown.Item>
        ))
      )}
    </Dropdown>
  );
};

export default TasksListByEntity;
