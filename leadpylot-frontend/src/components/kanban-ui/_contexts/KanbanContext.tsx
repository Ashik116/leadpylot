/* eslint-disable eqeqeq */
'use client';

import Notification from '@/components/ui/Notification';
import { toast } from '@/components/ui/toast';
import { useBoards } from '@/hooks/useBoards';
import { useLabels, useLabelsRealtime } from '@/hooks/useLabels';
import { useDeleteTask } from '@/hooks/useTasks';
import { Board, apiDeleteList, apiGetBoardFull, apiGetListTasks } from '@/services/BoardService';
import { ApiTask, apiGetAllTasks } from '@/services/TaskService';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { BoardData, List, Task } from '../types';
import { normalizeColumns } from '../_utils/dragUtils';

// ============================================================================
// Types
// ============================================================================

interface KanbanContextValue {
  // State
  boardData: BoardData;
  inboxCards: Task[];
  activeCardId: string | null;
  activeCard: Task | null;
  viewType: 'board' | 'table';
  itemType: 'leads' | 'offers' | 'openings';
  selectedBoardId: string | null;
  isDeletingTask: boolean;
  isInboxLoading: boolean;
  isKanbanLoading: boolean;
  inboxFilter: 'inbox' | 'email';
  boardLabels: Array<{ _id: string; title: string; color: string }>;
  isDraggingFromInbox: boolean;
  availableBoards: Board[];
  /** Whether the board selection grid is shown (during drag from inbox) */
  isBoardSelectionMode: boolean;
  /** Whether board selection has been completed during this drag session */
  hasBoardSelectionCompleted: boolean;
  /** Whether currently hovering over the switch board handle */
  isOverSwitchHandle: boolean;
  setIsOverSwitchHandle: (isOver: boolean) => void;

  // Card operations
  updateCard: (updatedCard: Task) => void;
  updateInboxCard: (updatedApiTask: ApiTask) => void;
  syncTaskFromApi: (apiTask: ApiTask) => void;
  addCard: (listId: string, title: string) => void;
  addInboxCard: (title: string) => void;
  deleteCard: (cardId: string) => Promise<void>;
  getAllCards: () => Task[];

  // List operations
  addList: (title?: string, listId?: string) => void;
  updateListTitle: (listId: string, title: string) => void;
  deleteList: (listId: string) => void;
  setListBackgroundColor: (listId: string, color: string) => void;

  // Active card
  setActiveCardId: (id: string | null) => void;
  closeCardModal: () => void;

  // View type
  setViewType: (type: 'board' | 'table') => void;
  setItemType: (type: 'leads' | 'offers' | 'openings') => void;

  // Board management
  setSelectedBoardId: (id: string | null) => void;
  loadBoard: (boardId: string) => Promise<void>;
  loadListTasks: (
    boardId: string,
    listId: string,
    params?: { cursor?: string; page?: number; limit?: number }
  ) => Promise<any>;
  loadInboxTasks: (params?: { page?: number; limit?: number }) => Promise<any>;
  setInboxFilter: (filter: 'inbox' | 'email') => void;

  // Drag and drop
  setBoardData: React.Dispatch<React.SetStateAction<BoardData>>;
  setInboxCards: React.Dispatch<React.SetStateAction<Task[]>>;
  findContainer: (id: string) => string | undefined;
  isList: (id: string) => boolean;
  setIsDraggingFromInbox: (isDragging: boolean) => void;
  setIsBoardSelectionMode: (isSelectionMode: boolean) => void;
}

// ============================================================================
// Context
// ============================================================================

const KanbanContext = createContext<KanbanContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface KanbanProviderProps {
  children: ReactNode;
  initialBoardData: BoardData;
  initialInboxCards: Task[];
}

