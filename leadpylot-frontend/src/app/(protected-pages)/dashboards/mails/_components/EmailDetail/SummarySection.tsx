'use client';

import React from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Card from '@/components/ui/Card';

interface SummaryData {
  total_offers?: number;
  total_openings?: number;
  total_confirmations?: number;
  total_payments?: number;
  total_documents?: number;
  total_todos?: number;
  total_completed_todos?: number;
  total_emails?: number;
  total_updates?: number;
}

interface SummarySectionProps {
  summary: SummaryData | null | undefined;
}

interface SummaryItem {
  key: keyof SummaryData;
  label: string;
  icon: string;
  color: string;
}

const summaryItems: SummaryItem[] = [
  {
    key: 'total_offers',
    label: 'Offers',
    icon: 'file-text',
    color: 'text-blue-600',
  },
  {
    key: 'total_openings',
    label: 'Openings',
    icon: 'folder-open',
    color: 'text-indigo-600',
  },
  {
    key: 'total_confirmations',
    label: 'Confirmations',
    icon: 'checkmark',
    color: 'text-green-600',
  },
  {
    key: 'total_payments',
    label: 'Payments',
    icon: 'dollar',
    color: 'text-emerald-600',
  },
  {
    key: 'total_documents',
    label: 'Documents',
    icon: 'document',
    color: 'text-purple-600',
  },
  {
    key: 'total_todos',
    label: 'Comp. Todos',
    icon: 'checklist',
    color: 'text-orange-600',
  },
  {
    key: 'total_completed_todos',
    label: 'Todos',
    icon: 'check-circle',
    color: 'text-green-600',
  },
  {
    key: 'total_emails',
    label: 'Emails',
    icon: 'mail',
    color: 'text-gray-600',
  },
  {
    key: 'total_updates',
    label: 'Updates',
    icon: 'refresh',
    color: 'text-cyan-600',
  },
];

const SummarySection: React.FC<SummarySectionProps> = ({ summary }) => {
  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xl font-semibold">Summary</h4>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {summaryItems.map((item) => {
          const value = summary[item.key] ?? 0;
          return (
            <Card key={item.key} className="relative p-0.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-600">{item.label}</p>
                  <p className={`text-sm font-bold ${item.color} `}>{value}</p>
                </div>
                <div className="absolute top-1 right-0 shrink-0">
                  <ApolloIcon name={item.icon as any} className={`h-6 w-6 ${item.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SummarySection;
