'use client';
import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Button from '@/components/ui/Button';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useColumnOrderStore } from '@/stores/columnOrderStore';
import {
  apiAdminColumnPreferenceReset,
  apiGetColumnPreferenceByUser,
  apiSaveColumnPreference,
  apiGetMultipleUsersColumnPreference,
  type AdminColumnPreferencePayload,
} from '@/services/LeadsService';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';

import { LABELS } from '@/app/(protected-pages)/admin/table-settings/_components/AdminTableSettingsDashboard';

// Admin mode types
type AdminSettingsMode = 'own' | 'agents';

interface ColumnItem {
  key: string;
  label: string;
  isVisible: boolean;
}

interface DraggableColumnListProps {
  columns: ColumnItem[];
  onColumnVisibilityChange: (key: string, isVisible: boolean) => void;
  onClose: () => void;
  tableName?: string;
  preservedFields?: string[];
  // Controlled mode: when false, use local props instead of global store
  useStore?: boolean;
  // Optional controlled order for columns when useStore is false
  order?: string[];
  // Callback when order changes (useStore === false)
  onOrderChange?: (newOrder: string[]) => void;
  // Optional reset handler when useStore === false
  onReset?: () => void;
  // Content view mode: 'list' (default) or 'table'
  contentView?: 'list' | 'table';
  // Enable admin mode toggle (only works for admin users)
  enableAdminMode?: boolean;
}

