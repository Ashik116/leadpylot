'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type OpeningsViewType = 'multi-table' | 'dashboard';

const STORAGE_KEY = 'openings-view-preference';
const DEFAULT_VIEW: OpeningsViewType = 'dashboard';

interface OpeningsViewContextType {
  viewType: OpeningsViewType;
  setView: (view: OpeningsViewType) => void;
  toggleView: () => void;
  isInitialized: boolean;
}

const OpeningsViewContext = createContext<OpeningsViewContextType | undefined>(undefined);

export function OpeningsViewProvider({ children }: { children: React.ReactNode }) {
  const [viewType, setViewTypeState] = useState<OpeningsViewType>(DEFAULT_VIEW);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'multi-table' || stored === 'dashboard') {
        setViewTypeState(stored);
      } else {
        setViewTypeState(DEFAULT_VIEW);
      }
    } catch {
      // Silent fail - use default view
      setViewTypeState(DEFAULT_VIEW);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Listen for storage changes (when localStorage is updated from another tab/window)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        if (e.newValue === 'multi-table' || e.newValue === 'dashboard') {
          setViewTypeState(e.newValue);
        }
      }
    };

    // Listen for custom event (same-tab updates)
    const handleCustomStorageChange = (e: CustomEvent<string>) => {
      const newValue = e.detail;
      if (newValue === 'multi-table' || newValue === 'dashboard') {
        setViewTypeState(newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('openings-view-change' as any, handleCustomStorageChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('openings-view-change' as any, handleCustomStorageChange as EventListener);
    };
  }, []);

  // Save preference to localStorage
  const setView = useCallback((newView: OpeningsViewType) => {
    try {
      localStorage.setItem(STORAGE_KEY, newView);
      setViewTypeState(newView);
      // React Context will automatically trigger re-renders in all consuming components
    } catch {
      // Silent fail - preference not saved
    }
  }, []);

  // Toggle between views
  const toggleView = useCallback(() => {
    const newView = viewType === 'multi-table' ? 'dashboard' : 'multi-table';
    setView(newView);
  }, [viewType, setView]);

  return (
    <OpeningsViewContext.Provider
      value={{
        viewType,
        setView,
        toggleView,
        isInitialized,
      }}
    >
      {children}
    </OpeningsViewContext.Provider>
  );
}

export function useOpeningsView() {
  const context = useContext(OpeningsViewContext);
  if (context === undefined) {
    throw new Error('useOpeningsView must be used within OpeningsViewProvider');
  }
  return context;
}

