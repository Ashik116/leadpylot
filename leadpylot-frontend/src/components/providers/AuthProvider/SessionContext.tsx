'use client';

import { createContext, useContext } from 'react';
import type { User } from '@/stores/authStore';

export type Session = {
  user?: User;
  isAuthenticated: boolean;
  isLoading: boolean;
};

const SessionContext = createContext<Session | null>(null);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export default SessionContext;
