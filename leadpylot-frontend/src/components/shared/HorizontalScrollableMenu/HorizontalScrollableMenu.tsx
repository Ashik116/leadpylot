'use client';



import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import classNames from '@/utils/classNames';
import MenuItem from './components/MenuItem';
import ScrollControls from './components/ScrollControls';
import ScrollIconButton from './components/ScrollIconButton';
import { useScrollableMenu } from './hooks/useScrollableMenu';
import type { HorizontalScrollableMenuProps } from './types';

const HorizontalScrollableMenu: React.FC<HorizontalScrollableMenuProps> = ({
  items = [],
  className = '',
  itemClassName = '',
  activeItemClassName = '',
  scrollStep = 200,
  showScrollIcons = true,
  scrollControlsMode = 'hover',
  scrollIconClassName = '',
  gap = '0.5rem',
  renderScrollControls,
  disableScrollIntoView = false,
}) => {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Use custom hook for scroll functionality
  const {
    scrollContainerRef,
    lastScrollLeftRef,
    canScrollLeft,
    canScrollRight,
    handleScrollIconClick,
  } = useScrollableMenu({ items, scrollStep });

  // Call renderScrollControls if provided to update external controls
  useEffect(() => {
    if (renderScrollControls) {
      renderScrollControls({
        canScrollLeft,
        canScrollRight,
        onScrollLeft: handleScrollIconClick('left'),
        onScrollRight: handleScrollIconClick('right'),
      });
    }
  }, [canScrollLeft, canScrollRight, handleScrollIconClick, renderScrollControls]);

  // Keep active tab visible when selection changes - scroll it into view if needed
  // When disableScrollIntoView is true, skip entirely to keep left edge stable when switching tabs
  useEffect(() => {
    if (disableScrollIntoView) return;
    const container = scrollContainerRef.current;
    if (!container || !items?.length) return;
    const activeEl = container.querySelector('[data-active-item="true"]') as HTMLElement | null;
    if (!activeEl) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();
    const tolerance = 2;
    const isVisible =
      elRect.left >= containerRect.left - tolerance &&
      elRect.right <= containerRect.right + tolerance;

    if (isVisible) {
      // Active tab already visible - preserve scroll position (no jump)
      return;
    }

    // Active tab not visible - scroll it into view so user sees which tab they selected
    activeEl.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'instant' });
    if (container) lastScrollLeftRef.current = container.scrollLeft;
  }, [items, scrollContainerRef, lastScrollLeftRef, disableScrollIntoView]);

  // Memoized hover handlers
  const handleMouseEnter = useCallback((itemId: string) => {
    setHoveredItemId(itemId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredItemId(null);
  }, []);

  // Capture scroll position right before click so restore has latest value
  const captureScrollBeforeInteraction = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) lastScrollLeftRef.current = container.scrollLeft;
  }, [scrollContainerRef, lastScrollLeftRef]);

  // Memoized container style
  const containerStyle = useMemo(
    () => ({
      gap,
    }),
    [gap]
  );

  // Early return if no items
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className={classNames('flex w-full min-w-0 items-center gap-2', className)}>
      {/* Left Scroll Control - fixed width container to prevent layout shift when tab changes */}
      {showScrollIcons && scrollControlsMode === 'always' && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
          <ScrollIconButton
            direction="left"
            onClick={handleScrollIconClick('left')}
            size="xs"
            disabled={!canScrollLeft}
            className={scrollIconClassName}
          />
        </div>
      )}

      {/* Scrollable Container - min-w-0 flex-1 so it absorbs flex changes, arrows stay fixed */}
      <div
        ref={scrollContainerRef}
        className={classNames(
          'scrollbar-none flex min-w-0 flex-1 items-center overflow-x-auto overflow-y-hidden'
        )}
        style={containerStyle}
      >
        {items?.map((item) => {
          if (!item?.id) return null;

          const isHovered = hoveredItemId === item.id;
          const showScrollControls =
            showScrollIcons && isHovered && (canScrollLeft || canScrollRight);

          return (
            <div
              key={item.id}
              className="relative flex shrink-0 items-center gap-1"
              data-active-item={item.isActive ? 'true' : undefined}
              onMouseEnter={() => handleMouseEnter(item.id)}
              onMouseLeave={handleMouseLeave}
              onPointerDown={captureScrollBeforeInteraction}
            >
              {/* Menu Item */}
              <MenuItem
                item={item}
                itemClassName={itemClassName}
                activeItemClassName={activeItemClassName}
              />

              {/* Scroll Controls - Show on hover when scrollable */}
              {scrollControlsMode === 'hover' && showScrollControls && (
                <ScrollControls
                  canScrollLeft={canScrollLeft}
                  canScrollRight={canScrollRight}
                  onScrollLeft={handleScrollIconClick('left')}
                  onScrollRight={handleScrollIconClick('right')}
                  scrollIconClassName={scrollIconClassName}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Right Scroll Control - fixed width container to prevent layout shift when tab changes */}
      {showScrollIcons && scrollControlsMode === 'always' && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center">
          <ScrollIconButton
            direction="right"
            onClick={handleScrollIconClick('right')}
            size="xs"
            disabled={!canScrollRight}
            className={scrollIconClassName}
          />
        </div>
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(HorizontalScrollableMenu);
