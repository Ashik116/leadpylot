import { useCallback, useRef, useEffect } from 'react';
import { DragDropTableType } from '../DragDropContext';
import { useOpeningsMultiTable } from '../OpeningsMultiTableContext';
import { useDraggedItemsStore } from '@/stores/draggedItemsStore';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';

const SCROLL_THRESHOLD = 100; // Distance from edge to trigger scroll (px)
const SCROLL_SPEED = 10; // Pixels per frame
const CACHE_DURATION = 100; // Cache rects for 100ms

export const useOpeningsMultiTableDragDrop = () => {
  const {
    sourceTableRef,
    destinationTableRef,
    isDraggingRef,
    draggedItemAvailableRevertsRef,
    dragOperationRef,
    setDestinationTable,
    setSourceTable,
    setIsDragging,
    setDraggedItemAvailableReverts,
    resetDragStates,
  } = useOpeningsMultiTable();

  // Refs for each table wrapper to detect mouse position
  const tableRefs = useRef<Partial<Record<DragDropTableType, HTMLDivElement | null>>>({
    opening: null,
    confirmation: null,
    payment: null,
    netto2: null,
    lost: null,
  });

  // Cache table rects to avoid repeated getBoundingClientRect calls
  const tableRectsCache = useRef<Map<DragDropTableType, DOMRect>>(new Map());
  const cacheTimestampRef = useRef<number>(0);

  // RAF-based throttling for mouse move
  const rafIdRef = useRef<number | null>(null);

  // Auto-scroll refs and state
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const autoScrollIntervalRef = useRef<number | null>(null);
  const performAutoScrollRef = useRef<(() => void) | null>(null);

  // Auto-scroll function that smoothly scrolls the container
  const performAutoScroll = useCallback(() => {
    if (!isDraggingRef.current) {
      if (autoScrollIntervalRef.current) {
        cancelAnimationFrame(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
      return;
    }

    // Find the scrollable element (usually window, but could be a parent container)
    let scrollableElement: HTMLElement | Window = window;
    let scrollTop = window.scrollY || window.pageYOffset;
    let scrollHeight = document.documentElement.scrollHeight;
    let clientHeight = window.innerHeight;

    // Check if there's a scrollable parent container
    const container = scrollContainerRef.current;
    if (container) {
      // Walk up the DOM tree to find scrollable parent
      let parent: HTMLElement | null = container.parentElement;
      while (parent) {
        const hasScroll = parent.scrollHeight > parent.clientHeight;
        const hasOverflow = getComputedStyle(parent).overflowY === 'auto' || 
                          getComputedStyle(parent).overflowY === 'scroll' ||
                          getComputedStyle(parent).overflow === 'auto' ||
                          getComputedStyle(parent).overflow === 'scroll';
        
        if (hasScroll && hasOverflow) {
          scrollableElement = parent;
          scrollTop = parent.scrollTop;
          scrollHeight = parent.scrollHeight;
          clientHeight = parent.clientHeight;
          break;
        }
        parent = parent.parentElement;
      }
    }

    // Get current mouse position
    const mouseY = (window as any).__lastMouseY || 0;
    
    // Calculate distance from edges (relative to viewport)
    const distanceFromTop = mouseY;
    const distanceFromBottom = window.innerHeight - mouseY;

    // Determine scroll direction and speed
    let scrollDelta = 0;
    if (distanceFromTop < SCROLL_THRESHOLD) {
      // Near top - scroll up
      const intensity = Math.max(0, 1 - (distanceFromTop / SCROLL_THRESHOLD));
      scrollDelta = -SCROLL_SPEED * intensity;
    } else if (distanceFromBottom < SCROLL_THRESHOLD) {
      // Near bottom - scroll down
      const intensity = Math.max(0, 1 - (distanceFromBottom / SCROLL_THRESHOLD));
      scrollDelta = SCROLL_SPEED * intensity;
    }

    // Apply scroll if needed
    if (scrollDelta !== 0) {
      const newScrollTop = Math.max(0, Math.min(scrollTop + scrollDelta, scrollHeight - clientHeight));
      
      if (scrollableElement === window) {
        window.scrollTo({
          top: newScrollTop,
          behavior: 'auto', // Use 'auto' for smooth continuous scrolling
        });
      } else {
        (scrollableElement as HTMLElement).scrollTop = newScrollTop;
      }

      // Continue scrolling using ref to avoid closure issues
      autoScrollIntervalRef.current = requestAnimationFrame(() => {
        performAutoScrollRef.current?.();
      });
    } else {
      // Stop scrolling if not near edges
      if (autoScrollIntervalRef.current) {
        cancelAnimationFrame(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
    }
  }, [isDraggingRef]);

  // Store the function in ref for recursive calls (update on change)
  useEffect(() => {
    performAutoScrollRef.current = performAutoScroll;
  }, [performAutoScroll]);

  // Optimized mouse move handler with throttling and caching
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    // Store mouse Y position for auto-scroll
    (window as any).__lastMouseY = e.clientY;
    
    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    // Throttle using requestAnimationFrame for smooth 60fps updates
    rafIdRef.current = requestAnimationFrame(() => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // Refresh cache if expired
      const now = Date.now();
      if (now - cacheTimestampRef.current > CACHE_DURATION) {
        tableRectsCache.current.clear();
        Object.entries(tableRefs.current).forEach(([tableType, ref]) => {
          if (ref && tableType !== 'netto1') {
            tableRectsCache.current.set(
              tableType as DragDropTableType,
              ref.getBoundingClientRect()
            );
          }
        });
        cacheTimestampRef.current = now;
      }
      
      // Use cached rects for fast bounding box checks
      let detectedTable: DragDropTableType | null = null;
      const tablesWithRects: Array<{ type: DragDropTableType; area: number }> = [];
      
      // Check cached rects first (much faster than getBoundingClientRect)
      tableRectsCache.current.forEach((rect, tableType) => {
        if (
          mouseX >= rect.left &&
          mouseX <= rect.right &&
          mouseY >= rect.top &&
          mouseY <= rect.bottom
        ) {
          const area = rect.width * rect.height;
          tablesWithRects.push({ type: tableType, area });
        }
      });
      
      // If multiple tables contain the point, choose the smallest one (most specific)
      if (tablesWithRects.length > 0) {
        tablesWithRects.sort((a, b) => a.area - b.area);
        detectedTable = tablesWithRects[0].type;
      }
      
      // Only update state if the detected table is different (prevents unnecessary re-renders)
      if (detectedTable !== destinationTableRef.current) {
        destinationTableRef.current = detectedTable;
        setDestinationTable(detectedTable); // Update state for visual feedback only
      } else if (!detectedTable && destinationTableRef.current) {
        // Clear destination if mouse is not over any table
        destinationTableRef.current = null;
        setDestinationTable(null);
      }
      
      // Handle auto-scroll when near edges
      const distanceFromTop = mouseY;
      const distanceFromBottom = window.innerHeight - mouseY;
      
      if (distanceFromTop < SCROLL_THRESHOLD || distanceFromBottom < SCROLL_THRESHOLD) {
        // Start auto-scroll if not already running
        if (!autoScrollIntervalRef.current && performAutoScrollRef.current) {
          performAutoScrollRef.current();
        }
      } else {
        // Stop auto-scroll if moved away from edges
        if (autoScrollIntervalRef.current) {
          cancelAnimationFrame(autoScrollIntervalRef.current);
          autoScrollIntervalRef.current = null;
        }
      }
      
      rafIdRef.current = null;
    });
  }, [setDestinationTable, isDraggingRef, destinationTableRef]);

  // Add/remove mouse move listener when dragging
  const { isDragging } = useOpeningsMultiTable();
  useEffect(() => {
    if (isDragging) {
      // Clear cache when starting drag
      tableRectsCache.current.clear();
      cacheTimestampRef.current = 0;
      
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        // Cancel any pending RAF
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        // Stop auto-scroll when dragging stops
        if (autoScrollIntervalRef.current !== null) {
          cancelAnimationFrame(autoScrollIntervalRef.current);
          autoScrollIntervalRef.current = null;
        }
        // Clean up mouse position
        delete (window as any).__lastMouseY;
      };
    }
  }, [isDragging, handleMouseMove]);

  // Handle drag start for visual feedback
  const handleDragStart = useCallback((start: any) => {
    const { setDraggedItem } = useDraggedItemsStore.getState();
    const { removeSelectedItem, getCurrentPage, getSelectedItems } = useSelectedItemsStore.getState();
    
    // Set dragging state and source table (both refs and state)
    const sourceTableId = start.source.droppableId as DragDropTableType;
    sourceTableRef.current = sourceTableId;
    destinationTableRef.current = null;
    isDraggingRef.current = true;
    
    setIsDragging(true);
    setSourceTable(sourceTableId);
    setDestinationTable(null); // Reset destination
    
    // Extract item data from draggableId and store in draggedItemsStore
    try {
      const draggableId = start.draggableId;
      const itemDataPart = draggableId.split('-item-data-')[1];
      if (itemDataPart) {
        const itemData = JSON.parse(itemDataPart);
        setDraggedItem(itemData);
        
        // Store availableReverts for reverse movement validation - check multiple sources
        let availableReverts = itemData?.availableReverts || 
                               itemData?.offer_id?.availableReverts || 
                               itemData?.originalData?.availableReverts || 
                               [];
        
        // Special handling for "lost" table: if availableReverts doesn't start with "lost", prepend it
        if (sourceTableId === 'lost' && availableReverts.length > 0 && availableReverts[0] !== 'lost') {
          availableReverts = ['lost', ...availableReverts];
        }
        
        draggedItemAvailableRevertsRef.current = availableReverts;
        setDraggedItemAvailableReverts(availableReverts);
        
        // IMPORTANT: Remove this item from selectedItems if it's selected
        // This prevents dragged items from appearing in selected items
        const currentPage = getCurrentPage();
        if (currentPage && itemData._id) {
          // Check all possible pages and remove from each
          const allPages = ['openings', 'confirmations', 'payments', 'offers'] as const;
          allPages.forEach((page) => {
            const items = getSelectedItems(page as any);
            if (items.some((item: any) => item._id === itemData._id)) {
              removeSelectedItem(itemData._id, page as any);
            }
          });
        }
      }
    } catch {
      // If parsing fails, just continue
      draggedItemAvailableRevertsRef.current = null;
      setDraggedItemAvailableReverts(null);
    }
  }, [setIsDragging, setSourceTable, setDestinationTable, setDraggedItemAvailableReverts, sourceTableRef, destinationTableRef, isDraggingRef, draggedItemAvailableRevertsRef]);

  // Handle drag update for visual feedback
  const handleDragUpdate = useCallback((update: any) => {
    if (update.destination) {
      const destId = update.destination.droppableId as DragDropTableType;
      destinationTableRef.current = destId;
      setDestinationTable(destId);
    } else {
      destinationTableRef.current = null;
      setDestinationTable(null);
    }
  }, [setDestinationTable, destinationTableRef]);

  return {
    handleDragStart,
    handleDragUpdate,
    tableRefs,
    scrollContainerRef,
    autoScrollIntervalRef,
  };
};

