import { useEffect } from 'react';
import { useUiStore } from '@/store/uiStore';

const icons = { success: '✓', error: '✕', info: 'ℹ' };
const colors = {
  success: 'bg-green-500/20 border-green-500/30 text-green-300',
  error:   'bg-red-500/20   border-red-500/30   text-red-300',
  info:    'bg-blue-500/20  border-blue-500/30  text-blue-300',
};

export default function Notification() {
  const { notification, clearNotification } = useUiStore();

  useEffect(() => {
    if (notification) {
      const t = setTimeout(clearNotification, 4000);
      return () => clearTimeout(t);
    }
  }, [notification, clearNotification]);

  if (!notification) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-up">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md ${colors[notification.type]}`}>
        <span className="font-bold text-sm">{icons[notification.type]}</span>
        <p className="text-sm font-medium">{notification.message}</p>
        <button onClick={clearNotification} className="ml-2 opacity-60 hover:opacity-100 text-xs">✕</button>
      </div>
    </div>
  );
}
