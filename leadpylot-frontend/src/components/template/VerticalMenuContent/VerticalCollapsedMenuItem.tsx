import Menu from '@/components/ui/Menu';
import Dropdown from '@/components/ui/Dropdown';
import VerticalMenuIcon from './VerticalMenuIcon';
import AuthorityCheck from '@/components/shared/AuthorityCheck';
import { memo } from 'react';
import type { CommonProps } from '@/@types/common';
import type { Direction } from '@/@types/theme';
import type { NavigationTree, TranslationFn } from '@/@types/navigation';

interface DefaultItemProps extends CommonProps {
  nav: NavigationTree;
  onLinkClick?: (link: { key: string; title: string; path: string }) => void;
  t: TranslationFn;
  indent?: boolean;
  dotIndent?: boolean;
  userAuthority: string[];
}

interface CollapsedItemProps extends DefaultItemProps {
  direction: Direction;
  renderAsIcon?: boolean;
  currentKey?: string;
  parentKeys?: string[];
}

interface VerticalCollapsedMenuItemProps extends CollapsedItemProps {
  sideCollapsed?: boolean;
}

const { MenuItem, MenuCollapse } = Menu;

const DefaultItem = memo(
  ({ nav, indent, dotIndent, children, userAuthority, t }: DefaultItemProps) => {
    return (
      <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
        <MenuCollapse
          className="h-8"
          key={nav.key}
          label={
            <>
              <VerticalMenuIcon icon={nav.icon} />
              <span>{t(nav.translateKey, nav.title)}</span>
            </>
          }
          eventKey={nav.key}
          expanded={false}
          dotIndent={dotIndent}
          indent={indent}
        >
          {children}
        </MenuCollapse>
      </AuthorityCheck>
    );
  }
);

DefaultItem.displayName = 'DefaultItem';

const CollapsedItem = memo(
  ({
    nav,
    direction,
    children,
    t,
    renderAsIcon,
    userAuthority,
    parentKeys,
  }: CollapsedItemProps) => {
    const menuItem = (
      <MenuItem
        key={nav.key}
        isActive={parentKeys?.includes(nav.key)}
        eventKey={nav.key}
        className="mb-2"
      >
        <VerticalMenuIcon icon={nav.icon} />
      </MenuItem>
    );

    const dropdownItem = <div key={nav.key}>{t(nav.translateKey, nav.title)}</div>;

    return (
      <AuthorityCheck userAuthority={userAuthority} authority={nav.authority}>
        <Dropdown
          trigger="hover"
          renderTitle={renderAsIcon ? menuItem : dropdownItem}
          placement={direction === 'rtl' ? 'left-start' : 'right-start'}
        >
          {children}
        </Dropdown>
      </AuthorityCheck>
    );
  }
);

CollapsedItem.displayName = 'CollapsedItem';

const VerticalCollapsedMenuItem = memo(
  ({ sideCollapsed, ...rest }: VerticalCollapsedMenuItemProps) => {
    return sideCollapsed ? <CollapsedItem {...rest} /> : <DefaultItem {...rest} />;
  }
);

VerticalCollapsedMenuItem.displayName = 'VerticalCollapsedMenuItem';

export default VerticalCollapsedMenuItem;
