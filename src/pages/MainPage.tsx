import { lazy, Suspense } from 'react';
import { useUiStore } from '@/store/uiStore';
import Layout from '@/components/Layout/Layout';
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import AddExpenseModal from '@/components/AddExpense/AddExpenseModal';
import { useOfflineSync } from '@/hooks/useOffline';

const Dashboard   = lazy(() => import('@/components/Dashboard/Dashboard'));
const ExpenseList = lazy(() => import('@/components/Expenses/ExpenseList'));

export default function MainPage() {
  const { activeTab, openAddModal } = useUiStore();

  // Activa la sincronización en segundo plano y eventos de reconexión
  useOfflineSync();

  return (
    <Layout>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        {activeTab === 'dashboard' ? <Dashboard /> : <ExpenseList />}
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
