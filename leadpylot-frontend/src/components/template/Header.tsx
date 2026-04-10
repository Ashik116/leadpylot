import type { CommonProps } from '@/@types/common';
import { HEADER_HEIGHT } from '@/constants/theme.constant';
import classNames from '@/utils/classNames';
import type { ReactNode } from 'react';

interface HeaderProps extends CommonProps {
  headerStart?: ReactNode;
  headerEnd?: ReactNode;
  headerMiddle?: ReactNode;
  container?: boolean;
  wrapperClass?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  backButtonText?: string;
}

const Header = (props: HeaderProps) => {
  const { headerStart, headerEnd, headerMiddle, className, container, wrapperClass } = props;

  return (
    <header className={classNames('header', className)}>
      <div
        className={classNames('header-wrapper', container && 'container mx-auto', wrapperClass)}
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="header-action">{headerStart}</div>
        {headerMiddle && <div className="header-action header-action-middle">{headerMiddle}</div>}
        <div className="header-action header-action-end">{headerEnd}</div>
      </div>
    </header>
  );
};

export default Header;
