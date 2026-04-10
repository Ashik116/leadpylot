'use client';

import React from 'react';
import classNames from '@/utils/classNames';
import Button from '@/components/ui/Button';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type QuickTab = 'all' | 'unread' | 'assigned' | 'mentions';

export interface InboxQuickTabsProps {
  activeTab: QuickTab;
  onTabChange: (tab: QuickTab) => void;
  unreadCount?: number;
  assignedCount?: number;
  mentionsCount?: number;
}

/** Tab-style classes: continuous strip with underline for active, no button backgrounds (matches CategoryTabs).
 *  All tabs use same border-b-2 so layout doesn't shift when switching (no UI blinding). */
const TAB_ITEM_CLASS =
  '!rounded-none !px-2.5 !pt-2 !pb-1.5 text-gray-500 hover:text-gray-700 border-b-2 border-transparent';
const TAB_ACTIVE_CLASS =
  '!rounded-none !bg-transparent !ring-0 !px-2.5 !pt-2 !pb-1.5 text-green-600 font-semibold border-b-2 border-green-600';

// ============================================
// MAIN COMPONENT
// ============================================

const InboxQuickTabs: React.FC<InboxQuickTabsProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
  assignedCount = 0,
  mentionsCount = 0,
}) => {
  const tabs: { value: QuickTab; label: string; count?: number }[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread', count: unreadCount },
    { value: 'assigned', label: 'Assigned', count: assignedCount },
    // { value: 'mentions', label: 'Mentions', count: mentionsCount },
  ];

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <Button
            key={tab.value}
            variant="plain"
            size="xs"
            shape="none"
            onClick={() => onTabChange(tab.value)}
            className={classNames(
              'flex items-center gap-1.5 whitespace-nowrap transition-all duration-150',
              isActive ? TAB_ACTIVE_CLASS : TAB_ITEM_CLASS
            )}
            aria-label={`${tab.label}${tab.count !== undefined ? ` (${tab.count})` : ''}`}
            aria-pressed={isActive}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={classNames(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                  isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200/80 text-gray-500'
                )}
              >
                {tab.count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default InboxQuickTabs;
