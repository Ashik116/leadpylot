'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import AuthorityCheck from '@/components/shared/AuthorityCheck';
import VerticalMenuIcon from '@/components/template/VerticalMenuContent/VerticalMenuIcon';
import classNames from '@/utils/classNames';
import { useAuth } from '@/hooks/useAuth';
import useNavigation from '@/utils/hooks/useNavigation';
import { filterSubMenuByAuthority } from './utils/navMenuHelpers';
import type { NavigationTree } from '@/@types/navigation';

const NavSubTabBar = () => {
  const pathname = usePathname();
  const { navigationTree } = useNavigation();
  const { user } = useAuth();

  const userAuthority = useMemo(
    () => (user?.role ? [String(user.role)] : []),
    [user?.role]
  );

  const activeSubMenu = useMemo(() => {
    const workflowSection = navigationTree.find((nav) => nav.key === 'dashboard');
    const menuItems = workflowSection?.subMenu || [];

    // Only show sub-tab bar for the Leads section
    const leadsItem = menuItems.find((item) => item.key === 'dashboard.leads');
    if (!leadsItem?.subMenu?.length) return null;

    const subItems = filterSubMenuByAuthority(leadsItem.subMenu, userAuthority);
    const isLeadsActive = subItems.some((sub) => {
      if (!sub.path) return false;
      if (pathname === sub.path) return true;
      if (pathname.startsWith(sub.path + '/')) {
        return !subItems.some(
          (other) =>
            other.path &&
            other.path !== sub.path &&
            pathname.startsWith(other.path + '/') &&
            other.path.startsWith(sub.path + '/')
        );
      }
      return false;
    });

    return isLeadsActive ? subItems : null;
  }, [navigationTree, pathname, userAuthority]);

  if (!activeSubMenu || activeSubMenu.length === 0) return null;

  return (
    <div className="border-b border-gray-200 bg-white px-4 dark:bg-[var(--dm-bg-surface)]">
      <div className="flex items-center gap-0 overflow-x-auto">
        {activeSubMenu.map((subItem: NavigationTree) => {
          const subPath = subItem.path || '';
          const isExactMatch = pathname === subPath;
          const isNestedMatch =
            subPath && pathname.startsWith(subPath + '/');
          // Check if another tab has a longer (more specific) path that also matches
          const hasMoreSpecificMatch = activeSubMenu.some(
            (other) =>
              other.path &&
              other.path !== subPath &&
              other.path.length > subPath.length &&
              (pathname === other.path || pathname.startsWith(other.path + '/'))
          );
          const isActive = isExactMatch || (isNestedMatch && !hasMoreSpecificMatch);

          return (
            <AuthorityCheck
              key={subItem.key}
              userAuthority={userAuthority}
              authority={subItem.authority}
            >
              <Link
                href={subPath || '#'}
                className={classNames(
                  'flex shrink-0 items-center gap-1 border-b-2 px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-green-600 text-green-700 dark:border-green-500 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-[var(--dm-text-secondary)] dark:hover:text-[var(--dm-text-primary)]'
                )}
              >
                {subItem.icon && (
                  <span className="inline-flex items-center text-xs">
                    <VerticalMenuIcon icon={subItem.icon} />
                  </span>
                )}
                {subItem.title}
              </Link>
            </AuthorityCheck>
          );
        })}
      </div>
    </div>
  );
};

export default NavSubTabBar;
