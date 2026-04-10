'use client';

import classNames from '@/utils/classNames';
import ScrollBar from '@/components/ui/ScrollBar';
import VerticalMenuContent from '@/components/template/VerticalMenuContent';
import useTheme from '@/utils/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import useNavigation from '@/utils/hooks/useNavigation';
import queryRoute from '@/utils/queryRoute';
import appConfig from '@/configs/app.config';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { SIDE_NAV_WIDTH, SIDE_NAV_COLLAPSED_WIDTH } from '@/constants/theme.constant';
import type { Mode } from '@/@types/theme';
import SideNavToggle from './SideNavToggle';
import { SideNavLogo } from './SideNavLogo';
import { useSideNavCollapse } from './hooks/useSideNavCollapse';
import { useSideNavHover } from './hooks/useSideNavHover';
import { getNavigationCache } from '@/utils/navigationCache';

type SideNavProps = {
  translationSetup?: boolean;
  background?: boolean;
  className?: string;
  contentClass?: string;
  currentRouteKey?: string;
  mode?: Mode;
};

const sideNavStyle = {
  width: SIDE_NAV_WIDTH,
  minWidth: SIDE_NAV_WIDTH,
};

const sideNavCollapseStyle = {
  width: SIDE_NAV_COLLAPSED_WIDTH,
  minWidth: SIDE_NAV_COLLAPSED_WIDTH,
};

const SideNav = ({
  translationSetup = appConfig.activeNavTranslation,
  background = true,
  className,
  contentClass,
  mode,
}: SideNavProps) => {
  const pathname = usePathname();
  const [stuck, setStuck] = useState(false);

  const route = queryRoute(pathname);
  const { navigationTree } = useNavigation();
  const defaultMode = useTheme((state) => state.mode);
  const direction = useTheme((state) => state.direction);
  const { user } = useAuth();

  // Get cached navigation for instant rendering on reload
  const cachedNav = useMemo(() => {
    // Only use cache when real data is not yet loaded
    if (!user || !navigationTree || navigationTree.length === 0) {
      return getNavigationCache();
    }
    return null;
  }, [user, navigationTree]);

  const currentRouteKey = route?.key || '';

  // Memoize user authority - use cached role if user not yet loaded
  const userAuthority = useMemo(() => {
    if (user?.role) {
      return [user.role];
    }
    // Fallback to cached role during initial load
    if (cachedNav?.role) {
      return [cachedNav.role];
    }
    return [];
  }, [user, cachedNav]);

  // Use navigationTree from context, fallback to cached during initial load
  const effectiveNavigationTree = useMemo(() => {
    if (navigationTree && navigationTree.length > 0) {
      return navigationTree;
    }
    // Use cached navigation during initial load
    return cachedNav?.navigationTree || [];
  }, [navigationTree, cachedNav]);

  // Custom hooks for sidebar behavior
  const { sideNavCollapse, setSideNavCollapse } = useSideNavCollapse();
  const { handleMouseEnter, handleMouseLeave } = useSideNavHover({
    setSideNavCollapse,
    stuck,
  });

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={sideNavCollapse ? sideNavCollapseStyle : sideNavStyle}
      className={classNames(
        'side-nav relative hidden transition-all duration-300 ease-in-out lg:block',
        sideNavCollapse ? 'w-16' : 'w-64',
        'transition-width transform transition-transform',
        background && 'side-nav-bg',
        !sideNavCollapse && 'side-nav-expand',
        className
      )}
    >
      <SideNavToggle onToggle={() => setStuck(false)} />

      <SideNavLogo
        mode={mode || defaultMode}
        collapsed={sideNavCollapse}
        onLogoClick={() => setStuck(true)}
      />

      <div
        className={classNames(
          'side-nav-content transition-all duration-300 ease-in-out',
          contentClass
        )}
      >
        <ScrollBar style={{ height: '100%' }} direction={direction}>
          <VerticalMenuContent
            collapsed={sideNavCollapse}
            navigationTree={effectiveNavigationTree}
            routeKey={currentRouteKey}
            direction={direction}
            translationSetup={translationSetup}
            userAuthority={userAuthority}
            onMenuItemClick={() => setStuck(true)}
          />
        </ScrollBar>
      </div>
    </div>
  );
};

export default SideNav;
