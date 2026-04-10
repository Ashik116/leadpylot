'use client';

/**
 * NotificationTableRow Component
 *
 * Compact table row for notifications (40px height).
 * Displays checkbox, icon, message, entity link, time, and quick actions.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import classNames from '@/utils/classNames';
import { NotificationData } from '@/stores/notificationStore';
import { getNotificationConfig } from '@/configs/notification.config';
import { formatNotificationMessage } from './formatNotificationMessage';
import { HiOutlineCheckCircle, HiOutlineX, HiOutlineEyeOff, HiChevronRight } from 'react-icons/hi';
import { formatDistanceToNow } from 'date-fns';
import { getAgentColor } from '@/utils/utils';
import Button from '@/components/ui/Button';
import ConfirmPopover from '@/components/shared/ConfirmPopover';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface NotificationTableRowProps {
  notification: NotificationData;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onClick: () => void;
  onMarkAsRead: (id: string) => void;
  onDelete?: (id: string) => void;
  onMute?: (id: string) => void;
  userRole?: string;
  /** Current viewer (name/login); when backend sends "You", show this so agent and admin see same name */
  currentUser?: { name?: string; login?: string } | null;
  /** Portal root for confirm popover - keeps it inside parent (e.g. drawer) */
  portalRoot?: HTMLElement | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format timestamp to compact relative time
 */
function formatTime(timestamp?: string | number): string {
  if (!timestamp) return '';

  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 0) return 'now';

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

const NotificationTableRow: React.FC<NotificationTableRowProps> = ({
  notification,
  isSelected,
  onSelect,
  onClick,
  onMarkAsRead,
  onDelete,
  onMute,
  userRole = 'Admin',
  currentUser,
  portalRoot,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Get notification config for icon and colors
  const notificationType = notification.notificationType || '';
  const config = getNotificationConfig(notificationType);
  const Icon = config.ui.icon;
  const iconColor = config.ui.color;
  const iconBgColor = config.ui.bgColor;

  // Check read status
  const isRead = notification.read || notification.readed;

  // Format message (currentUser so "You" is shown as actual name in both agent and admin views)
  const formatted = formatNotificationMessage(notification, userRole, currentUser);

  // Get timestamp
  const timestamp = notification.timestamp || notification.date || '';
  const timeText = formatTime(timestamp);

  const router = useRouter();
  const actionArrowHref = formatted.entityLink?.href ?? null;

  // Handle row click: go to entity link when available, else call onClick
  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('button') ||
      target.closest('a')
    ) {
      return;
    }
    if (actionArrowHref) {
      router.push(actionArrowHref);
    } else {
      onClick();
    }
  };

  // Handle entity link click (prevent row click)
  const handleEntityLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <tr
      className={classNames(
        'h-[40px] border-b border-gray-100/80 transition-colors duration-150',
        'cursor-pointer',
        // Unread: left accent + tinted bg
        !isRead && !isSelected && 'bg-green-50/40 border-l-2 border-l-green-500',
        // Read: clean white
        isRead && !isSelected && 'bg-white border-l-2 border-l-transparent',
        // Selected: clearly distinct
        isSelected && 'bg-green-100/50 border-l-2 border-l-green-500',
        // Hover
        'hover:bg-gray-50/80'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleRowClick}
      role="row"
      aria-label={`Notification: ${formatted.primary}${formatted.subtext ? `, ${formatted.subtext}` : ''}${isRead ? ', read' : ', unread'}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Checkbox Column */}
      <td className="sticky left-0 z-10 w-10 bg-inherit px-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-full items-center justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-green-600 focus:ring-1 focus:ring-green-500 focus:outline-none"
            aria-label={`Select notification ${notification.id}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(!isSelected);
              }
            }}
          />
        </div>
      </td>

      {/* Icon Column */}
      <td className="w-10 px-1">
        <div className="relative flex h-full items-center justify-center">
          <div
            className={classNames(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
              iconBgColor
            )}
          >
            <Icon className={classNames('h-3.5 w-3.5', iconColor)} />
          </div>
          {/* Unread dot - always present: green when unread, transparent when read */}
          <span
            className={classNames(
              'absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white',
              isRead ? 'bg-transparent' : 'bg-green-500'
            )}
            aria-label={isRead ? 'Read' : 'Unread'}
          />
        </div>
      </td>

      {/* Message Column */}
      <td className="min-w-0 flex-1 px-2">
        <div className="flex min-w-0 flex-col">
          <span
            className={classNames(
              'truncate text-[13px] leading-tight text-gray-900',
              isRead ? 'font-normal' : 'font-semibold'
            )}
          >
            {formatted.primary}
          </span>
          {(formatted.actorName || formatted.subtext) && (
            <span className="truncate text-[11px] leading-tight text-gray-500">
              {formatted.actorName && (
                <>
                  <span className={classNames('font-semibold', getAgentColor(formatted.actorName))}>
                    {formatted.actorName}
                  </span>
                  {formatted.subtext && <span className="text-gray-300"> · </span>}
                </>
              )}
              {formatted.subtext}
            </span>
          )}
        </div>
      </td>

      {/* Entity Link Column */}
      <td className="w-40 px-2">
        {formatted.entityLink ? (
          <a
            href={formatted.entityLink.href}
            onClick={handleEntityLinkClick}
            className="block truncate text-[11px] font-medium text-green-600 hover:text-green-700 hover:underline"
            aria-label={`View ${formatted.entityLink.type} ${formatted.entityLink.text}`}
          >
            {formatted.entityLink.text}
          </a>
        ) : null}
      </td>

      {/* Time Column */}
      <td className="w-16 px-1 text-right">
        <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap">{timeText}</span>
      </td>

      {/* Quick Actions Column (hover-only) */}
      <td className="w-28 px-1">
        <div className="flex h-full items-center justify-end pr-2">
          <div className="relative flex h-8 w-full items-center justify-end">
            {/* Action Buttons (Visible on hover) */}
            <div
              className={classNames(
                'mr-5 flex items-center gap-0.5 transition-all duration-200',
                isHovered
                  ? 'translate-x-0 opacity-100'
                  : 'pointer-events-none translate-x-2 opacity-0'
              )}
            >
              {!isRead && (
                <Button
                  type="button"
                  variant="plain"
                  size="xs"
                  icon={<HiOutlineCheckCircle className="h-4 w-4" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  className="rounded-md p-1 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600 focus:outline-none min-w-0"
                  aria-label="Mark as read"
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
                  portalRoot={portalRoot}
                >
                  <Button
                    type="button"
                    variant="plain"
                    size="xs"
                    icon={<HiOutlineX className="h-4 w-4" />}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 focus:outline-none min-w-0"
                    aria-label="Delete notification"
                    title="Delete"
                  />
                </ConfirmPopover>
              )}
              {/* Mute (eye) icon commented out
              {onMute && (
                <Button
                  type="button"
                  variant="plain"
                  size="xs"
                  icon={<HiOutlineEyeOff className="h-4 w-4" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMute(notification.id);
                  }}
                  className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none min-w-0"
                  aria-label="Mute notification"
                  title="Mute"
                />
              )}
              */}
            </div>

            {/* Chevron - links to entity when available */}
            <div className="absolute top-1/2 right-0 -translate-y-1/2">
              {actionArrowHref ? (
                <a
                  href={actionArrowHref}
                  onClick={handleEntityLinkClick}
                  className="text-gray-400 hover:text-green-600"
                >
                  <HiChevronRight className="h-4 w-4" />
                </a>
              ) : (
                <HiChevronRight className="h-4 w-4 text-gray-300" />
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};

export default NotificationTableRow;
