import React, { useState, useRef, useMemo } from 'react';
import { CheckSquare2, Trash2, ChevronDown, ChevronRight, User, Clock, Check } from 'lucide-react';
import { ChecklistProgress } from './ChecklistProgress';
import { ItemDueDateBadge } from './ItemDueDateBadge';
import { MemberAvatarGroup, Member } from '../MemberComponents/MemberAvatarGroup';
import { useTodoBoardUsers } from '@/services/hooks/useUsers';
import Button from '@/components/ui/Button';
import ConfirmPopover from '@/components/shared/ConfirmPopover';

interface ChecklistHeaderProps {
  title: string;
  progress: number;
  hideCheckedItems: boolean;
  onTitleChange: (title: string) => void;
  onToggleHideChecked: () => void;
  onDelete: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
  showProgress?: boolean;
  rightContent?: React.ReactNode;
  assignedMemberId?: string;
  dueDate?: string;
  dueTime?: string;
  isCompleted?: boolean;
  onToggleComplete?: (nextValue: boolean) => void;
  onAssignClick?: (e?: React.MouseEvent) => void;
  onDueDateClick?: (e?: React.MouseEvent) => void;
  assignButtonRef?: React.RefObject<HTMLButtonElement>;
  dueDateButtonRef?: React.RefObject<HTMLButtonElement>;
}

