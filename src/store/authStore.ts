import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User) => void;
  updateSpreadsheetId: (id: string) => void;
  updateToken: (token: string, expiresIn: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  isTokenValid: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

      setUser: user => set({ user, error: null }),

      updateSpreadsheetId: spreadsheetId =>
        set(s => ({ user: s.user ? { ...s.user, spreadsheetId } : null })),

      updateToken: (accessToken, expiresIn) =>
        set(s => ({
          user: s.user
            ? { ...s.user, accessToken, tokenExpiry: Date.now() + expiresIn * 1000 }
            : null,
        })),

      setLoading: isLoading => set({ isLoading }),
      setError: error => set({ error }),

      logout: () => {
        if (typeof window !== 'undefined' && window.google) {
          window.google.accounts.id.disableAutoSelect();
        }
        set({ user: null });
      },

      isTokenValid: () => {
        const { user } = get();
        if (!user?.accessToken) return false;
        return Date.now() < user.tokenExpiry - 60_000;
      },
    }),
    {
      name: 'expense-tracker-auth',
      partialize: state => ({ user: state.user }),
    }
  )
);
