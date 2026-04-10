'use client';

import React, { memo, useMemo } from 'react';
import ScrollIconButton from '@/components/shared/HorizontalScrollableMenu/components/ScrollIconButton';
import { useScrollableMenu } from '@/components/shared/HorizontalScrollableMenu/hooks/useScrollableMenu';

interface FilterTagsScrollRowProps {
  itemCount: number;
  children: React.ReactNode;
  stacked?: boolean;
}

const FilterTagsScrollRow: React.FC<FilterTagsScrollRowProps> = ({
  itemCount,
  children,
  stacked = false,
}) => {
  const items = useMemo(
    () => Array.from({ length: itemCount }, (_, idx) => ({ id: `filter-tag-${idx}`, label: '' })),
    [itemCount]
  );

  const { scrollContainerRef, canScrollLeft, canScrollRight, handleScrollIconClick } =
    useScrollableMenu({
      items,
      scrollStep: 260,
    });
  const hasScrollableContent = canScrollLeft || canScrollRight;

  return (
    <div className="flex w-full min-w-0 items-center gap-1 self-center">
      {!stacked && hasScrollableContent && (
        <ScrollIconButton
          direction="left"
          onClick={handleScrollIconClick('left')}
          disabled={!canScrollLeft}
          className={canScrollLeft ? 'bg-white shrink-0' : 'bg-gray-100 text-gray-400 shrink-0'}
        />
      )}

      <div
        ref={scrollContainerRef}
        className={`scrollbar-none flex min-w-0 flex-1 gap-2 ${
          stacked
            ? 'flex-col items-stretch overflow-y-auto'
            : 'flex-nowrap items-center overflow-x-auto whitespace-nowrap'
        }`}
        onWheel={(e) => {
          const el = scrollContainerRef.current;
          if (!el) return;
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
            e.preventDefault();
            el.scrollLeft += e.deltaY;
          }
        }}
      >
        {children}
      </div>

      {!stacked && hasScrollableContent && (
        <ScrollIconButton
          direction="right"
          onClick={handleScrollIconClick('right')}
          disabled={!canScrollRight}
          className={canScrollRight ? 'bg-white shrink-0' : 'bg-gray-100 text-gray-400 shrink-0'}
        />
      )}
    </div>
  );
};

export default memo(FilterTagsScrollRow);
