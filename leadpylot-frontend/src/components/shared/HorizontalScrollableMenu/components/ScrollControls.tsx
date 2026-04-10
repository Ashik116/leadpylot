'use client';


import React, { memo } from 'react';
import ScrollIconButton from './ScrollIconButton';
import type { ScrollControlsProps } from '../types';

const ScrollControls: React.FC<ScrollControlsProps> = ({
  canScrollLeft,
  canScrollRight,
  onScrollLeft,
  onScrollRight,
  scrollIconClassName = '',
  iconSize = 'xs',
}) => {
  if (!canScrollLeft && !canScrollRight) {
    return null;
  }

  return (
    <div className="flex items-center gap-0.5 ml-1">
      {canScrollLeft && (
        <ScrollIconButton
          direction="left"
          onClick={onScrollLeft}
          className={scrollIconClassName}
          size={iconSize}
        />
      )}
      {canScrollRight && (
        <ScrollIconButton
          direction="right"
          onClick={onScrollRight}
          className={scrollIconClassName}
          size={iconSize}
        />
      )}
    </div>
  );
};

ScrollControls.displayName = 'ScrollControls';

export default memo(ScrollControls);
