import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import { ChevronDown, Moon, Sun, Users } from 'lucide-react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import {
  useBoards,
  useInitializeSystemBoards,
  useDeleteBoard,
  useBoard,
  useBoardsRealtime,
  useCreateBoard,
  useUpdateBoard,
} from '@/hooks/useBoards';
import { useKanban } from '../_contexts';
import { BoardDropdown } from './BoardDropdown';
import { UnifiedMemberAssignment } from './MemberComponents/UnifiedMemberAssignment';
import { useTodoBoardUsers } from '@/services/hooks/useUsers';
import { MemberAvatarGroup } from './MemberComponents/MemberAvatarGroup';
import { ListStatusBar } from './ListStatusBar';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { Role } from '@/configs/navigation.config/auth.route.config';
import RoleGuard from '@/components/shared/RoleGuard';

interface KanbanViewHeaderProps {
  viewType: 'board' | 'table';
  onViewTypeChange: (view: 'board' | 'table') => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const KanbanViewHeader: React.FC<KanbanViewHeaderProps> = ({
  viewType,
  onViewTypeChange,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const { selectedBoardId, loadBoard, setSelectedBoardId, setBoardData, boardData } = useKanban();
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [updatingBoardId, setUpdatingBoardId] = useState<string | null>(null);
  const [isBoardMembersDropdownOpen, setIsBoardMembersDropdownOpen] = useState(false);
  const boardMembersButtonRef = useRef<HTMLButtonElement>(null);

  const deleteBoardMutation = useDeleteBoard();
  const createBoardMutation = useCreateBoard();
  const updateBoardMutation = useUpdateBoard();

  // Fetch boards from API
  const {
    data: boardsResponse,
    isLoading: isLoadingBoards,
    refetch: refetchBoards,
  } = useBoards({
    is_deleted: false,
  });

  // Track previous board count to detect first board invitation
  const prevBoardCountRef = useRef<number | null>(null);

  // Callback when user is invited to a board
  const handleBoardInvitedRealtime = useCallback((boardId: string) => {
    // If user had no boards before OR no board is currently selected, auto-load the newly assigned board
    // This handles: first board ever, re-added after removal, or any case where skeleton is showing
    if (prevBoardCountRef.current === 0 || !selectedBoardId) {
      // Small delay to ensure the query has been invalidated and refetched
      setTimeout(() => {
        loadBoard(boardId).catch((err) => {
          console.error('Failed to auto-load invited board:', err);
        });
      }, 500);
    }
  }, [selectedBoardId, loadBoard]);

  // Callback when user is removed from a board
  const handleBoardRemovedRealtime = useCallback((removedBoardId: string) => {
    // Check if the removed board is the currently selected one
    if (selectedBoardId === removedBoardId) {
      // Small delay to ensure the query has been invalidated and refetched
      setTimeout(async () => {
        // Refetch boards to get updated list
        const result = await refetchBoards();
        const updatedBoards = result.data?.data || [];

        if (updatedBoards.length > 0) {
          // Switch to another available board
          const nextBoard = updatedBoards[0];
          loadBoard(nextBoard._id).catch((err) => {
            console.error('Failed to load next board after removal:', err);
          });
        } else {
          // No boards left - clear selection to show skeleton
          setSelectedBoardId(null);
          // Clear board data to show skeleton
          setBoardData({
            cards: {},
            columns: {},
            columnOrder: [],
          });
          // Update the ref so handleBoardInvitedRealtime knows user has 0 boards
          prevBoardCountRef.current = 0;
        }
      }, 500);
    }
  }, [selectedBoardId, refetchBoards, loadBoard, setSelectedBoardId, setBoardData]);

  // Enable real-time updates for boards list (admin room) with callbacks
  useBoardsRealtime({
    onBoardInvited: handleBoardInvitedRealtime,
    onBoardRemoved: handleBoardRemovedRealtime,
  });

  // Update previous board count after boards are loaded
  useEffect(() => {
    if (!isLoadingBoards && boardsResponse?.data) {
      prevBoardCountRef.current = boardsResponse.data.length;
    }
  }, [isLoadingBoards, boardsResponse?.data]);

  // Fetch current board details to get full member information
  const { data: boardDetailsResponse } = useBoard(selectedBoardId || null, !!selectedBoardId);
  const initialized = (boardsResponse as any)?.meta?.initialized ?? false;

  // Initialize system boards mutation
  const initializeSystemBoardsMutation = useInitializeSystemBoards();

  const viewOptions = [
    { value: 'board', label: 'Board', icon: 'server-database' },
    { value: 'table', label: 'Table', icon: 'table-file', disabled: true },
  ];

  // Transform boards to dropdown options - include full board objects
  const boardOptions = useMemo(() => {
    if (!boardsResponse?.data) return [];
    return boardsResponse.data.map((board) => ({
      value: board._id,
      label: board.name,
      board: board,
    }));
  }, [boardsResponse]);

  const currentBoard = useMemo(() => {
    if (!selectedBoardId) return null;
    if (boardDetailsResponse?.data) {
      if (boardDetailsResponse.data.board) {
        return boardDetailsResponse.data.board;
      }
      return boardDetailsResponse.data;
    }
    // Fallback to list data
    if (boardsResponse?.data) {
      return boardsResponse.data.find((b) => b._id === selectedBoardId);
    }
    return null;
  }, [selectedBoardId, boardsResponse, boardDetailsResponse]);

  const currentViewLabel = viewOptions.find((opt) => opt.value === viewType)?.label || 'Board';
  const totalBoardTaskCount = boardData?.totalBoardTaskCount;
  const currentItemLabel = currentBoard?.name || 'Select board';

  const handleBoardSelect = async (boardId: string) => {
    try {
      await loadBoard(boardId);
    } catch {
      // Error loading board
    }
  };

  const handleCreateBoard = async (payload: { name: string; description?: string; onlyMe: boolean }) => {
    const response = await createBoardMutation.mutateAsync({
      name: payload.name.trim(),
      board_type: 'CUSTOM',
      description: payload.description,
      onlyMe: payload.onlyMe,
    });

    await refetchBoards();

    const createdBoardId = response?.data?._id;
    if (!createdBoardId) return;

    try {
      await loadBoard(createdBoardId);
    } catch {
      // Error loading newly created board
    }
  };

  const handleUpdateBoard = useCallback(async (payload: {
    id: string;
    name: string;
    description?: string;
    onlyMe: boolean;
  }) => {
    setUpdatingBoardId(payload.id);
    try {
      await updateBoardMutation.mutateAsync({
        id: payload.id,
        data: {
          name: payload.name.trim(),
          description: payload.description,
          onlyMe: payload.onlyMe,
        },
      });

      toast.push(
        <Notification title="Success" type="success">
          Board updated successfully
        </Notification>
      );

      await refetchBoards();
      if (selectedBoardId === payload.id) {
        await loadBoard(payload.id);
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to update board. Please try again.';

      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setUpdatingBoardId(null);
    }
  }, [updateBoardMutation, refetchBoards, selectedBoardId, loadBoard]);

  const handleDeleteBoard = useCallback(async (boardId: string) => {
    setDeletingBoardId(boardId);
    const wasActiveBoard = selectedBoardId === boardId;
    try {
      await deleteBoardMutation.mutateAsync(boardId);

      toast.push(
        <Notification title="Success" type="success">
          Board deleted successfully
        </Notification>
      );

      const result = await refetchBoards();
      const updatedBoards = result.data?.data ?? [];

      // If we deleted the active board, select and load the first remaining board
      if (wasActiveBoard && updatedBoards.length > 0) {
        const firstBoard = updatedBoards[0];
        await loadBoard(firstBoard._id);
      } else if (wasActiveBoard && updatedBoards.length === 0) {
        setSelectedBoardId(null);
        setBoardData({ cards: {}, columns: {}, columnOrder: [] });
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to delete board. Please try again.';

      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    } finally {
      setDeletingBoardId(null);
    }
  }, [selectedBoardId, deleteBoardMutation, refetchBoards, setSelectedBoardId, loadBoard, setBoardData]);

  const handleInitializeSystemBoards = async () => {
    try {
      const response = await initializeSystemBoardsMutation.mutateAsync();

      toast.push(
        <Notification title="Success" type="success">
          {response.message || 'System boards initialized successfully'}
        </Notification>
      );

      // Refetch boards to update the list
      await refetchBoards();

      // Optionally load the first board after initialization
      if (response.data?.boards && response.data.boards.length > 0) {
        const firstBoard = response.data.boards[0];
        await loadBoard(firstBoard._id);
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to initialize system boards. Please try again.';

      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    }
  };

  // Auto-load board when boards are fetched
  useEffect(() => {
    if (!isLoadingBoards && boardsResponse?.data && boardsResponse.data.length > 0) {
      // Case 1: Board is selected (possibly from storage) but data not loaded
      if (selectedBoardId && Object.keys(boardData.columns).length === 0) {
        loadBoard(selectedBoardId).catch(() => {
          // Error loading selected board
        });
        return;
      }

      // Case 2: No board is selected, auto-load first board
      if (!selectedBoardId) {
        const firstBoard = boardsResponse.data[0];
        loadBoard(firstBoard._id).catch(() => {
          // Error auto-loading first board
        });
      }
    }
  }, [isLoadingBoards, boardsResponse, selectedBoardId, loadBoard, boardData.columns]);

  // Extract member IDs from the nested structure
  const boardMemberIds = useMemo(() => {
    const members = currentBoard?.members || [];
    if (members.length === 0) return [];

    return members
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
  }, [currentBoard?.members]);

  // Fetch user details for display
  const { data: usersData } = useTodoBoardUsers(
    { limit: 100, active: true },
    { enabled: !!selectedBoardId && boardMemberIds.length > 0 }
  );

  // Get member details for display - use API response data directly as primary source
  const displayMembers = useMemo(() => {
    const members = currentBoard?.members || [];
    if (members.length === 0) return [];

    return members
      .map((m: any) => {
        // Extract user ID and login from nested structure
        let userId: string | null = null;
        let login: string | null = null;

        if (m?.user_id) {
          if (typeof m.user_id === 'string') {
            userId = m.user_id;
          } else if (typeof m.user_id === 'object' && m.user_id._id) {
            userId = m.user_id._id;
            login = m.user_id.login || null;
          }
        } else if (typeof m === 'string') {
          userId = m;
        } else {
          userId = m?._id || m?.id || null;
        }

        if (!userId) return null;

        // Try to get full user details if available
        let name = login || 'Unknown';
        if (usersData?.data) {
          const user = usersData.data.find((u: any) => u._id === userId);
          if (user) {
            name = user.info?.name || user.login || login || 'Unknown';
          }
        }

        return {
          id: userId,
          name: name,
          login: login || name,
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; login: string }>;
  }, [currentBoard?.members, usersData]);

  return (
    <div className=" border-ocean-2/50 flex flex-col gap-3 border-b bg-white px-4 py-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 px-3">
        {/* View Type Dropdown */}
        <Dropdown
          title={currentViewLabel}

          renderTitle={
            <div className="border-ocean-2/30 hover:border-ocean-2/50 flex items-center gap-2 rounded-lg border bg-white px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
              <ApolloIcon
                name={viewOptions.find((opt) => opt.value === viewType)?.icon as any}
                className="text-sm"
              />
              <span>{currentViewLabel}</span>
              <ChevronDown className="h-4 w-4" />
            </div>
          }
        >
          {viewOptions.map((option) => (
            <Dropdown.Item
              style={{ height: '32px' }}
              disabled={option.disabled}
              key={option.value}
              eventKey={option.value}

              active={viewType === option.value}
              onSelect={() => onViewTypeChange(option.value as 'board' | 'table')}
            >
              <ApolloIcon name={option.icon as any} className="text-sm" />
              {option.label}
            </Dropdown.Item>
          ))}
        </Dropdown>

        {/* Boards Dropdown */}
        <BoardDropdown
          currentLabel={currentItemLabel}
          boardOptions={boardOptions}
          selectedBoardId={selectedBoardId}
          isLoading={isLoadingBoards}
          onBoardSelect={handleBoardSelect}
          onCreateBoard={handleCreateBoard}
          isCreatingBoard={createBoardMutation.isPending}
          onUpdateBoard={handleUpdateBoard}
          isUpdatingBoard={updateBoardMutation.isPending}
          updatingBoardId={updatingBoardId}
          onDeleteBoard={handleDeleteBoard}
          deletingBoardId={deletingBoardId}
          totalBoardTaskCount={totalBoardTaskCount || 0}
        />

        {/* Initialize System Boards Button */}
        {!initialized && (
          <RoleGuard role={Role.ADMIN}>
            <Button
              onClick={handleInitializeSystemBoards}
              loading={initializeSystemBoardsMutation.isPending}
              disabled={initializeSystemBoardsMutation.isPending}
              variant="solid"
              size="sm"
              icon={<ApolloIcon name="sendgrid" />}
              className="border-ocean-2/30 hover:border-ocean-2/50 rounded-lg border bg-white px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Initialize
            </Button>
          </RoleGuard>
        )}
      </div>

      {/* Right side - ListStatusBar, avatars, dark/light toggle (immediately before Members), Members */}
      {selectedBoardId && currentBoard && (
        <div className="flex items-center gap-3">
          {/* List Status Bar */}
          <div className="w-64">
            <ListStatusBar boardId={selectedBoardId} />
          </div>
          {/* Member Avatars */}
          {displayMembers.length > 0 && (
            <MemberAvatarGroup
              members={displayMembers}
              maxCount={5}
              size={26}
              onOmittedAvatarClick={() => setIsBoardMembersDropdownOpen(true)}
              className="cursor-pointer mt-1"
            />
          )}

          {/* Dark/Light mode toggle - immediately before Members */}
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={!!isDarkMode}
              onChange={() => onToggleDarkMode?.()}
              aria-label="Toggle dark mode"
            />
            <span className="h-6 w-11 rounded-full border border-gray-300 bg-white shadow-inner transition-colors duration-200 peer-checked:bg-gray-900 peer-checked:border-gray-700" />
            <span className="absolute left-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-gray-700 shadow-sm transition-transform duration-200 peer-checked:translate-x-5 peer-checked:border-gray-600 peer-checked:bg-gray-700 peer-checked:text-gray-200">
              {isDarkMode ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
            </span>
          </label>

          <RoleGuard role={Role.ADMIN}>
            <Button
              ref={boardMembersButtonRef}
              icon={<Users className="h-4 w-4" />}
              size="sm"
              variant="default"
              onClick={() => setIsBoardMembersDropdownOpen(true)}>
              Members
            </Button>
          </RoleGuard>
        </div>
      )}

      {/* Bottom row: List Status Bar */}


      {/* Board Members Dropdown */}
      <RoleGuard role={Role.ADMIN}>
        {selectedBoardId && currentBoard && (
          <UnifiedMemberAssignment
            isOpen={isBoardMembersDropdownOpen}
            onClose={() => setIsBoardMembersDropdownOpen(false)}
            triggerRef={boardMembersButtonRef as React.RefObject<HTMLElement>}
            context="board"
            boardId={selectedBoardId}
            assignedMemberIds={currentBoard?.members || []}
            title="Board Members"
          />
        )}
      </RoleGuard>
    </div>
  );
};
