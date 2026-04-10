import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { SmartDropdown } from '@/components/shared/SmartDropdown';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTodoBoardUsers } from '@/services/hooks/useUsers';
import { useUpdateTask } from '@/hooks/useTasks';
import { useUpdateBoard, useBoard, useBoardMembers } from '@/hooks/useBoards';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useAuthStore } from '@/stores/authStore';
import { Role } from '@/configs/navigation.config/auth.route.config';

export type MemberAssignmentContext =
  | 'task'           // Task-level members
  | 'board'          // Board-level members
  | 'checklist-item' // Checklist item members
  | 'checklist';     // Checklist-level members

export interface UnifiedMemberAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;

  // Context configuration
  context: MemberAssignmentContext;

  // Required IDs based on context
  taskId?: string;        // Required for 'task', 'checklist-item', 'checklist'
  boardId?: string | string[] | Array<{ _id?: string;[key: string]: any }>;       // Required for 'board', optional for 'task', 'checklist-item', 'checklist'
  // checklistId and itemId are passed via onAssign callback for checklist contexts

  // Current member IDs (can be string array or objects with user_id structure)
  assignedMemberIds?: Array<{ _id?: string; id?: string; user_id?: string | { _id?: string; login?: string } } | string>;

  // Task members for grouping (used in checklist contexts)
  taskMemberIds?: Array<{ _id?: string; id?: string } | string> | string[];

  // SubTask members (checklist and checklist item members) - used for task context validation
  subTaskMemberIds?: Array<{ _id?: string; id?: string } | string> | string[];

  // Custom title
  title?: string;

  // Auto-save (immediate) vs Save button
  autoSave?: boolean;

  // Custom onAssign callback (overrides default behavior)
  onAssign?: (memberIds: string[]) => void;

  /** Called when task is updated (task context) so parent can sync UI immediately */
  onTaskUpdated?: (apiTask: import('@/services/TaskService').ApiTask) => void;
}

