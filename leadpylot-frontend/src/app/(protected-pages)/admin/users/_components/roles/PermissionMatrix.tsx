'use client';

import { useState, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { usePermissionGroups, useUpdateRolePermissions } from '@/services/hooks/useRoles';
import { Role, PermissionGroup } from '@/services/RolesService';

interface PermissionMatrixProps {
  role: Role;
}

/**
 * PermissionMatrix component
 * 
 * IMPORTANT: This component should be rendered with a `key` prop based on role._id
 * to ensure state resets when the role changes:
 * <PermissionMatrix key={role._id} role={role} />
 */
const PermissionMatrix = ({ role }: PermissionMatrixProps) => {
  const { data: groups, isLoading } = usePermissionGroups();
  const updatePermissionsMutation = useUpdateRolePermissions();
  
  // Initialize state from role.permissions - will reset when component remounts via key
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    () => new Set(role.permissions.map(p => p.toLowerCase()))
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handlePermissionToggle = useCallback((permissionKey: string) => {
    if (role.isSystem && role.name === 'Admin') {
      return; // Don't allow modifying Admin permissions
    }

    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permissionKey.toLowerCase())) {
        newSet.delete(permissionKey.toLowerCase());
      } else {
        newSet.add(permissionKey.toLowerCase());
      }
      return newSet;
    });
    setHasChanges(true);
  }, [role.isSystem, role.name]);

  const handleGroupToggle = useCallback((group: PermissionGroup) => {
    if (role.isSystem && role.name === 'Admin') {
      return;
    }

    const groupPermissionKeys = group.permissions.map(p => p.key.toLowerCase());
    const allSelected = groupPermissionKeys.every(key => selectedPermissions.has(key));

    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        groupPermissionKeys.forEach(key => newSet.delete(key));
      } else {
        groupPermissionKeys.forEach(key => newSet.add(key));
      }
      return newSet;
    });
    setHasChanges(true);
  }, [role.isSystem, role.name, selectedPermissions]);

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
      setExpandedGroups(new Set(groups.map(g => g.name)));
    }
  }, [groups]);

  const handleCollapseAll = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    if (role.isSystem && role.name === 'Admin') {
      return;
    }

    if (groups) {
      const allKeys = groups.flatMap(g => g.permissions.map(p => p.key.toLowerCase()));
      setSelectedPermissions(new Set(allKeys));
      setHasChanges(true);
    }
  }, [groups, role.isSystem, role.name]);

  const handleDeselectAll = useCallback(() => {
    if (role.isSystem && role.name === 'Admin') {
      return;
    }

    setSelectedPermissions(new Set());
    setHasChanges(true);
  }, [role.isSystem, role.name]);

  const handleSave = useCallback(async () => {
    await updatePermissionsMutation.mutateAsync({
      id: role._id,
      permissions: Array.from(selectedPermissions),
    });
    setHasChanges(false);
  }, [role._id, selectedPermissions, updatePermissionsMutation]);

  const handleReset = useCallback(() => {
    setSelectedPermissions(new Set(role.permissions.map(p => p.toLowerCase())));
    setHasChanges(false);
  }, [role.permissions]);

  const getGroupStats = useCallback((group: PermissionGroup) => {
    const groupKeys = group.permissions.map(p => p.key.toLowerCase());
    const selectedCount = groupKeys.filter(key => selectedPermissions.has(key)).length;
    return { selected: selectedCount, total: groupKeys.length };
  }, [selectedPermissions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size={32} />
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500 dark:text-gray-400 text-sm">No permissions found</p>
      </div>
    );
  }

  const isAdminRole = role.isSystem && role.name === 'Admin';

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
        <Button variant="plain" size="xs" onClick={handleExpandAll}>
          <ApolloIcon name="chevron-arrow-down" className="mr-1" />
          Expand All
        </Button>
        <Button variant="plain" size="xs" onClick={handleCollapseAll}>
          <ApolloIcon name="chevron-arrow-up" className="mr-1" />
          Collapse All
        </Button>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <Button 
          variant="plain" 
          size="xs" 
          onClick={handleSelectAll}
          disabled={isAdminRole}
        >
          Select All
        </Button>
        <Button 
          variant="plain" 
          size="xs" 
          onClick={handleDeselectAll}
          disabled={isAdminRole}
        >
          Clear All
        </Button>
        
        {hasChanges && (
          <>
            <div className="flex-1" />
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
              Unsaved
            </Badge>
            <Button variant="plain" size="xs" onClick={handleReset}>
              Reset
            </Button>
            <Button
              variant="solid"
              size="xs"
              onClick={handleSave}
              loading={updatePermissionsMutation.isPending}
            >
              Save
            </Button>
          </>
        )}
      </div>

      {isAdminRole && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <ApolloIcon name="info-circle" className="text-sm" />
            <span className="text-xs">
              Admin role has all permissions and cannot be modified.
            </span>
          </div>
        </div>
      )}

      {/* Permission Groups */}
      <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
        {groups.map((group) => {
          const stats = getGroupStats(group);
          const isExpanded = expandedGroups.has(group.name);
          const allSelected = stats.selected === stats.total;
          const someSelected = stats.selected > 0 && stats.selected < stats.total;

          return (
            <div key={group.name} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {/* Group Header */}
              <div
                className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                onClick={() => handleExpandGroup(group.name)}
              >
                <div className="flex items-center gap-2.5">
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={allSelected || someSelected}
                      onChange={() => handleGroupToggle(group)}
                      disabled={isAdminRole}
                    />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white text-sm">
                    {group.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                    {stats.selected}/{stats.total}
                  </span>
                </div>
                <ApolloIcon
                  name={isExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'}
                  className="text-gray-400 text-sm"
                />
              </div>

              {/* Permissions List */}
              {isExpanded && (
                <div className="p-2.5 bg-white dark:bg-gray-900 grid grid-cols-1 gap-1.5">
                  {group.permissions.map((permission) => {
                    const isSelected = selectedPermissions.has(permission.key.toLowerCase());
                    
                    return (
                      <div
                        key={permission.key}
                        className={`flex items-center gap-2.5 p-2 rounded-md border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-ocean-2/5 border-ocean-2/30'
                            : 'bg-gray-50 dark:bg-gray-800 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                        }`}
                        onClick={() => !isAdminRole && handlePermissionToggle(permission.key)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handlePermissionToggle(permission.key)}
                          disabled={isAdminRole}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {permission.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {permission.key}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        <span>
          <span className="font-medium text-gray-900 dark:text-white">{selectedPermissions.size}</span> permissions selected
        </span>
        {hasChanges && (
          <Button
            variant="solid"
            size="xs"
            onClick={handleSave}
            loading={updatePermissionsMutation.isPending}
          >
            Save Changes
          </Button>
        )}
      </div>
    </div>
  );
};

export default PermissionMatrix;
