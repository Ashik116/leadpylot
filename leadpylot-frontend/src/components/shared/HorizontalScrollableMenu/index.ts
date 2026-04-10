/**
 * HorizontalScrollableMenu - Single Entry Point
 * 
 * All exports are handled from this single index.ts file
 */

// Main component export
export { default } from './HorizontalScrollableMenu';

// Type exports
export type {
  ScrollableMenuItem,
  HorizontalScrollableMenuProps,
  ScrollIconButtonProps,
  MenuItemProps,
  ScrollControlsProps,
  UseScrollableMenuOptions,
  UseScrollableMenuReturn,
} from './types';

// Component exports (for advanced usage)
export { default as ScrollIconButton } from './components/ScrollIconButton';

export { default as MenuItem } from './components/MenuItem';

export { default as ScrollControls } from './components/ScrollControls';

// Hook exports (for advanced usage)
export { useScrollableMenu } from './hooks/useScrollableMenu';
