import { useMemo } from 'react';
import type { NavigationTree } from '@/@types/navigation';
import { navMenuConfig } from '../navMenu.config';
import {
  checkAuthority,
  extractOpeningHold,
  mergeAgentLeads,
  filterSubMenuByAuthority,
} from '../utils/navMenuHelpers';

/**
 * Process Leads item for display
 */
const processLeadsItem = (
  menuItemsMap: Map<string, NavigationTree>,
  userAuthority: string[]
): {
  openingHoldItem: NavigationTree | null;
} => {
  const leadsItem = menuItemsMap.get('dashboard.leads');
  const agentLeadsItem = menuItemsMap.get('dashboard.calling');
  let openingHoldItem: NavigationTree | null = null;

  if (leadsItem && leadsItem.subMenu) {
    const { filteredSubMenu, openingHoldItem: extractedHold } = extractOpeningHold(
      leadsItem.subMenu
    );
    openingHoldItem = extractedHold;

    const mergedSubMenu = mergeAgentLeads(filteredSubMenu, agentLeadsItem, userAuthority);

    menuItemsMap.set('dashboard.leads', {
      ...leadsItem,
      subMenu: mergedSubMenu,
    });
  } else if (
    agentLeadsItem &&
    agentLeadsItem.subMenu &&
    checkAuthority(agentLeadsItem.authority as string[], userAuthority)
  ) {
    // For agents without regular leads, create leads item from agent leads
    const agentLeadsSubMenu: NavigationTree[] = [];
    agentLeadsItem.subMenu.forEach((agentSubItem) => {
      if (checkAuthority(agentSubItem.authority as string[], userAuthority)) {
        agentLeadsSubMenu.push(agentSubItem);
      }
    });
    if (agentLeadsSubMenu.length > 0) {
      menuItemsMap.set('dashboard.leads', {
        ...agentLeadsItem,
        key: 'dashboard.leads',
        subMenu: agentLeadsSubMenu,
      });
    }
  }

  return { openingHoldItem };
};

/**
 * Hook to get display items for NavMenu
 */
export const useNavMenuData = (
  menuItemsMap: Map<string, NavigationTree>,
  userAuthority: string[]
) => {
  return useMemo(() => {
    const items: (
      | NavigationTree
      | { type: 'custom'; key: string; label: string; icon?: string }
    )[] = [];

    const workingMap = new Map(menuItemsMap);
    const { openingHoldItem } = processLeadsItem(workingMap, userAuthority);

    // Process config items in order
    navMenuConfig.forEach((configItem) => {
      if (configItem.type === 'custom' && configItem.key === 'dashboard.todo') {
        items.push({
          type: 'custom',
          key: configItem.key,
          label: configItem.customLabel || 'Tickets',
          icon: 'todoIcon',
        });
      } else if (configItem.type === 'custom' && configItem.key === 'dashboard.add-task') {
        items.push({
          type: 'custom',
          key: configItem.key,
          label: configItem.customLabel || 'Task',
          icon: configItem.customIcon || 'plus',
        });
      } else if (configItem.key === 'dashboard.leads') {
        // Special handling for Leads
        const navItem = workingMap.get('dashboard.leads');
        if (navItem && checkAuthority(navItem.authority as string[], userAuthority)) {
          items.push(navItem);
        } else {
          const agentLeadsItem = workingMap.get('dashboard.calling');
          if (
            agentLeadsItem &&
            checkAuthority(agentLeadsItem.authority as string[], userAuthority)
          ) {
            const agentLeadsSubMenu = filterSubMenuByAuthority(
              agentLeadsItem.subMenu || [],
              userAuthority
            );
            if (agentLeadsSubMenu.length > 0) {
              items.push({
                ...agentLeadsItem,
                key: 'dashboard.leads',
                title: 'Leads',
                subMenu: agentLeadsSubMenu,
              });
            }
          }
        }
      } else {
        const navItem = workingMap.get(configItem.key);
        if (navItem && checkAuthority(navItem.authority as string[], userAuthority)) {
          items.push(navItem);

          // Insert Opening Hold after Openings
          if (configItem.key === 'dashboard.openings' && openingHoldItem) {
            if (checkAuthority(openingHoldItem.authority as string[], userAuthority)) {
              items.push(openingHoldItem);
            }
          }
        }
      }
    });

    return items;
  }, [menuItemsMap, userAuthority]);
};
