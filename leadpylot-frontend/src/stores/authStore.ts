import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Role } from '@/configs/navigation.config/auth.route.config';

export interface User {
  _id?: string;
  id: string;
  name: string;
  email: string;
  role: Role;
  accessToken: string;
  avatar?: string;
  authority?: string[];
  view_type?: 'listView' | 'detailsView';
  voip_extension?: string | null;
  voip_password?: string | null;
  voip_enabled?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  // Authentication actions
  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshToken: (newToken: string) => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      inactivityData: null,

      // Actions
      login: (user: User) => {
        set({
          user,
          isAuthenticated: true,
          error: null,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error, isLoading: false });
      },

      clearError: () => {
        set({ error: null });
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates },
          });
        }
      },

      refreshToken: (newToken: string) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, accessToken: newToken },
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
