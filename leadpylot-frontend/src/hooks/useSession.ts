import { useState } from 'react';
import { useAuth } from './useAuth';
import type { User } from '@/stores/authStore';

// Compatibility hook for components that still expect NextAuth's useSession interface
export const useSession = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Calculate expires date using useState with lazy initialization to avoid calling Date.now() during render
  const [expires] = useState(() => {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
  });

  // Return data in the format that NextAuth's useSession provides
  return {
    data:
      isAuthenticated && user
        ? {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              accessToken: user.accessToken,
              avatar: user.avatar,
              authority: user.authority,
              voip_extension: user.voip_extension,
              voip_password: user.voip_password,
              voip_enabled: user.voip_enabled,
              image: user.avatar,
            } as User & { image?: string },
            expires,
          }
        : null,
    status: isLoading ? 'loading' : isAuthenticated ? 'authenticated' : 'unauthenticated',
    update: async () => {
      // This is a placeholder - NextAuth's update function
      // In our system, we don't need this, but we provide it for compatibility
      return { user: user || null };
    },
  };
};

// Helper hook that provides a more strongly-typed session with guaranteed user properties
export const useTypedSession = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  return {
    data: isAuthenticated && user ? { user } : null,
    status: isLoading ? 'loading' : isAuthenticated ? 'authenticated' : 'unauthenticated',
    user: user || null,
    isAuthenticated,
    isLoading,
  };
};
