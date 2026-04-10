import { useState, Suspense, lazy, useMemo } from 'react';
import classNames from 'classnames';
import Drawer from '@/components/ui/Drawer';
import NavToggle from '@/components/shared/NavToggle';
import { DIR_RTL } from '@/constants/theme.constant';
import withHeaderItem, { WithHeaderItemProps } from '@/utils/hoc/withHeaderItem';
import useNavigation from '@/utils/hooks/useNavigation';
import useTheme from '@/utils/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import queryRoute from '@/utils/queryRoute';
import appConfig from '@/configs/app.config';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import Link from 'next/link';

const VerticalMenuContent = lazy(() => import('@/components/template/VerticalMenuContent'));

type MobileNavToggleProps = {
  toggled?: boolean;
};

type MobileNavProps = {
  translationSetup?: boolean;
};

const MobileNavToggle = withHeaderItem<MobileNavToggleProps & WithHeaderItemProps>(NavToggle);

const MobileNav = ({ translationSetup = appConfig.activeNavTranslation }: MobileNavProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenDrawer = () => {
    setIsOpen(true);
  };

  const handleDrawerClose = () => {
    setIsOpen(false);
  };

  const pathname = usePathname();

  const route = queryRoute(pathname);

  const currentRouteKey = route?.key || '';

  const direction = useTheme((state) => state.direction);

  const { user, isAuthenticated, isLoading } = useAuth();

  const { navigationTree } = useNavigation();

  // Memoize user authority to prevent unnecessary re-renders
  const userAuthority = useMemo(() => {
    return user?.role ? [user.role] : [];
  }, [user?.role]);

  // Only render navigation if session is ready
  const isSessionReady = !isLoading && isAuthenticated && user;

  return (
    <>
      <div className="block text-2xl lg:hidden" onClick={handleOpenDrawer}>
        <MobileNavToggle toggled={isOpen} />
      </div>
      <Drawer
        title={
          <Link href={appConfig.authenticatedEntryPath} onClick={handleDrawerClose}>
            <Logo imgClass="max-h-8" />
          </Link>
        }
        isOpen={isOpen}
        bodyClass={classNames('p-0')}
        width={220}
        placement={direction === DIR_RTL ? 'right' : 'left'}
        onClose={handleDrawerClose}
        onRequestClose={handleDrawerClose}
      >
        <Suspense fallback={<></>}>
          {isOpen && isSessionReady && (
            <VerticalMenuContent
              collapsed={false}
              navigationTree={navigationTree}
              routeKey={currentRouteKey}
              userAuthority={userAuthority}
              translationSetup={translationSetup}
              direction={direction}
              onMenuItemClick={handleDrawerClose}
            />
          )}
        </Suspense>
      </Drawer>
    </>
  );
};

export default MobileNav;
