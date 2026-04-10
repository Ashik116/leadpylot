import { useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Row } from '@tanstack/react-table';

interface UseTableVirtualizationProps<T> {
  data: unknown[];
  rows: Row<T>[];
  enabled?: boolean;
  estimateRowHeight?: () => number;
  overscan?: number;
}

export function useTableVirtualization<T>({
  data,
  rows,
  enabled = true,
  estimateRowHeight = () => 55,
  overscan = 55,
}: UseTableVirtualizationProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Enable virtualization only when data length exceeds limit (default 50 in original code)
  const shouldVirtualize = enabled;

  // Memoize scroll element getter
  const getScrollElement = useCallback(() => parentRef.current, []);

  // Memoize measure element callback
  const measureElement = useCallback(
    (element: Element | null) => {
      if (element) {
        return element.getBoundingClientRect().height;
      }
      return estimateRowHeight();
    },
    [estimateRowHeight]
  );

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? rows.length : 0,
    getScrollElement,
    estimateSize: estimateRowHeight,
    overscan,
    measureElement: typeof window !== 'undefined' && shouldVirtualize ? measureElement : undefined,
  });

  return {
    virtualizer,
    parentRef,
    shouldVirtualize,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
  };
}
