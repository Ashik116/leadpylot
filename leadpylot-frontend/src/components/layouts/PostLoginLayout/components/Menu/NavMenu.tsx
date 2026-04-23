'use client';

import type { NavigationTree } from '@/@types/navigation';

import Logo from '@/components/template/Logo';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { NAV_ITEM_TYPE_COLLAPSE, NAV_ITEM_TYPE_ITEM } from '@/constants/navigation.constant';
import { useAuth } from '@/hooks/useAuth';
import useMenuActive from '@/utils/hooks/useMenuActive';
import useNavigation from '@/utils/hooks/useNavigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { CustomMenuItem } from './components/CustomMenuItem';
import { NavMenuItem } from './components/NavMenuItem';
import { NavMenuDropdown } from './components/NavMenuDropdown';
import { useMoreMenuSections } from './hooks/useMoreMenuSections';
import { useNavMenuData } from './hooks/useNavMenuData';
import { useSelectedMenuItems } from './hooks/useSelectedMenuItems';
import { hasActiveChild } from './utils/navMenuHelpers';
import CreateTaskPopover from '@/components/shared/CreateTaskPopover/CreateTaskPopover';

interface NavMenuProps {
  onTaskDrawerOpen?: () => void;
  pendingTaskCount?: number;
}

const NavMenu = ({ onTaskDrawerOpen, pendingTaskCount = 0 }: NavMenuProps) => {
  const pathname = usePathname();
  const { navigationTree } = useNavigation();
  const { user } = useAuth();
  const { activedRoute } = useMenuActive(navigationTree, pathname || '');

  // Get user authority
  const userAuthority = useMemo(() => {
    if (user?.role) {
      return [String(user.role)];
    }
    return [];
  }, [user]);

  // Find the "Workflow" section (dashboard key) and extract its subMenu
  const workflowMenuItems = useMemo(() => {
    const workflowSection = navigationTree.find((nav) => nav.key === 'dashboard');
    return workflowSection?.subMenu || [];
  }, [navigationTree]);

  // Also check Communications section for Calls
  const communicationsMenuItems = useMemo(() => {
    const communicationsSection = navigationTree.find((nav) => nav.key === 'communications');
    return communicationsSection?.subMenu || [];
  }, [navigationTree]);

  // Create a map of all available menu items by key
  const menuItemsMap = useMemo(() => {
    const map = new Map<string, NavigationTree>();

    workflowMenuItems.forEach((item) => {
      map.set(item.key, item);
    });

    communicationsMenuItems.forEach((item) => {
      map.set(item.key, item);
    });

    return map;
  }, [workflowMenuItems, communicationsMenuItems]);

  // Get display items using hook
  const displayItems = useNavMenuData(menuItemsMap, userAuthority);

  // Get More menu sections using hook
  const moreMenuSections = useMoreMenuSections(navigationTree, userAuthority);

  // Check if More menu is active
  // const isMoreMenuActive = useMoreMenuActive(moreMenuSections, pathname);

  // Get selected menu items from dropdowns
  const { setSelectedChild, getSelectedChild, removeSelectedChild } = useSelectedMenuItems();

  // Sync selected child with current route
  useEffect(() => {
    if (!pathname || !navigationTree.length) return;

    // Find the Leads dropdown item
    const leadsItem = displayItems.find((item) => {
      if ('type' in item && item.type === 'custom') return false;
      const nav = item as NavigationTree;
      return nav.key === 'dashboard.leads' && nav.subMenu && nav.subMenu.length > 0;
    }) as NavigationTree | undefined;

    if (leadsItem && leadsItem.subMenu) {
      // Sort children by path length (longest first) to match more specific routes first
      const sortedChildren = [...leadsItem.subMenu].sort((a, b) => {
        const aPath = a.path || '';
        const bPath = b.path || '';
        return bPath.length - aPath.length;
      });

      // Find which child item matches the current pathname
      // Check more specific paths first (e.g., /leads/pending-leads before /leads)
      const matchingChild = sortedChildren.find((child) => {
        if (!child.path) return false;
        // Exact match
        if (pathname === child.path) return true;
        // Pathname starts with child path followed by / (for nested routes)
        // But exclude if it's a more specific route (e.g., don't match /leads when on /leads/pending-leads)
        if (pathname.startsWith(child.path + '/')) {
          // Make sure we're not matching a parent path when a child path exists
          const hasMoreSpecificMatch = sortedChildren.some(
            (otherChild) =>
              otherChild.path &&
              otherChild.path !== child.path &&
              pathname.startsWith(otherChild.path + '/') &&
              otherChild.path.startsWith(child.path + '/')
          );
          return !hasMoreSpecificMatch;
        }
        return false;
      });

      const currentSelected = getSelectedChild('dashboard.leads');

      // Check if pathname matches any Leads submenu path
      const isLeadsRoute = leadsItem.subMenu.some((child) => {
        if (!child.path) return false;
        return pathname === child.path || pathname.startsWith(child.path + '/');
      });

      // If we found a matching child and it's different from current selection
      if (matchingChild) {
        // Only update if different or if no selection exists
        if (!currentSelected || currentSelected.key !== matchingChild.key) {
          setSelectedChild(matchingChild, 'dashboard.leads');
        }
      } else if (pathname === '/dashboards/leads' || pathname === '/dashboards/leads/') {
        // Default to "All Leads" when on /dashboards/leads (exact match only)
        const allLeadsItem = leadsItem.subMenu.find(
          (child) => child.key === 'dashboard.leads.allLeads'
        );
        if (allLeadsItem && (!currentSelected || currentSelected.key !== allLeadsItem.key)) {
          setSelectedChild(allLeadsItem, 'dashboard.leads');
        }
      } else if (!isLeadsRoute && currentSelected) {
        // Clear selection if navigating away from Leads routes
        removeSelectedChild('dashboard.leads');
      }
    }

    // Find the Offers dropdown item
    const offersItem = displayItems.find((item) => {
      if ('type' in item && item.type === 'custom') return false;
      const nav = item as NavigationTree;
      return nav.key === 'dashboard.offers' && nav.subMenu && nav.subMenu.length > 0;
    }) as NavigationTree | undefined;

    if (offersItem && offersItem.subMenu) {
      // Sort children by path length (longest first) to match more specific routes first
      const sortedChildren = [...offersItem.subMenu].sort((a, b) => {
        const aPath = a.path || '';
        const bPath = b.path || '';
        return bPath.length - aPath.length;
      });

      // Find which child item matches the current pathname
      const matchingChild = sortedChildren.find((child) => {
        if (!child.path) return false;
        // Exact match
        if (pathname === child.path) return true;
        // Pathname starts with child path followed by / (for nested routes)
        if (pathname.startsWith(child.path + '/')) {
          // Make sure we're not matching a parent path when a child path exists
          const hasMoreSpecificMatch = sortedChildren.some(
            (otherChild) =>
              otherChild.path &&
              otherChild.path !== child.path &&
              pathname.startsWith(otherChild.path + '/') &&
              otherChild.path.startsWith(child.path + '/')
          );
          return !hasMoreSpecificMatch;
        }
        return false;
      });

      const currentSelected = getSelectedChild('dashboard.offers');

      // Check if pathname matches any Offers submenu path
      const isOffersRoute = offersItem.subMenu.some((child) => {
        if (!child.path) return false;
        return pathname === child.path || pathname.startsWith(child.path + '/');
      });

      // If we found a matching child and it's different from current selection
      if (matchingChild) {
        // Only update if different or if no selection exists
        if (!currentSelected || currentSelected.key !== matchingChild.key) {
          setSelectedChild(matchingChild, 'dashboard.offers');
        }
      } else if (pathname === '/dashboards/offers' || pathname === '/dashboards/offers/') {
        // Default to "Offers" when on /dashboards/offers (exact match only)
        const allOffersItem = offersItem.subMenu.find(
          (child) => child.key === 'dashboard.offers.allOffers'
        );
        if (allOffersItem && (!currentSelected || currentSelected.key !== allOffersItem.key)) {
          setSelectedChild(allOffersItem, 'dashboard.offers');
        }
      } else if (!isOffersRoute && currentSelected) {
        // Clear selection if navigating away from Offers routes
        removeSelectedChild('dashboard.offers');
      }
    }

    // Sync selected child for More menu
    if (moreMenuSections.length > 0) {
      // Collect all items from all sections
      const allMoreMenuItems: NavigationTree[] = [];
      const parentItemsMap = new Map<string, NavigationTree>();

      moreMenuSections.forEach((section) => {
        section.items.forEach((item) => {
          // Track parent items separately
          if (item.subMenu && item.subMenu.length > 0) {
            parentItemsMap.set(item.path || '', item);
          }
          allMoreMenuItems.push(item);
          // Also include submenu items if they exist
          if (item.subMenu) {
            item.subMenu.forEach((subItem) => {
              allMoreMenuItems.push(subItem);
            });
          }
        });
      });

      // Sort items by path length (longest first) to match more specific routes first
      // Also prioritize items without subMenu (child items) over parent items with same path
      const sortedItems = allMoreMenuItems
        .filter((item) => item.path)
        .sort((a, b) => {
          const aPath = a.path || '';
          const bPath = b.path || '';

          // If paths are equal, prioritize child items (no subMenu) over parent items
          if (aPath === bPath) {
            const aIsParent = a.subMenu && a.subMenu.length > 0;
            const bIsParent = b.subMenu && b.subMenu.length > 0;
            if (aIsParent && !bIsParent) return 1; // b (child) comes first
            if (!aIsParent && bIsParent) return -1; // a (child) comes first
          }

          return bPath.length - aPath.length;
        });

      // Find which item matches the current pathname
      const matchingItem = sortedItems.find((item) => {
        if (!item.path) return false;
        // Exact match
        if (pathname === item.path) {
          // If this is a parent item with subMenu, check if there's a child with same path
          if (item.subMenu && item.subMenu.length > 0) {
            const hasChildWithSamePath = item.subMenu.some((subItem) => subItem.path === item.path);
            // Don't match parent if child with same path exists
            if (hasChildWithSamePath) return false;
          }
          return true;
        }
        // Pathname starts with item path followed by / (for nested routes)
        if (pathname.startsWith(item.path + '/')) {
          // Make sure we're not matching a parent path when a child path exists
          const hasMoreSpecificMatch = sortedItems.some(
            (otherItem) =>
              otherItem.path &&
              otherItem.path !== item.path &&
              pathname.startsWith(otherItem.path + '/') &&
              otherItem.path.startsWith(item.path + '/')
          );
          return !hasMoreSpecificMatch;
        }
        return false;
      });

      const currentSelected = getSelectedChild('more-menu');

      // Check if pathname matches any More menu item path
      const isMoreMenuRoute = allMoreMenuItems.some((item) => {
        if (!item.path) return false;
        return pathname === item.path || pathname.startsWith(item.path + '/');
      });

      // If we found a matching item and it's different from current selection
      if (matchingItem) {
        if (!currentSelected || currentSelected.key !== matchingItem.key) {
          setSelectedChild(matchingItem, 'more-menu');
        }
      } else if (!isMoreMenuRoute && currentSelected) {
        // Clear selection if navigating away from More menu routes
        removeSelectedChild('more-menu');
      }
    }
  }, [
    pathname,
    navigationTree,
    displayItems,
    moreMenuSections,
    getSelectedChild,
    setSelectedChild,
    removeSelectedChild,
  ]);

  // Render menu item based on type
  const renderMenuItem = (
    item: NavigationTree | { type: 'custom'; key: string; label: string; icon?: string }
  ) => {
    // Handle custom items (like Task drawer/Tickets)
    if ('type' in item && item.type === 'custom') {
      const isActive = activedRoute?.key === item.key;

      // Handle add ticket custom item - show CreateTaskPopover (uses store so FilterTabsHeader can open it with leadId/taskType)
      // Header "+" creates global task (no leadId/taskType). FilterTabsHeader "+" passes leadId/taskType.
      if (item.key === 'dashboard.add-task') {
        return (
          <div key={item.key} className="relative ml-3">
            <CreateTaskPopover triggerClassName="mt-1 ms-1" useStore />
          </div>
        );
      }

      // Handle other custom items (like Task drawer)
      return (
        <CustomMenuItem
          key={item.key}
          item={item}
          isActive={isActive}
          onClick={onTaskDrawerOpen || (() => {})}
          pendingTaskCount={pendingTaskCount}
        />
      );
    }

    // Handle navigation items
    const nav = item as NavigationTree;
    const isActive = pathname === nav.path;
    const hasSubMenu = nav.subMenu && nav.subMenu.length > 0;

    // Regular item (no submenu)
    if (nav.type === NAV_ITEM_TYPE_ITEM || (!hasSubMenu && nav.path)) {
      // Pass pendingTaskCount for Kanban menu item
      const shouldShowPendingCount = nav.key === 'dashboard.kanban';
      return (
        <NavMenuItem
          key={nav.key}
          nav={nav}
          isActive={isActive}
          userAuthority={userAuthority}
          pendingTaskCount={shouldShowPendingCount ? pendingTaskCount : undefined}
        />
      );
    }

    // Leads collapse - render as plain tab link; sub-items shown in NavSubTabBar below header
    if (nav.type === NAV_ITEM_TYPE_COLLAPSE && hasSubMenu && nav.key === 'dashboard.leads') {
      const hasActive = hasActiveChild(pathname, nav.subMenu);
      const isParentActive = isActive || activedRoute?.parentKey === nav.key || hasActive;
      const firstSubPath = nav.subMenu?.find((s) => s.path)?.path || nav.path || '';
      return (
        <NavMenuItem
          key={nav.key}
          nav={{ ...nav, path: firstSubPath }}
          isActive={isParentActive}
          userAuthority={userAuthority}
        />
      );
    }

    // All other collapse items (Offers, Calendar, Mails) - keep existing dropdown behaviour
    if (nav.type === NAV_ITEM_TYPE_COLLAPSE && hasSubMenu) {
      const selectedChild = getSelectedChild(nav.key);
      const hasActive = hasActiveChild(pathname, nav.subMenu);
      const isParentActive = isActive || activedRoute?.parentKey === nav.key || hasActive;
      return (
        <NavMenuDropdown
          key={nav.key}
          nav={nav}
          isParentActive={isParentActive}
          pathname={pathname}
          userAuthority={userAuthority}
          onItemClick={setSelectedChild}
          selectedChild={selectedChild}
        />
      );
    }

    return null;
  };

  // // Render "More" dropdown
  // const renderMoreMenu = () => {
  //   if (moreMenuSections.length === 0) return null;

  //   // Get selected child for More menu (using 'more-menu' as parent key)
  //   const selectedMoreChild = getSelectedChild('more-menu');

  //   return (
  //     <MoreMenuDropdown
  //       sections={moreMenuSections}
  //       userAuthority={userAuthority}
  //       pathname={pathname}
  //       isActive={isMoreMenuActive}
  //       onItemClick={setSelectedChild}
  //       selectedChild={selectedMoreChild}
  //     />
  //   );
  // };

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <>
      <nav className="mr-6 flex items-center gap-0.5 lg:mr-8 xl:mr-10">
        {/* Logo - positioned before Leads */}
        <div className="mr-3 hidden h-6 w-6 md:h-8 md:w-8 lg:block">
          <Link
            href={
              user?.role === Role.ADMIN
                ? '/dashboards/leads-bank'
                : user?.role === Role.AGENT && user?.view_type === 'listView'
                  ? '/dashboards/live-leads'
                  : '/dashboards/agent-live-lead'
            }
          >
            {' '}
            <Logo type="mini" mode="light" logoWidth={32} logoHeight={32} />
          </Link>
        </div>
        {displayItems.map((item) => renderMenuItem(item))}
        {/* {renderMoreMenu()} */}
      </nav>
    </>
  );
};

export default NavMenu;
