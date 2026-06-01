import type { Expense } from '@/types';

const PENDING_KEY = 'expense_tracker_pending';
const CACHE_KEY   = 'expense_tracker_cache';

export function getPendingExpenses(): Expense[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as Expense[];
  } catch { return []; }
}

export function savePendingExpense(expense: Expense): void {
  const pending = getPendingExpenses();
  pending.unshift(expense);
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function removePendingExpense(id: string): void {
  const pending = getPendingExpenses().filter(e => e.id !== id);
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function getCachedExpenses(): Expense[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]') as Expense[];
  } catch { return []; }
}

export function setCachedExpenses(expenses: Expense[]): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(expenses));
}

export async function flushPendingExpenses(
  pushFn: (expense: Expense) => Promise<void>,
  onSuccess: (id: string) => void
): Promise<{ synced: number; failed: number }> {
  const pending = getPendingExpenses();
  let synced = 0, failed = 0;

  for (const expense of pending) {
    try {
      await pushFn({ ...expense, synced: true });
      removePendingExpense(expense.id);
      onSuccess(expense.id);
      synced++;
    } catch {
      failed++;
    }
  }
  return { synced, failed };
}
