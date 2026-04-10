import AxiosBase from '@/services/axios/AxiosBase';
import type { SignInCredential } from '@/@types/auth';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useAuthStore } from '@/stores/authStore';

import { LOGIN_URL, LOGOUT_URL } from '@/constants/api.constant';
import { clearAllCookies, removeAuthTokens, setAuthTokens } from '@/utils/cookies';
import { clearNavigationCache } from '@/utils/navigationCache';

export interface LoginResponse {
  user: {
    _id: string;
    login: string;
    role: Role;
    avatar?: string;
    authority?: string[];
    view_type?: 'listView' | 'detailsView';
    voip_extension?: string | null;
    voip_password?: string | null;
    voip_enabled?: boolean;
  };
  token: string;
}

export interface AuthError {
  message: string;
  status?: number;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  newPassword: string;
  confirmPassword: string;
  token: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// Auth store instance
const getAuthStore = () => useAuthStore.getState();

// its working done
// Main authentication functions
export const login = async (
  credentials: SignInCredential
): Promise<{ success: boolean; error?: string }> => {
  const authStore = getAuthStore();
  authStore.setLoading(true);
  authStore.clearError();

  try {
    const response = await AxiosBase.post<LoginResponse>(LOGIN_URL, {
      login: credentials.email,
      password: credentials.password,
    });

    const { user, token } = response.data;

    if (!user || !token) {
      throw new Error('Invalid response from server');
    }

    const transformedUser = {
      id: user._id,
      name: user.login,
      email: user.login,
      role: user.role,
      accessToken: token,
      avatar: user.avatar,
      authority: user.authority,
      view_type: user.view_type,
      voip_extension: user.voip_extension || null,
      voip_password: user.voip_password || null,
      voip_enabled: user.voip_enabled || false,
    };

    authStore.login(transformedUser);
    setAuthTokens(token);

    return { success: true };
  } catch (error: any) {
    // Handle inactivity-related login blocks
    if (error?.response?.status === 423 && error.response.data?.requiresAction) {
      const errorMessage =
        error.response.data.message || 'Authentication failed. Please contact administrator.';
      authStore.setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    const errorMessage = error?.response?.data?.message || error?.message || 'Login failed';
    authStore.setError(errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    authStore.setLoading(false);
  }
};
// its working done
export const logout = async (router: any): Promise<void> => {
  try {
    // Call logout endpoint if needed
    await AxiosBase.post(LOGOUT_URL);
  } catch (error) {
    // Even if logout fails on server, we should clear local state
    console.warn('Logout request failed, but clearing local state:', error);
  } finally {
    // Clear local state
    const authStore = getAuthStore();
    authStore.logout();
    // clearAuthToken();
    // clearAuthCookies();
    try {
      removeAuthTokens();
      if (typeof window !== 'undefined') {
        // Clear local/session storage as well
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {}
        clearAllCookies();
      }
    } catch {}
    // Hard redirect to sign-in for immediate transition and to reset app state
    if (typeof window !== 'undefined') {
      window.location.replace('/sign-in');
    } else {
      router.push('/sign-in');
    }
  }
};

/**
 * IMMEDIATE logout - no API calls, no waiting
 * Use this for instant logout on browser reload
 */
export const immediateLogout = (): void => {
  const authStore = getAuthStore();
  authStore.logout();

  // Clear navigation cache to ensure fresh data on next login
  clearNavigationCache();

  try {
    removeAuthTokens();
    if (typeof window !== 'undefined') {
      try {
        // Remove all 'table-column-sizes' related keys from localStorage
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('table-column-sizes')) {
            try {
              localStorage.removeItem(key);
            } catch {}
          }
        });
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      clearAllCookies();
      window.location.replace('/sign-in');
    }
  } catch {
    if (typeof window !== 'undefined') {
      window.location.replace('/sign-in');
    }
  }
};

export const forgotPassword = async (data: ForgotPasswordData): Promise<void> => {
  try {
    await AxiosBase.post('/auth/forgot-password', data);
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.message || 'Failed to send reset email';
    throw new Error(errorMessage);
  }
};

export const resetPassword = async (data: ResetPasswordData): Promise<void> => {
  try {
    await AxiosBase.post('/auth/reset-password', data);
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.message || 'Failed to reset password';
    throw new Error(errorMessage);
  }
};

export const changePassword = async (data: ChangePasswordData): Promise<void> => {
  try {
    await AxiosBase.post('/auth/change-password', data);
  } catch (error: any) {
    const errorMessage =
      error?.response?.data?.message || error?.message || 'Failed to change password';
    throw new Error(errorMessage);
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const authStore = getAuthStore();
  return authStore.isAuthenticated && !!authStore.user?.accessToken;
};

// Get current user
export const getCurrentUser = () => {
  const authStore = getAuthStore();
  return authStore.user;
};

// Check if user has specific role
export const hasRole = (role: Role): boolean => {
  const authStore = getAuthStore();
  const user = authStore.user;
  return user?.role?.toLowerCase() === role?.toLowerCase();
};

// Check if user has any of the specified roles
export const hasAnyRole = (roles: Role[]): boolean => {
  const authStore = getAuthStore();
  const user = authStore.user;
  return roles.includes(user?.role as Role);
};

// Export individual functions for backward compatibility
export const apiForgotPassword = forgotPassword;
export const apiResetPassword = resetPassword;
export const apiChangePassword = changePassword;
