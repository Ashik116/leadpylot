'use client';



import React, { useState, useRef, useLayoutEffect } from 'react';
import classNames from '@/utils/classNames';
import { NotificationData, isNotificationRead } from '@/stores/notificationStore';
import { getNotificationConfig } from '@/configs/notification.config';
import { formatNotificationMessage } from '@/components/template/Notification/_components/formatNotificationMessage';
import { HiOutlineCheckCircle, HiOutlineX, HiChevronRight, HiOutlineClock, HiOutlineInformationCircle } from 'react-icons/hi';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Popover from '@/components/ui/Popover';
import ConfirmPopover from '@/components/shared/ConfirmPopover';

interface EnhancedNotificationTableRowProps {
  notification: NotificationData;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onClick: () => void;
  onMarkAsRead: (id: string) => void;
  onDelete?: (id: string) => void;
  userRole?: string;
  currentUser?: { name?: string; login?: string } | null;
}

function formatTime(timestamp?: string | number): { relative: string; full: string; dateLabel: string } {
  if (!timestamp) return { relative: '', full: '', dateLabel: '' };
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    if (isNaN(date.getTime())) return { relative: '', full: '', dateLabel: '' };
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return { relative: 'now', full: format(date, 'PPpp'), dateLabel: format(date, 'MMM d, yyyy') };
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    let relative = '';
    if (diffMinutes < 1) relative = 'now';
    else if (diffMinutes < 60) relative = `${diffMinutes}m`;
    else if (diffHours < 24) relative = `${diffHours}h`;
    else if (diffDays < 7) relative = `${diffDays}d`;
    else relative = formatDistanceToNow(date, { addSuffix: true });
    return { relative, full: format(date, 'PPpp'), dateLabel: format(date, 'MMM d, yyyy') };
  } catch {
    return { relative: '', full: '', dateLabel: '' };
  }
}

