import classNames from '../utils/classNames';
import { useTabs } from './context';
import useCallbackRef from '../hooks/useCallbackRef';
import type { CommonProps } from '../@types/common';
import type { TabsValue } from './context';
import type { ReactNode, Ref } from 'react';

export interface TabNavProps extends CommonProps {
  disabled?: boolean;
  icon?: string | ReactNode;
  ref?: Ref<HTMLDivElement>;
  value: TabsValue;
}

const TabNav = (props: TabNavProps) => {
  const { value: valueProp, disabled, className, icon, children, ref, ...rest } = props;

  const { value, onValueChange, variant, toggle } = useTabs();
  const isSelected = valueProp === value;

  const onTabNavClick = useCallbackRef(() => {
    if (!disabled) {
      if (toggle && isSelected) {
        // In toggle mode, if tab is already selected, deselect it
        onValueChange?.('');
      } else if (!isSelected) {
        // Select the tab if it's not currently selected
        onValueChange?.(valueProp);
      }
    }
  });

  const tabNavClass = classNames(
    'tab-nav',
    `tab-nav-${variant}`,
    isSelected && `tab-nav-active text-sand-1`,
    isSelected && variant === 'underline' && `border-sand-1`,
    isSelected && variant === 'pill' && `bg-sand-1 text-sand-1`,
    disabled && 'tab-nav-disabled',
    !disabled && !isSelected && `hover:text-sand-1`,
    className
  );

  return (
    <div
      ref={ref}
      className={tabNavClass}
      role="tab"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={onTabNavClick}
      onKeyDown={onTabNavClick}
      {...rest}
    >
      {icon && <div className="tab-nav-icon">{icon}</div>}
      {children}
    </div>
  );
};

export default TabNav;
