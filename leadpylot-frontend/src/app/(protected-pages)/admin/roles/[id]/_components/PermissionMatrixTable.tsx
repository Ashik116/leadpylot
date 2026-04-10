'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import ApolloIcon from '@/components/ui/ApolloIcon';
import debounce from 'lodash/debounce';
import {
  usePermissionGroups,
  useUpdateRolePermissions,
  useUpdateIncludePermissions,
  useUpdateExcludePermissions,
  useRecalculatePermissions,
  useRole,
  useUpdateRole,
} from '@/services/hooks/useRoles';
import { Role, PermissionGroup } from '@/services/RolesService';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

interface PermissionMatrixTableProps {
  role: Role;
}

type PermissionAction = 'read' | 'write' | 'edit' | 'delete' | 'other';

/**
 * Classifies a permission key into an action type.
 */
const classifyPermission = (key: string): PermissionAction => {
  const lowerKey = key.toLowerCase();

  if (
    lowerKey.includes('read') ||
    lowerKey.includes('view') ||
    lowerKey.includes('get') ||
    lowerKey.includes('list')
  ) {
    return 'read';
  }
  if (lowerKey.includes('create') || lowerKey.includes('add') || lowerKey.includes('write')) {
    return 'write';
  }
  if (lowerKey.includes('update') || lowerKey.includes('edit') || lowerKey.includes('modify')) {
    return 'edit';
  }
  if (lowerKey.includes('delete') || lowerKey.includes('remove')) {
    return 'delete';
  }
  return 'other';
};

/**
 * Custom Toggle Switch Component matching the reference control panel design.
 */
