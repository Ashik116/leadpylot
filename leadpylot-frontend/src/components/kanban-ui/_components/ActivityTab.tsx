import { Activity as ActivityIcon, CheckCircle2, Tag, Calendar, FileText } from 'lucide-react';
import React, { useMemo } from 'react';
import { Task } from '../types';

interface ActivityTabProps {
  card: Task;
}

interface Activity {
  id: string;
  type: 'created' | 'status_changed' | 'label_added' | 'label_removed' | 'due_date_set' | 'description_updated' | 'checklist_completed';
  user: string;
  date: string;
  description: string;
  avatar?: string;
  icon: React.ReactNode;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({ card }) => {
  const activities = useMemo(() => {
    if (!card) return [];

    const items: Activity[] = [];
    const agentName = card.agent || 'System';
    const agentInitials = card.agent ? card.agent.slice(0, 2).toUpperCase() : 'SY';

    // Card created - always show this
    items.push({
      id: 'created',
      type: 'created',
      user: agentName,
      date: 'recently',
      description: `Card "${card.title || 'Untitled'}" was created`,
      avatar: agentInitials,
      icon: <ActivityIcon className="h-4 w-4" />,
    });

    // Status change
    if (card.status) {
      items.push({
        id: 'status',
        type: 'status_changed',
        user: agentName,
        date: 'recently',
        description: `Status changed to "${card.status}"`,
        avatar: agentInitials,
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
    }

    // Labels added
    if (card.labels && Array.isArray(card.labels) && card.labels.length > 0) {
      items.push({
        id: 'labels',
        type: 'label_added',
        user: agentName,
        date: 'recently',
        description: `${card.labels.length} label${card.labels.length > 1 ? 's' : ''} added`,
        avatar: agentInitials,
        icon: <Tag className="h-4 w-4" />,
      });
    }

    // Due date set
    if (card.dueDate) {
      const dueDateStr = typeof card.dueDate === 'string'
        ? new Date(card.dueDate).toLocaleDateString()
        : card.dueDate;
      items.push({
        id: 'due_date',
        type: 'due_date_set',
        user: agentName,
        date: 'recently',
        description: `Due date set to ${dueDateStr}`,
        avatar: agentInitials,
        icon: <Calendar className="h-4 w-4" />,
      });
    }

    // Description updated
    if (card.description && card.description.trim()) {
      items.push({
        id: 'description',
        type: 'description_updated',
        user: agentName,
        date: 'recently',
        description: 'Description updated',
        avatar: agentInitials,
        icon: <FileText className="h-4 w-4" />,
      });
    }

    // Checklist items completed
    if (card.checklist && Array.isArray(card.checklist)) {
      const completedCount = card.checklist.filter((item) => item.completed).length;
      if (completedCount > 0) {
        items.push({
          id: 'checklist',
          type: 'checklist_completed',
          user: agentName,
          date: 'recently',
          description: `${completedCount} checklist item${completedCount > 1 ? 's' : ''} completed`,
          avatar: agentInitials,
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
      }
    }

    return items;
  }, [card]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto bg-gray-100 p-2">
        {activities.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center px-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ocean-2/50">
              <ActivityIcon className="h-8 w-8 text-black/80" />
            </div>
            <h4 className="mb-1 text-xxs font-bold text-black/80">No Activity Yet</h4>
            <p className="text-xs text-black/80">
              Activity history will appear here as changes are made to this card.
            </p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="animate-in fade-in slide-in-from-right-4 flex space-x-2 duration-300"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ocean-2 text-xs font-bold text-white uppercase shadow-lg shadow-ocean-2/50">
                {activity.avatar || activity.user.slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-black">{activity.user}</span>
                  <span className="text-xxs font-medium text-black/80 mr-2">{activity.date}</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-ocean-2/50 bg-gray-100 p-2 text-[13px] leading-relaxed text-black/80 shadow-sm">
                  <span className="text-ocean-2 shrink-0">{activity.icon}</span>
                  <span>{activity.description}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
