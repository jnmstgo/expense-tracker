import { lazy, Suspense, useEffect } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout/Layout';
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import AddExpenseModal from '@/components/AddExpense/AddExpenseModal';
import { useOfflineSync } from '@/hooks/useOffline';

const Dashboard   = lazy(() => import('@/components/Dashboard/Dashboard'));
const ExpenseList = lazy(() => import('@/components/Expenses/ExpenseList'));
const PriceSearch = lazy(() => import('@/components/Prices/PriceSearch'));

export default function MainPage() {
  const { activeTab, openAddModal } = useUiStore();

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

      {/* Floating Action Button */}
      <button
        onClick={openAddModal}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full
                   bg-gradient-to-br from-indigo-500 to-purple-600
                   text-white text-2xl shadow-2xl shadow-indigo-500/40
                   hover:scale-110 active:scale-95 transition-transform
                   flex items-center justify-center z-40"
        aria-label="Add expense"
      >
        +
      </button>

      <AddExpenseModal />
    </Layout>
  );
}
