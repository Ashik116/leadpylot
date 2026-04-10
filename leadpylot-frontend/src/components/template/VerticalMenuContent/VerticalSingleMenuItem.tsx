import Tooltip from '@/components/ui/Tooltip';
import Menu from '@/components/ui/Menu';
import AuthorityCheck from '@/components/shared/AuthorityCheck';
import VerticalMenuIcon from './VerticalMenuIcon';
import NavigationBadge from '@/components/ui/NavigationBadge';
import Link from 'next/link';
import Dropdown from '@/components/ui/Dropdown';
import { memo } from 'react';
import type { CommonProps } from '@/@types/common';
import type { Direction } from '@/@types/theme';
import type { NavigationTree, TranslationFn } from '@/@types/navigation';

const { MenuItem } = Menu;

interface CollapsedItemProps extends CommonProps {
  nav: NavigationTree;
  direction?: Direction;
  onLinkClick?: (link: { key: string; title: string; path: string }) => void;
  t: TranslationFn;
  renderAsIcon?: boolean;
  userAuthority: string[];
  currentKey?: string;
  parentKeys?: string[];
}

interface DefaultItemProps {
  nav: NavigationTree;
  onLinkClick?: (link: { key: string; title: string; path: string }) => void;
  sideCollapsed?: boolean;
  t: TranslationFn;
  indent?: boolean;
  userAuthority: string[];
  showIcon?: boolean;
  showTitle?: boolean;
}

interface VerticalMenuItemProps extends CollapsedItemProps, DefaultItemProps {}

const CollapsedItem = memo(
  ({
    nav,
    children,
    direction,
    renderAsIcon,
    onLinkClick,
    userAuthority,
    t,
    currentKey,
  }: CollapsedItemProps) => {
    return (
      <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
        {renderAsIcon ? (
          <Tooltip
            title={t(nav.translateKey, nav.title)}
            placement={direction === 'rtl' ? 'left' : 'right'}
          >
            {children}
          </Tooltip>
        ) : (
          <Dropdown.Item active={currentKey === nav.key}>
            {nav.path ? (
              <Link
                className="flex h-full w-full items-center outline-hidden"
                href={nav.path}
                target={nav.isExternalLink ? '_blank' : ''}
                onClick={() =>
                  onLinkClick?.({
                    key: nav.key,
                    title: nav.title,
                    path: nav.path,
                  })
                }
              >
                <span>{t(nav.translateKey, nav.title)}</span>
              </Link>
            ) : (
              <span>{t(nav.translateKey, nav.title)}</span>
            )}
          </Dropdown.Item>
        )}
      </AuthorityCheck>
    );
  }
);

CollapsedItem.displayName = 'CollapsedItem';

const DefaultItem = memo((props: DefaultItemProps) => {
  const { nav, onLinkClick, showTitle, indent, showIcon = true, userAuthority, t } = props;

  return (
    <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
      <MenuItem className="relative" key={nav.key} eventKey={nav.key} dotIndent={indent}>
        <Link
          href={nav.path}
          className="flex h-full w-full items-center gap-2"
          target={nav.isExternalLink ? '_blank' : ''}
          onClick={() =>
            onLinkClick?.({
              key: nav.key,
              title: nav.title,
              path: nav.path,
            })
          }
        >
          <div className="flex flex-1 items-center gap-2">
            {showIcon && <VerticalMenuIcon icon={nav.icon} />}
            {showTitle && <span>{t(nav.translateKey, nav.title)}</span>}
          </div>
          {nav.badge && showTitle && (
            <NavigationBadge
              count={nav.badge.count}
              color={nav.badge.color}
              max={nav.badge.max}
              menuKey={nav.key}
            />
          )}

          {nav.badge && !showTitle && (
            <div className="absolute -top-2 -right-2">
              <NavigationBadge
                count={nav.badge.count}
                color={nav.badge.color}
                max={nav.badge.max}
                menuKey={nav.key}
                showTitle={showTitle}
              />
            </div>
          )}
        </Link>
      </MenuItem>
    </AuthorityCheck>
  );
});

DefaultItem.displayName = 'DefaultItem';

const VerticalSingleMenuItem = memo(
  ({
    nav,
    onLinkClick,
    sideCollapsed,
    direction,
    indent,
    renderAsIcon,
    userAuthority,
    showIcon,
    showTitle,
    t,
    currentKey,
    parentKeys,
  }: Omit<VerticalMenuItemProps, 'title' | 'translateKey'>) => {
    return (
      <>
        {sideCollapsed ? (
          <CollapsedItem
            currentKey={currentKey}
            parentKeys={parentKeys}
            nav={nav}
            direction={direction}
            renderAsIcon={renderAsIcon}
            userAuthority={userAuthority}
            t={t}
            onLinkClick={onLinkClick}
          >
            <DefaultItem
              nav={nav}
              sideCollapsed={sideCollapsed}
              userAuthority={userAuthority}
              showIcon={showIcon}
              showTitle={showTitle}
              t={t}
              onLinkClick={onLinkClick}
            />
          </CollapsedItem>
        ) : (
          <DefaultItem
            nav={nav}
            sideCollapsed={sideCollapsed}
            userAuthority={userAuthority}
            showIcon={showIcon}
            showTitle={showTitle}
            indent={indent}
            t={t}
            onLinkClick={onLinkClick}
          />
        )}
      </>
    );
  }
);

VerticalSingleMenuItem.displayName = 'VerticalSingleMenuItem';

export default VerticalSingleMenuItem;