export const DraggableColumnList: React.FC<DraggableColumnListProps> = ({
  columns,
  onColumnVisibilityChange,
  onClose,
  tableName = 'leads', // Default table name
  preservedFields = [],
  useStore = true,
  order,
  onOrderChange,
  onReset,
  contentView = 'list',
  enableAdminMode = true,
}) => {
  const { getColumnOrder, setColumnOrder, resetColumnOrder, resetColumnVisibility } =
    useColumnOrderStore();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isSavingForAgents, setIsSavingForAgents] = useState(false);
  const { data: session } = useSession();
  const isAgent = session?.user?.role === Role.AGENT;
  const isAdmin = session?.user?.role === Role.ADMIN;

  // Admin mode state - only relevant for admin users
  const [adminMode, setAdminMode] = useState<AdminSettingsMode>('own');

  // Local state for agent settings (separate from own settings)
  const [agentColumnOrder, setAgentColumnOrder] = useState<string[]>([]);
  const [agentColumnVisibility, setAgentColumnVisibility] = useState<Record<string, boolean>>({});
  const [isLoadingAgentSettings, setIsLoadingAgentSettings] = useState(false);
  const [hasAgentChanges, setHasAgentChanges] = useState(false);

  // Load agent settings when switching to agents mode
  const loadAgentSettings = useCallback(async () => {
    if (!isAdmin || adminMode !== 'agents') return;

    setIsLoadingAgentSettings(true);
    try {
      // Fetch settings for agents (using 'all' to get union of agent settings)
      const res = await apiGetMultipleUsersColumnPreference({
        table: tableName,
        user_ids: ['all'],
        role: Role.AGENT,
      });

      if (res?.results && res.results.length > 0) {
        const tableResult = res.results.find((r) => r.table === tableName);
        if (tableResult?.data && tableResult.data.length > 0) {
          // Use first agent's settings as template (or could compute union)
          const firstAgent = tableResult.data[0];
          const savedOrder = firstAgent?.columnOrders?.[tableName] || [];
          const savedVisibility = firstAgent?.columnVisibility?.[tableName] || {};

          if (savedOrder.length > 0) {
            setAgentColumnOrder(savedOrder);
          } else {
            setAgentColumnOrder(columns.map((c) => c.key));
          }

          const vis: Record<string, boolean> = {};
          columns.forEach((c) => {
            vis[c.key] = savedVisibility[c.key] !== undefined ? savedVisibility[c.key] : true;
          });
          setAgentColumnVisibility(vis);
        } else {
          // No agent settings found, use defaults
          setAgentColumnOrder(columns.map((c) => c.key));
          const vis: Record<string, boolean> = {};
          columns.forEach((c) => {
            vis[c.key] = true;
          });
          setAgentColumnVisibility(vis);
        }
      } else {
        // Fallback to default column preferences
        const defaultRes = await apiGetColumnPreferenceByUser(tableName, true);
        const serverData = defaultRes?.data;

        if (serverData?.columnOrders && Array.isArray(serverData.columnOrders)) {
          setAgentColumnOrder(serverData.columnOrders);
        } else {
          setAgentColumnOrder(columns.map((c) => c.key));
        }

        const vis: Record<string, boolean> = {};
        columns.forEach((c) => {
          // columnVisibility is Record<tableName, Record<columnKey, boolean>>
          const tableVis = serverData?.columnVisibility?.[tableName] as
            | Record<string, boolean>
            | undefined;
          vis[c.key] = tableVis?.[c.key] !== undefined ? tableVis[c.key] : true;
        });
        setAgentColumnVisibility(vis);
      }
      setHasAgentChanges(false);
    } catch {
      // Error loading agent settings, use defaults
      setAgentColumnOrder(columns.map((c) => c.key));
      const vis: Record<string, boolean> = {};
      columns.forEach((c) => {
        vis[c.key] = true;
      });
      setAgentColumnVisibility(vis);
    } finally {
      setIsLoadingAgentSettings(false);
    }
  }, [isAdmin, adminMode, tableName, columns]);

  // Load agent settings when mode changes to 'agents'
  useEffect(() => {
    if (isAdmin && adminMode === 'agents') {
      loadAgentSettings();
    }
  }, [isAdmin, adminMode, loadAgentSettings]);

  // Handle saving settings for all agents
  const handleSaveForAgents = async () => {
    if (!isAdmin) return;

    setIsSavingForAgents(true);
    try {
      const columnOrders: Record<string, string[]> = { [tableName]: agentColumnOrder };
      const columnVisibilityData: Record<string, Record<string, boolean>> = {
        [tableName]: agentColumnVisibility,
      };

      const payload: AdminColumnPreferencePayload = {
        user_ids: ['all'],
        data: {
          columnOrders,
          columnVisibility: columnVisibilityData,
          isDragModeEnabled: false,
          hasHydrated: true,
        },
      };

      const res = await apiSaveColumnPreference(payload);

      if (res?.success === false) {
        toast.push(
          React.createElement(
            Notification as any,
            { type: 'danger', title: 'Save failed' },
            res?.message || 'Failed to update agent column preferences.'
          )
        );
        return;
      }

      toast.push(
        React.createElement(
          Notification as any,
          { type: 'success', title: 'Saved' },
          'Column preferences updated for all agents.'
        )
      );
      setHasAgentChanges(false);
    } catch (e: any) {
      toast.push(
        React.createElement(
          Notification as any,
          { type: 'danger', title: 'Save failed' },
          e?.response?.data?.message || e?.message || 'Failed to update agent preferences.'
        )
      );
    } finally {
      setIsSavingForAgents(false);
    }
  };

  // Handle agent column visibility change
  const handleAgentVisibilityChange = (key: string, isVisible: boolean) => {
    setAgentColumnVisibility((prev) => ({ ...prev, [key]: isVisible }));
    setHasAgentChanges(true);
  };

  // Handle agent column order change
  const handleAgentOrderChange = (newOrder: string[]) => {
    setAgentColumnOrder(newOrder);
    setHasAgentChanges(true);
  };

  // Get store visibility for the current table
  const storeVisibility = useColumnOrderStore((state) => state.columnVisibility[tableName]);

  // Filter columns for Agent role - use store visibility (server preferences)
  const filteredColumns = useMemo(() => {
    const visibility = storeVisibility || {};
    if (isAgent) {
      // For Agent role, use the visibility from the store (fetched from server)
      // This ensures agents see columns that admin has enabled for them
      return columns
        .map((column) => ({
          ...column,
          // Use store visibility if available, otherwise fall back to prop visibility
          isVisible:
            visibility[column.key] !== undefined ? visibility[column.key] : column.isVisible,
        }))
        .filter((column) => column.isVisible === true);
    }
    // For non-Agent roles, show all columns
    return columns;
  }, [columns, isAgent, storeVisibility]);

  // Determine if we're in agent settings mode (admin editing for agents)
  const isAgentSettingsMode = isAdmin && adminMode === 'agents' && enableAdminMode;

  // Get column order for this specific table
  const columnOrder = useMemo(() => {
    if (isAgentSettingsMode) {
      return agentColumnOrder.length > 0 ? agentColumnOrder : columns.map((c) => c.key);
    }
    return useStore
      ? getColumnOrder(tableName)
      : order || (filteredColumns?.length > 0 ? filteredColumns?.map((c) => c?.key) : []);
  }, [
    isAgentSettingsMode,
    agentColumnOrder,
    columns,
    useStore,
    getColumnOrder,
    tableName,
    order,
    filteredColumns,
  ]);

  // Get columns with visibility based on current mode
  const columnsWithVisibility = useMemo(() => {
    if (isAgentSettingsMode) {
      return columns.map((c) => ({
        ...c,
        isVisible: agentColumnVisibility[c.key] !== undefined ? agentColumnVisibility[c.key] : true,
      }));
    }
    return filteredColumns;
  }, [isAgentSettingsMode, columns, agentColumnVisibility, filteredColumns]);

  // Note: Click outside and escape key handling is now managed by SmartDropdown

  // Get ordered columns based on stored order
  const getOrderedColumns = () => {
    const colsToOrder = columnsWithVisibility;

    if (columnOrder?.length === 0) {
      return colsToOrder;
    }

    const orderedColumns = [...colsToOrder];
    orderedColumns?.sort((a, b) => {
      const aIndex = columnOrder?.indexOf(a?.key);
      const bIndex = columnOrder?.indexOf(b?.key);

      // If both are in the order, sort by position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // If only one is in the order, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      // If neither is in the order, maintain original order
      return 0;
    });

    return orderedColumns;
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const orderedColumns = getOrderedColumns();
    const items = Array?.from(orderedColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items?.splice(result?.destination?.index, 0, reorderedItem);

    const newOrder = items?.map((item) => item?.key);

    // If admin is editing agent settings, update agent state
    if (isAgentSettingsMode) {
      handleAgentOrderChange(newOrder);
      return;
    }

    if (useStore) {
      setColumnOrder(tableName, newOrder);
    } else {
      onOrderChange?.(newOrder);
    }
  };

  // Handle visibility change based on current mode
  const handleVisibilityChange = (key: string, isVisible: boolean) => {
    if (isAgentSettingsMode) {
      handleAgentVisibilityChange(key, isVisible);
    } else {
      onColumnVisibilityChange(key, isVisible);
    }
  };

  const handleReset = async () => {
    // If admin is resetting agent settings
    if (isAgentSettingsMode) {
      setIsResetting(true);
      try {
        // Reset agent settings to defaults
        const defaultRes = await apiGetColumnPreferenceByUser(tableName, true);
        const serverData = defaultRes?.data;

        if (serverData?.columnOrders && Array.isArray(serverData.columnOrders)) {
          setAgentColumnOrder(serverData.columnOrders);
        } else {
          setAgentColumnOrder(columns.map((c) => c.key));
        }

        const vis: Record<string, boolean> = {};
        columns.forEach((c) => {
          // columnVisibility is Record<tableName, Record<columnKey, boolean>>
          const tableVis = serverData?.columnVisibility?.[tableName] as
            | Record<string, boolean>
            | undefined;
          vis[c.key] = tableVis?.[c.key] !== undefined ? tableVis[c.key] : true;
        });
        setAgentColumnVisibility(vis);
        setHasAgentChanges(true); // Mark as changed so user can save

        toast.push(
          React.createElement(
            Notification as any,
            { type: 'info', title: 'Reset to defaults' },
            'Agent settings reset to defaults. Click Save to apply to all agents.'
          )
        );
      } catch {
        // Error resetting, use column defaults
        setAgentColumnOrder(columns.map((c) => c.key));
        const vis: Record<string, boolean> = {};
        columns.forEach((c) => {
          vis[c.key] = true;
        });
        setAgentColumnVisibility(vis);
        setHasAgentChanges(true);
      } finally {
        setIsResetting(false);
      }
      return;
    }

    if (isAgent) {
      setIsResetting(true);
      try {
        // Agent role: reset locally only (no server reset call)
        const columnsToUse = filteredColumns?.length > 0 ? filteredColumns : columns;
        if (useStore) {
          resetColumnOrder(tableName);
          resetColumnVisibility(tableName, preservedFields, columnsToUse);
        } else {
          onOrderChange?.(columnsToUse?.length > 0 ? columnsToUse?.map((c) => c?.key) : []);
          columnsToUse?.forEach((c) => onColumnVisibilityChange(c?.key, true));
          onReset?.();
        }
      } finally {
        setIsResetting(false);
      }
      return;
    }

    setIsResetting(true);
    try {
      // 1) reset on server
      await apiAdminColumnPreferenceReset({ table: tableName });

      // 2) fetch freshly-reset prefs for this table
      const res = await apiGetColumnPreferenceByUser(tableName);
      const serverData = res?.data ?? null;

      const serverOrder: string[] = Array.isArray(serverData?.columnOrders)
        ? serverData!.columnOrders
        : [];
      const serverVisibility: Record<string, boolean> = (serverData?.columnVisibility as any) || {};

      // union of keys from order & visibility
      const allKeys = Array.from(
        new Set<string>([...serverOrder, ...Object?.keys(serverVisibility)])
      );

      // if server returned nothing useful → use previous local reset behavior
      if (allKeys?.length === 0) {
        // Use filteredColumns for Agent role (only visible columns)
        const columnsToUse = isAgent ? filteredColumns : columns;
        if (useStore) {
          resetColumnOrder(tableName);
          resetColumnVisibility(tableName, preservedFields, columnsToUse);
        } else {
          onOrderChange?.(columnsToUse?.length > 0 ? columnsToUse?.map((c) => c?.key) : []);
          columnsToUse?.forEach((c) => onColumnVisibilityChange(c?.key, true));
          onReset?.();
        }
        return;
      }

      // columns for reset helper (label from LABELS)
      const serverColumnsForReset = allKeys?.map((k) => ({
        id: k,
        accessorKey: k,
        header: LABELS[k] ?? k,
      }));

      // For Agent role, filter out columns where isVisible is false from server data
      let finalServerOrder = serverOrder?.length ? serverOrder : allKeys;
      let finalServerVisibility = { ...serverVisibility };

      if (isAgent) {
        // Filter server order to only include columns that are visible
        finalServerOrder = finalServerOrder.filter((key) => {
          // Check if column exists in original columns and is visible
          const column = columns.find((c) => c.key === key);
          return column ? column.isVisible === true : true; // Include if not found in original columns
        });

        // Filter server visibility to only include visible columns
        const filteredVisibility: Record<string, boolean> = {};
        allKeys.forEach((key) => {
          const column = columns.find((c) => c.key === key);
          if (column && column.isVisible === true) {
            filteredVisibility[key] = key in serverVisibility ? !!serverVisibility[key] : true;
          }
        });
        finalServerVisibility = filteredVisibility;
      }

      if (useStore) {
        useColumnOrderStore.setState((state) => ({
          columnOrders: {
            ...state.columnOrders,
            [tableName]: finalServerOrder,
          },
        }));

        // first set everything true based on server-defined columns…
        resetColumnVisibility(tableName, preservedFields, serverColumnsForReset);

        // …then overlay server's explicit visibility flags with a properly typed object
        const baseAllTrue: Record<string, boolean> = {};
        finalServerOrder.forEach((k) => {
          baseAllTrue[k] = true;
        });
        const nextVis: Record<string, boolean> = {
          ...baseAllTrue,
          ...finalServerVisibility,
        };

        useColumnOrderStore.setState((state) => ({
          columnVisibility: {
            ...state.columnVisibility,
            [tableName]: nextVis, // <-- Record<string, boolean>, no mismatched type
          },
        }));
      } else {
        // controlled mode
        onOrderChange?.(finalServerOrder);
        finalServerOrder.forEach((key) => {
          const isVisible = key in finalServerVisibility ? !!finalServerVisibility[key] : true;
          onColumnVisibilityChange(key, isVisible);
        });
        onReset?.();
      }
    } catch {
      // Failed to reset column preferences
      // Use filteredColumns for Agent role (only visible columns)
      const columnsToUse = isAgent ? filteredColumns : columns;
      resetColumnOrder(tableName);
      resetColumnVisibility(tableName, preservedFields, columnsToUse);
    } finally {
      setIsResetting(false);
    }
  };

  const orderedColumns = getOrderedColumns();

  // Admin Mode Toggle Component
  const AdminModeToggle = () => {
    if (!isAdmin || !enableAdminMode) return null;

    return (
      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setAdminMode('own')}
          className={`inline-flex items-center justify-center rounded-md px-3 py-1 text-xs font-medium transition-colors duration-200 ease-in-out ${adminMode === 'own'
            ? 'text-primary border-primary/20 border bg-white shadow-sm'
            : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
            }`}
        >
          <ApolloIcon name="user" className="mr-1 text-sm" />
          Own
        </button>
        <button
          type="button"
          onClick={() => setAdminMode('agents')}
          className={`inline-flex items-center justify-center rounded-md px-3 py-1 text-xs font-medium transition-colors duration-200 ease-in-out ${adminMode === 'agents'
            ? 'text-primary border-primary/20 border bg-white shadow-sm'
            : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
            }`}
        >
          <ApolloIcon name="users" className="mr-1 text-sm" />
          Agents
        </button>
      </div>
    );
  };

  // Render table view
  if (contentView === 'table') {
    return (
      <div className="w-full">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold">
                Column Preview{' '}
                <span className="rounded-full bg-green-700 px-1 py-1 text-xs text-white">
                  {String(orderedColumns?.length ?? 0).padStart(2, '0')}
                </span>
              </h3>
              <AdminModeToggle />
            </div>
            <div className="flex items-center gap-2">
              {isAgentSettingsMode && hasAgentChanges && (
                <Button
                  variant="solid"
                  size="sm"
                  loading={isSavingForAgents}
                  onClick={handleSaveForAgents}
                  icon={<ApolloIcon name="check" className="text-sm" />}
                  disabled={isSavingForAgents}
                >
                  Save for Agents
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                loading={isResetting}
                onClick={handleReset}
                icon={<ApolloIcon name="repeat" className="text-sm" />}
                disabled={isResetting || isLoadingAgentSettings}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        {isAgentSettingsMode && (
          <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-2">
            <p className="text-xs text-blue-700">
              <ApolloIcon name="info-circle" className="mr-1 inline text-sm" />
              You are editing column settings for <strong>all agents</strong>. Changes will be
              applied when you click &quot;Save for Agents&quot;.
            </p>
          </div>
        )}

        <div className="mb-3 text-xs text-gray-600">
          {isLoadingAgentSettings ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></span>
              Loading agent settings...
            </span>
          ) : (
            'Drag columns to reorder them. Toggle visibility using eye icons.'
          )}
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="min-w-full rounded-lg border border-gray-200 bg-white shadow-sm dark:bg-[var(--dm-bg-surface)] dark:border-[var(--dm-border)]">
            {/* Table Header */}
            <Droppable droppableId="columns" direction="horizontal">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`flex overflow-x-auto border-b border-gray-200 bg-gray-50 text-4xl transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50' : ''
                    }`}
                >
                  {!isResetting &&
                    !isLoadingAgentSettings &&
                    orderedColumns?.length > 0 &&
                    orderedColumns?.map((column, index) => (
                      <Draggable key={column.key} draggableId={column.key} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex max-w-[200px] flex-col border-r border-gray-200 transition-all last:border-r-0 ${snapshot.isDragging
                              ? 'z-50 scale-105 rotate-1 rounded-lg border-2 border-blue-300 bg-blue-100 shadow-2xl'
                              : 'bg-gray-50'
                              } ${!column.isVisible ? 'opacity-40' : ''}`}
                            style={provided.draggableProps.style}
                          >
                            {/* Header controls */}
                            <div className="flex items-center justify-between gap-2 px-2">
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab text-gray-400 hover:cursor-grabbing hover:text-gray-600 "
                              >
                                <ApolloIcon name="drag-and-sort" className="text-sm mt-2" />
                              </div>
                              <div className="flex-1 text-center text-xs whitespace-nowrap">
                                {column.label}
                              </div>
                              <button
                                onClick={() =>
                                  handleVisibilityChange(column.key, !column.isVisible)
                                }
                                className="p-1 text-gray-400 transition-colors hover:text-gray-600"
                                title={column.isVisible ? 'Hide column' : 'Show column'}
                              >
                                <ApolloIcon
                                  name={column.isVisible ? 'eye-filled' : 'eye-slash'}
                                  className="text-sm"
                                />
                              </button>
                            </div>

                            {/* Column header */}
                            <div
                              className={`border-t border-gray-200 px-3 py-2 ${snapshot.isDragging ? 'bg-blue-50' : 'bg-white'
                                }`}
                            >
                              <span className="truncate text-xs font-semibold tracking-wider text-gray-700 uppercase">
                                Content
                              </span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>

        <div className="mt-3 text-xs text-gray-500">
          💡 Tip: This preview shows how columns will appear in the actual table
        </div>
      </div>
    );
  }

  // Render list view (default)
  return (
    <div
      ref={dropdownRef}
      className="relative flex max-h-[60dvh] max-w-80 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-xl dark:bg-[var(--dm-bg-elevated)] dark:border-[var(--dm-border)]"
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold whitespace-nowrap dark:text-[var(--dm-text-primary)]">Customize Columns</h3>
          <Button
            variant="secondary"
            size="xs"
            loading={isResetting}
            onClick={handleReset}
            icon={<ApolloIcon name="repeat" className="text-sm" />}
            className="w-full text-xs sm:w-auto"
            disabled={isResetting || isLoadingAgentSettings}
          >
            Reset
          </Button>
        </div>
        <Button
          variant="plain"
          size="xs"
          onClick={onClose}
          icon={<ApolloIcon name="cross" className="text-lg" />}
          className="p-0"
        />
      </div>

      {/* Admin Mode Toggle for list view */}
      {isAdmin && enableAdminMode && (
        <div className="mb-2">
          <AdminModeToggle />
        </div>
      )}

      {/* Agent settings info banner */}
      {isAgentSettingsMode && (
        <div className="mb-2 rounded border border-blue-200 bg-blue-50 p-2">
          <p className="text-xs text-blue-700">
            Editing settings for <strong>all agents</strong>
          </p>
        </div>
      )}

      <div className="mb-2 text-xs text-gray-400 sm:mb-3 dark:text-[var(--dm-text-muted)]">
        {isLoadingAgentSettings ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></span>
            Loading...
          </span>
        ) : (
          <>
            <span className="hidden sm:inline">Drag columns to reorder them:</span>
            <span className="sm:hidden">Tap and hold to drag columns:</span>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`min-h-[200px] space-y-2 rounded border-2 border-dashed p-1 transition-colors ${snapshot.isDraggingOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-200 dark:border-[var(--dm-border)]'
                  }`}
              >
                {!isResetting &&
                  !isLoadingAgentSettings &&
                  orderedColumns?.length > 0 &&
                  orderedColumns?.map((column, index) => (
                    <Draggable key={column?.key} draggableId={column?.key} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex touch-manipulation items-center justify-between rounded-lg border bg-white shadow-sm transition-all dark:bg-[var(--dm-bg-surface)] dark:border-[var(--dm-border)] ${snapshot.isDragging
                            ? 'rotate-2 border-blue-300 bg-blue-50 shadow-lg dark:bg-blue-500/10'
                            : 'hover:shadow-md'
                            }`}
                        >
                          <div className="flex flex-1 items-center gap-2 px-2">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab touch-manipulation p-1 text-gray-400 hover:cursor-grabbing mt-1.5 hover:text-gray-600 sm:p-0 dark:text-[var(--dm-text-muted)] dark:hover:text-[var(--dm-text-secondary)]"
                            >
                              <ApolloIcon name="drag-and-sort" />
                            </div>

                            <span className="flex-1 truncate text-xs font-medium text-gray-700 uppercase dark:text-[var(--dm-text-primary)]">
                              {column?.label}
                            </span>
                            <button
                              onClick={() =>
                                handleVisibilityChange(column?.key, !column?.isVisible)
                              }
                              className="touch-manipulation p-1 text-gray-400 transition-colors hover:text-gray-600 mt-1 dark:text-[var(--dm-text-muted)] dark:hover:text-[var(--dm-text-secondary)]"
                              title={column?.isVisible ? 'Hide column' : 'Show column'}
                            >
                              <ApolloIcon
                                name={column?.isVisible ? 'eye-filled' : 'eye-slash'}
                                className="text-sm"
                              />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Save button for agent settings */}
      {isAgentSettingsMode && hasAgentChanges && (
        <div className="mt-3 border-t border-gray-200 pt-3 dark:border-[var(--dm-border)]">
          <Button
            variant="solid"
            size="sm"
            loading={isSavingForAgents}
            onClick={handleSaveForAgents}
            icon={<ApolloIcon name="check" className="text-sm" />}
            className="w-full"
            disabled={isSavingForAgents}
          >
            Save for All Agents
          </Button>
        </div>
      )}

      {/* Mobile-specific instruction */}
      <div className="mt-3 text-xs text-gray-500 sm:hidden dark:text-[var(--dm-text-muted)]">
        💡 Tip: Tap and hold the drag handle to reorder columns
      </div>
    </div>
  );
};
