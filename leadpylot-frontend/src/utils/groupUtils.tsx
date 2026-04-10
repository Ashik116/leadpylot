import React from 'react';
import { GroupedLeadsGroup, GroupedLeadsSubGroup } from '@/services/LeadsService';
import { formatGroupNameIfDate } from '@/utils/dateFormateUtils';

/** Subgroup pagination shape stored per uniqueGroupId */
export interface SubgroupPaginationEntry {
  subPage: number;
  subLimit: number;
}

/**
 * Extract active subgroup pagination from store.
 * Used when there is at most one active subgroup (first entry wins).
 * Extracts deepest groupId from uniqueGroupId path (e.g. "id1|id2|id3" -> "id3").
 *
 * @see docs/GROUPING_AND_FILTERING_GUIDE.md
 */
export function getActiveSubgroupPagination(
  subgroupPagination: Record<string, SubgroupPaginationEntry> | null | undefined
): { subPage: number | null; subLimit: number | null; groupId: string | null } {
  const entries = Object.entries(subgroupPagination || {});
  if (entries.length === 0) return { subPage: null, subLimit: null, groupId: null };
  const [uniqueGroupId, pagination] = entries[0];
  const groupId = uniqueGroupId.split('|').pop() || null;
  return {
    subPage: pagination.subPage,
    subLimit: pagination.subLimit,
    groupId,
  };
}

export const computeUniqueGroupId = (contextPath: string[], groupId: string): string => {
  return contextPath.length > 0 ? [...contextPath, groupId].join('|') : groupId;
};

export const findPathToGroup = (
  targetId: string,
  groups: GroupedLeadsGroup[],
  contextPath: string[] = []
): string[] => {
  const findInGroup = (
    group: GroupedLeadsGroup | GroupedLeadsSubGroup,
    path: string[] = []
  ): string[] | null => {
    const currentPath = [...path, (group as any).groupId!];

    if ((group as any).groupId === targetId) {
      if (
        contextPath.length === 0 ||
        (currentPath.length >= contextPath.length &&
          currentPath.slice(0, contextPath.length).join('|') === contextPath.join('|'))
      ) {
        return currentPath;
      }
    }

    if ((group as any).subGroups) {
      for (const subGroup of (group as any).subGroups) {
        const result = findInGroup(subGroup, currentPath);
        if (result) return result;
      }
    }

    return null;
  };

  for (const group of groups) {
    const result = findInGroup(group);
    if (result) return result;
  }

  return [];
};

export const buildParentPathHierarchy = (
  targetGroupId: string,
  targetIds: string[],
  groups: GroupedLeadsGroup[],
  contextPath: string[] = []
): GroupedLeadsGroup | null => {
  const findPath = (
    group: GroupedLeadsGroup | GroupedLeadsSubGroup,
    path: (GroupedLeadsGroup | GroupedLeadsSubGroup)[] = []
  ): GroupedLeadsGroup | null => {
    const currentPath = [...path, group];

    if (
      (group as any).groupId === targetGroupId &&
      'leadIds' in (group as any) &&
      Array.isArray((group as any).leadIds) &&
      (group as any).leadIds.length > 0 &&
      JSON.stringify((group as any).leadIds.slice().sort()) ===
        JSON.stringify(targetIds.slice().sort())
    ) {
      const currentPathIds = currentPath.map((p: any) => p.groupId).filter(Boolean);
      if (
        contextPath.length === 0 ||
        (currentPathIds.length >= contextPath.length &&
          currentPathIds.slice(0, contextPath.length).join('|') === contextPath.join('|'))
      ) {
        const rootGroup = {
          ...(currentPath[0] as any),
          subGroups: [],
        } as GroupedLeadsGroup;

        let currentLevel: GroupedLeadsGroup | GroupedLeadsSubGroup = rootGroup;
        for (let i = 1; i < currentPath.length; i++) {
          const pathGroup = currentPath[i] as any;
          const newSubGroup = {
            ...pathGroup,
            subGroups: [],
          } as GroupedLeadsSubGroup;

          (currentLevel as any).subGroups = [newSubGroup];
          currentLevel = newSubGroup;
        }

        return rootGroup;
      }
    }

    if ((group as any).subGroups) {
      for (const subGroup of (group as any).subGroups) {
        const result = findPath(subGroup, currentPath);
        if (result) return result;
      }
    }

    return null;
  };

  for (const group of groups) {
    const result = findPath(group);
    if (result) return result;
  }

  return null;
};

export const extractGroupPathFromHierarchy = (
  group: GroupedLeadsGroup | GroupedLeadsSubGroup
): string[] => {
  const path: string[] = [];
  const traverse = (currentGroup: GroupedLeadsGroup | GroupedLeadsSubGroup) => {
    if ((currentGroup as any).groupId) {
      path.push((currentGroup as any).groupId);
    }
    if ((currentGroup as any).subGroups && (currentGroup as any).subGroups.length > 0) {
      traverse(((currentGroup as any).subGroups as any[])[0]);
    }
  };
  traverse(group);
  return path;
};

export const getLevelColor = (level: number, isLastLevel: boolean = false): string => {
  if (isLastLevel) {
    return '#10b981';
  }
  const colors = [
    '#6366f1',
    '#ff9c93',
    '#3b82f6',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4',
    '#84cc16',
    '#f97316',
  ];
  return colors[level % colors.length];
};

export const generateGroupPathWithColoredLastSegment = (
  level: number,
  groupName: string,
  parentGroupNames: string[] = []
): React.ReactNode => {
  if (level === 0) {
    return formatGroupNameIfDate(groupName);
  }
  const pathSegments = [...parentGroupNames, groupName];
  if (pathSegments.length === 1) {
    return <span className="text-green-600">{formatGroupNameIfDate(pathSegments[0])}</span>;
  }
  return (
    <>
      {pathSegments.slice(0, -1).map((segment, index) => (
        <span key={index}>
          {formatGroupNameIfDate(segment)}
          {index < pathSegments.length - 2 && ' > '}
        </span>
      ))}
      <span className="text-green-600">
        {' > '}
        {formatGroupNameIfDate(pathSegments[pathSegments.length - 1])}
      </span>
    </>
  );
};

export const calculateTotalSelectedCount = (
  group: any,
  groupSelections: Record<string, any[]>,
  uniqueGroupId: string,
  contextPath: string[]
): number => {
  const directSelections = groupSelections[uniqueGroupId]?.length || 0;
  if (group.subGroups && group.subGroups.length > 0) {
    let descendantSelections = 0;
    const traverseSubGroups = (subGroups: any[], subContextPath: string[]) => {
      subGroups.forEach((subGroup) => {
        const subGroupUniqueId =
          subContextPath.length > 0
            ? [...subContextPath, subGroup.groupId!].join('|')
            : subGroup.groupId!;
        descendantSelections += groupSelections[subGroupUniqueId]?.length || 0;
        if (subGroup.subGroups && subGroup.subGroups.length > 0) {
          traverseSubGroups(subGroup.subGroups, [...subContextPath, subGroup.groupId!]);
        }
      });
    };
    traverseSubGroups(group.subGroups, [...contextPath, group.groupId!]);
    return directSelections + descendantSelections;
  }
  return directSelections;
};
