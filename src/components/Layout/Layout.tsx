import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { useOnlineStatus } from '@/hooks/useOffline';
import Notification from '@/components/UI/Notification';
import { useExpenseStore } from '@/store/expenseStore';
import SettingsModal from './SettingsModal';

interface Props { children: ReactNode }

export default function Layout({ children }: Props) {
  const { user, logout } = useAuthStore();
  const { activeTab, setTab, isLocalMode, isFamilyMode, toggleFamilyMode } = useUiStore();
  const isOnline = useOnlineStatus();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const expenses = useExpenseStore(s => s.expenses);
  const familyName = localStorage.getItem('expense_tracker_family_name') || '';

  const familyMembers = useMemo(() => {
    if (!familyName) return [];
    const names = new Set<string>();
    if (user?.name) names.add(user.name);
    expenses.forEach(e => {
      if (e.userName) names.add(e.userName);
    });
    return Array.from(names);
  }, [expenses, user?.name, familyName]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDropdownOpen]);

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
                {/* Family Pill */}
                {familyName && (
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-all cursor-pointer select-none"
                    title={isLocalMode ? 'Configuración de Familia' : 'Family Settings'}
                  >
                    <span>👥</span>
                    <span className="max-w-[100px] truncate">{familyName}</span>
                  </button>
                )}

                <button
                  ref={buttonRef}
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
                  <div 
                    ref={dropdownRef}
                    className="absolute right-0 top-10 w-64 mt-2 z-50 backdrop-blur-xl bg-black/80 border border-white/10 rounded-2xl shadow-2xl p-4 animate-fade-in"
                  >
                    <div className="pb-3 border-b border-white/10 mb-3">
                      <p className="text-xs text-white/40">{isLocalMode ? 'Sesión Iniciada' : 'Logged in as'}</p>
                      <p className="text-sm font-semibold text-white/90 truncate">{user.name}</p>
                      <p className="text-xs text-white/40 truncate">{user.email}</p>
                    </div>

                    {/* Family section inside dropdown */}
                    {familyName && (
                      <div className="pb-3 border-b border-white/10 mb-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                            {isLocalMode ? 'Familia Activa' : 'Active Family'}
                          </p>
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        </div>
                        <p className="text-sm font-bold text-indigo-300">👥 {familyName}</p>
                        {familyMembers.length > 0 ? (
                          <p className="text-[11px] text-white/60 leading-relaxed">
                            <span className="font-semibold text-white/40">{isLocalMode ? 'Miembros: ' : 'Members: '}</span>
                            {familyMembers.join(', ')}
                          </p>
                        ) : (
                          <p className="text-[11px] text-white/40 italic">
                            {isLocalMode ? 'Sin miembros registrados' : 'No registered members'}
                          </p>
                        )}
                        
                        {/* Toggle family view mode directly in the menu */}
                        <button
                          onClick={() => {
                            toggleFamilyMode();
                          }}
                          className="w-full mt-1.5 flex items-center justify-between px-2.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-xs font-semibold text-indigo-300 transition-all cursor-pointer"
                        >
                          <span>{isLocalMode ? 'Vista actual:' : 'Current view:'}</span>
                          <span className="underline decoration-indigo-400/40 underline-offset-2">
                            {isFamilyMode 
                              ? (isLocalMode ? 'Grupal (Familia)' : 'Grouped (Family)')
                              : (isLocalMode ? 'Individual (Mío)' : 'Individual (Mine)')}
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Settings Button */}
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsSettingsOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/5 rounded-xl transition-all flex items-center gap-2 mb-2 cursor-pointer"
                    >
                      <span>⚙️</span>
                      <span>{isLocalMode ? 'Configuración' : 'Settings'}</span>
                    </button>

                    {/* Sign Out Button */}
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                    >
                      🚪 {isLocalMode ? 'Cerrar Sesión' : 'Sign Out'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* Tab nav */}
      <nav className="sticky top-16 z-30 backdrop-blur-md bg-black/10 border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 flex">
          {(['dashboard', 'expenses', 'prices'] as const).map(tab => (
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
                : tab === 'expenses'
                  ? (isLocalMode ? '📋 Gastos' : '📋 Expenses')
                  : (isLocalMode ? '🔍 Precios' : '🔍 Prices')}
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
