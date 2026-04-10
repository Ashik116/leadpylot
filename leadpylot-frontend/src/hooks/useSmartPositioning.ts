import { useState, useEffect, useCallback } from 'react';

interface Position {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  transform?: string;
}

interface UseSmartPositioningProps {
  isOpen: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  dropdownWidth?: number;
  dropdownHeight?: number;
  offset?: number;
}

export const useSmartPositioning = ({
  isOpen,
  triggerRef,
  dropdownWidth = 320,
  dropdownHeight = 400,
  offset = 4,
}: UseSmartPositioningProps) => {
  const [position, setPosition] = useState<Position>({});
  const [arrowPosition, setArrowPosition] = useState<'top' | 'bottom'>('top');
  const [, setCalculatedWidth] = useState(dropdownWidth);

  const calculatePosition = useCallback(() => {
    if (!isOpen || !triggerRef.current || typeof window === 'undefined') return;

    const trigger = triggerRef.current;
    const triggerRect = trigger.getBoundingClientRect();
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : dropdownWidth;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : dropdownHeight;

    // Calculate available space in each direction
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerRect.right;

    // Determine vertical position
    let top: string | undefined;
    let bottom: string | undefined;

    if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
      // Position below the trigger
      top = `${triggerRect.bottom + offset}px`;
      setArrowPosition('top');
    } else {
      // Position above the trigger
      bottom = `${viewportHeight - triggerRect.top + offset}px`;
      setArrowPosition('bottom');
    }

    // Determine horizontal position
    let horizontalPosition: 'left' | 'right' | 'center';
    let left: string | undefined;
    let right: string | undefined;
    let transform: string | undefined;

    // Check if dropdown fits in available space
    const fitsInSpace = dropdownWidth <= Math.max(spaceLeft, spaceRight);

    if (fitsInSpace) {
      if (spaceRight >= dropdownWidth) {
        // Position to the right (aligned with left edge of trigger)
        horizontalPosition = 'left';
        left = `${triggerRect.left}px`;
      } else {
        // Position to the left (aligned with right edge of trigger)

        horizontalPosition = 'right';
        right = `${viewportWidth - triggerRect.right}px`;
      }
    } else {
      // Center the dropdown relative to trigger
      horizontalPosition = 'center';
      left = `${triggerRect.left + triggerRect.width / 2}px`;
      transform = 'translateX(-50%)';

      // Ensure it doesn't go off-screen
      const maxWidth = Math.min(dropdownWidth, viewportWidth - 32); // 32px padding
      setCalculatedWidth(maxWidth);
    }

    // Ensure dropdown doesn't go off-screen horizontally
    if (horizontalPosition === 'left') {
      const calculatedLeft = triggerRect.left;
      if (calculatedLeft + dropdownWidth > viewportWidth) {
        // Adjust to fit on screen
        left = `${Math.max(16, viewportWidth - dropdownWidth - 16)}px`;
      }
    } else if (horizontalPosition === 'right') {
      const calculatedRight = viewportWidth - triggerRect.right;
      if (calculatedRight + dropdownWidth > viewportWidth) {
        // Adjust to fit on screen
        right = `${Math.max(16, viewportWidth - dropdownWidth - 16)}px`;
      }
    } else if (horizontalPosition === 'center') {
      // Ensure centered dropdown doesn't go off-screen
      const centerX = triggerRect.left + triggerRect.width / 2;
      const halfWidth = Math.min(dropdownWidth, viewportWidth - 32) / 2;
      if (centerX - halfWidth < 16) {
        left = `${16 + halfWidth}px`;
      } else if (centerX + halfWidth > viewportWidth - 16) {
        left = `${viewportWidth - 16 - halfWidth}px`;
      }
    }

    setPosition({
      top,
      bottom,
      left,
      right,
      transform,
    });
  }, [isOpen, dropdownWidth, dropdownHeight, offset, triggerRef]);

  // Recalculate position and width when dropdown opens or window resizes
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      // Use requestAnimationFrame to defer state update outside of render cycle
      const rafId = requestAnimationFrame(() => {
        calculatePosition();
      });

      const handleResize = () => {
        if (typeof window !== 'undefined') {
          setCalculatedWidth(Math.min(dropdownWidth, window.innerWidth - 32));
        }
        calculatePosition();
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', calculatePosition, true);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', calculatePosition, true);
      };

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', calculatePosition);
      };
    }
  }, [isOpen, calculatePosition, dropdownWidth]);

  return {
    position,
    arrowPosition,
    dropdownWidth:
      typeof window !== 'undefined'
        ? Math.min(dropdownWidth, window.innerWidth - 32)
        : dropdownWidth,
  };
};
