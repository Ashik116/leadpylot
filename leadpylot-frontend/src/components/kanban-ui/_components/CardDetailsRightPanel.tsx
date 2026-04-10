import { ApiTask } from '@/services/TaskService';
import classNames from '@/utils/classNames';
import React, { useState } from 'react';
import { CommentsTab } from './CommentsTab';
import { TaskStatusTab } from './TaskStatusTab';

interface CardDetailsRightPanelProps {
  card: ApiTask;
}

type TabType = 'comments' | 'task-activities';

export const CardDetailsRightPanel: React.FC<CardDetailsRightPanelProps> = ({ card }) => {
  const [activeTab, setActiveTab] = useState<TabType>('task-activities');

  const tabs = [
    { id: 'task-activities' as const, label: 'Task Activities' },
    // { id: 'email' as const, label: 'Email' },
    // { id: 'calls' as const, label: 'Calls/Records' },
    // { id: 'todos' as const, label: 'Todos' },
    { id: 'comments' as const, label: 'Comments' },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-l border-ocean-2/50 bg-gray-100 shadow-2xl">
      {/* TAB HEADER */}
      <div className="flex shrink-0 overflow-x-auto border-b border-ocean-2/50 bg-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={classNames(
              'whitespace-nowrap px-2 py-1.5 text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'border-b-2 border-ocean-2 text-ocean-2'
                : 'text-gray-600 hover:text-ocean-2'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB BODY */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'task-activities' && <TaskStatusTab taskId={card._id || card.id} />}
        {/* {activeTab === 'email' && (
          <div className="flex h-full items-center justify-center p-3 text-gray-500">
            Email content coming soon...
          </div>
        )} */}
        {/* {activeTab === 'calls' && (
          <div className="flex h-full items-center justify-center p-3 text-gray-500">
            Calls/Records content coming soon...
          </div>
        )}
        {activeTab === 'todos' && (
          <div className="flex h-full items-center justify-center p-3 text-gray-500">
            Todos content coming soon...
          </div>
        )} */}
        {activeTab === 'comments' && <CommentsTab taskId={card._id || card.id || ''} />}
      </div>
    </div>
  );
};
