'use client';

import type { NavigationTree } from '@/@types/navigation';
import { useBulkSearch } from '@/components/layouts/PostLoginLayout/contexts/BulkSearchContext';
import AuthorityCheck from '@/components/shared/AuthorityCheck';
import VerticalMenuIcon from '@/components/template/VerticalMenuContent/VerticalMenuIcon';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { NAV_ITEM_TYPE_COLLAPSE } from '@/constants/navigation.constant';
import { useAuth } from '@/hooks/useAuth';
import classNames from '@/utils/classNames';
import useNavigation from '@/utils/hooks/useNavigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LuTextSearch } from 'react-icons/lu';
import { useSelectedMenuItems } from './Menu/hooks/useSelectedMenuItems';

interface ConfigurationMenuProps {
  onItemSelect?: (item: NavigationTree) => void;
}

/**
 * Configuration Menu Component
 * Renders the Configuration dropdown with Documents, Import, Settings items,
 * and nested submenus for Housekeeping, Communications, and User Management
 */
export const ConfigurationMenu = ({ onItemSelect }: ConfigurationMenuProps) => {
  const pathname = usePathname();
  const { navigationTree } = useNavigation();
  const { user } = useAuth();
  const { setSelectedChild, getSelectedChild, removeSelectedChild } = useSelectedMenuItems();

  // Bulk search context
  const bulkSearchContext = useBulkSearch();
  const bulkSearchHandler = bulkSearchContext?.openBulkSearch;

  // Track manually toggled sections (user interactions)
  // This is a Set of section keys that user has explicitly toggled
  // When computing expanded state, if a key is in this set, flip its auto-expanded state
  const [manuallyToggledSections, setManuallyToggledSections] = useState<Set<string>>(new Set());

  // Toggle section expansion
  const toggleSection = useCallback((sectionKey: string) => {
    setManuallyToggledSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  }, []);

  // Get user authority
  const userAuthority = useMemo(() => {
    if (user?.role) {
      return [String(user.role)];
    }
    return [];
  }, [user]);

  // Find Configuration parent item (admin.configurations collapse)
  const settingsParentItem = useMemo(() => {
    const adminMenuSection = navigationTree.find((nav) => nav.key === 'admin.configurations');
    if (adminMenuSection && adminMenuSection.subMenu) {
      return adminMenuSection.subMenu.find(
        (item) => item.key === 'admin.configurations' && item.type === NAV_ITEM_TYPE_COLLAPSE
      );
    }
    return undefined;
  }, [navigationTree]);

  // Find Configuration menu items (admin.configurations) - include Users and sort
  const settingsMenu = useMemo(() => {
    if (settingsParentItem && settingsParentItem.subMenu) {
      // Define the desired order for menu items
      const menuItemOrder = [
        'admin.banks',
        'admin.sources',
        'admin.users',
        'admin.stages',
        'admin.mailservers',
        'admin.voipservers',
        'admin.paymentterms',
        'admin.bonusamount',
        'admin.predefined-tasks',
        'admin.email-templates',
        'admin.pdf-templates',
        'admin.security',
        'admin.tablesettings',
        'admin.form-leads',
        'admin.form-lead-config',
        'admin.bot-setting',
      ];

      // Filter items (now including Users)
      const filtered = settingsParentItem.subMenu.filter((item) => {
        if (item.key === 'admin.settings') {
          return false; // Exclude Settings menu item
        }
        if (!item.authority || item.authority.length === 0) return true;
        if (!userAuthority || userAuthority.length === 0) return false;
        const itemAuthStrings = item.authority.map((r: unknown) => String(r));
        return itemAuthStrings.some((role) => userAuthority.includes(role));
      });

      // Sort items according to menuItemOrder
      return filtered.sort((a, b) => {
        const aIndex = menuItemOrder.indexOf(a.key);
        const bIndex = menuItemOrder.indexOf(b.key);

        // If both items are in the order array, sort by their position
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        // If only a is in the order array, it comes first
        if (aIndex !== -1) return -1;
        // If only b is in the order array, it comes first
        if (bIndex !== -1) return 1;
        // If neither is in the order array, maintain original order
        return 0;
      });
    }
    return [];
  }, [settingsParentItem, userAuthority]);

  // Find Documents and Import items from dashboards navigation
  const documentsItem = useMemo(() => {
    const dashboardSection = navigationTree.find((nav) => nav.key === 'dashboard');
    if (dashboardSection && dashboardSection.subMenu) {
      return dashboardSection.subMenu.find((item) => item.key === 'dashboard.documents');
    }
    return undefined;
  }, [navigationTree]);

  const importItem = useMemo(() => {
    const dashboardSection = navigationTree.find((nav) => nav.key === 'dashboard');
    if (dashboardSection && dashboardSection.subMenu) {
      return dashboardSection.subMenu.find((item) => item.key === 'admin.import-leads');
    }
    return undefined;
  }, [navigationTree]);

  // Find Housekeeping section
  const housekeepingSection = useMemo(() => {
    const dashboardSection = navigationTree.find((nav) => nav.key === 'dashboard');
    if (dashboardSection && dashboardSection.subMenu) {
      return dashboardSection.subMenu.find((nav) => nav.key === 'housekeeping');
    }
    return undefined;
  }, [navigationTree]);

  // Find Communications section
  const communicationsSection = useMemo(() => {
    return navigationTree.find((nav) => nav.key === 'communications');
  }, [navigationTree]);

  // Find Users section
  const usersSection = useMemo(() => {
    const adminMenuSection = navigationTree.find((nav) => nav.key === 'admin.configurations');
    if (adminMenuSection && adminMenuSection.subMenu) {
      return adminMenuSection.subMenu.find((item) => item.key === 'admin.users');
    }
    return undefined;
  }, [navigationTree]);

  // Filter submenu items by authority
  const filterSubMenuByAuthority = useCallback(
    (items: NavigationTree[]): NavigationTree[] => {
      return items.filter((item) => {
        if (!item.authority || item.authority.length === 0) return true;
        if (!userAuthority || userAuthority.length === 0) return false;
        const itemAuthStrings = item.authority.map((r: unknown) => String(r));
        return itemAuthStrings.some((role) => userAuthority.includes(role));
      });
    },
    [userAuthority]
  );

  // Get filtered submenu items for sections
  const housekeepingItems = useMemo(() => {
    if (housekeepingSection && housekeepingSection.subMenu) {
      return filterSubMenuByAuthority(housekeepingSection.subMenu);
    }
    return [];
  }, [housekeepingSection, filterSubMenuByAuthority]);

  const communicationsItems = useMemo(() => {
    if (communicationsSection && communicationsSection.subMenu) {
      return filterSubMenuByAuthority(communicationsSection.subMenu);
    }
    return [];
  }, [communicationsSection, filterSubMenuByAuthority]);

  const usersItems = useMemo(() => {
    if (usersSection && usersSection.subMenu) {
      return filterSubMenuByAuthority(usersSection.subMenu);
    }
    return [];
  }, [usersSection, filterSubMenuByAuthority]);

  // Compute which sections should be auto-expanded based on active route
  const autoExpandedSections = useMemo(() => {
    const newExpanded = new Set<string>();

    // Check Housekeeping
    if (
      housekeepingSection &&
      housekeepingItems.some((item) => {
        if (item.path) {
          return pathname === item.path || pathname.startsWith(item.path + '/');
        }
        if (item.subMenu) {
          return item.subMenu.some((subItem) => {
            if (subItem.path) {
              return pathname === subItem.path || pathname.startsWith(subItem.path + '/');
            }
            return false;
          });
        }
        return false;
      })
    ) {
      newExpanded.add(housekeepingSection.key);
    }

    // Check Communications
    if (
      communicationsSection &&
      communicationsItems.some((item) => {
        if (item.path) {
          return pathname === item.path || pathname.startsWith(item.path + '/');
        }
        return false;
      })
    ) {
      newExpanded.add(communicationsSection.key);
    }

    // Check Users
    if (
      usersSection &&
      usersItems.some((item) => {
        if (item.path) {
          return pathname === item.path || pathname.startsWith(item.path + '/');
        }
        return false;
      })
    ) {
      newExpanded.add(usersSection.key);
    }

    return newExpanded;
  }, [
    pathname,
    housekeepingSection,
    housekeepingItems,
    communicationsSection,
    communicationsItems,
    usersSection,
    usersItems,
  ]);

  // Merge auto-expanded sections with manually toggled sections
  const expandedSections = useMemo(() => {
    const merged = new Set<string>();

    // Start with auto-expanded sections
    autoExpandedSections.forEach((key) => merged.add(key));

    // Apply manual toggles: if user has toggled a section, flip its state
    manuallyToggledSections.forEach((key) => {
      if (merged.has(key)) {
        merged.delete(key); // Was expanded, now collapse
      } else {
        merged.add(key); // Was collapsed, now expand
      }
    });

    return merged;
  }, [autoExpandedSections, manuallyToggledSections]);

  // Sync selected child with current route for Configuration
  useEffect(() => {
    if (!pathname) return;

    const allMenuItems: NavigationTree[] = [];

    if (documentsItem && documentsItem.path) {
      allMenuItems.push(documentsItem);
    }

    if (importItem && importItem.path) {
      allMenuItems.push(importItem);
    }

    allMenuItems.push(...settingsMenu);

    housekeepingItems.forEach((item) => {
      if (item.path) {
        allMenuItems.push(item);
      }
      if (item.subMenu) {
        item.subMenu.forEach((subItem) => {
          if (subItem.path) {
            allMenuItems.push(subItem);
          }
        });
      }
    });

    communicationsItems.forEach((item) => {
      if (item.path) {
        allMenuItems.push(item);
      }
    });

    usersItems.forEach((item) => {
      if (item.path) {
        allMenuItems.push(item);
      }
    });

    if (allMenuItems.length === 0) return;

    // Create a set to track which items are child items (from subMenu)
    const childItemKeys = new Set<string>();
    housekeepingItems.forEach((item) => {
      if (item.subMenu) {
        item.subMenu.forEach((subItem) => {
          if (subItem.path) {
            childItemKeys.add(subItem.key);
          }
        });
      }
    });
    communicationsItems.forEach((item) => {
      if (item.subMenu) {
        item.subMenu.forEach((subItem) => {
          if (subItem.path) {
            childItemKeys.add(subItem.key);
          }
        });
      }
    });
    usersItems.forEach((item) => {
      if (item.subMenu) {
        item.subMenu.forEach((subItem) => {
          if (subItem.path) {
            childItemKeys.add(subItem.key);
          }
        });
      }
    });

    // Sort by path length (longest first), but prioritize child items over parent items with same path
    const sortedChildren = allMenuItems
      .filter((item) => item.path)
      .sort((a, b) => {
        const aPath = a.path || '';
        const bPath = b.path || '';
        const aIsChild = childItemKeys.has(a.key);
        const bIsChild = childItemKeys.has(b.key);

        // If paths are equal, prioritize child items over parent items
        if (aPath === bPath) {
          if (aIsChild && !bIsChild) return -1; // a (child) comes first
          if (!aIsChild && bIsChild) return 1;  // b (child) comes first
          return 0; // both same type, maintain order
        }

        // Otherwise sort by path length (longest first)
        return bPath.length - aPath.length;
      });

    const matchingChild = sortedChildren.find((child) => {
      if (!child.path) return false;
      if (pathname === child.path) return true;
      if (pathname.startsWith(child.path + '/')) {
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

    const currentSelected = getSelectedChild('admin.configurations');

    const isSettingsRoute = allMenuItems.some((item) => {
      if (!item.path) return false;
      return pathname === item.path || pathname.startsWith(item.path + '/');
    });

    if (matchingChild) {
      if (!currentSelected || currentSelected.key !== matchingChild.key) {
        setSelectedChild(matchingChild, 'admin.configurations');
        onItemSelect?.(matchingChild);
      }
    } else if (!isSettingsRoute && currentSelected) {
      removeSelectedChild('admin.configurations');
    }
  }, [
    pathname,
    settingsMenu,
    documentsItem,
    importItem,
    housekeepingItems,
    communicationsItems,
    usersItems,
    getSelectedChild,
    setSelectedChild,
    removeSelectedChild,
    onItemSelect,
  ]);

  // Check if any settings item is active
  const isSettingsActive = useMemo(() => {
    const settingsActive = settingsMenu.some((item) => {
      if (!item.path) return false;
      return pathname === item.path || pathname.includes(item.path + '/');
    });

    if (documentsItem && documentsItem.path) {
      if (pathname === documentsItem.path || pathname.startsWith(documentsItem.path + '/')) {
        return true;
      }
    }

    if (importItem && importItem.path) {
      if (pathname === importItem.path || pathname.startsWith(importItem.path + '/')) {
        return true;
      }
    }

    const housekeepingActive = housekeepingItems.some((item) => {
      if (!item.path) return false;
      return pathname === item.path || pathname.startsWith(item.path + '/');
    });

    const communicationsActive = communicationsItems.some((item) => {
      if (!item.path) return false;
      return pathname === item.path || pathname.startsWith(item.path + '/');
    });

    const usersActive = usersItems.some((item) => {
      if (!item.path) return false;
      return pathname === item.path || pathname.startsWith(item.path + '/');
    });

    return settingsActive || housekeepingActive || communicationsActive || usersActive;
  }, [
    settingsMenu,
    pathname,
    documentsItem,
    importItem,
    housekeepingItems,
    communicationsItems,
    usersItems,
  ]);

  // Get selected child for Settings dropdown
  const selectedSettingsChild = getSelectedChild('admin.configurations');

  // Use selected child's title and icon if available, otherwise use parent's (Configuration)
  const displaySettingsTitle = selectedSettingsChild?.title || 'Configuration';
  const displaySettingsIcon = selectedSettingsChild?.icon || 'accountSettings';


  // Check if there are any items to show in Configuration menu
  const hasConfigurationItems =
    settingsMenu.length > 0 ||
    documentsItem ||
    importItem ||
    housekeepingItems.length > 0 ||
    communicationsItems.length > 0 ||
    usersItems.length > 0;

  if (!hasConfigurationItems) {
    return null;
  }

  return (
    <Dropdown
      trigger="click"
      placement="bottom-end"
      menuClass="p-0"
      renderTitle={
        <Button
          variant="default"
          icon={
            <span className="flex items-center">
              <VerticalMenuIcon icon={displaySettingsIcon} />
            </span>
          }
          className={classNames(
            'flex items-center border-none px-1.5 py-1.5 text-sm whitespace-nowrap hover:bg-gray-100',
            isSettingsActive && 'bg-gray-100 text-black hover:bg-gray-100 hover:text-black'
          )}
          gapClass="gap-2"
        >
          <span className="flex items-center gap-2">
            <span className="hidden text-sm whitespace-nowrap 2xl:inline">
              {displaySettingsTitle}
            </span>
            <ApolloIcon name="chevron-arrow-down" className="text-sm" />
          </span>
        </Button>
      }
    >
      {/* Bulk Search - Admin Only */}
      {bulkSearchHandler && user?.role === Role.ADMIN && (
        <Dropdown.Item
          eventKey="bulk-search"
          className="rounded-t border-none bg-sunbeam-2 px-0 py-0 hover:bg-sunbeam-1"
          variant="custom"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              bulkSearchHandler();
            }}
            className="flex w-full items-center gap-2 px-2 py-1"
          >
            <LuTextSearch className="text-sm" />
            <span className="text-sm font-medium">Bulk Search</span>
          </button>
        </Dropdown.Item>
      )}

      {/* Import - Direct Item */}
      {importItem && (
        <ConfigurationMenuItem
          item={importItem}
          pathname={pathname}
          userAuthority={userAuthority}
          onSelect={(item) => {
            setSelectedChild(item, 'admin.configurations');
            onItemSelect?.(item);
          }}
        />
      )}
      {/* Communications Expandable Section */}
      {communicationsItems.length > 0 && communicationsSection && (
        <ConfigurationExpandableSection
          section={communicationsSection}
          items={communicationsItems}
          pathname={pathname}
          userAuthority={userAuthority}
          isExpanded={expandedSections.has(communicationsSection.key)}
          onToggle={() => toggleSection(communicationsSection.key)}
          onSelect={(item) => {
            setSelectedChild(item, 'admin.configurations');
            onItemSelect?.(item);
          }}
        />
      )}
      {/* Banks - First Settings Item */}
      {settingsMenu
        .filter((item) => item.key === 'admin.banks')
        .map((item) => (
          <ConfigurationMenuItem
            key={item.key}
            item={item}
            pathname={pathname}
            userAuthority={userAuthority}
            onSelect={(item) => {
              setSelectedChild(item, 'admin.configurations');
              onItemSelect?.(item);
            }}
          />
        ))}
      {/* Project Settings (Housekeeping) Expandable Section */}
      {housekeepingItems.length > 0 && housekeepingSection && (
        <ConfigurationExpandableSection
          section={housekeepingSection}
          items={housekeepingItems}
          pathname={pathname}
          userAuthority={userAuthority}
          filterSubMenuByAuthority={filterSubMenuByAuthority}
          isExpanded={expandedSections.has(housekeepingSection.key)}
          onToggle={() => toggleSection(housekeepingSection.key)}
          onSelect={(item) => {
            setSelectedChild(item, 'admin.configurations');
            onItemSelect?.(item);
          }}
        />
      )}
      {/* Sources - Second Settings Item */}
      {settingsMenu
        .filter((item) => item.key === 'admin.sources')
        .map((item) => (
          <ConfigurationMenuItem
            key={item.key}
            item={item}
            pathname={pathname}
            userAuthority={userAuthority}
            onSelect={(item) => {
              setSelectedChild(item, 'admin.configurations');
              onItemSelect?.(item);
            }}
          />
        ))}
      {/* Users - Expandable Section */}
      {usersItems.length > 0 && usersSection && (
        <ConfigurationExpandableSection
          section={usersSection}
          items={usersItems}
          pathname={pathname}
          userAuthority={userAuthority}
          isExpanded={expandedSections.has(usersSection.key)}
          onToggle={() => toggleSection(usersSection.key)}
          onSelect={(item) => {
            setSelectedChild(item, 'admin.configurations');
            onItemSelect?.(item);
          }}
        />
      )}
      {/* Documents - Direct Item */}
      {documentsItem && (
        <ConfigurationMenuItem
          item={documentsItem}
          pathname={pathname}
          userAuthority={userAuthority}
          onSelect={(item) => {
            setSelectedChild(item, 'admin.configurations');
            onItemSelect?.(item);
          }}
        />
      )}
      {/* Remaining Settings Menu Items (Stages, Mail Servers, etc.) */}
      {settingsMenu
        .filter(
          (item) =>
            item.key !== 'admin.banks' &&
            item.key !== 'admin.sources' &&
            item.key !== 'admin.users'
        )
        .map((item) => (
          <ConfigurationMenuItem
            key={item.key}
            item={item}
            pathname={pathname}
            userAuthority={userAuthority}
            onSelect={(item) => {
              setSelectedChild(item, 'admin.configurations');
              onItemSelect?.(item);
            }}
          />
        ))}
    </Dropdown>
  );
};

/**
 * Configuration Menu Item Component
 * Renders a single menu item in the Configuration dropdown
 */
interface ConfigurationMenuItemProps {
  item: NavigationTree;
  pathname: string;
  userAuthority: string[];
  onSelect: (item: NavigationTree) => void;
  isChild?: boolean;
}

const ConfigurationMenuItem = ({
  item,
  pathname,
  userAuthority,
  onSelect,
  isChild = false,
}: ConfigurationMenuItemProps) => {
  const isItemActive = pathname === item.path;

  return (
    <AuthorityCheck key={item.key} userAuthority={userAuthority} authority={item.authority}>
      {item.path ? (
        <Dropdown.Item
          eventKey={item.key}
          active={isItemActive}
          style={{ height: '24px' }}
          className={classNames(
            'min-w-[180px] rounded-md border-none px-0 py-0.5 hover:bg-gray-200',
            isItemActive ? 'bg-sand-1 hover:bg-sand-1 text-white' : '',
            isChild && 'pl-4'
          )}
          variant="custom"
        >
          <Link
            href={item.path}
            className="flex w-full items-center gap-2 px-2"
            target={item.isExternalLink ? '_blank' : undefined}
            onClick={() => {
              if (item.path) {
                onSelect(item);
              }
            }}
          >
            {item.icon && <p className=" flex items-center justify-center"><VerticalMenuIcon icon={item.icon} /></p>}
            <span className="text-sm">{item.title}</span>
          </Link>
        </Dropdown.Item>
      ) : (
        <Dropdown.Item
          eventKey={item.key}
          active={isItemActive}
          className={classNames(
            'min-w-[180px] rounded-md border-none px-2 py-0.5 hover:bg-gray-200',
            isItemActive ? 'bg-sand-1 hover:bg-sand-1 text-white' : '',
            isChild && 'pl-4'
          )}
          variant="custom"
        >
          <div className="flex items-center gap-2">
            {item.icon && <VerticalMenuIcon icon={item.icon} />}
            <span className="text-sm">{item.title}</span>
          </div>
        </Dropdown.Item>
      )}
    </AuthorityCheck>
  );
};

/**
 * Configuration Expandable Section Component
 * Renders an expandable section (Housekeeping, Communications, Users) with inline children
 */
interface ConfigurationExpandableSectionProps {
  section: NavigationTree;
  items: NavigationTree[];
  pathname: string;
  userAuthority: string[];
  filterSubMenuByAuthority?: (items: NavigationTree[]) => NavigationTree[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: (item: NavigationTree) => void;
}

const ConfigurationExpandableSection = ({
  section,
  items,
  pathname,
  userAuthority,
  filterSubMenuByAuthority,
  isExpanded,
  onToggle,
  onSelect,
}: ConfigurationExpandableSectionProps) => {
  // Check if any child item is active
  const hasActiveChild = useMemo(() => {
    return items.some((item) => {
      if (item.path) {
        return pathname === item.path;
      }
      // Check nested submenu items
      if (item.subMenu) {
        return item.subMenu.some((subItem) => subItem.path && pathname === subItem.path);
      }
      return false;
    });
  }, [items, pathname]);

  return (
    <>
      {/* Parent Item - Clickable to toggle expansion */}
      <AuthorityCheck userAuthority={userAuthority} authority={section.authority}>
        <Dropdown.Item
          eventKey={section.key}
          style={{ height: '24px' }}
          className={classNames(
            'rounded-md border-none px-0 py-0 hover:bg-gray-200',
            hasActiveChild && 'bg-gray-100'
          )}
          variant="custom"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggle();
            }}
            className="flex w-full items-center gap-2 px-2 py-0.5"
          >
            {section.icon && <VerticalMenuIcon icon={section.icon} />}
            <span className="flex-1 text-left text-sm">{section.title}</span>
            <ApolloIcon
              name={isExpanded ? 'chevron-arrow-up' : 'chevron-arrow-down'}
              className="text-sm"
            />
          </button>
        </Dropdown.Item>
      </AuthorityCheck>

      {/* Children Items - Rendered inline when expanded */}
      {isExpanded &&
        items.map((item) => {
          // Handle nested collapse items (like Projects, Reclamations)
          if (
            item.type === NAV_ITEM_TYPE_COLLAPSE &&
            item.subMenu &&
            item.subMenu.length > 0 &&
            filterSubMenuByAuthority
          ) {
            const filteredSubItems = filterSubMenuByAuthority(item.subMenu);
            return (
              <React.Fragment key={item.key}>
                {filteredSubItems.map((subItem) => (
                  <ConfigurationMenuItem
                    key={subItem.key}
                    item={subItem}
                    pathname={pathname}
                    userAuthority={userAuthority}
                    onSelect={onSelect}
                    isChild={true}
                  />
                ))}
              </React.Fragment>
            );
          }

          // Regular items
          return (
            <ConfigurationMenuItem
              key={item.key}
              item={item}
              pathname={pathname}
              userAuthority={userAuthority}
              onSelect={onSelect}
              isChild={true}
            />
          );
        })}
    </>
  );
};
