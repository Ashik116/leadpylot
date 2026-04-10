'use client';

import React, { ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import SessionContext, { type Session } from './SessionContext';

interface SessionProviderProps {
  children: ReactNode;
}

const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const sessionValue: Session = {
    user: user || undefined,
    isAuthenticated,
    isLoading,
  };

  return <SessionContext.Provider value={sessionValue}>{children}</SessionContext.Provider>;
};

export default SessionProvider;
