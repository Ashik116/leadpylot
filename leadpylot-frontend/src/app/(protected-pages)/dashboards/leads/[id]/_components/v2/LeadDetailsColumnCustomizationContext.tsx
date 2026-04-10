'use client';

import React, { createContext, useCallback, useContext, useRef } from 'react';

export interface LeadDetailsColumnCustomizationContextValue {
  /** Opens the column customization dialog for the active table */
  openColumnCustomization: () => void;
  /** Called by BaseTable when it mounts - registers its open handler */
  register: (open: () => void) => void;
  /** Ref for the tab row button - used by CommonActionBar for dropdown positioning */
  customizeButtonRef: React.RefObject<HTMLButtonElement | null>;
}

const LeadDetailsColumnCustomizationContext =
  createContext<LeadDetailsColumnCustomizationContextValue | null>(null);

export function LeadDetailsColumnCustomizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const openRef = useRef<() => void>(() => {});
  const customizeButtonRef = useRef<HTMLButtonElement | null>(null);

  const register = useCallback((open: () => void) => {
    openRef.current = open;
  }, []);

  const openColumnCustomization = useCallback(() => {
    openRef.current?.();
  }, []);

  return (
    <LeadDetailsColumnCustomizationContext.Provider
      value={{ openColumnCustomization, register, customizeButtonRef }}
    >
      {children}
    </LeadDetailsColumnCustomizationContext.Provider>
  );
}

export function useLeadDetailsColumnCustomization() {
  return useContext(LeadDetailsColumnCustomizationContext);
}
