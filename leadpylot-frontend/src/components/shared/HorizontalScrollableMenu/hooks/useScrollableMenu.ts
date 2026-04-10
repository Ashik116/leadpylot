
import { useRef, useState, useEffect, useCallback } from 'react';
import type {
 
  UseScrollableMenuOptions,
  UseScrollableMenuReturn,
} from '../types';

export const useScrollableMenu = ({
  items,
  scrollStep = 200,
}: UseScrollableMenuOptions): UseScrollableMenuReturn => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollLeftRef = useRef<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position and update button visibility
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;

    // Use a small threshold (0.5px) to account for sub-pixel rendering
    const threshold = 0.5;
    const hasScrollLeft = scrollLeft > threshold;
    const hasScrollRight = scrollLeft + clientWidth < scrollWidth - threshold;
    const isScrollable = scrollWidth > clientWidth;

    // Only update state if values changed to prevent unnecessary re-renders
    setCanScrollLeft((prev) => (prev !== hasScrollLeft ? hasScrollLeft : prev));
    setCanScrollRight((prev) => {
      // If content is not scrollable at all, disable right button
      if (!isScrollable) return false;
      return prev !== hasScrollRight ? hasScrollRight : prev;
    });
  }, []);

  // Check scroll position on mount and when items change
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Use multiple timeouts to ensure DOM is fully rendered
    const timeouts: NodeJS.Timeout[] = [];
    
    // Initial check after a short delay
    timeouts.push(setTimeout(checkScrollPosition, 0));
    // Check again after a longer delay to catch late renders
    timeouts.push(setTimeout(checkScrollPosition, 100));
    // Check after animation frame
    timeouts.push(setTimeout(() => {
      requestAnimationFrame(checkScrollPosition);
    }, 50));

    container.addEventListener('scroll', checkScrollPosition, {
      passive: true,
    });
    // Store scroll position on user scroll only (so it's not overwritten when items change)
    const saveScrollLeft = () => {
      if (scrollContainerRef.current)
        lastScrollLeftRef.current = scrollContainerRef.current.scrollLeft;
    };
    container.addEventListener('scroll', saveScrollLeft, { passive: true });
    window.addEventListener('resize', checkScrollPosition, {
      passive: true,
    });

    // Also check after scroll animation completes
    const handleScrollEnd = () => {
      setTimeout(checkScrollPosition, 100);
    };
    container.addEventListener('scrollend', handleScrollEnd, {
      passive: true,
    });

    return () => {
      timeouts.forEach(clearTimeout);
      container.removeEventListener('scroll', checkScrollPosition);
      container.removeEventListener('scroll', saveScrollLeft);
      container.removeEventListener('scrollend', handleScrollEnd);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [items, checkScrollPosition]);

  // Memoized smooth scroll function
  const scrollSmoothly = useCallback(
    (direction: 'left' | 'right') => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const currentScroll = container.scrollLeft;
      const targetScroll =
        direction === 'left'
          ? currentScroll - scrollStep
          : currentScroll + scrollStep;

      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    },
    [scrollStep]
  );

  // Memoized scroll icon click handler
  const handleScrollIconClick = useCallback(
    (direction: 'left' | 'right') => (e: React.MouseEvent) => {
      e.stopPropagation();
      scrollSmoothly(direction);
    },
    [scrollSmoothly]
  );

  return {
    scrollContainerRef,
    lastScrollLeftRef,
    canScrollLeft,
    canScrollRight,
    scrollSmoothly,
    handleScrollIconClick,
  };
};
