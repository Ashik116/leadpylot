import Link from 'next/link';
import classNames from '@/utils/classNames';
import Logo from '@/components/template/Logo';
import appConfig from '@/configs/app.config';
import { HEADER_HEIGHT, LOGO_X_GUTTER, SIDE_NAV_CONTENT_GUTTER } from '@/constants/theme.constant';
import type { Mode } from '@/@types/theme';

interface SideNavLogoProps {
  mode: Mode;
  collapsed: boolean;
  onLogoClick: () => void;
}

/**
 * Side Navigation Logo Component
 */
export const SideNavLogo = ({ mode, collapsed, onLogoClick }: SideNavLogoProps) => {
  return (
    <Link
      href={appConfig.authenticatedEntryPath}
      className="side-nav-header flex flex-col justify-center"
      style={{ height: HEADER_HEIGHT }}
      onClick={onLogoClick}
    >
      <Logo
        imgClass="max-h-8 transition-all duration-300 ease-in-out"
        mode={mode}
        type={collapsed ? 'mini' : 'full'}
        className={classNames(
          'transition-all duration-300 ease-in-out',
          collapsed && 'ltr:mr-[11.5px] ltr:ml-[11.5px]',
          collapsed ? SIDE_NAV_CONTENT_GUTTER : LOGO_X_GUTTER
        )}
      />
    </Link>
  );
};

