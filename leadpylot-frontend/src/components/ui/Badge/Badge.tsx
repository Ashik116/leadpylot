import classNames from '../utils/classNames';
import type { CommonProps } from '../@types/common';
import type { CSSProperties, Ref } from 'react';

export interface BadgeProps extends CommonProps {
  badgeStyle?: CSSProperties;
  content?: string | number;
  innerClass?: string;
  maxCount?: number;
  ref?: Ref<HTMLSpanElement>;
  icon?: React.ReactNode;
}

const Badge = (props: BadgeProps) => {
  const {
    badgeStyle,
    children,
    className,
    content,
    innerClass,
    maxCount = 99,
    ref,
    icon,
    ...rest
  } = props;

  const badgeBaseClass = 'rounded-full text-xs font-semibold bg-rust text-white';

  const dot = typeof content !== 'number' && typeof content !== 'string';

  const badgeClass = classNames(
    dot ? 'badge-dot h-3 border border-white' : 'badge px-2 py-1 min-w-6',
    badgeBaseClass,
    innerClass
  );

  const renderBadge = () => {
    if (children) {
      return (
        <span
          ref={ref}
          className={classNames('badge-wrapper relative flex text-xs', className)}
          {...rest}
        >
          {/* <span className={classNames(badgeClass, 'badge-inner text-xs')} style={badgeStyle}>
            {typeof content === 'number' && content > maxCount ? `${maxCount}+` : content}
          </span> */}
          {children}
        </span>
      );
    }
    return (
      <span
        ref={ref}
        className={classNames(`${badgeClass} items-center truncate text-sm font-normal`, className)}
        style={badgeStyle}
        {...rest}
      >
        <div className={classNames('', icon ? 'flex items-center gap-0.5' : 'text-center')}>
          {content}
          {icon && icon}
        </div>
      </span>
    );
  };

  return renderBadge();
};

Badge.displayName = 'Badge';

export default Badge;
