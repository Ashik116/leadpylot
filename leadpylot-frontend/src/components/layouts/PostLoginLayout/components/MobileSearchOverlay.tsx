import React from 'react';
import GlobalSearch from '@/components/shared/GlobalSearch/GlobalSearch';

export interface MobileSearchOverlayProps {
  isOpen: boolean;
}

/**
 * Mobile Search Overlay Component
 * Shows search input in mobile view
 */
export const MobileSearchOverlay = React.memo<MobileSearchOverlayProps>(({ isOpen }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute right-1/2 top-10 left-1/2 z-50 mt-5 w-[min(90vw,24rem)] -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-2 shadow-lg md:hidden">
      <GlobalSearch />
    </div>
  );
});

MobileSearchOverlay.displayName = 'MobileSearchOverlay';

