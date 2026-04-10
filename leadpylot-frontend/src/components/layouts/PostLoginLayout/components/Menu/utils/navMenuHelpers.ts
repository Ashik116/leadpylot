import type { NavigationTree } from '@/@types/navigation';

/**
 * Check if user has authority for an item
 */
export const checkAuthority = (itemAuthority: string[], userAuthority: string[]): boolean => {
  if (!itemAuthority || itemAuthority.length === 0) return true;
  if (!userAuthority || userAuthority.length === 0) return false;
  const itemAuthStrings = itemAuthority.map((r: unknown) => String(r));
  return itemAuthStrings.some((role) => userAuthority.includes(role));
};

/**
 * Check if pathname matches a navigation path
 * Uses exact match or checks if pathname starts with navPath + '/'
 * This prevents parent paths from matching when child paths exist
 */
export const isPathActive = (pathname: string, navPath: string): boolean => {
  if (!navPath) return false;
  // Exact match
  if (pathname === navPath) return true;
  // Pathname starts with navPath followed by '/' (for nested routes)
  // Use startsWith instead of includes to avoid false matches
  return pathname.startsWith(navPath + '/');
};

/**
 * Check if any child submenu item is active
 */
export const hasActiveChild = (
  pathname: string,
  subMenu: NavigationTree[] | undefined
): boolean => {
  if (!subMenu) return false;
  return subMenu.some((subItem) => isPathActive(pathname, subItem.path));
};

/**
 * Extract Opening Hold from Leads submenu
 */
export const extractOpeningHold = (
  subMenu: NavigationTree[]
): {
  filteredSubMenu: NavigationTree[];
  openingHoldItem: NavigationTree | null;
} => {
  let openingHoldItem: NavigationTree | null = null;
  const filteredSubMenu = subMenu.filter((subItem) => {
    if (subItem.key === 'dashboard.leads.openingHold') {
      openingHoldItem = subItem;
      return false;
    }
    return true;
  });
  return { filteredSubMenu, openingHoldItem };
};

/**
 * Merge agent leads into regular leads submenu
 */
export const mergeAgentLeads = (
  leadsSubMenu: NavigationTree[],
  agentLeadsItem: NavigationTree | undefined,
  userAuthority: string[]
): NavigationTree[] => {
  if (
    agentLeadsItem &&
    agentLeadsItem.subMenu &&
    checkAuthority(agentLeadsItem.authority as string[], userAuthority)
  ) {
    agentLeadsItem.subMenu.forEach((agentSubItem) => {
      if (checkAuthority(agentSubItem.authority as string[], userAuthority)) {
        leadsSubMenu.push(agentSubItem);
      }
    });
  }
  return leadsSubMenu;
};

/**
 * Filter submenu items by authority
 */
export const filterSubMenuByAuthority = (
  subMenu: NavigationTree[],
  userAuthority: string[]
): NavigationTree[] => {
  return subMenu.filter((subItem) => checkAuthority(subItem.authority as string[], userAuthority));
};

/**
 * Transform item title (e.g., recentImports -> Recent Imports)
 */
export const transformItemTitle = (item: NavigationTree): NavigationTree => {
  if (item.key === 'admin.recentImports') {
    return { ...item, title: 'Recent Imports' };
  }
  return item;
};

/**
 * Check if item should be excluded from More menu
 */
export const shouldExcludeFromMoreMenu = (
  itemKey: string,
  excludedKeys: Set<string>,
  configKeys: Set<string>
): boolean => {
  return (
    excludedKeys.has(itemKey) ||
    configKeys.has(itemKey) ||
    itemKey === 'housekeeping' ||
    itemKey === 'dashboard.projects' ||
    itemKey === 'dashboard.reclamations' ||
    itemKey === 'dashboard.calling' ||
    itemKey === 'dashboard.agentLiveLeads' ||
    itemKey === 'dashboard.agentRecycleLeads'
  );
};
