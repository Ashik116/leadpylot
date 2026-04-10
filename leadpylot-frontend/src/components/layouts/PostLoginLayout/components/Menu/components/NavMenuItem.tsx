import Link from 'next/link';
import AuthorityCheck from '@/components/shared/AuthorityCheck';
import VerticalMenuIcon from '@/components/template/VerticalMenuContent/VerticalMenuIcon';
import type { NavigationTree } from '@/@types/navigation';
import classNames from '@/utils/classNames';

interface NavMenuItemProps {
  nav: NavigationTree;
  isActive: boolean;
  userAuthority: string[];
  pendingTaskCount?: number;
}

export const NavMenuItem = ({
  nav,
  isActive,
  userAuthority,
  pendingTaskCount,
}: NavMenuItemProps) => {
  const pendingCountDisplay =
    pendingTaskCount !== undefined && pendingTaskCount > 99 ? '99+' : pendingTaskCount;
  return (
    <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
      <Link
        href={nav.path}
        className={classNames(
          'focus:outline-non relative flex items-center gap-1 rounded-sm px-1 py-0.5 text-sm font-medium transition-colors outline-none focus:ring-0',
          isActive ? 'bg-sand-1 text-white [&_*]:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        )}
        target={nav.isExternalLink ? '_blank' : undefined}
        title={nav.title}
      >
        {nav.icon && (
          <span className="inline-flex items-center">
            <VerticalMenuIcon icon={nav.icon} />
          </span>
        )}
        <span className="hidden xl:inline">{nav.title}</span>
        {nav.badge && (
          <span
            className={classNames(
              'ml-1 rounded-full px-2 py-0.5 text-xs font-semibold',
              nav.badge.color || 'bg-amber-600',
              nav.badge.variant === 'solid' ? 'text-white' : 'text-gray-900'
            )}
          >
            {nav.badge.count}
          </span>
        )}
        {pendingTaskCount !== undefined && pendingTaskCount > 0 && (
          <span
            className="pointer-events-none absolute -top-2 -right-4 z-10 grid min-h-5 w-5 place-items-center rounded-full border-2 border-white bg-yellow-400 text-center font-semibold text-gray-900 shadow-sm"
            title={pendingTaskCount.toString()}
          >
            <span
              className={classNames(
                'translate-y-[1px] leading-none',
                pendingTaskCount > 99 ? 'text-[7px]' : 'text-[9px]'
              )}
            >
              {pendingCountDisplay}
            </span>
          </span>
        )}
      </Link>
    </AuthorityCheck>
  );
};
