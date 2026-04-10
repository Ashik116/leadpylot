'use client';

import { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/stores/authStore';
import { Role } from '@/configs/navigation.config/auth.route.config';
import {
  login as authLogin,
  immediateLogout as authImmediateLogout,
  hasRole as authHasRole,
  hasAnyRole as authHasAnyRole,
} from '@/services/AuthService';
import { useCurrentUserQuery } from '@/services/hooks/useCurrentUser';
import { useUserStore } from '@/stores/userStore';
import { CurrentUser } from '@/services/UserService';
import { usePermissionStore } from '@/stores/permissionStore';
import { fetchUserPermissions } from '@/services/PermissionService';
import { usePermissions } from '@/hooks/usePermissions';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  profile: CurrentUser | null;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  permissions: string[];
  role: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const { currentUser } = useUserStore();
  const { setPermissions, clearPermissions } = usePermissionStore();

  const login = async (email: string, password: string) => {
    return await authLogin({ email, password });
  };

  const logout = async () => {
    clearPermissions(); // Clear permissions on logout
    authImmediateLogout();
  };

  const hasRole = (role: string): boolean => {
    return authHasRole(role as Role);
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return authHasAnyRole(roles as Role[]);
  };

  // Get permission methods from usePermissions hook
  const { hasPermission, hasAnyPermission, hasAllPermissions, permissions, role } =
    usePermissions();

  // Load permissions when user is authenticated
  useEffect(() => {
    const loadPermissions = async () => {
      if (isAuthenticated) {
        try {
          const { permissions, role } = await fetchUserPermissions();
          setPermissions(permissions, role);
        } catch (error) {
          console.error('Failed to load permissions:', error);
        }
      }
    };

    loadPermissions();
  }, [isAuthenticated]);

  useCurrentUserQuery();

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
    role,
    profile: currentUser || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