export const ChecklistHeader: React.FC<ChecklistHeaderProps> = ({
  title,
  progress,
  hideCheckedItems,
  onTitleChange,
  onToggleHideChecked,
  onDelete,
  onToggleCollapse,
  isCollapsed = false,
  showProgress = true,
  rightContent,
  assignedMemberId,
  dueDate,
  dueTime,
  isCompleted = false,
  onToggleComplete,
  onAssignClick,
  onDueDateClick,
  assignButtonRef: externalAssignRef,
  dueDateButtonRef: externalDueDateRef,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const internalAssignRef = useRef<HTMLButtonElement>(null);
  const internalDueDateRef = useRef<HTMLButtonElement>(null);
  const assignButtonRef = externalAssignRef || internalAssignRef;
  const dueDateButtonRef = externalDueDateRef || internalDueDateRef;

  // Fetch users to get full member details
  const { data: usersData } = useTodoBoardUsers(
    { limit: 100, active: true },
    { enabled: !!assignedMemberId }
  );

  // Transform assigned member to Member format for MemberAvatarGroup
  // Handle both string ID, array of objects (from API), or single object
  const displayMembers = useMemo(() => {
    if (!assignedMemberId) return [];

    // Handle different formats: string, array, or object
    // Note: assignedMemberId can be string, array, or object from API (st.assigned)
    const assignedMemberIdAny = assignedMemberId as any;
    let memberIds: string[] = [];

    if (typeof assignedMemberIdAny === 'string') {
      memberIds = [assignedMemberIdAny];
    } else if (Array.isArray(assignedMemberIdAny)) {
      // Handle array of objects from API: [{ _id: "...", login: "..." }]
      memberIds = assignedMemberIdAny.map((m: any) => {
        return typeof m === 'string' ? m : (m?._id || m?.id);
      }).filter(Boolean);
    } else if (typeof assignedMemberIdAny === 'object' && assignedMemberIdAny !== null) {
      // Handle single object: { _id: "...", login: "..." }
      const id = assignedMemberIdAny._id || assignedMemberIdAny.id;
      if (id) memberIds = [id];
    }

    if (memberIds.length === 0) return [];

    // Transform member IDs to Member format
    return memberIds.map((memberId: string) => {
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

      // Fallback: if assignedMemberId is an array/object, try to get login from it
      if (Array.isArray(assignedMemberIdAny)) {
        const memberObj = assignedMemberIdAny.find((m: any) => (m?._id || m?.id) === memberId);
        if (memberObj?.login && name === 'Unknown') {
          name = memberObj.login;
          login = memberObj.login;
        }
      } else if (typeof assignedMemberIdAny === 'object' && assignedMemberIdAny !== null && assignedMemberIdAny.login && name === 'Unknown') {
        name = assignedMemberIdAny.login;
        login = assignedMemberIdAny.login;
      }

      return {
        id: memberId,
        name,
        login,
      };
    }).filter(Boolean) as Member[];
  }, [assignedMemberId, usersData]);

  const handleSubmit = () => {
    if (editTitle.trim()) {
      onTitleChange(editTitle.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setEditTitle(title);
      setIsEditing(false);
    }
  };

  const headerRowClass = showProgress ? 'items-start' : 'items-center';
  const containerClass = showProgress ? 'space-y-1.5' : 'space-y-0';

  return (
    <div className={containerClass}>
      {/* Header Row */}
      <div className={`flex ${headerRowClass} justify-between gap-2`}>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {/* Collapse Toggle Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-center rounded-lg p-0.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label={isCollapsed ? 'Expand checklist' : 'Collapse checklist'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          {onToggleComplete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(!isCompleted);
              }}
              className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors ${
                isCompleted
                  ? 'border-indigo-500 bg-indigo-500'
                  : 'border-gray-300 bg-white hover:border-indigo-300'
              }`}
              aria-pressed={isCompleted}
              aria-label={isCompleted ? 'Mark checklist incomplete' : 'Mark checklist complete'}
              title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
            >
              {isCompleted && <Check className="h-2.5 w-2.5 text-white" />}
            </button>
          )}

          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSubmit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 max-w-full border-none bg-transparent px-0 text-sm font-semibold text-black focus:ring-0"
              style={{ width: `${Math.max(1, editTitle.length)}ch` }}
              autoFocus
            />
          ) : (
            <h3
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="min-w-0 max-w-full cursor-text whitespace-normal break-words text-sm font-semibold text-black"
            >
              {title}
            </h3>
          )}

          {/* Assign and Due Date Actions */}
          {(onAssignClick || onDueDateClick) && (
            <div className="flex items-center gap-1.5">
              {onAssignClick && (
                <div className="flex items-center gap-1">
                  {/* Only show Assign button if no members are assigned */}
                  {displayMembers.length === 0 && (
                    <Button
                      size="xs"
                      ref={assignButtonRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignClick(e);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-ocean-2/50 bg-white px-2 py-1 text-xs font-medium text-black transition-colors hover:bg-gray-50"
                      icon={<User className="h-3.5 w-3.5" />}
                      title="Assign"
                    >
                      <span>Assign</span>
                    </Button>
                  )}
                  {/* Show member avatars if members are assigned */}
                  {displayMembers.length > 0 && (
                    <button
                      type="button"
                      ref={assignButtonRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignClick?.(e);
                      }}
                      className="cursor-pointer"
                      title="Edit assignees"
                    >
                      <MemberAvatarGroup
                        members={displayMembers}
                        maxCount={3}
                        size={20}
                        onOmittedAvatarClick={() => {
                          onAssignClick?.();
                        }}
                      />
                    </button>
                  )}
                </div>
              )}
              {onDueDateClick && (
                <div className="flex items-center gap-1">
                  {/* Only show Due date button if no date is set */}
                  {!dueDate && (
                    <Button
                      variant="default"
                      size="xs"
                      ref={dueDateButtonRef}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDueDateClick(e);
                      }}
                      icon={<Clock className="h-3.5 w-3.5" />}
                      title="Due date"
                    >
                      <span>Due date</span>
                    </Button>
                  )}
                  {/* Show due date badge if date is set - make it clickable to edit */}
                  {dueDate && (
                    <ItemDueDateBadge
                      date={dueDate}
                      time={dueTime}
                      onClick={(e) => {
                        e?.stopPropagation();
                        onDueDateClick?.(e);
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <ConfirmPopover
            title="Delete Subtask"
            description="Delete this entire checklist and all its items? This cannot be undone."
            confirmText="Delete"
            onConfirm={onDelete}
            placement="top"
          >
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg p-1 text-red-600 transition-colors hover:bg-red-50"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </ConfirmPopover>
        </div>

        {showProgress ? (
          <div className="flex shrink-0 items-center gap-1 whitespace-nowrap">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Progress
            </span>
            <span className="text-xs font-semibold text-black/80">
              {progress}%
            </span>
          </div>
        ) : rightContent ? (
          <div className="flex shrink-0 items-center gap-1 whitespace-nowrap">
            {rightContent}
          </div>
        ) : null}
      </div>

      {/* Progress Bar */}
      {showProgress && <ChecklistProgress progress={progress} showLabel={false} />}
    </div>
  );
};
