import { useEffect, useRef, useState } from 'react';
import { isDev } from '@/utils/utils';
import { useSearchParams } from 'next/navigation';

interface UseOfferHighlightParams {
  highlightedOfferId?: string | null;
  offers: any[];
}

interface UseOfferHighlightReturn {
  animatingOfferId: string | null;
  highlightedRowRef: React.RefObject<HTMLTableRowElement | null>;
  isOfferHighlighted: (offerId: string) => boolean;
  setAnimatingOfferId: (offerId: string | null) => void;
}

export const useOfferHighlight = ({
  highlightedOfferId,
  offers,
}: UseOfferHighlightParams): UseOfferHighlightReturn => {
  // Track which row is currently highlighted with animation
  const searchParams = useSearchParams();

  const highlightParam = searchParams.get('highlightOffer');
  const effectiveHighlightId = highlightParam || highlightedOfferId || null;
  const [animatingOfferId, setAnimatingOfferId] = useState<string | null>(null);

  // Ref to track the highlighted row for scrolling
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);

  // Handle highlighting animation when highlightedOfferId changes
  useEffect(() => {
    if (effectiveHighlightId) {
      isDev && console.log('🎯 Starting highlight animation for offer:', effectiveHighlightId);
      // Use setTimeout to defer state update outside of render cycle
      const timeoutId = setTimeout(() => {
        setAnimatingOfferId(effectiveHighlightId);
      }, 0);

      const dismissTimeoutId = setTimeout(() => {
        isDev && console.log('⏰ Auto-dismissing offer highlight animation');
        setAnimatingOfferId(null);
        highlightedRowRef.current = null;
      }, 2000);

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(dismissTimeoutId);
      };
    }
  }, [effectiveHighlightId]);

  // Handle scrolling to highlighted row
  useEffect(() => {
    if (effectiveHighlightId && offers.length > 0) {
      // Use multiple attempts to ensure scrolling works after tab activation and data loading
      const scrollToHighlightedRow = () => {
        if (highlightedRowRef.current) {
          highlightedRowRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
          isDev && console.log('🎯 Scrolling to highlighted offer:', effectiveHighlightId);
          return true;
        }
        return false;
      };

      // First attempt - immediate
      if (scrollToHighlightedRow()) return;

      // Second attempt - after short delay
      const timer1 = setTimeout(() => {
        if (scrollToHighlightedRow()) return;

        // Third attempt - after longer delay to ensure tab is active
        const timer2 = setTimeout(() => {
          scrollToHighlightedRow();
        }, 500);

        return () => clearTimeout(timer2);
      }, 200);

      return () => clearTimeout(timer1);
    }
  }, [effectiveHighlightId, offers.length]);

  // Check if an offer is highlighted
  const isOfferHighlighted = (offerId: string) => {
    return animatingOfferId === offerId;
  };

  return {
    animatingOfferId,
    highlightedRowRef,
    isOfferHighlighted,
    setAnimatingOfferId,
  };
};
