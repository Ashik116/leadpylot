'use client';

import { useState, useEffect, Fragment, useMemo, useCallback } from 'react';
import Menu from '@/components/ui/Menu';
import VerticalSingleMenuItem from './VerticalSingleMenuItem';
import VerticalCollapsedMenuItem from './VerticalCollapsedMenuItem';
import AuthorityCheck from '@/components/shared/AuthorityCheck';
import { themeConfig } from '@/configs/theme.config';
import {
  NAV_ITEM_TYPE_TITLE,
  NAV_ITEM_TYPE_COLLAPSE,
  NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant';
import useMenuActive from '@/utils/hooks/useMenuActive';
import useTranslation from '@/utils/hooks/useTranslation';
import { Direction } from '@/@types/theme';
import type { NavigationTree, TranslationFn } from '@/@types/navigation';

export interface VerticalMenuContentProps {
  collapsed?: boolean;
  routeKey: string;
  navigationTree?: NavigationTree[];
  onMenuItemClick?: () => void;
  direction?: Direction;
  translationSetup: boolean;
  userAuthority: string[];
}

const { MenuGroup } = Menu;

const MAX_CASCADE_LEVEL = 2;

const VerticalMenuContent = (props: VerticalMenuContentProps) => {
  const {
    collapsed,
    routeKey,
    navigationTree = [],
    onMenuItemClick,
    direction = themeConfig.direction,
    translationSetup,
    userAuthority,
  } = props;

  const translationPlaceholder = (key: string, fallback?: string) => {
    return fallback || key;
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const t = (translationSetup ? useTranslation() : translationPlaceholder) as TranslationFn;

  const [defaulExpandKey, setDefaulExpandKey] = useState<string[]>([]);

  const { activedRoute } = useMenuActive(navigationTree, routeKey);

  useEffect(() => {
    // Only expand the parent menu of the active route, keep all others closed
    if (activedRoute?.parentKey) {
      setDefaulExpandKey([activedRoute?.parentKey]);
    } else {
      setDefaulExpandKey([]);
    }
  }, [activedRoute?.parentKey]);

  const handleLinkClick = useCallback(() => {
    onMenuItemClick?.();
  }, [onMenuItemClick]);

  // Memoize the navigation rendering function to prevent unnecessary re-renders
  const renderNavigation = useCallback(
    (navTree: NavigationTree[], cascade: number = 0, indent?: boolean) => {
      const nextCascade = cascade + 1;

      return (
        <div>
          {navTree.map((nav) => (
            <Fragment key={nav.key}>
              {nav.type === NAV_ITEM_TYPE_ITEM && (
                <VerticalSingleMenuItem
                  key={nav.key}
                  currentKey={activedRoute?.key}
                  parentKeys={defaulExpandKey}
                  nav={nav}
                  sideCollapsed={collapsed}
                  direction={direction}
                  indent={indent}
                  renderAsIcon={cascade <= 0}
                  showIcon={cascade <= 0}
                  userAuthority={userAuthority}
                  showTitle={collapsed ? cascade >= 1 : cascade <= MAX_CASCADE_LEVEL}
                  t={t}
                  onLinkClick={handleLinkClick}
                />
              )}
              {nav.type === NAV_ITEM_TYPE_COLLAPSE && (
                <VerticalCollapsedMenuItem
                  key={nav.key}
                  currentKey={activedRoute?.key}
                  parentKeys={defaulExpandKey}
                  nav={nav}
                  sideCollapsed={collapsed}
                  direction={direction}
                  indent={nextCascade >= MAX_CASCADE_LEVEL}
                  dotIndent={nextCascade >= MAX_CASCADE_LEVEL}
                  renderAsIcon={nextCascade <= 1}
                  userAuthority={userAuthority}
                  t={t}
                  onLinkClick={onMenuItemClick}
                >
                  {nav.subMenu &&
                    nav.subMenu.length > 0 &&
                    renderNavigation(nav.subMenu, nextCascade, true)}
                </VerticalCollapsedMenuItem>
              )}
              {nav.type === NAV_ITEM_TYPE_TITLE && (
                <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
                  <MenuGroup key={nav.key} label={t(nav.translateKey) || nav.title}>
                    {nav.subMenu &&
                      nav.subMenu.length > 0 &&
                      renderNavigation(nav.subMenu, cascade, false)}
                  </MenuGroup>
                </AuthorityCheck>
              )}
            </Fragment>
          ))}
        </div>
      );
    },
    [
      activedRoute?.key,
      defaulExpandKey,
      collapsed,
      direction,
      userAuthority,
      t,
      handleLinkClick,
      onMenuItemClick,
    ]
  );

  // Memoize the rendered navigation to prevent unnecessary re-renders
  const renderedNavigation = useMemo(() => {
    return renderNavigation(navigationTree, 0);
  }, [renderNavigation, navigationTree]);

  return (
    <Menu
      className="px-3 pb-4"
      sideCollapsed={collapsed}
      defaultActiveKeys={activedRoute?.key ? [activedRoute.key] : []}
      defaultExpandedKeys={defaulExpandKey}
      defaultCollapseActiveKeys={[]}
      menuItemHeight={32}
    >
      {renderedNavigation}
    </Menu>
  );
};

export default VerticalMenuContent;
