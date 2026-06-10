import { lazy, Suspense, useEffect, useState } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout/Layout';
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import AddExpenseModal from '@/components/AddExpense/AddExpenseModal';
import { useOfflineSync } from '@/hooks/useOffline';
import { useExpenses } from '@/hooks/useExpenses';
import FixedExpensesModal from '@/components/AddExpense/FixedExpensesModal';

const Dashboard   = lazy(() => import('@/components/Dashboard/Dashboard'));
const ExpenseList = lazy(() => import('@/components/Expenses/ExpenseList'));
const PriceSearch = lazy(() => import('@/components/Prices/PriceSearch'));

export default function MainPage() {
  const { activeTab, openAddModal, isLocalMode } = useUiStore();
  const { user } = useAuthStore();
  const { loadExpenses, instantiateFixedExpenses } = useExpenses();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFixedModalOpen, setIsFixedModalOpen] = useState(false);

  // Global mount load
  useEffect(() => {
    if (user) {
      loadExpenses();
    }
  }, [user?.spreadsheetId]);

  // Activa la sincronización en segundo plano y eventos de reconexión
  useOfflineSync();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('joinSpreadsheetId');
    const familyName = params.get('familyName');
    if (joinId) {
      useAuthStore.getState().updateSpreadsheetId(joinId);
      if (familyName) {
        localStorage.setItem('expense_tracker_family_name', familyName);
      }
      if (!useUiStore.getState().isFamilyMode) {
        useUiStore.getState().toggleFamilyMode();
      }
      useUiStore.getState().showNotification(
        useUiStore.getState().isLocalMode
          ? `¡Te has unido a la familia ${familyName || ''}! Compartiendo gastos.`
          : `Joined the ${familyName || ''} family! Sharing expenses.`,
        'success'
      );
      const url = new URL(window.location.href);
      url.searchParams.delete('joinSpreadsheetId');
      url.searchParams.delete('familyName');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  return (
    <Layout>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        {activeTab === 'dashboard' ? (
          <Dashboard />
        ) : activeTab === 'expenses' ? (
          <ExpenseList />
        ) : (
          <PriceSearch />
        )}
      </Suspense>

      {/* Floating Action Menu Container */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-40">
        {isMenuOpen && (
          <div className="flex flex-col items-end gap-2 mb-2 animate-slide-up select-none">
            {/* Editar Gastos Fijos Button */}
            <div className="flex items-center gap-2">
              <span className="bg-black/80 backdrop-blur-md text-white/90 px-3 py-1 rounded-lg text-xs font-semibold border border-white/10 shadow-lg">
                {isLocalMode ? 'Editar gastos fijos' : 'Edit fixed expenses'}
              </span>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsFixedModalOpen(true);
                }}
                className="h-10 w-10 rounded-full bg-slate-800 border border-white/20 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all text-base"
                title={isLocalMode ? 'Editar gastos fijos' : 'Edit fixed expenses'}
              >
                ⚙️
              </button>
            </div>

            {/* Nuevo Gasto Button */}
            <div className="flex items-center gap-2">
              <span className="bg-black/80 backdrop-blur-md text-white/90 px-3 py-1 rounded-lg text-xs font-semibold border border-white/10 shadow-lg">
                {isLocalMode ? 'Nuevo gasto' : 'New expense'}
              </span>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  openAddModal();
                }}
                className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all text-sm font-bold"
                title={isLocalMode ? 'Nuevo gasto' : 'New expense'}
              >
                💸
              </button>
            </div>
          </div>
        )}

        {/* Main Floating Toggle Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={[
            "h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-2xl shadow-2xl shadow-indigo-500/40 flex items-center justify-center transition-all duration-300 active:scale-95",
            isMenuOpen ? "rotate-45" : ""
          ].join(" ")}
          aria-label="Add menu"
        >
          +
        </button>
      </div>

      <AddExpenseModal />

      <FixedExpensesModal
        isOpen={isFixedModalOpen}
        onClose={() => setIsFixedModalOpen(false)}
        onGenerate={instantiateFixedExpenses}
      />
    </Layout>
  );
}
