'use client';

import React, { ReactNode, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCorners,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
  MeasuringStrategy,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

interface KanbanDndProviderProps {
  children: ReactNode;
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel?: () => void;
}

// Auto-scroll configuration
const AUTO_SCROLL_CONFIG = {
  threshold: 100, // Distance from edge to trigger scroll (px)
  maxSpeed: 25, // Maximum scroll speed (px per frame)
  acceleration: 0.5, // How quickly speed increases as you get closer to edge
};

/**
 * Optimized collision detection - uses pointerWithin first (fastest), fallbacks only when needed.
 */
const customCollisionDetection: CollisionDetection = (args: any) => {
  const { active } = args;
  const activeType = active.data?.type;

  // Fast path: pointerWithin is cheapest - use it first
  const pointerCollisions = pointerWithin(args);

  if (activeType === 'List') {
    const listCollisions = pointerCollisions.filter((c) => c.data?.type === 'List');
    if (listCollisions.length > 0) return listCollisions;
    return closestCorners(args).filter((c) => c.data?.type === 'List');
  }

  // Card: special targets (inbox, board selector, grid)
  const inbox = pointerCollisions.find((c) => c.id === 'inbox');
  if (inbox) return closestCenter(args);
  const handle = pointerCollisions.find((c) => c.id === 'board-selector-handle');
  if (handle) return [handle];
  const grid = pointerCollisions.find((c) => String(c.id).startsWith('board-grid-'));
  if (grid) return [grid];

  if (pointerCollisions.length > 0) return pointerCollisions;

  // Fallback only when pointerWithin is empty (e.g. near edges)
  const rectCollisions = rectIntersection(args);
  const inboxRect = rectCollisions.find((c) => c.id === 'inbox');
  if (inboxRect) return [inboxRect];
  const filtered = rectCollisions.filter(
    (c) => c.id !== 'board-selector-handle' && !String(c.id).startsWith('board-grid-')
  );
  if (filtered.length > 0) return filtered;
  return closestCorners(args).filter(
    (c) => c.id !== 'board-selector-handle' && !String(c.id).startsWith('board-grid-')
  );
};

/**
 * Hook for auto-scrolling during drag - cached containers, throttled, pointer tracking.
 */
const useAutoScroll = () => {
  const animationFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const pointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const containerCacheRef = useRef<{
    board: Element | null;
    lists: Element[];
    validAt: number;
  }>({ board: null, lists: [], validAt: 0 });
  const CACHE_TTL_MS = 500;

  const calculateScrollSpeed = useCallback((distance: number, threshold: number): number => {
    if (distance >= threshold) return 0;
    const normalizedDistance = 1 - distance / threshold;
    return (
      Math.pow(normalizedDistance, AUTO_SCROLL_CONFIG.acceleration) * AUTO_SCROLL_CONFIG.maxSpeed
    );
  }, []);

  const getContainers = useCallback(() => {
    const now = Date.now();
    if (containerCacheRef.current.validAt > now) {
      return containerCacheRef.current;
    }
    containerCacheRef.current = {
      board: document.querySelector('.custom-scrollbar.overflow-x-auto'),
      lists: Array.from(document.querySelectorAll('.custom-scrollbar.overflow-y-auto')),
      validAt: now + CACHE_TTL_MS,
    };
    return containerCacheRef.current;
  }, []);

  const performAutoScroll = useCallback(() => {
    if (!isDraggingRef.current || !pointerPositionRef.current) {
      animationFrameRef.current = null;
      return;
    }

    const scroll = () => {
      if (!isDraggingRef.current || !pointerPositionRef.current) {
        animationFrameRef.current = null;
        return;
      }

      const { x, y } = pointerPositionRef.current;
      const { threshold } = AUTO_SCROLL_CONFIG;
      const { board, lists } = getContainers();

      if (board) {
        const rect = board.getBoundingClientRect();
        const distanceFromLeft = x - rect.left;
        const distanceFromRight = rect.right - x;

        if (distanceFromLeft < threshold && distanceFromLeft > 0) {
          const speed = calculateScrollSpeed(distanceFromLeft, threshold);
          (board as HTMLElement).scrollLeft -= speed;
        } else if (distanceFromRight < threshold && distanceFromRight > 0) {
          const speed = calculateScrollSpeed(distanceFromRight, threshold);
          (board as HTMLElement).scrollLeft += speed;
        }
      }

      for (let i = 0; i < lists.length; i++) {
        const container = lists[i];
        const rect = container.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right) {
          const distanceFromTop = y - rect.top;
          const distanceFromBottom = rect.bottom - y;

          if (distanceFromTop < threshold && distanceFromTop > 0) {
            const speed = calculateScrollSpeed(distanceFromTop, threshold);
            (container as HTMLElement).scrollTop -= speed;
          } else if (distanceFromBottom < threshold && distanceFromBottom > 0) {
            const speed = calculateScrollSpeed(distanceFromBottom, threshold);
            (container as HTMLElement).scrollTop += speed;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scroll);
    };

    scroll();
  }, [calculateScrollSpeed, getContainers]);

  const pointerCleanupRef = useRef<(() => void) | null>(null);

  const startAutoScroll = useCallback((initialPos?: { x: number; y: number }) => {
    isDraggingRef.current = true;
    if (initialPos) pointerPositionRef.current = initialPos;
    containerCacheRef.current.validAt = 0;
    const onPointerMove = (e: PointerEvent) => {
      pointerPositionRef.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    pointerCleanupRef.current = () => {
      document.removeEventListener('pointermove', onPointerMove);
      pointerCleanupRef.current = null;
    };
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(performAutoScroll);
    }
  }, [performAutoScroll]);

  const stopAutoScroll = useCallback(() => {
    isDraggingRef.current = false;
    pointerPositionRef.current = null;
    pointerCleanupRef.current?.();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return { startAutoScroll, stopAutoScroll };
};

/**
 * DnD Context Provider wrapper component
 * Configures sensors and provides drag handlers
 * Includes auto-scroll functionality during drag
 */
export const KanbanDndProvider: React.FC<KanbanDndProviderProps> = ({
  children,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragCancel,
}) => {
  const { startAutoScroll, stopAutoScroll } = useAutoScroll();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activator = event.activatorEvent as PointerEvent | undefined;
      const initialPos =
        activator && 'clientX' in activator
          ? { x: activator.clientX, y: activator.clientY }
          : undefined;
      startAutoScroll(initialPos);
      onDragStart(event);
    },
    [onDragStart, startAutoScroll]
  );

  // Enhanced drag end with auto-scroll cleanup
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      stopAutoScroll();
      onDragEnd(event);
    },
    [onDragEnd, stopAutoScroll]
  );

  // Handle drag cancel (escape key, etc.)
  const handleDragCancel = useCallback(() => {
    stopAutoScroll();
    onDragCancel?.();
  }, [onDragCancel, stopAutoScroll]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.WhileDragging,
        },
      }}
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
    </DndContext>
  );
};
