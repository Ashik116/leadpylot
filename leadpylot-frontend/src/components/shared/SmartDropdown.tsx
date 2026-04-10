import React, { useRef, useState, useEffect } from 'react';
import { useSmartPositioning } from '@/hooks/useSmartPositioning';
import { createPortal } from 'react-dom';

interface SmartDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  dropdownWidth?: number;
  dropdownHeight?: number;
  offset?: number;
  className?: string;
  hideArrow?: boolean;
}

export const SmartDropdown: React.FC<SmartDropdownProps> = ({
  isOpen,
  onClose,
  triggerRef,
  children,
  dropdownWidth = 320,
  dropdownHeight = 400,
  offset = 8,
  className = '',
  hideArrow = true
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [screenWidth, setScreenWidth] = useState(0);

  // Check screen width for responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      setScreenWidth(window?.innerWidth);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const {
    position,
    arrowPosition,
    dropdownWidth: calculatedWidth,
  } = useSmartPositioning({
    isOpen,
    triggerRef,
    dropdownWidth,
    dropdownHeight,
    offset,
  });

  // Close dropdown when clicking outside (don't close when clicking inside a confirm popover rendered in a portal)
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (target && typeof (target as HTMLElement).closest === 'function' && (target as HTMLElement).closest('[data-confirm-popover]')) {
        return;
      }
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  if (typeof document === 'undefined') return null;

  // Create responsive position object
  const getResponsivePosition = () => {
    const basePosition = { ...position };

    // For mobile screens (320-720px): Center dropdown horizontally with safe margins
    if (screenWidth >= 320 && screenWidth <= 720) {
      return {
        ...basePosition,
        left: '50%',
        right: 'auto',
        transform: 'translateX(-50%)',
      };
    } else if (screenWidth >= 720 && screenWidth <= 767) {
      // For small tablets: Center with max width constraint
      return {
        ...basePosition,
        left: '50%',
        right: 'auto',
        transform: 'translateX(-50%)',
      };
    } else if (screenWidth >= 768 && screenWidth <= 1024) {
      // For tablets: Use smart positioning but ensure it doesn't overflow
      return {
        ...basePosition,
      };
    }

    return basePosition;
  };

  return createPortal(
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 z-[100005]" onClick={onClose} />

      {/* Dropdown with smart positioning */}
      <div
        ref={dropdownRef}
        className={`fixed z-[100006] ${className}`}
        style={{
          ...getResponsivePosition(),
          width: screenWidth > 0 && screenWidth <= 640 ? 'calc(100vw - 32px)' : `${calculatedWidth}px`,
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        {/* Dropdown content */}
        <div className="relative">{children}</div>
      </div>
    </>,
    document.body
  );
};
