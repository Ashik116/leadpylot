'use client';

import { useMemo, useEffect } from 'react';
import NavigationContext from './NavigationContext';
import navigationConfig from '@/configs/navigation.config';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { filterNavigationByRole } from '@/utils/filterNavigationByRole';
import { useAuth } from '@/hooks/useAuth';
import { saveNavigationCache } from '@/utils/navigationCache';

import type { NavigationTree } from '@/@types/navigation';
import type { CommonProps } from '@/@types/common';

interface NavigationProviderProps extends CommonProps {
  navigationTree?: NavigationTree[];
}

/**
 * Recursively modify agent navigation paths based on view_type
 * @param navigationTree - The navigation tree to modify
 * @param viewType - The agent's view_type ('detailsView' | 'listView' | undefined)
 * @returns Modified navigation tree with updated paths
 */
const modifyAgentNavigationPaths = (
  navigationTree: NavigationTree[],
  viewType?: string
): NavigationTree[] => {
  return navigationTree.map((nav) => {
    // Create a copy of the navigation item
    const modifiedNav = { ...nav };

    // Check if this is an agent menu item that needs path modification
    if (nav.key === 'dashboard.agentLiveLeads') {
      // Modify Live Leads path based on view_type
      if (viewType === 'detailsView' || viewType === 'details' || viewType === 'detailView') {
        modifiedNav.path = '/dashboards/agent-live-lead';
      } else {
        // listView or undefined - use table view
        modifiedNav.path = '/dashboards/live-leads';
      }
    } else if (nav.key === 'dashboard.agentRecycleLeads') {
      // Modify Recycle Leads path based on view_type
      if (viewType === 'detailsView' || viewType === 'details' || viewType === 'detailView') {
        modifiedNav.path = '/dashboards/agent-recycle-lead';
      } else {
        // listView or undefined - use table view
        modifiedNav.path = '/dashboards/recycle-leads';
      }
    }

    // Recursively process subMenu if it exists
    if (nav.subMenu && nav.subMenu.length > 0) {
      modifiedNav.subMenu = modifyAgentNavigationPaths(nav.subMenu, viewType);
    }

    return modifiedNav;
  });
};

const NavigationProvider = ({
  navigationTree: initialNavigationTree,
  children,
}: NavigationProviderProps) => {
  const { user, isLoading } = useAuth();

  // Generate navigation tree based on current session
  const reactiveNavigationTree = useMemo(() => {
    // If session is still loading, use initial tree
    if (isLoading) {
      return initialNavigationTree;
    }

    // If user is authenticated, generate tree based on their role
    if (user?.role) {
      let filteredTree: NavigationTree[];

      if (user.role.toUpperCase() === Role.ADMIN.toUpperCase()) {
        filteredTree = navigationConfig;
      } else {
        filteredTree = filterNavigationByRole(navigationConfig, user.role);
      }

      // For agents, modify navigation paths based on view_type
      if (user.role.toUpperCase() === Role.AGENT.toUpperCase()) {
        const viewType = user.view_type; // Check both possible property names
        return modifyAgentNavigationPaths(filteredTree, viewType);
      }

      return filteredTree;
    }

    // If no authenticated user, use initial tree (empty/minimal)
    return initialNavigationTree;
  }, [user, isLoading, initialNavigationTree]);

  // Cache navigation tree for instant rendering on page reload
  useEffect(() => {
    // Only cache when user is authenticated and tree has content
    if (user?.role && reactiveNavigationTree && reactiveNavigationTree.length > 0) {
      saveNavigationCache(user.role, reactiveNavigationTree);
    }
  }, [user?.role, reactiveNavigationTree]);

  return (
    <NavigationContext.Provider value={{ navigationTree: reactiveNavigationTree ?? [] }}>
      {children}
    </NavigationContext.Provider>
  );
};

export default NavigationProvider;
