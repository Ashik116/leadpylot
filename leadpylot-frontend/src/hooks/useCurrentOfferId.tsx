'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CurrentOfferIdContextType {
  offerId: string | null;
  setOfferId: (id: string | null) => void;
}

const CurrentOfferIdContext = createContext<CurrentOfferIdContextType | undefined>(undefined);

export const CurrentOfferIdProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [offerId, setOfferId] = useState<string | null>(null);

  return (
    <CurrentOfferIdContext.Provider value={{ offerId, setOfferId }}>
      {children}
    </CurrentOfferIdContext.Provider>
  );
};

/**
 * Hook to get and set the current offer ID
 * This is used when OpeningDetailsPopup is open to share the offer ID with TicketForm
 * Returns null if provider is not available (graceful fallback)
 */
export const useCurrentOfferId = () => {
  const context = useContext(CurrentOfferIdContext);
  // Return default values if context is not available (provider not mounted)
  if (context === undefined) {
    return { offerId: null, setOfferId: () => {} };
  }
  return context;
};
