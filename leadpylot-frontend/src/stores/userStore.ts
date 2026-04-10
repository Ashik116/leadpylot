import { create } from 'zustand';
import type { CurrentUser } from '@/services/UserService';

interface UserState {
  currentUser: CurrentUser | null;
  totalPendingTodo: number;
  isLoading: boolean;
  error: string | null;
}

interface UserActions {
  setCurrentUser: (user: CurrentUser | null) => void;
  setTotalPendingTodo: (count: number) => void;
  updateTotalPendingTodo: (count: number) => void;
  incrementPendingTodos: () => void;
  decrementPendingTodos: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState & UserActions>((set, get) => ({
  // State
  currentUser: null,
  totalPendingTodo: 0,
  isLoading: false,
  error: null,

  // Actions
  setCurrentUser: (user) => {
    set({
      currentUser: user,
      totalPendingTodo: user?.pendingTodosCount || 0,
      error: null,
    });
  },

  setTotalPendingTodo: (count) => {
    set({ totalPendingTodo: count });

    // Also update the currentUser object if it exists
    const { currentUser } = get();
    if (currentUser) {
      set({
        currentUser: {
          ...currentUser,
          pendingTodosCount: count,
        },
      });
    }
  },

  updateTotalPendingTodo: (count) => {
    set({ totalPendingTodo: count });

    // Also update the currentUser object if it exists
    const { currentUser } = get();
    if (currentUser) {
      set({
        currentUser: {
          ...currentUser,
          pendingTodosCount: count,
        },
      });
    }
  },

  incrementPendingTodos: () => {
    const { totalPendingTodo } = get();
    const newCount = totalPendingTodo + 1;
    get().updateTotalPendingTodo(newCount);
  },

  decrementPendingTodos: () => {
    const { totalPendingTodo } = get();
    const newCount = Math.max(0, totalPendingTodo - 1);
    get().updateTotalPendingTodo(newCount);
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error });
  },

  clearUser: () => {
    set({
      currentUser: null,
      totalPendingTodo: 0,
      isLoading: false,
      error: null,
    });
  },
}));

// Selectors for better performance
export const useCurrentUser = () => useUserStore((state) => state.currentUser);
export const useTotalPendingTodo = () => useUserStore((state) => state.totalPendingTodo);
export const useUserLoading = () => useUserStore((state) => state.isLoading);
export const useUserError = () => useUserStore((state) => state.error);
