import React, { useState, useRef, useMemo } from 'react';
import { ChecklistItem as ChecklistItemType } from '../../types';
import { Check, MoreHorizontal, Trash2 } from 'lucide-react';
import { ItemDueDateBadge } from './ItemDueDateBadge';
import { ChecklistItemMenuDropdown } from '../../_dropdowns/checklists/ChecklistItemMenuDropdown';
import { MemberAvatarGroup, Member } from '../MemberComponents/MemberAvatarGroup';
import { AddMemberButton } from '../MemberComponents/AddMemberButton';
import { useTodoBoardUsers } from '@/services/hooks/useUsers';
import ConfirmPopover from '@/components/shared/ConfirmPopover';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggle: () => void;
  onUpdate: (text: string) => void;
  onDelete: () => void;
  onDueDateClick?: (e?: React.MouseEvent) => void;
  onAssignClick?: (e?: React.MouseEvent) => void;
  hideDueDate?: boolean;
  hideAssign?: boolean;
  showDeleteIcon?: boolean; // Show delete icon instead of menu dropdown
  deleteConfirmTitle?: string;
  deleteConfirmDescription?: string;
}

export const ChecklistItem: React.FC<ChecklistItemProps> = ({
  item,
  onToggle,
  onUpdate,
  onDelete,
  onDueDateClick,
  onAssignClick,
  hideDueDate = false,
  hideAssign = false,
  showDeleteIcon = false,
  deleteConfirmTitle = 'Delete Subtask item',
  deleteConfirmDescription = 'Remove this item from the checklist? This cannot be undone.',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const dueDateBadgeRef = useRef<HTMLDivElement>(null);
  const assignBadgeRef = useRef<HTMLDivElement>(null);

  // Fetch users to get full member details - always enable to ensure data is available
  const { data: usersData } = useTodoBoardUsers(
    { limit: 100, active: true },
    { enabled: true } // Always fetch - React Query will cache it
  );

  // Transform assigned members to Member format for MemberAvatarGroup
  // Handle both string IDs and objects with _id and login (from API response)
  // API returns: assigned: [{ _id: "...", login: "..." }]
  const displayMembers = useMemo(() => {
    if (!item.assignedMembers || item.assignedMembers.length === 0) return [];

    return item.assignedMembers
      .map((member: any) => {
        // Handle both string IDs and objects with _id and login (from API: { _id: "...", login: "..." })
        const memberId = typeof member === 'string' ? member : (member?._id || member?.id);
        if (!memberId) return null;

        // Try to get full user details from usersData
        let name = 'Unknown';
        let login: string | undefined;

        if (usersData?.data) {
          const user = usersData.data.find((u: any) => u._id === memberId);
          if (user) {
            name = user.info?.name || user.login || 'Unknown';
            login = user.login;
          }
        }

        // Fallback to login from the member object if available (from API response format: { _id: "...", login: "..." })
        if (typeof member === 'object' && member.login && name === 'Unknown') {
          name = member.login;
          login = member.login;
        }

        // Final fallback: use the member ID as a display name if nothing else is available
        if (name === 'Unknown' && memberId) {
          name = memberId.substring(0, 8); // Show first 8 chars of ID as fallback
        }

        return {
          id: memberId,
          name,
          login,
        };
      })
      .filter(Boolean) as Member[];
  }, [item.assignedMembers, usersData]);

  const handleSubmit = () => {
    if (editText.trim()) {
      onUpdate(editText.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setEditText(item.text);
      setIsEditing(false);
    }
  };

  return (
    <div className="group flex items-start gap-1.5 rounded-lg px-0.5 py-0.5 transition-colors hover:bg-gray-100">
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`mt-[2px] flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${item.completed
          ? 'border-indigo-500 bg-indigo-500'
          : 'border-gray-400 bg-white hover:border-indigo-300'
          }`}
      >
        {item.completed && <Check className="h-2.5 w-2.5 text-white" />}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            className="w-full border-none bg-transparent px-0 text-sm font-medium text-black focus:ring-0"
            autoFocus
          />
        ) : (
          <div className="flex flex-wrap gap-1 items-center space-x-1.5">
            <span
              onClick={() => setIsEditing(true)}
              className={`cursor-text flex items-start  text-sm font-medium truncate ${item.completed ? 'text-black/60 line-through' : 'text-black'
                }`}
            >
              {item.text}
            </span>

            {/* Badges - Clickable to edit */}
            <div className="flex items-center">
              {item.dueDate && (
                <div ref={dueDateBadgeRef} data-badge-type="due-date">
                  <ItemDueDateBadge
                    date={item.dueDate}
                    time={item.dueTime}
                    onClick={(e) => {
                      e?.stopPropagation();
                      onDueDateClick?.(e);
                    }}
                  />
                </div>
              )}
              {displayMembers.length > 0 ? (
                <div
                  ref={assignBadgeRef}
                  data-badge-type="assign"
                  onClick={(e) => {
                    e?.stopPropagation();
                    onAssignClick?.(e);
                  }}
                  className="cursor-pointer"
                >
                  <MemberAvatarGroup
                    members={displayMembers}
                    maxCount={3}
                    size={18}
                    onOmittedAvatarClick={() => {
                      onAssignClick?.();
                    }}
                  />
                </div>
              ) : onAssignClick ? (
                <div ref={assignBadgeRef} data-badge-type="assign" className="cursor-pointer ml-1">
                  <AddMemberButton
                    onClick={(e) => {
                      onAssignClick?.(e);
                    }}
                    size={18}
                    tooltip="Assign members"
                    groupMember={false}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-0.5 ${showDeleteIcon ? '' : 'opacity-0 transition-opacity group-hover:opacity-100'}`}>
        {showDeleteIcon ? (
          <span className="inline-flex" onMouseDown={(e) => e.stopPropagation()}>
            <ConfirmPopover
              title={deleteConfirmTitle}
              description={deleteConfirmDescription}
              confirmText="Delete"
              onConfirm={onDelete}
              placement="top"
            >
              <button
                type="button"
                className="rounded p-0.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </ConfirmPopover>
          </span>
        ) : (
          <>
            <button
              ref={menuButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(true);
              }}
              className="rounded p-0.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
              title="More options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {/* Menu Dropdown */}
            <ChecklistItemMenuDropdown
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              triggerRef={menuButtonRef as React.RefObject<HTMLElement>}
              hasDueDate={!hideDueDate && !!item.dueDate}
              hasAssignees={!hideAssign && !!(item.assignedMembers && item.assignedMembers.length > 0)}
              onDueDateClick={hideDueDate ? undefined : (onDueDateClick ? () => onDueDateClick() : undefined)}
              onAssignClick={hideAssign ? undefined : (onAssignClick ? () => onAssignClick() : undefined)}
              onDeleteClick={onDelete}
            />
          </>
        )}
      </div>
    </div>
  );
};
