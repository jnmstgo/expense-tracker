import { useEffect, useState } from 'react';
import { useExpenses } from './useExpenses';
import { useUiStore } from '@/store/uiStore';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return isOnline;
}

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const { syncPending } = useExpenses();
  const { showNotification } = useUiStore();

  // Sync on online event
  useEffect(() => {
    if (isOnline) {
      syncPending();
    } else {
      showNotification('You are offline. Expenses will sync when reconnected.', 'info');
    }
  }, [isOnline]);

  // Periodically retry sync every 3 minutes if online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      console.log('🔄 Checking for pending offline expenses to sync...');
      syncPending();
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearInterval(interval);
  }, [isOnline, syncPending]);
}
