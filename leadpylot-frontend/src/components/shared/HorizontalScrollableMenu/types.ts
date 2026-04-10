/**
 * Type definitions for HorizontalScrollableMenu component
 */

import type { TypeAttributes } from '@/components/ui/@types/common';

export interface ScrollableMenuItem {
  /** Unique identifier for the item */
  id: string;
  /** Display label */
  label: string;
  /** Whether this item is currently active/selected */
  isActive?: boolean;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Optional click handler */
  onClick?: () => void;
  /** Optional class name for inactive state */
  className?: string;
  /** Optional class name for active state */
  activeClassName?: string;
}

export interface HorizontalScrollableMenuProps {
  /** Array of menu items to display */
  items: ScrollableMenuItem[];
  /** Custom class name for the container */
  className?: string;
  /** Custom class name for menu items */
  itemClassName?: string;
  /** Custom class name for active items */
  activeItemClassName?: string;
  /** Scroll step in pixels (default: 200) */
  scrollStep?: number;
  /** Whether to show scroll icons on hover (default: true) */
  showScrollIcons?: boolean;
  /** Scroll controls visibility mode */
  scrollControlsMode?: 'hover' | 'always';
  /** Custom scroll icon class name */
  scrollIconClassName?: string;
  /** Gap between items in pixels (default: 0.5rem / 8px) */
  gap?: string;
  /** Render function for external scroll controls */
  renderScrollControls?: (props: {
    canScrollLeft: boolean;
    canScrollRight: boolean;
    onScrollLeft: (e: React.MouseEvent) => void;
    onScrollRight: (e: React.MouseEvent) => void;
  }) => React.ReactNode;
  /** When true, do not scroll active item into view on selection change (keeps left edge stable) */
  disableScrollIntoView?: boolean;
}

export interface ScrollIconButtonProps {
  /** Scroll direction */
  direction: 'left' | 'right';
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void;
  /** Custom class name */
  className?: string;
  /** Size of the icon button */
  size?: TypeAttributes.Size;
  /** Whether the button is disabled */
  disabled?: boolean;
}

export interface MenuItemProps {
  /** Menu item data */
  item: ScrollableMenuItem;
  /** Custom class name for inactive items */
  itemClassName?: string;
  /** Custom class name for active items */
  activeItemClassName?: string;
  /** Mouse enter handler (optional - can be handled by parent) */
  onMouseEnter?: (itemId: string) => void;
  /** Mouse leave handler (optional - can be handled by parent) */
  onMouseLeave?: () => void;
}

export interface ScrollControlsProps {
  /** Whether scrolling left is possible */
  canScrollLeft: boolean;
  /** Whether scrolling right is possible */
  canScrollRight: boolean;
  /** Handler for left scroll click */
  onScrollLeft: (e: React.MouseEvent) => void;
  /** Handler for right scroll click */
  onScrollRight: (e: React.MouseEvent) => void;
  /** Custom class name for scroll icons */
  scrollIconClassName?: string;
  /** Size of scroll icons */
  iconSize?: 'xs' | 'sm' | 'md' | 'lg';
}

export interface UseScrollableMenuOptions {
  /** Array of menu items */
  items: ScrollableMenuItem[];
  /** Scroll step in pixels */
  scrollStep?: number;
}

export interface UseScrollableMenuReturn {
  /** Ref to attach to scrollable container */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  /** Ref storing last scrollLeft (for preserving position on selection change) */
  lastScrollLeftRef: React.RefObject<number>;
  /** Whether scrolling left is possible */
  canScrollLeft: boolean;
  /** Whether scrolling right is possible */
  canScrollRight: boolean;
  /** Function to scroll smoothly in a direction */
  scrollSmoothly: (direction: 'left' | 'right') => void;
  /** Handler for scroll icon clicks */
  handleScrollIconClick: (
    direction: 'left' | 'right'
  ) => (e: React.MouseEvent) => void;
}
