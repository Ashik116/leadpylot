import { useEffect, useRef } from 'react';
import useTheme from '@/utils/hooks/useTheme';
import useResponsive from '@/utils/hooks/useResponsive';

/**
 * Hook to manage sidebar collapse state with responsive behavior
 */
export const useSideNavCollapse = () => {
  const sideNavCollapse = useTheme((state) => state.layout.sideNavCollapse);
  const setSideNavCollapse = useTheme((state) => state.setSideNavCollapse);
  const { larger } = useResponsive();

  // Store the previous user preference when screen is larger than XL
  const previousUserState = useRef<boolean | null>(null);
  const wasLargerThanXL = useRef<boolean>(larger.xl);

  useEffect(() => {
    const currentIsLargerThanXL = larger.xl;
    const previousIsLargerThanXL = wasLargerThanXL.current;

    if (currentIsLargerThanXL && !previousIsLargerThanXL) {
      // Transition from small to large screen - restore previous user state
      if (previousUserState.current !== null) {
        setSideNavCollapse(previousUserState.current);
        previousUserState.current = null;
      }
    } else if (!currentIsLargerThanXL && previousIsLargerThanXL) {
      // Transition from large to small screen - store state and auto-collapse
      previousUserState.current = sideNavCollapse;
      setSideNavCollapse(true);
    }

    wasLargerThanXL.current = currentIsLargerThanXL;
  }, [larger.xl, setSideNavCollapse, sideNavCollapse]);

  return { sideNavCollapse, setSideNavCollapse };
};

