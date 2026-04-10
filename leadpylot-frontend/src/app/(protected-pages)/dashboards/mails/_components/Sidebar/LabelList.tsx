'use client';

/**
 * LabelList - Missive-Style
 * Custom labels/tags for email organization
 */

import { useState } from 'react';
import { useEmailStore } from '../../_stores/emailStore';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { EmailLabel } from '../../_types/email.types';

// Mock labels - will be fetched from API
const MOCK_LABELS: EmailLabel[] = [
  { _id: '1', name: 'Sales', color: 'blue', count: 12 },
  { _id: '2', name: 'Support', color: 'green', count: 8 },
  { _id: '3', name: 'Follow-up', color: 'orange', count: 5 },
  { _id: '4', name: 'Important', color: 'red', count: 3 },
];

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
};

export default function LabelList() {
  const { selectConversation } = useEmailStore();
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const handleLabelClick = (labelId: string) => {
    setSelectedLabel(labelId);
    // Close the email detail drawer when switching labels
    selectConversation(null);
  };

  return (
    <div>
      <div className="mb-2 px-2 text-[0.698775rem] font-semibold uppercase tracking-wide text-gray-500">
        Labels
      </div>
      
      <div className="space-y-0.5">
        {MOCK_LABELS.map((label) => (
          <button
            key={label._id}
            onClick={() => handleLabelClick(label._id)}
            className={`
              group flex w-full items-center justify-between rounded-md px-3 py-2
              text-[0.8152375rem] transition-colors
              ${
                selectedLabel === label._id
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`h-2.5 w-2.5 rounded-full ${COLOR_MAP[label.color] || 'bg-gray-400'}`}
              />
              <span>{label.name}</span>
            </div>

            {label.count > 0 && (
              <span className="text-[0.698775rem] text-gray-500">
                {label.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Add Label Button */}
      <button
        className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-[0.8152375rem] text-gray-600 hover:bg-gray-100"
      >
        <ApolloIcon name="plus" className="text-[0.8152375rem]" />
        <span>Add label</span>
      </button>
    </div>
  );
}