const EnhancedNotificationTableRow: React.FC<EnhancedNotificationTableRowProps> = ({
  notification,
  isSelected,
  onSelect,
  onClick,
  onMarkAsRead,
  onDelete,
  userRole = 'Admin',
  currentUser,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [metadataPopoverOpen, setMetadataPopoverOpen] = useState(false);
  const [metadataCopied, setMetadataCopied] = useState(false);
  const [descriptionPopoverOpen, setDescriptionPopoverOpen] = useState(false);
  const [isDescriptionTruncated, setIsDescriptionTruncated] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  const notificationType = notification.notificationType || '';
  const config = getNotificationConfig(notificationType);
  const Icon = config.ui.icon;
  const iconColor = config.ui.color;
  const iconBgColor = config.ui.bgColor;
  const isRead = isNotificationRead(notification);
  const formatted = formatNotificationMessage(notification, userRole, currentUser);
  const timestamp = notification.timestamp || notification.date || '';
  const timeInfo = formatTime(timestamp);

  const metadata = notification.metadata || {};
  const leadName = metadata.leadName || metadata.lead_name;
  const projectName = metadata.projectName || metadata.project_name;
  const taskId = metadata.taskId || metadata.todoId;
  const priority = notification.priority || metadata.priority || 'medium';
  const category = notification.category || config.category || '';

  const router = useRouter();
  const actionArrowHref =
    formatted.entityLink?.href ||
    (taskId ? `/dashboards/kanban?task=${taskId}` : null);

  const metadataJson = JSON.stringify(metadata, null, 2);
  const handleCopyMetadata = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(metadataJson).then(() => {
      setMetadataCopied(true);
      setTimeout(() => setMetadataCopied(false), 2000);
    });
  };
  const handleCloseMetadataPopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMetadataPopoverOpen(false);
  };

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[data-metadata-trigger]') ||
      target.closest('[data-description-trigger]')
    ) {
      return;
    }
    if (actionArrowHref) {
      router.push(actionArrowHref);
    } else {
      onClick();
    }
  };

  const handleCloseDescriptionPopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDescriptionPopoverOpen(false);
  };

  // Detect if description is actually truncated (line-clamp hiding content)
  useLayoutEffect(() => {
    if (!notification.description) {
      const id = requestAnimationFrame(() => setIsDescriptionTruncated(false));
      return () => cancelAnimationFrame(id);
    }
    const el = descriptionRef.current;
    if (!el) return;
    const check = () => {
      requestAnimationFrame(() => {
        setIsDescriptionTruncated(el.scrollHeight > el.clientHeight);
      });
    };
    const id = requestAnimationFrame(check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [notification.description]);

  const handleEntityLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <tr
      className={classNames(
        'border-b border-gray-100 transition-colors cursor-pointer hover:bg-gray-50',
        isRead ? 'bg-white' : 'bg-green-50/40',
        isSelected && 'bg-green-100/60'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleRowClick}
      role="row"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Checkbox */}
      <td className="sticky left-0 z-10 w-12 bg-inherit px-2 py-1" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-full items-center justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
            aria-label={`Select notification ${notification.id}`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </td>

      {/* Icon + Unread dot (always present: green when unread, transparent when read) */}
      <td className="w-12 px-1 py-1">
        <div className="flex h-full items-center justify-center gap-1">
          <div
            className={classNames(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
              iconBgColor
            )}
          >
            <Icon className={classNames('h-3.5 w-3.5', iconColor)} />
          </div>
          <span
            className={classNames(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              isRead ? 'bg-transparent' : 'bg-green-500'
            )}
            aria-label={isRead ? 'Read notification' : 'Unread notification'}
          />
        </div>
      </td>

      {/* Message – all details inline; max-width + break-words so long text wraps */}
      <td className="min-w-0 max-w-md flex-1 px-2 py-1">
        <div className="flex min-w-0 max-w-full flex-col gap-0.5 wrap-break-word">
          <div className="flex min-w-0 items-center gap-2 flex-wrap">
            <span
              className={classNames(
                'text-sm',
                isRead ? 'font-medium text-gray-900' : 'font-semibold text-gray-900'
              )}
            >
              {formatted.primary}
            </span>
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
            <span className="text-xs text-gray-600">{formatted.subtext}</span>
          )}
          {notification.description && (
            <div className="flex min-w-0 max-w-full items-end gap-1">
              <p
                ref={descriptionRef}
                className="min-w-0 flex-1 wrap-break-word text-xs text-gray-700 line-clamp-1"
              >
                {notification.description}
              </p>
              {/* Show "More" only when text is actually truncated (line-clamp hiding content) */}
              {isDescriptionTruncated && (
                <span
                  data-description-trigger
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 self-end"
                >
                  <Popover
                    placement="bottom-start"
                    isOpen={descriptionPopoverOpen}
                    onOpenChange={setDescriptionPopoverOpen}
                    content={
                      <div className="p-0 max-w-lg">
                        <div className="flex items-center justify-end gap-2 px-3 py-2 border-b border-gray-100">
                          <Button
                            type="button"
                            variant="plain"
                            size="xs"
                            icon={<HiOutlineX className="h-4 w-4" />}
                            onClick={handleCloseDescriptionPopover}
                            className="text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            title="Close"
                            aria-label="Close"
                          />
                        </div>
                        <div className="p-3 max-h-64 overflow-auto">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap wrap-break-word">
                            {notification.description}
                          </p>
                        </div>
                      </div>
                    }
                  >
                    <Button
                      type="button"
                      variant="plain"
                      size="xs"
                      className="text-xs font-medium text-green-600 hover:text-green-700 hover:underline focus:outline-none"
                    >
                      More
                    </Button>
                  </Popover>
                </span>
              )}
            </div>
          )}
          {/* Show all metadata - commented out for now
          {Object.keys(metadata).length > 0 && (
            <span
              data-metadata-trigger
              onClick={(e) => e.stopPropagation()}
              className="inline-block"
            >
              <Popover
                placement="bottom-start"
                isOpen={metadataPopoverOpen}
                onOpenChange={setMetadataPopoverOpen}
                content={
                  <div className="p-0 max-w-md">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 min-h-10">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider leading-none m-0 flex items-center">
                        Full metadata
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="plain"
                          size="xs"
                          icon={<ApolloIcon name="copy" className="h-4 w-4 mt-1" />}
                          onClick={handleCopyMetadata}
                          className="text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-xs font-medium"
                          title="Copy metadata"
                        >
                          {metadataCopied ? 'Copied' : 'Copy'}
                        </Button>
                        <Button
                          type="button"
                          variant="plain"
                          size="xs"
                          icon={<HiOutlineX className="h-4 w-4" />}
                          onClick={handleCloseMetadataPopover}
                          className="text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          title="Close"
                          aria-label="Close"
                        />
                      </div>
                    </div>
                    <pre className="p-3 bg-gray-50 rounded-b text-xs overflow-auto max-h-64 border border-gray-100 border-t-0">
                      {metadataJson}
                    </pre>
                  </div>
                }
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 hover:underline mt-0.5 focus:outline-none"
                >
                  <HiOutlineInformationCircle className="h-3.5 w-3.5 shrink-0" />
                  Show all metadata
                </button>
              </Popover>
            </span>
          )}
          */}
        </div>
      </td>

      {/* Entity & Details: show entity links or '-' when no related entity */}
      <td className="w-48 px-2 py-1">
        {notificationType === 'agent_login' || notificationType === 'agent_logout' ? (
          <span className="text-xs text-gray-400">-</span>
        ) : formatted.entityLink || leadName || projectName || taskId ? (
          <div className="flex flex-col gap-0.5 text-xs">
            {formatted.entityLink && (
              <div>
                <Link
                  href={formatted.entityLink.href}
                  onClick={handleEntityLinkClick}
                  className="font-medium text-green-600 hover:text-green-700 hover:underline"
                >
                  {formatted.entityLink.text}
                </Link>
              </div>
            )}
            {leadName && !(formatted.entityLink?.href?.includes('/leads/')) && (
              <div>
                <span className="text-gray-500">Lead: </span>
                <span className="text-gray-900">{leadName}</span>
              </div>
            )}
            {projectName && (
              <div>
                <span className="text-gray-500">Project: </span>
                <span className="text-gray-900">{projectName}</span>
              </div>
            )}
            {taskId && (
              <div>
                <span className="text-gray-500">Task: </span>
                <Link
                  href={`/dashboards/kanban?task=${taskId}`}
                  onClick={handleEntityLinkClick}
                  className="font-medium text-green-600 hover:text-green-700 hover:underline"
                >
                  #{taskId.length > 8 ? taskId.substring(0, 8) : taskId}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      {/* Date */}
      <td className="w-28 px-2 py-1">
        {timeInfo.dateLabel ? (
          <span className="text-xs text-gray-600 tabular-nums">{timeInfo.dateLabel}</span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      {/* Time */}
      <td className="w-32 px-2 py-1">
        <div className="flex items-center gap-1 text-xs text-gray-500" title={timeInfo.full}>
          <HiOutlineClock className="h-3 w-3" />
          <span className="tabular-nums">{timeInfo.relative}</span>
        </div>
      </td>

      {/* Actions */}
      <td className="w-32 px-1 py-1">
        <div className="flex h-full items-center justify-end pr-2">
          <div className="relative flex h-7 w-full items-center justify-end">
            <div
              className={classNames(
                'mr-5 flex items-center gap-0.5 transition-all duration-300',
                isHovered
                  ? 'translate-x-0 opacity-100'
                  : 'pointer-events-none translate-x-4 opacity-0'
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
                >
                  <Button
                    type="button"
                    variant="plain"
                    size="xs"
                    icon={<HiOutlineX className="h-4 w-4" />}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none min-w-0"
                    aria-label="Delete notification"
                    title="Delete"
                  />
                </ConfirmPopover>
              )}
            </div>
            <div className="absolute top-1/2 right-0 -translate-y-1/2">
              {actionArrowHref ? (
                <Link
                  href={actionArrowHref}
                  onClick={handleEntityLinkClick}
                  className="text-gray-400 hover:text-green-600"
                >
                  <HiChevronRight className="h-4 w-4" />
                </Link>
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

export default EnhancedNotificationTableRow;
