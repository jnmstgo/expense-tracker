import { useState, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { useOnlineStatus } from '@/hooks/useOffline';
import Notification from '@/components/UI/Notification';

interface Props { children: ReactNode }

export default function Layout({ children }: Props) {
  const { user, logout } = useAuthStore();
  const { activeTab, setTab, isLocalMode, toggleLocalMode } = useUiStore();
  const isOnline = useOnlineStatus();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/20 border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">💳</span>
            <span className="font-bold text-white/90 tracking-tight">Expense AI</span>
            {!isOnline && (
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {isLocalMode ? 'Desconectado' : 'Offline'}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 relative">
            {user && (
              <>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center focus:outline-none transition-transform hover:scale-105 active:scale-95"
                >
                  <img
                    src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`}
                    alt={user.name}
                    className="h-8 w-8 rounded-full ring-2 ring-indigo-500/50 cursor-pointer"
                  />
                </button>

                {/* Glassmorphic Dropdown Menu */}
                {isDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-10 w-64 mt-2 z-50 backdrop-blur-xl bg-black/80 border border-white/10 rounded-2xl shadow-2xl p-4 animate-fade-in">
                      <div className="pb-3 border-b border-white/10 mb-3">
                        <p className="text-xs text-white/40">{isLocalMode ? 'Sesión Iniciada' : 'Logged in as'}</p>
                        <p className="text-sm font-semibold text-white/90 truncate">{user.name}</p>
                        <p className="text-xs text-white/40 truncate">{user.email}</p>
                      </div>

                      {/* Local Mode Switch Toggle */}
                      <div className="flex items-center justify-between py-2 mb-3">
                        <span className="text-xs font-medium text-white/80">
                          {isLocalMode ? '🇦🇷 Modo Local ($ARS)' : '🌎 International Mode'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isLocalMode}
                            onChange={toggleLocalMode}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {/* Sign Out Button */}
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        🚪 {isLocalMode ? 'Cerrar Sesión' : 'Sign Out'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="sticky top-16 z-30 backdrop-blur-md bg-black/10 border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 flex">
          {(['dashboard', 'expenses'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setTab(tab)}
              className={[
                'px-5 py-3 text-sm font-medium capitalize transition-all relative',
                activeTab === tab
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/70',
              ].join(' ')}
            >
              {tab === 'dashboard'
                ? (isLocalMode ? '📊 Resumen' : '📊 Dashboard')
                : (isLocalMode ? '📋 Gastos' : '📋 Expenses')}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </main>

      <Notification />
    </div>
  );
}
