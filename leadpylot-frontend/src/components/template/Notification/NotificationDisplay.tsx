'use client';

import React, { useState } from 'react';
import {
  HiBell,
  HiCheckCircle,
  HiExclamationCircle,
  HiInformationCircle,
  HiX,
  HiRefresh,
} from 'react-icons/hi';
import { formatDistanceToNow } from 'date-fns';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Tooltip from '@/components/ui/Tooltip';
import {
  useNotifications,
  useUnreadCount,
  useNotificationLoading,
  useNotificationError,
  useNotificationStore,
} from '@/stores/notificationStore';
import { useNotificationActions } from '@/hooks/useNotificationActions';
import { useNotificationSync } from '@/hooks/useNotificationSync';

interface NotificationDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  maxHeight?: string;
}

const PRIORITY_DETAILS = {
  high: {
    icon: HiExclamationCircle,
    color: 'text-red-500 bg-red-50',
    badgeColor: 'bg-red-100 text-red-800',
  },
  medium: {
    icon: HiInformationCircle,
    color: 'text-orange-500 bg-orange-50',
    badgeColor: 'bg-orange-100 text-orange-800',
  },
  low: {
    icon: HiCheckCircle,
    color: 'text-green-500 bg-green-50',
    badgeColor: 'bg-green-100 text-green-800',
  },
  default: {
    icon: HiInformationCircle,
    color: 'text-blue-500 bg-blue-50',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  lead: 'bg-green-100 text-green-800',
  project: 'bg-green-100 text-green-800',
  system: 'bg-gray-100 text-gray-800',
  agent: 'bg-green-100 text-green-800',
  email: 'bg-blue-100 text-blue-800',
};

const NotificationDisplay: React.FC<NotificationDisplayProps> = ({
  isOpen,
  onClose,
  maxHeight = 'max-h-96',
}) => {
  const notifications = useNotifications();
  const unreadCount = useUnreadCount();
  const isLoading = useNotificationLoading();
  const error = useNotificationError();
  const lastSyncTime = useNotificationStore((state) => state.lastSyncTime);

  const { markAsRead, markAllAsRead } = useNotificationActions();
  const { refreshNotifications } = useNotificationSync();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'high' | 'medium' | 'low'>(
    'all'
  );

  const filteredNotifications = notifications.filter((notification) => {
    const matchesReadStatus =
      filter === 'all' ||
      (filter === 'unread' && !notification.readed) ||
      (filter === 'read' && notification.readed);
    const matchesPriority =
      selectedPriority === 'all' || notification.priority === selectedPriority;
    return matchesReadStatus && matchesPriority;
  });

  const getPriorityDetails = (priority: string = '') =>
    PRIORITY_DETAILS[priority as keyof typeof PRIORITY_DETAILS] || PRIORITY_DETAILS.default;
  const getCategoryColor = (category: string = '') =>
    CATEGORY_COLORS[category] || CATEGORY_COLORS.system;
  const formatTimestamp = (timestamp: string = '') => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.readed) await markAsRead(notification.id);
  };

  if (!isOpen) return null;

  return (
    <Card className="absolute top-full right-0 z-50 mt-2 w-96 border-0 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-2">
          <HiBell className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <Badge className="bg-blue-100 px-2 py-1 text-xs text-blue-800">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Tooltip title="Refresh notifications">
            <Button
              variant="plain"
              size="sm"
              onClick={() => refreshNotifications()}
              className="p-1 hover:bg-gray-100"
              disabled={isLoading}
            >
              <HiRefresh className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </Tooltip>
          <Button variant="plain" size="sm" onClick={onClose} className="p-1 hover:bg-gray-100">
            <HiX className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-100 bg-gray-50 p-4">
        <div className="flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="rounded-md border border-gray-200 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as any)}
            className="rounded-md border border-gray-200 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        {unreadCount > 0 && (
          <div className="mt-2">
            <Button variant="secondary" size="sm" onClick={markAllAsRead} className="text-xs">
              Mark all as read
            </Button>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="border-b border-red-100 bg-red-50 p-4">
          <div className="flex items-center space-x-2">
            <HiExclamationCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className={`${maxHeight} overflow-y-auto`}>
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <HiBell className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="mb-2 text-lg font-medium">No notifications</p>
            <p className="text-sm">
              {filter === 'unread'
                ? 'All caught up! No unread notifications.'
                : filter === 'read'
                  ? 'No read notifications found.'
                  : 'No notifications to display.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => {
              const {
                icon: PriorityIcon,
                color: priorityColor,
                badgeColor,
              } = getPriorityDetails(notification.priority);

              return (
                <div
                  key={notification.id}
                  className={`cursor-pointer p-4 transition-colors hover:bg-gray-50 ${!notification.readed ? 'bg-blue-50/50' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`rounded-full p-2 ${priorityColor}`}>
                      <PriorityIcon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h4
                            className={`text-sm font-medium ${!notification.readed ? 'text-gray-900' : 'text-gray-700'}`}
                          >
                            {notification.title}
                          </h4>
                          <p
                            className={`mt-1 text-sm ${!notification.readed ? 'text-gray-800' : 'text-gray-600'}`}
                          >
                            {notification.message}
                          </p>
                        </div>
                        {!notification.readed && (
                          <div className="mt-2 ml-2 h-2 w-2 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={`text-xs ${badgeColor}`}>{notification.priority}</Badge>
                          <Badge className={`text-xs ${getCategoryColor(notification.category)}`}>
                            {notification.category}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 bg-gray-50 p-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {filteredNotifications.length} of {notifications.length} notifications
          </span>
          {lastSyncTime && <span>Last sync: {formatTimestamp(lastSyncTime)}</span>}
        </div>
      </div>
    </Card>
  );
};

export default NotificationDisplay;
