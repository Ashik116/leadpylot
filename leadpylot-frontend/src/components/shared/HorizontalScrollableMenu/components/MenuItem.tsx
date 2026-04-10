'use client';



import React, { memo } from 'react';
import classNames from '@/utils/classNames';
import type { MenuItemProps } from '../types';

const MenuItem: React.FC<MenuItemProps> = ({
  item,
  itemClassName = '',
  activeItemClassName = '',
  onMouseEnter,
  onMouseLeave,
}) => {
  if (!item?.id) return null;

  const isActive = item.isActive ?? false;
  const inactiveClass = item.className || itemClassName || 'text-gray-500';
  const activeClass =
    item.activeClassName || activeItemClassName || 'bg-green-50 text-green-700 ring-1 ring-green-500/20';
  const hasCustomInactiveClass = Boolean(item.className || itemClassName);

  return (
    <button
      onClick={item.onClick}
      type='button'
      onMouseEnter={onMouseEnter ? () => onMouseEnter(item.id) : undefined}
      onMouseLeave={onMouseLeave || undefined}
      className={classNames(
        'flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 whitespace-nowrap ',
        isActive ? activeClass : inactiveClass,
        // Minimal hover effect - removed background hover
        !isActive && !hasCustomInactiveClass && 'hover:text-gray-700'
      )}
    >
      {item.icon && (
        <span className="flex items-center" aria-hidden="true">
          {item.icon}
        </span>
      )}
      {item.label}
    </button>
  );
};

MenuItem.displayName = 'MenuItem';

export default memo(MenuItem);
