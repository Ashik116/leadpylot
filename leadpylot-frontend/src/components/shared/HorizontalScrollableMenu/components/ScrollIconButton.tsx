'use client';


import React, { memo } from 'react';
import classNames from '@/utils/classNames';
import Button from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ScrollIconButtonProps } from '../types';

const ScrollIconButton: React.FC<ScrollIconButtonProps> = ({
  direction,
  onClick,
  className = '',
  size = 'xs',
  disabled = false,
}) => {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  const label = direction === 'left' ? 'Scroll left' : 'Scroll right';

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || !onClick) return;
    onClick(e);
  };

  return (
    <Button
      onClick={handleClick}
      size={size}
      variant="default"
      shape="circle"
      icon={<Icon />}
      disabled={disabled}
      className={classNames(
        'shadow-sm hover:shadow-md border border-gray-200',
        disabled && 'opacity-30 cursor-not-allowed',
        className
      )}
      aria-label={label}
      title={label}
    />
  );
};

ScrollIconButton.displayName = 'ScrollIconButton';

export default memo(ScrollIconButton);
