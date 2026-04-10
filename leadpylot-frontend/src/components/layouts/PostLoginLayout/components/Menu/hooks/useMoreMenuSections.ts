import { useMemo } from 'react';
import { NAV_ITEM_TYPE_TITLE } from '@/constants/navigation.constant';
import type { NavigationTree } from '@/@types/navigation';
import { navMenuConfig } from '../navMenu.config';
import {
  checkAuthority,
  filterSubMenuByAuthority,
  transformItemTitle,
  shouldExcludeFromMoreMenu,
} from '../utils/navMenuHelpers';

export interface MoreMenuSection {
  sectionKey: string;
  sectionTitle: string;
  items: NavigationTree[];
}

/**
 * Process dashboard section items for More menu
 */
const processDashboardSectionItems = (
  section: NavigationTree,
  excludedKeys: Set<string>,
  configKeys: Set<string>,
  userAuthority: string[]
): NavigationTree[] => {
  const sectionItems: NavigationTree[] = [];

  section.subMenu?.forEach((item) => {
    if (shouldExcludeFromMoreMenu(item.key, excludedKeys, configKeys)) {
      return;
    }

    if (!checkAuthority(item.authority as string[], userAuthority)) {
      return;
    }

    const transformedItem = transformItemTitle(item);

    if (transformedItem.subMenu && transformedItem.subMenu.length > 0) {
      const filteredSubMenu = filterSubMenuByAuthority(transformedItem.subMenu, userAuthority);
      if (filteredSubMenu.length > 0) {
        sectionItems.push({
          ...transformedItem,
          subMenu: filteredSubMenu,
        });
      }
    } else if (transformedItem.path) {
      sectionItems.push(transformedItem);
    }
  });

  return sectionItems;
};

/**
 * Process other sections (Admin Menu, Communications) for More menu
 */
const processOtherSectionItems = (
  section: NavigationTree,
  excludedKeys: Set<string>,
  configKeys: Set<string>,
  userAuthority: string[]
): NavigationTree[] => {
  const sectionItems: NavigationTree[] = [];

  section.subMenu?.forEach((item) => {
    if (excludedKeys.has(item.key) || configKeys.has(item.key)) {
      return;
    }

    if (!checkAuthority(item.authority as string[], userAuthority)) {
      return;
    }

    const transformedItem = transformItemTitle(item);

    if (transformedItem.subMenu && transformedItem.subMenu.length > 0) {
      const filteredSubMenu = filterSubMenuByAuthority(transformedItem.subMenu, userAuthority);
      if (filteredSubMenu.length > 0) {
        sectionItems.push({
          ...transformedItem,
          subMenu: filteredSubMenu,
        });
      }
    } else if (transformedItem.path) {
      sectionItems.push(transformedItem);
    }
  });

  return sectionItems;
};

/**
 * Process Housekeeping section items
 */
const processHousekeepingItems = (
  housekeepingSection: NavigationTree,
  userAuthority: string[]
): NavigationTree[] => {
  const housekeepingItems: NavigationTree[] = [];

  housekeepingSection.subMenu?.forEach((item: NavigationTree) => {
    if (!checkAuthority(item.authority as string[], userAuthority)) {
      return;
    }

    if (item.subMenu && item.subMenu.length > 0) {
      const filteredSubMenu = filterSubMenuByAuthority(item.subMenu, userAuthority);
      if (filteredSubMenu.length > 0) {
        housekeepingItems.push({
          ...item,
          subMenu: filteredSubMenu,
        });
      }
    } else if (item.path) {
      housekeepingItems.push(item);
    }
  });

  return housekeepingItems;
};

/**
 * Hook to get More menu sections
 */
export const useMoreMenuSections = (
  navigationTree: NavigationTree[],
  userAuthority: string[]
): MoreMenuSection[] => {
  return useMemo(() => {
    const configKeys = new Set(navMenuConfig.map((item) => item.key));
    const excludedKeys = new Set([
      'dashboard.leads',
      'dashboard.leads.liveLeads',
      'dashboard.leads.recycleLeads',
      'dashboard.offers',
      'dashboard.holds',
      'dashboard.calendar',
      'dashboard.openings',
      'dashboard.todo',
    ]);

    const sections: MoreMenuSection[] = [];

    // Extract Housekeeping from dashboard section
    let housekeepingSection: NavigationTree | undefined;
    navigationTree.forEach((section) => {
      if (section.key === 'dashboard' && section.type === NAV_ITEM_TYPE_TITLE && section.subMenu) {
        const housekeepingItem = section.subMenu.find((item) => item.key === 'housekeeping');
        if (housekeepingItem) {
          housekeepingSection = housekeepingItem;
        }
      }
    });

    // Process navigation tree to find sections
    navigationTree.forEach((section) => {
      if (section.type === NAV_ITEM_TYPE_TITLE && section.subMenu) {
        // Skip Admin Menu section - Settings will be shown in HeaderEnd instead
        if (section.key === 'admin.configurations') {
          return;
        }

        let sectionItems: NavigationTree[] = [];

        if (section.key === 'dashboard') {
          sectionItems = processDashboardSectionItems(
            section,
            excludedKeys,
            configKeys,
            userAuthority
          );
        } else {
          sectionItems = processOtherSectionItems(section, excludedKeys, configKeys, userAuthority);
        }

        if (sectionItems.length > 0) {
          sections.push({
            sectionKey: section.key,
            sectionTitle: section.title,
            items: sectionItems,
          });
        }
      }
    });

    // Add Housekeeping as a separate section if found
    if (housekeepingSection && housekeepingSection.subMenu) {
      const housekeepingItems = processHousekeepingItems(housekeepingSection, userAuthority);
      if (housekeepingItems.length > 0) {
        sections.push({
          sectionKey: housekeepingSection.key,
          sectionTitle: housekeepingSection.title,
          items: housekeepingItems,
        });
      }
    }

    return sections;
  }, [navigationTree, userAuthority]);
};
