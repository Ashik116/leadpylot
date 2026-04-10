import { useAuthStore } from '@/stores/authStore';
import { useCallback, useEffect, useState } from 'react';
import type { User } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import {
  login as authLogin,
  immediateLogout as authImmediateLogout,
  hasRole as authHasRole,
  hasAnyRole as authHasAnyRole,
} from '@/services/AuthService';
import { useUserStore } from '@/stores/userStore';
import { CurrentUser } from '@/services/UserService';
import { usePermissions } from './usePermissions';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const currentUser = useUserStore((state) => state.currentUser);
  const [profile, setProfile] = useState<CurrentUser | null>(null);

  const router = useRouter();

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authLogin({ email, password });

      router.refresh();

      return result;
    },
    [router]
  );
  useEffect(() => {
    if (currentUser) {
      setTimeout(() => {
        setProfile(currentUser as any);
      }, 0);
    }
  }, [currentUser, setProfile]);

  const logout = useCallback(async () => {
    // Perform immediate logout: clear storage/cookies and hard redirect
    authImmediateLogout();
  }, []);

  const hasRole = useCallback((role: string) => {
    return authHasRole(role as any);
  }, []);

  const hasAnyRole = useCallback((roles: string[]) => {
    return authHasAnyRole(roles as any);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    useAuthStore.getState().updateUser(updates);
  }, []);

  const refreshToken = useCallback(async () => {
    // This would need to be implemented if needed
    return false;
  }, []);

  const validateToken = useCallback(async () => {
    // This would need to be implemented if needed
    return false;
  }, []);

  // Get permission methods from usePermissions hook
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
    role,
  } = usePermissions();

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    login,
    logout,
    clearError,
    hasRole,
    hasAnyRole,
    updateUser,
    refreshToken,
    validateToken,

    // Permission methods
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
    role,

    profile,
    profileImageId: currentUser?.image_id?.id || null,
  };
};
