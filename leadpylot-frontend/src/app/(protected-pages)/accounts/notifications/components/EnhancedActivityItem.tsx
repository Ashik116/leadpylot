'use client';

import { useCallback } from 'react';
import { useNotificationActions } from '@/hooks/useNotificationActions';
import ActivityItem from './ActivityItem';
import { ActivityItem as ActivityItemType } from '../types';

interface EnhancedActivityItemProps {
  activity: ActivityItemType;
  isExpanded: boolean;
  onToggleExpanded: (id: string) => void;
  onActivityClick?: (activity: ActivityItemType) => void;
}

export default function EnhancedActivityItem({
  activity,
  isExpanded,
  onToggleExpanded,
  onActivityClick,
}: EnhancedActivityItemProps) {
  const { markAsRead } = useNotificationActions();

  const handleClick = useCallback(async () => {
    if (activity?.type === 'notification' && !activity?.read) {
      try {
        await markAsRead(activity?.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
    onActivityClick?.(activity);
  }, [activity, markAsRead, onActivityClick]);

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <ActivityItem
        activity={activity}
        isExpanded={isExpanded}
        onToggleExpanded={onToggleExpanded}
      />
    </div>
  );
}
