'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface AdminTodosHeaderProps {
  onSettingsClick: () => void;
  searchTerm: string;
  onSearch: (value: string) => void;
  statusFilter: 'all' | 'pending' | 'completed';
  onStatusFilter: (status: 'all' | 'pending' | 'completed') => void;
  statistics: {
    total_leads_with_todos: number;
    total_todos: number;
    total_pending: number;
    total_completed: number;
  } | undefined;
}

const AdminTodosHeader: React.FC<AdminTodosHeaderProps> = ({
  onSettingsClick,
  searchTerm,
  onSearch,
  statusFilter,
  onStatusFilter,
  statistics,
}) => {
  const stats = [
    { label: 'Leads', value: statistics?.total_leads_with_todos, color: 'bg-blue-100 text-blue-600' },
    { label: 'Todos', value: statistics?.total_todos, color: 'bg-purple-100 text-purple-600' },
    { label: 'Pending', value: statistics?.total_pending, color: 'bg-orange-100 text-orange-600' },
    { label: 'Done', value: statistics?.total_completed, color: 'bg-green-100 text-green-600' },
  ];
  return (
    <div className="h-20 xl:h-10  flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-2 rounded-lg shadow-sm">
      <div className="flex space-x-4">
        {stats.map(({ label, value, color }) => (
          <div
            key={label}
            className={`${color} text-gray-500 font-normal px-2 rounded-full`}
          >
            {label}:
            <span
              className={`font-semibold ${color} p-1 rounded-sm ml-1`}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
      {/* Actions Section */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search todos, leads, offers..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10 w-full sm:w-64 outline-none focus:outline-none"
          />
          <ApolloIcon
            name="search"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
        </div>

        {/* Status Filter */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
          <Button
            variant={statusFilter === 'all' ? 'solid' : 'plain'}
            size="sm"
            onClick={() => onStatusFilter('all')}
            className="rounded-r-none border-r"
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'solid' : 'plain'}
            size="sm"
            onClick={() => onStatusFilter('pending')}
            className="rounded-none border-r"
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'solid' : 'plain'}
            size="sm"
            onClick={() => onStatusFilter('completed')}
            className="rounded-l-none"
          >
            Completed
          </Button>
        </div>

        {/* Settings Button */}
        <Button
          variant="solid"
          onClick={onSettingsClick}
          className="flex items-center gap-2"
        >
          <ApolloIcon name="cog" className="h-4 w-4" />
          Todo Settings
        </Button>
      </div>
    </div>
  );
};

export default AdminTodosHeader;
