'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface StatisticsData {
  total_leads_with_todos: number;
  total_todos: number;
  total_pending: number;
  total_completed: number;
}

interface AdminTodosStatsProps {
  statistics?: StatisticsData;
  isLoading: boolean;
}

const AdminTodosStats: React.FC<AdminTodosStatsProps> = ({ statistics, isLoading }) => {
  const stats = [
    {
      title: 'Leads with Todos',
      value: statistics?.total_leads_with_todos || 0,
      icon: 'Users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Todos',
      value: statistics?.total_todos || 0,
      icon: 'ClipboardList',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Pending Todos',
      value: statistics?.total_pending || 0,
      icon: 'Clock',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Completed Todos',
      value: statistics?.total_completed || 0,
      icon: 'CheckCircle',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="p-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.title}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stat.value.toLocaleString()}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stat.bgColor} dark:bg-opacity-20`}>
              <ApolloIcon
                name={stat.icon as any}
                className={`h-6 w-6 ${stat.color} dark:text-opacity-80`}
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default AdminTodosStats;
