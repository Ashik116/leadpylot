import { useMemo, useState } from 'react';
import Link from 'next/link';
import AuthorityCheck from '@/components/shared/AuthorityCheck';
import Dropdown from '@/components/ui/Dropdown';
import DropdownItem from '@/components/ui/Dropdown/DropdownItem';
import VerticalMenuIcon from '@/components/template/VerticalMenuContent/VerticalMenuIcon';
import { NAV_ITEM_TYPE_COLLAPSE } from '@/constants/navigation.constant';
import type { NavigationTree } from '@/@types/navigation';
import classNames from '@/utils/classNames';
import type { MoreMenuSection } from '../hooks/useMoreMenuSections';
import { hasActiveChild } from '../utils/navMenuHelpers';
import { ApolloIcon } from '@/components/ui/ApolloIcon';

interface MoreMenuDropdownProps {
  sections: MoreMenuSection[];
  userAuthority: string[];
  pathname: string;
  isActive?: boolean;
  onItemClick?: (item: NavigationTree, parentKey: string) => void;
  selectedChild?: NavigationTree;
}

export const MoreMenuDropdown = ({
  sections,
  userAuthority,
  pathname,
  isActive,
  onItemClick,
  selectedChild,
}: MoreMenuDropdownProps) => {
  const initialTab = useMemo(() => sections[0]?.sectionKey || '', [sections]);
  const [activeTab, setActiveTab] = useState(initialTab);

  const validActiveTab = useMemo(() => {
    if (sections.find((s) => s.sectionKey === activeTab)) {
      return activeTab;
    }
    return initialTab;
  }, [sections, activeTab, initialTab]);

  const activeSection = sections.find((s) => s.sectionKey === validActiveTab) || sections[0];

  // Use selected child's title and icon if available, otherwise use "More"
  const displayTitle = selectedChild?.title || 'More';
  const displayIcon = selectedChild?.icon;

  // Render collapse item in More menu
  const renderCollapseItem = (item: NavigationTree) => {
    const hasActive = hasActiveChild(pathname, item.subMenu);
    const isItemActive = pathname === item.path || hasActive;

    return (
      <AuthorityCheck key={item.key} userAuthority={userAuthority} authority={item.authority}>
        <div className={classNames('mb-3 rounded-md', isItemActive && 'bg-primary-50')}>
          <div
            className={classNames(
              'flex items-center gap-2 py-2 text-sm font-semibold',
              isItemActive ? 'text-primary-600' : 'text-gray-700'
            )}
          >
            {item.icon && <VerticalMenuIcon icon={item.icon} />}
            <span>{item.title}</span>
            {isItemActive && <span className="bg-primary-600 ml-auto h-2 w-2 rounded-full"></span>}
          </div>
          <div className="ml-6 space-y-0.5">
            {item.subMenu?.map((subItem) => {
              // For submenu items, check if pathname matches exactly
              // If pathname starts with subItem.path + '/', only match if no other submenu item
              // with a longer path also matches (to prevent parent items matching when child items exist)
              let isSubActive = false;
              if (subItem.path) {
                // First, check if there's a more specific submenu item that matches exactly
                const hasExactMatch = item.subMenu?.some(
                  (otherSubItem) =>
                    otherSubItem.path &&
                    otherSubItem.path !== subItem.path &&
                    pathname === otherSubItem.path &&
                    otherSubItem.path.startsWith(subItem.path + '/')
                );

                // If there's an exact match for a more specific item, don't mark this one as active
                if (hasExactMatch) {
                  isSubActive = false;
                } else {
                  // Exact match - only match if pathname exactly equals subItem.path
                  if (pathname === subItem.path) {
                    isSubActive = true;
                  } else if (pathname.startsWith(subItem.path + '/')) {
                    // Check if there's a more specific submenu item that also matches
                    const hasMoreSpecificMatch = item.subMenu?.some(
                      (otherSubItem) =>
                        otherSubItem.path &&
                        otherSubItem.path !== subItem.path &&
                        (pathname === otherSubItem.path ||
                          pathname.startsWith(otherSubItem.path + '/')) &&
                        otherSubItem.path.startsWith(subItem.path + '/')
                    );
                    // Only match if no more specific item exists
                    isSubActive = !hasMoreSpecificMatch;
                  }
                }
              }
              return (
                <AuthorityCheck
                  key={subItem.key}
                  userAuthority={userAuthority}
                  authority={subItem.authority}
                >
                  <DropdownItem
                    eventKey={subItem.key}
                    active={isSubActive}
                    variant="custom"
                    className={classNames(
                      'min-w-full rounded',
                      isSubActive ? 'bg-sand-1 hover:bg-sand-1 text-white' : 'hover:bg-gray-100'
                    )}
                  >
                    {subItem.path ? (
                      <Link
                        href={subItem.path}
                        className="flex w-full items-center gap-2 px-2 py-1"
                        target={subItem.isExternalLink ? '_blank' : undefined}
                        onClick={() => {
                          // Track item selection when clicked - use 'more-menu' as parent key
                          if (onItemClick && subItem.path) {
                            onItemClick(subItem, 'more-menu');
                          }
                        }}
                      >
                        <div
                          className={classNames(
                            'h-1.5 w-1.5 rounded-full',
                            isSubActive ? 'bg-white' : 'bg-gray-400'
                          )}
                        ></div>
                        <span className="text-sm">{subItem.title}</span>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2 py-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
                        <span className="text-sm">{subItem.title}</span>
                      </div>
                    )}
                  </DropdownItem>
                </AuthorityCheck>
              );
            })}
          </div>
        </div>
      </AuthorityCheck>
    );
  };

  // Render regular item in More menu
  const renderRegularItem = (item: NavigationTree) => {
    const hasActive = hasActiveChild(pathname, item.subMenu);
    const isItemActive = pathname === item.path || hasActive;

    return (
      <AuthorityCheck key={item.key} userAuthority={userAuthority} authority={item.authority}>
        <DropdownItem
          eventKey={item.key}
          active={isItemActive}
          variant="custom"
          className={classNames(
            'min-w-full rounded-md hover:bg-gray-200',
            isItemActive ? 'bg-sand-1 hover:bg-sand-1 text-white' : 'hover:bg-gray-50'
          )}
        >
          {item.path ? (
            <Link
              href={item.path}
              className="flex w-full items-center gap-2 px-2 py-1"
              target={item.isExternalLink ? '_blank' : undefined}
              onClick={() => {
                // Track item selection when clicked - use 'more-menu' as parent key
                if (onItemClick && item.path) {
                  onItemClick(item, 'more-menu');
                }
              }}
            >
              {item.icon && <VerticalMenuIcon icon={item.icon} />}
              <span className="text-sm">{item.title}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              {item.icon && <VerticalMenuIcon icon={item.icon} />}
              <span className="text-sm">{item.title}</span>
            </div>
          )}
        </DropdownItem>
      </AuthorityCheck>
    );
  };

  return (
    <Dropdown
      trigger="click"
      placement="bottom-start"
      renderTitle={
        <button
          className={classNames(
            'relative flex items-center gap-2 rounded-md px-1.5 py-1 text-sm font-medium whitespace-nowrap transition-all duration-200 outline-none focus:ring-0 focus:outline-none 2xl:px-3',
            isActive
              ? 'bg-gray-100 text-black'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          {/* Three dots icon for mobile/tablet - only show if no selected child */}
          {!selectedChild && (
            <svg
              className="h-4 w-4 shrink-0 2xl:hidden"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          )}
          {/* Show selected child icon if available */}
          {displayIcon && (
            <span className="shrink-0 [&>span]:text-sm">
              <VerticalMenuIcon icon={displayIcon} />
            </span>
          )}
          <span className="flex items-center gap-2">
            <span className="hidden whitespace-nowrap 2xl:inline">{displayTitle}</span>
            <ApolloIcon name="chevron-arrow-down" />
          </span>
        </button>
      }
    >
      <div className="min-w-[400px]">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {sections.map((section) => (
            <button
              key={section.sectionKey}
              onClick={() => setActiveTab(section.sectionKey)}
              className={classNames(
                'flex-1 px-4 py-2 text-xs font-semibold uppercase transition-colors',
                validActiveTab === section.sectionKey
                  ? 'border-primary-600 text-primary-600 bg-primary-50 border-b-2'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {section.sectionTitle}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="max-h-[400px] overflow-y-auto">
          {activeSection?.items.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-500">No items available</div>
          ) : (
            activeSection?.items.map((item) => {
              if (item.type === NAV_ITEM_TYPE_COLLAPSE && item.subMenu && item.subMenu.length > 0) {
                return renderCollapseItem(item);
              }
              return renderRegularItem(item);
            })
          )}
        </div>
      </div>
    </Dropdown>
  );
};