const CustomToggle = ({
  checked,
  onChange,
  colorClass,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  colorClass: string;
  label: string;
  disabled?: boolean;
}) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-xxs font-semibold tracking-wider text-gray-700 uppercase">{label}</span>
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${checked ? colorClass : 'bg-gray-200'}`}
    >
      <span
        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-3' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

/**
 * PermissionMatrixTable component
 *
 * "Control Panel" style UI with Read/Write/Edit/Delete column toggles.
 * White theme only.
 */
const PermissionMatrixTable = ({ role }: PermissionMatrixTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const wasFocusedRef = useRef(false);

  // Debounce search term
  useEffect(() => {
    const debouncedUpdate = debounce((value: string) => {
      setDebouncedSearchTerm(value);
    }, 500);

    debouncedUpdate(searchTerm);

    return () => {
      debouncedUpdate.cancel();
    };
  }, [searchTerm]);

  // Restore focus after search results update
  useEffect(() => {
    if (wasFocusedRef.current && searchContainerRef.current) {
      // Find the actual input element inside the container
      const inputElement = searchContainerRef.current.querySelector('input') as HTMLInputElement;
      if (inputElement) {
        // Use setTimeout to ensure this runs after React's render cycle
        setTimeout(() => {
          inputElement.focus();
          // Restore cursor position if possible
          const length = inputElement.value.length;
          inputElement.setSelectionRange(length, length);
        }, 0);
      }
    }
  }, [debouncedSearchTerm]);

  const { data: groups, isLoading } = usePermissionGroups(
    debouncedSearchTerm ? { search: debouncedSearchTerm } : undefined
  );
  const updatePermissionsMutation = useUpdateRolePermissions();
  const updateIncludePermissionsMutation = useUpdateIncludePermissions();
  const updateExcludePermissionsMutation = useUpdateExcludePermissions();
  const recalculatePermissionsMutation = useRecalculatePermissions();
  const updateRoleMutation = useUpdateRole();

  // Check if this is a child role
  const isChildRole = !!role.sourceRole;
  const sourceRoleId = typeof role.sourceRole === 'string' ? role.sourceRole : role.sourceRole?._id;

  // Fetch source role if this is a child role
  const { data: sourceRole } = useRole(sourceRoleId);

  // Initialize state from role.permissions
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    () => new Set(role.permissions.map((p) => p.toLowerCase()))
  );
  const [includePermissions, setIncludePermissions] = useState<Set<string>>(
    () => new Set((role.includePermissions || []).map((p) => p.toLowerCase()))
  );
  const [excludePermissions, setExcludePermissions] = useState<Set<string>>(
    () => new Set((role.excludePermissions || []).map((p) => p.toLowerCase()))
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // Calculate source permissions
  const sourcePermissions = useMemo(() => {
    if (!isChildRole || !sourceRole) return new Set<string>();
    return new Set(sourceRole.permissions.map((p) => p.toLowerCase()));
  }, [isChildRole, sourceRole]);

  // Determine permission source for display
  const getPermissionSource = useCallback(
    (permissionKey: string): 'source' | 'included' | 'excluded' | 'none' => {
      const key = permissionKey.toLowerCase();
      if (excludePermissions.has(key)) return 'excluded';
      if (includePermissions.has(key)) return 'included';
      if (sourcePermissions.has(key)) return 'source';
      return 'none';
    },
    [sourcePermissions, includePermissions, excludePermissions]
  );

  // Sync state when role changes
  useEffect(() => {
    setSelectedPermissions(new Set(role.permissions.map((p) => p.toLowerCase())));
    setIncludePermissions(new Set((role.includePermissions || []).map((p) => p.toLowerCase())));
    setExcludePermissions(new Set((role.excludePermissions || []).map((p) => p.toLowerCase())));
    setHasChanges(false);
  }, [role._id, role.permissions, role.includePermissions, role.excludePermissions]);

  // Recalculate selected permissions when source/include/exclude change
  const recalculateSelectedPermissions = useCallback(
    (newInclude: Set<string>, newExclude: Set<string>) => {
      const newSelected = new Set<string>();
      // Add all source permissions
      sourcePermissions.forEach((p) => newSelected.add(p));
      // Add all included permissions
      newInclude.forEach((p) => newSelected.add(p));
      // Remove all excluded permissions
      newExclude.forEach((p) => newSelected.delete(p));
      setSelectedPermissions(newSelected);
    },
    [sourcePermissions]
  );

  const handlePermissionToggle = useCallback(
    (permissionKey: string) => {
      if (role.isSystem && role.name === 'Admin') return;

      const key = permissionKey.toLowerCase();

      if (isChildRole) {
        // For child roles, manage include/exclude instead of direct permissions
        // Formula: permissions = (source + include) - exclude
        const isFromSource = sourcePermissions.has(key);
        const isIncluded = includePermissions.has(key);
        const isExcluded = excludePermissions.has(key);
        const isCurrentlySelected = selectedPermissions.has(key);

        const newInclude = new Set(includePermissions);
        const newExclude = new Set(excludePermissions);

        if (isCurrentlySelected) {
          // Removing permission
          if (isFromSource && !isExcluded) {
            // Permission is from source and not excluded - add to exclude
            newExclude.add(key);
          } else if (isIncluded) {
            // Permission is included - remove from include
            newInclude.delete(key);
          }
        } else {
          // Adding permission
          if (isExcluded) {
            // Permission is excluded from source - remove from exclude
            newExclude.delete(key);
          } else if (!isFromSource) {
            // Permission is not from source - add to include
            newInclude.add(key);
          }
        }

        setIncludePermissions(newInclude);
        setExcludePermissions(newExclude);
        recalculateSelectedPermissions(newInclude, newExclude);
      } else {
        // For standalone roles, use direct permission updates
        setSelectedPermissions((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(key)) {
            newSet.delete(key);
          } else {
            newSet.add(key);
          }
          return newSet;
        });
      }
      setHasChanges(true);
    },
    [
      role.isSystem,
      role.name,
      isChildRole,
      sourcePermissions,
      includePermissions,
      excludePermissions,
      selectedPermissions,
      recalculateSelectedPermissions,
    ]
  );

  const handleGroupToggle = useCallback(
    (group: PermissionGroup) => {
      if (role.isSystem && role.name === 'Admin') return;

      const groupPermissionKeys = group.permissions.map((p) => p.key.toLowerCase());
      const allSelected = groupPermissionKeys.every((key) => selectedPermissions.has(key));

      // If all are selected, deselect all; otherwise, select all
      groupPermissionKeys.forEach((key) => {
        const permission = group.permissions.find((p) => p.key.toLowerCase() === key);
        if (permission) {
          // Only toggle if it would change the state
          if (allSelected || !selectedPermissions.has(key)) {
            handlePermissionToggle(permission.key);
          }
        }
      });
    },
    [role.isSystem, role.name, selectedPermissions, handlePermissionToggle]
  );

  const handleActionToggle = useCallback(
    (group: PermissionGroup, action: PermissionAction) => {
      if (role.isSystem && role.name === 'Admin') return;

      const actionPermissions = group.permissions.filter(
        (p) => classifyPermission(p.key) === action
      );
      if (actionPermissions.length === 0) return;

      const actionKeys = actionPermissions.map((p) => p.key.toLowerCase());
      const allActionSelected = actionKeys.every((key) => selectedPermissions.has(key));

      // Toggle each permission of this action type
      actionPermissions.forEach((permission) => {
        const key = permission.key.toLowerCase();
        // Only toggle if it would change the state
        if (allActionSelected || !selectedPermissions.has(key)) {
          handlePermissionToggle(permission.key);
        }
      });
    },
    [role.isSystem, role.name, selectedPermissions, handlePermissionToggle]
  );

  const handleExpandGroup = useCallback((groupName: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    if (groups) {
      setExpandedGroups(new Set(groups.map((g) => g.name)));
    }
  }, [groups]);

  const handleCollapseAll = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  const handleToggleExpandAll = useCallback(() => {
    if (groups) {
      const allExpanded = groups.length > 0 && groups.every((g) => expandedGroups.has(g.name));
      if (allExpanded) {
        handleCollapseAll();
      } else {
        handleExpandAll();
      }
    }
  }, [groups, expandedGroups, handleExpandAll, handleCollapseAll]);

  // Check if all groups are expanded
  const isAllExpanded = useMemo(() => {
    return groups && groups.length > 0 && groups.every((g) => expandedGroups.has(g.name));
  }, [groups, expandedGroups]);

  const handleSelectAll = useCallback(() => {
    if (role.isSystem && role.name === 'Admin') return;
    if (groups) {
      const allPermissions = groups.flatMap((g) => g.permissions);
      allPermissions.forEach((permission) => {
        if (!selectedPermissions.has(permission.key.toLowerCase())) {
          handlePermissionToggle(permission.key);
        }
      });
    }
  }, [groups, role.isSystem, role.name, selectedPermissions, handlePermissionToggle]);

  const handleDeselectAll = useCallback(() => {
    if (role.isSystem && role.name === 'Admin') return;
    // Get all currently selected permissions and toggle them off
    const selectedArray = Array.from(selectedPermissions);
    selectedArray.forEach((key) => {
      // Find the permission object to toggle
      if (groups) {
        const permission = groups
          .flatMap((g) => g.permissions)
          .find((p) => p.key.toLowerCase() === key);
        if (permission) {
          handlePermissionToggle(permission.key);
        }
      }
    });
  }, [role.isSystem, role.name, selectedPermissions, groups, handlePermissionToggle]);

  const handleSave = useCallback(async () => {
    if (isChildRole) {
      // For child roles, update include and exclude permissions
      await Promise.all([
        updateIncludePermissionsMutation.mutateAsync({
          id: role._id,
          permissions: Array.from(includePermissions),
        }),
        updateExcludePermissionsMutation.mutateAsync({
          id: role._id,
          permissions: Array.from(excludePermissions),
        }),
      ]);
    } else {
      // For standalone roles, update permissions directly
      await updatePermissionsMutation.mutateAsync({
        id: role._id,
        permissions: Array.from(selectedPermissions),
      });
    }
    setHasChanges(false);
  }, [
    role._id,
    isChildRole,
    selectedPermissions,
    includePermissions,
    excludePermissions,
    updatePermissionsMutation,
    updateIncludePermissionsMutation,
    updateExcludePermissionsMutation,
  ]);

  const handleReset = useCallback(() => {
    setSelectedPermissions(new Set(role.permissions.map((p) => p.toLowerCase())));
    setIncludePermissions(new Set((role.includePermissions || []).map((p) => p.toLowerCase())));
    setExcludePermissions(new Set((role.excludePermissions || []).map((p) => p.toLowerCase())));
    setHasChanges(false);
  }, [role.permissions, role.includePermissions, role.excludePermissions]);

  const handleSyncFromSource = useCallback(async () => {
    await recalculatePermissionsMutation.mutateAsync(role._id);
    setHasChanges(false);
  }, [role._id, recalculatePermissionsMutation]);

  const handleResetToDefault = useCallback(async () => {
    try {
      await updateRoleMutation.mutateAsync({
        id: role._id,
        data: { reset_default: true } as Partial<Role>,
      });
      setIsResetDialogOpen(false);
      setHasChanges(false);
    } catch (error) {
      // Error is already handled by the mutation's onError
    }
  }, [role._id, updateRoleMutation]);

  const getGroupStats = useCallback(
    (group: PermissionGroup) => {
      const groupKeys = group.permissions.map((p) => p.key.toLowerCase());
      const selectedCount = groupKeys.filter((key) => selectedPermissions.has(key)).length;
      return { selected: selectedCount, total: groupKeys.length };
    },
    [selectedPermissions]
  );

  // Check if a specific action group is fully selected
  const isActionSelected = useCallback(
    (group: PermissionGroup, action: PermissionAction) => {
      const actionKeys = group.permissions
        .filter((p) => classifyPermission(p.key) === action)
        .map((p) => p.key.toLowerCase());

      if (actionKeys.length === 0) return false;
      return actionKeys.every((key) => selectedPermissions.has(key));
    },
    [selectedPermissions]
  );

  // Check if a group has permissions of a certain action type
  const hasAction = useCallback((group: PermissionGroup, action: PermissionAction) => {
    return group.permissions.some((p) => classifyPermission(p.key) === action);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  const isAdminRole = role.isSystem && role.name === 'Admin';
  const sourceRoleName =
    typeof role.sourceRole === 'object'
      ? role.sourceRole?.displayName || role.sourceRole?.name
      : null;

  return (
    <div className="space-y-3">
      {/* Child Role Banner */}
      {isChildRole && sourceRole && (
        <div className="border-b border-gray-100 bg-gray-50/30 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <ApolloIcon name="link" className="shrink-0 text-xs text-blue-500" />
            <span className="text-xs text-gray-600">
              Inheriting from{' '}
              <strong className="text-gray-900">
                {sourceRoleName || sourceRole.displayName || sourceRole.name}
              </strong>
            </span>
            <div className="h-3 w-px bg-gray-300" />
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span>
                <strong className="text-gray-900">{sourcePermissions.size}</strong> source
              </span>
              {includePermissions.size > 0 && (
                <span className="text-green-600">
                  <strong>+{includePermissions.size}</strong> included
                </span>
              )}
              {excludePermissions.size > 0 && (
                <span className="text-red-600">
                  <strong>-{excludePermissions.size}</strong> excluded
                </span>
              )}
              <span className="text-gray-900">
                <strong>{selectedPermissions.size}</strong> total
              </span>
            </div>
            <button
              onClick={handleSyncFromSource}
              disabled={recalculatePermissionsMutation.isPending}
              className="ml-auto flex items-center gap-1.5 rounded px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Sync permissions from source role"
            >
              {recalculatePermissionsMutation.isPending ? (
                <span className="text-xs">Syncing...</span>
              ) : (
                <>
                  <ApolloIcon name="refresh" className="text-xs" />
                  <span>Sync</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Section Header */}
        <div className="px-6 py-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <ApolloIcon name="shield" className="text-gray-500" />
            Permission Configuration{' '}
            <span className="text-xs font-normal text-gray-400">
              {isChildRole ? 'Child Role' : 'Role'}
            </span>
          </h2>
        </div>
        {/* Search Input */}
        <div ref={searchContainerRef} className="relative flex-1 xl:px-20">
          <Input
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={(e) => {
              wasFocusedRef.current = true;
              searchInputRef.current = e.target as HTMLInputElement;
            }}
            onBlur={() => {
              // Don't set to false immediately - delay to check if focus moved to clear button
              setTimeout(() => {
                if (
                  document.activeElement !== searchContainerRef.current?.querySelector('button')
                ) {
                  wasFocusedRef.current = false;
                }
              }, 100);
            }}
            prefix={<ApolloIcon name="search" className="text-gray-400" />}
            suffix={
              searchTerm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm('');
                    // Keep focus on input after clearing
                    setTimeout(() => {
                      const inputElement = searchContainerRef.current?.querySelector(
                        'input'
                      ) as HTMLInputElement;
                      if (inputElement) {
                        inputElement.focus();
                      }
                    }, 0);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ApolloIcon name="cross" className="text-sm" />
                </button>
              )
            }
            size="sm"
            className="w-full"
          />
        </div>
        <div className="mr-4 flex items-center gap-2">
          {/* <span className="text-gray-300">|</span> */}
          <Button
            variant="plain"
            size="xs"
            className="flex items-center py-2"
            onClick={handleToggleExpandAll}
            active={isAllExpanded}
          >
            <ApolloIcon
              name={isAllExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'}
              className="mr-1"
            />
            {isAllExpanded ? 'Collapse All' : 'Expand All'}
          </Button>
          <Button variant="plain" size="xs" onClick={handleSelectAll} disabled={isAdminRole}>
            Select All
          </Button>
          <Button variant="plain" size="xs" onClick={handleDeselectAll} disabled={isAdminRole}>
            Clear All
          </Button>
          <Button
            variant="plain"
            size="xs"
            onClick={() => setIsResetDialogOpen(true)}
            disabled={isAdminRole || updateRoleMutation.isPending}
            className="flex items-center gap-1 border border-amber-300 text-amber-600 hover:bg-amber-50"
            loading={updateRoleMutation.isPending}
          >
            <ApolloIcon name="refresh" className="mr-1" />
            Reset to Default
          </Button>

          {hasChanges && (
            <>
              <div className="flex-1" />
              <Badge className="bg-amber-100 text-xs text-amber-700 shadow-sm">
                Unsaved Changes
              </Badge>
              <Button variant="plain" size="xs" onClick={handleReset}>
                Reset
              </Button>
              <Button
                variant="solid"
                size="xs"
                onClick={handleSave}
                loading={
                  updatePermissionsMutation.isPending ||
                  updateIncludePermissionsMutation.isPending ||
                  updateExcludePermissionsMutation.isPending
                }
              >
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {isAdminRole && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 shadow-sm">
          <div className="flex items-center gap-2 text-blue-700">
            <ApolloIcon name="info-circle" className="text-sm" />
            <span className="text-xs font-medium">
              Admin role has all permissions and cannot be modified.
            </span>
          </div>
        </div>
      )}
      {/* Search Results Info */}
      {debouncedSearchTerm && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ApolloIcon name="search" className="text-gray-400" />
              <span>
                Searching for:{' '}
                <strong className="text-gray-900">&quot;{debouncedSearchTerm}&quot;</strong>
              </span>
              {groups && (
                <span className="text-gray-500">
                  ({groups.length} {groups.length === 1 ? 'group' : 'groups'} found)
                </span>
              )}
            </div>
            <Button
              variant="plain"
              size="xs"
              onClick={() => setSearchTerm('')}
              icon={<ApolloIcon name="cross" className="text-sm" />}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Permission Groups List */}
      <div
        className={` ${isChildRole && sourceRole ? 'max-h-[calc(100vh-400px)] md:max-h-[calc(100vh-250px)]' : 'max-h-[calc(100vh-250px)] md:max-h-[calc(100vh-200px)]'}space-y-3 overflow-y-auto p-1`}
      >
        {groups && groups.length === 0 && debouncedSearchTerm ? (
          <div className="py-12 text-center">
            <p className="mb-1 text-sm font-medium text-gray-500">No permissions found</p>
            <p className="text-xs text-gray-400">
              No permission groups match &quot;{debouncedSearchTerm}&quot;
            </p>
            <Button variant="plain" size="xs" className="mt-3" onClick={() => setSearchTerm('')}>
              Clear search
            </Button>
          </div>
        ) : (
          groups?.map((group) => {
            const stats = getGroupStats(group);
            const isExpanded = expandedGroups.has(group.name);
            const allSelected = stats.selected === stats.total;
            const someSelected = stats.selected > 0 && stats.selected < stats.total;

            return (
              <div
                key={group.name}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Control Panel Header Row */}
                <div
                  className="flex cursor-pointer items-center justify-between border-b border-transparent bg-white px-4 py-0.5 transition-colors hover:bg-gray-50/80 data-[expanded=true]:border-gray-200"
                  onClick={() => handleExpandGroup(group.name)}
                  data-expanded={isExpanded}
                >
                  {/* Left: Group Info */}
                  <div className="flex flex-1 items-center gap-4">
                    <ApolloIcon
                      name="chevron-arrow-down"
                      className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tracking-tight text-gray-900 uppercase">
                          {group.name}
                        </span>
                        <div>
                          <span className="bg-evergreen/10 text-evergreen rounded-full px-1 py-0.5 text-xs">
                            {group.permissions.length} sub-categories
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Toggles */}
                  <div className="mr-4 flex items-center gap-8">
                    <div className="border-r border-gray-200 pr-2">
                      <CustomToggle
                        label="All"
                        checked={allSelected}
                        onChange={() => handleGroupToggle(group)}
                        colorClass="bg-blue-500"
                        disabled={isAdminRole}
                      />
                    </div>
                    {/* Read Toggle */}
                    <div
                      className={
                        !hasAction(group, 'read') ? 'pointer-events-none opacity-20 grayscale' : ''
                      }
                    >
                      <CustomToggle
                        label="Read"
                        checked={isActionSelected(group, 'read')}
                        onChange={() => handleActionToggle(group, 'read')}
                        colorClass="bg-green-500"
                        disabled={isAdminRole}
                      />
                    </div>

                    {/* Write Toggle (Create) */}
                    <div
                      className={
                        !hasAction(group, 'write') ? 'pointer-events-none opacity-20 grayscale' : ''
                      }
                    >
                      <CustomToggle
                        label="Write"
                        checked={isActionSelected(group, 'write')}
                        onChange={() => handleActionToggle(group, 'write')}
                        colorClass="bg-amber-500"
                        disabled={isAdminRole}
                      />
                    </div>

                    {/* Edit Toggle (Update) */}
                    <div
                      className={
                        !hasAction(group, 'edit') ? 'pointer-events-none opacity-20 grayscale' : ''
                      }
                    >
                      <CustomToggle
                        label="Edit"
                        checked={isActionSelected(group, 'edit')}
                        onChange={() => handleActionToggle(group, 'edit')}
                        colorClass="bg-gray-500"
                        disabled={isAdminRole}
                      />
                    </div>

                    {/* Delete Toggle */}
                    <div
                      className={
                        !hasAction(group, 'delete')
                          ? 'pointer-events-none opacity-20 grayscale'
                          : ''
                      }
                    >
                      <CustomToggle
                        label="Delete"
                        checked={isActionSelected(group, 'delete')}
                        onChange={() => handleActionToggle(group, 'delete')}
                        colorClass="bg-red-500"
                        disabled={isAdminRole}
                      />
                    </div>
                  </div>
                </div>

                {/* Detailed Card Grid (Sub-categories) */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {group.permissions.map((permission) => {
                        const isSelected = selectedPermissions.has(permission.key.toLowerCase());
                        const actionType = classifyPermission(permission.key);

                        // Determine border/accent color based on action type
                        let accentColor = 'border-gray-200';
                        let activeBg = 'bg-blue-50/50';
                        let activeText = 'text-blue-900';

                        if (isSelected) {
                          if (actionType === 'read') {
                            accentColor = 'border-green-200';
                            activeBg = 'bg-green-50/50';
                            activeText = 'text-green-900';
                          } else if (actionType === 'write') {
                            accentColor = 'border-amber-200';
                            activeBg = 'bg-amber-50/50';
                            activeText = 'text-amber-900';
                          } else if (actionType === 'edit') {
                            accentColor = 'border-gray-300';
                            activeBg = 'bg-gray-100';
                            activeText = 'text-gray-900';
                          } else if (actionType === 'delete') {
                            accentColor = 'border-red-200';
                            activeBg = 'bg-red-50/50';
                            activeText = 'text-red-900';
                          } else {
                            accentColor = 'border-blue-200';
                          }
                        }

                        const permissionSource = isChildRole
                          ? getPermissionSource(permission.key)
                          : null;
                        const sourceBadge =
                          permissionSource === 'included' ? (
                            <Badge className="h-3.5 bg-blue-100 px-1 py-0 text-[9px] text-blue-700">
                              +INCLUDED
                            </Badge>
                          ) : permissionSource === 'excluded' ? (
                            <Badge className="h-3.5 bg-red-100 px-1 py-0 text-[9px] text-red-700">
                              -EXCLUDED
                            </Badge>
                          ) : permissionSource === 'source' ? (
                            <Badge className="h-3.5 bg-green-100 px-1 py-0 text-[9px] text-green-700">
                              SOURCE
                            </Badge>
                          ) : null;

                        return (
                          <div
                            key={permission.key}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 py-1 shadow-sm transition-all duration-200 ${
                              isSelected
                                ? `${activeBg} ${accentColor} ring-opacity-50 ring-1 ring-offset-0`
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-white'
                            }`}
                            onClick={() => !isAdminRole && handlePermissionToggle(permission.key)}
                          >
                            <div className="pointer-events-none">
                              <Checkbox checked={isSelected} readOnly disabled={isAdminRole} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p
                                  className={`text-xs font-medium ${isSelected ? activeText : 'text-gray-900'}`}
                                >
                                  {permission.name}{' '}
                                  <span
                                    className="truncate rounded-sm bg-blue-100 px-1 py-0.5 font-mono text-xs text-gray-400"
                                    title={permission.key}
                                  >
                                    {permission?.key?.replaceAll(
                                      group?.name?.toLowerCase()?.split(' ')[0] + ':',
                                      ' '
                                    )}
                                  </span>
                                </p>
                                <div className="flex shrink-0 items-center gap-1">
                                  {sourceBadge}
                                  {isSelected && (
                                    <Badge
                                      className={`text-xxs h-4 px-1.5 py-0 ${
                                        actionType === 'read'
                                          ? 'bg-green-100 text-green-700'
                                          : actionType === 'write'
                                            ? 'bg-amber-100 text-amber-700'
                                            : actionType === 'edit'
                                              ? 'bg-gray-200 text-gray-700'
                                              : actionType === 'delete'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-blue-100 text-blue-700'
                                      }`}
                                    >
                                      {actionType.toUpperCase()}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reset to Default Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onCancel={() => setIsResetDialogOpen(false)}
        onConfirm={handleResetToDefault}
        title="Reset Permissions to Default"
        confirmText="Reset to Default"
        cancelText="Cancel"
        confirmButtonProps={{
          disabled: updateRoleMutation.isPending,
          loading: updateRoleMutation.isPending,
        }}
      >
        <p className="text-sm text-gray-600">
          This role&apos;s permissions will be replaced with default permissions. This action cannot
          be undone.
        </p>
      </ConfirmDialog>
    </div>
  );
};

export default PermissionMatrixTable;
