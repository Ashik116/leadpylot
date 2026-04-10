import Link from 'next/link';
import AuthorityCheck from '@/components/shared/AuthorityCheck';
import Dropdown from '@/components/ui/Dropdown';
import DropdownItem from '@/components/ui/Dropdown/DropdownItem';
import VerticalMenuIcon from '@/components/template/VerticalMenuContent/VerticalMenuIcon';
import type { NavigationTree } from '@/@types/navigation';
import classNames from '@/utils/classNames';
import { filterSubMenuByAuthority } from '../utils/navMenuHelpers';
import ApolloIcon from '@/components/ui/ApolloIcon';

interface NavMenuDropdownProps {
  nav: NavigationTree;
  isParentActive: boolean;
  pathname: string;
  userAuthority: string[];
  onItemClick?: (item: NavigationTree, parentKey: string) => void;
  selectedChild?: NavigationTree;
}

export const NavMenuDropdown = ({
  nav,
  isParentActive,
  pathname,
  userAuthority,
  onItemClick,
  selectedChild,
}: NavMenuDropdownProps) => {
  const filteredSubMenu = filterSubMenuByAuthority(nav.subMenu || [], userAuthority);

  if (filteredSubMenu.length === 0) return null;

  // Use selected child's title and icon if available, otherwise use parent's
  const displayTitle = selectedChild?.title || nav.title;
  const displayIcon = selectedChild?.icon || nav.icon;

  return (
    <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
      <Dropdown
        trigger="click"
        placement="bottom-start"
        renderTitle={
          <button
            type="button"
            className={classNames(
              'relative flex items-center gap-1 rounded-sm px-1 py-0.5 text-sm font-medium transition-all duration-200',
              'outline-none focus:ring-0 focus:outline-none focus-visible:outline-none',
              'whitespace-nowrap',
              isParentActive
                ? 'bg-gray-100 text-black'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            )}
            title={displayTitle}
          >
            {displayIcon && <VerticalMenuIcon icon={displayIcon} />}
            <span className="hidden whitespace-nowrap xl:inline">{displayTitle}</span>

            <ApolloIcon name="chevron-arrow-down" className="text-sm" />
          </button>
        }
      >
        {filteredSubMenu.map((subItem) => {
          const isSubActive = pathname === subItem.path;
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
                style={{ height: '22px' }}
                className={classNames(
                  'flex min-w-[150px] items-center rounded-sm px-1.5 hover:bg-gray-200',
                  isSubActive ? 'bg-sand-1 hover:bg-sand-1 text-white' : ''
                )}
              >
                {subItem.path ? (
                  <Link
                    href={subItem.path}
                    className="flex w-full items-center gap-1.5 text-sm leading-none focus-visible:outline-none"
                    target={subItem.isExternalLink ? '_blank' : undefined}
                    onClick={() => {
                      // Track item selection when clicked
                      if (onItemClick && subItem.path) {
                        onItemClick(subItem, nav.key);
                      }
                    }}
                  >
                    {subItem.icon && (
                      <span className="flex shrink-0 items-center">
                        <VerticalMenuIcon icon={subItem.icon} />
                      </span>
                    )}
                    <span className="truncate">{subItem.title}</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-1.5 px-1.5">
                    {subItem.icon && (
                      <span className="flex shrink-0 items-center">
                        <VerticalMenuIcon icon={subItem.icon} />
                      </span>
                    )}
                    <span className="text-sm leading-none">{subItem.title}</span>
                  </div>
                )}
              </DropdownItem>
            </AuthorityCheck>
          );
        })}
      </Dropdown>
    </AuthorityCheck>
  );
};
