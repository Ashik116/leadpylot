/**
 * Common transition classes for sidebar layouts
 */

export interface SidebarTransitionProps {
  isOpen: boolean;
  sidebarWidth?: string;
  mainWidth?: string;
  transitionDuration?: string;
}

/**
 * Generates transition classes for the main content area
 */
export const getMainContentClasses = ({
  isOpen,
  sidebarWidth = 'lg:w-1/2',
  mainWidth = 'w-full',
  transitionDuration = 'duration-300',
}: SidebarTransitionProps): string => {
  return `w-full transition-all ${transitionDuration} ease-in-out ${isOpen ? sidebarWidth : mainWidth
    }`;
};

/**
 * Generates transition classes for the sidebar area
 */
export const getSidebarClasses = ({
  isOpen,
  sidebarWidth = 'lg:w-1/2',
  transitionDuration = 'duration-300',
}: SidebarTransitionProps): string => {
  return `mt-4 w-full transform space-y-4 transition-all ${transitionDuration} ease-in-out ${sidebarWidth} xl:mt-0 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`;
};

/**
 * Generates inline styles for sidebar visibility
 */
export const getSidebarStyles = (isOpen: boolean): React.CSSProperties => {
  return {
    display: isOpen ? 'block' : 'none',
  };
};

/**
 * Generates container classes for the flex layout
 */
export const getContainerClasses = (): string => {
  return 'flex flex-col-reverse gap-2 lg:flex-row';
};

/**
 * Complete sidebar layout utility
 */
export const getSidebarLayout = (isOpen: boolean) => {
  return {
    container: getContainerClasses(),
    mainContent: getMainContentClasses({ isOpen }),
    sidebar: getSidebarClasses({ isOpen }),
    sidebarStyles: getSidebarStyles(isOpen),
  };
};
