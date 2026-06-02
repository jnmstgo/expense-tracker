import { useMemo } from 'react';
import { useExpenseStore } from '@/store/expenseStore';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useExpenses } from '@/hooks/useExpenses';
import ExpenseItem from './ExpenseItem';
import ExpenseFilters from './ExpenseFilters';
import LoadingSpinner from '@/components/UI/LoadingSpinner';
import Button from '@/components/UI/Button';

export default function ExpenseList() {
  const isLocalMode = useUiStore(s => s.isLocalMode);
  const isFamilyMode = useUiStore(s => s.isFamilyMode);
  const { user } = useAuthStore();
  const { getFiltered, isLoading, isSyncing } = useExpenseStore();
  const { deleteExpense, loadExpenses } = useExpenses();
  
  const filtered = useMemo(() => {
    const base = getFiltered();
    if (isFamilyMode) return base;
    return base.filter(e => e.userId === user?.id);
  }, [getFiltered, isFamilyMode, user?.id]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">
          {filtered.length} {filtered.length === 1 
            ? (isLocalMode ? 'gasto' : 'expense') 
            : (isLocalMode ? 'gastos' : 'expenses')}
        </h2>
        <div className="flex gap-2">
          {isSyncing && <LoadingSpinner size="sm" />}
          <Button variant="ghost" size="sm" onClick={loadExpenses} disabled={isLoading}>
            {isLoading ? <LoadingSpinner size="sm" /> : '↻'}
          </Button>
        </div>
      </div>

      <ExpenseFilters />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-white/30">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-sm">
            {isLocalMode ? 'No se encontraron gastos' : 'No expenses found'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(e => (
            <ExpenseItem key={e.id} expense={e} onDelete={deleteExpense} />
          ))}
        </div>
      )}
    </div>
  );
}