export const KanbanProvider: React.FC<KanbanProviderProps> = ({
  children,
  initialBoardData,
  initialInboxCards,
}) => {
  const [boardData, setBoardData] = useState<BoardData>(initialBoardData);
  const [isKanbanLoading, setIsKanbanLoading] = useState<boolean>(false);
  const [inboxCards, setInboxCards] = useState<Task[]>(initialInboxCards);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'board' | 'table'>('board');
  const [itemType, setItemType] = useState<'leads' | 'offers' | 'openings'>('leads');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isInboxLoading, setIsInboxLoading] = useState<boolean>(false);
  const [inboxFilter, setInboxFilter] = useState<'inbox' | 'email'>('inbox');
  const openCardIdFromQuery = useSearchParams().get('opc');

  const [boardLabels, setBoardLabels] = useState<
    Array<{ _id: string; title: string; color: string }>
  >([]);
  const [isDraggingFromInbox, setIsDraggingFromInboxInternal] = useState<boolean>(false);
  const [isBoardSelectionMode, setIsBoardSelectionModeInternal] = useState<boolean>(false);
  // Track if board selection has been completed during this drag session (use ref to avoid re-renders)
  const boardSelectionCompletedRef = useRef<boolean>(false);
  // State version for components that need to react to it
  const [hasBoardSelectionCompleted, setHasBoardSelectionCompleted] = useState<boolean>(false);
  // Track if hovering over the switch handle (for visual feedback on drag overlay)
  const [isOverSwitchHandle, setIsOverSwitchHandle] = useState<boolean>(false);
  const pathName = usePathname();
  const router = useRouter();
  // Wrapper for setIsDraggingFromInbox to reset completion flag
  const setIsDraggingFromInbox = useCallback((value: boolean) => {
    setIsDraggingFromInboxInternal(value);
    if (value) {
      // Reset completion flag when a NEW drag starts from inbox
      boardSelectionCompletedRef.current = false;
      setHasBoardSelectionCompleted(false);
    } else {
      // Reset all states when drag ends
      boardSelectionCompletedRef.current = false;
      setHasBoardSelectionCompleted(false);
      setIsBoardSelectionModeInternal(false);
    }
  }, []);

  // Wrapper for setIsBoardSelectionMode with completion tracking
  const setIsBoardSelectionMode = useCallback((value: boolean) => {
    if (value) {
      // Only allow entering selection mode if not already completed this drag session
      if (!boardSelectionCompletedRef.current) {
        setIsBoardSelectionModeInternal(true);
      }
    } else {
      // When exiting selection mode, mark as completed for this drag session
      boardSelectionCompletedRef.current = true;
      setHasBoardSelectionCompleted(true);
      setIsBoardSelectionModeInternal(false);
    }
  }, []);

  // Fetch available boards for board selector overlay
  const { data: boardsResponse } = useBoards({
    is_deleted: false,
  });

  const availableBoards = useMemo(() => boardsResponse?.data || [], [boardsResponse?.data]);

  // Fetch labels for the selected board
  const { data: labelsResponse } = useLabels(selectedBoardId, !!selectedBoardId);

  // Enable real-time updates for labels
  useLabelsRealtime(selectedBoardId);

  // Update boardLabels state when labels are fetched
  useEffect(() => {
    if (labelsResponse?.data && Array.isArray(labelsResponse.data)) {
      setBoardLabels(labelsResponse.data);
    } else {
      setBoardLabels([]);
    }
  }, [labelsResponse?.data]);

  // Persistence for selectedBoardId
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('selectedBoardId');
      if (saved && !selectedBoardId) {
        setSelectedBoardId(saved);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedBoardId) {
        sessionStorage.setItem('selectedBoardId', selectedBoardId);
      } else {
        // Clear storage if board ID is explicitly set to null (e.g. after deletion)
        // We check if it's already there to avoid clearing on initial mount if not found
        if (sessionStorage.getItem('selectedBoardId')) {
          sessionStorage.removeItem('selectedBoardId');
        }
      }
    }
  }, [selectedBoardId]);

  const deleteTaskMutation = useDeleteTask();

  // Request tracking refs to prevent race conditions
  const inboxRequestIdRef = useRef<number>(0);
  const boardRequestIdRef = useRef<number>(0);

  // Get active card
  const activeCard = useMemo(() => {
    if (!activeCardId) return null;
    return boardData.cards[activeCardId] || inboxCards.find((c) => c.id === activeCardId) || null;
  }, [activeCardId, boardData.cards, inboxCards]);

  // Find container for a card/list
  const findContainer = useCallback(
    (id: string): string | undefined => {
      if (id === 'inbox') return 'inbox';
      if (boardData.columns[id]) return id;
      if (inboxCards.some((c) => c.id === id)) return 'inbox';
      return Object.keys(boardData.columns).find((key) =>
        boardData.columns[key].cardIds.includes(id)
      );
    },
    [boardData.columns, inboxCards]
  );

  // Check if ID is a list
  const isList = useCallback(
    (id: string): boolean => {
      return boardData.columns[id] !== undefined;
    },
    [boardData.columns]
  );

  // Update card
  const updateCard = useCallback((updatedCard: Task) => {
    setBoardData((prev) =>
      prev.cards[updatedCard.id]
        ? { ...prev, cards: { ...prev.cards, [updatedCard.id]: updatedCard } }
        : prev
    );
    setInboxCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
  }, []);

  // Add card to a list
  const addCard = useCallback(
    (listId: string, title: string) => {
      const newId = uuidv4();
      const newCard: Task = {
        id: newId,
        title,
        description: '',
        labels: [],
        members: [],
        checklist: [],
        comments: [],
        emails: [],
        status: boardData.columns[listId]?.title || 'Unknown',
        isCompleted: false,
        leadId: Math.floor(Math.random() * 1000000).toString(),
        agent: 'unassigned',
        project: 'N/A',
        contact: 'New Lead',
        phone: '',
        email: '',
        revenue: '0',
        source: 'Manual',
      };
      setBoardData((prev) => {
        const list = prev.columns[listId];
        return {
          ...prev,
          cards: { ...prev.cards, [newId]: newCard },
          columns: {
            ...prev.columns,
            [listId]: {
              ...list,
              cardIds: [...list.cardIds, newId],
              meta: list.meta
                ? {
                  ...list.meta,
                  total: list.meta.total + 1,
                  taskCount: list.meta.taskCount ? list.meta.taskCount + 1 : list.meta.taskCount,
                }
                : undefined,
            },
          },
          totalBoardTaskCount: prev.totalBoardTaskCount ? prev.totalBoardTaskCount + 1 : undefined,
        };
      });
    },
    [boardData.columns]
  );

  // Add card to inbox
  const addInboxCard = useCallback((title: string) => {
    const newId = uuidv4();
    const newCard: Task = {
      id: newId,
      title,
      description: '',
      labels: [],
      members: [],
      checklist: [],
      comments: [],
      emails: [],
      status: 'Inbox',
      isCompleted: false,
      leadId: Math.floor(Math.random() * 1000000).toString(),
      agent: 'unassigned',
      project: 'N/A',
      contact: 'New Lead',
      phone: '',
      email: '',
      revenue: '0',
      source: 'Manual',
    };
    setInboxCards((prev) => [...prev, newCard]);
  }, []);

  // Delete card
  const deleteCard = useCallback(
    async (cardId: string) => {
      try {
        // Find which list contains this card before removing
        const listId = findContainer(cardId);
        const isInboxCard = listId === 'inbox';

        // Optimistic update
        // Remove from inbox
        setInboxCards((prev) => prev.filter((c) => c.id !== cardId));
        // Remove from board
        setBoardData((prev) => {
          const newCards = { ...prev.cards };
          delete newCards[cardId];
          const newColumns = { ...prev.columns };
          Object.keys(newColumns).forEach((colId) => {
            const hadCard = newColumns[colId].cardIds.includes(cardId);
            newColumns[colId] = {
              ...newColumns[colId],
              cardIds: newColumns[colId].cardIds.filter((id) => id !== cardId),
              // Update meta if card was in this list
              meta: (() => {
                if (!hadCard || !newColumns[colId].meta) return newColumns[colId].meta;
                const currentMeta = newColumns[colId].meta!;
                return {
                  total: Math.max(0, currentMeta.total - 1),
                  taskCount: currentMeta.taskCount
                    ? Math.max(0, currentMeta.taskCount - 1)
                    : currentMeta.taskCount,
                  totalBoardTaskCount: currentMeta.totalBoardTaskCount,
                  page: currentMeta.page,
                  limit: currentMeta.limit,
                  pages: currentMeta.pages,
                  offset: currentMeta.offset,
                  hasMore: currentMeta.hasMore,
                  accessLevel: currentMeta.accessLevel,
                };
              })(),
            };
          });
          return {
            ...prev,
            cards: newCards,
            columns: newColumns,
            totalBoardTaskCount:
              prev.totalBoardTaskCount && !isInboxCard
                ? Math.max(0, prev.totalBoardTaskCount - 1)
                : prev.totalBoardTaskCount,
          };
        });

        // API call
        await deleteTaskMutation.mutateAsync(cardId);

        toast.push(
          <Notification title="Success" type="success">
            Task deleted successfully
          </Notification>
        );
      } catch (error: any) {
        console.error('Error deleting task:', error);
        toast.push(
          <Notification title="Error" type="danger">
            {error?.message || 'Failed to delete task. Please try again.'}
          </Notification>
        );
      }
    },
    [deleteTaskMutation, findContainer]
  );

  // Get all cards
  const getAllCards = useCallback((): Task[] => {
    const boardCards = Object.values(boardData.cards);
    return [...boardCards, ...inboxCards];
  }, [boardData.cards, inboxCards]);

  // Add list
  const addList = useCallback((title: string = 'New List', listId?: string) => {
    const newListId = listId || uuidv4();
    const newList: List = {
      id: newListId,
      title: title.trim() || 'New List',
      cardIds: [],
      backgroundColor: '#ffffff', // Set default white color for new lists
    };
    setBoardData((prev) => ({
      ...prev,
      columns: { ...prev.columns, [newListId]: newList },
      columnOrder: [...prev.columnOrder, newListId],
    }));
  }, []);

  // Update list title
  const updateListTitle = useCallback((listId: string, title: string) => {
    setBoardData((prev) => {
      if (!prev.columns[listId]) return prev;
      return {
        ...prev,
        columns: {
          ...prev.columns,
          [listId]: { ...prev.columns[listId], title },
        },
      };
    });
  }, []);

  // Delete list
  const deleteList = useCallback(async (listId: string) => {
    try {
      // Optimistic update
      setBoardData((prev) => {
        const remainingColumns = { ...prev.columns };
        delete remainingColumns[listId];
        return {
          ...prev,
          columns: remainingColumns,
          columnOrder: prev.columnOrder.filter((id) => id !== listId),
        };
      });

      // API call
      await apiDeleteList(listId);
    } catch (error) {
      console.error('Error deleting list:', error);
      // Revert is complex here since we don't have the previous state easily accessible
      // without capturing it before the setBoardData call.
      // For now, we follow the optimistic pattern used in other places.
    }
  }, []);

  // Set list background color
  const setListBackgroundColor = useCallback((listId: string, color: string) => {
    setBoardData((prev) => {
      if (!prev.columns[listId]) return prev;
      return {
        ...prev,
        columns: {
          ...prev.columns,
          [listId]: { ...prev.columns[listId], backgroundColor: color || undefined },
        },
      };
    });
  }, []);

  // Close card modal
  const closeCardModal = useCallback(() => {
    setActiveCardId(null);
  }, []);

  useEffect(() => {
    if (openCardIdFromQuery) {
      setActiveCardId(openCardIdFromQuery);
      setTimeout(() => {
        router.replace(pathName);
      }, 500);
    }
  }, [openCardIdFromQuery, pathName, router]);

  // Helper function to transform API task to frontend Task
  const transformApiTaskToTask = useCallback((apiTask: ApiTask, listTitle: string): Task => {
    // Extract label IDs from labels array - ensure it's an array with optional chaining
    // const labelIds = Array.isArray(apiTask?.labels)
    //   ? apiTask.labels
    //     .filter((l) => l?.isSelected !== false)
    //     .map((l) => l?._id)
    //     .filter(Boolean)
    //   : [];

    // Extract member IDs from assigned array - ensure it's an array with optional chaining
    const memberIds = Array.isArray(apiTask?.assigned) ? apiTask.assigned.filter(Boolean) : [];

    return {
      id: apiTask?._id || uuidv4(),
      title: apiTask?.taskTitle || '',
      description: apiTask?.taskDescription || '',
      labels: apiTask?.labels || [],
      members: memberIds,
      checklist: [],
      checklists: Array.isArray(apiTask?.subTask)
        ? apiTask.subTask
          .filter((st) => st !== null && st !== undefined && !st?.isDelete && !st?.isDeleted)
          .map((st) => ({
            id: st?._id || uuidv4(),
            title: st?.taskTitle || 'Checklist',
            items: Array.isArray(st?.todo)
              ? st.todo
                .filter((todo: any) => todo !== null && todo !== undefined && !todo?.isDelete && !todo?.isDeleted)
                .map(
                  (todo: {
                    _id?: string;
                    title?: string;
                    isCompleted?: boolean;
                    dueDate?: string;
                    dueTime?: string;
                    assignedMembers?: string[];
                    reminder?: any;
                  }) => ({
                    id: todo?._id || uuidv4(),
                    text: todo?.title || '',
                    completed: todo?.isCompleted || false,
                    dueDate: todo?.dueDate,
                    dueTime: todo?.dueTime,
                    assignedMembers: Array.isArray(todo?.assignedMembers)
                      ? todo.assignedMembers.filter(Boolean)
                      : [],
                    reminder: todo?.reminder,
                  })
                )
              : [],
            hideCheckedItems: false,
            isCompleted: st?.isCompleted || false,
          }))
        : [],
      comments: [],
      emails: [],
      status: listTitle || apiTask?.status || 'Unknown',
      isCompleted: apiTask?.isCompleted || false,
      leadId: apiTask?.lead_id || apiTask?._id || uuidv4(),
      task_type: apiTask?.task_type || undefined,
      agent: 'unassigned',
      project: 'N/A',
      contact: 'New Lead',
      phone: '',
      email: '',
      revenue: '0',
      source: 'Manual',
      dates: apiTask?.dueDate
        ? {
          dueDate: apiTask.dueDate,
        }
        : undefined,
      attachments: Array.isArray(apiTask?.attachment) ? apiTask.attachment.filter(Boolean) : [],
      customFields: Array.isArray(apiTask?.custom_fields)
        ? apiTask.custom_fields
          .filter((cf) => cf !== null && cf !== undefined)
          .map((cf) => ({
            fieldId: cf?._id || cf?.field_id || uuidv4(),
            value: cf?.value,
          }))
        : [],
    };
  }, []);

  // Update inbox card directly from API response
  const updateInboxCard = useCallback(
    (updatedApiTask: ApiTask) => {
      setInboxCards((prev) => {
        const taskIndex = prev.findIndex((task) => task.id === updatedApiTask._id);
        if (taskIndex === -1) {
          // Task not in inbox, do nothing
          return prev;
        }

        // Transform API task to frontend Task
        const transformedTask = transformApiTaskToTask(updatedApiTask, 'Inbox');

        // Update the task in array
        const updated = [...prev];
        updated[taskIndex] = transformedTask;
        return updated;
      });
    },
    [transformApiTaskToTask]
  );

  // Sync task from API to boardData (for board tasks)
  const syncTaskFromApi = useCallback(
    (apiTask: ApiTask) => {
      if (!apiTask?._id) return;

      // Find which list this task belongs to
      const listId = findContainer(apiTask._id);
      if (!listId || listId === 'inbox') return; // Skip inbox tasks

      // Only update if task exists in boardData
      if (!boardData.cards[apiTask._id]) return;

      // Get list title
      const list = boardData.columns[listId];
      const listTitle = list?.title || 'Unknown';

      // Transform API task to frontend Task using existing function
      const transformedTask = transformApiTaskToTask(apiTask, listTitle);

      // Update KanbanContext boardData
      updateCard(transformedTask);
    },
    [boardData.cards, boardData.columns, findContainer, transformApiTaskToTask, updateCard]
  );

  // Load board from API (optimized - full board with lists + initial tasks)
  const loadBoard = useCallback(
    async (boardId: string) => {
      // Request guard: track this request
      const currentRequestId = ++boardRequestIdRef.current;

      try {
        // Set loading state
        setIsKanbanLoading(true);

        // Optimistic update: set selectedBoardId early for immediate UI feedback
        // This will be reverted if the request fails or is superseded
        setSelectedBoardId(boardId);

        // Step 1: Get full board with lists and initial tasks in a single call
        const boardResponse = await apiGetBoardFull(boardId, { task_limit: 10 });
        // Check if this request is still the latest
        if (currentRequestId !== boardRequestIdRef.current) {
          return; // A newer request has started, ignore this response
        }

        const { lists, board, meta } = boardResponse.data;

        // Step 2: Transform lists + tasks to columns and cards
        const columns: Record<string, List> = {};
        const columnOrder: string[] = [];
        const cards: Record<string, Task> = {};

        // Sort lists by position or createdAt
        const sortedLists = [...(lists || [])].sort((a, b) => {
          if (a.position !== undefined && b.position !== undefined) {
            return a.position - b.position;
          }
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        });

        // Step 3: Create columns and map tasks from batch payload
        sortedLists.forEach((list: any, index) => {
          const listId = list.id;
          const listTitle = list.name || `List ${index + 1}`;

          // Create column structure
          columns[listId] = {
            id: listId,
            title: listTitle,
            cardIds: [],
            backgroundColor: list.color || list.backgroundColor,
          };
          columnOrder.push(listId);

          const listTasks = Array.isArray((list as any).tasks) ? (list as any).tasks as ApiTask[] : [];
          const taskIds: string[] = [];

          listTasks.forEach((apiTask: ApiTask) => {
            const taskId = apiTask._id;
            if (!taskId) return;
            taskIds.push(taskId);

            // Transform API task to frontend Task
            const transformedTask = transformApiTaskToTask(apiTask, listTitle);
            cards[taskId] = transformedTask;
          });

          const listTaskCount = (list as any).taskCount as number | undefined;

          // Basic meta derived from batch response; per-list pagination will still use loadListTasks
          const listMeta = {
            total: listTaskCount ?? taskIds.length,
            taskCount: listTaskCount ?? taskIds.length,
            totalBoardTaskCount: meta?.totalTasks,
            page: 1,
            limit: 10,
            pages: listTaskCount != null && listTaskCount > 0 ? Math.ceil(listTaskCount / 10) : 1,
            offset: 0,
            hasMore: listTaskCount != null ? listTaskCount > taskIds.length : false,
            accessLevel: (meta as any)?.accessLevel,
          };

          columns[listId] = {
            ...columns[listId],
            cardIds: taskIds,
            meta: listMeta,
          };
        });

        // Check again if this request is still the latest before updating state
        if (currentRequestId !== boardRequestIdRef.current) {
          return; // A newer request has started, ignore this response
        }

        // Step 4: Extract totalBoardTaskCount from batch meta
        const totalBoardTaskCount = meta?.totalTasks;

        // Step 5: Normalize columns to ensure no duplicate task IDs across columns
        const normalizedColumns = normalizeColumns(columns);

        // Step 6: Update state
        setBoardData({
          board,
          columns: normalizedColumns,
          cards,
          columnOrder,
          totalBoardTaskCount,
        });
        // Note: Removed setInboxCards([]) - loading a board should not clear global inbox tasks
        // selectedBoardId was already set optimistically above, but ensure it's set here too
        // in case the optimistic update was cleared by a newer request
        if (currentRequestId === boardRequestIdRef.current) {
          setSelectedBoardId(boardId);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading board:', error);
        // Only revert selectedBoardId if this is still the latest request
        // (don't revert if a newer request has already started)
        if (currentRequestId === boardRequestIdRef.current) {
          // Revert optimistic update on error
          // Keep previous selectedBoardId if available, or set to null
          const prevBoardId = sessionStorage.getItem('selectedBoardId');
          setSelectedBoardId(prevBoardId || null);
        }
        throw error;
      } finally {
        // Only update loading state if this is still the latest request
        if (currentRequestId === boardRequestIdRef.current) {
          setIsKanbanLoading(false);
        }
      }
    },
    [transformApiTaskToTask]
  );

  // Load tasks for a specific list
  const loadListTasks = useCallback(
    async (
      boardId: string,
      listId: string,
      params?: { cursor?: string; page?: number; limit?: number }
    ) => {
      try {
        const response = await apiGetListTasks(boardId, listId, {
          cursor: params?.cursor,
          page: params?.page,
          limit: params?.limit || 10,
        });
        const newCards: Record<string, Task> = {};
        const newCardIds: string[] = [];

        if (response.data && Array.isArray(response.data)) {
          // Get list title from current board data
          setBoardData((prev) => {
            const list = prev.columns[listId];
            const listTitle = list?.title || 'Unknown';

            response.data.forEach((apiTask: ApiTask) => {
              const taskId = apiTask._id;
              newCardIds.push(taskId);

              // Transform API task to frontend Task
              const transformedTask = transformApiTaskToTask(apiTask, listTitle);
              newCards[taskId] = transformedTask;
            });

            // Update board data with new tasks
            // If cursor or page > 1 is provided, append (pagination). Otherwise, replace (refresh/initial load)
            const existingCardIds = prev.columns[listId]?.cardIds || [];
            let updatedCardIds: string[];

            const isPagination = params?.cursor || (params?.page && params.page > 1);

            if (isPagination) {
              // Pagination: append and deduplicate
              updatedCardIds = [...new Set([...existingCardIds, ...newCardIds])];
            } else {
              // Refresh: replace and deduplicate
              updatedCardIds = [...new Set(newCardIds)];
            }

            // Update meta with complete response meta
            const updatedMeta = response.meta
              ? {
                total: response.meta.total,
                taskCount: (response.meta as any).taskCount,
                totalBoardTaskCount: (response.meta as any).totalBoardTaskCount,
                page: response.meta.page,
                limit: response.meta.limit,
                pages: response.meta.pages,
                offset: (response.meta as any).offset,
                hasMore: (response.meta as any).hasMore,
                accessLevel: (response.meta as any).accessLevel,
              }
              : prev.columns[listId]?.meta;

            // Update columns with new task IDs
            const updatedColumns = {
              ...prev.columns,
              [listId]: {
                ...prev.columns[listId],
                cardIds: updatedCardIds,
                meta: updatedMeta,
              },
            };

            // Normalize columns to ensure no duplicate task IDs across columns
            // This prevents stale server responses from reintroducing duplicates
            const normalizedColumns = normalizeColumns(updatedColumns);

            return {
              ...prev,
              cards: { ...prev.cards, ...newCards },
              columns: normalizedColumns,
              // Update totalBoardTaskCount from meta if available
              totalBoardTaskCount:
                (response.meta as any)?.totalBoardTaskCount ?? prev.totalBoardTaskCount,
            };
          });
        }

        return response.meta;
      } catch (error) {
        console.error(`Error loading tasks for list ${listId}:`, error);
        throw error;
      }
    },
    [transformApiTaskToTask]
  );

  // Load inbox tasks (tasks without board_id or list_id) or email tasks
  const loadInboxTasks = useCallback(
    async (params?: { page?: number; limit?: number }) => {
      // Request guard: track this request
      const currentRequestId = ++inboxRequestIdRef.current;

      try {
        setIsInboxLoading(true);

        const page = params?.page || 1;
        const limit = params?.limit || 10;

        // Call API with appropriate filter based on inboxFilter state
        const apiParams =
          inboxFilter === 'inbox'
            ? { inbox: true, page, limit }
            : { task_type: 'email' as const, inbox: true, page, limit };

        const response = await apiGetAllTasks(apiParams);

        // Check if this request is still the latest
        if (currentRequestId !== inboxRequestIdRef.current) {
          return; // A newer request has started, ignore this response
        }

        // Handle both response structures: array or paginated object
        let tasksArray: ApiTask[] = [];

        if (response.data) {
          if (Array.isArray(response.data)) {
            // Direct array response
            tasksArray = response.data;
          } else if (
            typeof response.data === 'object' &&
            'tasks' in response.data &&
            Array.isArray((response.data as any).tasks)
          ) {
            // Paginated response with tasks property
            tasksArray = (response.data as any).tasks;
          }
        }

        let filteredTasks: Task[];

        if (inboxFilter === 'inbox') {
          // Filter tasks that don't have board_id or list_id assigned
          filteredTasks = tasksArray
            .filter((task: ApiTask) => {
              const hasBoardId = Array.isArray(task.board_id) && task.board_id.length > 0;
              const hasListId = Array.isArray(task.list_id) && task.list_id.length > 0;
              return !hasBoardId && !hasListId;
            })
            .map((apiTask: ApiTask) => transformApiTaskToTask(apiTask, 'Inbox'));
        } else {
          // For email filter, show all tasks returned from API
          filteredTasks = tasksArray.map((apiTask: ApiTask) =>
            transformApiTaskToTask(apiTask, 'Inbox')
          );
        }

        // Check again before updating state
        if (currentRequestId !== inboxRequestIdRef.current) {
          return; // A newer request has started, ignore this response
        }

        if (page > 1) {
          setInboxCards((prev) => {
            const allTasks = [...prev, ...filteredTasks];
            // Deduplicate by id
            return Array.from(new Map(allTasks.map((t) => [t.id, t])).values());
          });
        } else {
          setInboxCards(filteredTasks);
        }

        const meta = response.meta
          ? {
            ...response.meta,
            hasMore: response.meta.hasMore ?? response.meta.page < response.meta.pages,
          }
          : undefined;

        return meta;
      } catch (error) {
        console.error('Error loading inbox tasks:', error);
        // Only clear inbox on error if this is still the latest request
        if (
          currentRequestId === inboxRequestIdRef.current &&
          (!params?.page || params.page === 1)
        ) {
          setInboxCards([]);
        }
        throw error;
      } finally {
        // Only update loading state if this is still the latest request
        if (currentRequestId === inboxRequestIdRef.current) {
          setIsInboxLoading(false);
        }
      }
    },
    [transformApiTaskToTask, inboxFilter]
  );

  // Refresh inbox when a global task is created from the header menu
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleRefresh = () => {
      loadInboxTasks({ page: 1 });
    };
    window.addEventListener('kanban:inbox-refresh', handleRefresh);
    return () => window.removeEventListener('kanban:inbox-refresh', handleRefresh);
  }, [loadInboxTasks]);

  const value = useMemo<KanbanContextValue>(
    () => ({
      // State
      boardData,
      inboxCards,
      activeCardId,
      activeCard,
      viewType,
      itemType,
      selectedBoardId,
      isDeletingTask: deleteTaskMutation.isPending,
      isInboxLoading,
      isKanbanLoading,
      inboxFilter,

      // Card operations
      updateCard,
      updateInboxCard,
      syncTaskFromApi,
      addCard,
      addInboxCard,
      deleteCard,
      getAllCards,

      // List operations
      addList,
      updateListTitle,
      deleteList,
      setListBackgroundColor,

      // Active card
      setActiveCardId,
      closeCardModal,

      // View type
      setViewType,
      setItemType,

      // Board management
      setSelectedBoardId,
      loadBoard,
      loadListTasks,
      loadInboxTasks,
      setInboxFilter,

      // Labels
      boardLabels,

      // Drag and drop
      setBoardData,
      setInboxCards,
      findContainer,
      isList,
      isDraggingFromInbox,
      availableBoards,
      setIsDraggingFromInbox,
      isBoardSelectionMode,
      setIsBoardSelectionMode,
      hasBoardSelectionCompleted,
      isOverSwitchHandle,
      setIsOverSwitchHandle,
    }),
    [
      boardData,
      inboxCards,
      activeCardId,
      activeCard,
      viewType,
      itemType,
      selectedBoardId,
      updateCard,
      updateInboxCard,
      syncTaskFromApi,
      addCard,
      addInboxCard,
      deleteCard,
      getAllCards,
      addList,
      updateListTitle,
      deleteList,
      setListBackgroundColor,
      closeCardModal,
      setSelectedBoardId,
      loadBoard,
      loadListTasks,
      loadInboxTasks,
      setInboxFilter,
      boardLabels,
      findContainer,
      isList,
      deleteTaskMutation.isPending,
      isInboxLoading,
      isKanbanLoading,
      inboxFilter,
      isDraggingFromInbox,
      availableBoards,
      isBoardSelectionMode,
      hasBoardSelectionCompleted,
      setIsDraggingFromInbox,
      setIsBoardSelectionMode,
      isOverSwitchHandle,
    ]
  );

  return <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

export const useKanban = (): KanbanContextValue => {
  const context = useContext(KanbanContext);
  if (context === undefined) {
    throw new Error('useKanban must be used within a KanbanProvider');
  }
  return context;
};
