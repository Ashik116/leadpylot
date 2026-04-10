import { useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface UseCardGridVirtualizationProps<T> {
  items: T[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  columns?: number; // Number of columns in grid (responsive: 1, 2, or 4)
  itemHeight?: number; // Estimated height of each card
  overscan?: number; // Number of items to render outside visible area
  enabled?: boolean; // Enable/disable virtualization
}

export function useCardGridVirtualization<T>({
  items,
  containerRef,
  columns = 4,
  itemHeight = 150,
  overscan = 5,
  enabled = true,
}: UseCardGridVirtualizationProps<T>) {
  // Calculate rows based on items and columns
  const totalRows = useMemo(() => {
    if (!enabled || items.length === 0) return 0;
    return Math.ceil(items.length / columns);
  }, [items.length, columns, enabled]);

  // Memoize scroll element getter
  const getScrollElement = useCallback(() => containerRef.current, [containerRef]);

  // Memoize measure element callback
  const measureElement = useCallback(
    (element: Element | null) => {
      if (element) {
        return element.getBoundingClientRect().height;
      }
      return itemHeight;
    },
    [itemHeight]
  );

  const virtualizer = useVirtualizer({
    count: enabled ? totalRows : 0,
    getScrollElement,
    estimateSize: () => itemHeight,
    overscan,
    measureElement: typeof window !== 'undefined' && enabled ? measureElement : undefined,
  });

  // Calculate visible items with their grid positions
  const visibleItems = useMemo(() => {
    if (!enabled || items.length === 0) return [];
    
    const virtualItems = virtualizer.getVirtualItems();
    return virtualItems.map((virtualRow) => {
      const rowStart = virtualRow.index * columns;
      const rowEnd = Math.min(rowStart + columns, items.length);
      const rowItems = items.slice(rowStart, rowEnd);

      return {
        ...virtualRow,
        rowIndex: virtualRow.index,
        rowItems,
        rowStart,
        rowEnd,
      };
    });
  }, [virtualizer, items, columns, enabled]);

  return {
    virtualizer,
    visibleItems,
    totalSize: virtualizer.getTotalSize(),
    shouldVirtualize: enabled && items.length > 0,
  };
}

