'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface BulkSearchContextType {
  isBulkSearchOpen: boolean;
  setBulkSearchOpen: (open: boolean) => void;
  openBulkSearch: () => void;
  closeBulkSearch: () => void;
}

const BulkSearchContext = createContext<BulkSearchContextType | undefined>(undefined);

export const BulkSearchProvider = ({ children }: { children: ReactNode }) => {
  const [isBulkSearchOpen, setIsBulkSearchOpen] = useState(false);

  const setBulkSearchOpen = useCallback((open: boolean) => {
    setIsBulkSearchOpen(open);
  }, []);

  const openBulkSearch = useCallback(() => {
    setIsBulkSearchOpen(true);
  }, []);

  const closeBulkSearch = useCallback(() => {
    setIsBulkSearchOpen(false);
  }, []);

  return (
    <BulkSearchContext.Provider
      value={{
        isBulkSearchOpen,
        setBulkSearchOpen,
        openBulkSearch,
        closeBulkSearch,
      }}
    >
      {children}
    </BulkSearchContext.Provider>
  );
};

export const useBulkSearch = () => {
  const context = useContext(BulkSearchContext);
  // Return context even if undefined - components can check if it exists
  return context;
};

export default BulkSearchContext;

