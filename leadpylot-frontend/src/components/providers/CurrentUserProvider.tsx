'use client';

import { useCurrentUserQuery } from '@/services/hooks/useCurrentUser';

interface CurrentUserProviderProps {
  children: React.ReactNode;
}

export const CurrentUserProvider = ({ children }: CurrentUserProviderProps) => {
  // Initialize current user query
  useCurrentUserQuery({
    // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes to keep todos count updated
  });

  return <>{children}</>;
};
