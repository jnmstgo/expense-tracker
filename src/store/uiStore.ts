import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  isAddModalOpen: boolean;
  activeTab: 'dashboard' | 'expenses';
  isDarkMode: boolean;
  isLocalMode: boolean;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  openAddModal: () => void;
  closeAddModal: () => void;
  setTab: (tab: 'dashboard' | 'expenses') => void;
  toggleDarkMode: () => void;
  toggleLocalMode: () => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearNotification: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      isAddModalOpen: false,
      activeTab: 'dashboard',
      isDarkMode: true,
      isLocalMode: false,
      notification: null,

      openAddModal:  () => set({ isAddModalOpen: true }),
      closeAddModal: () => set({ isAddModalOpen: false }),
      setTab: tab => set({ activeTab: tab }),

      toggleDarkMode: () => {
        const { isDarkMode } = get();
        const next = !isDarkMode;
        document.documentElement.classList.toggle('dark', next);
        set({ isDarkMode: next });
      },

      toggleLocalMode: () => {
        set({ isLocalMode: !get().isLocalMode });
      },

      showNotification: (message, type = 'info') => {
        set({ notification: { message, type } });
        setTimeout(() => set({ notification: null }), 4000);
      },

      clearNotification: () => set({ notification: null }),
    }),
    {
      name: 'expense-tracker-ui',
      partialize: state => ({
        isDarkMode: state.isDarkMode,
        isLocalMode: state.isLocalMode
      })
    }
  )
);
