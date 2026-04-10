import { useEffect, useRef } from 'react';

interface UseSideNavHoverProps {
  setSideNavCollapse: (collapsed: boolean) => void;
  stuck: boolean;
}

/**
 * Hook to manage sidebar hover behavior with smooth transitions
 */
export const useSideNavHover = ({ setSideNavCollapse, stuck }: UseSideNavHoverProps) => {
  const mouseTimer = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (mouseTimer.current) clearTimeout(mouseTimer.current);
    mouseTimer.current = setTimeout(() => {
      setSideNavCollapse(false);
    }, 75);
  };

  const handleMouseLeave = () => {
    if (mouseTimer.current) clearTimeout(mouseTimer.current);
    if (!stuck) {
      mouseTimer.current = setTimeout(() => {
        setSideNavCollapse(true);
      }, 75);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mouseTimer.current) clearTimeout(mouseTimer.current);
    };
  }, []);

  return { handleMouseEnter, handleMouseLeave };
};

