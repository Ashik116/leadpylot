'use client';

import React from 'react';
import classNames from '@/utils/classNames';
import Button from '@/components/ui/Button';
import ConfirmPopover from '@/components/shared/ConfirmPopover';
import {
  HiOutlineCheckCircle,
  HiOutlineTrash,
  HiOutlineEyeOff,
  HiOutlineX,
} from 'react-icons/hi';

interface NotificationBulkActionsProps {
  selectedCount: number;
  hasUnreadSelected: boolean;
  hasReadSelected: boolean;
  onMarkAsRead: () => void;
  onMarkAsUnread: () => void;
  onDelete: () => void;
  onMute?: () => void;
  onClearSelection: () => void;
}

const NotificationBulkActions: React.FC<NotificationBulkActionsProps> = ({
  selectedCount,
  hasUnreadSelected,
  onMarkAsRead,
  onDelete,
  onMute,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div
      className="bg-green-50/80 border-b border-green-100 px-4 py-2 flex items-center justify-between shrink-0"
      role="toolbar"
      aria-label="Bulk actions"
    >
      {/* Left: Selected count */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-700">
          {selectedCount} selected
        </span>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-1">
        {/* Mark as read */}
        {hasUnreadSelected && (
          <Button
            type="button"
            variant="plain"
            size="xs"
            icon={<HiOutlineCheckCircle className="w-3.5 h-3.5" />}
            onClick={onMarkAsRead}
            className={classNames(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium',
              'text-green-600 hover:bg-green-100',
              'rounded-lg transition-colors',
              'focus:outline-none'
            )}
            aria-label="Mark selected as read"
            tabIndex={0}
          >
            Read
          </Button>
        )}

        {/* Mute (optional) */}
        {onMute && (
          <Button
            type="button"
            variant="plain"
            size="xs"
            icon={<HiOutlineEyeOff className="w-3.5 h-3.5" />}
            onClick={onMute}
            className={classNames(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium',
              'text-gray-600 hover:bg-gray-100',
              'rounded-lg transition-colors',
              'focus:outline-none'
            )}
            aria-label="Mute selected notifications"
            tabIndex={0}
          >
            Mute
          </Button>
        )}

        {/* Delete */}
        <ConfirmPopover
          title="Delete notifications"
          description={`Are you sure you want to delete ${selectedCount} selected notification(s)? This cannot be undone.`}
          onConfirm={onDelete}
          confirmText="Delete"
          confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
          placement="bottom-end"
          floatingClassName="!z-[100020]"
        >
          <Button
            type="button"
            variant="plain"
            size="xs"
            icon={<HiOutlineTrash className="w-3.5 h-3.5" />}
            className={classNames(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium',
              'text-red-500 hover:bg-red-50',
              'rounded-lg transition-colors',
              'focus:outline-none'
            )}
            aria-label="Delete selected notifications"
            tabIndex={0}
          >
            Delete
          </Button>
        </ConfirmPopover>

        {/* Divider */}
        <div className="h-4 w-px bg-gray-300 mx-1" />

        {/* Clear selection */}
        <Button
          type="button"
          variant="plain"
          size="xs"
          icon={<HiOutlineX className="w-3.5 h-3.5" />}
          onClick={onClearSelection}
          className={classNames(
            'p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100',
            'rounded-lg transition-colors',
            'focus:outline-none'
          )}
          aria-label="Clear selection"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onClearSelection();
            }
          }}
        />
      </div>
    </div>
  );
};

export default NotificationBulkActions;