export const UnifiedMemberAssignment: React.FC<UnifiedMemberAssignmentProps> = ({
  isOpen,
  onClose,
  triggerRef,
  context,
  taskId,
  boardId,
  assignedMemberIds = [],
  taskMemberIds = [],
  subTaskMemberIds = [],
  title,
  autoSave = false,
  onAssign,
  onTaskUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);
  const [manualAllMembersExpanded, setManualAllMembersExpanded] = useState(false);
  const prevIsOpenRef = useRef(false);
  const [showNonBoardMemberWarning, setShowNonBoardMemberWarning] = useState(false);
  const [pendingMemberIds, setPendingMemberIds] = useState<string[]>([]);
  const [isSelectAllUsed, setIsSelectAllUsed] = useState(false);
  const [selectAllWasSelecting, setSelectAllWasSelecting] = useState(false);
  const { user } = useAuthStore();
  const isAgent = user?.role === Role.AGENT;
  const currentUserId = (user?.id || user?._id || '') as string;

  const { mutate: updateTask } = useUpdateTask();
  const { mutate: updateBoard, isPending: isBoardPending } = useUpdateBoard();

  // Extract board_id as string from various formats
  const boardIdString = useMemo(() => {
    if (!boardId) return undefined;
    if (typeof boardId === 'string') return boardId;
    if (Array.isArray(boardId) && boardId.length > 0) {
      const first = boardId[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object' && first._id) return first._id;
    }
    return undefined;
  }, [boardId]);

  // Fetch board data to get board members (only for task/checklist contexts)
  const shouldFetchBoard =
    (context === 'task' || context === 'checklist-item' || context === 'checklist') && !!boardIdString;
  const { data: boardResponse, isLoading: isBoardLoading } = useBoard(
    boardIdString || null,
    shouldFetchBoard
  );

  // Fetch users
  const { data: usersResponse, isLoading: isUsersLoading } = useTodoBoardUsers(
    { limit: 100, active: true },
    { enabled: isOpen }
  );

  // Fetch members from board members endpoint (task and checklist contexts)
  const shouldFetchBoardMembers =
    (context === 'task' || context === 'checklist-item' || context === 'checklist') &&
    isOpen &&
    !!boardIdString;
  const { data: boardMembersResponse, isLoading: isBoardMembersLoading } = useBoardMembers(
    boardIdString || null,
    shouldFetchBoardMembers
  );

  const boardMembersData = useMemo(
    () => boardMembersResponse?.data || usersResponse?.boardMembers || [],
    [boardMembersResponse, usersResponse?.boardMembers]
  );

  const boardMembers = useMemo(() => {
    return boardMembersData.map((m: any) => ({
      ...m,
      _id: m?._id,
      login: m?.login,
      info: {
        name: [m?.first_name, m?.last_name].filter(Boolean).join(' ') || m?.login,
        email: m?.email,
      },
    }));
  }, [boardMembersData]);

  const boardMemberRecords = useMemo(() => {
    return boardResponse?.data?.board?.members || [];
  }, [boardResponse]);

  // Extract board member IDs from the nested structure
  const boardMemberIds = useMemo(() => {
    const source = boardMemberRecords.length > 0 ? boardMemberRecords : boardMembersData;
    return source
      .map((m: any) => {
        // Handle nested user_id object structure: { user_id: { _id: "...", login: "..." } }
        if (m?.user_id) {
          if (typeof m.user_id === 'string') {
            return m.user_id;
          }
          if (typeof m.user_id === 'object' && m.user_id._id) {
            return m.user_id._id;
          }
        }
        if (typeof m === 'string') return m;
        return m?._id || m?.id;
      })
      .filter(Boolean);
  }, [boardMembersData, boardMemberRecords]);

  // Extract initial selected IDs from props
  const initialSelectedIds = useMemo(() => {
    const ids = (assignedMemberIds || [])
      .map((m: any) => {
        if (typeof m === 'string') return m;
        // Handle nested user_id object structure (for board members)
        if (m?.user_id) {
          if (typeof m.user_id === 'string') return m.user_id;
          if (typeof m.user_id === 'object' && m.user_id._id) return m.user_id._id;
        }
        return m?._id || m?.id;
      })
      .filter(Boolean);
    return Array.from(new Set(ids));
  }, [assignedMemberIds]);

  // Extract subTask member IDs (for task context validation)
  const subTaskMemberIdsArray = useMemo(() => {
    if (!subTaskMemberIds || (Array.isArray(subTaskMemberIds) && subTaskMemberIds.length === 0)) return [];
    if (!Array.isArray(subTaskMemberIds)) return [];
    return subTaskMemberIds
      .map((m: any) => {
        if (typeof m === 'string') return m;
        // Handle nested user_id object structure
        if (m?.user_id) {
          if (typeof m.user_id === 'string') return m.user_id;
          if (typeof m.user_id === 'object' && m.user_id._id) return m.user_id._id;
        }
        return m?._id || m?.id;
      })
      .filter(Boolean);
  }, [subTaskMemberIds]);

  // Track previous initialSelectedIds to detect changes
  const prevInitialSelectedIdsRef = useRef<string[]>([]);

  // Initialize and sync local state
  useEffect(() => {
    if (isOpen) {
      // When dropdown opens, always sync with initialSelectedIds
      // This ensures previously assigned members show as checked
      if (!prevIsOpenRef.current) {
        // First time opening - always sync
        requestAnimationFrame(() => {
          setLocalSelectedIds([...initialSelectedIds]);
          prevInitialSelectedIdsRef.current = [...initialSelectedIds];
          setIsSelectAllUsed(false); // Reset Select All flag when opening
          setSelectAllWasSelecting(false);
        });
      } else {
        // Dropdown is already open - check if assignedMemberIds changed
        const prevIds = prevInitialSelectedIdsRef.current;
        const prevIdsSet = new Set(prevIds);
        const currentIdsSet = new Set(initialSelectedIds);

        // Check if IDs changed by comparing sets
        const idsChanged = prevIds.length !== initialSelectedIds.length ||
          !initialSelectedIds.every(id => prevIdsSet.has(id)) ||
          !prevIds.every(id => currentIdsSet.has(id));

        if (idsChanged) {
          // assignedMemberIds changed - sync local state
          requestAnimationFrame(() => {
            setLocalSelectedIds([...initialSelectedIds]);
            prevInitialSelectedIdsRef.current = [...initialSelectedIds];
            setIsSelectAllUsed(false); // Reset Select All flag when syncing
            setSelectAllWasSelecting(false);
          });
        }
      }
    } else {
      // When dropdown closes, reset the previous IDs ref
      prevInitialSelectedIdsRef.current = [];
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialSelectedIds]);

  const availableUsers = useMemo(() => {
    return usersResponse?.data || [];
  }, [usersResponse?.data]);

  const isMembersLoading = isUsersLoading || isBoardMembersLoading;
  const isAdminUser = useCallback((u: any) => {
    if (u?.isCreator) return true;
    const role = u?.role || u?.user_role || u?.userRole;
    return role === Role.ADMIN || role === 'Admin' || role === 'ADMIN';
  }, []);

  const userById = useMemo(() => {
    return new Map((availableUsers || []).map((u: any) => [u?._id, u]));
  }, [availableUsers]);

  // Determine if we should show board members section
  const boardMemberIdsArray = useMemo(() => {
    return boardMembersData.map((m: any) => m?._id).filter(Boolean);
  }, [boardMembersData]);

  const showTaskMembers =
    (context === 'task' || context === 'checklist-item' || context === 'checklist') &&
    boardMemberIdsArray.length > 0;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const isTaskMembersExpanded = !hasSearchQuery;
  const isAllMembersExpanded = hasSearchQuery || manualAllMembersExpanded;

  // Separate members into task members and all other members
  const { taskMembers, allOtherMembers } = useMemo(() => {
    const users = availableUsers || [];
    const boardMemberIdsSet = new Set(boardMemberIdsArray);

    const taskMembers = isAgent
      ? boardMembers
      : users.filter((u: any) => boardMemberIdsSet.has(u._id));
    const allOtherMembers = users.filter((u: any) => !boardMemberIdsSet.has(u._id));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const filterFn = (u: any) => {
        return (
          u.info?.name?.toLowerCase().includes(q) ||
          u.info?.email?.toLowerCase()?.includes(q) ||
          u.login?.toLowerCase().includes(q)
        );
      };
      return {
        taskMembers: taskMembers.filter(filterFn),
        allOtherMembers: allOtherMembers.filter(filterFn),
      };
    }

    return { taskMembers, allOtherMembers };
  }, [searchQuery, availableUsers, boardMemberIdsArray, boardMembers, isAgent]);

  // All users (for non-checklist contexts or when not showing task members)
  const allUsers = useMemo(() => {
    if (showTaskMembers) return [];
    const q = searchQuery.toLowerCase();
    const users = availableUsers || [];
    if (!q) return users;
    return users.filter((u: any) => {
      return (
        u.info?.name?.toLowerCase().includes(q) ||
        u.info?.email?.toLowerCase().includes(q) ||
        u.login?.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, availableUsers, showTaskMembers]);

  // Get the list of users to display (sorted with selected items first)
  const displayUsers = useMemo(() => {
    let users: any[] = [];
    if (showTaskMembers) {
      // For checklist contexts, combine task members and all other members when expanded
      if (isAllMembersExpanded) {
        users = [...taskMembers, ...allOtherMembers];
      } else {
        users = taskMembers;
      }
    } else {
      users = allUsers;
    }

    // Sort: selected items first, then unselected items
    return users.sort((a, b) => {
      const aSelected = localSelectedIds.includes(a._id);
      const bSelected = localSelectedIds.includes(b._id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0; // Keep original order for items with same selection status
    });
  }, [showTaskMembers, taskMembers, allOtherMembers, allUsers, isAllMembersExpanded, localSelectedIds]);

  // Check if all visible users are selected
  const allVisibleUsersSelected = useMemo(() => {
    if (displayUsers.length === 0) return false;
    return displayUsers.every((user) => localSelectedIds.includes(user._id));
  }, [displayUsers, localSelectedIds]);

  // Check if some visible users are selected (for indeterminate state)
  const someVisibleUsersSelected = useMemo(() => {
    if (displayUsers.length === 0) return false;
    const selectedCount = displayUsers.filter((user) => localSelectedIds.includes(user._id)).length;
    return selectedCount > 0 && selectedCount < displayUsers.length;
  }, [displayUsers, localSelectedIds]);

  // Handle select all / deselect all
  const handleSelectAll = () => {
    if (allVisibleUsersSelected) {
      // Deselect all visible users
      const visibleUserIds = displayUsers.map((user) => user._id);
      if (isAgent) {
        const lockedIds = displayUsers
          .filter((user) => isAdminUser(user) || (currentUserId && user?._id === currentUserId))
          .map((user) => user._id);
        setLocalSelectedIds((prev) =>
          prev.filter((id) => !visibleUserIds.includes(id) || lockedIds.includes(id))
        );
      } else {
        setLocalSelectedIds((prev) => prev.filter((id) => !visibleUserIds.includes(id)));
      }
      // Mark that Select All was used (for deselecting)
      setIsSelectAllUsed(true);
      setSelectAllWasSelecting(false);
    } else {
      // Select all visible users
      const visibleUserIds = displayUsers.map((user) => user._id);
      setLocalSelectedIds((prev) => {
        const newIds = [...prev];
        visibleUserIds.forEach((id) => {
          if (!newIds.includes(id)) {
            newIds.push(id);
          }
        });
        return newIds;
      });
      // Mark that Select All was used (for selecting)
      setIsSelectAllUsed(true);
      setSelectAllWasSelecting(true);
    }
  };

  const handleToggleMember = (memberId: string) => {
    const member = userById.get(memberId);
    if (
      isAgent &&
      localSelectedIds.includes(memberId) &&
      ((member && isAdminUser(member)) || (currentUserId && memberId === currentUserId))
    ) {
      return;
    }
    setLocalSelectedIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
    // Reset Select All flag when manually toggling individual members
    setIsSelectAllUsed(false);
    setSelectAllWasSelecting(false);

    // Auto-save if enabled (but not for task context - task always uses Apply/Cancel)
    // Also not for checklist-item and checklist - they use Save button
    if (autoSave && context !== 'task' && context !== 'checklist-item' && context !== 'checklist') {
      handleSave(memberId);
    }
  };

  // Check if selected members are board members
  // Exclude members who are already assigned (they're "grandfathered in")
  // Works for: task, checklist-item, and checklist contexts
  const checkNonBoardMembers = useCallback((memberIds: string[]): string[] => {
    // If we shouldn't fetch board, skip validation
    if (!shouldFetchBoard) return [];

    // If board data is still loading, return empty (wait for data to load)
    if (isBoardLoading) return [];

    // If board data hasn't loaded yet, return empty (wait for data)
    if (!boardResponse) return [];

    // Now we have board data (even if empty), proceed with validation
    const boardMemberIdsSet = new Set(boardMemberIds);

    // For task context, also include subTask members (checklist and checklist item members)
    // These are also "grandfathered in" - no warning needed
    const allAssignedIdsSet = new Set(initialSelectedIds);
    if (context === 'task' && subTaskMemberIdsArray.length > 0) {
      subTaskMemberIdsArray.forEach((id) => allAssignedIdsSet.add(id));
    }

    // Filter out:
    // 1. Members who ARE board members (no warning needed)
    // 2. Members who are already assigned to task/checklist-item/checklist (no warning needed - they're grandfathered in)
    // 3. For task context: Members who are assigned to subTasks (checklists/checklist items) (no warning needed - they're grandfathered in)
    return memberIds.filter((id) => {
      const isBoardMember = boardMemberIdsSet.has(id);
      const isAlreadyAssigned = allAssignedIdsSet.has(id);
      // Only show warning for non-board members who are NOT already assigned
      return !isBoardMember && !isAlreadyAssigned;
    });
  }, [shouldFetchBoard, boardMemberIds, initialSelectedIds, boardResponse, isBoardLoading, context, subTaskMemberIdsArray]);

  // Get names of non-board members for display
  const getNonBoardMemberNames = useCallback((nonBoardMemberIds: string[]): string[] => {
    if (!availableUsers) return [];
    return nonBoardMemberIds
      .map((id) => {
        const user = availableUsers.find((u: any) => u._id === id);
        return user?.info?.name || user?.login || id;
      })
      .filter(Boolean);
  }, [availableUsers]);

  const handleSave = (toggledMemberId?: string) => {
    const memberIds = toggledMemberId
      ? (localSelectedIds.includes(toggledMemberId)
        ? localSelectedIds.filter((id) => id !== toggledMemberId)
        : [...localSelectedIds, toggledMemberId])
      : localSelectedIds;

    // Check for non-board members (only for task/checklist contexts)
    if (shouldFetchBoard && (context === 'task' || context === 'checklist-item' || context === 'checklist')) {
      const nonBoardMemberIds = checkNonBoardMembers(memberIds);

      if (nonBoardMemberIds.length > 0) {
        // Show warning dialog
        setPendingMemberIds(memberIds);
        setShowNonBoardMemberWarning(true);
        return;
      }
    }

    // Proceed with save
    proceedWithSave(memberIds);
  };

  const proceedWithSave = (memberIds: string[]) => {
    // Use custom callback if provided (for checklist-item and checklist contexts)
    if (onAssign) {
      // Call the parent callback which handles the API call
      if (context === 'checklist-item') {
        // For checklist-item, call the callback
        // The parent callback (handleAssignMembers) will close the dropdown and make the API call
        onAssign(memberIds);
        // Don't close here - let handleAssignMembers handle it
      } else if (context === 'checklist') {
        // For checklist context, just call the callback
        // The parent callback (handleChecklistAssign) will close the dropdown
        onAssign(memberIds);
      } else {
        // For other contexts
        onAssign(memberIds);
        if (!autoSave) {
          onClose();
        }
      }
      return;
    }

    // Default behavior based on context
    switch (context) {
      case 'task':
        if (!taskId) return;
        const taskData: any = { assigned: memberIds };
        if (boardIdString) taskData.board_id = boardIdString;
        updateTask(
          { id: taskId, data: taskData },
          {
            onSuccess: (response) => {
              onTaskUpdated?.(response.data);
            },
          }
        );
        break;

      case 'board':
        if (!boardId) return;
        const boardIdForUpdate = typeof boardId === 'string' ? boardId : (Array.isArray(boardId) && boardId.length > 0 ? (typeof boardId[0] === 'string' ? boardId[0] : (boardId[0] as any)?._id) : undefined);
        if (!boardIdForUpdate) return;

        // If Select All was used to SELECT all, send all_agent: true
        // If Select All was used to DESELECT all, send empty members array
        if (isSelectAllUsed && context === 'board') {
          if (selectAllWasSelecting && memberIds.length > 0) {
            // Select All was clicked to SELECT all visible users - send all_agent: true
            updateBoard(
              { id: boardIdForUpdate, data: { board_id: boardIdForUpdate, all_agent: true } },
              {
                onSuccess: () => {
                  setIsSelectAllUsed(false); // Reset flag after successful save
                  setSelectAllWasSelecting(false);
                  if (!autoSave) onClose();
                }
              }
            );
          } else {
            // Select All was clicked to DESELECT all - clear assignment
            updateBoard(
              { id: boardIdForUpdate, data: { board_id: boardIdForUpdate, members: [] } },
              {
                onSuccess: () => {
                  setIsSelectAllUsed(false); // Reset flag after successful save
                  setSelectAllWasSelecting(false);
                  if (!autoSave) onClose();
                }
              }
            );
          }
        } else {
          // Normal selection - send individual member IDs
          updateBoard(
            { id: boardIdForUpdate, data: { board_id: boardIdForUpdate, members: memberIds } },
            { onSuccess: () => !autoSave && onClose() }
          );
        }
        break;

      case 'checklist-item':
      case 'checklist':
        // These should use onAssign callback from parent
        // The parent handles the complex payload structure
        // If no callback provided, do nothing
        break;
      default:
        // Unknown context, do nothing
        break;
    }

    if (!autoSave) onClose();
  };

  const handleConfirmNonBoardMembers = () => {
    const memberIdsToSave = [...pendingMemberIds];
    // Close the warning dialog first
    setShowNonBoardMemberWarning(false);
    setPendingMemberIds([]);
    // Use requestAnimationFrame to ensure state updates are processed
    // Then call proceedWithSave - this ensures activeItemId is still available for checklist-item
    requestAnimationFrame(() => {
      proceedWithSave(memberIdsToSave);
    });
  };

  const handleCancelNonBoardMembers = () => {
    setShowNonBoardMemberWarning(false);
    setPendingMemberIds([]);
  };

  const handleDropdownClose = useCallback(() => {
    if (showNonBoardMemberWarning) return;
    setIsSelectAllUsed(false); // Reset Select All flag when closing
    setSelectAllWasSelecting(false);
    onClose();
  }, [showNonBoardMemberWarning, onClose]);

  const handleCancel = useCallback(() => {
    // Restore to initial selection
    setLocalSelectedIds(initialSelectedIds);
    setIsSelectAllUsed(false); // Reset Select All flag when canceling
    setSelectAllWasSelecting(false);
    onClose();
  }, [initialSelectedIds, onClose]);

  const getTitle = () => {
    if (title) return title;
    switch (context) {
      case 'task': return 'Members';
      case 'board': return 'Board Members';
      case 'checklist-item': return 'Assign';
      case 'checklist': return 'Assign';
      default: return 'Members';
    }
  };

  const renderUserList = (users: any[]) => {
    if (users.length === 0) return null;

    // Sort users: selected items first
    const sortedUsers = [...users].sort((a, b) => {
      const aSelected = localSelectedIds.includes(a._id);
      const bSelected = localSelectedIds.includes(b._id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0; // Keep original order for items with same selection status
    });

    return sortedUsers.map((u: any) => {
      const selected = localSelectedIds.includes(u._id);
      const isLockedAdmin = isAgent && isAdminUser(u) && selected;
      const isLockedSelf = isAgent && currentUserId && u?._id === currentUserId && selected;
      const isLocked = isLockedAdmin || isLockedSelf;
      const name = u.info?.name || u.login;

      return (
        <label
          key={u._id}
          className={`flex items-center gap-2 px-4 py-2 ${
            isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'
          }`}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <input
            type="checkbox"
            checked={selected}
            disabled={isLocked as boolean}
            onChange={(e) => {
              e.stopPropagation();
              handleToggleMember(u._id);
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-black"
          />
          <span className="text-sm text-gray-700">{name}</span>
        </label>
      );
    });
  };

  // Get non-board member names for warning dialog
  const nonBoardMemberIds = useMemo(() => {
    if (!showNonBoardMemberWarning) return [];
    return checkNonBoardMembers(pendingMemberIds);
  }, [showNonBoardMemberWarning, pendingMemberIds, checkNonBoardMembers]);

  const nonBoardMemberNames = useMemo(() => {
    return getNonBoardMemberNames(nonBoardMemberIds);
  }, [nonBoardMemberIds, getNonBoardMemberNames]);

  return (
    <>
      <SmartDropdown
        isOpen={isOpen}
        onClose={handleDropdownClose}
        triggerRef={triggerRef}
        dropdownWidth={256}
        dropdownHeight={500}
      >
        <div 
          className="rounded-md border border-gray-200 bg-white shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
            <h3 className="text-sm font-semibold text-gray-700">{getTitle()}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleCancel();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              className="rounded p-1 text-gray-400 hover:text-gray-600"
              title="Close"
            >
              <ApolloIcon name="cross" className="text-sm" />
            </button>
          </div>

          {/* Search Input - Always show for checklist contexts, or when more than 5 users */}
          {(context === 'checklist-item' || context === 'checklist' || displayUsers.length > -1) && (
            <div className="border-b border-gray-200 px-4 py-2">
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => {
                  e.stopPropagation();
                  setSearchQuery(e.target.value);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          )}

          {/* Member List */}
          <div className="max-h-64 overflow-y-auto">
            {isMembersLoading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">Loading members...</div>
            ) : (
              <>
                {/* Select All */}
                {displayUsers.length > 0 && (
                  <div className="border-b border-gray-200 px-4 py-2">
                    <label 
                      className="flex cursor-pointer items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={allVisibleUsersSelected}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = someVisibleUsersSelected && !allVisibleUsersSelected;
                          }
                        }}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectAll();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-black"
                      />
                      <span className="text-sm font-medium text-gray-700">Select All</span>
                    </label>
                  </div>
                )}

                {/* Task Members Section (for checklist contexts) */}
                {showTaskMembers && isTaskMembersExpanded && taskMembers.length > 0 && (
                  <div className="border-b border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <ChevronDown className="h-4 w-4" />
                      <span>Board Members</span>
                    </button>
                    <div className="divide-y divide-gray-100">
                      {renderUserList(taskMembers)}
                    </div>
                  </div>
                )}

                {/* All Members Section */}
                <div>
                  {showTaskMembers && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setManualAllMembersExpanded(!manualAllMembersExpanded);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {isAllMembersExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span>All Members</span>
                    </button>
                  )}
                  {showTaskMembers && !isAllMembersExpanded ? null : (
                    allUsers.length === 0 && allOtherMembers.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-500">
                        {searchQuery ? 'No members found' : 'No members available'}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {renderUserList(showTaskMembers ? allOtherMembers : allUsers)}
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer Actions - Always show for task context, or when autoSave is false */}
          {(!autoSave || context === 'task') && (
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleCancel();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              >
                Cancel
              </Button>
              <Button
                variant="solid"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleSave();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                disabled={context === 'board' && isBoardPending}
              >
                {context === 'board' && isBoardPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </SmartDropdown>

      {/* Warning Dialog for Non-Board Members */}
      {showNonBoardMemberWarning && (
        <ConfirmDialog
          isOpen={showNonBoardMemberWarning}
          onClose={handleCancelNonBoardMembers}
          onCancel={handleCancelNonBoardMembers}
          onConfirm={handleConfirmNonBoardMembers}
          title="Warning: Non-Board Members"
          confirmText="Continue"
          cancelText="Cancel"
          confirmButtonProps={{ variant: 'success' }}
          stopPropagation={true}
        >
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              The following {nonBoardMemberNames.length === 1 ? 'member is' : 'members are'} not part of this board:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 overflow-y-auto max-h-40">
              {nonBoardMemberNames.map((name, index) => (
                <li key={index}>{name}</li>
              ))}
            </ul>
            <p className="text-sm text-gray-700 mt-3">
              Do you want to continue and assign {nonBoardMemberNames.length === 1 ? 'this member' : 'these members'} anyway?
            </p>
          </div>
        </ConfirmDialog>
      )}
    </>
  );
};
