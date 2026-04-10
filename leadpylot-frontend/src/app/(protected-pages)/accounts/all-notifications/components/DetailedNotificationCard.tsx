'use client';

import React from 'react';
import classNames from '@/utils/classNames';
import { NotificationData, isNotificationRead } from '@/stores/notificationStore';
import { getNotificationConfig } from '@/configs/notification.config';
import { formatNotificationMessage } from '@/components/template/Notification/_components/formatNotificationMessage';
import { HiOutlineCheckCircle, HiOutlineX, HiOutlineClock, HiOutlineUser } from 'react-icons/hi';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ConfirmPopover from '@/components/shared/ConfirmPopover';

interface DetailedNotificationCardProps {
  notification: NotificationData;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onClick: () => void;
  onMarkAsRead: (id: string) => void;
  onDelete?: (id: string) => void;
  userRole?: string;
  currentUser?: { name?: string; login?: string } | null;
}

/**
 * Format timestamp to relative time and full date
 */
function formatTime(timestamp?: string | number): { relative: string; full: string } {
  if (!timestamp) return { relative: '', full: '' };

  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    if (isNaN(date.getTime())) return { relative: '', full: '' };

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 0) {
      return { relative: 'now', full: format(date, 'PPpp') };
    }

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let relative = '';
    if (diffMinutes < 1) relative = 'now';
    else if (diffMinutes < 60) relative = `${diffMinutes}m ago`;
    else if (diffHours < 24) relative = `${diffHours}h ago`;
    else if (diffDays < 7) relative = `${diffDays}d ago`;
    else relative = formatDistanceToNow(date, { addSuffix: true });

    return {
      relative,
      full: format(date, 'PPpp'),
    };
  } catch {
    return { relative: '', full: '' };
  }
}

const DetailedNotificationCard: React.FC<DetailedNotificationCardProps> = ({
  notification,
  isSelected,
  onSelect,
  onClick,
  onMarkAsRead,
  onDelete,
  userRole = 'Admin',
  currentUser,
}) => {
  const isRead = isNotificationRead(notification);
  const notificationType = notification.notificationType || '';
  const config = getNotificationConfig(notificationType);
  const Icon = config.ui.icon;
  const iconColor = config.ui.color;
  const iconBgColor = config.ui.bgColor;

  const formatted = formatNotificationMessage(notification, userRole, currentUser);
  const timestamp = notification.timestamp || notification.date || '';
  const timeInfo = formatTime(timestamp);

  // Extract additional metadata
  const metadata = notification.metadata || {};
  const leadName = metadata.leadName || metadata.lead_name;
  const projectName = metadata.projectName || metadata.project_name;
  const taskId = metadata.taskId || metadata.todoId;
  const priority = notification.priority || metadata.priority || 'medium';
  const category = notification.category || config.category || '';

  // Build navigation URL
  let navigationUrl = '#';
  if (notification.leadId) {
    navigationUrl = notification.offerId
      ? `/dashboards/leads/${notification.leadId}?highlightOffer=${notification.offerId}`
      : `/dashboards/leads/${notification.leadId}`;
  } else if (notification.projectId) {
    navigationUrl = `/dashboards/projects/${notification.projectId}`;
  } else if (taskId) {
    navigationUrl = `/dashboards/kanban?task=${taskId}`;
  }

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('button') ||
      target.closest('a')
    ) {
      return;
    }
    onClick();
  };

  return (
    <div
      className={classNames(
        'border rounded-lg p-4 transition-all duration-200 cursor-pointer',
        'hover:shadow-md hover:border-green-300',
        isRead ? 'bg-white border-gray-200' : 'bg-green-50/40 border-l-4 border-l-green-500',
        isSelected && 'ring-2 ring-green-500 border-green-500'
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <div className="shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500 focus:outline-none cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Icon */}
        <div className="shrink-0">
          <div
            className={classNames(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              iconBgColor
            )}
          >
            <Icon className={classNames('h-5 w-5', iconColor)} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={classNames(
                    'text-base font-semibold',
                    isRead ? 'text-gray-900' : 'text-gray-900'
                  )}
                >
                  {formatted.primary}
                </h3>
                {!isRead && (
                  <Badge className="shrink-0 bg-green-100 text-xs text-green-800" content="New" />
                )}
                {category && (
                  <Badge
                    className="shrink-0 bg-gray-100 text-xs text-gray-600 capitalize"
                    content={category}
                  />
                )}
                <Badge
                  className={classNames(
                    'shrink-0 text-xs',
                    priority === 'high'
                      ? 'bg-red-100 text-red-800'
                      : priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                  )}
                  content={priority}
                />
              </div>
              {formatted.subtext && (
                <p className="text-sm text-gray-600 mt-1">{formatted.subtext}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {!isRead && (
                <Button
                  type="button"
                  variant="plain"
                  size="xs"
                  icon={<HiOutlineCheckCircle className="h-5 w-5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600 focus:outline-none min-w-0"
                  title="Mark as read"
                />
              )}
              {onDelete && (
                <ConfirmPopover
                  title="Delete notification"
                  description="Are you sure you want to delete this notification? This cannot be undone."
                  onConfirm={() => onDelete(notification.id)}
                  confirmText="Delete"
                  confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
                  placement="left"
                  floatingClassName="!z-[100020]"
                >
                  <Button
                    type="button"
                    variant="plain"
                    size="xs"
                    icon={<HiOutlineX className="h-5 w-5" />}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none min-w-0"
                    title="Delete"
                    aria-label="Delete notification"
                  />
                </ConfirmPopover>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">{notification.description}</p>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-sm">
            {/* Entity Links */}
            {formatted.entityLink && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Entity:</span>
                <Link
                  href={formatted.entityLink.href}
                  onClick={(e) => e.stopPropagation()}
                  className="text-green-600 hover:text-green-700 hover:underline font-medium"
                >
                  {formatted.entityLink.text}
                </Link>
              </div>
            )}

            {/* Lead Name */}
            {leadName && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Lead:</span>
                <span className="text-gray-900">{leadName}</span>
              </div>
            )}

            {/* Project Name */}
            {projectName && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Project:</span>
                <span className="text-gray-900">{projectName}</span>
              </div>
            )}

            {/* Task ID */}
            {taskId && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Task:</span>
                <Link
                  href={`/dashboards/kanban?task=${taskId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-green-600 hover:text-green-700 hover:underline font-medium"
                >
                  #{taskId.length > 8 ? taskId.substring(0, 8) : taskId}
                </Link>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <HiOutlineClock className="h-4 w-4" />
                <span title={timeInfo.full}>{timeInfo.relative}</span>
              </div>
              {notification.target && (
                <div className="flex items-center gap-1">
                  <HiOutlineUser className="h-4 w-4" />
                  <span>{notification.target}</span>
                </div>
              )}
            </div>

            {navigationUrl !== '#' && (
              <Link
                href={navigationUrl}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium text-green-600 hover:text-green-700 hover:underline"
              >
                View Details →
              </Link>
            )}
          </div>

          {/* Full Metadata (Expandable) */}
          {metadata && Object.keys(metadata).length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Show full metadata
              </summary>
              <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-48">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailedNotificationCard;
